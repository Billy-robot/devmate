import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function createGoogleProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}
