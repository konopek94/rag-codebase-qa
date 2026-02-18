import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shouldExcludePath, collectFiles } from "./fileWalker.js";
import { buildIgnoreMatcher } from "./ignoreMatcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../../test-fixtures/sample-repo");

describe("shouldExcludePath", () => {
  it("excludes node_modules", () => {
    expect(shouldExcludePath("/repo/node_modules/lodash/index.js")).toBe(true);
  });
  it("excludes .git directory", () => {
    expect(shouldExcludePath("/repo/.git/HEAD")).toBe(true);
  });
  it("excludes dist and build", () => {
    expect(shouldExcludePath("/repo/dist/index.js")).toBe(true);
    expect(shouldExcludePath("/repo/build/app.js")).toBe(true);
  });
  it("excludes minified files", () => {
    expect(shouldExcludePath("/repo/src/app.min.js")).toBe(true);
  });
  it("allows normal source files", () => {
    expect(shouldExcludePath("/repo/src/utils.ts")).toBe(false);
  });
});

describe("collectFiles", () => {
  it("returns walker result with included + excluded lists", () => {
    const result = collectFiles(FIXTURE);
    expect(result).toHaveProperty("included");
    expect(result).toHaveProperty("excluded");
  });

  it("hardcoded skips apply when no matcher passed (back-compat)", () => {
    const { included, excluded } = collectFiles(FIXTURE);
    // node_modules content is excluded by hardcoded SKIP_DIRS
    expect(included.some((f) => f.includes("node_modules"))).toBe(false);
    expect(excluded.some((f) => f.includes("node_modules"))).toBe(true);
    // Non-hardcoded files are included (no matcher passed)
    expect(included.some((f) => f.endsWith("src/index.ts"))).toBe(true);
    expect(included.some((f) => f.endsWith("app.log"))).toBe(true);
  });

  it("excludes .gitignore'd files when matcher is passed", () => {
    const matcher = buildIgnoreMatcher("*.log\nsecret.txt\n", "");
    const { included, excluded } = collectFiles(FIXTURE, matcher);
    expect(included.some((f) => f.endsWith("app.log"))).toBe(false);
    expect(included.some((f) => f.endsWith("secret.txt"))).toBe(false);
    expect(excluded.some((f) => f.endsWith("app.log"))).toBe(true);
    expect(excluded.some((f) => f.endsWith("secret.txt"))).toBe(true);
    expect(included.some((f) => f.endsWith("src/index.ts"))).toBe(true);
  });

  it("excludes paths matching user patterns", () => {
    const matcher = buildIgnoreMatcher("", "docs/**\n");
    const { included, excluded } = collectFiles(FIXTURE, matcher);
    expect(included.some((f) => f.endsWith("docs/intro.md"))).toBe(false);
    expect(excluded.some((f) => f.endsWith("docs/intro.md"))).toBe(true);
  });

  it("combines .gitignore and user patterns", () => {
    const matcher = buildIgnoreMatcher("*.log\n", "docs/**\n");
    const { included } = collectFiles(FIXTURE, matcher);
    expect(included.some((f) => f.endsWith("app.log"))).toBe(false);
    expect(included.some((f) => f.endsWith("docs/intro.md"))).toBe(false);
    expect(included.some((f) => f.endsWith("src/index.ts"))).toBe(true);
  });

  it("returns paths in 'excluded' as absolute filesystem paths", () => {
    const { excluded } = collectFiles(FIXTURE);
    // node_modules path is excluded — it should be absolute
    const nm = excluded.find((f) => f.includes("node_modules"));
    expect(nm).toBeDefined();
    expect(path.isAbsolute(nm!)).toBe(true);
  });
});
