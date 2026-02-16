import { Hono } from 'hono'
import { streamText } from 'ai'
import { streamSSE } from 'hono/streaming'
import path from 'node:path'
import { queryChunks } from '../lib/pyClient.js'
import { getLLM } from '../lib/llm.js'

export const queryRouter = new Hono()

queryRouter.post('/', async (c) => {
  const { question, repoPath } = await c.req.json<{ question: string; repoPath: string }>()

  if (!question || !repoPath) return c.json({ error: 'question and repoPath are required' }, 400)

  const collection = path.basename(repoPath)
  const chunks = await queryChunks(collection, question)

  if (chunks.length === 0) {
    return c.json({ error: 'No indexed content found. Index this repo first.' }, 400)
  }

  const context = chunks
    .map(ch => `[${ch.metadata.file}:${ch.metadata.startLine}]\n${ch.text}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are a codebase assistant. Answer questions using only the provided code context.
When referencing code, cite the source using the format [file:line] that appears before each snippet.
If the answer isn't in the context, say so — do not guess.`

  return streamSSE(c, async (stream) => {
    const result = streamText({
      model: getLLM(),
      system: systemPrompt,
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }],
    })

    for await (const chunk of result.textStream) {
      await stream.writeSSE({ data: chunk })
    }

    // Send citations after stream completes
    const sources = chunks.map(ch => ({
      file: ch.metadata.file,
      startLine: ch.metadata.startLine,
      endLine: ch.metadata.endLine,
    }))
    await stream.writeSSE({ data: JSON.stringify({ sources }), event: 'sources' })
  })
})
