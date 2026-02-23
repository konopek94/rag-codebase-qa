import { RepoHistoryItem } from '../hooks/useRepoHistory'

export function RepoHistory({
  history,
  onSelect,
  onRemove,
}: {
  history: RepoHistoryItem[]
  onSelect: (path: string) => void
  onRemove: (path: string) => void
}) {
  if (history.length === 0) return null

  return (
    <div className="p-4 border rounded-lg mb-4 bg-gray-50">
      <h2 className="font-semibold mb-2 text-sm">Recent Repositories</h2>
      <div className="space-y-2">
        {history.map(item => (
          <div key={item.path} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
            <button
              onClick={() => onSelect(item.path)}
              className="flex-1 text-left text-blue-600 hover:underline font-mono truncate"
            >
              {item.path}
            </button>
            <button
              onClick={() => onRemove(item.path)}
              className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
