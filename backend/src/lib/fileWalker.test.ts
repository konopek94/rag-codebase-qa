import { describe, it, expect } from "vitest";
import { shouldExcludePath } from "./fileWalker.js";

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
  it("allows files in nested src", () => {
    expect(shouldExcludePath("/repo/src/components/Button.tsx")).toBe(false);
  });
});
