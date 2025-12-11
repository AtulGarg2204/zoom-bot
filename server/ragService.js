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
const mongoService = require('./mongoService');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize documents - SMART LOADING FROM MONGODB
 */
async function initializeDocuments() {
  try {
    console.log('\n📚 INITIALIZING DOCUMENT PROCESSING');
    console.log('='.repeat(80));
    
    // STEP 1: Connect to MongoDB
    const connected = await mongoService.connectMongoDB();
    
    if (!connected) {
      console.error('❌ Failed to connect to MongoDB');
      console.log('⚠️  Server will continue without knowledge base');
      return;
    }
    
    // STEP 2: Check if documents already exist in MongoDB
    const documentsExist = await mongoService.checkIfDocumentsExist();
    
    if (documentsExist) {
      console.log('✅ Documents already exist in MongoDB - SKIPPING PROCESSING');
      const stats = await mongoService.getStats();
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Total chunks: ${stats.totalChunks}`);
      console.log('   📋 Document list:');
      stats.documents.forEach(doc => {
        console.log(`      - ${doc.name}: ${doc.chunks} chunks`);
      });
      console.log('='.repeat(80) + '\n');
      return;
    }
    
    console.log('📝 No documents in MongoDB - Processing PDFs...');
    
    // STEP 3: Process PDFs (only if not in MongoDB)
    const documentsDir = path.join(__dirname, 'documents');
    
    if (!fs.existsSync(documentsDir)) {
      console.log('📁 Creating documents folder...');
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log('⚠️  Please add PDF files to the documents/ folder');
      return;
    }
    
    const files = fs.readdirSync(documentsDir).filter(file => file.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('⚠️  No PDF files found in documents/ folder');
      return;
    }
    
    console.log(`📄 Found ${files.length} PDF files\n`);
    
    const allChunks = [];
    
    // Process each PDF
    for (const file of files) {
      try {
        const chunks = await processAndStorePDF(path.join(documentsDir, file), file);
        
        // Check if chunks is valid array
        if (Array.isArray(chunks) && chunks.length > 0) {
          allChunks.push(...chunks);
          console.log(`   ✅ Added ${chunks.length} chunks from ${file}\n`);
        } else {
          console.log(`   ⚠️  No valid chunks from ${file}\n`);
        }
        
      } catch (fileError) {
        console.error(`   ❌ Error processing ${file}:`, fileError.message);
        // Continue with other files
      }
    }
    
    console.log(`\n📦 Total chunks collected: ${allChunks.length}`);
    
    // STEP 4: Store in MongoDB
    if (allChunks.length > 0) {
      await mongoService.storeChunks(allChunks);
    } else {
      console.log('⚠️  No chunks to store in MongoDB');
    }
    
    const stats = await mongoService.getStats();
    
    console.log('\n✅ DOCUMENT PROCESSING COMPLETE');
    console.log(`   Total documents: ${stats.totalDocuments}`);
    console.log(`   Total chunks stored: ${stats.totalChunks}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error initializing documents:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

/**
 * Process a single PDF and return chunks with embeddings (PARALLEL EMBEDDING)
 */
async function processAndStorePDF(filePath, fileName) {
  try {
    console.log(`\n📖 Processing: ${fileName}`);
    console.log('-'.repeat(80));
    
    // Read PDF using PDFParse V2 API
    const dataBuffer = fs.readFileSync(filePath);
    
    console.log('   📄 Parsing PDF...');
    const parser = new PDFParse({ data: dataBuffer });
    
    console.log('   📊 Getting document info...');
    const info = await parser.getInfo({ parsePageInfo: true });
    
    console.log('   📝 Extracting text...');
    const textResult = await parser.getText();
    
    await parser.destroy();
    
    const fullText = textResult.text;
    const totalPages = info.total;
    
    console.log(`   ✅ Pages: ${totalPages}`);
    console.log(`   ✅ Characters: ${fullText.length}`);
    
    if (fullText.length === 0) {
      console.log('   ⚠️  Warning: No text extracted from PDF');
      return [];
    }
    
    // Split into chunks
    const chunks = splitIntoChunks(fullText, 1000, 200);
    
    console.log(`   ✅ Created ${chunks.length} chunks`);
    console.log('   🚀 Generating embeddings in parallel (batch size: 10)...');
    
    const startTime = Date.now();
    
    const BATCH_SIZE = 10;
    const validChunks = chunks.filter(chunk => chunk.trim().length >= 50);
    
    console.log(`   📊 Valid chunks: ${validChunks.length}/${chunks.length}`);
    
    const allChunksWithEmbeddings = [];
    
    for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
      const batch = validChunks.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validChunks.length / BATCH_SIZE);
      
      console.log(`   🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`);
      
      const embeddingPromises = batch.map(chunkText => generateEmbedding(chunkText));
      
      try {
        const embeddings = await Promise.all(embeddingPromises);
        
        batch.forEach((chunkText, idx) => {
          const globalIndex = i + idx;
          
          allChunksWithEmbeddings.push({
            id: `${fileName}-chunk-${globalIndex}`,
            documentName: fileName,
            chunkIndex: globalIndex,
            text: chunkText,
            embedding: embeddings[idx],
            metadata: {
              fileName: fileName,
              chunkNumber: globalIndex + 1,
              totalChunks: validChunks.length,
              totalPages: totalPages
            }
          });
        });
        
        console.log(`      ✅ Batch ${batchNumber} complete`);
        
      } catch (error) {
        console.error(`      ❌ Error in batch ${batchNumber}:`, error.message);
        console.log(`      🔄 Retrying batch ${batchNumber} sequentially...`);
        
        for (let j = 0; j < batch.length; j++) {
          try {
            const embedding = await generateEmbedding(batch[j]);
            const globalIndex = i + j;
            
            allChunksWithEmbeddings.push({
              id: `${fileName}-chunk-${globalIndex}`,
              documentName: fileName,
              chunkIndex: globalIndex,
              text: batch[j],
              embedding: embedding,
              metadata: {
                fileName: fileName,
                chunkNumber: globalIndex + 1,
                totalChunks: validChunks.length,
                totalPages: totalPages
              }
            });
            
          } catch (chunkError) {
            console.error(`      ❌ Failed to process chunk ${i + j}:`, chunkError.message);
          }
        }
      }
      
      if (i + BATCH_SIZE < validChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`   ✅ Successfully processed ${fileName}`);
    console.log(`   📦 Created ${allChunksWithEmbeddings.length} chunks with embeddings`);
    console.log(`   ⏱️  Total time: ${totalTime}s`);
    console.log(`   ⚡ Speed: ${(allChunksWithEmbeddings.length / totalTime).toFixed(1)} chunks/second`);
    
    return allChunksWithEmbeddings;
    
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
    console.error('   Stack trace:', error.stack);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += (chunkSize - overlap);
  }
  
  return chunks;
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    
    return response.data[0].embedding;
    
  } catch (error) {
    console.error('❌ OpenAI embedding error:', error.message);
    throw error;
  }
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

async function searchRelevantChunks(question, topK = 3) {
  try {
    console.log('\n🔍 RAG SEARCH');
    console.log('='.repeat(80));
    console.log(`   Question: "${question}"`);
    
    const documentChunks = await mongoService.getAllChunks();
    
    if (documentChunks.length === 0) {
      console.log('   ⚠️  No documents loaded in MongoDB');
      return [];
    }
    
    console.log(`   📊 Found ${documentChunks.length} chunks in database`);
    
    console.log('   🔄 Generating question embedding...');
    const questionEmbedding = await generateEmbedding(question);
    
    console.log('   🔄 Calculating similarities...');
    const results = documentChunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(questionEmbedding, chunk.embedding)
    }));
    
    results.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = results.slice(0, topK);
    
    console.log(`\n   📊 Top ${topK} Results:`);
    topResults.forEach((result, idx) => {
      console.log(`   ${idx + 1}. ${result.documentName} (Chunk ${result.chunkIndex + 1}) - Similarity: ${result.similarity.toFixed(4)}`);
      console.log(`      Preview: ${result.text.substring(0, 100)}...`);
    });
    console.log('='.repeat(80) + '\n');
    
    return topResults;
    
  } catch (error) {
    console.error('❌ RAG search error:', error.message);
    return [];
  }
}

async function getDocumentStats() {
  return await mongoService.getStats();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initializeDocuments,
  searchRelevantChunks,
  getDocumentStats
};