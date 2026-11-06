import assert from "node:assert/strict";

const apiUrl = process.env.CHAT_API_URL ?? "http://localhost:3000/api/chat";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);

try {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "gemini-live-test",
          role: "user",
          parts: [{ type: "text", text: "请只回复：Gemini 连接测试成功" }],
        },
      ],
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`聊天 API 返回 HTTP ${response.status}: ${body}`);
  }

  if (!response.body) {
    throw new Error("聊天 API 没有返回响应流。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let generatedText = "";
  let streamError;

  function processLine(line) {
    if (!line.startsWith("data: ")) {
      return;
    }

    const data = line.slice(6);

    if (data === "[DONE]") {
      return;
    }

    const chunk = JSON.parse(data);

    if (chunk.type === "text-delta") {
      generatedText += chunk.delta;
    } else if (chunk.type === "error") {
      streamError = chunk.errorText ?? "模型在流式生成期间返回错误。";
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(processLine);

    if (done) {
      if (buffer) {
        processLine(buffer);
      }
      break;
    }
  }

  if (streamError) {
    throw new Error(`模型流返回错误：${streamError}`);
  }

  assert.ok(generatedText.trim().length > 0, "模型没有返回文本内容。");
  console.log("Gemini 真实模型调用成功。");
  console.log(`响应内容：${generatedText.trim()}`);
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    console.error("Gemini 测试超时（60 秒）。");
  } else {
    console.error(
      error instanceof Error ? error.message : "Gemini 测试失败。",
    );
  }
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
