import { useState } from 'react'
import { useIngest } from '../hooks/useIngest'

export function RepoIndexer({ onIndexed }: { onIndexed: (path: string) => void }) {
  const [repoPath, setRepoPath] = useState('')
  const { ingest, status, result } = useIngest()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await ingest(repoPath)
    onIndexed(repoPath)
  }

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h2 className="font-semibold mb-2">Index a Repository</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
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
      </form>
      {status === 'done' && result && (
        <p className="mt-2 text-sm text-green-700">
          Indexed {result.chunksIndexed} chunks.
          {result.filesSkipped.length > 0 && ` Skipped ${result.filesSkipped.length} files.`}
        </p>
      )}
    </div>
  )
}
