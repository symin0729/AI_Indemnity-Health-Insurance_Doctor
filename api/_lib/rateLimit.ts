// 무료 플랜용 호출 횟수 제한. 외부 저장소 없이 함수 인스턴스 메모리에만 기록한다.
// 인스턴스가 여러 개이거나 재시작되면 기록이 나뉘므로 완벽한 차단이 아니라 비용 폭주를 막는 안전망이다.
// 더 강한 제한은 Vercel Firewall 의 Rate Limit 규칙과 Google AI Studio 쿼터로 함께 건다.

export interface RateLimitOptions {
  perMinute: number;
  perDay: number;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MAX_TRACKED_CLIENTS = 5000;

const minuteHits = new Map<string, number[]>();
let dayWindowStart = 0;
let dayCount = 0;

/** Vercel 이 붙여 주는 헤더에서 호출자 IP 를 읽는다. 없으면 한 묶음("unknown")으로 센다. */
export const clientKey = (request: Request): string =>
  request.headers.get("x-real-ip")?.trim() ||
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";

export const checkRateLimit = (key: string, options: RateLimitOptions, now = Date.now()): RateLimitResult => {
  if (now - dayWindowStart >= DAY_MS) {
    dayWindowStart = now;
    dayCount = 0;
  }
  if (dayCount >= options.perDay) {
    return { allowed: false, retryAfterSeconds: Math.ceil((dayWindowStart + DAY_MS - now) / 1000) };
  }

  const recent = (minuteHits.get(key) ?? []).filter((time) => now - time < MINUTE_MS);
  if (recent.length >= options.perMinute) {
    minuteHits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + MINUTE_MS - now) / 1000)) };
  }

  recent.push(now);
  minuteHits.set(key, recent);
  dayCount += 1;
  // 메모리가 끝없이 늘지 않도록 오래된 항목을 정리한다.
  if (minuteHits.size > MAX_TRACKED_CLIENTS) {
    for (const [other, times] of minuteHits) {
      if (times.every((time) => now - time >= MINUTE_MS)) minuteHits.delete(other);
    }
  }
  return { allowed: true };
};

export const resetRateLimit = (): void => {
  minuteHits.clear();
  dayWindowStart = 0;
  dayCount = 0;
};
