import fs from 'fs';
import path from 'path';

export type ExportFormat = 'json' | 'markdown' | 'csv';

interface Turn {
  question: string;
  answer: string;
  sources: Array<{ file: string; startLine: number; endLine: number }>;
}

function generateMarkdown(repoPath: string, turns: Turn[]): string {
  const repoName = path.basename(repoPath);

  let md = `# ${repoName} - Q&A Transcript\n\n`;
  md += `**Repository:** \`${repoPath}\`\n`;
  md += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;

  turns.forEach((turn, i) => {
    md += `## Turn ${i + 1}\n\n`;
    md += `**Q:** ${turn.question}\n\n`;
    md += `**A:** ${turn.answer}\n\n`;
    if (turn.sources.length > 0) {
      md += `**Sources:**\n`;
      turn.sources.forEach(src => {
        md += `- \`${src.file}:${src.startLine}-${src.endLine}\`\n`;
      });
      md += '\n';
    }
    md += '---\n\n';
  });

  return md;
}

function generateJSON(repoPath: string, turns: Turn[]): string {
  const data = {
    repoPath,
    exportedAt: new Date().toISOString(),
    turnCount: turns.length,
    turns,
  };
  return JSON.stringify(data, null, 2);
}

function generateCSV(turns: Turn[]): string {
  const headers = ['Turn', 'Question', 'Answer', 'Sources'];
  const rows = turns.map((turn, i) => [
    i + 1,
    `"${turn.question.replace(/"/g, '""')}"`,
    `"${turn.answer.replace(/"/g, '""')}"`,
    `"${turn.sources.map(s => `${s.file}:${s.startLine}-${s.endLine}`).join('; ')}"`,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export function generateTranscript(
  format: ExportFormat,
  repoPath: string,
  turns: Turn[]
): { content: string; filename: string } {
  const timestamp = new Date().toISOString().split('T')[0];
  const repoName = path.basename(repoPath);

  let content: string;
  let filename: string;

  switch (format) {
    case 'markdown':
      content = generateMarkdown(repoPath, turns);
      filename = `${repoName}-transcript-${timestamp}.md`;
      break;
    case 'json':
      content = generateJSON(repoPath, turns);
      filename = `${repoName}-transcript-${timestamp}.json`;
      break;
    case 'csv':
      content = generateCSV(turns);
      filename = `${repoName}-transcript-${timestamp}.csv`;
      break;
  }

  return { content, filename };
}

export function saveTranscript(content: string, filename: string, outputDir?: string): string {
  const dir = outputDir || process.cwd();
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}
