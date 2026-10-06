import { z } from "zod";

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(300),
  mode: z.literal("GENERAL"),
  consentGranted: z.literal(true),
  consentPolicyVersion: z.literal("ai-chat-1.0"),
  context: z.object({
    screen: z.enum(["START", "INPUT", "CONFIRM", "RESULT"]),
    productCode: z.string().min(1).optional(),
    generation: z.number().int().min(1).max(5).optional(),
    coverageCode: z.string().min(1).optional(),
  }).optional(),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  keyPoints: z.array(z.string()),
  sources: z.array(z.object({
    documentId: z.string(),
    title: z.string(),
    organization: z.string(),
    section: z.string().optional(),
    publishedAt: z.string().optional(),
    verifiedAt: z.string(),
    url: z.string().url(),
  })),
  confirmations: z.array(z.string()),
  status: z.enum(["ANSWERED", "INSUFFICIENT_EVIDENCE", "OUT_OF_SCOPE", "PRIVACY_BLOCKED", "FALLBACK"]),
  fallback: z.boolean(),
  requestId: z.string(),
  noticeId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
