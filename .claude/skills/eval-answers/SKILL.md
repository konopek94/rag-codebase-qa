---
name: eval-answers
description: End-to-end check that answers cite the right files, run against backend/test-fixtures/sample-repo through the real python-service, backend and LLM. Use after changing chunking, ingest filters, retrieval (pyClient top_k, python-service embeddings), the system prompt or context format in routes/query.ts, or the provider/model in lib/llm.ts, or when asked to "run the evals".
---

# Eval answers

`scripts/eval-answers.mjs` ingests `backend/test-fixtures/sample-repo` via `POST /ingest`, asks each question in `scripts/eval-cases.json` via `POST /query`, parses the SSE stream, and passes a case when every `mustCite` file appears as a `[file:line]` citation in the answer and no `mustNotCite` file is cited or retrieved. It exits 1 if any case fails.

## 1. Validate the case file (no services needed)

```bash
node scripts/eval-answers.mjs --check
```

Fails if the JSON is malformed, ids repeat, or a listed file does not exist in `sample-repo`.

## 2. Start the services

```bash
# terminal 1
cd python-service && source venv/bin/activate && uvicorn main:app --port 8001
# terminal 2 - needs backend/.env with LLM_PROVIDER and that provider's key
cd backend && npm run dev
```

The query step calls the configured LLM provider, so it needs a real API key and sends the (synthetic) fixture chunks to that provider. If there is no key, stop after step 1 and say so; do not report eval results you did not get.

## 3. Run

```bash
node scripts/eval-answers.mjs
RAG_QA_BACKEND=http://localhost:3002 node scripts/eval-answers.mjs   # other backend
```

Side effects: it replaces the `sample-repo` Chroma collection and clears `~/.rag-qa/history/sample-repo.json` before each case and at the end, because `/query` replays prior turns into the prompt.

## 4. Read failures

Each case prints `cited` (from the answer text) and `retrieved` (from the `sources` event).

- `missing` file is in `retrieved` but not `cited`: the LLM ignored or reformatted the citation. Look at the system prompt and the `[file:startLine]` context tags in `routes/query.ts`.
- `missing` file is not in `retrieved`: retrieval or ingest problem. Check the ingest line at the top (chunk count, excluded list), `chunker.ts`, and `top_k` in `pyClient.queryChunks`.
- `leaked`: a gitignored file reached the index. That is an ingest filter bug (`ignoreMatcher.ts` / `fileWalker.ts`).
- "stream ended without a sources event": the LLM call threw (bad key, model name, rate limit). `query.ts` has no SSE error handler, so the reason is only in the backend terminal.

LLM output varies run to run. Re-run a single flaky failure before treating it as a regression, and say in the report which provider/model (`LLM_PROVIDER`, `LLM_MODEL`) produced the result.

## 5. Adding a case

Append to `scripts/eval-cases.json`:

```json
{ "id": "kebab-id", "question": "...", "mustCite": ["src/file.ts"], "mustNotCite": ["secret.txt"] }
```

Paths are relative to `sample-repo`, exactly as the chunker stores them. If the case needs new fixture content, add it under `backend/test-fixtures/sample-repo` (tiny, synthetic) and run `cd backend && npm test`, since `fileWalker.test.ts` and `ingest.test.ts` walk the same directory.
