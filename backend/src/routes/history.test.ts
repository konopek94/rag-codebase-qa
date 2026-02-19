import { describe, it, expect, vi, beforeEach } from "vitest";

const readHistoryMock = vi.fn();
const clearHistoryMock = vi.fn();

vi.mock("../lib/historyStore.js", () => ({
  readHistory: (...args: unknown[]) => readHistoryMock(...args),
  clearHistory: (...args: unknown[]) => clearHistoryMock(...args),
}));

async function request(method: "GET" | "DELETE", query: string) {
  const { historyRouter } = await import("./history.js");
  return historyRouter.request(`/${query}`, { method });
}

const sampleTurn = {
  question: "What is x?",
  answer: "x is 1.",
  sources: [{ file: "src/index.ts", startLine: 1, endLine: 1 }],
};

describe("history routes", () => {
  beforeEach(() => {
    readHistoryMock.mockReset();
    clearHistoryMock.mockReset();
  });

  it("GET /history returns 400 when repoPath is missing", async () => {
    const res = await request("GET", "");
    expect(res.status).toBe(400);
  });

  it("GET /history returns the turns from the store", async () => {
    readHistoryMock.mockReturnValue([sampleTurn]);
    const res = await request("GET", "?repoPath=/work/myproj");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([sampleTurn]);
    expect(readHistoryMock).toHaveBeenCalledWith("/work/myproj");
  });

  it("GET /history returns [] when the store has no history", async () => {
    readHistoryMock.mockReturnValue([]);
    const res = await request("GET", "?repoPath=/work/myproj");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("DELETE /history returns 400 when repoPath is missing", async () => {
    const res = await request("DELETE", "");
    expect(res.status).toBe(400);
  });

  it("DELETE /history clears the store and returns { cleared: true }", async () => {
    const res = await request("DELETE", "?repoPath=/work/myproj");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cleared: true });
    expect(clearHistoryMock).toHaveBeenCalledWith("/work/myproj");
  });
});
