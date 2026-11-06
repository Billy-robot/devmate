import {
  APICallError,
  convertToModelMessages,
  RetryError,
  streamText,
  type UIMessage,
} from "ai";
import type { LanguageModel } from "ai";

const STREAM_ERROR_MESSAGE = "模型暂时不可用，请稍后重试。";

function getAPICallError(error: unknown): APICallError | undefined {
  if (APICallError.isInstance(error)) {
    return error;
  }

  if (RetryError.isInstance(error) && APICallError.isInstance(error.lastError)) {
    return error.lastError;
  }

  return undefined;
}

export function getSafeModelErrorMessage(error: unknown): string {
  const apiError = getAPICallError(error);

  if (apiError?.statusCode === 503) {
    return "Gemini 当前负载较高（HTTP 503），请稍后重试。";
  }

  if (apiError?.statusCode === 429) {
    return "Gemini 请求过于频繁（HTTP 429），请稍后重试。";
  }

  return STREAM_ERROR_MESSAGE;
}

function logModelError(error: unknown) {
  const errorDetails: Record<string, string | number> = {
    errorType: error instanceof Error ? error.name : "UnknownError",
  };
  const apiError = getAPICallError(error);

  if (apiError?.statusCode !== undefined) {
    errorDetails.statusCode = apiError.statusCode;
  }

  if (RetryError.isInstance(error)) {
    errorDetails.retryCount = error.errors.length;
  }

  if (
    apiError?.cause instanceof Error &&
    "code" in apiError.cause &&
    typeof apiError.cause.code === "string"
  ) {
    errorDetails.causeCode = apiError.cause.code;
  }

  console.error("[ai/chat] Model stream failed", errorDetails);
}

export async function streamChat(
  messages: UIMessage[],
  model: LanguageModel,
  abortSignal: AbortSignal,
): Promise<Response> {
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model,
    messages: modelMessages,
    abortSignal,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      logModelError(error);
      return getSafeModelErrorMessage(error);
    },
  });
}
