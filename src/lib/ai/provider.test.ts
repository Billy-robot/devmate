import { describe, expect, it } from "vitest";

import { AIConfigurationError, getGoogleChatModel } from "./provider";

describe("Google Gemini Provider", () => {
  it("API Key 缺失时返回明确的配置错误", () => {
    expect(() =>
      getGoogleChatModel({ GOOGLE_MODEL: "gemini-3.8-flash" }),
    ).toThrowError(AIConfigurationError);
  });

  it("模型 ID 缺失时返回明确的配置错误", () => {
    expect(() =>
      getGoogleChatModel({ GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }),
    ).toThrowError(AIConfigurationError);
  });

  it("配置齐全时创建模型而不发起网络请求", () => {
    const model = getGoogleChatModel({
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
      GOOGLE_MODEL: "gemini-3.8-flash",
    });

    expect(model).toBeDefined();
  });
});
