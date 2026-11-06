import type { UIMessage } from "ai";

import styles from "./chat.module.css";

type MessageListProps = {
  messages: UIMessage[];
};

function getText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.sparkle} aria-hidden="true">
          ✦
        </span>
        <h2>有什么可以帮你？</h2>
        <p>发送消息，开始一段新的对话。</p>
      </div>
    );
  }

  return (
    <ol className={styles.messageList} aria-live="polite">
      {messages.map((message) => (
        <li
          className={
            message.role === "user" ? styles.userMessage : styles.aiMessage
          }
          key={message.id}
        >
          <span className={styles.messageRole}>
            {message.role === "user" ? "你" : "Gemini"}
          </span>
          <p className={styles.messageText}>{getText(message)}</p>
        </li>
      ))}
    </ol>
  );
}
