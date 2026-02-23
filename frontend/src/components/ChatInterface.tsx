import { useState } from 'react'
import { useConversation } from '../hooks/useConversation'
import { SourceCitation } from './SourceCitation'

function formatAnswer(text: string) {
  // First, clean up markdown syntax
  let cleaned = text
    .replace(/^#+\s+/gm, '') // Remove heading syntax (###, ##, #)
    .replace(/^---+$/gm, '') // Remove horizontal rules (---)
    .replace(/\n\n+/g, '\n') // Collapse multiple blank lines

  // Then split by bold markers and render
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export function ChatInterface({ repoPath }: { repoPath: string }) {
  const [question, setQuestion] = useState('')
  const { turns, loading, ask, clearHistory, historyLimit, setHistoryLimit } =
    useConversation(repoPath)

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')
    await ask(q)
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="font-semibold mb-2">Ask a Question</h2>

      <div className="max-h-96 overflow-auto mb-4 space-y-4">
        {turns.length === 0 && (
          <p className="text-sm text-gray-400">No questions yet. Ask one below.</p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white text-sm rounded-lg px-3 py-2 max-w-[80%]">
                {turn.question}
              </div>
            </div>
            <div>
              <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                {formatAnswer(turn.answer)}
              </div>
              <SourceCitation sources={turn.sources} />
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-gray-400">Thinking...</p>}
      </div>

      <div className="flex items-center justify-between mb-2 text-sm">
        <label className="flex items-center gap-2">
          History depth
          <input
            type="number"
            min={0}
            value={historyLimit}
            onChange={e => setHistoryLimit(Number(e.target.value))}
            className="w-16 border rounded px-2 py-1"
          />
        </label>
        <button
          onClick={clearHistory}
          className="text-xs text-red-600 underline disabled:opacity-50"
          disabled={turns.length === 0}
        >
          Clear
        </button>
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="How does authentication work?"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !repoPath}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
