import type { CareSetting, MedicalUsage } from "./medical";

export function genericGen23CareSetting(value: string | undefined): CareSetting | undefined {
  if (value === "INPATIENT") return "INPATIENT";
  if (value === "OUTPATIENT" || value === "PRESCRIPTION") return "OUTPATIENT";
  return undefined;
}

export function syncGen23CareSetting(care: CareSetting, previous: string | undefined): string {
  // 처방은 통원의 하위 구분이므로 통원을 다시 선택해도 보존한다.
  return care === "OUTPATIENT" && previous === "PRESCRIPTION" ? previous : care;
}

export function gen23CareSettingError(usage: Pick<MedicalUsage, "careSetting" | "gen23CareSetting">): string | undefined {
  if (!usage.gen23CareSetting) return undefined; // 미입력 검증은 기존 adapter 정책을 유지한다.
  const expected = genericGen23CareSetting(usage.gen23CareSetting);
  if (!expected || expected !== usage.careSetting) return "입원·통원 선택과 2·3세대 계산 구분이 불일치합니다. 입력을 수정해주세요.";
  return undefined;
}

export function gen23CareSettingLabel(usage: Pick<MedicalUsage, "careSetting" | "gen23CareSetting">): string {
  const error = gen23CareSettingError(usage);
  if (error) return error;
  if (!usage.gen23CareSetting) return "입원·외래·처방 확인 필요";
  return usage.gen23CareSetting === "INPATIENT" ? "입원" : usage.gen23CareSetting === "PRESCRIPTION" ? "처방(통원)" : "통원";
}
