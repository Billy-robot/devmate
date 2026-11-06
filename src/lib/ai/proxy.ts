import { getGlobalDispatcher, ProxyAgent, setGlobalDispatcher } from "undici";

let configuredProxyUrl: string | undefined;
let configuredDispatcher: ProxyAgent | undefined;

export function configureUndiciProxy(proxyUrl?: string): void {
  const normalizedProxyUrl = proxyUrl?.trim();

  if (!normalizedProxyUrl) {
    return;
  }

  const parsedUrl = new URL(normalizedProxyUrl);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Google proxy URL must use HTTP or HTTPS.");
  }

  const proxyHref = parsedUrl.href;
  const currentDispatcher = getGlobalDispatcher();

  if (
    proxyHref === configuredProxyUrl &&
    currentDispatcher === configuredDispatcher
  ) {
    return;
  }

  if (!configuredDispatcher || proxyHref !== configuredProxyUrl) {
    configuredDispatcher = new ProxyAgent(parsedUrl.href);
  }

  if (currentDispatcher !== configuredDispatcher) {
    setGlobalDispatcher(configuredDispatcher);
  }

  configuredProxyUrl = proxyHref;
}
