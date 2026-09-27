import { z } from "zod";
import type { ChatRequest } from "./types";

const chatRequestSchema = z.object({
  question: z.string().trim().min(1),
  mode: z.literal("GENERAL"),
  consentGranted: z.boolean(),
  consentPolicyVersion: z.string().min(1),
  context: z
    .object({ screen: z.enum(["START", "INPUT", "CONFIRM", "RESULT"]) })
    .optional(),
}).strict();

export class InputValidationError extends Error {
  readonly code = "INVALID_REQUEST";
}

export const validateInput = (value: unknown, maxLength: number): ChatRequest => {
  const result = chatRequestSchema.safeParse(value);
  if (!result.success) {
    throw new InputValidationError("요청 형식이 올바르지 않습니다.");
  }
  if ([...result.data.question].length > maxLength) {
    throw new InputValidationError(`질문은 ${maxLength}자 이내로 입력해주세요.`);
  }
  return result.data;
};
