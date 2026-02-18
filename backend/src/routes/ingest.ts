import { Hono } from "hono";
import fs from "node:fs";
import path from "node:path";
import { collectFiles } from "../lib/fileWalker.js";
import { chunkFile, type Chunk } from "../lib/chunker.js";
import { ingestChunks, dropCollection } from "../lib/pyClient.js";
import { buildIgnoreMatcher } from "../lib/ignoreMatcher.js";

export const ingestRouter = new Hono();

ingestRouter.post("/", async (c) => {
  const { repoPath, excludePatterns } = await c.req.json<{
    repoPath: string;
    excludePatterns?: string;
  }>();

  if (!repoPath) return c.json({ error: "repoPath is required" }, 400);

  const gitignorePath = path.join(repoPath, ".gitignore");
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";
  const matcher = buildIgnoreMatcher(gitignoreContent, excludePatterns ?? "");

  const { included, excluded } = collectFiles(repoPath, matcher);

  const relExcluded = excluded.map((f) => path.relative(repoPath, f));

  const allChunks: Chunk[] = [];
  const skipped: string[] = [];
  for (const file of included) {
    try {
      const chunks = chunkFile(file, repoPath);
      if (chunks.length === 0) {
        skipped.push(path.relative(repoPath, file));
      } else {
        allChunks.push(...chunks);
      }
    } catch (err) {
      console.warn(`Failed to chunk ${file}:`, err);
      skipped.push(path.relative(repoPath, file));
    }
  }

  const collection = path.basename(repoPath);

  try {
    await dropCollection(collection);
  } catch {
    return c.json({ error: "Embedding service unavailable", stage: "drop" }, 503);
  }

  const batchSize = 32;
  let totalIndexed = 0;

  try {
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const result = await ingestChunks(collection, batch);
      totalIndexed += result.indexed;
    }
  } catch {
    return c.json({ error: "Embedding service unavailable", stage: "embed" }, 503);
  }

  return c.json({
    chunksIndexed: totalIndexed,
    filesExcluded: relExcluded,
    filesSkipped: skipped,
  });
});
