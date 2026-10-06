import { MASKED_INSURER, MASKED_PRODUCT_NAME } from "../../domain/displayMask";
import type { Gen1ProductChoice } from "../../domain/gen1Product";
import { GEN3_RIDER_DEFAULT, type Gen3RiderSelections } from "../../domain/gen3Riders";
import type { InsuranceGeneration } from "../../domain/insurance";
import { formatInceptionDateInput, generationForInceptionDate, inceptionDateForGeneration } from "../../domain/insuranceInputDefaults";
import type { SamsungGen23Variant } from "../../domain/samsungGen23Variant";
import type { InsuranceContract } from "../../domain/insurance";
import type { RiderEnrollmentStatus } from "../../store/useAnalysisStore";
import { GEN23_SAMPLE_CONTRACT_DETAILS, type ContractDetailForm } from "../../domain/contractDetails";

/**
 * STEP 1(고객 보험 정보)의 입력이 서로 어떻게 영향을 주는지를 한 곳에 모은 규칙이다.
 * 각 함수는 "어떤 값을 어떻게 바꿀지"만 돌려주고(Patch), 화면(훅)은 그대로 적용한다.
 *
 * 규칙 요약
 *  - 실손 세대를 고르면: 가입일은 그 세대의 기본 날짜, 이름·상품 종형·특약·샘플 상태는 초기화.
 *      샘플을 불러온 상태였다면 샘플이 채운 월 보험료·주기도 함께 비운다.
 *  - 가입일을 입력하면: 상품 종형·특약 선택은 초기화하고, 가입일이 1~4세대 시기이면 세대를 그에 맞춘다.
 *      5세대 시기 가입일은 세대를 바꾸지 않는다(현재 계약은 1~4세대만 입력).
 *  - 샘플 불러오기: 현재 계약(STEP 1)만 채운다.
 *  - STEP 1 초기화: STEP 1 입력만 비운다.
 */
export type ContractPatch = Partial<{
  generation: InsuranceGeneration;
  isGenerationSelected: boolean;
  inceptionDate: string;
  insurerLabel: string;
  productLabel: string;
  gen1Product: Gen1ProductChoice;
  gen1D1Coverage: "INJURY" | "DISEASE" | "BOTH" | "NONE";
  gen1ContractBasis: "SAMPLE_SIMULATION" | "ACTUAL_CONTRACT";
  samsungGen23Variant: SamsungGen23Variant;
  gen4NonCoveredRider: RiderEnrollmentStatus;
  gen3Riders: Gen3RiderSelections;
  monthlyPremium: string;
  renewalCycleMonths: string;
  reentryCycleYears: string;
  selectedSampleId: string | null;
  isSampleConfirmed: boolean;
  /** 가입금액·다른 실손·보장기간 등 계약 상세 */
  contractDetails: ContractDetailForm;
}>;

/** 상품 종형·특약 선택(세대 공통)을 처음 상태로 되돌린다. 가입일이 바뀔 때 쓴다. */
export const PRODUCT_TYPE_RESET = {
  gen1Product: "UNKNOWN",
  samsungGen23Variant: "UNKNOWN",
  gen4NonCoveredRider: "NOT_ENROLLED",
  gen3Riders: GEN3_RIDER_DEFAULT,
  // 세대·상품 구조가 바뀌면 그 세대에 맞춰 입력한 가입금액·계약 상세도 다시 입력한다.
  contractDetails: {},
} as const satisfies ContractPatch;

/** 세대를 바꿀 때는 1세대 특약 선택도 함께 되돌린다. */
export const GENERATION_CHANGE_RESET = { ...PRODUCT_TYPE_RESET, gen1D1Coverage: "NONE" } as const satisfies ContractPatch;

/** 실손 세대를 선택했을 때(같은 세대를 다시 골라도 같다) */
export function generationSelectedPatch(selected: Exclude<InsuranceGeneration, 5>, state: { selectedSampleId: string | null }): ContractPatch {
  return {
    ...GENERATION_CHANGE_RESET,
    generation: selected,
    isGenerationSelected: true,
    inceptionDate: inceptionDateForGeneration(selected),
    insurerLabel: "",
    productLabel: "",
    selectedSampleId: null,
    isSampleConfirmed: false,
    // 샘플이 채운 값이 다른 세대 입력에 남지 않도록 비운다.
    ...(state.selectedSampleId !== null ? { monthlyPremium: "", renewalCycleMonths: "", reentryCycleYears: "" } : {}),
  };
}

/** 가입일을 입력(또는 달력에서 선택)했을 때 */
export function inceptionDateTypedPatch(raw: string): ContractPatch {
  const inceptionDate = formatInceptionDateInput(raw);
  const detected = generationForInceptionDate(inceptionDate);
  return {
    ...PRODUCT_TYPE_RESET,
    inceptionDate,
    ...(detected !== undefined && detected !== 5 ? { generation: detected, isGenerationSelected: true } : {}),
  };
}

/** STEP 1의 샘플 불러오기: 현재 계약만 채운다. */
export function samplePolicyPatch(sampleId: string, sample: InsuranceContract): ContractPatch {
  const generation = sample.generation;
  return {
    ...GENERATION_CHANGE_RESET,
    generation,
    isGenerationSelected: true,
    inceptionDate: sample.inceptionDate,
    // 1세대 외에는 실제 이름 대신 OO 이름을 자동으로 채운다.
    insurerLabel: generation === 1 ? "" : MASKED_INSURER,
    productLabel: generation === 1 ? "" : MASKED_PRODUCT_NAME,
    // 2·3세대 샘플은 상품 종형을 표준형으로 선택하고, 특약은 하나도 선택하지 않은 상태로 시작한다.
    ...(generation === 2 || generation === 3 ? { samsungGen23Variant: "standard" as const } : {}),
    ...(generation === 4 ? { gen4NonCoveredRider: "ENROLLED" as const } : {}),
    // 2·3세대 샘플은 가입금액·계약 상세도 설명용 값으로 채운다(4세대는 비워 약관상 최대값을 가정).
    ...(generation === 2 || generation === 3 ? { contractDetails: GEN23_SAMPLE_CONTRACT_DETAILS } : {}),
    monthlyPremium: String(sample.monthlyPremium),
    renewalCycleMonths: sample.renewalCycleMonths != null ? String(sample.renewalCycleMonths) : "",
    reentryCycleYears: sample.reentryCycleMonths != null ? String(sample.reentryCycleMonths / 12) : "",
    selectedSampleId: sampleId,
    isSampleConfirmed: true,
  };
}

/** STEP 1 초기화 버튼: STEP 1 입력만 비운다. */
export function contractStepResetPatch(): ContractPatch {
  return {
    ...GENERATION_CHANGE_RESET,
    generation: 3,
    isGenerationSelected: false,
    inceptionDate: "",
    insurerLabel: "",
    productLabel: "",
    gen1ContractBasis: "SAMPLE_SIMULATION",
    monthlyPremium: "",
    renewalCycleMonths: "",
    reentryCycleYears: "",
    selectedSampleId: null,
    isSampleConfirmed: false,
  };
}
