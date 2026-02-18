import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ingestChunksMock = vi.fn(async () => ({ indexed: 1 }));
const dropCollectionMock = vi.fn(async () => undefined);
const chunkFileMock = vi.fn();

vi.mock("../lib/pyClient.js", () => ({
  ingestChunks: (...args: unknown[]) => ingestChunksMock(...args),
  dropCollection: (...args: unknown[]) => dropCollectionMock(...args),
}));

vi.mock("../lib/chunker.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/chunker.js")>(
    "../lib/chunker.js"
  );
  return {
    ...actual,
    chunkFile: (...args: Parameters<typeof actual.chunkFile>) => chunkFileMock(...args),
  };
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../../test-fixtures/sample-repo");

async function postIngest(body: Record<string, unknown>) {
  const { ingestRouter } = await import("./ingest.js");
  return ingestRouter.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /ingest", () => {
  beforeEach(async () => {
    ingestChunksMock.mockClear();
    dropCollectionMock.mockClear();
    // Default: chunker passes through to the real implementation.
    const actual = await vi.importActual<typeof import("../lib/chunker.js")>(
      "../lib/chunker.js"
    );
    chunkFileMock.mockReset();
    chunkFileMock.mockImplementation(actual.chunkFile);
  });

  it("returns 400 when repoPath is missing", async () => {
    const res = await postIngest({});
    expect(res.status).toBe(400);
  });

  it("calls dropCollection once before any ingestChunks call", async () => {
    const res = await postIngest({ repoPath: FIXTURE });
    expect(res.status).toBe(200);
    expect(dropCollectionMock).toHaveBeenCalledTimes(1);
    expect(dropCollectionMock).toHaveBeenCalledWith("sample-repo");
    // dropCollection must have been called before any ingestChunks call
    const dropOrder = dropCollectionMock.mock.invocationCallOrder[0];
    if (ingestChunksMock.mock.invocationCallOrder.length > 0) {
      expect(dropOrder).toBeLessThan(ingestChunksMock.mock.invocationCallOrder[0]);
    }
  });

  it("response shape includes filesExcluded and filesSkipped", async () => {
    const res = await postIngest({ repoPath: FIXTURE });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("chunksIndexed");
    expect(body).toHaveProperty("filesExcluded");
    expect(body).toHaveProperty("filesSkipped");
    expect(Array.isArray(body.filesExcluded)).toBe(true);
    expect(Array.isArray(body.filesSkipped)).toBe(true);
  });

  it("excludePatterns filter files (docs/** excludes intro.md)", async () => {
    const res = await postIngest({ repoPath: FIXTURE, excludePatterns: "docs/**\n" });
    const body = (await res.json()) as { filesExcluded: string[] };
    expect(body.filesExcluded.some((f) => f.endsWith("docs/intro.md"))).toBe(true);
  });

  it("honors .gitignore in the fixture (app.log and secret.txt excluded)", async () => {
    const res = await postIngest({ repoPath: FIXTURE });
    const body = (await res.json()) as { filesExcluded: string[] };
    expect(body.filesExcluded.some((f) => f.endsWith("app.log"))).toBe(true);
    expect(body.filesExcluded.some((f) => f.endsWith("secret.txt"))).toBe(true);
  });

  it("returns 503 with stage='embed' when ingestChunks fails", async () => {
    ingestChunksMock.mockRejectedValueOnce(new Error("boom"));
    const res = await postIngest({ repoPath: FIXTURE });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { stage: string };
    expect(body.stage).toBe("embed");
  });

  it("returns 503 with stage='drop' when dropCollection fails", async () => {
    dropCollectionMock.mockRejectedValueOnce(new Error("boom"));
    const res = await postIngest({ repoPath: FIXTURE });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { stage: string };
    expect(body.stage).toBe("drop");
    // ingestChunks must not have been called, since drop failed first
    expect(ingestChunksMock).not.toHaveBeenCalled();
  });

  it("captures per-file chunker failures and continues the ingest", async () => {
    chunkFileMock.mockImplementation(() => {
      throw new Error("simulated chunker failure");
    });
    const res = await postIngest({ repoPath: FIXTURE });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      chunksIndexed: number;
      filesSkipped: string[];
    };
    expect(body.chunksIndexed).toBe(0);
    expect(body.filesSkipped.length).toBeGreaterThan(0);
  });
});
