'use server';
/**
 * @fileOverview A Genkit flow for dynamically generating step-by-step procedures or guidelines.
 *
 * - procedureHelp - A function that handles the generation of a procedure.
 * - ProcedureHelpInput - The input type for the procedureHelp function.
 * - ProcedureHelpOutput - The return type for the procedureHelp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcedureHelpInputSchema = z.object({
  query: z.string().describe('The user\'s request for a step-by-step procedure or guidelines.'),
});
export type ProcedureHelpInput = z.infer<typeof ProcedureHelpInputSchema>;

const ProcedureHelpOutputSchema = z.object({
  procedure: z.string().describe('The generated step-by-step procedure or guidelines.'),
});
export type ProcedureHelpOutput = z.infer<typeof ProcedureHelpOutputSchema>;

export async function procedureHelp(input: ProcedureHelpInput): Promise<ProcedureHelpOutput> {
  return procedureHelpFlow(input);
}

const procedureHelpPrompt = ai.definePrompt({
  name: 'procedureHelpPrompt',
  input: {schema: ProcedureHelpInputSchema},
  output: {schema: ProcedureHelpOutputSchema},
  prompt: `You are an expert at creating clear, concise, and accurate step-by-step operational procedures and guidelines.
Your task is to generate a detailed procedure based on the user's request. Ensure the procedure is easy to follow and covers all necessary steps.

User Request: {{{query}}}

Please provide the procedure in a step-by-step format, clearly outlining each action.`,
});

const procedureHelpFlow = ai.defineFlow(
  {
    name: 'procedureHelpFlow',
    inputSchema: ProcedureHelpInputSchema,
    outputSchema: ProcedureHelpOutputSchema,
  },
  async input => {
    const {output} = await procedureHelpPrompt(input);
    if (!output) {
      throw new Error('Failed to generate procedure.');
    }
    return output;
  }
);
