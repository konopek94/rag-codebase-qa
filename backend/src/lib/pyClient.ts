import type { Chunk } from './chunker.js'

const BASE_URL = process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8001'

export async function ingestChunks(collection: string, chunks: Chunk[]): Promise<{ indexed: number }> {
  const res = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, chunks }),
  })
  if (!res.ok) throw new Error(`Python service error: ${res.status}`)
  return res.json()
}

export type RetrievedChunk = {
  text: string
  metadata: { file: string; startLine: number; endLine: number; language: string }
}

export async function queryChunks(collection: string, question: string, topK = 5): Promise<RetrievedChunk[]> {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, question, top_k: topK }),
  })
  if (!res.ok) throw new Error(`Python service error: ${res.status}`)
  const data = await res.json()
  return data.chunks
}
