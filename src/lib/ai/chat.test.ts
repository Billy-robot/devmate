import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";

import { getSafeModelErrorMessage } from "./chat";

function createAPIError(statusCode: number) {
  return new APICallError({
    message: "provider response",
    url: "https://example.invalid",
    requestBodyValues: {},
    statusCode,
  });
}

describe("model stream error messages", () => {
  it("explains temporary Google model overload from a retried 503", () => {
    const apiError = createAPIError(503);
    const retryError = new RetryError({
      message: "Retries exhausted",
      reason: "maxRetriesExceeded",
      errors: [apiError],
    });

    expect(getSafeModelErrorMessage(retryError)).toBe(
      "Gemini 当前负载较高（HTTP 503），请稍后重试。",
    );
  });

  it("explains provider rate limiting from a retried 429", () => {
    const apiError = createAPIError(429);
    const retryError = new RetryError({
      message: "Retries exhausted",
      reason: "maxRetriesExceeded",
      errors: [apiError],
    });

    expect(getSafeModelErrorMessage(retryError)).toBe(
      "Gemini 请求过于频繁（HTTP 429），请稍后重试。",
    );
  });

  it("does not expose unknown provider errors", () => {
    expect(getSafeModelErrorMessage(new Error("sensitive provider details"))).toBe(
      "模型暂时不可用，请稍后重试。",
    );
  });
});
