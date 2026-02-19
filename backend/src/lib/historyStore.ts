import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Source = { file: string; startLine: number; endLine: number };
export type Turn = { question: string; answer: string; sources: Source[] };

// `baseDir` is injectable so tests can point the store at a temp directory.
// Production callers omit it and get the real ~/.rag-qa.
function historyDir(baseDir: string = os.homedir()): string {
  return path.join(baseDir, ".rag-qa", "history");
}

function historyFile(repoPath: string, baseDir?: string): string {
  const collection = path.basename(repoPath);
  return path.join(historyDir(baseDir), `${collection}.json`);
}

export function readHistory(repoPath: string, baseDir?: string): Turn[] {
  const file = historyFile(repoPath, baseDir);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Turn[];
}

export function appendTurn(repoPath: string, turn: Turn, baseDir?: string): void {
  const file = historyFile(repoPath, baseDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const history = readHistory(repoPath, baseDir);
  history.push(turn);
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

export function clearHistory(repoPath: string, baseDir?: string): void {
  const file = historyFile(repoPath, baseDir);
  fs.rmSync(file, { force: true });
}
