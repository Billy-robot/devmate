import { APICallError } from "ai";

import { streamChat } from "@/lib/ai/chat";
import {
  chatRequestSchema,
  MAX_REQUEST_BYTES,
  type ChatRequestMessage,
} from "@/lib/ai/chat-schema";
import { isGoogleModelAvailable } from "@/lib/ai/models";
import { getGoogleChatModel } from "@/lib/ai/provider";

type ChatGenerator = (
  messages: ChatRequestMessage[],
  modelId: string | undefined,
  abortSignal: AbortSignal,
) => Promise<Response>;
type ModelValidator = (modelId: string) => Promise<boolean>;

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredLength = Number(contentLength);

    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      throw new RequestError("Invalid Content-Length.", 400);
    }

    if (declaredLength > MAX_REQUEST_BYTES) {
      throw new RequestError("Request body is too large.", 413);
    }
  }

  if (!request.body) {
    throw new RequestError("Request body is required.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestError("Request body is too large.", 413);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new RequestError("Request body must be valid JSON.", 400);
  }
}

function getErrorResponse(error: unknown): Response {
  if (error instanceof RequestError) {
    return Response.json(
      { error: error.status === 413 ? "请求内容过大。" : "请求格式无效。" },
      { status: error.status },
    );
  }

  const status =
    APICallError.isInstance(error) && error.statusCode === 429 ? 429 : 500;

  console.error("[api/chat] Request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
    status,
  });

  return Response.json(
    {
      error:
        status === 429
          ? "模型服务繁忙，请稍后重试。"
          : "聊天服务暂时不可用。",
    },
    { status },
  );
}

export function createChatPostHandler(
  generate: ChatGenerator = (messages, modelId, abortSignal) =>
    streamChat(messages, getGoogleChatModel(process.env, modelId), abortSignal),
  validateModel: ModelValidator = (modelId) => isGoogleModelAvailable(modelId),
) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const body = await readJsonBody(request);
      const parsed = chatRequestSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "请求参数无效，请检查聊天消息。" },
          { status: 400 },
        );
      }

      if (
        parsed.data.modelId &&
        !(await validateModel(parsed.data.modelId))
      ) {
        return Response.json(
          { error: "所选 Gemini 模型不可用，请重新选择模型。" },
          { status: 400 },
        );
      }

      // Production deployments must add authentication, rate limiting, and usage controls here.
      return await generate(
        parsed.data.messages,
        parsed.data.modelId,
        request.signal,
      );
    } catch (error) {
      if (request.signal.aborted) {
        return new Response(null, { status: 499 });
      }

      return getErrorResponse(error);
    }
  };
}

export const POST = createChatPostHandler();
