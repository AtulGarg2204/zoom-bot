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

// // Middleware
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// // Store active OpenAI connections
// const openaiConnections = new Map();

// // Routes
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Zoom Voice Bot API',
//     status: 'running',
//     endpoints: {
//       health: '/api/health',
//       connect: '/api/connect',
//       sendAudio: '/api/send-audio'
//     }
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'ok', 
//     connections: openaiConnections.size,
//     timestamp: new Date().toISOString()
//   });
// });

// // Endpoint to initiate connection
// app.post('/api/connect', async (req, res) => {
//   const { sessionId } = req.body;
  
//   if (!sessionId) {
//     return res.status(400).json({ error: 'sessionId is required' });
//   }
  
//   try {
//     console.log('Connecting session:', sessionId);
    
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
//       console.log('Connected to OpenAI for session:', sessionId);
      
//       // Configure session
//       openaiWs.send(JSON.stringify({
//         type: 'session.update',
//         session: {
//           modalities: ['text', 'audio'],
//           instructions: 'You are a helpful AI meeting assistant. Be concise, friendly, and natural in conversation.',
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
//       }));
      
//       openaiConnections.set(sessionId, openaiWs);
//     });
    
//     // OpenAI -> Pusher (send to client)
//     openaiWs.on('message', (data) => {
//       try {
//         const message = JSON.parse(data.toString());
//         pusher.trigger(`session-${sessionId}`, 'openai-message', message);
//       } catch (error) {
//         console.error('Error parsing OpenAI message:', error);
//       }
//     });
    
//     openaiWs.on('close', () => {
//       console.log('OpenAI disconnected for session:', sessionId);
//       openaiConnections.delete(sessionId);
//     });
    
//     openaiWs.on('error', (error) => {
//       console.error('OpenAI error:', error);
//       openaiConnections.delete(sessionId);
//     });
    
//     res.json({ success: true, sessionId });
    
//   } catch (error) {
//     console.error('Connection error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Endpoint to send audio to OpenAI
// app.post('/api/send-audio', async (req, res) => {
//   const { sessionId, audio } = req.body;
  
//   if (!sessionId || !audio) {
//     return res.status(400).json({ error: 'sessionId and audio are required' });
//   }
  
//   const openaiWs = openaiConnections.get(sessionId);
  
//   if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
//     try {
//       openaiWs.send(JSON.stringify({
//         type: 'input_audio_buffer.append',
//         audio: audio
//       }));
//       res.json({ success: true });
//     } catch (error) {
//       console.error('Error sending audio:', error);
//       res.status(500).json({ error: 'Failed to send audio' });
//     }
//   } else {
//     res.status(400).json({ error: 'No active connection' });
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
//   res.status(404).json({ error: 'Route not found' });
// });

// // For local development
// const startServer = async () => {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//     console.log(`📡 Pusher Channels ready for real-time updates`);
//     console.log(`🌐 API available at: http://localhost:${PORT}`);
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

console.log('🔧 Pusher initialized with cluster:', process.env.PUSHER_CLUSTER);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log('🔑 OpenAI API Key present:', !!OPENAI_API_KEY);

// Store active OpenAI connections
const openaiConnections = new Map();
// Store audio responses per session
const audioResponses = new Map();

// Routes
app.get('/', (req, res) => {
  console.log('📍 Root endpoint hit');
  res.json({ 
    message: 'Zoom Voice Bot API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      connect: '/api/connect',
      sendAudio: '/api/send-audio',
      getAudio: '/api/get-audio/:sessionId'
    }
  });
});

app.get('/api/health', (req, res) => {
  console.log('📍 Health check endpoint hit');
  res.json({ 
    status: 'ok', 
    connections: openaiConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to initiate connection
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

app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log('======================');
  console.log('🔵 CONNECT REQUEST');
  console.log('Session ID:', sessionId);
  console.log('Current connections BEFORE:', Array.from(openaiConnections.keys()));
  console.log('======================');
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  // Check if already connected
  if (openaiConnections.has(sessionId)) {
    console.log('⚠️ Already connected:', sessionId);
    return res.json({ success: true, sessionId, alreadyConnected: true });
  }
  
  try {
    console.log('🔌 Creating WebSocket...');
    
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );
    
    console.log('⏳ Waiting for connection...');
    
    // Set up ALL handlers BEFORE waiting
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('❌ TIMEOUT after 10 seconds');
        reject(new Error('Connection timeout'));
      }, 10000);
      
      // SETUP 1: Open handler
      openaiWs.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket OPENED');
        
        try {
          // Send config
          console.log('📤 Sending session config...');
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
          console.log('✅ Config sent');
          
          // CRITICAL: Store connection
          console.log('💾 STORING CONNECTION for:', sessionId);
          openaiConnections.set(sessionId, openaiWs);
          console.log('✅ CONNECTION STORED!');
          console.log('📊 Total connections:', openaiConnections.size);
          console.log('📊 All sessions:', Array.from(openaiConnections.keys()));
          
          // Keep-alive
          const keepAliveInterval = setInterval(() => {
            if (openaiWs.readyState === WebSocket.OPEN) {
              console.log('💓 Keep-alive:', sessionId);
              try {
                openaiWs.send(JSON.stringify({
                  type: 'input_audio_buffer.clear'
                }));
              } catch (err) {
                console.error('Keep-alive error:', err.message);
                clearInterval(keepAliveInterval);
              }
            } else {
              console.log('🔴 Connection not open, stopping keep-alive');
              clearInterval(keepAliveInterval);
            }
          }, 20000);
          
          openaiWs.keepAliveInterval = keepAliveInterval;
          console.log('✅ Keep-alive started');
          
          resolve(); // All done!
          
        } catch (err) {
          console.error('❌ Error in open handler:', err);
          reject(err);
        }
      });
      
      // SETUP 2: Error handler (before open)
      openaiWs.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ WebSocket ERROR:', error.message);
        
        // Clean up
        if (openaiWs.keepAliveInterval) {
          clearInterval(openaiWs.keepAliveInterval);
        }
        openaiConnections.delete(sessionId);
        audioResponses.delete(sessionId);
        
        reject(error);
      });
      
      // SETUP 3: Close handler (before open)
      openaiWs.on('close', (code, reason) => {
        console.log('🔴 CONNECTION CLOSED');
        console.log('Session:', sessionId);
        console.log('Code:', code);
        console.log('Reason:', reason);
        
        // Clean up
        if (openaiWs.keepAliveInterval) {
          clearInterval(openaiWs.keepAliveInterval);
        }
        openaiConnections.delete(sessionId);
        audioResponses.delete(sessionId);
        
        console.log('📊 Connections after close:', openaiConnections.size);
      });
      
      // SETUP 4: Message handler (before open)
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
    });
    
    // Connection is ready, respond to client
    console.log('======================');
    console.log('✅ CONNECT SUCCESS');
    console.log('Final connection count:', openaiConnections.size);
    console.log('Final sessions:', Array.from(openaiConnections.keys()));
    console.log('======================');
    
    res.json({ success: true, sessionId });
    
  } catch (error) {
    console.error('======================');
    console.error('❌ CONNECT FAILED');
    console.error('Error:', error.message);
    console.error('======================');
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to send audio to OpenAI
app.post('/api/send-audio', async (req, res) => {
  const { sessionId, audio } = req.body;
  
  console.log('\n🔵 === SEND AUDIO REQUEST ===');
  console.log('🆔 Session ID:', sessionId);
  console.log('🎵 Audio data length:', audio ? audio.length : 0);
  
  if (!sessionId || !audio) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ error: 'sessionId and audio are required' });
  }
  
  const openaiWs = openaiConnections.get(sessionId);
  
  if (!openaiWs) {
    console.log('❌ No connection found for session:', sessionId);
    console.log('📊 Active sessions:', Array.from(openaiConnections.keys()));
    return res.status(400).json({ error: 'No active connection for this session' });
  }
  
  console.log('🔍 WebSocket state:', openaiWs.readyState, '(1 = OPEN)');
  
  if (openaiWs.readyState === WebSocket.OPEN) {
    try {
      const audioMessage = {
        type: 'input_audio_buffer.append',
        audio: audio
      };
      
      console.log('📤 Sending audio to OpenAI...');
      openaiWs.send(JSON.stringify(audioMessage));
      console.log('✅ Audio sent successfully');
      
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      res.status(500).json({ error: 'Failed to send audio' });
    }
  } else {
    console.log('❌ WebSocket not open. State:', openaiWs.readyState);
    res.status(400).json({ error: 'Connection not ready' });
  }
});

// Endpoint to get audio responses
app.get('/api/get-audio/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  console.log('🔵 === GET AUDIO REQUEST ===');
  console.log('🆔 Session ID:', sessionId);
  
  const audioChunks = audioResponses.get(sessionId) || [];
  
  if (audioChunks.length > 0) {
    console.log('✅ Returning', audioChunks.length, 'audio chunks');
    const chunks = [...audioChunks];
    audioResponses.set(sessionId, []); // Clear after getting
    res.json({ audio: chunks });
  } else {
    res.json({ audio: [] });
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
  console.log('❌ 404 - Route not found:', req.path);
  res.status(404).json({ error: 'Route not found' });
});

// For local development
const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('\n🚀🚀🚀 SERVER STARTED 🚀🚀🚀');
    console.log(`📡 Pusher Channels ready for real-time updates`);
    console.log(`🌐 API available at: http://localhost:${PORT}`);
    console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

// Only start server if not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

// Export the Express app for Vercel
module.exports = app;