import fs from "node:fs";
import path from "node:path";
import type { Ignore } from "ignore";

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".cache",
]);
const EXCLUDE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
]);

export function shouldExcludePath(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  if (filePath.includes(".min.")) return true;
  const ext = path.extname(filePath);
  if (EXCLUDE_EXTENSIONS.has(ext)) return true;
  return false;
}

export type WalkResult = {
  included: string[];
  excluded: string[];
};

export function collectFiles(repoPath: string, ignoreMatcher?: Ignore): WalkResult {
  const included: string[] = [];
  const excluded: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(repoPath, fullPath);

      if (shouldExcludePath(fullPath)) {
        excluded.push(fullPath);
        continue;
      }
      if (ignoreMatcher && relPath.length > 0 && ignoreMatcher.ignores(relPath)) {
        excluded.push(fullPath);
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        included.push(fullPath);
      }
    }
  }

  walk(repoPath);
  return { included, excluded };
}
