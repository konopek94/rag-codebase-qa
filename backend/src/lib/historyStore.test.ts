import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readHistory, appendTurn, clearHistory } from "./historyStore.js";

let baseDir: string;

beforeEach(() => {
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "rag-history-test-"));
});

afterEach(() => {
  fs.rmSync(baseDir, { recursive: true, force: true });
});

const sampleTurn = {
  question: "What is x?",
  answer: "x is 1.",
  sources: [{ file: "src/index.ts", startLine: 1, endLine: 1 }],
};

describe("historyStore", () => {
  it("readHistory returns [] when no history file exists", () => {
    expect(readHistory("/some/repo/myproj", baseDir)).toEqual([]);
  });

  it("appendTurn creates the history file and directory on first write", () => {
    appendTurn("/some/repo/myproj", sampleTurn, baseDir);
    const filePath = path.join(baseDir, ".rag-qa", "history", "myproj.json");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("readHistory returns turns previously appended", () => {
    appendTurn("/some/repo/myproj", sampleTurn, baseDir);
    const history = readHistory("/some/repo/myproj", baseDir);
    expect(history).toEqual([sampleTurn]);
  });

  it("appendTurn appends to existing history in order", () => {
    const second = { question: "What is y?", answer: "y is 2.", sources: [] };
    appendTurn("/some/repo/myproj", sampleTurn, baseDir);
    appendTurn("/some/repo/myproj", second, baseDir);
    const history = readHistory("/some/repo/myproj", baseDir);
    expect(history).toEqual([sampleTurn, second]);
  });

  it("keys history by repo directory basename, not full path", () => {
    appendTurn("/work/myproj", sampleTurn, baseDir);
    // A different full path with the same basename reads the SAME history.
    expect(readHistory("/play/myproj", baseDir)).toEqual([sampleTurn]);
  });

  it("clearHistory removes the history file", () => {
    appendTurn("/some/repo/myproj", sampleTurn, baseDir);
    clearHistory("/some/repo/myproj", baseDir);
    const filePath = path.join(baseDir, ".rag-qa", "history", "myproj.json");
    expect(fs.existsSync(filePath)).toBe(false);
    expect(readHistory("/some/repo/myproj", baseDir)).toEqual([]);
  });

  it("clearHistory is a no-op when no history file exists", () => {
    expect(() => clearHistory("/some/repo/myproj", baseDir)).not.toThrow();
  });
});
