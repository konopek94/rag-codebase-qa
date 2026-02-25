import { Hono } from "hono";
import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import path from "node:path";
import { queryChunks } from "../lib/pyClient.js";
import { getLLM } from "../lib/llm.js";
import { readHistory, appendTurn } from "../lib/historyStore.js";

export const queryRouter = new Hono();

const DEFAULT_HISTORY_LIMIT = 10;

queryRouter.post("/", async (c) => {
  const { question, repoPath, historyLimit } = await c.req.json<{
    question: string;
    repoPath: string;
    historyLimit?: number;
  }>();

  if (!question || !repoPath) return c.json({ error: "question and repoPath are required" }, 400);

  const limit = historyLimit ?? DEFAULT_HISTORY_LIMIT;

  const collection = path.basename(repoPath);
  const chunks = await queryChunks(collection, question);

  if (chunks.length === 0) {
    return c.json({ error: "No indexed content found. Index this repo first." }, 400);
  }

  const context = chunks
    .map((ch) => `[${ch.metadata.file}:${ch.metadata.startLine}]\n${ch.text}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a codebase assistant. Answer questions using only the provided code context.
When referencing code, cite the source using the format [file:line] that appears before each snippet.
If the answer isn't in the context, say so — do not guess.
Format responses as plain text. Do not use markdown headings (###, ##, #), horizontal rules (---), or bold/italic markers (**, *, __).`;

  const priorTurns = readHistory(repoPath).slice(-limit);
  const sources = chunks.map((ch) => ({
    file: ch.metadata.file,
    startLine: ch.metadata.startLine,
    endLine: ch.metadata.endLine,
  }));

  return streamSSE(c, async (stream) => {
    const result = streamText({
      model: getLLM(),
      system: systemPrompt,
      messages: [
        ...priorTurns.flatMap((turn) => [
          { role: "user" as const, content: turn.question },
          { role: "assistant" as const, content: turn.answer },
        ]),
        { role: "user" as const, content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
    });

    let answer = "";
    for await (const chunk of result.textStream) {
      answer += chunk;
      await stream.writeSSE({ data: chunk });
    }

    // Send citations after the text stream completes.
    await stream.writeSSE({ data: JSON.stringify({ sources }), event: "sources" });

    // Persist the completed turn so the next question can see it.
    appendTurn(repoPath, { question, answer, sources });
  });
});
