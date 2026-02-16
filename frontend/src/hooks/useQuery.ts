import { useState } from 'react'

export type Source = { file: string; startLine: number; endLine: number }

export function useQuery(repoPath: string) {
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(false)

  async function ask(question: string) {
    setAnswer('')
    setSources([])
    setLoading(true)

    const res = await fetch('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, repoPath }),
    })

    if (!res.ok) {
      const err = await res.json()
      setAnswer(`Error: ${err.error}`)
      setLoading(false)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

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
            if (parsed.sources) setSources(parsed.sources)
          } catch {
            setAnswer(prev => prev + data)
          }
        }
      }
    }

    setLoading(false)
  }

  return { ask, answer, sources, loading }
}
