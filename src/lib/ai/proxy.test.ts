import { describe, expect, it } from "vitest";
import {
  getGlobalDispatcher,
  ProxyAgent,
  setGlobalDispatcher,
} from "undici";

import { configureUndiciProxy } from "./proxy";

describe("Google Gemini proxy", () => {
  it("keeps the existing dispatcher when no proxy is configured", () => {
    const originalDispatcher = getGlobalDispatcher();

    configureUndiciProxy();
    configureUndiciProxy("  ");

    expect(getGlobalDispatcher()).toBe(originalDispatcher);
  });

  it("sets an Undici ProxyAgent for the configured HTTP proxy", () => {
    const originalDispatcher = getGlobalDispatcher();

    try {
      configureUndiciProxy("http://127.0.0.1:10808");

      expect(getGlobalDispatcher()).toBeInstanceOf(ProxyAgent);
    } finally {
      setGlobalDispatcher(originalDispatcher);
    }
  });

  it("rejects proxy protocols unsupported by Undici ProxyAgent", () => {
    expect(() => configureUndiciProxy("socks5://127.0.0.1:10808")).toThrow(
      "Google proxy URL must use HTTP or HTTPS.",
    );
  });
});
