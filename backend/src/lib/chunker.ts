import path from "node:path";
import fs from "node:fs";

export type Chunk = {
  text: string;
  file: string;
  startLine: number;
  endLine: number;
  language: string;
};

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".md": "text",
  ".txt": "text",
  ".json": "json",
  ".css": "css",
  ".html": "html",
};

export function detectLanguage(filePath: string): string {
  return LANGUAGE_MAP[path.extname(filePath)] ?? "text";
}

export function chunkByLines(
  lines: string[],
  filePath: string,
  windowSize: number,
  overlap: number
): Chunk[] {
  const language = detectLanguage(filePath);
  const chunks: Chunk[] = [];
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + windowSize, lines.length);
    chunks.push({
      text: lines.slice(start, end).join("\n"),
      file: filePath,
      startLine: start + 1,
      endLine: end,
      language,
    });
    if (end === lines.length) break;
    start += windowSize - overlap;
  }

  return chunks;
}

export function chunkFile(filePath: string, repoRoot: string): Chunk[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relativePath = filePath.replace(repoRoot + path.sep, "");

  // Skip very large files
  if (lines.length > 2000) {
    console.warn(`Skipping large file: ${relativePath} (${lines.length} lines)`);
    return [];
  }

  return chunkByLines(lines, relativePath, 50, 10);
}
