import { afterEach, describe, expect, it, vi } from "vitest";
import explainHandler from "../api/explain";

const request = (body: unknown) => new Request("http://localhost/api/explain", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("calculation explanation API safety", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("계약·치료·계산 데이터를 외부 서비스로 전송하지 않는다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await explainHandler(request({
      productCode: "SAMSUNG_2107_1",
      generation: 4,
      calculation: {
        contract: { policyNumber: "PRIVATE-1234" },
        treatment: { diagnosis: "private" },
        insuranceBenefit: 80000,
      },
      consentGranted: true,
      consentPolicyVersion: "ai-chat-1.0",
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "FEATURE_DISABLED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("동의가 없으면 기능 상태와 관계없이 차단한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await explainHandler(request({
      productCode: "SAMSUNG_2107_1",
      generation: 4,
      calculation: {},
      consentGranted: false,
      consentPolicyVersion: "ai-chat-1.0",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "CONSENT_REQUIRED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
