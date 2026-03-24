'use server';

/**
 * @fileOverview A Genkit flow for a RAG-powered conversational agent.
 *
 * - chatFlow - A function that handles natural language questions and provides
 *              contextualized answers from indexed documents.
 * - ChatFlowInput - The input type for the chatFlow function.
 * - ChatFlowOutput - The return type for the chatFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatFlowInputSchema = z.object({
  query: z.string().describe('The natural language question from the user.'),
  retrievedContext: z.string().optional().describe('Relevant context retrieved from indexed documents, used to answer the query.'),
});
export type ChatFlowInput = z.infer<typeof ChatFlowInputSchema>;

const ChatFlowOutputSchema = z.object({
  response: z.string().describe('The contextualized answer to the user\'s query.'),
});
export type ChatFlowOutput = z.infer<typeof ChatFlowOutputSchema>;

export async function chatFlow(input: ChatFlowInput): Promise<ChatFlowOutput> {
  return ragChatFlow(input);
}

const ragChatPrompt = ai.definePrompt({
  name: 'ragChatPrompt',
  input: {schema: ChatFlowInputSchema},
  output: {schema: ChatFlowOutputSchema},
  prompt: `You are a helpful and knowledgeable assistant.
Your task is to answer the user's question based ONLY on the provided context.
If the answer cannot be found in the context, state that you cannot provide an answer based on the given information.

Context:
{{#if retrievedContext}}
{{{retrievedContext}}}
{{else}}
No specific documents were retrieved for this query.
{{/if}}

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
    // In a full RAG implementation, a retrieval step would occur here,
    // fetching relevant documents based on input.query.
    // For example:
    // import { retrieveRelevantDocuments } from '@/ai/rag/intelligent-retriever';
    // const documents = await retrieveRelevantDocuments(input.query);
    // const contextString = documents.map(doc => doc.content).join('\n\n');
    // However, as per assignment, we use the 'retrievedContext' provided in the input
    // or a default if not present.

    const contextForPrompt = input.retrievedContext || "No specific documents were retrieved for this query.";

    const {output} = await ragChatPrompt({
      query: input.query,
      retrievedContext: contextForPrompt,
    });

    return output!;
  }
);