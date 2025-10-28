

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

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

console.log('🔧 Pusher initialized');

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('🔑 OpenAI API Key present:', !!OPENAI_API_KEY);
console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

const deepgram = createClient(DEEPGRAM_API_KEY);
console.log('🎙️ Deepgram client initialized');

const deepgramConnections = new Map();
const audioResponses = new Map();
const conversationHistory = new Map();

async function processWithLLM(sessionId, userMessage, t0) {
  try {
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);
    
    history.push({ role: 'user', content: userMessage });
    if (history.length > 8) history.splice(0, 2);
    
    const t_llm_start = Date.now();
    console.log(`[${t_llm_start - t0}ms] LLM START`);
    
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
            content: 'Reply in 1 short sentence (8-12 words). Be natural and conversational.'
          },
          ...history
        ],
        max_tokens: 30,
        temperature: 0.7,
        stream: false
      })
    });
    
    const data = await response.json();
    const fullResponse = data.choices[0].message.content.trim();
    
    const t_llm_end = Date.now();
    console.log(`[${t_llm_end - t0}ms] LLM END: "${fullResponse}"`);
    
    // Send AI response to frontend via Pusher
    const channel = `session-${sessionId}`;
    
    try {
      await pusher.trigger(channel, 'ai-response', {
        text: fullResponse
      });
      console.log(`✅ AI response sent via Pusher`);
    } catch (err) {
      console.error('❌ Pusher error:', err);
    }
    
    history.push({ role: 'assistant', content: fullResponse });
    
    await convertToSpeech(sessionId, fullResponse, t0);
    
  } catch (error) {
    console.error('LLM ERROR:', error.message);
  }
}

async function convertToSpeech(sessionId, text, t0) {
  try {
    const t_tts_start = Date.now();
    console.log(`[${t_tts_start - t0}ms] TTS START`);
    
    const response = await deepgram.speak.request(
      { text },
      {
        model: 'aura-asteria-en',
        encoding: 'linear16',
        sample_rate: 24000,
        container: 'none'
      }
    );
    
    const stream = await response.getStream();
    const audioChunks = [];
    
    for await (const chunk of stream) {
      audioChunks.push(chunk);
    }
    
    const audioBuffer = Buffer.concat(audioChunks);
    const base64Audio = audioBuffer.toString('base64');
    
    const t_tts_end = Date.now();
    console.log(`[${t_tts_end - t0}ms] TTS END`);
    
    // Send notification that audio was received
    const channel = `session-${sessionId}`;
    
    try {
      await pusher.trigger(channel, 'audio-received', {
        message: 'Received audio from Deepgram',
        timestamp: Date.now()
      });
      console.log(`✅ Audio-received notification sent`);
    } catch (err) {
      console.error('❌ Pusher error:', err);
    }
    
    if (!audioResponses.has(sessionId)) {
      audioResponses.set(sessionId, []);
    }
    audioResponses.get(sessionId).push({ audio: base64Audio, t0: t0 });
    
  } catch (error) {
    console.error('TTS ERROR:', error.message);
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Zoom Voice Bot', 
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
  res.json({ 
    status: 'ok', 
    connections: deepgramConnections.size,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log('\n🔵 CONNECT:', sessionId);
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  try {
    console.log('🔌 Connecting to Deepgram STT...');
    
    const dgConnection = deepgram.listen.live({
  model: 'nova-3',
  language: 'en-US',
  smart_format: true,
  interim_results: true,
  utterance_end_ms: 1000,
  vad_events: true,
  encoding: 'linear16',
  sample_rate: 24000,
  channels: 1,
  endpointing: 700  // ← ADD THIS
});
    
    let lastTranscript = '';
    let processingTimer = null;
    let lastProcessedTranscript = '';
    let t0 = null;
    
    dgConnection.on('open', () => {
      console.log(`✅ Connected: ${sessionId}`);
      deepgramConnections.set(sessionId, dgConnection);
      console.log('📊 Total connections:', deepgramConnections.size);
    });
    
    // dgConnection.on('Results', (data) => {
    //   const transcript = data.channel.alternatives[0].transcript;
      
    //   if (transcript && transcript.length > 0) {
    //     lastTranscript = transcript;
        
    //     // Send interim transcripts to frontend
    //     const channel = `session-${sessionId}`;
    //     pusher.trigger(channel, 'transcript-interim', {
    //       text: transcript,
    //       is_final: data.is_final
    //     }).catch(err => console.error('Pusher error:', err));
        
    //     if (processingTimer) {
    //       clearTimeout(processingTimer);
    //     }
        
    //     // Only process final transcripts
    //     if (data.is_final) {
    //       processingTimer = setTimeout(() => {
    //         if (lastTranscript && lastTranscript !== lastProcessedTranscript) {
    //           t0 = Date.now();
              
    //           console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    //           console.log(`[T=0] USER STOPPED SPEAKING`);
    //           console.log(`Transcript: "${lastTranscript}"`);
              
    //           const t_stt_end = Date.now();
    //           console.log(`[${t_stt_end - t0}ms] STT END`);
              
    //           // Send final transcript to frontend
    //           pusher.trigger(channel, 'transcript', {
    //             text: lastTranscript
    //           }).then(() => {
    //             console.log(`✅ Transcript sent via Pusher`);
    //           }).catch(err => {
    //             console.error('❌ Pusher error:', err);
    //           });
              
    //           lastProcessedTranscript = lastTranscript;
    //           processWithLLM(sessionId, lastTranscript, t0);
    //         }
    //       }, 500);
    //     }
    //   }
    // });
    
 let lastAudioTime = Date.now();
let speechStartTime = null;
dgConnection.on('Results', (data) => {
  const transcript = data.channel.alternatives[0].transcript;
  
  if (transcript && transcript.length > 0) {
    
    // CONSOLE LOGS TO CHECK SILENCE & ENDPOINTING
    console.log('\n📊 === DEEPGRAM RESPONSE ===');
    console.log('📝 Transcript:', transcript);
    console.log('✅ is_final:', data.is_final);
    console.log('🔚 speech_final:', data.speech_final);
    
    // CHECK SILENCE DURATION (if available in response)
    if (data.speech_final) {
      console.log('🎯 ENDPOINTING TRIGGERED!');
      console.log('   ✅ Detected 700ms of silence');
      console.log('   ✅ Complete utterance finalized');
    }
    
    // Show metadata if available
    if (data.duration) {
      console.log('⏱️  Audio duration:', data.duration * 1000 + 'ms');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const channel = `session-${sessionId}`;
    
    // Send interim transcripts to frontend
    pusher.trigger(channel, 'transcript-interim', {
      text: transcript,
      is_final: data.is_final,
      speech_final: data.speech_final
    }).catch(err => console.error('Pusher error:', err));
    
    // Only process when BOTH is_final AND speech_final are true
    if (data.is_final && data.speech_final) {
      
      // Prevent duplicate processing
      if (transcript !== lastProcessedTranscript) {
        
        const t0 = Date.now();
        
        console.log('🚀 === PROCESSING COMPLETE UTTERANCE ===');
        console.log(`[T=0] COMPLETE UTTERANCE DETECTED`);
        console.log(`Transcript: "${transcript}"`);
        
        const t_stt_end = Date.now();
        console.log(`[${t_stt_end - t0}ms] STT END`);
        
        // Send final transcript to frontend
        pusher.trigger(channel, 'transcript', {
          text: transcript
        }).then(() => {
          console.log(`✅ Transcript sent via Pusher`);
        }).catch(err => {
          console.error('❌ Pusher error:', err);
        });
        
        lastProcessedTranscript = transcript;
        processWithLLM(sessionId, transcript, t0);
        
      } else {
        console.log('⚠️  Duplicate transcript, skipping');
      }
    } else {
      // Show why we're not processing
      if (!data.is_final) {
        console.log('⏳ Not confident yet (is_final: false)');
      } else if (!data.speech_final) {
        console.log('⏳ User still speaking (speech_final: false)');
      }
    }
  }
});
    dgConnection.on('error', (error) => {
      console.error('STT ERROR:', error.message);
    });
    
    // dgConnection.on('close', () => {
    //   console.log(`🔴 Disconnected: ${sessionId}`);
    //   deepgramConnections.delete(sessionId);
    //   conversationHistory.delete(sessionId);
    //   if (processingTimer) clearTimeout(processingTimer);
    // });
    dgConnection.on('close', () => {
  console.log(`🔴 Disconnected: ${sessionId}`);
  deepgramConnections.delete(sessionId);
  conversationHistory.delete(sessionId);
  // Removed processingTimer cleanup - no longer needed
});
    
    res.json({ success: true, sessionId, service: 'deepgram' });
    console.log('✅ Connect response sent');
    
  } catch (error) {
    console.error('CONNECT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-audio', async (req, res) => {
  const { sessionId, audio } = req.body;
  
  if (!sessionId || !audio) {
    return res.status(400).json({ error: 'Missing data' });
  }
  
  const dgConnection = deepgramConnections.get(sessionId);
  
  if (!dgConnection) {
    console.log('❌ No connection for session:', sessionId);
    console.log('📊 Active sessions:', Array.from(deepgramConnections.keys()));
    return res.status(400).json({ error: 'No active connection' });
  }
  
  try {
    const audioBuffer = Buffer.from(audio, 'base64');
    dgConnection.send(audioBuffer);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Send audio error:', error);
    res.status(500).json({ error: 'Send failed' });
  }
});

app.get('/api/get-audio/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const audioData = audioResponses.get(sessionId) || [];
  
  if (audioData.length > 0) {
    const data = [...audioData];
    audioResponses.set(sessionId, []);
    res.json({ 
      audio: data.map(d => d.audio),
      t0: data[0].t0
    });
  } else {
    res.json({ audio: [] });
  }
});

app.use((error, req, res, next) => {
  console.error('SERVER ERROR:', error.message);
  res.status(500).json({ error: 'Server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n⚡ Server running on http://localhost:${PORT}\n`);
  });
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

module.exports = app;