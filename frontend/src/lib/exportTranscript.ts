import { Turn } from '../hooks/useConversation'

export type ExportFormat = 'json' | 'markdown' | 'csv'

function generateMarkdown(repoPath: string, turns: Turn[]): string {
  const repoName = repoPath.split('/').pop() || 'codebase'

  let md = `# ${repoName} - Q&A Transcript\n\n`
  md += `**Repository:** \`${repoPath}\`\n`
  md += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`

  turns.forEach((turn, i) => {
    md += `## Turn ${i + 1}\n\n`
    md += `**Q:** ${turn.question}\n\n`
    md += `**A:** ${turn.answer}\n\n`
    if (turn.sources.length > 0) {
      md += `**Sources:**\n`
      turn.sources.forEach(src => {
        md += `- \`${src.file}:${src.startLine}-${src.endLine}\`\n`
      })
      md += '\n'
    }
    md += '---\n\n'
  })

  return md
}

function generateJSON(repoPath: string, turns: Turn[]): string {
  const data = {
    repoPath,
    exportedAt: new Date().toISOString(),
    turnCount: turns.length,
    turns,
  }
  return JSON.stringify(data, null, 2)
}

function generateCSV(turns: Turn[]): string {
  const headers = ['Turn', 'Question', 'Answer', 'Sources']
  const rows = turns.map((turn, i) => [
    i + 1,
    `"${turn.question.replace(/"/g, '""')}"`,
    `"${turn.answer.replace(/"/g, '""')}"`,
    `"${turn.sources.map(s => `${s.file}:${s.startLine}-${s.endLine}`).join('; ')}"`,
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

export function generateTranscript(
  format: ExportFormat,
  repoPath: string,
  turns: Turn[]
): { content: string; filename: string } {
  const timestamp = new Date().toISOString().split('T')[0]
  const repoName = repoPath.split('/').pop() || 'codebase'

  let content: string
  let filename: string

  switch (format) {
    case 'markdown':
      content = generateMarkdown(repoPath, turns)
      filename = `${repoName}-transcript-${timestamp}.md`
      break
    case 'json':
      content = generateJSON(repoPath, turns)
      filename = `${repoName}-transcript-${timestamp}.json`
      break
    case 'csv':
      content = generateCSV(turns)
      filename = `${repoName}-transcript-${timestamp}.csv`
      break
  }

  return { content, filename }
}

export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
