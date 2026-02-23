import { useState } from 'react'
import { useIngest } from '../hooks/useIngest'

export function RepoIndexer({
  onIndexed,
  onSetRepo
}: {
  onIndexed: (path: string) => void
  onSetRepo: (path: string) => void
}) {
  const [repoPath, setRepoPath] = useState('')
  const [excludePatterns, setExcludePatterns] = useState('')
  const { ingest, status, result } = useIngest()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await ingest(repoPath, excludePatterns)
    onIndexed(repoPath)
    onSetRepo(repoPath)
  }

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h2 className="font-semibold mb-2">Index a Repository</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={repoPath}
            onChange={e => setRepoPath(e.target.value)}
            placeholder="/path/to/your/repo"
            className="flex-1 border rounded px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !repoPath}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {status === 'loading' ? 'Indexing...' : 'Index'}
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700">Extra excludes (optional)</summary>
          <textarea
            value={excludePatterns}
            onChange={e => setExcludePatterns(e.target.value)}
            placeholder={'docs/**\n*.snap\ntest-fixtures/'}
            rows={4}
            className="mt-2 w-full border rounded px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-gray-500">.gitignore is honored automatically.</p>
        </details>
      </form>
      {status === 'done' && result && (
        <div className="mt-2 text-sm text-green-700">
          <p>Indexed {result.chunksIndexed} chunks.</p>
          {result.filesExcluded.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">{result.filesExcluded.length} files excluded</summary>
              <pre className="mt-1 max-h-48 overflow-auto text-xs bg-gray-50 p-2 rounded">
                {result.filesExcluded.join('\n')}
              </pre>
            </details>
          )}
          {result.filesSkipped.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">{result.filesSkipped.length} files skipped (couldn't chunk)</summary>
              <pre className="mt-1 max-h-48 overflow-auto text-xs bg-gray-50 p-2 rounded">
                {result.filesSkipped.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
