import {
  chatRequestSchema,
  chatResponseSchema,
  type ChatRequest,
  type ChatResponse,
} from "../features/chatbot/chatbot.schema";

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class ChatApiError extends Error {
  readonly code: string;

  constructor(
    message: string,
    code = "CHAT_API_ERROR",
  ) {
    super(message);
    this.code = code;
  }
}

export const chatApiService = {
  async ask(input: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    const request = chatRequestSchema.parse(input);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as ApiErrorBody;
      throw new ChatApiError(
        body.error?.message ?? "보험 이해 도우미 연결에 실패했습니다.",
        body.error?.code,
      );
    }
    return chatResponseSchema.parse(await response.json());
  },
};
