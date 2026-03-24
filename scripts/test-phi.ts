// scripts/test-phi.ts
import { Ollama } from 'ollama';

async function testPhi() {
  console.log('\n🔍 TEST PHI:2.7b\n');
  console.log('='.repeat(50));
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  try {
    console.log('1. Test de génération avec phi:2.7b...');
    const start = Date.now();
    const response = await ollama.generate({
      model: 'phi:2.7b',
      prompt: 'Quelle est la puissance typique d\'une turbine à gaz industrielle ? Réponds en une phrase courte.',
      stream: false,
      options: {
        temperature: 0.7,
        max_tokens: 100
      }
    });
    const time = Date.now() - start;
    
    console.log(`   ✅ Réponse (${time}ms):`);
    console.log(`   ${response.response.substring(0, 200)}`);
    
    console.log('\n✅ Test réussi !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testPhi().catch(console.error);