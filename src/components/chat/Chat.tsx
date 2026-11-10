"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import styles from "./chat.module.css";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";

type ModelOption = {
  id: string;
  name: string;
};

type ModelListResponse = {
  models: ModelOption[];
  defaultModel?: string;
};

function isModelListResponse(value: unknown): value is ModelListResponse {
  if (typeof value !== "object" || value === null || !("models" in value)) {
    return false;
  }

  return (
    Array.isArray(value.models) &&
    value.models.every(
      (model: unknown) =>
        typeof model === "object" &&
        model !== null &&
        "id" in model &&
        typeof model.id === "string" &&
        "name" in model &&
        typeof model.name === "string",
    ) &&
    (!("defaultModel" in value) ||
      typeof value.defaultModel === "string" ||
      value.defaultModel === undefined)
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const isGenerating = status === "submitted" || status === "streaming";

  useEffect(() => {
    const controller = new AbortController();

    async function loadModels() {
      try {
        const response = await fetch("/api/models", {
          signal: controller.signal,
        });
        const result: unknown = await response.json();

        if (!response.ok || !isModelListResponse(result)) {
          throw new Error("无法加载可用模型。");
        }

        setModels(result.models);
        const defaultModel = result.models.find(
          (model) => model.id === result.defaultModel,
        );
        setSelectedModel(defaultModel?.id ?? result.models[0]?.id ?? "");
      } catch {
        if (!controller.signal.aborted) {
          setModelsError("无法加载 Gemini 模型列表，请稍后刷新重试。");
        }
      } finally {
        if (!controller.signal.aborted) {
          setModelsLoading(false);
        }
      }
    }

    void loadModels();

    return () => controller.abort();
  }, []);

  function submitMessage() {
    const text = input.trim();

    if (!text || !selectedModel || isGenerating) {
      return;
    }

    void sendMessage({ text }, { body: { modelId: selectedModel } });
    setInput("");
  }

  return (
    <section className={styles.chat} aria-label="Gemini 聊天">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>DEVMATE · AI CHAT</p>
          <h1>和 Gemini 聊聊</h1>
        </div>
        <label className={styles.modelPicker}>
          <span>模型</span>
          <select
            aria-label="选择 Gemini 模型"
            className={styles.modelSelect}
            disabled={modelsLoading || isGenerating || models.length === 0}
            onChange={(event) => setSelectedModel(event.target.value)}
            value={selectedModel}
          >
            {modelsLoading ? <option value="">加载中…</option> : null}
            {!modelsLoading && models.length === 0 ? (
              <option value="">暂无可用模型</option>
            ) : null}
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <MessageList messages={messages} />

      <div className={styles.composer}>
        {modelsError ? (
          <p className={styles.error} role="alert">
            {modelsError}
          </p>
        ) : null}
        {status === "submitted" || status === "streaming" ? (
          <p className={styles.loading} role="status">
            {status === "submitted" ? "正在连接 Gemini…" : "正在生成…"}
          </p>
        ) : null}
        {isGenerating ? (
          <button
            className={styles.stopButton}
            type="button"
            onClick={() => stop()}
          >
            停止生成
          </button>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error.message || "请求失败，请稍后重试。"}
          </p>
        ) : null}
        <ChatInput
          input={input}
          isGenerating={isGenerating || !selectedModel}
          onInputChange={setInput}
          onSubmit={submitMessage}
        />
        <p className={styles.hint}>Enter 发送，Shift + Enter 换行</p>
      </div>
    </section>
  );
}
