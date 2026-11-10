import { getGlobalDispatcher, ProxyAgent, setGlobalDispatcher } from "undici";

let proxyUrl: string | undefined;
let proxyAgent: ProxyAgent | undefined;

export function configureUndiciProxy(
  env: Record<string, string | undefined> = process.env,
): void {
  const configuredUrl = env.GOOGLE_PROXY_URL?.trim();

  if (!configuredUrl) {
    return;
  }

  const parsedUrl = new URL(configuredUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("GOOGLE_PROXY_URL must use HTTP or HTTPS.");
  }

  const normalizedUrl = parsedUrl.href;
  const currentDispatcher = getGlobalDispatcher();

  if (normalizedUrl === proxyUrl && currentDispatcher === proxyAgent) {
    return;
  }

  if (!proxyAgent || normalizedUrl !== proxyUrl) {
    proxyAgent = new ProxyAgent(normalizedUrl);
  }

  if (currentDispatcher !== proxyAgent) {
    setGlobalDispatcher(proxyAgent);
  }

  proxyUrl = normalizedUrl;
}
