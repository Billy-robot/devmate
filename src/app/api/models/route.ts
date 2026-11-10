import { getGoogleModels, GoogleModelListError } from "@/lib/ai/models";

type ModelLoader = () => ReturnType<typeof getGoogleModels>;

export function createModelsGetHandler(
  loadModels: ModelLoader = () => getGoogleModels(),
  configuredModel = process.env.GOOGLE_MODEL?.trim(),
) {
  return async function GET(): Promise<Response> {
    try {
      const models = await loadModels();
      const defaultModel =
        models.find((model) => model.id === configuredModel)?.id ??
        models[0]?.id;

      return Response.json({ models, defaultModel });
    } catch (error) {
      const status =
        error instanceof GoogleModelListError && error.statusCode === 429
          ? 429
          : 500;

      console.error("[api/models] Model list request failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        ...(error instanceof GoogleModelListError &&
        error.statusCode !== undefined
          ? { statusCode: error.statusCode }
          : {}),
      });

      return Response.json(
        {
          error:
            status === 429
              ? "模型列表请求过于频繁，请稍后重试。"
              : "暂时无法获取 Gemini 模型列表。",
        },
        { status },
      );
    }
  };
}

export const GET = createModelsGetHandler();
