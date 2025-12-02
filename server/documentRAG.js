// ============================================================================
// CANVAS POLYFILL (MUST BE FIRST)
// ============================================================================

const { createCanvas } = require('canvas');

// Polyfill DOMMatrix for pdf-parse
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor(init) {
      if (init && typeof init === 'string') {
        this.a = 1; this.b = 0; this.c = 0;
        this.d = 1; this.e = 0; this.f = 0;
      } else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else {
        this.a = 1; this.b = 0; this.c = 0;
        this.d = 1; this.e = 0; this.f = 0;
      }
    }
    
    multiply(matrix) {
      return new DOMMatrix([
        this.a * matrix.a + this.c * matrix.b,
        this.b * matrix.a + this.d * matrix.b,
        this.a * matrix.c + this.c * matrix.d,
        this.b * matrix.c + this.d * matrix.d,
        this.a * matrix.e + this.c * matrix.f + this.e,
        this.b * matrix.e + this.d * matrix.f + this.f
      ]);
    }
  };
}

// ============================================================================
// IMPORTS
// ============================================================================

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const OpenAI = require('openai');
const Groq = require('groq-sdk');

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOCUMENTS_FOLDER = path.join(__dirname, 'documents');
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

// Supported file types
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

// Vector store (in-memory)
let vectorStore = [];
let isInitialized = false;

// ============================================================================
// FILE TYPE HANDLERS
// ============================================================================

// Extract text from PDF - V2 API
async function extractPDFText(filepath) {
  try {
    const dataBuffer = fs.readFileSync(filepath);
    const filename = path.basename(filepath);
    
    const parser = new PDFParse({ data: dataBuffer });
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();
    await parser.destroy();
    
    return {
      filename: filename,
      text: textResult.text,
      totalPages: info.total,
      fileType: 'pdf',
      info: info.info || {}
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

// Extract text from DOCX (future implementation)
async function extractDOCXText(filepath) {
  // TODO: Implement DOCX extraction using mammoth or similar
  // For now, return placeholder
  throw new Error('DOCX support coming soon - please convert to PDF for now');
}

// Extract text from TXT
async function extractTXTText(filepath) {
  const filename = path.basename(filepath);
  const text = fs.readFileSync(filepath, 'utf-8');
  
  return {
    filename: filename,
    text: text,
    totalPages: Math.ceil(text.length / 3000), // Estimate pages
    fileType: 'txt',
    info: {}
  };
}

// Main extraction router
async function extractText(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return await extractPDFText(filepath);
    case '.docx':
    case '.doc':
      return await extractDOCXText(filepath);
    case '.txt':
      return await extractTXTText(filepath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

// ============================================================================
// CHUNKING
// ============================================================================

function splitIntoChunks(fileData) {
  console.log('\n' + '='.repeat(80));
  console.log('✂️  SPLITTING DOCUMENT INTO CHUNKS');
  console.log('='.repeat(80));
  console.log(`📄 Document: ${fileData.filename}`);
  console.log(`📊 Total Characters: ${fileData.text.length}`);
  console.log(`📄 Total Pages: ${fileData.totalPages}`);
  console.log(`⚙️  Chunk Size: ${CHUNK_SIZE} characters`);
  console.log(`⚙️  Overlap: ${CHUNK_OVERLAP} characters`);
  
  const chunks = [];
  const text = fileData.text;
  let start = 0;
  let chunkIndex = 0;
  
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunkText = text.slice(start, end).trim();
    
    if (chunkText.length > 0) {
      const estimatedPage = Math.floor((start / text.length) * fileData.totalPages);
      
      const chunkData = {
        id: `${fileData.filename}_chunk_${chunkIndex}`,
        text: chunkText,
        metadata: {
          source: fileData.filename,
          fileType: fileData.fileType,
          page: estimatedPage,
          chunkIndex: chunkIndex,
          startChar: start,
          endChar: end,
          fileInfo: {
            totalPages: fileData.totalPages,
            title: fileData.info?.Title || 'Unknown',
            author: fileData.info?.Author || 'Unknown'
          }
        },
        embedding: null
      };
      
      chunks.push(chunkData);
      
      // Log every 5th chunk
      if (chunkIndex % 5 === 0 || chunkIndex === 0) {
        console.log(`\n📦 Chunk ${chunkIndex}:`);
        console.log(`   ID: ${chunkData.id}`);
        console.log(`   Source: ${chunkData.metadata.source}`);
        console.log(`   Page: ${chunkData.metadata.page}`);
        console.log(`   Position: chars ${start}-${end}`);
        console.log(`   Text Preview: "${chunkText.substring(0, 80)}..."`);
      }
      
      chunkIndex++;
    }
    
    start += (CHUNK_SIZE - CHUNK_OVERLAP);
  }
  
  // Update totalChunks
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });
  
  console.log(`\n✅ Created ${chunks.length} chunks from ${fileData.filename}`);
  console.log('='.repeat(80) + '\n');
  
  return chunks;
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

// Create embedding using OpenAI
async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error creating embedding:', error.message);
    throw error;
  }
}

// Cosine similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

async function initialize() {
  if (isInitialized) {
    console.log('\n⚠️  Documents already initialized\n');
    return;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📄 DOCUMENT RAG INITIALIZATION');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Ensure documents folder exists
    if (!fs.existsSync(DOCUMENTS_FOLDER)) {
      fs.mkdirSync(DOCUMENTS_FOLDER, { recursive: true });
      console.log('✅ Created documents folder\n');
    }
    
    // Load all supported files from documents folder
    console.log('📁 Scanning documents folder...\n');
    
    const allFiles = fs.readdirSync(DOCUMENTS_FOLDER);
    const supportedFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    
    if (supportedFiles.length === 0) {
      console.log('⚠️  No documents found in documents/ folder');
      console.log(`   Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      console.log(`   Location: ${DOCUMENTS_FOLDER}\n`);
      console.log('   TIP: Add your PDF/TXT files to the documents/ folder\n');
      console.log('='.repeat(80) + '\n');
      isInitialized = true;
      return;
    }
    
    console.log(`✅ Found ${supportedFiles.length} document(s):\n`);
    supportedFiles.forEach((file, i) => {
      const filepath = path.join(DOCUMENTS_FOLDER, file);
      const stats = fs.statSync(filepath);
      const sizeKB = Math.floor(stats.size / 1024);
      const ext = path.extname(file).toUpperCase().slice(1);
      console.log(`   ${i + 1}. ${file} (${ext}, ${sizeKB} KB)`);
    });
    console.log('');
    
    // Process all files
    console.log('='.repeat(80));
    console.log('📖 PROCESSING DOCUMENTS');
    console.log('='.repeat(80) + '\n');
    
    const allChunks = [];
    
    for (let i = 0; i < supportedFiles.length; i++) {
      const filename = supportedFiles[i];
      const filepath = path.join(DOCUMENTS_FOLDER, filename);
      
      try {
        console.log(`📄 Document ${i + 1}/${supportedFiles.length}: ${filename}`);
        console.log('-'.repeat(80));
        
        const fileData = await extractText(filepath);
        
        console.log(`📊 File Information:`);
        console.log(`   Type: ${fileData.fileType.toUpperCase()}`);
        console.log(`   Pages: ${fileData.totalPages}`);
        console.log(`   Characters: ${fileData.text.length.toLocaleString()}`);
        if (fileData.info?.Title) console.log(`   Title: ${fileData.info.Title}`);
        if (fileData.info?.Author) console.log(`   Author: ${fileData.info.Author}`);
        console.log('');
        
        const chunks = splitIntoChunks(fileData);
        console.log(`✂️  Created ${chunks.length} chunks (${CHUNK_SIZE} chars, ${CHUNK_OVERLAP} overlap)\n`);
        
        // Show first chunk
        if (chunks.length > 0) {
          console.log(`📋 Sample Chunk (First one):`);
          console.log('-'.repeat(80));
          console.log(`Chunk ID: ${chunks[0].id}`);
          console.log(`Text Preview: "${chunks[0].text.substring(0, 150)}..."`);
          console.log(`\nMetadata:`);
          console.log(JSON.stringify(chunks[0].metadata, null, 2));
          console.log('-'.repeat(80) + '\n');
        }
        
        allChunks.push(...chunks);
        
      } catch (error) {
        console.log(`❌ Error processing ${filename}: ${error.message}\n`);
      }
    }
    
    if (allChunks.length === 0) {
      console.log('⚠️  No chunks created from documents\n');
      console.log('='.repeat(80) + '\n');
      isInitialized = true;
      return;
    }
    
    console.log('='.repeat(80));
    console.log(`✅ TOTAL CHUNKS CREATED: ${allChunks.length}`);
    console.log('='.repeat(80) + '\n');
    
    // Create embeddings
    console.log('='.repeat(80));
    console.log('🔮 CREATING EMBEDDINGS');
    console.log('='.repeat(80) + '\n');
    
    for (let i = 0; i < allChunks.length; i++) {
      const percent = Math.floor((i / allChunks.length) * 100);
      const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
      process.stdout.write(`\r🔮 [${bar}] ${i + 1}/${allChunks.length} (${percent}%)`);
      
      try {
        allChunks[i].embedding = await createEmbedding(allChunks[i].text);
      } catch (error) {
        console.log(`\n❌ Embedding failed for chunk ${i}: ${error.message}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n');
    
    // Store in memory
    vectorStore = allChunks.filter(chunk => chunk.embedding !== null);
    
    console.log('='.repeat(80));
    console.log(`✅ VECTOR STORE READY: ${vectorStore.length} chunks with embeddings`);
    console.log('='.repeat(80) + '\n');
    
    // Summary by file
    const fileStats = {};
    vectorStore.forEach(chunk => {
      const source = chunk.metadata.source;
      fileStats[source] = (fileStats[source] || 0) + 1;
    });
    
    console.log('📊 CHUNKS PER DOCUMENT:');
    console.log('-'.repeat(80));
    Object.entries(fileStats).forEach(([filename, count]) => {
      console.log(`   ${filename}: ${count} chunks`);
    });
    console.log('-'.repeat(80) + '\n');
    
    console.log('='.repeat(80));
    console.log('✅ INITIALIZATION COMPLETE - READY FOR QUERIES');
    console.log('='.repeat(80) + '\n');
    
    isInitialized = true;
    
  } catch (error) {
    console.error('\n❌ INITIALIZATION ERROR:', error);
    console.log('='.repeat(80) + '\n');
    isInitialized = true;
  }
}

// ============================================================================
// DOCUMENT SEARCH
// ============================================================================

async function searchDocuments(query, topK = 3) {
  if (vectorStore.length === 0) {
    console.log('\n⚠️  No documents in vector store\n');
    return [];
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 SEARCHING DOCUMENTS`);
  console.log('='.repeat(80));
  console.log(`Query: "${query}"`);
  console.log(`Looking for top ${topK} results...\n`);
  
  try {
    const queryEmbedding = await createEmbedding(query);
    
    const results = vectorStore.map(chunk => ({
      text: chunk.text,
      metadata: chunk.metadata,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    const topResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
    
    console.log('📊 SEARCH RESULTS:');
    console.log('-'.repeat(80));
    
    topResults.forEach((result, i) => {
      console.log(`\n🏆 Result ${i + 1}:`);
      console.log(`   Document: ${result.metadata.source}`);
      console.log(`   Page: ${result.metadata.page}`);
      console.log(`   Chunk: ${result.metadata.chunkIndex + 1}/${result.metadata.totalChunks}`);
      console.log(`   Similarity Score: ${result.similarity.toFixed(4)} (${(result.similarity * 100).toFixed(1)}%)`);
      console.log(`   Text Preview: "${result.text.substring(0, 150)}..."`);
    });
    
    console.log('\n' + '-'.repeat(80));
    console.log('='.repeat(80) + '\n');
    
    return topResults;
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return [];
  }
}

async function shouldRespond(conversationHistory, transcript, speakerId) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🤔 DECISION: Should I respond?');
    console.log('='.repeat(80));
    console.log(`Speaker: ${speakerId}`);
    console.log(`Transcript: "${transcript}"`);
    
    const context = conversationHistory.map(msg => 
      `${msg.speaker}: ${msg.content}`
    ).join('\n');
    
    console.log(`\nConversation Context (${conversationHistory.length} messages):`);
    if (context) {
      console.log(context);
    } else {
      console.log('(empty)');
    }
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct', // ← Changed to Llama!
      messages: [
        {
          role: 'system',
          content: `You are James, an AI assistant in a meeting. Decide if you should respond or stay silent.

RESPOND if:
- Someone mentions "James", "bot", "assistant", or "AI"
- Someone asks you a direct question
- It's a follow-up to something you just said

SILENT if:
- People are talking to each other
- You're not mentioned and it's unclear who they're addressing

Output ONLY one word: "RESPOND" or "SILENT"

Examples:
"James, how are you?" → RESPOND
"Hey bot, what's up?" → RESPOND
"Bob, did you finish?" → SILENT
"That's interesting" → SILENT`
        },
        {
          role: 'user',
          content: `Conversation:\n${context}\n\nLatest: ${speakerId}: ${transcript}\n\nShould I respond? Answer with ONLY "RESPOND" or "SILENT"`
        }
      ],
      max_completion_tokens: 50,
      temperature: 0.1
    });
    
    const decision = response.choices[0].message.content.trim().toUpperCase();
    console.log(`\n✅ LLM Decision: "${decision}"`);
    
    // Handle different response formats
    const shouldRespond = decision.includes('RESPOND');
    
    console.log(`✅ Final Decision: ${shouldRespond ? 'RESPOND' : 'SILENT'}`);
    console.log('='.repeat(80) + '\n');
    
    return shouldRespond;
    
  } catch (error) {
    console.error('❌ shouldRespond error:', error.message);
    return true; // Default to responding on error
  }
}

async function needsDocumentSearch(question) {
  if (vectorStore.length === 0) {
    return false;
  }
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📚 DECISION: Need document search?');
    console.log('='.repeat(80));
    console.log(`Question: "${question}"`);
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct', // ← Changed to Llama!
      messages: [
        {
          role: 'system',
          content: `Determine if this question needs document search or general knowledge.

SEARCH_DOCS if asking about:
- Company policies, procedures, guidelines
- Specific product information
- Internal processes, rules
- Personal information (name, email, skills, education, projects)
- Resume or CV details
- Anything in documents

GENERAL_KNOWLEDGE if:
- General facts (math, science, history)
- Common knowledge
- Greetings, small talk
- Personal opinions

Output ONLY: "SEARCH_DOCS" or "GENERAL_KNOWLEDGE"

Examples:
"What's Atul's email?" → SEARCH_DOCS
"Tell me about his education" → SEARCH_DOCS
"What's 2+2?" → GENERAL_KNOWLEDGE
"How are you?" → GENERAL_KNOWLEDGE`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nAnswer with ONLY "SEARCH_DOCS" or "GENERAL_KNOWLEDGE"`
        }
      ],
      max_completion_tokens: 50,
      temperature: 0.1
    });
    
    const decision = response.choices[0].message.content.trim().toUpperCase();
    console.log(`\n✅ LLM Decision: "${decision}"`);
    
    const needsDocs = decision.includes('SEARCH');
    
    console.log(`✅ Final Decision: ${needsDocs ? 'SEARCH_DOCS' : 'GENERAL_KNOWLEDGE'}`);
    console.log('='.repeat(80) + '\n');
    
    return needsDocs;
    
  } catch (error) {
    console.error('❌ needsDocumentSearch error:', error.message);
    return false;
  }
}

async function answerFromDocuments(conversationHistory, question, relevantChunks) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📖 GENERATING ANSWER FROM DOCUMENTS');
    console.log('='.repeat(80));
    
    console.log(`\n📚 Input - ${relevantChunks.length} Chunks:`);
    relevantChunks.forEach((chunk, i) => {
      console.log(`\n   Chunk ${i + 1}:`);
      console.log(`   📄 Source: ${chunk.metadata.source}`);
      console.log(`   📑 Page: ${chunk.metadata.page}`);
      console.log(`   📦 Chunk ID: ${chunk.metadata.chunkIndex}`);
      console.log(`   📝 Text: "${chunk.text.substring(0, 100)}..."`);
    });
    
    const context = conversationHistory.map(msg => 
      `${msg.speaker}: ${msg.content}`
    ).join('\n');
    
    const documentContext = relevantChunks
      .map((chunk, i) => {
        return `[Document: ${chunk.metadata.source}, Page ${chunk.metadata.page}]\n${chunk.text}`;
      })
      .join('\n\n---\n\n');
    
    console.log(`\n💬 Conversation History: ${conversationHistory.length} messages`);
    console.log(`📄 Document Context Length: ${documentContext.length} characters`);
    
    console.log('\n📤 Sending to LLM...');
    console.log(`   Model: meta-llama/llama-4-maverick-17b-128e-instruct`);
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are James, a helpful AI assistant. Answer based on these documents.

Documents:
${documentContext}

Guidelines:
- Answer naturally and conversationally
- Use information from the documents
- Keep responses concise (10-20 words)
- Be warm and friendly
- If documents don't have the answer, say you don't have that information`
        },
        {
          role: 'user',
          content: `Conversation:\n${context}\n\nQuestion: ${question}`
        }
      ],
      max_completion_tokens: 150,
      temperature: 0.5
    });
    
    const answer = response.choices[0].message.content.trim();
    
    console.log('\n📥 LLM Response:');
    console.log(`   "${answer}"`);
    console.log(`   Length: ${answer.length} characters`);
    
    console.log('\n✅ Answer Generation Complete');
    console.log('='.repeat(80) + '\n');
    
    return answer;
    
  } catch (error) {
    console.error('❌ answerFromDocuments error:', error.message);
    console.error('Stack:', error.stack);
    return "I'm having trouble accessing that information right now.";
  }
}
async function generateDirectResponse(conversationHistory, question) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('💭 GENERATING DIRECT RESPONSE (General Knowledge)');
    console.log('='.repeat(80));
    
    const context = conversationHistory.map(msg => 
      `${msg.speaker}: ${msg.content}`
    ).join('\n');
    
    console.log(`\n💬 Conversation history: ${conversationHistory.length} messages\n`);
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are James, a friendly and helpful AI Assistant in a natural conversation.

YOUR PERSONALITY:
- Warm, approachable, and conversational
- Natural and human-like (not robotic)
- Helpful but not overly formal

RESPONSE STYLE:
- Use natural conversation fillers: "Oh", "Well", "Actually"
- Add warmth: "Great question!", "I'd be happy to help"
- Keep responses conversational (10-20 words)
- Use contractions: "I'm" not "I am"`
        },
        {
          role: 'user',
          content: `Conversation:\n${context}\n\nCurrent: ${question}`
        }
      ],
      max_completion_tokens: 100,
      temperature: 0.5
    });
    
    const answer = response.choices[0].message.content.trim();
    console.log(`✅ Generated answer: "${answer}"`);
    console.log('='.repeat(80) + '\n');
    
    return answer;
    
  } catch (error) {
    console.error('❌ generateDirectResponse error:', error.message);
    return "I'm having trouble responding right now.";
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
async function handleUserQuestion(sessionId, transcript, speakerId, conversationHistory) {
  try {
    console.log('\n' + '🤖'.repeat(80));
    console.log('🤖 HANDLE USER QUESTION - ENTRY POINT');
    console.log('🤖'.repeat(80));
    console.log(`📍 Session ID: ${sessionId}`);
    console.log(`👤 Speaker: ${speakerId}`);
    console.log(`💬 Transcript: "${transcript}"`);
    console.log(`📚 Conversation History: ${conversationHistory.length} messages`);
    console.log(`📦 Vector Store Size: ${vectorStore.length} chunks`);
    
    // Decision 1: Should respond?
    console.log('\n⚡ Step 1: Checking if I should respond...');
    const shouldWeRespond = await shouldRespond(conversationHistory, transcript, speakerId);
    
    console.log(`📊 Decision: ${shouldWeRespond ? 'RESPOND ✅' : 'SILENT ❌'}`);
    
    if (!shouldWeRespond) {
      console.log('\n🤫 FINAL DECISION: STAYING SILENT');
      console.log('🤖'.repeat(80) + '\n');
      return { 
        shouldRespond: false, 
        response: 'SILENT' 
      };
    }
    
    // Decision 2: Need documents?
    console.log('\n⚡ Step 2: Checking if document search needed...');
    const needsDocs = await needsDocumentSearch(transcript);
    
    console.log(`📊 Decision: ${needsDocs ? 'SEARCH_DOCS ✅' : 'GENERAL_KNOWLEDGE ❌'}`);
    
    let response;
    
    if (needsDocs) {
      console.log('\n📚 PROCEEDING WITH DOCUMENT SEARCH...');
      console.log('-'.repeat(80));
      
      const relevantChunks = await searchDocuments(transcript, 3);
      
      if (relevantChunks.length > 0) {
        console.log(`\n✅ Found ${relevantChunks.length} relevant chunks`);
        console.log('📝 Chunks being used:');
        relevantChunks.forEach((chunk, i) => {
          console.log(`   ${i + 1}. Document: ${chunk.metadata.source}`);
          console.log(`      Page: ${chunk.metadata.page}, Chunk: ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}`);
          console.log(`      Similarity: ${chunk.similarity.toFixed(4)}`);
        });
        
        console.log('\n🤖 Generating answer from documents...');
        response = await answerFromDocuments(conversationHistory, transcript, relevantChunks);
        
      } else {
        console.log('\n⚠️  No relevant documents found (similarity too low)');
        console.log('💭 Falling back to general knowledge');
        response = await generateDirectResponse(conversationHistory, transcript);
      }
      
    } else {
      console.log('\n💭 Using general knowledge (no document search needed)');
      response = await generateDirectResponse(conversationHistory, transcript);
    }
    
    console.log('\n' + '✅'.repeat(80));
    console.log('✅ FINAL RESPONSE GENERATED');
    console.log('✅'.repeat(80));
    console.log(`📤 Response: "${response}"`);
    console.log(`📏 Length: ${response.length} characters`);
    console.log('🤖'.repeat(80) + '\n');
    
    return {
      shouldRespond: true,
      response: response
    };
    
  } catch (error) {
    console.error('\n' + '❌'.repeat(80));
    console.error('❌ HANDLE USER QUESTION ERROR');
    console.error('❌'.repeat(80));
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('❌'.repeat(80) + '\n');
    
    return {
      shouldRespond: true,
      response: "I'm having trouble processing that right now."
    };
  }
}

// ============================================================================
// ADD NEW DOCUMENT (For future user uploads)
// ============================================================================

async function addDocument(filepath) {
  try {
    console.log(`\n📄 Adding new document: ${path.basename(filepath)}`);
    
    const fileData = await extractText(filepath);
    const chunks = splitIntoChunks(fileData);
    
    console.log(`   Created ${chunks.length} chunks`);
    
    // Create embeddings
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = await createEmbedding(chunks[i].text);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Add to vector store
    vectorStore.push(...chunks);
    
    console.log(`   ✅ Added to vector store (total: ${vectorStore.length} chunks)\n`);
    
    return {
      success: true,
      filename: fileData.filename,
      chunks: chunks.length
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to add document: ${error.message}\n`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initialize,
  handleUserQuestion,
  searchDocuments,
  addDocument,
  isInitialized: () => isInitialized,
  getVectorStoreSize: () => vectorStore.length,
  DOCUMENTS_FOLDER
};