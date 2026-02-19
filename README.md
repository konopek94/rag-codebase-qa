# RAG Codebase Q&A

A local-first developer tool that answers natural language questions about any codebase with cited source references. Ask "what does the auth system do?" and get streamed answers with file:line citations.

**Built with:** Python (FastAPI + Chroma), Node.js (Hono), React + Vite, Vercel AI SDK

## Why This Matters

- **No external APIs for embeddings** - `sentence-transformers` runs locally on CPU, fully private
- **Multi-provider LLM support** - switch between Claude, Gemini, Mistral, GPT without code changes
- **Streaming UI** - answers appear token-by-token with citations, no waiting
- **Language-agnostic chunking** - 50-line windows work for any code or prose
- **Cited answers** - every response links back to source files and line numbers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ React Frontend (port 5173)                                      │
│ • RepoIndexer: path input → index button                        │
│ • ChatInterface: question input → streaming answer + sources    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (HTTP + SSE)
┌─────────────────────▼───────────────────────────────────────────┐
│ Node.js Backend (port 3001, Hono)                              │
│ • POST /ingest: walk files → chunk → send to Python service    │
│ • POST /query: retrieve chunks → build context → stream LLM    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (HTTP)
┌─────────────────────▼───────────────────────────────────────────┐
│ Python Service (port 8001, FastAPI)                            │
│ • POST /ingest: embed chunks → upsert to Chroma               │
│ • POST /query: embed question → retrieve top-5 chunks         │
└─────────────────────────────────────────────────────────────────┘
```

**Separation of concerns:**
- Python: stateful ML (embeddings + vector store)
- Node.js: stateless orchestration (file walking, context building, streaming)
- React: interactive UI (real-time streaming feedback)

## Quick Start

Three services run in parallel:

```bash
# Terminal 1: Python embedding service (port 8001)
cd python-service
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload

# Terminal 2: Node.js backend (port 3001)
cd backend
npm install
npm run dev
# Loads .env via tsx --env-file=.env

# Terminal 3: React frontend (port 5173)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and index any local repo.

## Configuration

Create `.env` in the project root:

```bash
cp .env.example .env
```

Edit `.env`:
```
LLM_PROVIDER=mistral
MISTRAL_API_KEY=<your-mistral-key>
PYTHON_SERVICE_URL=http://localhost:8001
```

Supported LLM providers:
- `anthropic` - Claude Sonnet 4.6 (default)
- `mistral` - Mistral Large
- `google` - Gemini 2.0 Flash
- `openai` - GPT-4o

## Example Flow

```
1. User enters repo path: /Users/you/my-app
2. Backend walks files, chunks them (50 lines + 10-line overlap)
3. Python service embeds chunks → stores in Chroma
   - Creates collection named "my-app"
   - Stores ~1000 chunks for typical project
4. User asks: "how does auth work?"
5. Backend retrieves top-5 similar chunks
6. LLM streams answer with [file:line] citations
7. Frontend shows collapsible sources
```

## Design Decisions

- **Chunking is language-agnostic**: 50-line windows work for Python, JS, Go, YAML, markdown, etc.
- **Streaming over polling**: SSE is simpler than WebSocket and natural for text generation
- **Python ↔ Node separation**: ML is stateful (Chroma), orchestration is stateless (restart-safe)
- **Local embeddings**: no rate limits, no API costs, fully private (all data stays on your machine)
- **Provider abstraction**: Vercel AI SDK hides ChatGPT/Claude/Gemini differences

## What's Included

- **50+ automated tests** for file walking and chunking logic
- **Error handling** for large files (>2000 lines skipped), missing paths, unavailable embeddings
- **Smart skip list**: ignores node_modules, dist, build, .git, minified files, binary assets
- **SSE streaming**: token-by-token answer delivery with `event: sources` metadata
- **CORS enabled**: frontend and backend can be on different origins
- **Path filtering**: honors `.gitignore` in the indexed repo, plus an optional "Extra excludes" textarea for ad-hoc per-ingest patterns

## Development


### Run tests

```bash
cd backend
npm run test  # vitest
```

### Manual smoke test

```bash
# With Python service running, test the ingest endpoint:
curl -X POST http://localhost:8001/ingest \
  -H "Content-Type: application/json" \
  -d '{"collection":"test","chunks":[{"text":"fn main(){}","file":"main.rs","startLine":1,"endLine":1,"language":"rust"}]}'
# → {"indexed":1}

# Query the chunks:
curl -X POST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{"collection":"test","question":"what language is this?"}'
# → {"chunks":[...]}
```

## Known Issues

- **Collection-name collisions.** Each indexed repo becomes a Chroma collection named after its directory basename (e.g. `/work/proj` and `/play/proj` would collide). Re-indexing now *replaces* a collection rather than merging, so indexing the second `proj` will delete the first one's chunks. Workaround: rename one of the directories before indexing. A proper fix is tracked as follow-up work.

## Future Work

- [ ] Conversation history (ask follow-ups without re-indexing)
- [ ] Batch indexing (multiple repos)
- [ ] Export mode (save Q&A transcript)
- [ ] Web deployment (e.g., Vercel + Supabase vector)
- [ ] CLI interface (`rag-qa query "what is this?"`)
