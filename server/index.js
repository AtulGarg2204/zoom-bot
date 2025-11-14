

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

// // CORS updated
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
    
//    const response = await groq.chat.completions.create({
//   model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
//   messages: [
//     {
//       role: 'system',
//       content: `You are a friendly and helpful AI Assistant in a natural conversation. Speakers are labeled as Speaker 0, Speaker 1, etc.

// YOUR PERSONALITY:
// - Warm, approachable, and conversational
// - Natural and human-like (not robotic)
// - Helpful but not overly formal
// - Can show personality and emotion when appropriate

// RESPONSE STYLE:
// - Use natural conversation fillers: "Oh", "Well", "You know", "Actually", "Hmm"
// - Add warmth: "Great question!", "I'd be happy to help", "That's interesting!"
// - Vary your responses (don't always start the same way)
// - Keep responses conversational (10-20 words for natural flow)
// - Use contractions: "I'm" not "I am", "That's" not "That is"

// WHEN TO RESPOND:
// 1. Someone says "bot", "assistant", or "AI" → Respond naturally
// 2. Someone asks you a direct question → Respond warmly
// 3. Follow-up after you just spoke → Continue conversation
// 4. People talking to each other → Say only "SILENT"
// 5. Unclear who is being addressed → Say only "SILENT"

// EXAMPLES OF NATURAL RESPONSES:

// Question: "Hey bot, what's 2+2?"
// ❌ Bad: "Four."
// ✅ Good: "Oh, that's four!"
// ✅ Good: "It's four."
// ✅ Good: "That'd be four."

// Question: "How are you?"
// ❌ Bad: "I'm well, thanks."
// ✅ Good: "I'm doing great, thanks for asking! How about you?"
// ✅ Good: "Pretty good! Thanks for asking."
// ✅ Good: "I'm wonderful, thank you!"

// Question: "What do you know about cricket?"
// ❌ Bad: "It's a bat-and-ball sport."
// ✅ Good: "Oh, cricket! It's a bat-and-ball sport played between two teams."
// ✅ Good: "Well, cricket is a really popular sport, especially in countries like India and England."
// ✅ Good: "Cricket's a fascinating game with two teams competing in innings."

// Question: "What's your name?"
// ❌ Bad: "I'm an AI Assistant."
// ✅ Good: "I'm an AI assistant here to help! You can just call me 'bot' or 'assistant'."
// ✅ Good: "You can call me your AI assistant! I'm here to help with anything you need."

// Question: "Can you help me?"
// ❌ Bad: "Yes."
// ✅ Good: "Of course! I'd be happy to help. What do you need?"
// ✅ Good: "Absolutely! What can I do for you?"
// ✅ Good: "Sure thing! How can I assist?"

// IMPORTANT:
// - Be natural, not robotic
// - Show personality while staying helpful
// - Keep it conversational but concise (10-20 words)
// - Never say "Yes, I should respond" or explain your reasoning
// - If conversation is between others, just say "SILENT"`
//     },
//         {
//           role: 'user',
//           content: `Conversation:\n${conversationContext}\n\nIf conversation is between others, say "SILENT". If you should respond, give ONLY your answer.`
//         }
//       ],
//       max_completion_tokens: 300,
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


// // async function processWithLLMContextAware(sessionId, t0) {
// //   try {
// //     if (!conversationHistory.has(sessionId)) {
// //       conversationHistory.set(sessionId, []);
// //     }
    
// //     const history = conversationHistory.get(sessionId);
    
// //     // Build conversation context with speaker labels
// //     const conversationContext = history.map(msg => {
// //       return `${msg.speaker}: ${msg.content}`;
// //     }).join('\n');
    
// //     const t_llm_start = Date.now();
    
// //     console.log('\n' + '🤖'.repeat(40));
// //     console.log('🤖 LLM CONTEXT-AWARE PROCESSING (GPT-OSS-20B)');
// //     console.log('🤖'.repeat(40));
// //     console.log(`\n⏱️  [${t_llm_start - t0}ms] GPT-OSS-20B Request Starting...`);
// //     console.log('🧠 Model: GPT-OSS-20B (OpenAI via Groq)');
    
// //     console.log('\n📜 CONVERSATION CONTEXT SENT TO LLM:');
// //     console.log('┌' + '─'.repeat(78) + '┐');
// //     if (conversationContext.length > 0) {
// //       conversationContext.split('\n').forEach(line => {
// //         console.log('│ ' + line.padEnd(77) + '│');
// //       });
// //     } else {
// //       console.log('│ ' + '(No conversation history yet)'.padEnd(77) + '│');
// //     }
// //     console.log('└' + '─'.repeat(78) + '┘');
    
// //     console.log('\n📊 CONTEXT STATS:');
// //     console.log(`   Total messages in context: ${history.length}`);
// //     console.log(`   Context length: ${conversationContext.length} characters`);
    
// //     // Single call: Decision + Response in JSON format
// //     const response = await groq.chat.completions.create({
// //       messages: [
// //         {
// //           role: 'system',
// //           content: 'You are an AI Assistant analyzer. Respond ONLY with valid JSON.'
// //         },
// //         {
// //           role: 'user',
// //           content: `Analyze this conversation and decide if you should respond. If yes, provide response.

// // Conversation:
// // ${conversationContext}

// // Rules:
// // - Respond if someone says "bot", "assistant", or "AI"
// // - Respond if it's a follow-up after you just spoke
// // - Stay silent if people talking to each other
// // - Keep responses under 12 words

// // Respond with ONLY this JSON format (no extra text):

// // If should respond:
// // {
// //   "should_respond": true,
// //   "response": "your short response here"
// // }

// // If should NOT respond:
// // {
// //   "should_respond": false,
// //   "response": ""
// // }`
// //         }
// //       ],
// //       model: 'openai/gpt-oss-20b',
// //       temperature: 0.5,
// //       max_completion_tokens: 100,
// //       top_p: 0.8,
// //       stream: false,
// //       reasoning_effort: 'low',
// //       stop: null
// //     });
    
// //     const responseText = response.choices[0]?.message?.content || "";
    
// //     console.log('\n📥 Raw GPT Response:', responseText);
    
// //     // Parse JSON response
// //     let jsonResponse;
// //     try {
// //       jsonResponse = JSON.parse(responseText.trim());
// //       console.log('📊 Parsed JSON:', JSON.stringify(jsonResponse, null, 2));
// //     } catch (parseError) {
// //       console.error('❌ JSON Parse Error:', parseError.message);
// //       console.log('   Raw text:', responseText);
// //       // Fallback: treat as should not respond
// //       console.log('   Fallback: Treating as SILENT due to parse error');
      
// //       const channel = `session-${sessionId}`;
// //       pusher.trigger(channel, 'bot-silent', {
// //         message: 'Bot is listening but not responding'
// //       }).catch(err => console.error('Pusher error:', err));
      
// //       return;
// //     }
    
// //     const t_llm_end = Date.now();
// //     console.log(`\n⏱️  [${t_llm_end - t0}ms] GPT Response Received`);
// //     console.log(`⏱️  GPT took: ${t_llm_end - t_llm_start}ms ⚡`);
    
// //     const shouldRespond = jsonResponse.should_respond || false;
// //     const llmResponse = jsonResponse.response || "";
    
// //     console.log('\n💭 LLM DECISION:');
// //     console.log('┌' + '─'.repeat(78) + '┐');
// //     console.log('│ Should Respond: ' + (shouldRespond ? 'YES ✅' : 'NO ❌').padEnd(60) + '│');
// //     if (shouldRespond) {
// //       console.log('│ Response: ' + llmResponse.substring(0, 68).padEnd(68) + '│');
// //     }
// //     console.log('└' + '─'.repeat(78) + '┘');
    
// //     if (!shouldRespond) {
// //       console.log('\n🤫 DECISION: STAY SILENT');
// //       console.log('   Action: No speech generation');
      
// //       const channel = `session-${sessionId}`;
// //       pusher.trigger(channel, 'bot-silent', {
// //         message: 'Bot is listening but not responding'
// //       }).catch(err => console.error('Pusher error:', err));
      
// //       console.log('   ✅ Sent "bot-silent" event to frontend');
// //       console.log('\n' + '='.repeat(80) + '\n');
      
// //       return;
// //     }
    
// //     // Should respond - use the generated response
// //     console.log('\n✅ DECISION: RESPOND');
// //     console.log(`   Response: "${llmResponse}"`);
// //     console.log('   Action: Generate speech and send to user');
    
// //     const channel = `session-${sessionId}`;
    
// //     await pusher.trigger(channel, 'ai-response', {
// //       text: llmResponse
// //     });
// //     console.log('   ✅ Sent AI response to frontend via Pusher');
    
// //     console.log('\n📚 UPDATING CONVERSATION HISTORY:');
// //     console.log(`   Before: ${history.length} messages`);
    
// //     addToHistory(sessionId, 'AI Assistant', llmResponse);
    
// //     console.log(`   After: ${conversationHistory.get(sessionId).length} messages`);
// //     console.log(`   Added: AI Assistant: "${llmResponse}"`);
    
// //     console.log('\n🔊 STARTING TEXT-TO-SPEECH CONVERSION...');
// //     console.log('-'.repeat(80));
    
// //     await convertToSpeech(sessionId, llmResponse, t0);
    
// //     console.log('\n' + '='.repeat(80) + '\n');
    
// //   } catch (error) {
// //     console.error('\n❌ LLM ERROR:', error.message);
// //     console.error('Full error:', error);
// //     console.log('\n' + '='.repeat(80) + '\n');
// //   }
// // }

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

// async function checkIfSentenceComplete(transcript, t_start) {
//   try {
//     console.log('\n🔍 Sentence Completeness Check (JSON Mode)');
//     console.log('━'.repeat(80));
//     console.log(`   Analyzing: "${transcript}"`);
    
//     const completion = await groq.chat.completions.create({
//       messages: [
//         {
//           role: "system",
//           content: "You are a sentence analyzer. You must respond ONLY with valid JSON."
//         },
//         {
//           role: "user",
//           content: `Analyze if this sentence is complete or incomplete.

// Sentence: "${transcript}"

// Respond with ONLY this JSON format (no explanations, no extra text):
// {
//   "status": "COMPLETE"
// }

// OR

// {
//   "status": "INCOMPLETE"
// }

// Rules:
// - COMPLETE: User finished speaking, expects response
// - INCOMPLETE: User was cut off mid-sentence`
//         }
//       ],
//       model: "openai/gpt-oss-20b",
//       temperature: 0.1,
//       max_completion_tokens: 500,
//       top_p: 0.5,
//       stream: false,              // ← IMPORTANT: Set to false
//       reasoning_effort: "low",
//       stop: null
//     });
    
//     const responseText = completion.choices[0]?.message?.content || "";
    
//     console.log('📥 Raw Response:', responseText);
    
//     // Parse JSON response
//     let jsonResponse;
//     try {
//       jsonResponse = JSON.parse(responseText.trim());
//       console.log('📊 Parsed JSON:', JSON.stringify(jsonResponse, null, 2));
//     } catch (parseError) {
//       console.error('❌ JSON Parse Error:', parseError.message);
//       console.log('   Raw text that failed to parse:', responseText);
//       // Fallback: check if response contains the word COMPLETE
//       const isComplete = responseText.toUpperCase().includes('COMPLETE') && 
//                         !responseText.toUpperCase().includes('INCOMPLETE');
//       console.log('   Using text fallback → ', isComplete ? 'COMPLETE' : 'INCOMPLETE');
//       return isComplete;
//     }
    
//     // Extract status from JSON
//     const status = jsonResponse.status || "";
//     const isComplete = status.toUpperCase() === "COMPLETE";
    
//     const t_end = Date.now();
//     console.log('━'.repeat(80));
//     console.log(`⏱️  Check took: ${t_end - t_start}ms`);
//     console.log(`🎯 Status: ${status}`);
//     console.log(`✅ Final Decision: ${isComplete ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
//     console.log('━'.repeat(80));
    
//     return isComplete;
    
//   } catch (error) {
//     console.error('❌ Error checking sentence completeness:', error.message);
//     console.error('Full error:', error);
//     // On error, assume COMPLETE (better to respond than get stuck)
//     console.log('⚠️  Error fallback: Treating as COMPLETE');
//     return true;
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
    
//     dgConnection.on('Results', async(data) => {
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
        
//        // Only process when BOTH is_final AND speech_final are true
// if (data.is_final && data.speech_final) {
  
//   // Prevent duplicate processing
//   if (transcript !== lastProcessedTranscript) {
    
//     const t0 = Date.now();
    
//     console.log('\n' + '🚀'.repeat(40));
//     console.log('🚀 PROCESSING COMPLETE UTTERANCE (NORMAL PATH)');
//     console.log('🚀'.repeat(40));
//     console.log(`\n👤 Speaker: ${speakerId}`);
//     console.log(`💬 Transcript: "${transcript}"`);
    
//     const t_stt_end = Date.now();
//     console.log(`\n⏱️  [${t_stt_end - t0}ms] STT Processing Complete`);
    
//     // Send final transcript to frontend
//     pusher.trigger(channel, 'transcript', {
//       text: transcript,
//       speaker: speakerId
//     }).then(() => {
//       console.log(`✅ Transcript sent to frontend via Pusher`);
//     }).catch(err => {
//       console.error('❌ Pusher error:', err);
//     });
    
//     console.log('\n📚 ADDING TO CONVERSATION HISTORY:');
//     console.log(`   Before: ${conversationHistory.get(sessionId)?.length || 0} messages`);
    
//     // Add to conversation history with speaker label
//     addToHistory(sessionId, speakerId, transcript);
    
//     console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
//     console.log('\n📋 CURRENT CONVERSATION HISTORY:');
//     const history = conversationHistory.get(sessionId) || [];
//     history.forEach((msg, idx) => {
//       console.log(`   [${idx + 1}] ${msg.speaker}: "${msg.content}"`);
//     });
    
//     console.log('\n🤖 SENDING TO LLM FOR DECISION...');
//     console.log('-'.repeat(80));
    
//     // Send to LLM with full context (LLM decides whether to respond)
//     processWithLLMContextAware(sessionId, t0);
    
//     lastProcessedTranscript = transcript;
    
//   } else {
//     console.log('\n⚠️  DUPLICATE TRANSCRIPT DETECTED - SKIPPING');
//     console.log(`   Transcript: "${transcript}"`);
//   }
// }
// // NEW: Check if sentence is complete when is_final but NOT speech_final
// else if (data.is_final && !data.speech_final) {
  
//   console.log('\n' + '⚠️'.repeat(40));
//   console.log('⚠️  STUCK DETECTION: is_final=true BUT speech_final=false');
//   console.log('⚠️'.repeat(40));
//   console.log(`\n👤 Speaker: ${speakerId}`);
//   console.log(`💬 Transcript: "${transcript}"`);
//   console.log(`⏱️  Waiting for speech_final, but calling GPT to check if complete...`);
  
//   // Check if this transcript was already checked
//   if (transcript !== lastProcessedTranscript) {
    
//     const t_gpt_start = Date.now();
//     console.log(`\n🔍 CALLING GPT TO CHECK SENTENCE COMPLETENESS...`);
//     console.log(`   Model: openai/gpt-oss-20b`);
//     console.log(`   Transcript to check: "${transcript}"`);
    
//     try {
//       const isComplete = await checkIfSentenceComplete(transcript, t_gpt_start);
      
//       const t_gpt_end = Date.now();
//       console.log(`\n⏱️  [${t_gpt_end - t_gpt_start}ms] GPT Check Complete`);
//       console.log(`📊 Result: ${isComplete ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
      
//       if (isComplete) {
//         console.log('\n✅ GPT CONFIRMED: Sentence is COMPLETE');
//         console.log('   🔄 OVERRIDING speech_final → true');
//         console.log('   🚀 Processing as complete utterance...\n');
        
//         const t0 = Date.now();
        
//         // Send final transcript to frontend
//         pusher.trigger(channel, 'transcript', {
//           text: transcript,
//           speaker: speakerId
//         }).then(() => {
//           console.log(`✅ Transcript sent to frontend via Pusher`);
//         }).catch(err => {
//           console.error('❌ Pusher error:', err);
//         });
        
//         console.log('\n📚 ADDING TO CONVERSATION HISTORY:');
//         console.log(`   Before: ${conversationHistory.get(sessionId)?.length || 0} messages`);
        
//         // Add to conversation history
//         addToHistory(sessionId, speakerId, transcript);
        
//         console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
        
//         console.log('\n🤖 SENDING TO LLM FOR DECISION...');
//         console.log('-'.repeat(80));
        
//         // Process with Llama LLM
//         processWithLLMContextAware(sessionId, t0);
        
//         lastProcessedTranscript = transcript;
        
//       } else {
//         console.log('\n❌ GPT CONFIRMED: Sentence is INCOMPLETE');
//         console.log('   ⏳ Keeping speech_final as false');
//         console.log('   ⏳ Waiting for more audio from user...\n');
//       }
      
//     } catch (error) {
//       console.error('\n❌ GPT CHECK ERROR:', error.message);
//       console.log('   ⚠️  Falling back to waiting for speech_final');
//       console.log('   ⏳ Will wait for next transcript...\n');
//     }
    
//   } else {
//     console.log('\n⚠️  Already checked this transcript, skipping GPT call');
//   }
  
// } else {
//   // Show why we're not processing
//   if (!data.is_final) {
//     console.log('⏳ Not confident yet (is_final: false)');
//   } else if (!data.speech_final) {
//     console.log('⏳ User still speaking (speech_final: false)');
//   }
// }
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
const { google } = require('googleapis');

const app = express();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

console.log('🔧 Pusher initialized');

// CORS updated
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const RECALL_API_KEY = process.env.RECALL_API_KEY || "15e68e37c50c76af96d19788f7a9408d0ec908b1";
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://zoom-bot-pgyj.onrender.com';

// Google Calendar Setup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

console.log('🔑 Groq API Key present:', !!GROQ_API_KEY);
console.log('🔑 Deepgram API Key present:', !!DEEPGRAM_API_KEY);
console.log('🔑 Google OAuth present:', !!GOOGLE_CLIENT_ID && !!GOOGLE_REFRESH_TOKEN);

const groq = new Groq({
  apiKey: GROQ_API_KEY
});

const deepgram = createClient(DEEPGRAM_API_KEY);
console.log('🎙️ Deepgram client initialized');

// Setup Google Calendar
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
console.log('📅 Google Calendar client initialized');

const deepgramConnections = new Map();
const audioResponses = new Map();
const conversationHistory = new Map();
const processedEvents = new Map(); // NEW: Track processed events

// Store active calendar channel info
let calendarChannelId = null;
let calendarResourceId = null;

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
    
//    const response = await groq.chat.completions.create({
//   model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
//   messages: [
//     {
//       role: 'system',
//       content: `You are a friendly and helpful AI Assistant in a natural conversation. Speakers are labeled as Speaker 0, Speaker 1, etc.

// YOUR PERSONALITY:
// - Warm, approachable, and conversational
// - Natural and human-like (not robotic)
// - Helpful but not overly formal
// - Can show personality and emotion when appropriate

// RESPONSE STYLE:
// - Use natural conversation fillers: "Oh", "Well", "You know", "Actually", "Hmm"
// - Add warmth: "Great question!", "I'd be happy to help", "That's interesting!"
// - Vary your responses (don't always start the same way)
// - Keep responses conversational (10-20 words for natural flow)
// - Use contractions: "I'm" not "I am", "That's" not "That is"

// WHEN TO RESPOND:
// 1. Someone says "bot", "assistant", or "AI" → Respond naturally
// 2. Someone asks you a direct question → Respond warmly
// 3. Follow-up after you just spoke → Continue conversation
// 4. People talking to each other → Say only "SILENT"
// 5. Unclear who is being addressed → Say only "SILENT"

// EXAMPLES OF NATURAL RESPONSES:

// Question: "Hey bot, what's 2+2?"
// ❌ Bad: "Four."
// ✅ Good: "Oh, that's four!"
// ✅ Good: "It's four."
// ✅ Good: "That'd be four."

// Question: "How are you?"
// ❌ Bad: "I'm well, thanks."
// ✅ Good: "I'm doing great, thanks for asking! How about you?"
// ✅ Good: "Pretty good! Thanks for asking."
// ✅ Good: "I'm wonderful, thank you!"

// Question: "What do you know about cricket?"
// ❌ Bad: "It's a bat-and-ball sport."
// ✅ Good: "Oh, cricket! It's a bat-and-ball sport played between two teams."
// ✅ Good: "Well, cricket is a really popular sport, especially in countries like India and England."
// ✅ Good: "Cricket's a fascinating game with two teams competing in innings."

// Question: "What's your name?"
// ❌ Bad: "I'm an AI Assistant."
// ✅ Good: "I'm an AI assistant here to help! You can just call me 'bot' or 'assistant'."
// ✅ Good: "You can call me your AI assistant! I'm here to help with anything you need."

// Question: "Can you help me?"
// ❌ Bad: "Yes."
// ✅ Good: "Of course! I'd be happy to help. What do you need?"
// ✅ Good: "Absolutely! What can I do for you?"
// ✅ Good: "Sure thing! How can I assist?"

// IMPORTANT:
// - Be natural, not robotic
// - Show personality while staying helpful
// - Keep it conversational but concise (10-20 words)
// - Never say "Yes, I should respond" or explain your reasoning
// - If conversation is between others, just say "SILENT"`
//     },
//         {
//           role: 'user',
//           content: `Conversation:\n${conversationContext}\n\nIf conversation is between others, say "SILENT". If you should respond, give ONLY your answer.`
//         }
//       ],
//       max_completion_tokens: 300,
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
    console.log('🤖 LLM CONTEXT-AWARE PROCESSING (GROQ + GPT-OSS-20B)');
    console.log('🤖'.repeat(40));
    console.log(`\n⏱️  [${t_llm_start - t0}ms] Groq LLM Request Starting...`);
    console.log('🧠 Model: GPT-OSS-20B');
    
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
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `You are James, a friendly and helpful AI Assistant in a natural conversation. Speakers are labeled as Speaker 0, Speaker 1, etc.

YOUR PERSONALITY:
- Your name is James
- Warm, approachable, and conversational
- Natural and human-like (not robotic)
- Helpful but not overly formal
- Can show personality and emotion when appropriate

RESPONSE STYLE:
- Use natural conversation fillers: "Oh", "Well", "You know", "Actually", "Hmm"
- Add warmth: "Great question!", "I'd be happy to help", "That's interesting!"
- Vary your responses (don't always start the same way)
- Keep responses under 20 words for natural flow
- Use contractions: "I'm" not "I am", "That's" not "That is"

WHEN TO RESPOND:
1. Someone says "James", "bot", "assistant", or "AI" → Respond naturally
2. Someone asks you a direct question → Respond warmly
3. Follow-up after you just spoke → Continue conversation
4. People talking to each other → Say only "SILENT"
5. Unclear who is being addressed → Say only "SILENT"

EXAMPLES OF NATURAL RESPONSES:

Question: "Hey James, what's 2+2?"
❌ Too robotic: "Four."
✅ Good: "Oh, that's four!"
✅ Good: "That's four! Easy one!"

Question: "How are you?"
❌ Too short: "Good."
✅ Good: "I'm doing great, thanks for asking! How about you?"
✅ Good: "Pretty good! Thanks for asking."

Question: "What do you know about cricket?"
❌ Too long: "Cricket is a bat-and-ball sport that originated in England and is now played internationally with two teams of eleven players..."
✅ Good: "Cricket's a bat-and-ball sport, super popular in India and England!"
✅ Good: "It's a team sport with batting and bowling, really big in South Asia!"

Question: "What's your name?"
❌ Too formal: "I am an AI Assistant."
✅ Good: "I'm James, your AI assistant! Nice to meet you."
✅ Good: "My name's James! I'm here to help."

Question: "Can you help me?"
❌ Too short: "Yes."
✅ Good: "Of course! I'd be happy to help. What do you need?"
✅ Good: "Absolutely! What can I do for you?"

Question: "Tell me about yourself"
❌ Too long: "I'm an artificial intelligence assistant created to help people with various tasks and questions throughout their day..."
✅ Good: "I'm James, an AI assistant here to help with whatever you need!"
✅ Good: "I'm James! I'm here to answer questions and help out however I can."

IMPORTANT:
- Be natural and friendly, not robotic
- Show personality while staying helpful
- Keep it conversational but under 20 words
- Never say "Yes, I should respond" or explain your reasoning
- If conversation is between others, just say "SILENT"
- Introduce yourself as James when asked your name`
        },
        {
          role: 'user',
          content: `Conversation:\n${conversationContext}\n\nIf conversation is between others, say "SILENT". If you should respond, give ONLY your answer (under 20 words).`
        }
      ],
      max_completion_tokens: 100,  // ← Increased to 100 (allows ~20 words comfortably)
      temperature: 0.5,
      top_p: 0.8,
      stream: false,
      reasoning_effort: 'low'
    });
    
    const llmResponse = response.choices[0].message.content.trim();
    
    const t_llm_end = Date.now();
    console.log(`\n⏱️  [${t_llm_end - t0}ms] Groq Response Received`);
    console.log(`⏱️  Groq took: ${t_llm_end - t_llm_start}ms ⚡`);
    console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`📊 Prompt tokens: ${response.usage?.prompt_tokens || 'N/A'}`);
    console.log(`📊 Completion tokens: ${response.usage?.completion_tokens || 'N/A'}`);
    
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
      max_completion_tokens: 500,
      top_p: 0.5,
      stream: false,
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
      const isComplete = responseText.toUpperCase().includes('COMPLETE') && 
                        !responseText.toUpperCase().includes('INCOMPLETE');
      console.log('   Using text fallback → ', isComplete ? 'COMPLETE' : 'INCOMPLETE');
      return isComplete;
    }
    
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
    console.log('⚠️  Error fallback: Treating as COMPLETE');
    return true;
  }
}

// ============================================================
// CALENDAR INTEGRATION FUNCTIONS
// ============================================================

// Extract meeting URL from calendar event
function extractMeetingUrl(event) {
  let meetingUrl = null;
  
  // Priority 1: Google Meet hangout link
  if (event.hangoutLink) {
    meetingUrl = event.hangoutLink;
    console.log('   📹 Found Google Meet link');
    return meetingUrl;
  }
  
  // Priority 2: Zoom link in location
  if (event.location) {
    const zoomMatch = event.location.match(/https:\/\/[^\s]+zoom\.us\/[^\s]+/);
    if (zoomMatch) {
      meetingUrl = zoomMatch[0];
      console.log('   📹 Found Zoom link in location');
      return meetingUrl;
    }
    
    if (event.location.startsWith('http://') || event.location.startsWith('https://')) {
      meetingUrl = event.location;
      console.log('   📹 Found direct URL in location');
      return meetingUrl;
    }
  }
  
  // Priority 3: Meeting link in description
  if (event.description) {
    const zoomMatch = event.description.match(/https:\/\/[^\s<]+zoom\.us\/[^\s<]+/);
    if (zoomMatch) {
      meetingUrl = zoomMatch[0];
      console.log('   📹 Found Zoom link in description');
      return meetingUrl;
    }
    
    const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[^\s<]+/);
    if (meetMatch) {
      meetingUrl = meetMatch[0];
      console.log('   📹 Found Google Meet link in description');
      return meetingUrl;
    }
    
    const teamsMatch = event.description.match(/https:\/\/teams\.microsoft\.com\/[^\s<]+/);
    if (teamsMatch) {
      meetingUrl = teamsMatch[0];
      console.log('   📹 Found Teams link in description');
      return meetingUrl;
    }
  }
  
  console.log('   ❌ No meeting URL found');
  return null;
}

async function deployBotToMeeting(meetingUrl, eventTitle, eventId) {
  try {
    console.log('\n🤖 Deploying bot to meeting...');
    console.log('   Meeting URL:', meetingUrl);
    console.log('   Event:', eventTitle);
    console.log('   Event ID:', eventId);  // ← Added
    
    const clientUrl = "https://zoom-bot-jet.vercel.app";
    const serverUrl = "zoom-bot-pgyj.onrender.com";
    
    const botConfig = {
      meeting_url: meetingUrl,
      bot_name: "James",
      output_media: {
        camera: {
          kind: "webpage",
          config: {
            url: `${clientUrl}?server=https://${serverUrl}&eventId=${eventId}`  // ← FIXED
          }
        }
      },
      variant: {
        zoom: "web_4_core"
      }
    };
    
    console.log('🌐 Bot webpage URL:', botConfig.output_media.camera.config.url);  // ← Added
    
    // UPDATED: Use us-west-2 region
    const response = await fetch('https://us-west-2.recall.ai/api/v1/bot/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(botConfig)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recall API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Bot deployed successfully!');
    console.log('   Bot ID:', result.id);
    console.log('   Status:', result.status);
    
    // Store mapping for later summary generation
    const sessionId = `session-${eventId}`;
    botSessionMap.set(result.id, sessionId);
    botEventMap.set(result.id, eventId);
    
    console.log(`📝 Stored mapping: Bot ${result.id} -> Session ${sessionId} -> Event ${eventId}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Bot deployment error:', error.message);
    throw error;
  }
}
app.post('/api/test-summary', async (req, res) => {
  try {
    const { eventId, sessionId } = req.body;
    
    console.log('\n🧪 TEST SUMMARY REQUEST');
    console.log('   Event ID:', eventId);
    console.log('   Session ID:', sessionId);
    
    if (!eventId || !sessionId) {
      return res.status(400).json({ 
        error: 'eventId and sessionId required' 
      });
    }
    
    await sendSummaryViaN8n(eventId, sessionId);
    
    res.json({ 
      success: true, 
      message: 'Summary generation triggered' 
    });
    
  } catch (error) {
    console.error('❌ Test summary error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Process calendar event - UPDATED with duplicate prevention
async function processCalendarEvent(eventId) {
  try {
    // Check if we've already processed this event
    if (processedEvents.has(eventId)) {
      console.log(`⚠️  Event ${eventId} already processed - skipping duplicate`);
      return;
    }
    
    // Mark event as being processed
    processedEvents.set(eventId, { status: 'processing', timestamp: Date.now() });
    
    console.log('\n' + '='.repeat(80));
    console.log('📅 PROCESSING CALENDAR EVENT');
    console.log('='.repeat(80));
    console.log('   Event ID:', eventId);
    
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId
    });
    
    const eventData = event.data;
    const eventTitle = eventData.summary || 'Untitled Meeting';
    const startTime = eventData.start?.dateTime || eventData.start?.date;
    const endTime = eventData.end?.dateTime || eventData.end?.date;
    
    console.log('\n📋 EVENT DETAILS:');
    console.log('   Title:', eventTitle);
    console.log('   Start:', startTime);
    console.log('   End:', endTime);
    console.log('   Organizer:', eventData.organizer?.email);
    
    if (eventData.status === 'cancelled') {
      console.log('   ⚠️  Event is cancelled, skipping...');
      processedEvents.set(eventId, { status: 'cancelled', timestamp: Date.now() });
      return;
    }
    
    console.log('\n🔍 SEARCHING FOR MEETING LINK...');
    const meetingUrl = extractMeetingUrl(eventData);
    
    if (!meetingUrl) {
      console.log('   ℹ️  No meeting link found - regular calendar event');
      processedEvents.set(eventId, { status: 'no_link', timestamp: Date.now() });
      console.log('='.repeat(80) + '\n');
      return;
    }
    
    const now = new Date();
    const meetingStart = new Date(startTime);
    const meetingEnd = new Date(endTime);
    
    console.log('\n⏰ TIMING CHECK:');
    console.log('   Current time:', now.toISOString());
    console.log('   Meeting start:', meetingStart.toISOString());
    console.log('   Time until meeting:', Math.round((meetingStart - now) / 1000 / 60), 'minutes');
    
    // Join 2 minutes before meeting
    const joinTime = new Date(meetingStart.getTime() - 2 * 60 * 1000);
    
    if (now >= joinTime && now <= meetingEnd) {
      console.log('   ✅ Meeting is starting soon or in progress - joining now!');
      await deployBotToMeeting(meetingUrl, eventTitle, eventId);
      processedEvents.set(eventId, { status: 'joined', timestamp: Date.now() });
    } else if (now < joinTime) {
      const waitTime = joinTime - now;
      console.log(`   ⏳ Scheduling bot to join in ${Math.round(waitTime / 1000 / 60)} minutes`);
      
      // Store the timeout ID so we can cancel duplicates
      const timeoutId = setTimeout(async () => {
        // Double-check we haven't already joined
        const eventStatus = processedEvents.get(eventId);
        if (eventStatus && eventStatus.status === 'joined') {
          console.log('   ⚠️  Bot already joined this meeting - cancelling duplicate join');
          return;
        }
        
        console.log('   ⏰ Time to join meeting!');
        await deployBotToMeeting(meetingUrl, eventTitle, eventId);
        processedEvents.set(eventId, { status: 'joined', timestamp: Date.now() });
      }, waitTime);
      
      processedEvents.set(eventId, { 
        status: 'scheduled', 
        timestamp: Date.now(),
        timeoutId: timeoutId 
      });
    } else {
      console.log('   ⚠️  Meeting has already ended');
      processedEvents.set(eventId, { status: 'ended', timestamp: Date.now() });
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error processing event:', error.message);
    processedEvents.set(eventId, { status: 'error', timestamp: Date.now() });
    console.log('='.repeat(80) + '\n');
  }
}

// Start watching calendar
async function startCalendarWatch() {
  try {
    calendarChannelId = 'bot-calendar-' + Date.now();
    
    console.log('\n📡 Starting Calendar Watch...');
    console.log('   Webhook URL:', `${PUBLIC_URL}/api/calendar-webhook`);
    console.log('   Channel ID:', calendarChannelId);
    
    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: calendarChannelId,
        type: 'web_hook',
        address: `${PUBLIC_URL}/api/calendar-webhook`,
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)
      }
    });
    
    calendarResourceId = response.data.resourceId;
    
    console.log('✅ Calendar watch started successfully!');
    console.log('   Resource ID:', calendarResourceId);
    console.log('   Expires:', new Date(parseInt(response.data.expiration)));
    
    // Auto-renew before expiration
    setTimeout(() => {
      console.log('🔄 Renewing calendar watch...');
      stopCalendarWatch().then(() => startCalendarWatch());
    }, 6.5 * 24 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Calendar watch error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Stop watching calendar
async function stopCalendarWatch() {
  if (!calendarChannelId || !calendarResourceId) {
    console.log('⚠️  No active calendar watch to stop');
    return;
  }
  
  try {
    await calendar.channels.stop({
      requestBody: {
        id: calendarChannelId,
        resourceId: calendarResourceId
      }
    });
    console.log('🛑 Calendar watch stopped');
  } catch (error) {
    console.error('❌ Error stopping calendar watch:', error.message);
  }
}

// Track bot to session/event mapping
const botSessionMap = new Map();
const botEventMap = new Map();
// Get participants from Recall.ai after meeting ends
async function getRecallParticipants(botId) {
  try {
    console.log('\n👥 FETCHING PARTICIPANTS FROM RECALL.AI');
    console.log('   Bot ID:', botId);
    
    // Get bot details with recordings
    const response = await fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Recall API error: ${response.status}`);
    }
    
    const botData = await response.json();
    console.log('   ✅ Bot data retrieved');
    
    // Get recording ID (usually the first/only recording)
    const recordings = botData.recordings || [];
    if (recordings.length === 0) {
      console.log('   ⚠️  No recordings found yet');
      return [];
    }
    
    const recordingId = recordings[0].id;
    console.log('   Recording ID:', recordingId);
    
    // Get participant events for this recording
    const participantsResponse = await fetch(
      `https://us-west-2.recall.ai/api/v1/participant_events?recording_id=${recordingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!participantsResponse.ok) {
      throw new Error(`Participants API error: ${participantsResponse.status}`);
    }
    
    const participantData = await participantsResponse.json();
    
    if (!participantData.results || participantData.results.length === 0) {
      console.log('   ⚠️  No participant events found');
      return [];
    }
    
    // Get participants download URL
    const participantsDownloadUrl = participantData.results[0].data?.participants_download_url;
    
    if (!participantsDownloadUrl) {
      console.log('   ⚠️  No participants download URL found');
      return [];
    }
    
    console.log('   📥 Downloading participants data...');
    
    // Download participants JSON
    const participantsJsonResponse = await fetch(participantsDownloadUrl);
    const participants = await participantsJsonResponse.json();
    
    console.log('   ✅ Participants retrieved:', participants.length);
    
    // Extract emails (participants may have email field)
    const emails = participants
      .filter(p => p.email)
      .map(p => p.email);
    
    console.log('   📧 Emails found:', emails);
    
    return emails;
    
  } catch (error) {
    console.error('   ❌ Error fetching Recall participants:', error.message);
    return [];
  }
}


async function sendSummaryViaN8n(eventId, sessionId) {
  try {
    console.log('\n📧 SENDING MEETING SUMMARY VIA N8N');
    console.log('='.repeat(80));
    
    // Get conversation history
    const history = conversationHistory.get(sessionId) || [];
    
    if (history.length === 0) {
      console.log('⚠️  No conversation to summarize');
      return;
    }
    
    // Format full transcript
    const fullTranscript = history.map(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `[${time}] ${msg.speaker}: ${msg.content}`;
    }).join('\n\n');
    
    console.log(`📝 Transcript length: ${fullTranscript.length} characters`);
    console.log(`💬 Total messages: ${history.length}`);
    
    // Generate summary using GPT-OSS-20B
    console.log('\n🤖 Generating summary with GPT-OSS-20B...');
    const summaryResponse = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `You are a professional meeting summarizer. Create a clear, concise summary in HTML format including:
          - Main topics discussed
          - Key decisions made
          - Important questions and answers
          - Action items (if any)
          
          Use HTML tags like <h3>, <p>, <ul>, <li> for structure.`
        },
        {
          role: 'user',
          content: `Summarize this meeting transcript:\n\n${fullTranscript}`
        }
      ],
      max_completion_tokens: 500,
      temperature: 0.3
    });
    
    const summary = summaryResponse.choices[0].message.content.trim();
    console.log('✅ Summary generated');
    
    // Get meeting details from Calendar
    console.log('\n📅 Getting meeting details from Calendar...');
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId
    });
    
    const meetingTitle = event.data.summary || 'Meeting';
    const meetingDate = event.data.start?.dateTime || event.data.start?.date;
    const meetingUrl = extractMeetingUrl(event.data);
console.log('   Meeting URL:', meetingUrl);
    // Calculate duration
    const startTime = new Date(event.data.start?.dateTime);
    const endTime = new Date(event.data.end?.dateTime);
    const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);
    const duration = `${durationMinutes} minutes`;
   // Get all calendar attendees (exclude declined)
console.log('\n📅 Getting participants from Calendar attendees...');
const attendees = event.data.attendees || [];

let participantEmails = attendees
  .filter(attendee => {
    return attendee.email && 
           attendee.responseStatus !== 'declined';
  })
  .map(attendee => attendee.email);

console.log(`   Found ${participantEmails.length} attendees from calendar`);

// Add creator/host if not already in list
if (event.data.creator?.email) {
  if (!participantEmails.includes(event.data.creator.email)) {
    participantEmails.push(event.data.creator.email);
    console.log(`   ✅ Added creator: ${event.data.creator.email}`);
  }
}

participantEmails = [...new Set(participantEmails)];

console.log(`\n📧 Final participant count: ${participantEmails.length}`);
console.log('   Emails:', participantEmails.join(', '));

if (participantEmails.length === 0) {
  console.log('\n⚠️  No participants found in calendar attendees!');
  console.log('   Summary generated but not sent - no recipients');
  return;
}
    
    console.log(`📧 Found ${participantEmails.length} participants from meeting`);
    console.log('   Emails:', participantEmails.join(', '));
    
    if (participantEmails.length === 0) {
      console.log('⚠️  No participants with emails found in meeting');
      console.log('   Summary generated but not sent - no recipients');
      console.log('   NOTE: Participants may have joined anonymously or Recall.ai could not capture emails');
      return;
    }
    
    // Send to n8n webhook
    console.log('\n📤 Sending data to n8n webhook...');
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    const n8nPayload = {
      meetingTitle: meetingTitle,
      meetingDate: new Date(meetingDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      duration: duration,
      summary: summary,
      participantEmails: participantEmails,
      fullTranscript: fullTranscript,
      eventId: eventId
    };
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(n8nPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ n8n webhook successful!');
    console.log('   Response:', result);
    console.log('='.repeat(80) + '\n');
    
    // Clean up conversation history
    conversationHistory.delete(sessionId);
    console.log('🧹 Cleaned up conversation history');
    
  } catch (error) {
    console.error('❌ Error sending summary via n8n:', error.message);
  }
}
// Clean up old processed events every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [eventId, data] of processedEvents.entries()) {
    if (data.timestamp < oneHourAgo) {
      processedEvents.delete(eventId);
    }
  }
  console.log('🧹 Cleaned up old processed events. Current count:', processedEvents.size);
}, 60 * 60 * 1000);

// ============================================================
// API ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'Zoom Voice Bot with Calendar Integration', 
    status: 'running',
    features: {
      stt: 'Deepgram Nova-3',
      llm: 'Groq Llama 4 Maverick',
      tts: 'Deepgram Aura',
      diarization: 'enabled',
      contextAware: 'enabled',
      calendarIntegration: 'enabled'
    },
    endpoints: {
      health: '/api/health',
      connect: '/api/connect',
      sendAudio: '/api/send-audio',
      getAudio: '/api/get-audio/:sessionId',
      calendarWebhook: '/api/calendar-webhook',
      calendarCheck: '/api/trigger-calendar-check',
      calendarWatch: '/api/calendar-watch/start'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: deepgramConnections.size,
    timestamp: new Date().toISOString(),
    calendarWatch: {
      active: !!calendarChannelId,
      channelId: calendarChannelId
    },
    processedEvents: processedEvents.size,
    models: {
      stt: 'nova-3',
      llm: 'llama-4-maverick-17b',
      tts: 'aura-asteria-en'
    }
  });
});

// Calendar webhook endpoint
app.post('/api/calendar-webhook', async (req, res) => {
  try {
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceId = req.headers['x-goog-resource-id'];
    const channelId = req.headers['x-goog-channel-id'];
    
    console.log('\n📬 Calendar webhook received:');
    console.log('   State:', resourceState);
    console.log('   Resource ID:', resourceId);
    console.log('   Channel ID:', channelId);
    
    res.status(200).send('OK');
    
    if (resourceState === 'exists') {
      console.log('   📅 Event created or updated');
      
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin: fiveMinutesAgo.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'updated'
      });
      
      for (const event of events.data.items) {
        await processCalendarEvent(event.id);
      }
      
    } else if (resourceState === 'sync') {
      console.log('   🔄 Initial sync notification');
    }
    
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(200).send('OK');
  }
});
// Recall.ai webhook for bot events
app.post('/api/recall-webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Bot ID is nested in data.bot.id
    const bot_id = data?.bot?.id;
    const eventData = data?.data;
    
    console.log('\n📬 RECALL.AI WEBHOOK RECEIVED');
    console.log('   Event:', event);
    console.log('   Bot ID:', bot_id);
    console.log('   Event Code:', eventData?.code);
    console.log('   Sub Code:', eventData?.sub_code);
    
    // Acknowledge immediately
    res.status(200).json({ received: true });
    
    if (!bot_id) {
      console.log('   ❌ No bot ID found in webhook');
      return;
    }
    
    // Check if meeting ended (call_ended event)
    if (event === 'bot.call_ended') {
      console.log('🏁 BOT CALL ENDED - MEETING FINISHED');
      console.log('   Reason:', eventData?.sub_code || 'unknown');
      
      const sessionId = botSessionMap.get(bot_id);
      const eventId = botEventMap.get(bot_id);
      
      console.log('   🔍 Looking up bot ID:', bot_id);
      console.log('   📋 Available mappings:', {
        sessions: Array.from(botSessionMap.entries()),
        events: Array.from(botEventMap.entries())
      });
      
      if (sessionId && eventId) {
        console.log(`   ✅ Found mapping: Session ${sessionId}, Event ${eventId}`);
        
        // Wait a bit for final transcripts to process
        setTimeout(async () => {
          console.log('📧 Automatically sending meeting summary...');
          await sendSummaryViaN8n(eventId, sessionId);
          
          // Clean up mappings
          botSessionMap.delete(bot_id);
          botEventMap.delete(bot_id);
          
          console.log('🧹 Cleaned up bot mappings');
        }, 5000); // Wait 5 seconds for transcription to settle
        
      } else {
        console.log('   ⚠️  No mapping found for this bot');
        console.log('   Bot ID searched:', bot_id);
        console.log('   Found session:', sessionId);
        console.log('   Found event:', eventId);
      }
    } else {
      console.log('   ℹ️  Ignoring event:', event);
    }
    
  } catch (error) {
    console.error('❌ Recall webhook error:', error.message);
    console.error('   Full error:', error);
    res.status(200).send('OK'); // Still acknowledge to prevent retries
  }
});
// Manual calendar check endpoint
app.post('/api/trigger-calendar-check', async (req, res) => {
  try {
    console.log('\n🔍 Manual calendar check triggered...');
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    console.log(`   Found ${events.data.items.length} upcoming events`);
    
    const results = [];
    for (const event of events.data.items) {
      const meetingUrl = extractMeetingUrl(event);
      results.push({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        hasMeetingLink: !!meetingUrl,
        meetingUrl: meetingUrl
      });
    }
    
    res.json({
      success: true,
      upcomingMeetings: results
    });
    
  } catch (error) {
    console.error('❌ Manual check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start calendar watch endpoint
app.post('/api/calendar-watch/start', async (req, res) => {
  try {
    await startCalendarWatch();
    res.json({ success: true, message: 'Calendar watch started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop calendar watch endpoint
app.post('/api/calendar-watch/stop', async (req, res) => {
  try {
    await stopCalendarWatch();
    res.json({ success: true, message: 'Calendar watch stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      diarize: true,
      punctuate: true
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
        
        pusher.trigger(channel, 'transcript-interim', {
          text: transcript,
          speaker: speakerId,
          is_final: data.is_final,
          speech_final: data.speech_final
        }).catch(err => console.error('Pusher error:', err));
        
if (data.is_final && data.speech_final) {
  
  if (transcript !== lastProcessedTranscript) {
    
    const t0 = Date.now();
    
    console.log('\n' + '🚀'.repeat(40));
    console.log('🚀 PROCESSING COMPLETE UTTERANCE (NORMAL PATH)');
    console.log('🚀'.repeat(40));
    console.log(`\n👤 Speaker: ${speakerId}`);
    console.log(`💬 Transcript: "${transcript}"`);
    
    const t_stt_end = Date.now();
    console.log(`\n⏱️  [${t_stt_end - t0}ms] STT Processing Complete`);
    
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
    
    addToHistory(sessionId, speakerId, transcript);
    
    console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
    console.log('\n📋 CURRENT CONVERSATION HISTORY:');
    const history = conversationHistory.get(sessionId) || [];
    history.forEach((msg, idx) => {
      console.log(`   [${idx + 1}] ${msg.speaker}: "${msg.content}"`);
    });
    
    console.log('\n🤖 SENDING TO LLM FOR DECISION...');
    console.log('-'.repeat(80));
    
    processWithLLMContextAware(sessionId, t0);
    
    lastProcessedTranscript = transcript;
    
  } else {
    console.log('\n⚠️  DUPLICATE TRANSCRIPT DETECTED - SKIPPING');
    console.log(`   Transcript: "${transcript}"`);
  }
}
else if (data.is_final && !data.speech_final) {
  
  console.log('\n' + '⚠️'.repeat(40));
  console.log('⚠️  STUCK DETECTION: is_final=true BUT speech_final=false');
  console.log('⚠️'.repeat(40));
  console.log(`\n👤 Speaker: ${speakerId}`);
  console.log(`💬 Transcript: "${transcript}"`);
  console.log(`⏱️  Waiting for speech_final, but calling GPT to check if complete...`);
  
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
        
        addToHistory(sessionId, speakerId, transcript);
        
        console.log(`   After: ${conversationHistory.get(sessionId)?.length || 0} messages`);
        
        console.log('\n🤖 SENDING TO LLM FOR DECISION...');
        console.log('-'.repeat(80));
        
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
  app.listen(PORT, async () => {
    console.log(`\n⚡ Server running on http://localhost:${PORT}`);
    console.log(`🦙 LLM: Groq Llama 4 Maverick 17B`);
    console.log(`🎙️  STT: Deepgram Nova-3 (with Diarization)`);
    console.log(`🔊 TTS: Deepgram Aura`);
    console.log(`👥 Speaker Awareness: Enabled`);
    console.log(`🧠 Context-Aware Decisions: Enabled`);
    console.log(`📅 Calendar Integration: Enabled`);
    
    console.log(`\n📡 Starting Calendar Watch...`);
    try {
      await startCalendarWatch();
    } catch (error) {
      console.error('❌ Calendar watch startup failed:', error.message);
      console.log('   You can manually start it via: POST /api/calendar-watch/start');
    }
    
    console.log('\n');
  });
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

module.exports = app;