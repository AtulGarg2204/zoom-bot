

// const express = require('express');
// const cors = require('cors');
// const Pusher = require('pusher');
// const WebSocket = require('ws');
// require('dotenv').config();

// const app = express();

// // Initialize Pusher
// const pusher = new Pusher({
//   appId: process.env.PUSHER_APP_ID,
//   key: process.env.PUSHER_KEY,
//   secret: process.env.PUSHER_SECRET,
//   cluster: process.env.PUSHER_CLUSTER,
//   useTLS: true
// });

// console.log('🔧 Pusher initialized with cluster:', process.env.PUSHER_CLUSTER);

// // Middleware
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// console.log('🔑 OpenAI API Key present:', !!OPENAI_API_KEY);

// // Store active OpenAI connections
// const openaiConnections = new Map();
// // Store audio responses per session
// const audioResponses = new Map();

// // Routes
// app.get('/', (req, res) => {
//   console.log('📍 Root endpoint hit');
//   res.json({ 
//     message: 'Zoom Voice Bot API',
//     status: 'running',
//     endpoints: {
//       health: '/api/health',
//       connect: '/api/connect',
//       sendAudio: '/api/send-audio',
//       getAudio: '/api/get-audio/:sessionId'
//     }
//   });
// });

// app.get('/api/health', (req, res) => {
//   console.log('📍 Health check endpoint hit');
//   res.json({ 
//     status: 'ok', 
//     connections: openaiConnections.size,
//     timestamp: new Date().toISOString()
//   });
// });

// // Endpoint to initiate connection
// app.post('/api/connect', async (req, res) => {
//   const { sessionId } = req.body;
  
//   console.log('\n🔵 === CONNECT REQUEST ===');
//   console.log('📦 Request body:', req.body);
//   console.log('🆔 Session ID:', sessionId);
  
//   if (!sessionId) {
//     console.log('❌ No sessionId provided');
//     return res.status(400).json({ error: 'sessionId is required' });
//   }
  
//   try {
//     console.log('🔌 Attempting to connect to OpenAI...');
    
//     // Connect to OpenAI Realtime API
//     const openaiWs = new WebSocket(
//       'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
//       {
//         headers: {
//           'Authorization': `Bearer ${OPENAI_API_KEY}`,
//           'OpenAI-Beta': 'realtime=v1'
//         }
//       }
//     );
    
//     openaiWs.on('open', () => {
//       console.log('✅ Connected to OpenAI for session:', sessionId);
      
//       // Configure session
//       const sessionConfig = {
//         type: 'session.update',
//         session: {
//           modalities: ['text', 'audio'],
//           instructions: 'You are a helpful AI meeting assistant. Be concise, friendly, and natural in conversation. Keep responses under 3 sentences.',
//           voice: 'alloy',
//           input_audio_format: 'pcm16',
//           output_audio_format: 'pcm16',
//           turn_detection: {
//             type: 'server_vad',
//             threshold: 0.5,
//             prefix_padding_ms: 300,
//             silence_duration_ms: 500
//           }
//         }
//       };
      
//       console.log('📤 Sending session config to OpenAI');
//       openaiWs.send(JSON.stringify(sessionConfig));
      
//       openaiConnections.set(sessionId, openaiWs);
//       console.log('💾 Stored connection for session:', sessionId);
//       console.log('📊 Total active connections:', openaiConnections.size);
//     });
    
//     // OpenAI -> Store audio locally or send via Pusher
//     openaiWs.on('message', (data) => {
//       try {
//         const message = JSON.parse(data.toString());
//         console.log('📨 Message from OpenAI:', message.type);
        
//         if (message.type === 'session.created') {
//           console.log('🎉 OpenAI session created successfully');
//         }
        
//         if (message.type === 'response.audio.delta') {
//           console.log('🔊 Audio response received from OpenAI');
          
//           // Store audio locally instead of sending via Pusher
//           if (!audioResponses.has(sessionId)) {
//             audioResponses.set(sessionId, []);
//           }
//           audioResponses.get(sessionId).push(message.delta);
//         }
        
//         if (message.type === 'input_audio_buffer.speech_started') {
//           console.log('🎤 OpenAI detected speech start');
//         }
        
//         if (message.type === 'input_audio_buffer.speech_stopped') {
//           console.log('🎤 OpenAI detected speech stop');
//         }
        
//         // Only send non-audio messages via Pusher
//         if (message.type !== 'response.audio.delta') {
//           const channel = `session-${sessionId}`;
//           pusher.trigger(channel, 'openai-message', message).catch(err => {
//             console.error('❌ Pusher error:', err.message);
//           });
//         }
        
//       } catch (error) {
//         console.error('❌ Error parsing OpenAI message:', error);
//       }
//     });
    
//     openaiWs.on('close', () => {
//       console.log('🔴 OpenAI disconnected for session:', sessionId);
//       openaiConnections.delete(sessionId);
//       audioResponses.delete(sessionId);
//       console.log('📊 Remaining connections:', openaiConnections.size);
//     });
    
//     openaiWs.on('error', (error) => {
//       console.error('❌ OpenAI WebSocket error:', error.message);
//       openaiConnections.delete(sessionId);
//       audioResponses.delete(sessionId);
//     });
    
//     res.json({ success: true, sessionId });
//     console.log('✅ Connect response sent');
    
//   } catch (error) {
//     console.error('❌ Connection error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Endpoint to send audio to OpenAI
// app.post('/api/send-audio', async (req, res) => {
//   const { sessionId, audio } = req.body;
  
//   console.log('\n🔵 === SEND AUDIO REQUEST ===');
//   console.log('🆔 Session ID:', sessionId);
//   console.log('🎵 Audio data length:', audio ? audio.length : 0);
  
//   if (!sessionId || !audio) {
//     console.log('❌ Missing required fields');
//     return res.status(400).json({ error: 'sessionId and audio are required' });
//   }
  
//   const openaiWs = openaiConnections.get(sessionId);
  
//   if (!openaiWs) {
//     console.log('❌ No connection found for session:', sessionId);
//     console.log('📊 Active sessions:', Array.from(openaiConnections.keys()));
//     return res.status(400).json({ error: 'No active connection for this session' });
//   }
  
//   console.log('🔍 WebSocket state:', openaiWs.readyState, '(1 = OPEN)');
  
//   if (openaiWs.readyState === WebSocket.OPEN) {
//     try {
//       const audioMessage = {
//         type: 'input_audio_buffer.append',
//         audio: audio
//       };
      
//       console.log('📤 Sending audio to OpenAI...');
//       openaiWs.send(JSON.stringify(audioMessage));
//       console.log('✅ Audio sent successfully');
      
//       res.json({ success: true });
//     } catch (error) {
//       console.error('❌ Error sending audio:', error);
//       res.status(500).json({ error: 'Failed to send audio' });
//     }
//   } else {
//     console.log('❌ WebSocket not open. State:', openaiWs.readyState);
//     res.status(400).json({ error: 'Connection not ready' });
//   }
// });

// // Endpoint to get audio responses
// app.get('/api/get-audio/:sessionId', (req, res) => {
//   const { sessionId } = req.params;
  
//   console.log('🔵 === GET AUDIO REQUEST ===');
//   console.log('🆔 Session ID:', sessionId);
  
//   const audioChunks = audioResponses.get(sessionId) || [];
  
//   if (audioChunks.length > 0) {
//     console.log('✅ Returning', audioChunks.length, 'audio chunks');
//     const chunks = [...audioChunks];
//     audioResponses.set(sessionId, []); // Clear after getting
//     res.json({ audio: chunks });
//   } else {
//     res.json({ audio: [] });
//   }
// });

// // Error handling middleware
// app.use((error, req, res, next) => {
//   console.error('❌ Server Error:', error);
  
//   res.status(500).json({ 
//     error: 'Internal server error',
//     ...(process.env.NODE_ENV === 'development' && { details: error.message })
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   console.log('❌ 404 - Route not found:', req.path);
//   res.status(404).json({ error: 'Route not found' });
// });

// // For local development
// const startServer = async () => {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log('\n🚀🚀🚀 SERVER STARTED 🚀🚀🚀');
//     console.log(`📡 Pusher Channels ready for real-time updates`);
//     console.log(`🌐 API available at: http://localhost:${PORT}`);
//     console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}\n`);
//   });
// };

// // Only start server if not in a serverless environment
// if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
//   startServer();
// }

// // Export the Express app for Vercel
// module.exports = app;

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

// CRITICAL: Store connections globally to survive function calls
// Use global object on Vercel to persist across invocations in same instance
if (!global.openaiConnections) {
  global.openaiConnections = new Map();
  console.log('🆕 Initialized global connections Map');
}
if (!global.audioResponses) {
  global.audioResponses = new Map();
  console.log('🆕 Initialized global audio responses Map');
}

const openaiConnections = global.openaiConnections;
const audioResponses = global.audioResponses;

// Log current state on every request
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`📍 ${req.method} ${req.path}`);
    console.log(`📊 Current connections: ${openaiConnections.size}`);
    console.log(`📊 Sessions: [${Array.from(openaiConnections.keys()).join(', ')}]`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Zoom Voice Bot API',
    status: 'running',
    connections: openaiConnections.size
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: openaiConnections.size,
    sessions: Array.from(openaiConnections.keys()),
    timestamp: new Date().toISOString()
  });
});

// Connect endpoint
app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log('======================');
  console.log('🔵 CONNECT REQUEST');
  console.log('Session ID:', sessionId);
  console.log('Existing connections:', openaiConnections.size);
  console.log('======================');
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  // Check if already connected
  const existing = openaiConnections.get(sessionId);
  if (existing && existing.readyState === WebSocket.OPEN) {
    console.log('⚠️ Connection already exists and is OPEN');
    return res.json({ success: true, sessionId, alreadyConnected: true });
  } else if (existing) {
    console.log('⚠️ Stale connection found, removing...');
    openaiConnections.delete(sessionId);
  }
  
  try {
    console.log('🔌 Creating new WebSocket connection...');
    
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );
    
    // IMPORTANT: Store immediately (before 'open' event)
    openaiConnections.set(sessionId, openaiWs);
    console.log('💾 Pre-stored WebSocket (state: CONNECTING)');
    
    // Set up all handlers
    openaiWs.on('open', () => {
      console.log('✅ WebSocket OPENED for:', sessionId);
      
      // Send config
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant. Be conversational and respond when spoken to.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700
          }
        }
      }));
      
      console.log('✅ Session config sent');
      
      // Keep-alive
      const keepAlive = setInterval(() => {
        if (openaiWs.readyState === WebSocket.OPEN) {
          console.log('💓 Keep-alive ping');
          openaiWs.ping();
        } else {
          clearInterval(keepAlive);
        }
      }, 30000);
      
      openaiWs.keepAliveInterval = keepAlive;
    });
    
    openaiWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'session.created') {
          console.log('🎉 Session created!');
        }
        
        if (message.type === 'response.audio.delta') {
          if (!audioResponses.has(sessionId)) {
            audioResponses.set(sessionId, []);
          }
          audioResponses.get(sessionId).push(message.delta);
        }
        
        if (message.type !== 'response.audio.delta') {
          pusher.trigger(`session-${sessionId}`, 'openai-message', message).catch(() => {});
        }
      } catch (err) {
        console.error('Message parse error:', err.message);
      }
    });
    
    openaiWs.on('close', (code, reason) => {
      console.log('🔴 WebSocket CLOSED');
      console.log('Session:', sessionId);
      console.log('Code:', code);
      console.log('Reason:', reason);
      
      // DON'T delete immediately - might be temporary
      // Only delete if it's a clean close (code 1000)
      if (code === 1000) {
        console.log('🧹 Clean close - removing connection');
        if (openaiWs.keepAliveInterval) {
          clearInterval(openaiWs.keepAliveInterval);
        }
        openaiConnections.delete(sessionId);
        audioResponses.delete(sessionId);
      } else {
        console.log('⚠️ Abnormal close - keeping connection for retry');
      }
    });
    
    openaiWs.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      
      // Clean up on error
      if (openaiWs.keepAliveInterval) {
        clearInterval(openaiWs.keepAliveInterval);
      }
      openaiConnections.delete(sessionId);
      audioResponses.delete(sessionId);
    });
    
    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Connection setup complete');
    console.log('📊 Total connections:', openaiConnections.size);
    console.log('======================');
    
    res.json({ success: true, sessionId });
    
  } catch (error) {
    console.error('❌ Connect failed:', error.message);
    openaiConnections.delete(sessionId);
    res.status(500).json({ error: error.message });
  }
});

// Send audio endpoint
app.post('/api/send-audio', async (req, res) => {
  const { sessionId, audio } = req.body;
  
  console.log('🔵 SEND AUDIO');
  console.log('Session:', sessionId);
  console.log('Audio length:', audio ? audio.length : 0);
  console.log('Active sessions:', Array.from(openaiConnections.keys()));
  
  if (!sessionId || !audio) {
    return res.status(400).json({ error: 'Missing sessionId or audio' });
  }
  
  const openaiWs = openaiConnections.get(sessionId);
  
  if (!openaiWs) {
    console.log('❌ NO CONNECTION');
    console.log('Available:', Array.from(openaiConnections.keys()));
    return res.status(400).json({ 
      error: 'No active connection',
      sessionId,
      available: Array.from(openaiConnections.keys())
    });
  }
  
  console.log('WS State:', openaiWs.readyState);
  
  if (openaiWs.readyState !== WebSocket.OPEN) {
    console.log('❌ Connection not open:', openaiWs.readyState);
    return res.status(400).json({ error: 'Connection not ready' });
  }
  
  try {
    openaiWs.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audio
    }));
    console.log('✅ Audio sent');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// SSE for audio streaming
app.get('/api/stream-audio/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.write('data: {"type":"connected"}\n\n');
  
  const interval = setInterval(() => {
    const chunks = audioResponses.get(sessionId) || [];
    if (chunks.length > 0) {
      const data = [...chunks];
      audioResponses.set(sessionId, []);
      res.write(`data: ${JSON.stringify({ audio: data })}\n\n`);
    }
  }, 50);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Error handlers
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server (local only)
const startServer = () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

module.exports = app;