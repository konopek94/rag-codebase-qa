# RAG Codebase Q&A CLI

Terminal interface for querying indexed codebases without a browser.

## Installation

```bash
npm install -g @rag-qa/cli
# Or use locally from the repo
cd cli
npm run dev
```

## Quick Start

Make sure the backend is running on `http://localhost:3001` (default).

```bash
# List all indexed repositories
rag-qa list

# Index a repository
rag-qa index /path/to/your/repo

# Set default repo (optional, for faster queries)
rag-qa set-default /path/to/your/repo

# Ask a question (uses default repo if set, or --repo flag)
rag-qa ask "how does auth work?"
rag-qa ask "where is it?" --repo /path/to/repo  # Override default

# View conversation history
rag-qa history /path/to/your/repo

# Export transcript
rag-qa export /path/to/your/repo --format markdown

# Clear history
rag-qa clear /path/to/your/repo

# Clear default repo setting
rag-qa clear-default
```

## Commands

### `list`

List all indexed repositories (based on conversation history files).

```bash
rag-qa list
```

Shows repos with a count of indexed conversations.

### `set-default <repoPath>`

Set a default repository for `ask` queries. This saves the path to `~/.rag-qa/config.json`.

```bash
rag-qa set-default /path/to/repo
```

After setting a default, you can use `rag-qa ask` without the `--repo` flag:
```bash
rag-qa ask "how does auth work?"  # Uses default repo
rag-qa ask "where?" --repo /other/repo  # Override default
```

### `clear-default`

Clear the default repository setting.

```bash
rag-qa clear-default
```

### `index <repoPath>`

Index a repository for querying.

```bash
rag-qa index /path/to/repo
rag-qa index /path/to/repo --exclude "docs/**\n*.snap"
```

**Options:**
- `--exclude <patterns>` — Extra exclude patterns (one per line)

### `ask <question>`

Ask a question about an indexed repository.

```bash
rag-qa ask "what does the auth system do?"  # Uses default repo
rag-qa ask "what does the auth system do?" --repo /path/to/repo  # Explicit repo
rag-qa ask "where is it defined?" --history 5
```

**Options:**
- `--repo <path>` — Path to the indexed repository. If not specified, uses the default repo set with `set-default`. Required if no default is set.
- `--history <depth>` — How many prior turns to include (default: 10)

### `history <repoPath>`

Show conversation history for a repository.

```bash
rag-qa history /path/to/repo
```

### `export <repoPath>`

Export conversation history as a file (markdown, JSON, or CSV).

```bash
rag-qa export /path/to/repo
rag-qa export /path/to/repo --format json
rag-qa export /path/to/repo --format csv --output ~/exports
```

**Options:**
- `--format <type>` — Export format: `markdown`, `json`, `csv` (default: `markdown`)
- `--output <dir>` — Output directory (default: current directory)

### `clear <repoPath>`

Clear conversation history for a repository.

```bash
rag-qa clear /path/to/repo
```

## Configuration

Set `RAG_QA_BACKEND` environment variable to point to a non-default backend:

```bash
export RAG_QA_BACKEND=http://my-backend:3001
rag-qa ask "question" --repo /path/to/repo
```

## Multi-turn Conversations

Questions asked via CLI are automatically saved to `~/.rag-qa/history/<collection>.json` (where collection is the repo's directory basename).

Use `--history <depth>` to include previous turns in the LLM context:

```bash
rag-qa ask "what does auth do?" --repo /path/to/repo
rag-qa ask "where is it defined?" --repo /path/to/repo --history 5
```

The second question will see the first question and answer in the LLM's context.

## Examples

**Typical workflow:**

```bash
# Index a new repo
rag-qa index ~/projects/my-app

# Ask questions about it
rag-qa ask "what's the entry point?" --repo ~/projects/my-app
rag-qa ask "how does the database layer work?" --repo ~/projects/my-app --history 5

# Save the conversation
rag-qa export ~/projects/my-app --format markdown --output ~/docs
```

**Batch querying multiple repos:**

```bash
for repo in ~/projects/*/; do
  echo "Indexing $repo"
  rag-qa index "$repo"
done

rag-qa ask "what patterns are used?" --repo ~/projects/api
rag-qa ask "what patterns are used?" --repo ~/projects/web
```

**Export all conversations:**

```bash
mkdir -p ~/transcripts
for repo in ~/.rag-qa/history/*.json; do
  repo_name=$(basename "$repo" .json)
  rag-qa export "/path/matching/$repo_name" --format markdown --output ~/transcripts
done
```
