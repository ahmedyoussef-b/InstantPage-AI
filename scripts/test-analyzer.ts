import dotenv from 'dotenv';
dotenv.config();

import { analyzeQuery } from '../src/ai/rag/query-analyzer';

async function main() {
  console.log('--- TEST ANALYZER ---');
  try {
    const result = await analyzeQuery('bonjour');
    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  }
}

main();
