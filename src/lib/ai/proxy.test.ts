import {
  getGlobalDispatcher,
  ProxyAgent,
  setGlobalDispatcher,
} from "undici";
import { describe, expect, it } from "vitest";

import { configureUndiciProxy } from "./proxy";

describe("Undici proxy configuration", () => {
  it("uses the configured proxy dispatcher", () => {
    const originalDispatcher = getGlobalDispatcher();

    try {
      configureUndiciProxy({
        GOOGLE_PROXY_URL: "http://127.0.0.1:10808",
      });

      expect(getGlobalDispatcher()).toBeInstanceOf(ProxyAgent);
    } finally {
      setGlobalDispatcher(originalDispatcher);
    }
  });

  it("does not change the dispatcher when no proxy is configured", () => {
    const originalDispatcher = getGlobalDispatcher();

    configureUndiciProxy({});

    expect(getGlobalDispatcher()).toBe(originalDispatcher);
  });

  it("rejects unsupported proxy protocols", () => {
    expect(() =>
      configureUndiciProxy({ GOOGLE_PROXY_URL: "socks5://127.0.0.1:10808" }),
    ).toThrow("GOOGLE_PROXY_URL must use HTTP or HTTPS.");
  });
});
