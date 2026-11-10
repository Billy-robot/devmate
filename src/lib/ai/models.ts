import { z } from "zod";

import { configureUndiciProxy } from "./proxy";

const GOOGLE_MODELS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_MODEL_PAGES = 10;

const googleModelSchema = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  supportedGenerationMethods: z.array(z.string()).optional(),
});

const googleModelsResponseSchema = z.object({
  models: z.array(googleModelSchema).optional(),
  nextPageToken: z.string().optional(),
});

export type GoogleModelOption = {
  id: string;
  name: string;
};

export class GoogleModelListError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "GoogleModelListError";
  }
}

export async function fetchGoogleModels(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<GoogleModelOption[]> {
  const models: GoogleModelOption[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_MODEL_PAGES; page += 1) {
    const url = new URL(GOOGLE_MODELS_URL);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    let response: Response;
    try {
      response = await fetcher(url, {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new GoogleModelListError(
        error instanceof Error ? error.message : "Google model request failed.",
      );
    }

    if (!response.ok) {
      throw new GoogleModelListError(
        "Google model list request failed.",
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GoogleModelListError("Google returned invalid model data.");
    }

    const parsed = googleModelsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new GoogleModelListError("Google returned invalid model data.");
    }

    models.push(
      ...(parsed.data.models ?? [])
        .filter((model) =>
          model.supportedGenerationMethods?.includes("generateContent"),
        )
        .filter((model) => model.name.startsWith("models/gemini-"))
        .map((model) => ({
          id: model.name.slice("models/".length),
          name: model.displayName?.trim() || model.name.slice("models/".length),
        })),
    );

    pageToken = parsed.data.nextPageToken;
    if (!pageToken) {
      break;
    }
  }

  return [...new Map(models.map((model) => [model.id, model])).values()].sort(
    (left, right) => left.id.localeCompare(right.id),
  );
}

let cachedModels: { expiresAt: number; models: GoogleModelOption[] } | undefined;
let pendingModelRequest: Promise<GoogleModelOption[]> | undefined;

export async function getGoogleModels(
  env: Record<string, string | undefined> = process.env,
): Promise<GoogleModelOption[]> {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!apiKey) {
    throw new GoogleModelListError(
      "Required AI configuration is missing: GOOGLE_GENERATIVE_AI_API_KEY",
    );
  }

  configureUndiciProxy(env);

  if (cachedModels && cachedModels.expiresAt > Date.now()) {
    return cachedModels.models;
  }

  if (!pendingModelRequest) {
    pendingModelRequest = fetchGoogleModels(apiKey)
      .then((models) => {
        cachedModels = { models, expiresAt: Date.now() + 5 * 60 * 1000 };
        return models;
      })
      .finally(() => {
        pendingModelRequest = undefined;
      });
  }

  return pendingModelRequest;
}

export async function isGoogleModelAvailable(
  modelId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const models = await getGoogleModels(env);
  return models.some((model) => model.id === modelId);
}
