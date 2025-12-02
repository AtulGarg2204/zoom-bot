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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory storage (no database for testing)
let documentChunks = [];

/**
 * Load and process all PDFs from documents folder on startup
 */
async function initializeDocuments() {
  try {
    console.log('\n📚 INITIALIZING DOCUMENT PROCESSING');
    console.log('='.repeat(80));
    
    const documentsDir = path.join(__dirname, 'documents');
    
    // Check if documents folder exists
    if (!fs.existsSync(documentsDir)) {
      console.log('📁 Creating documents folder...');
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log('⚠️  Please add PDF files to the documents/ folder');
      return;
    }
    
    // Get all PDF files
    const files = fs.readdirSync(documentsDir).filter(file => file.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('⚠️  No PDF files found in documents/ folder');
      return;
    }
    
    console.log(`📄 Found ${files.length} PDF files`);
    
    // Process each PDF
    for (const file of files) {
      await processAndStorePDF(path.join(documentsDir, file), file);
    }
    
    console.log('\n✅ DOCUMENT PROCESSING COMPLETE');
    console.log(`   Total chunks stored: ${documentChunks.length}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error initializing documents:', error.message);
  }
}

/**
 * Process a single PDF and store chunks with embeddings (using PDFParse V2 API)
 */
async function processAndStorePDF(filePath, fileName) {
  try {
    console.log(`\n📖 Processing: ${fileName}`);
    console.log('-'.repeat(80));
    
    // Read PDF using PDFParse V2 API
    const dataBuffer = fs.readFileSync(filePath);
    
    const parser = new PDFParse({ data: dataBuffer });
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();
    await parser.destroy();
    
    const fullText = textResult.text;
    const totalPages = info.total;
    
    console.log(`   Pages: ${totalPages}`);
    console.log(`   Characters: ${fullText.length}`);
    
    // Split into chunks (simple chunking: ~1000 chars with overlap)
    const chunks = splitIntoChunks(fullText, 1000, 200);
    
    console.log(`   Created ${chunks.length} chunks`);
    console.log('   Generating embeddings...');
    
    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      // Skip empty chunks
      if (chunkText.trim().length < 50) {
        continue;
      }
      
      try {
        const embedding = await generateEmbedding(chunkText);
        
        documentChunks.push({
          id: `${fileName}-chunk-${i}`,
          documentName: fileName,
          chunkIndex: i,
          text: chunkText,
          embedding: embedding,
          metadata: {
            fileName: fileName,
            chunkNumber: i + 1,
            totalChunks: chunks.length,
            totalPages: totalPages
          }
        });
        
        if ((i + 1) % 5 === 0) {
          console.log(`   Processed ${i + 1}/${chunks.length} chunks...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing chunk ${i}:`, error.message);
      }
    }
    
    console.log(`   ✅ Successfully processed ${fileName}`);
    
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
  }
}

/**
 * Split text into chunks with overlap
 */
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

/**
 * Generate embedding using OpenAI
 */
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

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search for relevant chunks given a question
 */
async function searchRelevantChunks(question, topK = 3) {
  try {
    console.log('\n🔍 RAG SEARCH');
    console.log('='.repeat(80));
    console.log(`   Question: "${question}"`);
    
    if (documentChunks.length === 0) {
      console.log('   ⚠️  No documents loaded');
      return [];
    }
    
    // Generate embedding for question
    console.log('   Generating question embedding...');
    const questionEmbedding = await generateEmbedding(question);
    
    // Calculate similarity with all chunks
    console.log('   Calculating similarities...');
    const results = documentChunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(questionEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Get top K results
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

/**
 * Get document statistics
 */
function getDocumentStats() {
  const stats = {
    totalDocuments: new Set(documentChunks.map(c => c.documentName)).size,
    totalChunks: documentChunks.length,
    documents: []
  };
  
  const docGroups = {};
  documentChunks.forEach(chunk => {
    if (!docGroups[chunk.documentName]) {
      docGroups[chunk.documentName] = 0;
    }
    docGroups[chunk.documentName]++;
  });
  
  for (const [name, count] of Object.entries(docGroups)) {
    stats.documents.push({ name, chunks: count });
  }
  
  return stats;
}

module.exports = {
  initializeDocuments,
  searchRelevantChunks,
  getDocumentStats
};