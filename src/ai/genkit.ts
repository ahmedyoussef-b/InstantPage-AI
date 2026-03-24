// src/ai/genkit.ts - MIGRATION OLLAMA

import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    ollama({
      // @ts-ignore
      serverAddress: (process.env.OLLAMA_URL || 'http://localhost:11434').trim(),
      models: [
        { name: 'phi:2.7b', type: 'chat' },
        { name: 'tinyllama:latest', type: 'chat' }
      ],
    }),
  ],
  model: 'ollama/phi:2.7b',
});