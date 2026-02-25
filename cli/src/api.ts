
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

function formatAnswerText(text: string): string {
  // Remove markdown heading syntax
  let cleaned = text
    .replace(/^#+\s+/gm, '') // Remove heading syntax (###, ##, #)
    .replace(/^---+$/gm, '') // Remove horizontal rules (---)
    .replace(/\n\n+/g, '\n'); // Collapse multiple blank lines

  return cleaned;
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
  let answer = '';

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
              answer += data;
              // Format the answer text before output
              const formatted = formatAnswerText(data);
              process.stdout.write(formatted);
            }
          } catch {
            answer += data;
            const formatted = formatAnswerText(data);
            process.stdout.write(formatted);
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  // Print sources at the end
  if (sources.length > 0) {
    console.log('\n');
    console.log('Sources:');
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

export async function listIndexedRepos(): Promise<string[]> {
  const historyDir = `${process.env.HOME}/.rag-qa/history`;
  try {
    const fs = await import('fs');
    const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
    return files.map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function resolveRepoPath(repoIdentifier: string): Promise<string> {
  // Check if it's a number (index)
  const index = parseInt(repoIdentifier, 10);
  if (!isNaN(index) && index > 0) {
    const repos = await listIndexedRepos();
    if (index <= repos.length) {
      return repos[index - 1]; // Convert 1-based to 0-based
    }
    throw new Error(`Repository index ${index} not found (only ${repos.length} repos indexed)`);
  }

  // Check if it's a repo name (basename)
  const repos = await listIndexedRepos();
  if (repos.includes(repoIdentifier)) {
    return repoIdentifier;
  }

  // Treat as a full path
  return repoIdentifier;
}

export async function getDefaultRepo(): Promise<string | null> {
  try {
    const fs = await import('fs');
    const configPath = `${process.env.HOME}/.rag-qa/config.json`;
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as any;
    return config.defaultRepo || null;
  } catch {
    return null;
  }
}

export async function setDefaultRepo(repoPath: string): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configDir = `${process.env.HOME}/.rag-qa`;
    const configPath = `${configDir}/config.json`;

    fs.mkdirSync(configDir, { recursive: true });

    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    config.defaultRepo = repoPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Failed to set default repo: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function clearDefaultRepo(): Promise<void> {
  try {
    const fs = await import('fs');
    const configPath = `${process.env.HOME}/.rag-qa/config.json`;
    if (fs.existsSync(configPath)) {
      let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      delete config.defaultRepo;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
  } catch (err) {
    throw new Error(`Failed to clear default repo: ${err instanceof Error ? err.message : String(err)}`);
  }
}
