'use server';

/**
 * @fileOverview Elite 32 Conversational Agent Flow (HybridRAG).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { retrieveRelevantKnowledge } from '@/ai/rag/intelligent-retriever';
import { assembleContext } from '@/ai/rag/context-assembler';
import { storeInteraction } from '@/ai/learning/episodic-memory';

const ChatFlowInputSchema = z.object({
  query: z.string().describe('The natural language question from the user.'),
});
export type ChatFlowInput = z.infer<typeof ChatFlowInputSchema>;

const ChatFlowOutputSchema = z.object({
  response: z.string().describe('The contextualized answer to the user\'s query.'),
  confidence: z.number().optional().describe('AI confidence score.'),
});
export type ChatFlowOutput = z.infer<typeof ChatFlowOutputSchema>;

export async function chatFlow(input: ChatFlowInput): Promise<ChatFlowOutput> {
  return ragChatFlow(input);
}

const ragChatPrompt = ai.definePrompt({
  name: 'ragChatPrompt',
  input: { 
    schema: z.object({ 
      query: z.string(), 
      context: z.string() 
    }) 
  },
  output: { schema: ChatFlowOutputSchema },
  prompt: `You are the AGENTIC Elite 32 Assistant.
Your task is to answer the user's question using the provided Multi-Strate context.
Follow the elite reasoning loop:
1. Analyze technical documentation (cold knowledge).
2. Check episodic memory for past successful patterns.
3. Validate relations via knowledge graph.

If the context is insufficient, state it clearly. Always provide cited generations.

Context:
{{{context}}}

Question:
{{{query}}}

Answer:`
});

const ragChatFlow = ai.defineFlow(
  {
    name: 'ragChatFlow',
    inputSchema: ChatFlowInputSchema,
    outputSchema: ChatFlowOutputSchema,
  },
  async (input) => {
    // 1. PHASE DE RÉCUPÉRATION (HybridRAG)
    const knowledge = await retrieveRelevantKnowledge(input.query);
    
    // 2. ASSEMBLAGE CONTEXTUEL
    const context = assembleContext(knowledge);

    // 3. PHASE DE RAISONNEMENT (Metacognitive Generation)
    const { output } = await ragChatPrompt({
      query: input.query,
      context: context,
    });

    const finalResponse = output!;

    // 4. PHASE D'APPRENTISSAGE (Continuous Learning) - Async fire and forget
    storeInteraction(input.query, finalResponse.response).catch(err => 
      console.error("[Elite 32] Failed to store episodic memory:", err)
    );

    return finalResponse;
  }
);
