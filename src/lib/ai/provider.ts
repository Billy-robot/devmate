import type { LanguageModel } from "ai";

import { configureUndiciProxy } from "./proxy";
import { createGoogleProvider } from "./providers/google";

type AIEnvironment = Record<string, string | undefined>;

export class AIConfigurationError extends Error {
  constructor(variableName: string) {
    super(`Required AI configuration is missing: ${variableName}`);
    this.name = "AIConfigurationError";
  }
}

export function getGoogleChatModel(
  env: AIEnvironment = process.env,
): LanguageModel {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const modelId = env.GOOGLE_MODEL?.trim();
  const proxyUrl = env.GOOGLE_PROXY_URL?.trim();

  if (!apiKey) {
    throw new AIConfigurationError("GOOGLE_GENERATIVE_AI_API_KEY");
  }

  if (!modelId) {
    throw new AIConfigurationError("GOOGLE_MODEL");
  }

  configureUndiciProxy(proxyUrl);

  return createGoogleProvider(apiKey)(modelId);
}
