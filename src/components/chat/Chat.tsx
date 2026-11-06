"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

import styles from "./chat.module.css";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const isGenerating = status === "submitted" || status === "streaming";

  function submitMessage() {
    const text = input.trim();

    if (!text || isGenerating) {
      return;
    }

    void sendMessage({ text });
    setInput("");
  }

  return (
    <section className={styles.chat} aria-label="Gemini 聊天">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>DEVMATE · AI CHAT</p>
          <h1>和 Gemini 聊聊</h1>
        </div>
        <span className={styles.model}>Google Gemini</span>
      </header>

      <MessageList messages={messages} />

      <div className={styles.composer}>
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
            请求失败，请稍后重试。
          </p>
        ) : null}
        <ChatInput
          input={input}
          isGenerating={isGenerating}
          onInputChange={setInput}
          onSubmit={submitMessage}
        />
        <p className={styles.hint}>Enter 发送，Shift + Enter 换行</p>
      </div>
    </section>
  );
}
