import { useState } from 'react'
import type { Source } from '../hooks/useConversation'

export function SourceCitation({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-600 underline"
      >
        {open ? 'Hide' : 'Show'} {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {sources.map((s, i) => (
            <li key={i} className="text-xs font-mono text-gray-600">
              {s.file}:{s.startLine}-{s.endLine}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
