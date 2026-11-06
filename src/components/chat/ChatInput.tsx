import type { ChangeEvent, KeyboardEvent } from "react";

import styles from "./chat.module.css";

type ChatInputProps = {
  input: string;
  isGenerating: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ChatInput({
  input,
  isGenerating,
  onInputChange,
  onSubmit,
}: ChatInputProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onInputChange(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className={styles.inputForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        aria-label="输入消息"
        className={styles.input}
        disabled={isGenerating}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="输入你的问题…"
        rows={2}
        value={input}
      />
      <button
        className={styles.sendButton}
        disabled={isGenerating || input.trim().length === 0}
        type="submit"
      >
        发送
      </button>
    </form>
  );
}
