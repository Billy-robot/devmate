import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";

import {
  MAX_REQUEST_BYTES,
  type ChatRequestMessage,
} from "@/lib/ai/chat-schema";
import { getGoogleChatModel } from "@/lib/ai/provider";

import { createChatPostHandler } from "./route";

const validMessages: ChatRequestMessage[] = [
  {
    id: "message-1",
    role: "user",
    parts: [{ type: "text", text: "你好" }],
  },
];

function createRequest(
  body: unknown,
  options: { signal?: AbortSignal; contentLength?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });

  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }

  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: options.signal,
  });
}

describe("POST /api/chat", () => {
  it("拒绝空消息请求", async () => {
    const post = createChatPostHandler(vi.fn());
    const response = await post(createRequest({ messages: [] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "请求参数无效，请检查聊天消息。",
    });
  });

  it("拒绝不支持的角色和非法消息内容", async () => {
    const post = createChatPostHandler(vi.fn());
    const response = await post(
      createRequest({
        messages: [{ id: "message-1", role: "system", parts: [] }],
      }),
    );

    expect(response.status).toBe(400);
  });

  it("拒绝超出请求体上限的请求", async () => {
    const post = createChatPostHandler(vi.fn());
    const response = await post(
      createRequest({ messages: validMessages }, {
        contentLength: String(MAX_REQUEST_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
  });

  it("拒绝实际读取后超出上限的请求体", async () => {
    const post = createChatPostHandler(vi.fn());
    const response = await post(
      createRequest(`{"padding":"${"x".repeat(MAX_REQUEST_BYTES)}"}`),
    );

    expect(response.status).toBe(413);
  });

  it("拒绝无效 JSON", async () => {
    const post = createChatPostHandler(vi.fn());
    const response = await post(createRequest("{"));

    expect(response.status).toBe(400);
  });

  it("校验消息后返回前端可消费的流式响应", async () => {
    const generate = vi.fn(async () =>
      new Response("mock stream", {
        headers: { "content-type": "text/event-stream" },
      }),
    );
    const post = createChatPostHandler(generate);
    const response = await post(createRequest({ messages: validMessages }));

    expect(generate).toHaveBeenCalledWith(
      validMessages,
      expect.any(AbortSignal),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toBe("mock stream");
  });

  it("将 Provider 限流映射为 429 且不泄露上游错误", async () => {
    const post = createChatPostHandler(async () => {
      throw new APICallError({
        message: "upstream details",
        url: "https://example.invalid",
        requestBodyValues: {},
        statusCode: 429,
      });
    });
    const response = await post(createRequest({ messages: validMessages }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "模型服务繁忙，请稍后重试。",
    });
  });

  it("将模型调用失败映射为脱敏的 500", async () => {
    const post = createChatPostHandler(async () => {
      throw new Error("sensitive provider details");
    });
    const response = await post(createRequest({ messages: validMessages }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "聊天服务暂时不可用。",
    });
  });

  it("缺少 API Key 或模型配置时返回脱敏的 500", async () => {
    const cases = [
      { GOOGLE_MODEL: "gemini-3.8-flash" },
      { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" },
    ];

    for (const env of cases) {
      const post = createChatPostHandler(async () => {
        getGoogleChatModel(env);
        return new Response();
      });
      const response = await post(createRequest({ messages: validMessages }));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "聊天服务暂时不可用。",
      });
    }
  });

  it("将客户端取消信号传递给模型调用", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const post = createChatPostHandler(async (_messages, signal) => {
      receivedSignal = signal;
      return new Response("stream");
    });

    await post(
      createRequest({ messages: validMessages }, { signal: controller.signal }),
    );
    controller.abort();

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(receivedSignal?.aborted).toBe(true);
  });
});
