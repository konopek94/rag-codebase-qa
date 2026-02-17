import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";

export function getLLM(): LanguageModel {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  const model = process.env.LLM_MODEL;

  switch (provider) {
    case "openai":
      return createOpenAI()(model ?? "gpt-4o");
    case "google":
      return createGoogleGenerativeAI()(model ?? "gemini-2.0-flash");
    case "mistral":
      return createMistral()(model ?? "mistral-medium-3.5");
    case "anthropic":
    default:
      return createAnthropic()(model ?? "claude-sonnet-4-6");
  }
}
