import { z } from "zod";

export const MAX_REQUEST_BYTES = 128 * 1024;
export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_CHARS = 4_000;

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const chatMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(["user", "assistant"]),
  parts: z.array(textPartSchema).min(1).max(8),
});

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
    modelId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^gemini-[a-zA-Z0-9._-]+$/)
      .optional(),
  })
  .superRefine(({ messages }, context) => {
    if (!messages.some((message) => message.role === "user")) {
      context.addIssue({
        code: "custom",
        message: "At least one user message is required.",
        path: ["messages"],
      });
    }

    messages.forEach((message, index) => {
      const text = message.parts.map((part) => part.text).join("");

      if (text.trim().length === 0 || text.length > MAX_MESSAGE_CHARS) {
        context.addIssue({
          code: "custom",
          message: "Message text is empty or too long.",
          path: ["messages", index, "parts"],
        });
      }
    });
  });

export type ChatRequestMessage = z.infer<typeof chatMessageSchema>;
