import { existsSync } from "node:fs";
import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ProxyAgent, setGlobalDispatcher } from "undici";

for (const envFile of [".env.local", ".env.development", ".env"]) {
  if (existsSync(envFile)) {
    config({ path: envFile, override: false, quiet: true });
  }
}

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
const modelId = process.env.GOOGLE_MODEL?.trim();
const proxyUrl = process.env.GOOGLE_PROXY_URL?.trim();

if (!apiKey || !modelId) {
  console.error(
    "请在环境变量或 .env.local/.env.development 中配置 GOOGLE_GENERATIVE_AI_API_KEY 和 GOOGLE_MODEL。",
  );
  process.exit(1);
}

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const google = createGoogleGenerativeAI({ apiKey });

async function checkModels() {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models",
  );
  url.searchParams.set("pageSize", "100");

  const response = await fetch(url, {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Google 模型列表请求失败（HTTP ${response.status}）。`);
  }

  const result = await response.json();
  const availableModels = result.models
    ?.filter((model) =>
      model.supportedGenerationMethods?.includes("generateContent"),
    )
    .map((model) => model.name.replace(/^models\//, ""));

  if (!Array.isArray(availableModels) || !availableModels.includes(modelId)) {
    throw new Error(`当前 API Key 未列出可用模型：${modelId}`);
  }
}

try {
  console.log(`正在测试 Gemini 模型：${modelId}`);
  await checkModels();

  const { text } = await generateText({
    model: google(modelId),
    prompt: "请只回复：Gemini 连接测试成功",
    abortSignal: AbortSignal.timeout(60_000),
  });

  if (!text.trim()) {
    throw new Error("模型请求成功，但没有返回文本。");
  }

  console.log("Gemini 真实模型调用成功：");
  console.log(text);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Gemini 请求失败。");
  process.exitCode = 1;
}
