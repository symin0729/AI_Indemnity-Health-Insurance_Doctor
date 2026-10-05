import { describe, expect, it } from "vitest";
import { GEN3_RIDERS, GEN3_RIDER_DEFAULT, gen3EnrollmentForTreatment, gen3RiderKeyForTreatment } from "../src/domain/gen3Riders";

describe("3세대 특약 가입 여부", () => {
  it("특약은 3종이고 기본값은 모두 미가입이다", () => {
    expect(GEN3_RIDERS.map((r) => r.key)).toEqual(["manualTherapy", "injection", "mri"]);
    expect(Object.values(GEN3_RIDER_DEFAULT)).toEqual(["NOT_ENROLLED", "NOT_ENROLLED", "NOT_ENROLLED"]);
  });
  it("치료 분류별로 해당 특약을 찾는다", () => {
    expect(gen3RiderKeyForTreatment("MANUAL_THERAPY")).toBe("manualTherapy");
    expect(gen3RiderKeyForTreatment("INJECTION")).toBe("injection");
    expect(gen3RiderKeyForTreatment("MRI")).toBe("mri");
    expect(gen3RiderKeyForTreatment("BASE")).toBeUndefined();
    expect(gen3RiderKeyForTreatment(undefined)).toBeUndefined();
  });
  it("치료 분류별로 체크한 특약의 가입 상태를 가져온다", () => {
    const riders = { manualTherapy: "ENROLLED", injection: "NOT_ENROLLED", mri: "ENROLLED" } as const;
    expect(gen3EnrollmentForTreatment("BASE", riders)).toBe("ENROLLED");
    expect(gen3EnrollmentForTreatment("MANUAL_THERAPY", riders)).toBe("ENROLLED");
    expect(gen3EnrollmentForTreatment("INJECTION", riders)).toBe("NOT_ENROLLED");
    expect(gen3EnrollmentForTreatment("MRI", riders)).toBe("ENROLLED");
  });
  it("계약 단계 값이 없거나 알 수 없으면 덮어쓰지 않는다", () => {
    expect(gen3EnrollmentForTreatment("INJECTION", undefined)).toBeUndefined();
    expect(gen3EnrollmentForTreatment("MRI", { manualTherapy: "UNKNOWN", injection: "UNKNOWN", mri: "UNKNOWN" })).toBeUndefined();
    expect(gen3EnrollmentForTreatment(undefined, GEN3_RIDER_DEFAULT)).toBeUndefined();
  });
});
