

// const express = require('express');
// const cors = require('cors');
// const Pusher = require('pusher');
// const WebSocket = require('ws');
// require('dotenv').config();
// const { createClient } = require('@deepgram/sdk');

// const app = express();

// const pusher = new Pusher({
//   appId: process.env.PUSHER_APP_ID,
//   key: process.env.PUSHER_KEY,
//   secret: process.env.PUSHER_SECRET,
//   cluster: process.env.PUSHER_CLUSTER,
//   useTLS: true
// });

// console.log('🔧 Pusher initialized');

// // CORS
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
// }));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// console.log('🔑 OpenAI API Key present:', !!OPENAI_API_KEY);
// console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

// const deepgram = createClient(DEEPGRAM_API_KEY);
// console.log('🎙️ Deepgram client initialized');

// const deepgramConnections = new Map();
// const audioResponses = new Map();
// const conversationHistory = new Map();

// async function processWithLLM(sessionId, userMessage, t0) {
//   try {
//     if (!conversationHistory.has(sessionId)) {
//       conversationHistory.set(sessionId, []);
//     }
//     const history = conversationHistory.get(sessionId);
    
//     history.push({ role: 'user', content: userMessage });
//     if (history.length > 8) history.splice(0, 2);
    
//     const t_llm_start = Date.now();
//     console.log(`[${t_llm_start - t0}ms] LLM START`);
    
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
//             content: 'Reply in 1 short sentence (8-12 words). Be natural and conversational.'
//           },
//           ...history
//         ],
//         max_tokens: 30,
//         temperature: 0.7,
//         stream: false
//       })
//     });
    
//     const data = await response.json();
//     const fullResponse = data.choices[0].message.content.trim();
    
//     const t_llm_end = Date.now();
//     console.log(`[${t_llm_end - t0}ms] LLM END: "${fullResponse}"`);
    
//     // Send AI response to frontend via Pusher
//     const channel = `session-${sessionId}`;
    
//     try {
//       await pusher.trigger(channel, 'ai-response', {
//         text: fullResponse
//       });
//       console.log(`✅ AI response sent via Pusher`);
//     } catch (err) {
//       console.error('❌ Pusher error:', err);
//     }
    
//     history.push({ role: 'assistant', content: fullResponse });
    
//     await convertToSpeech(sessionId, fullResponse, t0);
    
//   } catch (error) {
//     console.error('LLM ERROR:', error.message);
//   }
// }

// async function convertToSpeech(sessionId, text, t0) {
//   try {
//     const t_tts_start = Date.now();
//     console.log(`[${t_tts_start - t0}ms] TTS START`);
    
//     const response = await deepgram.speak.request(
//       { text },
//       {
//         model: 'aura-asteria-en',
//         encoding: 'linear16',
//         sample_rate: 24000,
//         container: 'none'
//       }
//     );
    
//     const stream = await response.getStream();
//     const audioChunks = [];
    
//     for await (const chunk of stream) {
//       audioChunks.push(chunk);
//     }
    
//     const audioBuffer = Buffer.concat(audioChunks);
//     const base64Audio = audioBuffer.toString('base64');
    
//     const t_tts_end = Date.now();
//     console.log(`[${t_tts_end - t0}ms] TTS END`);
    
//     // Send notification that audio was received
//     const channel = `session-${sessionId}`;
    
//     try {
//       await pusher.trigger(channel, 'audio-received', {
//         message: 'Received audio from Deepgram',
//         timestamp: Date.now()
//       });
//       console.log(`✅ Audio-received notification sent`);
//     } catch (err) {
//       console.error('❌ Pusher error:', err);
//     }
    
//     if (!audioResponses.has(sessionId)) {
//       audioResponses.set(sessionId, []);
//     }
//     audioResponses.get(sessionId).push({ audio: base64Audio, t0: t0 });
    
//   } catch (error) {
//     console.error('TTS ERROR:', error.message);
//   }
// }

// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Zoom Voice Bot', 
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
//   res.json({ 
//     status: 'ok', 
//     connections: deepgramConnections.size,
//     timestamp: new Date().toISOString()
//   });
// });

// app.post('/api/connect', async (req, res) => {
//   const { sessionId } = req.body;
  
//   console.log('\n🔵 CONNECT:', sessionId);
  
//   if (!sessionId) {
//     return res.status(400).json({ error: 'sessionId required' });
//   }
  
//   try {
//     console.log('🔌 Connecting to Deepgram STT...');
    
//     const dgConnection = deepgram.listen.live({
//   model: 'nova-3',
//   language: 'en-US',
//   smart_format: true,
//   interim_results: true,
//   utterance_end_ms: 1000,
//   vad_events: true,
//   encoding: 'linear16',
//   sample_rate: 24000,
//   channels: 1,
//   endpointing: 700  // ← ADD THIS
// });
    
//     let lastTranscript = '';
//     let processingTimer = null;
//     let lastProcessedTranscript = '';
//     let t0 = null;
    
//     dgConnection.on('open', () => {
//       console.log(`✅ Connected: ${sessionId}`);
//       deepgramConnections.set(sessionId, dgConnection);
//       console.log('📊 Total connections:', deepgramConnections.size);
//     });
    

//  let lastAudioTime = Date.now();
// let speechStartTime = null;
// dgConnection.on('Results', (data) => {
//   const transcript = data.channel.alternatives[0].transcript;
  
//   if (transcript && transcript.length > 0) {
    
//     // CONSOLE LOGS TO CHECK SILENCE & ENDPOINTING
//     console.log('\n📊 === DEEPGRAM RESPONSE ===');
//     console.log('📝 Transcript:', transcript);
//     console.log('✅ is_final:', data.is_final);
//     console.log('🔚 speech_final:', data.speech_final);
    
//     // CHECK SILENCE DURATION (if available in response)
//     if (data.speech_final) {
//       console.log('🎯 ENDPOINTING TRIGGERED!');
//       console.log('   ✅ Detected 700ms of silence');
//       console.log('   ✅ Complete utterance finalized');
//     }
    
//     // Show metadata if available
//     if (data.duration) {
//       console.log('⏱️  Audio duration:', data.duration * 1000 + 'ms');
//     }
    
//     console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
//     const channel = `session-${sessionId}`;
    
//     // Send interim transcripts to frontend
//     pusher.trigger(channel, 'transcript-interim', {
//       text: transcript,
//       is_final: data.is_final,
//       speech_final: data.speech_final
//     }).catch(err => console.error('Pusher error:', err));
    
//     // Only process when BOTH is_final AND speech_final are true
//     if (data.is_final && data.speech_final) {
      
//       // Prevent duplicate processing
//       if (transcript !== lastProcessedTranscript) {
        
//         const t0 = Date.now();
        
//         console.log('🚀 === PROCESSING COMPLETE UTTERANCE ===');
//         console.log(`[T=0] COMPLETE UTTERANCE DETECTED`);
//         console.log(`Transcript: "${transcript}"`);
        
//         const t_stt_end = Date.now();
//         console.log(`[${t_stt_end - t0}ms] STT END`);
        
//         // Send final transcript to frontend
//         pusher.trigger(channel, 'transcript', {
//           text: transcript
//         }).then(() => {
//           console.log(`✅ Transcript sent via Pusher`);
//         }).catch(err => {
//           console.error('❌ Pusher error:', err);
//         });
        
//         lastProcessedTranscript = transcript;
//         processWithLLM(sessionId, transcript, t0);
        
//       } else {
//         console.log('⚠️  Duplicate transcript, skipping');
//       }
//     } else {
//       // Show why we're not processing
//       if (!data.is_final) {
//         console.log('⏳ Not confident yet (is_final: false)');
//       } else if (!data.speech_final) {
//         console.log('⏳ User still speaking (speech_final: false)');
//       }
//     }
//   }
// });
//     dgConnection.on('error', (error) => {
//       console.error('STT ERROR:', error.message);
//     });
    
//     // dgConnection.on('close', () => {
//     //   console.log(`🔴 Disconnected: ${sessionId}`);
//     //   deepgramConnections.delete(sessionId);
//     //   conversationHistory.delete(sessionId);
//     //   if (processingTimer) clearTimeout(processingTimer);
//     // });
//     dgConnection.on('close', () => {
//   console.log(`🔴 Disconnected: ${sessionId}`);
//   deepgramConnections.delete(sessionId);
//   conversationHistory.delete(sessionId);
//   // Removed processingTimer cleanup - no longer needed
// });
    
//     res.json({ success: true, sessionId, service: 'deepgram' });
//     console.log('✅ Connect response sent');
    
//   } catch (error) {
//     console.error('CONNECT ERROR:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/send-audio', async (req, res) => {
//   const { sessionId, audio } = req.body;
  
//   if (!sessionId || !audio) {
//     return res.status(400).json({ error: 'Missing data' });
//   }
  
//   const dgConnection = deepgramConnections.get(sessionId);
  
//   if (!dgConnection) {
//     console.log('❌ No connection for session:', sessionId);
//     console.log('📊 Active sessions:', Array.from(deepgramConnections.keys()));
//     return res.status(400).json({ error: 'No active connection' });
//   }
  
//   try {
//     const audioBuffer = Buffer.from(audio, 'base64');
//     dgConnection.send(audioBuffer);
//     res.json({ success: true });
//   } catch (error) {
//     console.error('❌ Send audio error:', error);
//     res.status(500).json({ error: 'Send failed' });
//   }
// });

// app.get('/api/get-audio/:sessionId', (req, res) => {
//   const { sessionId } = req.params;
//   const audioData = audioResponses.get(sessionId) || [];
  
//   if (audioData.length > 0) {
//     const data = [...audioData];
//     audioResponses.set(sessionId, []);
//     res.json({ 
//       audio: data.map(d => d.audio),
//       t0: data[0].t0
//     });
//   } else {
//     res.json({ audio: [] });
//   }
// });

// app.use((error, req, res, next) => {
//   console.error('SERVER ERROR:', error.message);
//   res.status(500).json({ error: 'Server error' });
// });

// app.use((req, res) => {
//   res.status(404).json({ error: 'Not found' });
// });

// const startServer = async () => {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`\n⚡ Server running on http://localhost:${PORT}\n`);
//   });
// };

// if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
//   startServer();
// }

// module.exports = app;

const express = require('express');
const cors = require('cors');
const Pusher = require('pusher');
const WebSocket = require('ws');
require('dotenv').config();
const { createClient } = require('@deepgram/sdk');
const Groq = require('groq-sdk');

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

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('🔑 Groq API Key present:', !!GROQ_API_KEY);
console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

const groq = new Groq({
  apiKey: GROQ_API_KEY
});

const deepgram = createClient(DEEPGRAM_API_KEY);
console.log('🎙️ Deepgram client initialized');

const deepgramConnections = new Map();
const audioResponses = new Map();
const conversationHistory = new Map();

// Helper function to add messages to conversation history with speaker labels
function addToHistory(sessionId, speaker, message) {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  
  const history = conversationHistory.get(sessionId);
  
  history.push({
    speaker: speaker,
    content: message,
    timestamp: new Date().toISOString()
  });
  
  // Keep last 12 messages for context
  if (history.length > 12) {
    history.splice(0, 2);
  }
  
  conversationHistory.set(sessionId, history);
}

// Context-aware LLM processing with Groq + Llama
async function processWithLLMContextAware(sessionId, t0) {
  try {
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    
    const history = conversationHistory.get(sessionId);
    
    // Build conversation context with speaker labels
    const conversationContext = history.map(msg => {
      return `${msg.speaker}: ${msg.content}`;
    }).join('\n');
    
    const t_llm_start = Date.now();
    
    console.log('\n' + '🤖'.repeat(40));
    console.log('🤖 LLM CONTEXT-AWARE PROCESSING (GROQ + LLAMA)');
    console.log('🤖'.repeat(40));
    console.log(`\n⏱️  [${t_llm_start - t0}ms] Groq LLM Request Starting...`);
    console.log('🦙 Model: Llama 4 Maverick 17B');
    
    console.log('\n📜 CONVERSATION CONTEXT SENT TO LLM:');
    console.log('┌' + '─'.repeat(78) + '┐');
    if (conversationContext.length > 0) {
      conversationContext.split('\n').forEach(line => {
        console.log('│ ' + line.padEnd(77) + '│');
      });
    } else {
      console.log('│ ' + '(No conversation history yet)'.padEnd(77) + '│');
    }
    console.log('└' + '─'.repeat(78) + '┘');
    
    console.log('\n📊 CONTEXT STATS:');
    console.log(`   Total messages in context: ${history.length}`);
    console.log(`   Context length: ${conversationContext.length} characters`);
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are an AI Assistant in a meeting. Speakers are labeled as Speaker 0, Speaker 1, etc.

CRITICAL: Reply with ONLY your direct answer. NO explanations. NO reasoning. NO meta-commentary.

Rules:
1. If someone says "bot", "assistant", or "AI" → Give direct answer
2. If it's a follow-up after you just spoke → Give direct answer  
3. If people talking to each other → Say only "SILENT"
4. If unclear → Say only "SILENT"

Keep responses under 25 words.

CORRECT Responses:
"Hey bot, what's 2+2?" → "Four."
"How are you?" → "I'm well, thanks!"
"Tell me about cricket" → "It's a bat-and-ball sport."
"Did you send the report?" "Yes" → "SILENT"

WRONG Responses (NEVER do this):
"Yes, I should respond. Four." ❌
"Since they're asking me, I'll say..." ❌
"The answer is I'm great and what about you." → Just say "I'm great and what about you" ✓`
        },
        {
          role: 'user',
          content: `Conversation:\n${conversationContext}\n\nIf conversation is between others, say "SILENT". If you should respond, give ONLY your answer.`
        }
      ],
      max_completion_tokens: 30,
      temperature: 0.5,
      top_p: 1
    });
    
    const llmResponse = response.choices[0].message.content.trim();
    
    const t_llm_end = Date.now();
    console.log(`\n⏱️  [${t_llm_end - t0}ms] Groq Response Received`);
    console.log(`⏱️  Groq took: ${t_llm_end - t_llm_start}ms ⚡`);
    console.log(`📊 Tokens used: ${response.usage.total_tokens}`);
    console.log(`📊 Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`📊 Completion tokens: ${response.usage.completion_tokens}`);
    
    console.log('\n💭 LLM DECISION:');
    console.log('┌' + '─'.repeat(78) + '┐');
    console.log('│ ' + llmResponse.padEnd(77) + '│');
    console.log('└' + '─'.repeat(78) + '┘');
    
    // Check if LLM decided to respond or stay silent
    const isSilent = llmResponse.toUpperCase() === 'SILENT' || 
                     llmResponse.toUpperCase().startsWith('SILENT');
    
    if (isSilent) {
      console.log('\n🤫 DECISION: STAY SILENT');
      console.log('   Reason: Conversation between other participants');
      console.log('   Action: No speech generation');
      
      const channel = `session-${sessionId}`;
      pusher.trigger(channel, 'bot-silent', {
        message: 'Bot is listening but not responding'
      }).catch(err => console.error('Pusher error:', err));
      
      console.log('   ✅ Sent "bot-silent" event to frontend');
      console.log('\n' + '='.repeat(80) + '\n');
      
      return;
    }
    
    // LLM decided to respond
    console.log('\n✅ DECISION: RESPOND');
    console.log(`   Response: "${llmResponse}"`);
    console.log('   Action: Generate speech and send to user');
    
    const channel = `session-${sessionId}`;
    
    await pusher.trigger(channel, 'ai-response', {
      text: llmResponse
    });
    console.log('   ✅ Sent AI response to frontend via Pusher');
    
    console.log('\n📚 UPDATING CONVERSATION HISTORY:');
    console.log(`   Before: ${history.length} messages`);
    
    // Add bot's response to history
    addToHistory(sessionId, 'AI Assistant', llmResponse);
    
    console.log(`   After: ${conversationHistory.get(sessionId).length} messages`);
    console.log(`   Added: AI Assistant: "${llmResponse}"`);
    
    console.log('\n🔊 STARTING TEXT-TO-SPEECH CONVERSION...');
    console.log('-'.repeat(80));
    
    // Convert to speech
    await convertToSpeech(sessionId, llmResponse, t0);
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ LLM ERROR:', error.message);
    console.error('Full error:', error);
    console.log('\n' + '='.repeat(80) + '\n');
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
    message: 'Zoom Voice Bot with Llama + Nova-3', 
    status: 'running',
    features: {
      stt: 'Deepgram Nova-3',
      llm: 'Groq Llama 4 Maverick',
      tts: 'Deepgram Aura',
      diarization: 'enabled',
      contextAware: 'enabled'
    },
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
    timestamp: new Date().toISOString(),
    models: {
      stt: 'nova-3',
      llm: 'llama-4-maverick-17b',
      tts: 'aura-asteria-en'
    }
  });
});

app.post('/api/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log('\n🔵 CONNECT:', sessionId);
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  try {
    console.log('🔌 Connecting to Deepgram STT (Nova-3)...');
    
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
      endpointing: 700,
      diarize: true,        // ← ENABLED: Speaker identification
      punctuate: true       // ← Better formatting
    });
    
    let lastProcessedTranscript = '';
    
    dgConnection.on('open', () => {
      console.log(`✅ Connected: ${sessionId}`);
      deepgramConnections.set(sessionId, dgConnection);
      console.log('📊 Total connections:', deepgramConnections.size);
    });
    
    dgConnection.on('Results', (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      
      if (transcript && transcript.length > 0) {
        
        // Extract speaker ID from diarization
        let speakerId = "Unknown";
        let speakerNumber = null;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 DEEPGRAM RESPONSE RECEIVED');
        console.log('='.repeat(80));
        
        console.log('\n🔍 CHECKING FOR DIARIZATION DATA:');
        console.log('   Has words array?', !!data.channel.alternatives[0].words);
        
        if (data.channel.alternatives[0].words && data.channel.alternatives[0].words.length > 0) {
          const firstWord = data.channel.alternatives[0].words[0];
          console.log('   First word object:', JSON.stringify(firstWord, null, 2));
          console.log('   Speaker field exists?', firstWord.speaker !== undefined);
          console.log('   Speaker value:', firstWord.speaker);
          
          if (firstWord.speaker !== undefined) {
            speakerId = `Speaker ${firstWord.speaker}`;
            speakerNumber = firstWord.speaker;
          }
          
          // Show all unique speakers in this utterance
          const allSpeakers = data.channel.alternatives[0].words.map(w => w.speaker).filter(s => s !== undefined);
          const uniqueSpeakers = [...new Set(allSpeakers)];
          console.log('   Unique speakers in utterance:', uniqueSpeakers);
          
          if (uniqueSpeakers.length > 1) {
            console.log('   ⚠️  WARNING: Multiple speakers detected in single utterance!');
          }
        } else {
          console.log('   ❌ NO WORDS ARRAY - Diarization might not be enabled!');
        }
        
        console.log('\n📝 TRANSCRIPT DATA:');
        console.log('   👤 Speaker ID:', speakerId);
        console.log('   💬 Transcript:', `"${transcript}"`);
        console.log('   ✅ is_final:', data.is_final);
        console.log('   🔚 speech_final:', data.speech_final);
        
        if (data.duration) {
          console.log('   ⏱️  Duration:', (data.duration * 1000).toFixed(2) + 'ms');
        }
        
        if (data.speech_final) {
          console.log('\n🎯 ENDPOINTING TRIGGERED!');
          console.log('   ✅ Detected 700ms of silence');
          console.log('   ✅ Complete utterance finalized');
        }
        
        console.log('\n' + '-'.repeat(80));
        
        const channel = `session-${sessionId}`;
        
        // Send interim transcripts to frontend
        pusher.trigger(channel, 'transcript-interim', {
          text: transcript,
          speaker: speakerId,
          is_final: data.is_final,
          speech_final: data.speech_final
        }).catch(err => console.error('Pusher error:', err));
        
        // Only process when BOTH is_final AND speech_final are true
        if (data.is_final && data.speech_final) {
          
          // Prevent duplicate processing
          if (transcript !== lastProcessedTranscript) {
            
            const t0 = Date.now();
            
            console.log('\n' + '🚀'.repeat(40));
            console.log('🚀 PROCESSING COMPLETE UTTERANCE');
            console.log('🚀'.repeat(40));
            console.log(`\n👤 Speaker: ${speakerId}`);
            console.log(`💬 Transcript: "${transcript}"`);
            
            const t_stt_end = Date.now();
            console.log(`\n⏱️  [${t_stt_end - t0}ms] STT Processing Complete`);
            
            // Send final transcript to frontend
            pusher.trigger(channel, 'transcript', {
              text: transcript,
              speaker: speakerId
            }).then(() => {
              console.log(`✅ Transcript sent to frontend via Pusher`);
            }).catch(err => {
              console.error('❌ Pusher error:', err);
            });
            
            console.log('\n📚 ADDING TO CONVERSATION HISTORY:');
            console.log(`   Before: ${conversationHistory.get(sessionId)?.length || 0} messages`);
            
            // Add to conversation history with speaker label
            addToHistory(sessionId, speakerId, transcript);
            
            console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
            console.log('\n📋 CURRENT CONVERSATION HISTORY:');
            const history = conversationHistory.get(sessionId) || [];
            history.forEach((msg, idx) => {
              console.log(`   [${idx + 1}] ${msg.speaker}: "${msg.content}"`);
            });
            
            console.log('\n🤖 SENDING TO LLM FOR DECISION...');
            console.log('-'.repeat(80));
            
            // Send to LLM with full context (LLM decides whether to respond)
            processWithLLMContextAware(sessionId, t0);
            
            lastProcessedTranscript = transcript;
            
          } else {
            console.log('\n⚠️  DUPLICATE TRANSCRIPT DETECTED - SKIPPING');
            console.log(`   Transcript: "${transcript}"`);
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
      console.error('❌ STT ERROR:', error.message);
    });
    
    dgConnection.on('close', () => {
      console.log(`🔴 Disconnected: ${sessionId}`);
      deepgramConnections.delete(sessionId);
      conversationHistory.delete(sessionId);
    });
    
    res.json({ 
      success: true, 
      sessionId, 
      service: 'deepgram',
      model: 'nova-3',
      llm: 'llama-4-maverick-17b',
      diarization: true
    });
    console.log('✅ Connect response sent');
    
  } catch (error) {
    console.error('❌ CONNECT ERROR:', error);
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
    console.log(`\n⚡ Server running on http://localhost:${PORT}`);
    console.log(`🦙 LLM: Groq Llama 4 Maverick 17B`);
    console.log(`🎙️  STT: Deepgram Nova-3 (with Diarization)`);
    console.log(`🔊 TTS: Deepgram Aura`);
    console.log(`👥 Speaker Awareness: Enabled`);
    console.log(`🧠 Context-Aware Decisions: Enabled\n`);
  });
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

module.exports = app;