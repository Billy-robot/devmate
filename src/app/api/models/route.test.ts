import { describe, expect, it, vi } from "vitest";

import { GoogleModelListError } from "@/lib/ai/models";

import { createModelsGetHandler } from "./route";

describe("GET /api/models", () => {
  it("returns available models and prefers the configured default", async () => {
    const get = createModelsGetHandler(
      async () => [
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      ],
      "gemini-2.5-pro",
    );

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      models: [
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      ],
      defaultModel: "gemini-2.5-pro",
    });
  });

  it("returns a safe error response when model discovery fails", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const get = createModelsGetHandler(async () => {
      throw new GoogleModelListError("upstream details", 429);
    });

    const response = await get();

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "模型列表请求过于频繁，请稍后重试。",
    });
    logError.mockRestore();
  });
});
