import dotenv from 'dotenv';
dotenv.config();

import { ai } from '../src/ai/genkit';

async function testGenkit() {
  console.log('--- TEST GENKIT ---');
  console.log('OLLAMA_URL:', process.env.OLLAMA_URL);
  try {
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      prompt: 'dire hello',
    });
    console.log('SUCCESS:', response.text);
  } catch (error: any) {
    console.error('ERROR:', error);
    if (error.stack) console.error(error.stack);
  }
}

testGenkit();
