---
name: add-ingest-filter
description: Add or change a rule that decides which files get indexed or how they are chunked - skip dirs, skip extensions, name patterns, default ignore patterns, size limits, language mapping. Use when asked to stop indexing some kind of file, index something that is currently skipped, or change chunking in backend/src/lib/fileWalker.ts, ignoreMatcher.ts or chunker.ts.
---

# Add an ingest filter

All filtering happens in `backend/src/lib/`, called from `routes/ingest.ts`. Work test-first: fixture, failing test, change, green.

## 1. Pick the layer

| Rule | Where | Shows up in `/ingest` response as |
| --- | --- | --- |
| Directory never indexed (`vendor`, `.turbo`) | `EXCLUDE_DIRS` in `fileWalker.ts` | `filesExcluded` |
| Extension never indexed (binaries, assets) | `EXCLUDE_EXTENSIONS` in `fileWalker.ts` | `filesExcluded` |
| Name-based rule (like the existing `.min.` check, lockfiles) | new check in `shouldExcludePath` | `filesExcluded` |
| gitignore-style pattern applied to every repo | `buildIgnoreMatcher` in `ignoreMatcher.ts` | `filesExcluded` |
| Content-based skip (size, generated header) | `chunkFile` in `chunker.ts`, return `[]` | `filesSkipped` |
| Language label for a new extension | `LANGUAGE_MAP` in `chunker.ts` | chunk `language` |

Gotchas to keep in mind:

- `shouldExcludePath` gets the absolute path, so `EXCLUDE_DIRS` and `.min.` also match segments above the repo root (a repo under `~/build/` is fully excluded). Do not make this worse; mention it if your rule touches it.
- `path.extname` returns only the last extension (`a.tar.gz` -> `.gz`) and `""` for dotfiles like `.env`, so dotfiles need a name check, not an extension entry.
- `ignoreMatcher` patterns are matched against repo-relative paths. A file inside an ignored directory cannot be re-included with `!` (gitignore semantics, see `ignoreMatcher.test.ts`).
- The per-ingest "Extra excludes" textarea already covers ad-hoc patterns. Only hardcode a rule if it should apply to every repo.

## 2. Add a fixture file

Put a tiny synthetic file in `backend/test-fixtures/sample-repo/` that the rule should affect, e.g.:

```bash
printf 'binary\n' > backend/test-fixtures/sample-repo/src/module.wasm
```

- Keep it one or two lines. Never copy real project code in.
- If it matches the root `.gitignore` (`node_modules/`, `dist/`, `build/`, `*.log`, `.env` ...), stage it with `git add -f`.
- Existing tests assert on this fixture (`fileWalker.test.ts` expects `src/index.ts` and `app.log` included without a matcher; `ingest.test.ts` expects `docs/intro.md`, `app.log`, `secret.txt` handling). Do not rename or delete those files.
- If the file will be indexed, check `scripts/eval-cases.json` still makes sense.

## 3. Write the failing Vitest case

Add it to the test file next to the module you are changing. For `fileWalker.ts`, cover both the pure check and the walk over the fixture:

```ts
it("excludes .wasm binaries", () => {
  expect(shouldExcludePath("/repo/src/module.wasm")).toBe(true);
});

it("reports the fixture .wasm file as excluded", () => {
  const { included, excluded } = collectFiles(FIXTURE);
  expect(included.some((f) => f.endsWith("src/module.wasm"))).toBe(false);
  expect(excluded.some((f) => f.endsWith("src/module.wasm"))).toBe(true);
});
```

For `chunker.ts` content rules, call `chunkFile(path.join(FIXTURE, "<file>"), FIXTURE)` and assert `[]`. For `ignoreMatcher.ts`, assert `buildIgnoreMatcher("", "").ignores("<relative path>")`. If the rule changes the `/ingest` response, add a case to `src/routes/ingest.test.ts` (it already mocks `pyClient`, keep it that way).

Run it and confirm it fails for the right reason:

```bash
cd backend && npx vitest run src/lib/fileWalker.test.ts
```

## 4. Implement

Smallest change in the chosen layer. Backend style: double quotes, semicolons, `.js` suffix on relative imports.

## 5. Verify

```bash
cd backend
npx vitest run src/lib/fileWalker.test.ts   # the file you touched
npm test                                     # ingest.test.ts walks the same fixture
npx tsc --noEmit                             # 2 known errors in ingest.test.ts on master; add none
```

If the rule is user-visible, update the "Smart skip list" bullet in `README.md`.

Commit as `feat(backend): skip <thing> during ingest`, with the fixture, test and change together.
