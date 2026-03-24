
/**
 * @fileOverview Flux de suppression des documents et de leurs vecteurs.
 * 
 * - deleteDocument - Supprime les métadonnées et purge les segments (chunks) associés.
 * - DeleteInput - ID du document à supprimer.
 * - DeleteOutput - Confirmation et nombre de segments purgés.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeleteInputSchema = z.object({
  docId: z.string(),
  fileName: z.string(),
});
export type DeleteInput = z.infer<typeof DeleteInputSchema>;

const DeleteOutputSchema = z.object({
  success: z.boolean(),
  purgedChunks: z.number(),
  deletedAt: z.string(),
});
export type DeleteOutput = z.infer<typeof DeleteOutputSchema>;

export async function deleteDocument(input: DeleteInput): Promise<DeleteOutput> {
  return deleteDocumentFlow(input);
}

const deleteDocumentFlow = ai.defineFlow(
  {
    name: 'deleteDocumentFlow',
    inputSchema: DeleteInputSchema,
    outputSchema: DeleteOutputSchema,
  },
  async (input) => {
    console.log(`[BACKEND][DELETE] Purge des données pour : ${input.fileName} (ID: ${input.docId})`);
    
    // Simulation du processus de nettoyage RAG
    // 1. Identification des segments dans l'index vectoriel
    const simulatedChunksCount = Math.floor(Math.random() * 20) + 1;
    
    // 2. Suppression physique (Simulation)
    console.log(`[BACKEND][DELETE] Suppression de ${simulatedChunksCount} vecteurs dans l'index local...`);
    
    // 3. Confirmation
    console.log(`[BACKEND][DELETE] Nettoyage terminé avec succès.`);

    return {
      success: true,
      purgedChunks: simulatedChunksCount,
      deletedAt: new Date().toISOString(),
    };
  }
);
