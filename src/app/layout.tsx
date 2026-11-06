import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevMate",
  description: "用于学习 Agent 开发的 AI 对话应用",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
