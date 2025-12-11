// ============================================================================
// MONGODB SERVICE - PERSISTENT STORAGE FOR RAG
// ============================================================================

const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let chunksCollection = null;
let isConnected = false;

// ============================================================================
// CONNECTION
// ============================================================================

async function connectMongoDB() {
  try {
    if (isConnected && client) {
      console.log('✅ Already connected to MongoDB');
      return true;
    }

    console.log('\n🔗 Connecting to MongoDB...');
    
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      return false;
    }

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    
    db = client.db('rag_database');
    chunksCollection = db.collection('document_chunks');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    await chunksCollection.createIndex({ 'metadata.fileName': 1 });
    await chunksCollection.createIndex({ documentName: 1 });
    await chunksCollection.createIndex({ chunkIndex: 1 });
    
    isConnected = true;
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Collection: ${chunksCollection.collectionName}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    isConnected = false;
    return false;
  }
}

async function closeMongoDB() {
  try {
    if (client) {
      await client.close();
      isConnected = false;
      client = null;
      db = null;
      chunksCollection = null;
      console.log('🔌 MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB:', error.message);
  }
}

// ============================================================================
// CHUNK OPERATIONS
// ============================================================================

async function storeChunks(chunks) {
  try {
    if (!isConnected) {
      console.error('❌ MongoDB not connected');
      return 0;
    }

    console.log(`\n💾 Storing ${chunks.length} chunks in MongoDB...`);
    
    // Clear existing chunks
    const deleteResult = await chunksCollection.deleteMany({});
    console.log(`   🗑️  Cleared ${deleteResult.deletedCount} existing chunks`);
    
    // Prepare documents
    const documents = chunks.map(chunk => ({
      id: chunk.id,
      documentName: chunk.documentName,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: chunk.embedding,
      metadata: chunk.metadata,
      createdAt: new Date()
    }));
    
    // Insert all chunks
    const result = await chunksCollection.insertMany(documents, { ordered: false });
    
    console.log(`   ✅ Stored ${result.insertedCount} chunks in MongoDB`);
    
    return result.insertedCount;
    
  } catch (error) {
    console.error('❌ Error storing chunks:', error.message);
    return 0;
  }
}

async function getAllChunks() {
  try {
    if (!isConnected) {
      console.error('❌ MongoDB not connected');
      return [];
    }

    const chunks = await chunksCollection.find({}).toArray();
    
    return chunks;
    
  } catch (error) {
    console.error('❌ Error fetching chunks:', error.message);
    return [];
  }
}

async function getChunkCount() {
  try {
    if (!isConnected) {
      return 0;
    }
    
    return await chunksCollection.countDocuments();
    
  } catch (error) {
    console.error('❌ Error counting chunks:', error.message);
    return 0;
  }
}

async function checkIfDocumentsExist() {
  try {
    if (!isConnected) {
      return false;
    }
    
    const count = await chunksCollection.countDocuments();
    return count > 0;
    
  } catch (error) {
    console.error('❌ Error checking documents:', error.message);
    return false;
  }
}

async function getStats() {
  try {
    if (!isConnected) {
      return { totalChunks: 0, totalDocuments: 0, documents: [] };
    }

    const totalChunks = await chunksCollection.countDocuments();
    
    const pipeline = [
      {
        $group: {
          _id: '$metadata.fileName',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];
    
    const docStats = await chunksCollection.aggregate(pipeline).toArray();
    
    return {
      totalChunks: totalChunks,
      totalDocuments: docStats.length,
      documents: docStats.map(d => ({
        name: d._id,
        chunks: d.count
      }))
    };
    
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
    return { totalChunks: 0, totalDocuments: 0, documents: [] };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  connectMongoDB,
  closeMongoDB,
  storeChunks,
  getAllChunks,
  getChunkCount,
  checkIfDocumentsExist,
  getStats
};