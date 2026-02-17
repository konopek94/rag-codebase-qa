# RAG Codebase Q&A

Ask natural language questions about any local codebase and get cited answers.

## Architecture

- **Python service** (port 8001): generates embeddings with `sentence-transformers` and stores/queries vectors in Chroma
- **Node.js backend** (port 3001): orchestrates ingestion, calls Python service, streams LLM responses
- **React frontend** (port 5173): chat UI with collapsible source file citations

## Setup

### 1. Python service

```bash
cd python-service
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

### 2. Backend

```bash
cp .env.example .env
# Fill in your API key
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Open http://localhost:5173
2. Enter the absolute path to a local repo and click **Index**
3. Ask questions - answers stream in with source citations

## Supported LLM providers

Set `LLM_PROVIDER` in `.env` and provide the matching API key:
- `anthropic` (default) - Claude Sonnet 4.6
- `google` - Gemini 2.0 Flash
- `mistral` - Mistral Large
- `openai` - GPT-4o

## Design notes

- **Chunking**: all files split by 50-line windows with 10-line overlap - language-agnostic, simple, works for code and prose
- **Source citations**: the model is instructed to reference `[file:line]` markers from retrieved chunks
- **Embeddings are local**: `sentence-transformers` runs on CPU, no external embedding API needed
- **Provider-agnostic**: Vercel AI SDK abstracts provider differences
