# AGENTS.md

Local-first RAG over any codebase: index a local repo, ask questions, get streamed answers with `[file:line]` citations.

## Parts and how they talk

| Part | Stack | Port | Role |
| --- | --- | --- | --- |
| `python-service/` | FastAPI, sentence-transformers (`all-MiniLM-L6-v2`), Chroma | 8001 | Embeds chunks, stores vectors in `python-service/chroma-data/`, returns top-k chunks |
| `backend/` | Node, TypeScript, Hono, Vercel AI SDK | 3001 | Walks files, chunks, calls the Python service, streams LLM answers |
| `frontend/` | React, Vite, Tailwind | 5173 | Index form + chat UI; Vite proxies `/ingest`, `/query`, `/history` to 3001 |
| `cli/` | Node, commander, chalk | - | `rag-qa` terminal client for the same backend (`RAG_QA_BACKEND`, default `http://localhost:3001`) |

Request flow:

- `POST /ingest {repoPath, excludePatterns?}` (`backend/src/routes/ingest.ts`): reads the repo's `.gitignore` + user patterns into `buildIgnoreMatcher` (`lib/ignoreMatcher.ts`), walks files with `collectFiles` (`lib/fileWalker.ts`, hardcoded `EXCLUDE_DIRS` / `EXCLUDE_EXTENSIONS` / `.min.`), chunks with `chunkFile` (`lib/chunker.ts`, 50-line windows, 10-line overlap, files over 2000 lines skipped), then via `lib/pyClient.ts` drops the collection and upserts in batches of 32. Returns `{chunksIndexed, filesExcluded, filesSkipped}`; 503 with `stage: "drop" | "embed"` when the Python service fails.
- `POST /query {question, repoPath, historyLimit?}` (`routes/query.ts`): `pyClient.queryChunks` gets top-5 chunks, builds a `[file:startLine]`-tagged context, calls `streamText` with the model from `lib/llm.ts`, and streams over SSE (`hono/streaming`): plain `data:` events carry answer tokens, then one `event: sources` with `{"sources":[{file,startLine,endLine}]}`. The finished turn is appended to `~/.rag-qa/history/<basename>.json` (`lib/historyStore.ts`).
- `GET|DELETE /history?repoPath=` (`routes/history.ts`): read or clear that file.
- Collection name and history key are both `path.basename(repoPath)`.
- `lib/llm.ts` picks the provider from `LLM_PROVIDER` (`anthropic` default, `openai`, `google`, `mistral`) and `LLM_MODEL`. It is the only place a model is constructed.

## Commands

Python service (Python 3.12; run from `python-service/` because Chroma uses the relative path `./chroma-data`; first start downloads the embedding model from Hugging Face):

```bash
cd python-service
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

Backend (`npm run dev` is `tsx watch --env-file=.env src/index.ts`, so it reads `backend/.env` and fails if it is missing; copy `.env.example` there and set one provider key):

```bash
cd backend
npm install
cp ../.env.example .env   # first time only
npm run dev               # http://localhost:3001
npm test                  # vitest run (all *.test.ts under src/)
npx vitest run src/lib/chunker.test.ts   # one file
npx tsc --noEmit          # typecheck (no npm script for it)
npm run lint              # eslint src
npm run format            # prettier --write src
```

Frontend (no tests; `npm run build` runs `tsc && vite build` and is the check):

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
npm run build
```

CLI (no test files exist yet; `npm test` starts vitest in watch mode):

```bash
cd cli
npm install
npm run build
npm run dev -- list       # or: ask "question" <repo>, index <path>, history, export
```

The Python service has no tests.

## Code conventions

- Backend is ESM with `"module": "NodeNext"`: relative imports end in `.js` even from `.ts` files (`import { chunkFile } from "../lib/chunker.js"`).
- Backend formatting is Prettier (`backend/.prettierrc.json`): double quotes, semicolons, `trailingComma: "es5"`, `printWidth: 100`. ESLint (`backend/eslint.config.js`, flat config) runs Prettier as an error rule; unused args/vars are allowed when prefixed with `_`.
- Frontend uses single quotes and no semicolons; CLI uses single quotes with semicolons. Neither has a Prettier/ESLint config, so match the file you are in.
- Tests sit next to the source as `*.test.ts`. Route tests call `router.request()` directly and `vi.mock("../lib/pyClient.js")`; nothing in the test suite talks to the Python service or an LLM.
- Routers are exported as `<name>Router` from `src/routes/` and mounted in `src/index.ts`. Errors are JSON `{ error, stage? }` with 400 for bad input, 503 when the Python service is down.
- `tsc` includes test files, so `npm run build` also emits them to `dist/` (gitignored).
- Commits: Conventional Commits with the part as scope, e.g. `feat(backend): ...`, `fix(cli): ...`.

## Project rules

- Local-first is the point of the project. Embeddings and the vector store stay local. Never add a hosted embedding API, telemetry, error reporting, or any other path that sends file contents, chunks, file paths or history off the machine.
- The one deliberate exit is the LLM call in `routes/query.ts`: the question, prior turns and the top-5 retrieved chunks go to the provider from `lib/llm.ts`. Do not widen it (whole files, more chunks, the file list). New providers go in `lib/llm.ts` only.
- Tests must stay offline: mock `pyClient` and never call `getLLM()` from a test.
- Filesystem fixtures live in `backend/test-fixtures/sample-repo` only, resolved in tests as `path.resolve(__dirname, "../../test-fixtures/sample-repo")`. Its `node_modules/`, `app.log` and `secret.txt` are committed on purpose to exercise the skip list and `.gitignore` handling; files matching the root `.gitignore` need `git add -f`. Keep fixture files tiny and synthetic, never copied from a real project. Use `fs.mkdtempSync` (as in `historyStore.test.ts`) for anything a test writes.
- `scripts/eval-cases.json` asserts on the fixture's content, so changing a fixture file means checking those cases too.

## Agent tooling

- `.claude/skills/add-ingest-filter/` - adding a skip/ignore/chunking rule with a fixture and a Vitest case.
- `.claude/skills/eval-answers/` - end-to-end citation check against the sample repo (`node scripts/eval-answers.mjs`).
- `.claude/hooks/backend-check.sh` (wired in `.claude/settings.json`) - after each edit to `backend/src/**/*.ts`, runs that file's sibling test and the whole-project typecheck, and feeds failures back.
