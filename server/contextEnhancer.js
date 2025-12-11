// ============================================================================
// CONTEXT ENHANCER SERVICE
// ============================================================================

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ============================================================================
// CONTEXT ENHANCEMENT PROMPT
// ============================================================================

const CONTEXT_ENHANCEMENT_PROMPT = `You are a query rewriting assistant. Your job is to rewrite user questions to be more specific and searchable by incorporating context from conversation history.

RULES:
1. If the question is already clear and complete → Return it as-is
2. If the question uses pronouns (it, that, this, he, she) → Replace with specific references from history
3. If the question is a follow-up → Add relevant context to make it standalone
4. Keep the rewritten question concise (under 30 words)
5. Maintain the user's intent - don't change what they're asking
6. Return ONLY the rewritten question, nothing else

EXAMPLES:

Example 1:
History: "User: Tell me about cricket\nAI: Cricket is a sport played with bat and ball"
Question: "What are the rules?"
Rewritten: "What are the rules of cricket?"

Example 2:
History: "User: What's my education?\nAI: You have a Bachelor's in Computer Science"
Question: "What was my grade?"
Rewritten: "What was my grade in Bachelor's in Computer Science?"

Example 3:
History: "User: Who is the CEO of Tesla?\nAI: Elon Musk is the CEO"
Question: "How old is he?"
Rewritten: "How old is Elon Musk?"

Example 4:
History: "User: Tell me about my projects"
Question: "What's my phone number?"
Rewritten: "What's my phone number?"
(No enhancement needed - unrelated to history)

Example 5:
History: ""
Question: "What's my email address?"
Rewritten: "What's my email address?"
(No history - return as-is)

Now rewrite the query:`;

// ============================================================================
// ENHANCEMENT FUNCTION
// ============================================================================

/**
 * Enhance user query with conversation context
 * @param {string} question - Original user question
 * @param {string} conversationContext - Recent conversation history
 * @returns {Promise<string>} - Enhanced/rewritten question
 */
async function enhanceQuery(question, conversationContext) {
  try {
    console.log('\n🔄 CONTEXT ENHANCEMENT');
    console.log('='.repeat(80));
    console.log(`   Original question: "${question}"`);
    
    // If no conversation history, return original question
    if (!conversationContext || conversationContext.trim().length === 0) {
      console.log('   ℹ️  No conversation history - returning original question');
      console.log('='.repeat(80) + '\n');
      return question;
    }
    
    console.log(`   Conversation history: ${conversationContext.length} characters`);
    console.log('   🔄 Calling LLM for context enhancement...');
    
    const startTime = Date.now();
    
    // Call LLM to rewrite query
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: CONTEXT_ENHANCEMENT_PROMPT
        },
        {
          role: 'user',
          content: `History: "${conversationContext}"\nQuestion: "${question}"\nRewritten:`
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 100,
      stream: false
    });
    
    const enhancedQuery = response.choices[0].message.content.trim();
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`   ✅ Enhanced question: "${enhancedQuery}"`);
    console.log(`   ⏱️  Latency: ${latency}ms`);
    console.log('='.repeat(80) + '\n');
    
    return enhancedQuery;
    
  } catch (error) {
    console.error('❌ Context enhancement error:', error.message);
    console.log('   ⚠️  Falling back to original question');
    console.log('='.repeat(80) + '\n');
    
    // Fallback: Return original question if enhancement fails
    return question;
  }
}

/**
 * Check if query needs enhancement
 * @param {string} question - User question
 * @param {string} conversationContext - Recent conversation history
 * @returns {boolean} - True if enhancement might help
 */
function shouldEnhanceQuery(question, conversationContext) {
  // No history → No enhancement needed
  if (!conversationContext || conversationContext.trim().length === 0) {
    return false;
  }
  
  // Check if question has pronouns or is very short (likely a follow-up)
  const pronouns = ['it', 'that', 'this', 'he', 'she', 'they', 'them', 'his', 'her', 'their'];
  const hasPronouns = pronouns.some(p => question.toLowerCase().includes(` ${p} `) || question.toLowerCase().includes(` ${p}?`));
  
  // Very short questions are often follow-ups
  const wordCount = question.split(' ').length;
  const isShort = wordCount <= 5;
  
  return hasPronouns || isShort;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  enhanceQuery,
  shouldEnhanceQuery
};