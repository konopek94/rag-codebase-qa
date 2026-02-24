#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ingestRepo, askQuestion, getHistory, clearHistory, listIndexedRepos } from './api.js';
import { generateTranscript, saveTranscript, ExportFormat } from './export.js';
import fs from 'fs';

const program = new Command();

program.name('rag-qa').description('Query your codebase with AI').version('1.0.0');

program
  .command('index <repoPath>')
  .description('Index a repository for querying')
  .option('--exclude <patterns>', 'Extra exclude patterns (one per line)')
  .action(async (repoPath, options) => {
    try {
      console.log(chalk.blue(`Indexing ${repoPath}...`));
      const result = await ingestRepo(repoPath, options.exclude);
      console.log(chalk.green(`✓ Indexed ${result.chunksIndexed} chunks`));
      if (result.filesExcluded.length > 0) {
        console.log(chalk.gray(`  ${result.filesExcluded.length} files excluded`));
      }
      if (result.filesSkipped.length > 0) {
        console.log(chalk.gray(`  ${result.filesSkipped.length} files skipped`));
      }
    } catch (err) {
      console.error(chalk.red(`✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all indexed repositories')
  .action(async () => {
    try {
      const repos = await listIndexedRepos();
      if (repos.length === 0) {
        console.log(chalk.gray('No indexed repositories found'));
        return;
      }
      console.log(chalk.blue(`${repos.length} indexed repositor${repos.length === 1 ? 'y' : 'ies'}:\n`));
      repos.forEach((repo, i) => {
        console.log(chalk.cyan(`  ${i + 1}. ${repo}`));
      });
    } catch (err) {
      console.error(chalk.red(`✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('ask <question>')
  .description('Ask a question about the indexed repo')
  .requiredOption('--repo <path>', 'Path to the indexed repository')
  .option('--history <depth>', 'How many prior turns to include (default: 10)', '10')
  .action(async (question, options) => {
    try {
      const historyDepth = parseInt(options.history, 10);
      if (isNaN(historyDepth) || historyDepth < 0) {
        throw new Error('--history must be a non-negative number');
      }
      console.log(chalk.blue(`Q: ${question}\n`));
      console.log(chalk.dim('A: '));
      await askQuestion(question, options.repo, historyDepth);
      console.log('\n');
    } catch (err) {
      console.error(chalk.red(`\n✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('history <repoPath>')
  .description('Show conversation history for a repo')
  .action(async (repoPath) => {
    try {
      const turns = await getHistory(repoPath);
      if (turns.length === 0) {
        console.log(chalk.gray('No conversation history'));
        return;
      }
      console.log(chalk.blue(`${turns.length} turns:\n`));
      turns.forEach((turn: any, i: number) => {
        console.log(chalk.cyan(`Turn ${i + 1}:`));
        console.log(`  Q: ${turn.question}`);
        console.log(`  A: ${turn.answer.substring(0, 100)}${turn.answer.length > 100 ? '...' : ''}`);
        if (turn.sources.length > 0) {
          console.log(`  Sources: ${turn.sources.map((s: any) => `${s.file}:${s.startLine}`).join(', ')}`);
        }
        console.log();
      });
    } catch (err) {
      console.error(chalk.red(`✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('export <repoPath>')
  .description('Export conversation history as a file')
  .option('--format <type>', 'Export format: markdown, json, csv (default: markdown)', 'markdown')
  .option('--output <dir>', 'Output directory (default: current directory)')
  .action(async (repoPath, options) => {
    try {
      const format = options.format as ExportFormat;
      if (!['markdown', 'json', 'csv'].includes(format)) {
        throw new Error('--format must be markdown, json, or csv');
      }

      const turns = await getHistory(repoPath);
      if (turns.length === 0) {
        console.log(chalk.yellow('No conversation history to export'));
        return;
      }

      const { content, filename } = generateTranscript(format, repoPath, turns);
      const filepath = saveTranscript(content, filename, options.output);

      console.log(chalk.green(`✓ Exported to ${filepath}`));
    } catch (err) {
      console.error(chalk.red(`✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program
  .command('clear <repoPath>')
  .description('Clear conversation history for a repo')
  .action(async (repoPath) => {
    try {
      await clearHistory(repoPath);
      console.log(chalk.green('✓ Conversation history cleared'));
    } catch (err) {
      console.error(chalk.red(`✗ Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

program.parse();
