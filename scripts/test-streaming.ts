import dotenv from 'dotenv';
dotenv.config();

import { generateResponseStream } from '../src/ai/flows/chat-flow';

async function testStreaming() {
  console.log('🚀 TESTING STREAMING - ELITE-32\n');
  
  const query = "Explique-moi le fonctionnement d'une turbine à vapeur en 3 points.";
  console.log(`Question: "${query}"\n`);
  
  const startTime = Date.now();
  let chunkCount = 0;
  let fullText = "";

  try {
    const stream = generateResponseStream(query, {
      userProfile: { id: 'test-user', expertise: 'intermédiaire' }
    });

    console.log('--- DÉBUT DU FLUX ---');
    for await (const chunk of stream) {
      process.stdout.write(chunk); // Affiche sans nouvelle ligne
      fullText += chunk;
      chunkCount++;
    }
    console.log('\n--- FIN DU FLUX ---');

    const duration = Date.now() - startTime;
    console.log(`\n✅ Test terminé :`);
    console.log(`- Durée totale: ${duration}ms`);
    console.log(`- Nombre de chunks: ${chunkCount}`);
    console.log(`- Longueur de la réponse: ${fullText.length} caractères`);

  } catch (error) {
    console.error('\n❌ Erreur pendant le test de streaming:', error);
  }
}

testStreaming().catch(console.error);
