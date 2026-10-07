// 운영 모니터링용 요청 로그. 질문 원문·답변·개인정보는 남기지 않고 요청 ID, 처리 결과, 처리 시간만 한 줄(JSON)로 기록한다.
// Vercel 함수 로그에서 오류율·거절 비율·한도 초과를 확인하는 용도다.

export interface RequestLogEntry {
  requestId: string;
  httpStatus: number;
  /** 응답 본문의 status(ANSWERED, FALLBACK 등) 또는 error.code(RATE_LIMITED 등) */
  result: string;
  /** 거절 안내 유형(OUT-01 등). 없으면 생략 */
  noticeId?: string;
  ms: number;
}

const field = (value: unknown): string | undefined => (typeof value === "string" ? value.slice(0, 40) : undefined);

/** 응답 본문에서 로그에 필요한 필드만 뽑는다. 본문을 읽지 못하면 UNKNOWN */
export const summarizeResponse = async (response: Response): Promise<Pick<RequestLogEntry, "requestId" | "result" | "noticeId">> => {
  try {
    const body = (await response.clone().json()) as Record<string, unknown>;
    const error = body.error as Record<string, unknown> | undefined;
    return {
      requestId: field(body.requestId) ?? "unknown",
      result: field(body.status) ?? field(error?.code) ?? "UNKNOWN",
      ...(field(body.noticeId) ? { noticeId: field(body.noticeId) } : {}),
    };
  } catch {
    return { requestId: "unknown", result: "UNKNOWN" };
  }
};

/** 핸들러를 감싸 요청마다 로그 한 줄을 남긴다. 로그 실패가 응답에 영향을 주지 않는다 */
export const withRequestLog = (name: string, handler: (request: Request) => Promise<Response>) =>
  async (request: Request): Promise<Response> => {
    const started = Date.now();
    const response = await handler(request);
    try {
      const summary = await summarizeResponse(response);
      const entry: RequestLogEntry = { ...summary, httpStatus: response.status, ms: Date.now() - started };
      console.info(JSON.stringify({ api: name, ...entry }));
    } catch {
      // 로그는 부가 기능이다
    }
    return response;
  };
