import { useState, useEffect, useCallback } from 'react'

export type Source = { file: string; startLine: number; endLine: number }
export type Turn = { question: string; answer: string; sources: Source[] }

export function useConversation(repoPath: string) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLimit, setHistoryLimit] = useState(10)

  // On repoPath change, load any persisted history for that repo.
  useEffect(() => {
    if (!repoPath) {
      setTurns([])
      return
    }
    fetch(`/history?repoPath=${encodeURIComponent(repoPath)}`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: Turn[]) => setTurns(data))
      .catch(() => setTurns([]))
  }, [repoPath])

  const ask = useCallback(
    async (question: string) => {
      setLoading(true)

      const res = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, repoPath, historyLimit }),
      })

      if (!res.ok) {
        const err = await res.json()
        setTurns(prev => [...prev, { question, answer: `Error: ${err.error}`, sources: [] }])
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      let sources: Source[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(Boolean)

        for (const line of lines) {
          if (line.startsWith('event: sources')) continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.sources) sources = parsed.sources
            } catch {
              answer += data
            }
          }
        }
      }

      setTurns(prev => [...prev, { question, answer, sources }])
      setLoading(false)
    },
    [repoPath, historyLimit]
  )

  const clearHistory = useCallback(async () => {
    await fetch(`/history?repoPath=${encodeURIComponent(repoPath)}`, { method: 'DELETE' })
    setTurns([])
  }, [repoPath])

  return { turns, loading, ask, clearHistory, historyLimit, setHistoryLimit }
}
