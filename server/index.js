

// const express = require('express');
// const cors = require('cors');
// const Pusher = require('pusher');
// const WebSocket = require('ws');
// require('dotenv').config();
// const { createClient } = require('@deepgram/sdk');
// const Groq = require('groq-sdk');

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

// const GROQ_API_KEY = process.env.GROQ_API_KEY;
// const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// console.log('🔑 Groq API Key present:', !!GROQ_API_KEY);
// console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);

// const groq = new Groq({
//   apiKey: GROQ_API_KEY
// });

// const deepgram = createClient(DEEPGRAM_API_KEY);
// console.log('🎙️ Deepgram client initialized');

// const deepgramConnections = new Map();
// const audioResponses = new Map();
// const conversationHistory = new Map();

// // Helper function to add messages to conversation history with speaker labels
// function addToHistory(sessionId, speaker, message) {
//   if (!conversationHistory.has(sessionId)) {
//     conversationHistory.set(sessionId, []);
//   }
  
//   const history = conversationHistory.get(sessionId);
  
//   history.push({
//     speaker: speaker,
//     content: message,
//     timestamp: new Date().toISOString()
//   });
  
//   // Keep last 12 messages for context
//   if (history.length > 12) {
//     history.splice(0, 2);
//   }
  
//   conversationHistory.set(sessionId, history);
// }

// // Context-aware LLM processing with Groq + Llama
// async function processWithLLMContextAware(sessionId, t0) {
//   try {
//     if (!conversationHistory.has(sessionId)) {
//       conversationHistory.set(sessionId, []);
//     }
    
//     const history = conversationHistory.get(sessionId);
    
//     // Build conversation context with speaker labels
//     const conversationContext = history.map(msg => {
//       return `${msg.speaker}: ${msg.content}`;
//     }).join('\n');
    
//     const t_llm_start = Date.now();
    
//     console.log('\n' + '🤖'.repeat(40));
//     console.log('🤖 LLM CONTEXT-AWARE PROCESSING (GROQ + LLAMA)');
//     console.log('🤖'.repeat(40));
//     console.log(`\n⏱️  [${t_llm_start - t0}ms] Groq LLM Request Starting...`);
//     console.log('🦙 Model: Llama 4 Maverick 17B');
    
//     console.log('\n📜 CONVERSATION CONTEXT SENT TO LLM:');
//     console.log('┌' + '─'.repeat(78) + '┐');
//     if (conversationContext.length > 0) {
//       conversationContext.split('\n').forEach(line => {
//         console.log('│ ' + line.padEnd(77) + '│');
//       });
//     } else {
//       console.log('│ ' + '(No conversation history yet)'.padEnd(77) + '│');
//     }
//     console.log('└' + '─'.repeat(78) + '┘');
    
//     console.log('\n📊 CONTEXT STATS:');
//     console.log(`   Total messages in context: ${history.length}`);
//     console.log(`   Context length: ${conversationContext.length} characters`);
    
//     const response = await groq.chat.completions.create({
//       model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
//       messages: [
//         {
//           role: 'system',
//           content: `You are an AI Assistant in a meeting. Speakers are labeled as Speaker 0, Speaker 1, etc.

// CRITICAL: Reply with ONLY your direct answer. NO explanations. NO reasoning. NO meta-commentary.

// Rules:
// 1. If someone says "bot", "assistant", or "AI" → Give direct answer
// 2. If it's a follow-up after you just spoke → Give direct answer  
// 3. If people talking to each other → Say only "SILENT"
// 4. If unclear → Say only "SILENT"

// Keep responses under 25 words.

// CORRECT Responses:
// "Hey bot, what's 2+2?" → "Four."
// "How are you?" → "I'm well, thanks!"
// "Tell me about cricket" → "It's a bat-and-ball sport."
// "Did you send the report?" "Yes" → "SILENT"

// WRONG Responses (NEVER do this):
// "Yes, I should respond. Four." ❌
// "Since they're asking me, I'll say..." ❌
// "The answer is I'm great and what about you." → Just say "I'm great and what about you" ✓`
//         },
//         {
//           role: 'user',
//           content: `Conversation:\n${conversationContext}\n\nIf conversation is between others, say "SILENT". If you should respond, give ONLY your answer.`
//         }
//       ],
//       max_completion_tokens: 30,
//       temperature: 0.5,
//       top_p: 1
//     });
    
//     const llmResponse = response.choices[0].message.content.trim();
    
//     const t_llm_end = Date.now();
//     console.log(`\n⏱️  [${t_llm_end - t0}ms] Groq Response Received`);
//     console.log(`⏱️  Groq took: ${t_llm_end - t_llm_start}ms ⚡`);
//     console.log(`📊 Tokens used: ${response.usage.total_tokens}`);
//     console.log(`📊 Prompt tokens: ${response.usage.prompt_tokens}`);
//     console.log(`📊 Completion tokens: ${response.usage.completion_tokens}`);
    
//     console.log('\n💭 LLM DECISION:');
//     console.log('┌' + '─'.repeat(78) + '┐');
//     console.log('│ ' + llmResponse.padEnd(77) + '│');
//     console.log('└' + '─'.repeat(78) + '┘');
    
//     // Check if LLM decided to respond or stay silent
//     const isSilent = llmResponse.toUpperCase() === 'SILENT' || 
//                      llmResponse.toUpperCase().startsWith('SILENT');
    
//     if (isSilent) {
//       console.log('\n🤫 DECISION: STAY SILENT');
//       console.log('   Reason: Conversation between other participants');
//       console.log('   Action: No speech generation');
      
//       const channel = `session-${sessionId}`;
//       pusher.trigger(channel, 'bot-silent', {
//         message: 'Bot is listening but not responding'
//       }).catch(err => console.error('Pusher error:', err));
      
//       console.log('   ✅ Sent "bot-silent" event to frontend');
//       console.log('\n' + '='.repeat(80) + '\n');
      
//       return;
//     }
    
//     // LLM decided to respond
//     console.log('\n✅ DECISION: RESPOND');
//     console.log(`   Response: "${llmResponse}"`);
//     console.log('   Action: Generate speech and send to user');
    
//     const channel = `session-${sessionId}`;
    
//     await pusher.trigger(channel, 'ai-response', {
//       text: llmResponse
//     });
//     console.log('   ✅ Sent AI response to frontend via Pusher');
    
//     console.log('\n📚 UPDATING CONVERSATION HISTORY:');
//     console.log(`   Before: ${history.length} messages`);
    
//     // Add bot's response to history
//     addToHistory(sessionId, 'AI Assistant', llmResponse);
    
//     console.log(`   After: ${conversationHistory.get(sessionId).length} messages`);
//     console.log(`   Added: AI Assistant: "${llmResponse}"`);
    
//     console.log('\n🔊 STARTING TEXT-TO-SPEECH CONVERSION...');
//     console.log('-'.repeat(80));
    
//     // Convert to speech
//     await convertToSpeech(sessionId, llmResponse, t0);
    
//     console.log('\n' + '='.repeat(80) + '\n');
    
//   } catch (error) {
//     console.error('\n❌ LLM ERROR:', error.message);
//     console.error('Full error:', error);
//     console.log('\n' + '='.repeat(80) + '\n');
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
//     message: 'Zoom Voice Bot with Llama + Nova-3', 
//     status: 'running',
//     features: {
//       stt: 'Deepgram Nova-3',
//       llm: 'Groq Llama 4 Maverick',
//       tts: 'Deepgram Aura',
//       diarization: 'enabled',
//       contextAware: 'enabled'
//     },
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
//     timestamp: new Date().toISOString(),
//     models: {
//       stt: 'nova-3',
//       llm: 'llama-4-maverick-17b',
//       tts: 'aura-asteria-en'
//     }
//   });
// });

// app.post('/api/connect', async (req, res) => {
//   const { sessionId } = req.body;
  
//   console.log('\n🔵 CONNECT:', sessionId);
  
//   if (!sessionId) {
//     return res.status(400).json({ error: 'sessionId required' });
//   }
  
//   try {
//     console.log('🔌 Connecting to Deepgram STT (Nova-3)...');
    
//     const dgConnection = deepgram.listen.live({
//       model: 'nova-3',
//       language: 'en-US',
//       smart_format: true,
//       interim_results: true,
//       utterance_end_ms: 1000,
//       vad_events: true,
//       encoding: 'linear16',
//       sample_rate: 24000,
//       channels: 1,
//       endpointing: 700,
//       diarize: true,        // ← ENABLED: Speaker identification
//       punctuate: true       // ← Better formatting
//     });
    
//     let lastProcessedTranscript = '';
    
//     dgConnection.on('open', () => {
//       console.log(`✅ Connected: ${sessionId}`);
//       deepgramConnections.set(sessionId, dgConnection);
//       console.log('📊 Total connections:', deepgramConnections.size);
//     });
    
//     dgConnection.on('Results', (data) => {
//       const transcript = data.channel.alternatives[0].transcript;
      
//       if (transcript && transcript.length > 0) {
        
//         // Extract speaker ID from diarization
//         let speakerId = "Unknown";
//         let speakerNumber = null;
        
//         console.log('\n' + '='.repeat(80));
//         console.log('📊 DEEPGRAM RESPONSE RECEIVED');
//         console.log('='.repeat(80));
        
//         console.log('\n🔍 CHECKING FOR DIARIZATION DATA:');
//         console.log('   Has words array?', !!data.channel.alternatives[0].words);
        
//         if (data.channel.alternatives[0].words && data.channel.alternatives[0].words.length > 0) {
//           const firstWord = data.channel.alternatives[0].words[0];
//           console.log('   First word object:', JSON.stringify(firstWord, null, 2));
//           console.log('   Speaker field exists?', firstWord.speaker !== undefined);
//           console.log('   Speaker value:', firstWord.speaker);
          
//           if (firstWord.speaker !== undefined) {
//             speakerId = `Speaker ${firstWord.speaker}`;
//             speakerNumber = firstWord.speaker;
//           }
          
//           // Show all unique speakers in this utterance
//           const allSpeakers = data.channel.alternatives[0].words.map(w => w.speaker).filter(s => s !== undefined);
//           const uniqueSpeakers = [...new Set(allSpeakers)];
//           console.log('   Unique speakers in utterance:', uniqueSpeakers);
          
//           if (uniqueSpeakers.length > 1) {
//             console.log('   ⚠️  WARNING: Multiple speakers detected in single utterance!');
//           }
//         } else {
//           console.log('   ❌ NO WORDS ARRAY - Diarization might not be enabled!');
//         }
        
//         console.log('\n📝 TRANSCRIPT DATA:');
//         console.log('   👤 Speaker ID:', speakerId);
//         console.log('   💬 Transcript:', `"${transcript}"`);
//         console.log('   ✅ is_final:', data.is_final);
//         console.log('   🔚 speech_final:', data.speech_final);
        
//         if (data.duration) {
//           console.log('   ⏱️  Duration:', (data.duration * 1000).toFixed(2) + 'ms');
//         }
        
//         if (data.speech_final) {
//           console.log('\n🎯 ENDPOINTING TRIGGERED!');
//           console.log('   ✅ Detected 700ms of silence');
//           console.log('   ✅ Complete utterance finalized');
//         }
        
//         console.log('\n' + '-'.repeat(80));
        
//         const channel = `session-${sessionId}`;
        
//         // Send interim transcripts to frontend
//         pusher.trigger(channel, 'transcript-interim', {
//           text: transcript,
//           speaker: speakerId,
//           is_final: data.is_final,
//           speech_final: data.speech_final
//         }).catch(err => console.error('Pusher error:', err));
        
//         // Only process when BOTH is_final AND speech_final are true
//         if (data.is_final && data.speech_final) {
          
//           // Prevent duplicate processing
//           if (transcript !== lastProcessedTranscript) {
            
//             const t0 = Date.now();
            
//             console.log('\n' + '🚀'.repeat(40));
//             console.log('🚀 PROCESSING COMPLETE UTTERANCE');
//             console.log('🚀'.repeat(40));
//             console.log(`\n👤 Speaker: ${speakerId}`);
//             console.log(`💬 Transcript: "${transcript}"`);
            
//             const t_stt_end = Date.now();
//             console.log(`\n⏱️  [${t_stt_end - t0}ms] STT Processing Complete`);
            
//             // Send final transcript to frontend
//             pusher.trigger(channel, 'transcript', {
//               text: transcript,
//               speaker: speakerId
//             }).then(() => {
//               console.log(`✅ Transcript sent to frontend via Pusher`);
//             }).catch(err => {
//               console.error('❌ Pusher error:', err);
//             });
            
//             console.log('\n📚 ADDING TO CONVERSATION HISTORY:');
//             console.log(`   Before: ${conversationHistory.get(sessionId)?.length || 0} messages`);
            
//             // Add to conversation history with speaker label
//             addToHistory(sessionId, speakerId, transcript);
            
//             console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
//             console.log('\n📋 CURRENT CONVERSATION HISTORY:');
//             const history = conversationHistory.get(sessionId) || [];
//             history.forEach((msg, idx) => {
//               console.log(`   [${idx + 1}] ${msg.speaker}: "${msg.content}"`);
//             });
            
//             console.log('\n🤖 SENDING TO LLM FOR DECISION...');
//             console.log('-'.repeat(80));
            
//             // Send to LLM with full context (LLM decides whether to respond)
//             processWithLLMContextAware(sessionId, t0);
            
//             lastProcessedTranscript = transcript;
            
//           } else {
//             console.log('\n⚠️  DUPLICATE TRANSCRIPT DETECTED - SKIPPING');
//             console.log(`   Transcript: "${transcript}"`);
//           }
//         } else {
//           // Show why we're not processing
//           if (!data.is_final) {
//             console.log('⏳ Not confident yet (is_final: false)');
//           } else if (!data.speech_final) {
//             console.log('⏳ User still speaking (speech_final: false)');
//           }
//         }
//       }
//     });
    
//     dgConnection.on('error', (error) => {
//       console.error('❌ STT ERROR:', error.message);
//     });
    
//     dgConnection.on('close', () => {
//       console.log(`🔴 Disconnected: ${sessionId}`);
//       deepgramConnections.delete(sessionId);
//       conversationHistory.delete(sessionId);
//     });
    
//     res.json({ 
//       success: true, 
//       sessionId, 
//       service: 'deepgram',
//       model: 'nova-3',
//       llm: 'llama-4-maverick-17b',
//       diarization: true
//     });
//     console.log('✅ Connect response sent');
    
//   } catch (error) {
//     console.error('❌ CONNECT ERROR:', error);
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
//     console.log(`\n⚡ Server running on http://localhost:${PORT}`);
//     console.log(`🦙 LLM: Groq Llama 4 Maverick 17B`);
//     console.log(`🎙️  STT: Deepgram Nova-3 (with Diarization)`);
//     console.log(`🔊 TTS: Deepgram Aura`);
//     console.log(`👥 Speaker Awareness: Enabled`);
//     console.log(`🧠 Context-Aware Decisions: Enabled\n`);
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


// async function processWithLLMContextAware(sessionId, t0) {
//   try {
//     if (!conversationHistory.has(sessionId)) {
//       conversationHistory.set(sessionId, []);
//     }
    
//     const history = conversationHistory.get(sessionId);
    
//     // Build conversation context with speaker labels
//     const conversationContext = history.map(msg => {
//       return `${msg.speaker}: ${msg.content}`;
//     }).join('\n');
    
//     const t_llm_start = Date.now();
    
//     console.log('\n' + '🤖'.repeat(40));
//     console.log('🤖 LLM CONTEXT-AWARE PROCESSING (GPT-OSS-20B)');
//     console.log('🤖'.repeat(40));
//     console.log(`\n⏱️  [${t_llm_start - t0}ms] GPT-OSS-20B Request Starting...`);
//     console.log('🧠 Model: GPT-OSS-20B (OpenAI via Groq)');
    
//     console.log('\n📜 CONVERSATION CONTEXT SENT TO LLM:');
//     console.log('┌' + '─'.repeat(78) + '┐');
//     if (conversationContext.length > 0) {
//       conversationContext.split('\n').forEach(line => {
//         console.log('│ ' + line.padEnd(77) + '│');
//       });
//     } else {
//       console.log('│ ' + '(No conversation history yet)'.padEnd(77) + '│');
//     }
//     console.log('└' + '─'.repeat(78) + '┘');
    
//     console.log('\n📊 CONTEXT STATS:');
//     console.log(`   Total messages in context: ${history.length}`);
//     console.log(`   Context length: ${conversationContext.length} characters`);
    
//     // Single call: Decision + Response in JSON format
//     const response = await groq.chat.completions.create({
//       messages: [
//         {
//           role: 'system',
//           content: 'You are an AI Assistant analyzer. Respond ONLY with valid JSON.'
//         },
//         {
//           role: 'user',
//           content: `Analyze this conversation and decide if you should respond. If yes, provide response.

// Conversation:
// ${conversationContext}

// Rules:
// - Respond if someone says "bot", "assistant", or "AI"
// - Respond if it's a follow-up after you just spoke
// - Stay silent if people talking to each other
// - Keep responses under 12 words

// Respond with ONLY this JSON format (no extra text):

// If should respond:
// {
//   "should_respond": true,
//   "response": "your short response here"
// }

// If should NOT respond:
// {
//   "should_respond": false,
//   "response": ""
// }`
//         }
//       ],
//       model: 'openai/gpt-oss-20b',
//       temperature: 0.5,
//       max_completion_tokens: 100,
//       top_p: 0.8,
//       stream: false,
//       reasoning_effort: 'low',
//       stop: null
//     });
    
//     const responseText = response.choices[0]?.message?.content || "";
    
//     console.log('\n📥 Raw GPT Response:', responseText);
    
//     // Parse JSON response
//     let jsonResponse;
//     try {
//       jsonResponse = JSON.parse(responseText.trim());
//       console.log('📊 Parsed JSON:', JSON.stringify(jsonResponse, null, 2));
//     } catch (parseError) {
//       console.error('❌ JSON Parse Error:', parseError.message);
//       console.log('   Raw text:', responseText);
//       // Fallback: treat as should not respond
//       console.log('   Fallback: Treating as SILENT due to parse error');
      
//       const channel = `session-${sessionId}`;
//       pusher.trigger(channel, 'bot-silent', {
//         message: 'Bot is listening but not responding'
//       }).catch(err => console.error('Pusher error:', err));
      
//       return;
//     }
    
//     const t_llm_end = Date.now();
//     console.log(`\n⏱️  [${t_llm_end - t0}ms] GPT Response Received`);
//     console.log(`⏱️  GPT took: ${t_llm_end - t_llm_start}ms ⚡`);
    
//     const shouldRespond = jsonResponse.should_respond || false;
//     const llmResponse = jsonResponse.response || "";
    
//     console.log('\n💭 LLM DECISION:');
//     console.log('┌' + '─'.repeat(78) + '┐');
//     console.log('│ Should Respond: ' + (shouldRespond ? 'YES ✅' : 'NO ❌').padEnd(60) + '│');
//     if (shouldRespond) {
//       console.log('│ Response: ' + llmResponse.substring(0, 68).padEnd(68) + '│');
//     }
//     console.log('└' + '─'.repeat(78) + '┘');
    
//     if (!shouldRespond) {
//       console.log('\n🤫 DECISION: STAY SILENT');
//       console.log('   Action: No speech generation');
      
//       const channel = `session-${sessionId}`;
//       pusher.trigger(channel, 'bot-silent', {
//         message: 'Bot is listening but not responding'
//       }).catch(err => console.error('Pusher error:', err));
      
//       console.log('   ✅ Sent "bot-silent" event to frontend');
//       console.log('\n' + '='.repeat(80) + '\n');
      
//       return;
//     }
    
//     // Should respond - use the generated response
//     console.log('\n✅ DECISION: RESPOND');
//     console.log(`   Response: "${llmResponse}"`);
//     console.log('   Action: Generate speech and send to user');
    
//     const channel = `session-${sessionId}`;
    
//     await pusher.trigger(channel, 'ai-response', {
//       text: llmResponse
//     });
//     console.log('   ✅ Sent AI response to frontend via Pusher');
    
//     console.log('\n📚 UPDATING CONVERSATION HISTORY:');
//     console.log(`   Before: ${history.length} messages`);
    
//     addToHistory(sessionId, 'AI Assistant', llmResponse);
    
//     console.log(`   After: ${conversationHistory.get(sessionId).length} messages`);
//     console.log(`   Added: AI Assistant: "${llmResponse}"`);
    
//     console.log('\n🔊 STARTING TEXT-TO-SPEECH CONVERSION...');
//     console.log('-'.repeat(80));
    
//     await convertToSpeech(sessionId, llmResponse, t0);
    
//     console.log('\n' + '='.repeat(80) + '\n');
    
//   } catch (error) {
//     console.error('\n❌ LLM ERROR:', error.message);
//     console.error('Full error:', error);
//     console.log('\n' + '='.repeat(80) + '\n');
//   }
// }

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
// Check if sentence is complete using GPT with JSON response
async function checkIfSentenceComplete(transcript, t_start) {
  try {
    console.log('\n🔍 Sentence Completeness Check (JSON Mode)');
    console.log('━'.repeat(80));
    console.log(`   Analyzing: "${transcript}"`);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a sentence analyzer. You must respond ONLY with valid JSON."
        },
        {
          role: "user",
          content: `Analyze if this sentence is complete or incomplete.

Sentence: "${transcript}"

Respond with ONLY this JSON format (no explanations, no extra text):
{
  "status": "COMPLETE"
}

OR

{
  "status": "INCOMPLETE"
}

Rules:
- COMPLETE: User finished speaking, expects response
- INCOMPLETE: User was cut off mid-sentence`
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
      max_completion_tokens: 50,
      top_p: 0.5,
      stream: false,              // ← IMPORTANT: Set to false
      reasoning_effort: "low",
      stop: null
    });
    
    const responseText = completion.choices[0]?.message?.content || "";
    
    console.log('📥 Raw Response:', responseText);
    
    // Parse JSON response
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText.trim());
      console.log('📊 Parsed JSON:', JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.log('   Raw text that failed to parse:', responseText);
      // Fallback: check if response contains the word COMPLETE
      const isComplete = responseText.toUpperCase().includes('COMPLETE') && 
                        !responseText.toUpperCase().includes('INCOMPLETE');
      console.log('   Using text fallback → ', isComplete ? 'COMPLETE' : 'INCOMPLETE');
      return isComplete;
    }
    
    // Extract status from JSON
    const status = jsonResponse.status || "";
    const isComplete = status.toUpperCase() === "COMPLETE";
    
    const t_end = Date.now();
    console.log('━'.repeat(80));
    console.log(`⏱️  Check took: ${t_end - t_start}ms`);
    console.log(`🎯 Status: ${status}`);
    console.log(`✅ Final Decision: ${isComplete ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
    console.log('━'.repeat(80));
    
    return isComplete;
    
  } catch (error) {
    console.error('❌ Error checking sentence completeness:', error.message);
    console.error('Full error:', error);
    // On error, assume COMPLETE (better to respond than get stuck)
    console.log('⚠️  Error fallback: Treating as COMPLETE');
    return true;
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
    
    dgConnection.on('Results', async(data) => {
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
    console.log('🚀 PROCESSING COMPLETE UTTERANCE (NORMAL PATH)');
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
}
// NEW: Check if sentence is complete when is_final but NOT speech_final
else if (data.is_final && !data.speech_final) {
  
  console.log('\n' + '⚠️'.repeat(40));
  console.log('⚠️  STUCK DETECTION: is_final=true BUT speech_final=false');
  console.log('⚠️'.repeat(40));
  console.log(`\n👤 Speaker: ${speakerId}`);
  console.log(`💬 Transcript: "${transcript}"`);
  console.log(`⏱️  Waiting for speech_final, but calling GPT to check if complete...`);
  
  // Check if this transcript was already checked
  if (transcript !== lastProcessedTranscript) {
    
    const t_gpt_start = Date.now();
    console.log(`\n🔍 CALLING GPT TO CHECK SENTENCE COMPLETENESS...`);
    console.log(`   Model: openai/gpt-oss-20b`);
    console.log(`   Transcript to check: "${transcript}"`);
    
    try {
      const isComplete = await checkIfSentenceComplete(transcript, t_gpt_start);
      
      const t_gpt_end = Date.now();
      console.log(`\n⏱️  [${t_gpt_end - t_gpt_start}ms] GPT Check Complete`);
      console.log(`📊 Result: ${isComplete ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
      
      if (isComplete) {
        console.log('\n✅ GPT CONFIRMED: Sentence is COMPLETE');
        console.log('   🔄 OVERRIDING speech_final → true');
        console.log('   🚀 Processing as complete utterance...\n');
        
        const t0 = Date.now();
        
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
        
        // Add to conversation history
        addToHistory(sessionId, speakerId, transcript);
        
        console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
        
        console.log('\n🤖 SENDING TO LLM FOR DECISION...');
        console.log('-'.repeat(80));
        
        // Process with Llama LLM
        processWithLLMContextAware(sessionId, t0);
        
        lastProcessedTranscript = transcript;
        
      } else {
        console.log('\n❌ GPT CONFIRMED: Sentence is INCOMPLETE');
        console.log('   ⏳ Keeping speech_final as false');
        console.log('   ⏳ Waiting for more audio from user...\n');
      }
      
    } catch (error) {
      console.error('\n❌ GPT CHECK ERROR:', error.message);
      console.log('   ⚠️  Falling back to waiting for speech_final');
      console.log('   ⏳ Will wait for next transcript...\n');
    }
    
  } else {
    console.log('\n⚠️  Already checked this transcript, skipping GPT call');
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