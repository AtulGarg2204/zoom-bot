import Pusher from 'pusher';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Store active OpenAI connections
const openaiConnections = new Map();

// Endpoint to initiate connection
app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  try {
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
      const message = JSON.parse(data.toString());
      pusher.trigger(`session-${sessionId}`, 'openai-message', message);
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
  
  const openaiWs = openaiConnections.get(sessionId);
  
  if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
    openaiWs.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audio
    }));
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No active connection' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', connections: openaiConnections.size });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});