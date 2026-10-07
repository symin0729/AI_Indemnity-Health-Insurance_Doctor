import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientKey, resetRateLimit } from "./rateLimit.js";

const options = { perMinute: 2, perDay: 3 };

beforeEach(() => resetRateLimit());

describe("checkRateLimit", () => {
  it("분당 한도를 넘으면 막고 1분이 지나면 다시 허용한다", () => {
    const start = 1_000_000;
    expect(checkRateLimit("a", options, start).allowed).toBe(true);
    expect(checkRateLimit("a", options, start + 1000).allowed).toBe(true);
    const blocked = checkRateLimit("a", options, start + 2000);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 58 });
    expect(checkRateLimit("a", options, start + 61_000).allowed).toBe(true);
  });

  it("IP 마다 따로 센다", () => {
    expect(checkRateLimit("a", options, 1000).allowed).toBe(true);
    expect(checkRateLimit("a", options, 1001).allowed).toBe(true);
    expect(checkRateLimit("b", options, 1002).allowed).toBe(true);
  });

  it("전체 하루 한도를 넘으면 모두 막는다", () => {
    expect(checkRateLimit("a", options, 1000).allowed).toBe(true);
    expect(checkRateLimit("b", options, 1001).allowed).toBe(true);
    expect(checkRateLimit("c", options, 1002).allowed).toBe(true);
    expect(checkRateLimit("d", options, 1003).allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("x-real-ip, x-forwarded-for 순으로 읽는다", () => {
    expect(clientKey(new Request("http://x", { headers: { "x-real-ip": "1.1.1.1" } }))).toBe("1.1.1.1");
    expect(clientKey(new Request("http://x", { headers: { "x-forwarded-for": "2.2.2.2, 3.3.3.3" } }))).toBe("2.2.2.2");
    expect(clientKey(new Request("http://x"))).toBe("unknown");
  });
});
