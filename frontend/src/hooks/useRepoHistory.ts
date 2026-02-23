import { useState, useEffect } from 'react'

export type RepoHistoryItem = { path: string; timestamp: number }

const STORAGE_KEY = 'rag-qa-repo-history'
const MAX_HISTORY = 10

export function useRepoHistory() {
  const [history, setHistory] = useState<RepoHistoryItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch {
      // Silently ignore localStorage errors
    }
  }, [])

  const addRepo = (path: string) => {
    setHistory(prev => {
      // Remove duplicates, keeping most recent
      const filtered = prev.filter(item => item.path !== path)
      // Add new entry at the beginning
      const updated = [{ path, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY)
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // Silently ignore localStorage errors
      }
      return updated
    })
  }

  const removeRepo = (path: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.path !== path)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // Silently ignore localStorage errors
      }
      return updated
    })
  }

  return { history, addRepo, removeRepo }
}
