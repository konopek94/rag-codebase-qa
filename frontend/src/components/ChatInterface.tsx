import { useState } from 'react'
import { useQuery } from '../hooks/useQuery'
import { SourceCitation } from './SourceCitation'

export function ChatInterface({ repoPath }: { repoPath: string }) {
  const [question, setQuestion] = useState('')
  const { ask, answer, sources, loading } = useQuery(repoPath)

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    await ask(question)
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="font-semibold mb-2">Ask a Question</h2>
      <form onSubmit={handleAsk} className="flex gap-2 mb-4">
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
      {answer && (
        <div>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{answer}</pre>
          <SourceCitation sources={sources} />
        </div>
      )}
    </div>
  )
}
