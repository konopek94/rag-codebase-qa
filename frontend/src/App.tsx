import { useState } from 'react'
import { RepoIndexer } from './components/RepoIndexer'
import { ChatInterface } from './components/ChatInterface'

export default function App() {
  const [repoPath, setRepoPath] = useState('')

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Codebase Q&A</h1>
      <RepoIndexer onIndexed={setRepoPath} />
      {repoPath && <ChatInterface repoPath={repoPath} />}
    </div>
  )
}
