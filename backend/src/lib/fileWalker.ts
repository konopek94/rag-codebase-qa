import fs from 'node:fs'
import path from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache'])
const SKIP_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz'])

export function shouldSkipPath(filePath: string): boolean {
  const parts = filePath.split(path.sep)
  if (parts.some(p => SKIP_DIRS.has(p))) return true
  if (filePath.includes('.min.')) return true
  const ext = path.extname(filePath)
  if (SKIP_EXTENSIONS.has(ext)) return true
  return false
}

export function collectFiles(repoPath: string): string[] {
  const files: string[] = []

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (shouldSkipPath(fullPath)) continue
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  }

  walk(repoPath)
  return files
}
