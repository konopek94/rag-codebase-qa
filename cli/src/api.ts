
const BACKEND_URL = process.env.RAG_QA_BACKEND || 'http://localhost:3001';

export interface QueryResponse {
  event?: string;
  data?: string;
}

export async function ingestRepo(
  repoPath: string,
  excludePatterns?: string
): Promise<{ chunksIndexed: number; filesExcluded: string[]; filesSkipped: string[] }> {
  const response = await fetch(`${BACKEND_URL}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, excludePatterns: excludePatterns || '' }),
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'Ingest failed');
  }

  return (await response.json()) as any;
}

export async function askQuestion(
  question: string,
  repoPath: string,
  historyLimit: number = 10
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, repoPath, historyLimit }),
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'Query failed');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let sources: any[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('event: sources')) continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.sources) {
              sources = parsed.sources;
            } else {
              process.stdout.write(data);
            }
          } catch {
            process.stdout.write(data);
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  // Print sources at the end
  if (sources.length > 0) {
    console.log('\n\nSources:');
    sources.forEach(src => {
      console.log(`  ${src.file}:${src.startLine}-${src.endLine}`);
    });
  }
}

export async function getHistory(repoPath: string): Promise<any[]> {
  const response = await fetch(
    `${BACKEND_URL}/history?repoPath=${encodeURIComponent(repoPath)}`
  );

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'Failed to fetch history');
  }

  return (await response.json()) as any[];
}

export async function clearHistory(repoPath: string): Promise<void> {
  const response = await fetch(
    `${BACKEND_URL}/history?repoPath=${encodeURIComponent(repoPath)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'Failed to clear history');
  }
}
