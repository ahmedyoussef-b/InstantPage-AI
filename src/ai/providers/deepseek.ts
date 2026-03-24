// src/ai/providers/deepseek.ts
export async function callDeepSeek(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY manquante dans .env.local');
  }

  console.log(`[DEEPSEEK] Appel API avec modèle: ${model}`);

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en centrale électrique à cycle combiné. Réponds de manière précise et professionnelle.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const answer = data.choices[0].message.content;

  console.log(`[DEEPSEEK] Réponse reçue (${answer.length} caractères)`);

  return answer;
}