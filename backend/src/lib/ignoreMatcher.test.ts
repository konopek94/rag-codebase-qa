import { describe, it, expect } from "vitest";
import { buildIgnoreMatcher } from "./ignoreMatcher.js";

describe("buildIgnoreMatcher", () => {
  it("returns a matcher that ignores nothing when both inputs are empty", () => {
    const m = buildIgnoreMatcher("", "");
    expect(m.ignores("src/index.ts")).toBe(false);
  });

  it("honors patterns from .gitignore content", () => {
    const m = buildIgnoreMatcher("*.log\nnode_modules/\n", "");
    expect(m.ignores("app.log")).toBe(true);
    expect(m.ignores("node_modules/lodash/index.js")).toBe(true);
    expect(m.ignores("src/index.ts")).toBe(false);
  });

  it("honors user patterns", () => {
    const m = buildIgnoreMatcher("", "docs/**\n*.snap\n");
    expect(m.ignores("docs/intro.md")).toBe(true);
    expect(m.ignores("snapshot.snap")).toBe(true);
    expect(m.ignores("src/index.ts")).toBe(false);
  });

  it("combines .gitignore and user patterns", () => {
    const m = buildIgnoreMatcher("*.log\n", "docs/**\n");
    expect(m.ignores("app.log")).toBe(true);
    expect(m.ignores("docs/intro.md")).toBe(true);
  });

  it("tolerates comments and blank lines in user patterns", () => {
    const m = buildIgnoreMatcher("", "# this is a comment\n\n*.tmp\n\n");
    expect(m.ignores("scratch.tmp")).toBe(true);
    expect(m.ignores("src/index.ts")).toBe(false);
  });

  it("supports negation in user patterns to un-ignore a file matched by a .gitignore pattern", () => {
    // Per gitignore semantics, negation only works for files matched by a *file* pattern.
    // A file inside a fully-excluded directory (e.g. "docs/") cannot be re-included;
    // the parent directory itself would need to be re-included first. We test the
    // supported case: a file pattern (*.log) re-included by a more specific file pattern.
    const m = buildIgnoreMatcher("*.log\n", "!important.log\n");
    expect(m.ignores("scratch.log")).toBe(true);
    expect(m.ignores("important.log")).toBe(false);
  });
});
