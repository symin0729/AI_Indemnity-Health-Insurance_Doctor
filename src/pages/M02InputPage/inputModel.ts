import type { InsuranceContract, InsuranceGeneration } from "../../domain/insurance";
import type { MedicalUsage } from "../../domain/medical";
import { INTERNAL_INSURER, internalProductName } from "../../domain/displayMask";
import { isGen1ProductUnregistered, type Gen1ProductChoice } from "../../domain/gen1Product";
import type { Gen3RiderSelections } from "../../domain/gen3Riders";
import { isGen23VariantRegistered, type SamsungGen23Variant } from "../../domain/samsungGen23Variant";
import type { AnalysisCalculationAssumptions, ProductCalculationSelections, RiderEnrollmentStatus } from "../../store/useAnalysisStore";
import { getSeparateVisitWarningMessage } from "./treatmentSequence";

/**
 * 입력 화면(M02)의 검증과 저장 값 만들기. 화면(React)과 분리된 순수 함수라서 테스트할 수 있다.
 * 화면 코드는 이 결과를 받아 오류 표시, 단계 이동, 저장만 한다.
 */

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** 표시용 이름(OO)을 쓰는 경우: 1세대 외, 그리고 1세대에서 대표 상품(OO 보험)을 고른 경우 */
function usesLabelFields(input: { generation: InsuranceGeneration; gen1Product: Gen1ProductChoice }): boolean {
  return input.generation !== 1 || input.gen1Product === "SAMSUNG_0904_2";
}

/** 약관 규칙이 없는 상품 종형(1세대 다른 보험사, 2·3세대 미등록 종형)을 골랐는지 */
export function isUnregisteredVariantSelected(input: {
  generation: InsuranceGeneration;
  gen1Product: Gen1ProductChoice;
  samsungGen23Variant: SamsungGen23Variant;
}): boolean {
  return (
    (input.generation === 1 && isGen1ProductUnregistered(input.gen1Product)) ||
    ((input.generation === 2 || input.generation === 3) &&
      input.samsungGen23Variant !== "UNKNOWN" &&
      !isGen23VariantRegistered(input.samsungGen23Variant))
  );
}

/** 검증 실패 결과. 화면이 어떻게 보여줄지는 필드로 알려준다. */
export type InputFailure = {
  ok: false;
  /** 화면 상단에 표시할 오류 문구 */
  message?: string;
  /** 오류 후 이동할 입력 단계 */
  goToStep?: 1 | 2;
  /** 오류 후 초점을 둘 입력칸 id */
  focusId?: string;
  /** 문구 대신 별도 동작이 필요한 경우 */
  reveal?: "TARGET_PREMIUM_HELP" | "UNREGISTERED_VARIANT";
};

export type ContractStepInput = {
  generation: InsuranceGeneration;
  /** 사용자가 실손 세대를 직접 선택(또는 가입일로 판독)했는지 */
  generationSelected: boolean;
  insurer: string;
  productName: string;
  monthlyPremium: string;
  samsungGen23Variant: SamsungGen23Variant;
  gen1Product: Gen1ProductChoice;
  gen1D1Coverage: ProductCalculationSelections["gen1D1Coverage"];
};

/** 1세대는 실손 특약(상해/질병)을 하나 이상 가입해야 계산 대상이다. */
function isGen1CoverageMissing(input: { generation: InsuranceGeneration; gen1D1Coverage: ProductCalculationSelections["gen1D1Coverage"] }): boolean {
  return input.generation === 1 && (input.gen1D1Coverage === "NONE" || input.gen1D1Coverage === "UNKNOWN");
}

const GEN1_COVERAGE_REQUIRED_FAILURE: InputFailure = { ok: false, message: "가입한 특약을 하나 이상 선택해주세요.", focusId: "gen1-d1-injury" };

/** STEP 1(계약 정보)에서 다음 단계로 넘어가기 전 검증. 문제가 없으면 null */
export function validateContractStep(input: ContractStepInput): InputFailure | null {
  if (!input.generationSelected) {
    return { ok: false, message: "실손 세대를 선택해주세요.", focusId: "generation-select" };
  }

  if (!input.monthlyPremium || Number(input.monthlyPremium) <= 0) {
    return { ok: false, message: "현재 월 보험료를 입력해주세요." };
  }

  if (input.generation === 1 && (!input.insurer.trim() || !input.productName.trim())) {
    return { ok: false, message: "보험사와 상품명을 입력해주세요." };
  }

  if ((input.generation === 2 || input.generation === 3) && input.samsungGen23Variant === "UNKNOWN") {
    return {
      ok: false,
      message: `${input.generation}세대 실손보험의 상품 종형을 반드시 선택해주세요.`,
      focusId: "samsung-gen23-variant",
    };
  }

  if (isUnregisteredVariantSelected(input)) return { ok: false, reveal: "UNREGISTERED_VARIANT" };

  if (input.generation === 1 && input.gen1Product === "UNKNOWN") {
    return {
      ok: false,
      message: "1세대 실손보험의 가입 상품을 반드시 선택해주세요.",
      focusId: "samsung-gen1-product",
    };
  }

  if (isGen1CoverageMissing(input)) return GEN1_COVERAGE_REQUIRED_FAILURE;

  return null;
}

export type SubmissionInput = ContractStepInput & {
  insurerLabel: string;
  productLabel: string;
  inceptionDate: string;
  renewalCycleMonths: string;
  reentryCycleYears: string;
  target5GMonthlyPremium: string;
  hasTarget5GSpecialRider1: boolean;
  hasTarget5GSpecialRider2: boolean;
  plannedUsages: MedicalUsage[];
  editingUsageId: string | null;
  selectedSampleId: string | null;
  isSampleConfirmed: boolean;
  isTargetPremiumHelpConfirmed: boolean;
  isTreatmentHelpConfirmed: boolean;
  isStep3Confirmed: boolean;
  calculationAssumptions: AnalysisCalculationAssumptions;
  gen1ContractBasis: ProductCalculationSelections["gen1ContractBasis"];
  gen1D1Coverage: ProductCalculationSelections["gen1D1Coverage"];
  gen4NonCoveredRider: RiderEnrollmentStatus;
  gen5ContractType: ProductCalculationSelections["gen5ContractType"];
  gen5SevereRider: RiderEnrollmentStatus;
  gen5NonSevereRider: RiderEnrollmentStatus;
  gen3Riders: Gen3RiderSelections;
};

export type Submission = {
  ok: true;
  contract: InsuranceContract;
  target5GMonthlyPremium: number;
  target5GCoverages: string[];
  usages: MedicalUsage[];
  calculationAssumptions: AnalysisCalculationAssumptions;
  productCalculationSelections: ProductCalculationSelections;
};

/** 확인 화면으로 넘어가기 전 전체 검증과 저장할 값 만들기 */
export function buildSubmission(input: SubmissionInput): InputFailure | Submission {
  if (!input.isTargetPremiumHelpConfirmed) return { ok: false, reveal: "TARGET_PREMIUM_HELP" };
  if (!input.isTreatmentHelpConfirmed) {
    return { ok: false, message: "STEP 3의 필수 입력 안내를 읽고 확인해주세요." };
  }
  if (!input.isStep3Confirmed) {
    return { ok: false, message: "입력 내용을 확인하고 ‘예정치료를 입력하셨나요?’에 체크해주세요." };
  }
  if (input.plannedUsages.length === 0) {
    return { ok: false, message: "예정 치료를 입력한 뒤 하단의 ‘추가하기’ 버튼을 눌러 등록해주세요.", goToStep: 2 };
  }
  if (input.editingUsageId) {
    return { ok: false, message: "수정 중인 예정 치료는 ‘수정 확인’ 버튼을 눌러 저장해주세요.", goToStep: 2 };
  }

  if (!input.generationSelected) {
    return { ok: false, message: "실손 세대를 선택해주세요.", focusId: "generation-select", goToStep: 1 };
  }

  const currentPremiumNumber = Number(input.monthlyPremium);
  const targetPremiumNumber = Number(input.target5GMonthlyPremium);
  const renewalCycleNumber = input.renewalCycleMonths ? Number(input.renewalCycleMonths) : null;
  const reentryCycleNumber = input.reentryCycleYears ? Number(input.reentryCycleYears) : null;

  if (input.generation === 1 && !input.insurer.trim()) {
    return { ok: false, message: "보험사를 입력해주세요." };
  }
  if (input.generation === 1 && !input.productName.trim()) {
    return { ok: false, message: "보험 상품명을 입력해주세요." };
  }
  if (!input.inceptionDate) {
    return { ok: false, message: "보험 가입일을 입력해주세요." };
  }
  if (!isValidIsoDate(input.inceptionDate)) {
    return { ok: false, message: "보험 가입일은 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요." };
  }
  if ((input.generation === 2 || input.generation === 3) && input.samsungGen23Variant === "UNKNOWN") {
    return {
      ok: false,
      message: `${input.generation}세대 실손보험의 상품 종형을 반드시 선택해주세요.`,
      focusId: "samsung-gen23-variant",
    };
  }
  if (isUnregisteredVariantSelected(input)) return { ok: false, reveal: "UNREGISTERED_VARIANT" };
  if (input.generation === 1 && input.gen1Product === "UNKNOWN") {
    return {
      ok: false,
      message: "1세대 실손보험의 가입 상품을 반드시 선택해주세요.",
      focusId: "samsung-gen1-product",
    };
  }
  if (isGen1CoverageMissing(input)) return GEN1_COVERAGE_REQUIRED_FAILURE;
  if (!input.monthlyPremium || currentPremiumNumber <= 0) {
    return { ok: false, message: "현재 월 보험료를 올바르게 입력해주세요." };
  }
  if (renewalCycleNumber !== null && (!Number.isInteger(renewalCycleNumber) || renewalCycleNumber <= 0)) {
    return { ok: false, message: "갱신 주기는 1개월 이상의 정수로 입력하거나 비워주세요." };
  }
  if (reentryCycleNumber !== null && (!Number.isInteger(reentryCycleNumber) || reentryCycleNumber <= 0)) {
    return { ok: false, message: "재가입 주기는 1년 이상의 정수로 입력하거나 비워주세요." };
  }
  if (input.selectedSampleId && !input.isSampleConfirmed) {
    return { ok: false, message: "불러온 샘플 보험증권 정보를 확인해주세요." };
  }
  if (!input.target5GMonthlyPremium || targetPremiumNumber <= 0) {
    return { ok: false, message: "비교용 5세대 월 보험료를 올바르게 입력해주세요." };
  }

  const finalUsages = [...input.plannedUsages];
  const distinctTreatmentDates = new Set(
    finalUsages.map((usage) => usage.treatmentDate).filter((value): value is string => Boolean(value)),
  );
  if (distinctTreatmentDates.size > 1 && !input.calculationAssumptions.assumeEachOccurrenceSeparate) {
    return { ok: false, message: getSeparateVisitWarningMessage() };
  }

  const currentCoverages: string[] = [];
  if (input.generation === 5) {
    if (input.gen5SevereRider === "ENROLLED") currentCoverages.push("SPECIAL_RIDER_1");
    if (input.gen5NonSevereRider === "ENROLLED") currentCoverages.push("SPECIAL_RIDER_2");
  } else if (input.generation === 4 && input.gen4NonCoveredRider === "ENROLLED") {
    // 기존 세대의 현재 MVP 비급여 특약 확인값. G3_MRI_OUTPATIENT 같은 기존세대 룰과 연결한다.
    currentCoverages.push("NON_COVERED");
  }

  const target5GCoverages: string[] = [];
  if (input.hasTarget5GSpecialRider1) target5GCoverages.push("SPECIAL_RIDER_1");
  if (input.hasTarget5GSpecialRider2) target5GCoverages.push("SPECIAL_RIDER_2");

  return {
    ok: true,
    contract: {
      insurer: input.generation === 1 ? input.insurer.trim() : INTERNAL_INSURER,
      productName: input.generation === 1 ? input.productName.trim() : internalProductName(input.generation),
      insurerLabel: usesLabelFields(input) ? input.insurerLabel.trim() || undefined : undefined,
      productLabel: usesLabelFields(input) ? input.productLabel.trim() || undefined : undefined,
      inceptionDate: input.inceptionDate,
      generation: input.generation,
      monthlyPremium: currentPremiumNumber,
      renewalCycleMonths: renewalCycleNumber,
      reentryCycleMonths: reentryCycleNumber === null ? null : reentryCycleNumber * 12,
      coverages: currentCoverages,
    },
    target5GMonthlyPremium: targetPremiumNumber,
    target5GCoverages,
    usages: finalUsages,
    calculationAssumptions: input.calculationAssumptions,
    productCalculationSelections: {
      gen1Product: input.gen1Product,
      gen1ContractBasis: input.gen1ContractBasis,
      gen1D1Coverage: input.gen1D1Coverage,
      gen4NonCoveredRider: input.gen4NonCoveredRider,
      gen5ContractType: input.gen5ContractType,
      gen5SevereRider: input.gen5SevereRider,
      gen5NonSevereRider: input.gen5NonSevereRider,
      samsungGen23Variant: input.samsungGen23Variant,
      gen3Riders: input.gen3Riders,
    },
  };
}
