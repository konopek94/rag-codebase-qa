#!/usr/bin/env node
// Ingests backend/test-fixtures/sample-repo through the running backend, asks every case in
// scripts/eval-cases.json and checks that the answer cites the expected files as [file:line].
// Usage: node scripts/eval-answers.mjs          (backend on RAG_QA_BACKEND or :3001)
//        node scripts/eval-answers.mjs --check  (validate the case file only, no services)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.join(ROOT, "backend/test-fixtures/sample-repo");
const CASES = path.join(ROOT, "scripts/eval-cases.json");
const BACKEND = process.env.RAG_QA_BACKEND ?? "http://localhost:3001";

function loadCases() {
  const cases = JSON.parse(fs.readFileSync(CASES, "utf-8"));
  if (!Array.isArray(cases) || cases.length === 0)
    throw new Error("eval-cases.json: expected a non-empty array");
  const ids = new Set();
  for (const c of cases) {
    const where = `eval-cases.json case ${JSON.stringify(c.id)}`;
    if (typeof c.id !== "string" || ids.has(c.id))
      throw new Error(`${where}: id must be a unique string`);
    ids.add(c.id);
    if (typeof c.question !== "string" || !c.question.trim())
      throw new Error(`${where}: question is required`);
    if (!Array.isArray(c.mustCite) || c.mustCite.length === 0)
      throw new Error(`${where}: mustCite must be a non-empty array`);
    for (const f of [...c.mustCite, ...(c.mustNotCite ?? [])]) {
      if (!fs.existsSync(path.join(REPO, f)))
        throw new Error(`${where}: ${f} does not exist in sample-repo`);
    }
  }
  return cases;
}

async function post(route, body) {
  const res = await fetch(`${BACKEND}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${route} -> ${res.status}: ${await res.text()}`);
  return res;
}

// Hono's writeSSE emits "event: x\ndata: line\ndata: line\n\n"; multi-line data is split into data lines.
function parseSSE(text) {
  let answer = "";
  let sources = [];
  for (const block of text.split("\n\n")) {
    const lines = block.split("\n");
    const event = lines
      .find((l) => l.startsWith("event:"))
      ?.slice(6)
      .trim();
    const data = lines
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(l.startsWith("data: ") ? 6 : 5))
      .join("\n");
    if (event === "sources") sources = JSON.parse(data).sources;
    else if (lines.some((l) => l.startsWith("data:"))) answer += data;
  }
  return { answer, sources };
}

function citedFiles(answer) {
  return new Set([...answer.matchAll(/\[([^\[\]:\s]+):\d+/g)].map((m) => m[1]));
}

const clearHistory = () =>
  fetch(`${BACKEND}/history?repoPath=${encodeURIComponent(REPO)}`, { method: "DELETE" });

const cases = loadCases();
if (process.argv.includes("--check")) {
  console.log(`eval-cases.json OK: ${cases.length} cases`);
  process.exit(0);
}

try {
  const ingest = await (await post("/ingest", { repoPath: REPO })).json();
  console.log(
    `ingested sample-repo: ${ingest.chunksIndexed} chunks, excluded ${ingest.filesExcluded.join(", ")}\n`
  );
} catch (err) {
  console.error(`ingest failed (${BACKEND}): ${err.message}`);
  console.error(
    "Start python-service (uvicorn main:app --port 8001) and backend (npm run dev) first."
  );
  process.exit(1);
}

let failed = 0;
for (const c of cases) {
  // /query sends prior turns to the LLM; clear them so each case is independent.
  await clearHistory();
  let answer, sources;
  try {
    ({ answer, sources } = parseSSE(
      await (await post("/query", { question: c.question, repoPath: REPO })).text()
    ));
    // query.ts has no SSE onError: an LLM failure just closes the stream before the sources event.
    if (sources.length === 0)
      throw new Error("stream ended without a sources event (LLM error? see backend log)");
  } catch (err) {
    failed++;
    console.log(`FAIL ${c.id}: ${err.message}`);
    continue;
  }
  const cited = citedFiles(answer);
  const retrieved = new Set(sources.map((s) => s.file));
  const missing = c.mustCite.filter((f) => !cited.has(f));
  const leaked = (c.mustNotCite ?? []).filter((f) => cited.has(f) || retrieved.has(f));
  const ok = missing.length === 0 && leaked.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.id}`);
  console.log(`  cited:     ${[...cited].join(", ") || "-"}`);
  console.log(`  retrieved: ${[...retrieved].join(", ") || "-"}`);
  if (missing.length) console.log(`  missing:   ${missing.join(", ")}`);
  if (leaked.length) console.log(`  leaked:    ${leaked.join(", ")}`);
  if (!ok) console.log(`  answer:    ${answer.trim().replace(/\s+/g, " ").slice(0, 300)}`);
}
await clearHistory();

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
