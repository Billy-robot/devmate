# DevMate

DevMate 是一个基于 Google Gemini 的流式 AI 聊天示例，使用 Next.js App Router 和 Vercel AI SDK。

## 技术栈

- Next.js `16.4.5` App Router、React `19.3.0`、TypeScript
- Vercel AI SDK：`ai` `7.0.163`、`@ai-sdk/react` `4.0.167`
- Google Gemini Provider：`@ai-sdk/google` `4.0.112`
- Zod `4.6.7`、Vitest 和 Testing Library
- pnpm（版本由 `packageManager` 字段指定）

## 安装与启动

```bash
pnpm install
Copy-Item .env.development.example .env.local
pnpm dev
```

在浏览器打开 [http://localhost:3000](http://localhost:3000)。

常用命令：

```bash
pnpm test
pnpm test:gemini # 真实模型集成测试：需先启动开发服务器并配置有效 Key
pnpm typecheck
pnpm lint
pnpm build
```

## Google Gemini 配置

1. 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建或管理 Gemini API Key。
2. 本地开发将 `.env.example` 复制为 `.env.local`，再填写 `GOOGLE_GENERATIVE_AI_API_KEY`。
3. 默认模型示例为 `gemini-3.8-flash`。本地 VPN 使用 HTTP 代理时，将 `GOOGLE_PROXY_URL` 设置为代理地址（示例为 `http://127.0.0.1:10808`）；不需要代理时留空或删除。`.env.local` 不应提交到版本控制；仅服务端代码读取 Key，不使用 `NEXT_PUBLIC_` 前缀。

聊天页面会从服务端获取当前 API Key 支持 `generateContent` 的 Gemini 模型列表，并允许选择模型。默认优先使用 `GOOGLE_MODEL`；若该模型不在可用列表中，则选择列表中的第一个模型。API Key 通过服务端请求头发送，不会放入浏览器 URL 或响应中。

### 按环境配置

| 环境 | 模板 | 配置方式 |
| --- | --- | --- |
| 开发 | `.env.example` | 复制为 `.env.local`，在本机填写 API Key，并按需设置代理地址。 |
| 测试 | `.env.test.example` | 测试使用 Mock Provider，不需要 Key；`pnpm test` 不会加载或调用 Gemini。若运行 `next` 的测试环境，可复制为 `.env.test`。 |
| 生产 | `.env.production.example` | 部署时在托管平台的生产环境变量/Secrets 设置 `GOOGLE_GENERATIVE_AI_API_KEY` 和 `GOOGLE_MODEL`，不要把真实 Key 写入 `.env.production` 或提交到仓库。 |

模板文件只提供变量名和非秘密模型默认值，不包含凭据。实际的 `.env.local`、`.env.test`、`.env.production` 等文件均被 Git 忽略。Next.js 在测试环境不会自动加载 `.env.local`；如测试确实需要环境变量，应使用专属测试配置，避免读取开发密钥。

### 真实 Gemini 调用测试

确认 `.env.development`（或 `.env.local`）已配置有效的 `GOOGLE_GENERATIVE_AI_API_KEY`、`GOOGLE_MODEL`，以及需要时配置 `GOOGLE_PROXY_URL` 后，开一个终端启动开发服务器：

```bash
pnpm dev
```

在另一个终端运行端到端调用测试：

```bash
pnpm test:gemini
```

该脚本直接使用与已验证测试相同的 Undici `ProxyAgent`、Google Provider 和 `generateText` 调用流程，先检查模型列表，再调用 `GOOGLE_MODEL` 指定的模型。Key 仅从服务端环境变量读取，使用请求头传输，不写入脚本、URL 或日志。

如果 Key 曾经出现在截图、日志或其他共享内容中，应先在 Google AI Studio 撤销该 Key，再生成新 Key 并更新本地环境变量。

## 聊天 API 调用链路

1. `Chat` 请求 `GET /api/models` 获取当前 Key 可用的模型列表，并允许用户选择模型。
2. `useChat` 和 `DefaultChatTransport` 将所选模型 ID 与完整 `UIMessage` 历史通过 `POST /api/chat` 发送。
3. Route Handler 限制请求体大小、使用 Zod 校验消息和模型 ID，并确认所选模型属于 Google 当前返回的可用列表。
4. Provider 层只从服务端环境变量创建 Google Provider 和模型；聊天服务使用 `convertToModelMessages` 转换消息，再通过 `streamText` 调用 Gemini。
5. `toUIMessageStreamResponse` 返回 AI SDK UI 流，前端边接收边渲染；客户端停止生成时，取消信号传递给模型请求。

输入校验失败返回 `400`，请求体过大返回 `413`，同步识别到上游限流时返回 `429`，服务配置或其他服务端错误返回脱敏的 `500`。模型开始流式响应后，HTTP 状态码已发送；此后的模型错误通过 AI SDK 流错误通道返回安全提示，不能再更改为新的 HTTP 状态码。

## Provider 设计与后续扩展

- `src/lib/ai/providers/google.ts` 只负责创建 Google Provider 实例。
- `src/lib/ai/provider.ts` 负责读取服务端配置并选择 Google 模型。
- `src/lib/ai/chat.ts` 负责将消息转换为模型格式并发起流式调用。
- `src/app/api/chat/route.ts` 负责 HTTP 请求校验、响应及错误状态映射，不暴露 Provider 凭据。

接入第二个供应商时，可在 `src/lib/ai/providers/` 中添加对应 Provider 初始化模块，在 Provider 选择层加入明确的供应商/模型配置，再补充其环境变量、测试及文档；不需要把供应商实现耦合到 UI 或 Route Handler。

## 生产环境注意事项

当前示例未实现用户认证、持久化限流或用量计费。上线前应在 `src/app/api/chat/route.ts` 标记的生产接入点增加认证、可靠的分布式限流和用量控制，并进一步设置模型配额、监控和请求超时。

## 项目结构

```text
src/
  app/
    api/chat/route.ts
    page.tsx
  components/chat/
    Chat.tsx
    MessageList.tsx
    ChatInput.tsx
    chat.module.css
  lib/ai/
    chat-schema.ts
    chat.ts
    provider.ts
    providers/google.ts
```
