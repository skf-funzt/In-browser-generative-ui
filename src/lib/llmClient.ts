import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { openuiLibrary } from '@openuidev/react-ui';

const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

let engine: Awaited<ReturnType<typeof CreateWebWorkerMLCEngine>> | null = null;

export async function init(
  onProgress?: (text: string) => void,
): Promise<void> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });

  engine = await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
    initProgressCallback: (progress) => {
      if (onProgress) {
        onProgress(progress.text);
      }
    },
  });
}

export async function generateUIStream(
  userPrompt: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  if (!engine) {
    throw new Error('Engine not initialized. Call init() first.');
  }

  const systemPrompt = openuiLibrary.prompt();

  const chunks = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      onChunk(delta);
    }
  }
}
