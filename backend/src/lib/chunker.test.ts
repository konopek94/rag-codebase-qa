import { describe, it, expect } from "vitest";
import { chunkByLines, detectLanguage } from "./chunker.js";

describe("detectLanguage", () => {
  it("detects typescript", () => expect(detectLanguage("utils.ts")).toBe("typescript"));
  it("detects javascript", () => expect(detectLanguage("app.js")).toBe("javascript"));
  it("detects python", () => expect(detectLanguage("main.py")).toBe("python"));
  it("returns text for unknown", () => expect(detectLanguage("notes.md")).toBe("text"));
});

describe("chunkByLines", () => {
  it("returns single chunk for short file", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i}`);
    const chunks = chunkByLines(lines, "test.py", 50, 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(30);
  });

  it("splits long file into overlapping chunks", () => {
    const lines = Array.from({ length: 120 }, (_, i) => `line ${i}`);
    const chunks = chunkByLines(lines, "test.py", 50, 10);
    expect(chunks.length).toBeGreaterThan(1);
    // overlap: second chunk starts before first chunk ends
    expect(chunks[1].startLine).toBeLessThan(chunks[0].endLine);
  });

  it("each chunk has text, file, startLine, endLine, language", () => {
    const lines = ["const x = 1", "const y = 2"];
    const chunks = chunkByLines(lines, "src/utils.ts", 50, 10);
    expect(chunks[0]).toMatchObject({
      file: "src/utils.ts",
      startLine: 1,
      endLine: 2,
      language: "typescript",
    });
    expect(typeof chunks[0].text).toBe("string");
  });
});
