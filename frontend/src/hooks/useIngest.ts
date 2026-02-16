import { useState } from 'react'

export function useIngest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ chunksIndexed: number; filesSkipped: string[] } | null>(null)

  async function ingest(repoPath: string) {
    setStatus('loading')
    try {
      const res = await fetch('/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStatus('done')
    } catch (e) {
      setStatus('error')
    }
  }

  return { ingest, status, result }
}
