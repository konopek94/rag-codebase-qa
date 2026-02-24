import { useState } from 'react'
import { Turn } from '../hooks/useConversation'
import { ExportFormat, generateTranscript, downloadFile } from '../lib/exportTranscript'

export function ExportButton({ turns, repoPath }: { turns: Turn[]; repoPath: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (turns.length === 0) return null

  const handleExport = (format: ExportFormat) => {
    const { content, filename } = generateTranscript(format, repoPath, turns)
    downloadFile(content, filename)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-blue-600 underline hover:text-blue-800"
      >
        Export
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10">
          <button
            onClick={() => handleExport('markdown')}
            className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
          >
            Markdown (.md)
          </button>
          <button
            onClick={() => handleExport('json')}
            className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-t"
          >
            JSON (.json)
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-t"
          >
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  )
}
