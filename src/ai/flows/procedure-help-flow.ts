
/**
 * @fileOverview Flux d'aide contextuelle pour les procédures techniques.
 * 
 * - getProcedureHelp - Aide technique pour l'opérateur.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProcedureHelpInputSchema = z.object({
  userName: z.string().default('Opérateur'),
  stepTitle: z.string(),
  instruction: z.string(),
  problem: z.string(),
  expectedValue: z.string(),
});
export type ProcedureHelpInput = z.infer<typeof ProcedureHelpInputSchema>;

const ProcedureHelpOutputSchema = z.object({
  advice: z.string(),
  safetyReminder: z.string().optional(),
});
export type ProcedureHelpOutput = z.infer<typeof ProcedureHelpOutputSchema>;

export async function getProcedureHelp(input: ProcedureHelpInput): Promise<ProcedureHelpOutput> {
  return procedureHelpFlow(input);
}

const procedureHelpFlow = ai.defineFlow(
  {
    name: 'procedureHelpFlow',
    inputSchema: ProcedureHelpInputSchema,
    outputSchema: ProcedureHelpOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      system: `Tu es un expert en maintenance industrielle assistant un opérateur.
      Ta mission est de l'aider à résoudre un problème spécifique lors d'une étape de procédure.
      RÈGLES :
      1. Sois très précis et technique.
      2. Propose des solutions concrètes et actionnables immédiatement.
      3. Si le problème semble dangereux, insiste sur la sécurité.`,
      prompt: `L'opérateur rencontre un problème à l'étape : ${input.stepTitle}.
      Instruction originale : ${input.instruction}
      Valeur attendue : ${input.expectedValue}
      Problème signalé : ${input.problem}`,
    });

    return {
      advice: response.text,
      safetyReminder: "Veuillez vérifier vos équipements de protection individuelle avant toute intervention."
    };
  }
);
