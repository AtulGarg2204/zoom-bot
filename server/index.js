

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

// const express = require('express');
// const cors = require('cors');
// const Pusher = require('pusher');
// const WebSocket = require('ws');
// require('dotenv').config();
// const { createClient } = require('@deepgram/sdk');

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

// const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
// console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

// // Initialize Deepgram client
// const deepgram = createClient(DEEPGRAM_API_KEY);
// console.log('🎙️ Deepgram client initialized');

// // Store active Deepgram connections
// const deepgramConnections = new Map();
// // Store transcripts per session
// const transcripts = new Map();
// // Store audio responses per session
// const audioResponses = new Map();

// // Function to process transcript with LLM
// async function processWithLLM(sessionId, userMessage) {
//   try {
//     console.log('🤖 Processing with LLM:', userMessage);
    
//     // Call OpenAI API
//     const response = await fetch('https://api.openai.com/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${OPENAI_API_KEY}`
//       },
//       body: JSON.stringify({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content: 'You are a helpful AI meeting assistant. Be concise, friendly, and natural in conversation. Keep responses under 3 sentences.'
//           },
//           {
//             role: 'user',
//             content: userMessage
//           }
//         ],
//         max_tokens: 150,
//         temperature: 0.7
//       })
//     });
    
//     const data = await response.json();
//     const aiResponse = data.choices[0].message.content;
    
//     console.log('🤖 LLM Response:', aiResponse);
    
//     // Send response via Pusher
//     const channel = `session-${sessionId}`;
//     pusher.trigger(channel, 'llm-response', {
//       text: aiResponse
//     }).catch(err => {
//       console.error('❌ Pusher error:', err.message);
//     });
    
//     // Now convert to speech with Deepgram TTS
//     await convertToSpeech(sessionId, aiResponse);
    
//   } catch (error) {
//     console.error('❌ Error processing with LLM:', error);
//   }
// }

// // Function to convert text to speech using Deepgram TTS
// async function convertToSpeech(sessionId, text) {
//   try {
//     console.log('🔊 Converting to speech:', text);
    
//     // Call Deepgram TTS API
//     const response = await deepgram.speak.request(
//       { text },
//       {
//         model: 'aura-asteria-en',
//         encoding: 'linear16',
//         sample_rate: 24000
//       }
//     );
    
//     // Get audio stream
//     const stream = await response.getStream();
//     const audioChunks = [];
    
//     // Collect audio chunks
//     for await (const chunk of stream) {
//       audioChunks.push(chunk);
//     }
    
//     // Combine all chunks
//     const audioBuffer = Buffer.concat(audioChunks);
//     const base64Audio = audioBuffer.toString('base64');
    
//     console.log('✅ Audio generated, size:', audioBuffer.length);
    
//     // Store audio for client to retrieve
//     if (!audioResponses.has(sessionId)) {
//       audioResponses.set(sessionId, []);
//     }
//     audioResponses.get(sessionId).push(base64Audio);
    
//     console.log('💾 Audio stored for session:', sessionId);
    
//   } catch (error) {
//     console.error('❌ Error converting to speech:', error);
//   }
// }

// // Routes
// app.get('/', (req, res) => {
//   console.log('📍 Root endpoint hit');
//   res.json({ 
//     message: 'Zoom Voice Bot API with Deepgram',
//     status: 'running',
//     endpoints: {
//       health: '/api/health',
//       connect: '/api/connect',
//       sendAudio: '/api/send-audio',
//       getAudio: '/api/get-audio/:sessionId',
//       getTranscript: '/api/get-transcript/:sessionId'
//     }
//   });
// });

// app.get('/api/health', (req, res) => {
//   console.log('📍 Health check endpoint hit');
//   res.json({ 
//     status: 'ok', 
//     connections: deepgramConnections.size,
//     timestamp: new Date().toISOString()
//   });
// });

// // Endpoint to initiate connection with Deepgram
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
//     console.log('🔌 Attempting to connect to Deepgram STT...');
    
//     // Create Deepgram live transcription connection
//     const dgConnection = deepgram.listen.live({
//       model: 'nova-2',
//       language: 'en',
//       smart_format: true,
//       interim_results: true,
//       utterance_end_ms: 1000,
//       vad_events: true,
//       encoding: 'linear16',
//       sample_rate: 24000,
//       channels: 1
//     });
    
//     // Handle connection open
//     dgConnection.on('open', () => {
//       console.log('✅ Connected to Deepgram STT for session:', sessionId);
//       deepgramConnections.set(sessionId, dgConnection);
//       console.log('💾 Stored Deepgram connection for session:', sessionId);
//       console.log('📊 Total active connections:', deepgramConnections.size);
//     });
    
//     // Handle transcription results
//     dgConnection.on('Results', (data) => {
//       const transcript = data.channel.alternatives[0].transcript;
      
//       if (transcript && transcript.length > 0) {
//         console.log('📝 Transcript:', transcript);
//         console.log('🎯 Is final:', data.is_final);
        
//         // Store transcript
//         if (!transcripts.has(sessionId)) {
//           transcripts.set(sessionId, []);
//         }
        
//         transcripts.get(sessionId).push({
//           text: transcript,
//           is_final: data.is_final,
//           timestamp: new Date().toISOString()
//         });
        
//         // Send transcript via Pusher
//         const channel = `session-${sessionId}`;
//         pusher.trigger(channel, 'transcript', {
//           text: transcript,
//           is_final: data.is_final
//         }).catch(err => {
//           console.error('❌ Pusher error:', err.message);
//         });
        
//         // If final transcript, send to LLM
//         if (data.is_final) {
//           console.log('✅ Final transcript received, sending to LLM...');
//           processWithLLM(sessionId, transcript);
//         }
//       }
//     });
    
//     // Handle metadata
//     dgConnection.on('Metadata', (data) => {
//       console.log('📊 Deepgram metadata received');
//     });
    
//     // Handle errors
//     dgConnection.on('error', (error) => {
//       console.error('❌ Deepgram error:', error);
//     });
    
//     // Handle close
//     dgConnection.on('close', () => {
//       console.log('🔴 Deepgram disconnected for session:', sessionId);
//       deepgramConnections.delete(sessionId);
//       transcripts.delete(sessionId);
//     });
    
//     res.json({ success: true, sessionId, service: 'deepgram' });
//     console.log('✅ Connect response sent');
    
//   } catch (error) {
//     console.error('❌ Connection error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Endpoint to send audio to Deepgram
// app.post('/api/send-audio', async (req, res) => {
//   const { sessionId, audio } = req.body;
  
//   console.log('\n🔵 === SEND AUDIO REQUEST ===');
//   console.log('🆔 Session ID:', sessionId);
//   console.log('🎵 Audio data length:', audio ? audio.length : 0);
  
//   if (!sessionId || !audio) {
//     console.log('❌ Missing required fields');
//     return res.status(400).json({ error: 'sessionId and audio are required' });
//   }
  
//   const dgConnection = deepgramConnections.get(sessionId);
  
//   if (!dgConnection) {
//     console.log('❌ No Deepgram connection found for session:', sessionId);
//     console.log('📊 Active sessions:', Array.from(deepgramConnections.keys()));
//     return res.status(400).json({ error: 'No active connection for this session' });
//   }
  
//   try {
//     // Decode base64 audio to buffer
//     const audioBuffer = Buffer.from(audio, 'base64');
    
//     console.log('📤 Sending audio to Deepgram... Buffer size:', audioBuffer.length);
    
//     // Send audio to Deepgram
//     dgConnection.send(audioBuffer);
    
//     console.log('✅ Audio sent to Deepgram successfully');
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('❌ Error sending audio to Deepgram:', error);
//     res.status(500).json({ error: 'Failed to send audio' });
//   }
// });

// // Endpoint to get transcripts
// app.get('/api/get-transcript/:sessionId', (req, res) => {
//   const { sessionId } = req.params;
  
//   console.log('🔵 === GET TRANSCRIPT REQUEST ===');
//   console.log('🆔 Session ID:', sessionId);
  
//   const sessionTranscripts = transcripts.get(sessionId) || [];
  
//   if (sessionTranscripts.length > 0) {
//     console.log('✅ Returning', sessionTranscripts.length, 'transcripts');
//     const texts = [...sessionTranscripts];
//     transcripts.set(sessionId, []); // Clear after getting
//     res.json({ transcripts: texts });
//   } else {
//     res.json({ transcripts: [] });
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
//     console.log(`🎙️ Deepgram STT ready`);
//     console.log(`🔊 Deepgram TTS ready`);
//     console.log(`🤖 OpenAI LLM ready`);
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
const { createClient } = require('@deepgram/sdk');

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

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

// Initialize Deepgram client
const deepgram = createClient(DEEPGRAM_API_KEY);
console.log('🎙️ Deepgram client initialized');

// Store active Deepgram connections
const deepgramConnections = new Map();
// Store transcripts per session
const transcripts = new Map();
// Store audio responses per session
const audioResponses = new Map();

// Function to process transcript with LLM
async function processWithLLM(sessionId, userMessage) {
  try {
    console.log('🤖 Processing with LLM:', userMessage);
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI meeting assistant. Be concise, friendly, and natural in conversation. Keep responses under 3 sentences.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('🤖 LLM Response:', aiResponse);
    
    // Send response via Pusher
    const channel = `session-${sessionId}`;
    pusher.trigger(channel, 'llm-response', {
      text: aiResponse
    }).catch(err => {
      console.error('❌ Pusher error:', err.message);
    });
    
    // Now convert to speech with Deepgram TTS
    await convertToSpeech(sessionId, aiResponse);
    
  } catch (error) {
    console.error('❌ Error processing with LLM:', error);
  }
}

// Function to convert text to speech using Deepgram TTS
async function convertToSpeech(sessionId, text) {
  try {
    console.log('🔊 Converting to speech:', text);
    
    // Call Deepgram TTS API
    const response = await deepgram.speak.request(
      { text },
      {
        model: 'aura-asteria-en',
        encoding: 'linear16',
        sample_rate: 24000
      }
    );
    
    // Get audio stream
    const stream = await response.getStream();
    const audioChunks = [];
    
    // Collect audio chunks
    for await (const chunk of stream) {
      audioChunks.push(chunk);
    }
    
    // Combine all chunks
    const audioBuffer = Buffer.concat(audioChunks);
    const base64Audio = audioBuffer.toString('base64');
    
    console.log('✅ Audio generated, size:', audioBuffer.length);
    
    // Store audio for client to retrieve
    if (!audioResponses.has(sessionId)) {
      audioResponses.set(sessionId, []);
    }
    audioResponses.get(sessionId).push(base64Audio);
    
    console.log('💾 Audio stored for session:', sessionId);
    
  } catch (error) {
    console.error('❌ Error converting to speech:', error);
  }
}

// Routes
app.get('/', (req, res) => {
  console.log('📍 Root endpoint hit');
  res.json({ 
    message: 'Zoom Voice Bot API with Deepgram',
    status: 'running',
    endpoints: {
      health: '/api/health',
      connect: '/api/connect',
      sendAudio: '/api/send-audio',
      getAudio: '/api/get-audio/:sessionId',
      getTranscript: '/api/get-transcript/:sessionId'
    }
  });
});

app.get('/api/health', (req, res) => {
  console.log('📍 Health check endpoint hit');
  res.json({ 
    status: 'ok', 
    connections: deepgramConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to initiate connection with Deepgram
app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log('\n🔵 === CONNECT REQUEST ===');
  console.log('📦 Request body:', req.body);
  console.log('🆔 Session ID:', sessionId);
  
  if (!sessionId) {
    console.log('❌ No sessionId provided');
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    console.log('🔌 Attempting to connect to Deepgram STT...');
    
    // Create Deepgram live transcription connection
    const dgConnection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
      encoding: 'linear16',
      sample_rate: 24000,
      channels: 1
    });
    
    // Handle connection open
    dgConnection.on('open', () => {
      console.log('✅ Connected to Deepgram STT for session:', sessionId);
      deepgramConnections.set(sessionId, dgConnection);
      console.log('💾 Stored Deepgram connection for session:', sessionId);
      console.log('📊 Total active connections:', deepgramConnections.size);
    });
    
    // Handle transcription results
    dgConnection.on('Results', (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      
      if (transcript && transcript.length > 0) {
        console.log('📝 Transcript:', transcript);
        console.log('🎯 Is final:', data.is_final);
        
        // Store transcript
        if (!transcripts.has(sessionId)) {
          transcripts.set(sessionId, []);
        }
        
        transcripts.get(sessionId).push({
          text: transcript,
          is_final: data.is_final,
          timestamp: new Date().toISOString()
        });
        
        // Send transcript via Pusher
        const channel = `session-${sessionId}`;
        pusher.trigger(channel, 'transcript', {
          text: transcript,
          is_final: data.is_final
        }).catch(err => {
          console.error('❌ Pusher error:', err.message);
        });
        
        // If final transcript, send to LLM
        if (data.is_final) {
          console.log('✅ Final transcript received, sending to LLM...');
          processWithLLM(sessionId, transcript);
        }
      }
    });
    
    // Handle metadata
    dgConnection.on('Metadata', (data) => {
      console.log('📊 Deepgram metadata received');
    });
    
    // Handle errors
    dgConnection.on('error', (error) => {
      console.error('❌ Deepgram error:', error);
    });
    
    // Handle close
    dgConnection.on('close', () => {
      console.log('🔴 Deepgram disconnected for session:', sessionId);
      deepgramConnections.delete(sessionId);
      transcripts.delete(sessionId);
    });
    
    res.json({ success: true, sessionId, service: 'deepgram' });
    console.log('✅ Connect response sent');
    
  } catch (error) {
    console.error('❌ Connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to send audio to Deepgram
app.post('/api/send-audio', async (req, res) => {
  const { sessionId, audio } = req.body;
  
  console.log('\n🔵 === SEND AUDIO REQUEST ===');
  console.log('🆔 Session ID:', sessionId);
  console.log('🎵 Audio data length:', audio ? audio.length : 0);
  
  if (!sessionId || !audio) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ error: 'sessionId and audio are required' });
  }
  
  const dgConnection = deepgramConnections.get(sessionId);
  
  if (!dgConnection) {
    console.log('❌ No Deepgram connection found for session:', sessionId);
    console.log('📊 Active sessions:', Array.from(deepgramConnections.keys()));
    return res.status(400).json({ error: 'No active connection for this session' });
  }
  
  try {
    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    console.log('📤 Sending audio to Deepgram... Buffer size:', audioBuffer.length);
    
    // Send audio to Deepgram
    dgConnection.send(audioBuffer);
    
    console.log('✅ Audio sent to Deepgram successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error sending audio to Deepgram:', error);
    res.status(500).json({ error: 'Failed to send audio' });
  }
});

// Endpoint to get transcripts
app.get('/api/get-transcript/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  console.log('🔵 === GET TRANSCRIPT REQUEST ===');
  console.log('🆔 Session ID:', sessionId);
  
  const sessionTranscripts = transcripts.get(sessionId) || [];
  
  if (sessionTranscripts.length > 0) {
    console.log('✅ Returning', sessionTranscripts.length, 'transcripts');
    const texts = [...sessionTranscripts];
    transcripts.set(sessionId, []); // Clear after getting
    res.json({ transcripts: texts });
  } else {
    res.json({ transcripts: [] });
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
    console.log(`🎙️ Deepgram STT ready`);
    console.log(`🔊 Deepgram TTS ready`);
    console.log(`🤖 OpenAI LLM ready`);
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