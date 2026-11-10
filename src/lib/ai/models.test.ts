import { describe, expect, it, vi } from "vitest";

import { fetchGoogleModels } from "./models";

describe("Google Gemini model discovery", () => {
  it("lists only models that support generateContent and sends the key in a header", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-embedding-001",
            supportedGenerationMethods: ["embedContent"],
          },
          {
            name: "models/other-provider-model",
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    );

    const models = await fetchGoogleModels("test-key", fetcher);

    expect(models).toEqual([
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { "x-goog-api-key": "test-key" },
      }),
    );
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("test-key");
  });

  it("fails explicitly when the Google API rejects model listing", async () => {
    const fetcher: typeof fetch = async () =>
      new Response("{}", { status: 403 });

    await expect(fetchGoogleModels("test-key", fetcher)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
