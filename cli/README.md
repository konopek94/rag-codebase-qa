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
# List all indexed repositories with indices
rag-qa list
# Output: 1. repo-a, 2. repo-b

# Index a repository
rag-qa index /path/to/your/repo

# Ask a question - multiple ways:
rag-qa ask "how does auth work?" 1           # By index
rag-qa ask "how does auth work?" repo-a      # By repo name
rag-qa ask "how does auth work?" /path/to/repo  # By full path

# Set default repo (for fewer keystrokes)
rag-qa set-default /path/to/your/repo

# Ask using default repo
rag-qa ask "how does auth work?"

# View conversation history
rag-qa history 1                    # By index
rag-qa history repo-a               # By name
rag-qa history /path/to/repo        # By path

# Export transcript
rag-qa export repo-a --format markdown

# Clear history
rag-qa clear 1

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

### `ask <question> [repoIdentifier]`

Ask a question about an indexed repository.

```bash
rag-qa ask "what does the auth system do?"           # Uses default repo
rag-qa ask "what does auth do?" 1                    # By index (from list)
rag-qa ask "what does auth do?" my-repo              # By repo basename
rag-qa ask "what does auth do?" /path/to/repo        # By full path
rag-qa ask "where is it?" --repo /path/to/repo       # Using --repo flag
rag-qa ask "question" 2 --history 5                  # With history depth
```

**Arguments:**
- `question` — **Required.** The question to ask
- `repoIdentifier` — **Optional.** Repository identifier (index, name, or path). If not provided, uses default repo

**Options:**
- `--repo <identifier>` — Alternative way to specify repo. Can be index, name, or path
- `--history <depth>` — How many prior turns to include (default: 10)

### `history <repoIdentifier>`

Show conversation history for a repository.

```bash
rag-qa history 1                    # By index
rag-qa history my-repo              # By repo name
rag-qa history /path/to/repo        # By full path
```

### `export <repoIdentifier>`

Export conversation history as a file (markdown, JSON, or CSV).

```bash
rag-qa export 1                                  # By index
rag-qa export my-repo --format json              # By name
rag-qa export /path/to/repo --format csv --output ~/exports  # By path
```

**Arguments:**
- `repoIdentifier` — Repository identifier (index, name, or path)

**Options:**
- `--format <type>` — Export format: `markdown`, `json`, `csv` (default: `markdown`)
- `--output <dir>` — Output directory (default: current directory)

### `clear <repoIdentifier>`

Clear conversation history for a repository.

```bash
rag-qa clear 1                    # By index
rag-qa clear my-repo              # By repo name
rag-qa clear /path/to/repo        # By full path
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
