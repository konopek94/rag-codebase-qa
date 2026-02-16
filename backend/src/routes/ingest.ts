import { Hono } from 'hono'
import path from 'node:path'
import { collectFiles } from '../lib/fileWalker.js'
import { chunkFile, type Chunk } from '../lib/chunker.js'
import { ingestChunks } from '../lib/pyClient.js'

export const ingestRouter = new Hono()

ingestRouter.post('/', async (c) => {
  const { repoPath } = await c.req.json<{ repoPath: string }>()

  if (!repoPath) return c.json({ error: 'repoPath is required' }, 400)

  const files = collectFiles(repoPath)
  const allChunks: Chunk[] = []
  const skipped: string[] = []
  for (const file of files) {
    const chunks = chunkFile(file, repoPath)
    if (chunks.length === 0) {
      skipped.push(file.replace(repoPath + path.sep, ''))
    } else {
      allChunks.push(...chunks)
    }
  }

  const batchSize = 32
  let totalIndexed = 0
  const collection = path.basename(repoPath)

  try {
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize)
      const result = await ingestChunks(collection, batch)
      totalIndexed += result.indexed
    }
  } catch (err) {
    return c.json({ error: 'Embedding service unavailable' }, 503)
  }

  return c.json({ chunksIndexed: totalIndexed, filesSkipped: skipped })
})
