import { useState } from 'react'
import { RepoIndexer } from './components/RepoIndexer'
import { RepoHistory } from './components/RepoHistory'
import { ChatInterface } from './components/ChatInterface'
import { useRepoHistory } from './hooks/useRepoHistory'

export default function App() {
  const [repoPath, setRepoPath] = useState('')
  const { history, addRepo, removeRepo } = useRepoHistory()

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Codebase Q&A</h1>
      <RepoIndexer onIndexed={setRepoPath} onSetRepo={addRepo} />
      <RepoHistory history={history} onSelect={setRepoPath} onRemove={removeRepo} />
      {repoPath && <ChatInterface repoPath={repoPath} />}
    </div>
  )
}
