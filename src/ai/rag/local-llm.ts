// src/ai/rag/local-llm.ts
const LOCALAI_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').trim() + '/v1/chat/completions';

const SYSTEM_PROMPT = 'Tu es un assistant expert en maintenance de centrale thermique. Tu réponds TOUJOURS et EXCLUSIVEMENT en FRANÇAIS. Ne mélange JAMAIS les langues.';

export async function generateLLMResponse(prompt: string, context: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  try {
    const response = await fetch(LOCALAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'phi:2.7b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `${context.length > 0 ? `CONTEXTE TECHNIQUE:\n${context}\n\n` : ''}QUESTION: ${prompt}\n\nRÉPONSE (en français):` 
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Aucune réponse générée.';
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Timeout génération LLM (120s dépassé)');
      return 'Le modèle a pris trop de temps. Veuillez simplifier votre question.';
    }
    console.error('❌ Erreur génération:', error?.message || error);
    return 'Désolé, une erreur technique est survenue lors de la génération.';
  } finally {
    clearTimeout(timeout);
  }
}

export async function* generateLLMResponseStream(prompt: string, context: string): AsyncIterable<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(LOCALAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama3:8b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `${context.length > 0 ? `CONTEXTE:\n${context}\n\n` : ''}QUESTION: ${prompt}\n\nRÉPONSE:` 
          }
        ],
        temperature: 0.4,
        max_tokens: 800,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith('data: [DONE]')) continue;
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.substring(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      yield '\n[Délai dépassé — réponse partielle]';
    } else {
      console.error('❌ Erreur streaming:', error?.message);
      yield 'Erreur lors de la génération du flux.';
    }
  } finally {
    clearTimeout(timeout);
  }
}