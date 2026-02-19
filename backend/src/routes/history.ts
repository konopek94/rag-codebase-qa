import { Hono } from "hono";
import { readHistory, clearHistory } from "../lib/historyStore.js";

export const historyRouter = new Hono();

historyRouter.get("/", (c) => {
  const repoPath = c.req.query("repoPath");
  if (!repoPath) return c.json({ error: "repoPath is required" }, 400);
  return c.json(readHistory(repoPath));
});

historyRouter.delete("/", (c) => {
  const repoPath = c.req.query("repoPath");
  if (!repoPath) return c.json({ error: "repoPath is required" }, 400);
  clearHistory(repoPath);
  return c.json({ cleared: true });
});
