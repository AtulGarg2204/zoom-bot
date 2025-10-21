const express = require('express');
const cors = require('cors');
const Pusher = require('pusher');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Store active OpenAI connections
const openaiConnections = new Map();

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Zoom Voice Bot API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      connect: '/api/connect',
      sendAudio: '/api/send-audio'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: openaiConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to initiate connection
app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    console.log('Connecting session:', sessionId);
    
    // Connect to OpenAI Realtime API
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );
    
    openaiWs.on('open', () => {
      console.log('Connected to OpenAI for session:', sessionId);
      
      // Configure session
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI meeting assistant. Be concise, friendly, and natural in conversation.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      }));
      
      openaiConnections.set(sessionId, openaiWs);
    });
    
    // OpenAI -> Pusher (send to client)
    openaiWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        pusher.trigger(`session-${sessionId}`, 'openai-message', message);
      } catch (error) {
        console.error('Error parsing OpenAI message:', error);
      }
    });
    
    openaiWs.on('close', () => {
      console.log('OpenAI disconnected for session:', sessionId);
      openaiConnections.delete(sessionId);
    });
    
    openaiWs.on('error', (error) => {
      console.error('OpenAI error:', error);
      openaiConnections.delete(sessionId);
    });
    
    res.json({ success: true, sessionId });
    
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to send audio to OpenAI
app.post('/api/send-audio', async (req, res) => {
  const { sessionId, audio } = req.body;
  
  if (!sessionId || !audio) {
    return res.status(400).json({ error: 'sessionId and audio are required' });
  }
  
  const openaiWs = openaiConnections.get(sessionId);
  
  if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
    try {
      openaiWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audio
      }));
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending audio:', error);
      res.status(500).json({ error: 'Failed to send audio' });
    }
  } else {
    res.status(400).json({ error: 'No active connection' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// For local development
const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Pusher Channels ready for real-time updates`);
    console.log(`🌐 API available at: http://localhost:${PORT}`);
  });
};

// Only start server if not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

// Export the Express app for Vercel
module.exports = app;