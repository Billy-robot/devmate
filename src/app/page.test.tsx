import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("首页", () => {
  it("显示 Gemini 聊天界面和消息输入框", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "和 Gemini 聊聊" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "输入消息" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
  });
});
