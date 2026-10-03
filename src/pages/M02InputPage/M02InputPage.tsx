import { SamsungPrecisionInputs } from '../../components/samsung/SamsungPrecisionInputs';
import { InputHelp } from "../../components/InputHelp";
import { shouldDisableAddTreatmentButton } from "./treatmentButtonState";
import { createDraftFromUsage, createEmptyTreatmentDraft, getSeparateVisitWarningMessage, getTreatmentAddButtonLabel, getTreatmentAdditionalInfoFields, getTreatmentAddLabel, type TreatmentDraft } from "./treatmentSequence";
import { generationForInceptionDate, generalPatientCopayPercent, type CopayInstitution, type CopayRegion } from "../../domain/insuranceInputDefaults";
import { genericGen23CareSetting, syncGen23CareSetting, gen23CareSettingError } from "../../domain/samsungGen23CareSetting";
import { Gen23Inputs } from "../../components/samsung/Gen23Inputs";
import { parseGen23Form, restoreGen23Form, type Gen23FormState } from "../../domain/samsungGen23Form";
import AppShell from "../../components/AppShell";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type {
  BenefitClass,
  CareSetting,
  MedicalInstitutionType,
  MedicalUsage,
  SeverityClass,
  ClaimCause,
  NationalHealthInsuranceStatus,
} from "../../domain/medical";

import type { InsuranceGeneration } from "../../domain/insurance";

import {
  SAMPLE_POLICY_OPTIONS,
  samplePolicyService,
  type SampleId,
} from "../../services/samplePolicyService";

import {
  sampleScenarioService,
  loadTreatmentSample,
  type TreatmentSampleKind,
} from "../../services/sampleScenarioService";

import {
  useAnalysisStore,
  type RiderEnrollmentStatus,
  type SamsungGen23Variant,
} from "../../store/useAnalysisStore";


function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatWonInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

function getWonInputValue(value: string): string {
  return value.replace(/\D/g, "");
}

function IsoDateInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    try {
      if (typeof picker.showPicker === "function") {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    } catch {
      picker.focus();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={10}
        style={{
          width: "100%",
          boxSizing: "border-box",
          paddingRight: "48px",
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        aria-label="달력에서 날짜 선택"
        title="달력에서 날짜 선택"
        style={{
          position: "absolute",
          top: "50%",
          right: "10px",
          transform: "translateY(-50%)",
          display: "grid",
          placeItems: "center",
          width: "34px",
          height: "34px",
          padding: 0,
          border: 0,
          borderRadius: "9px",
          background: "transparent",
          color: "var(--color-primary-700, #1f5f99)",
          cursor: "pointer",
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8 3V7M16 3V7M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 17H8.01M12 17H12.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      <input
        ref={pickerRef}
        type="date"
        value={isValidIsoDate(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function M02InputPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(() => {
    const hashStep = Number(window.location.hash.match(/input-step-(\d)/)?.[1]);
    return hashStep === 2 || hashStep === 3 ? hashStep : 1;
  });
  const [transitionDirection, setTransitionDirection] =
    useState<"forward" | "backward">("forward");

  const goToInputStep = (step: 1 | 2 | 3) => {
    setTransitionDirection(step >= activeStep ? "forward" : "backward");
    setActiveStep(step);
    window.history.replaceState(null, "", `/input#input-step-${step}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };


  const MAX_TREATMENTS = 3;

  // ========================================
  // Store 기존 데이터
  // ========================================

  const savedContract = useAnalysisStore(
    (state) => state.contract
  );

  const savedTarget5GMonthlyPremium =
    useAnalysisStore(
      (state) =>
        state.target5GMonthlyPremium
    );

  const savedTarget5GCoverages =
    useAnalysisStore(
      (state) =>
        state.target5GCoverages
    );

  const savedUsages = useAnalysisStore(
    (state) => state.usages
  );

  const savedCalculationAssumptions =
    useAnalysisStore(
      (state) =>
        state.calculationAssumptions
    );

  const savedProductCalculationSelections = useAnalysisStore((state) => state.productCalculationSelections);

  // ========================================
  // Store setter
  // ========================================

  const setContract = useAnalysisStore(
    (state) => state.setContract
  );

  const setTarget5GMonthlyPremium =
    useAnalysisStore(
      (state) =>
        state.setTarget5GMonthlyPremium
    );

  const setTarget5GCoverages =
    useAnalysisStore(
      (state) =>
        state.setTarget5GCoverages
    );

  const setUsages = useAnalysisStore(
    (state) => state.setUsages
  );

  const setCalculationAssumptions =
    useAnalysisStore(
      (state) =>
        state.setCalculationAssumptions
    );

  const setProductCalculationSelections = useAnalysisStore((state) => state.setProductCalculationSelections);

  const resetAnalysis = useAnalysisStore(
    (state) => state.resetAnalysis
  );

  // ========================================
  // 현재 계약
  // ========================================

  const [insurer, setInsurer] =
    useState(
      savedContract?.insurer ?? ""
    );

  const [productName, setProductName] =
    useState(
      savedContract?.productName ?? ""
    );

  const [inceptionDate, setInceptionDate] =
    useState(
      savedContract?.inceptionDate ?? ""
    );

  const [generation, setGeneration] =
    useState<InsuranceGeneration>(
      savedContract?.generation ?? 3
    );

  const [gen4NonCoveredRider, setGen4NonCoveredRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen4NonCoveredRider
  );

const [gen1Product, setGen1Product] =
  useState(
    savedProductCalculationSelections.gen1Product
  );

const [samsungGen23Variant, setSamsungGen23Variant] =
  useState<SamsungGen23Variant>(
    savedProductCalculationSelections.samsungGen23Variant
  );

const [gen1ContractBasis, setGen1ContractBasis] =
  useState(
    savedProductCalculationSelections.gen1ContractBasis
  );

const [gen1D1Coverage, setGen1D1Coverage] =
  useState(
    savedProductCalculationSelections.gen1D1Coverage
  );

const [gen5ContractType, setGen5ContractType] =
  useState<"GENERAL" | "CONVERSION">(
    savedProductCalculationSelections.gen5ContractType
  );

const [gen5SevereRider, setGen5SevereRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen5SevereRider
  );

const [gen5NonSevereRider, setGen5NonSevereRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen5NonSevereRider
  );

  const [monthlyPremium, setMonthlyPremium] =
    useState(
      savedContract
        ? String(
            savedContract.monthlyPremium
          )
        : ""
    );

  const [
    renewalCycleMonths,
    setRenewalCycleMonths,
  ] = useState(
    savedContract?.renewalCycleMonths != null
      ? String(
          savedContract.renewalCycleMonths
        )
      : ""
  );

  const [
    reentryCycleYears,
    setReentryCycleYears,
  ] = useState(
    savedContract?.reentryCycleMonths != null
      ? String(
          savedContract.reentryCycleMonths / 12
        )
      : ""
  );

  const [
    selectedSampleId,
    setSelectedSampleId,
  ] = useState<SampleId | null>(null);

  const [
    isSampleConfirmed,
    setIsSampleConfirmed,
  ] = useState(false);

  const [
    sampleScenarioNotice,
    setSampleScenarioNotice,
  ] = useState("");

  // ========================================
  // 5세대 비교
  // ========================================

  const [
    target5GMonthlyPremium,
    setTarget5GMonthlyPremiumInput,
  ] = useState(
    savedTarget5GMonthlyPremium === null
      ? ""
      : String(
          savedTarget5GMonthlyPremium
        )
  );

  const [
    hasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider1,
  ] = useState(
    savedTarget5GCoverages.includes(
      "SPECIAL_RIDER_1"
    )
  );

  const [
    hasTarget5GSpecialRider2,
    setHasTarget5GSpecialRider2,
  ] = useState(
    savedTarget5GCoverages.includes(
      "SPECIAL_RIDER_2"
    )
  );

  // ========================================
  // 계산 가정
  // ========================================

  const [
    assumeEntireMedicalCostCovered,
    setAssumeEntireMedicalCostCovered,
  ] = useState(
    savedCalculationAssumptions
      .assumeEntireMedicalCostCovered
  );

  const [
    assumeNoPriorLimitUsage,
    setAssumeNoPriorLimitUsage,
  ] = useState(
    savedCalculationAssumptions
      .assumeNoPriorLimitUsage
  );

  const [
    assumeEachOccurrenceSeparate,
    setAssumeEachOccurrenceSeparate,
  ] = useState(
    savedCalculationAssumptions
      .assumeEachOccurrenceSeparate
  );

  // ========================================
  // 치료 입력
  // ========================================

  const [treatmentName, setTreatmentName] =
    useState("");

  const [careSetting, setCareSetting] =
    useState<CareSetting>(
      "OUTPATIENT"
    );

  const [benefitClass, setBenefitClass] =
    useState<BenefitClass>(
      "UNKNOWN"
    );

  const [
    severityClass,
    setSeverityClass,
  ] = useState<SeverityClass>(
    "UNKNOWN"
  );

  const [frequency, setFrequency] =
    useState("1");

  const [unitCost, setUnitCost] =
    useState("");

  const [
    treatmentDate,
    setTreatmentDate,
  ] = useState("");

  const [
    treatmentCategory,
    setTreatmentCategory,
  ] = useState("");

  const [
    institutionType,
    setInstitutionType,
  ] = useState<
    "" | MedicalInstitutionType
  >("");

  /**
   * 화면에서는 사용자가 이해하기 쉽게 0~100%로 입력받고,
   * MedicalUsage에는 0~1 비율로 저장한다.
   */
  const [
    healthInsuranceCopayRatePercent,
    setHealthInsuranceCopayRatePercent,
  ] = useState("");

  const [copayInstitution, setCopayInstitution] = useState<CopayInstitution | "">("");
  const [copayRegion, setCopayRegion] = useState<CopayRegion | "">("");
  const applyCopayDefault = (care: CareSetting, institution = copayInstitution, region = copayRegion) => {
    const rate = generalPatientCopayPercent(care, institution || undefined, region || undefined);
    setHealthInsuranceCopayRatePercent(rate === undefined ? "" : String(rate));
  };
  const changeCareSetting = (care: CareSetting) => {
    setCareSetting(care);
    applyCopayDefault(care);
  };

  /**
   * C: 해당 비교안에서 약관상 보장대상으로 인정되는 금액.
   * 모르면 비워두고 결과에서 확인 필요로 처리한다.
   */
  const [
    coveredAmount,
    setCoveredAmount,
  ] = useState("");

  const [claimCause, setClaimCause] = useState<ClaimCause>("UNKNOWN");
  const [nationalHealthInsuranceStatus, setNationalHealthInsuranceStatus] =
    useState<NationalHealthInsuranceStatus>("UNKNOWN");
  const [gen23Form, setGen23Form] = useState<Gen23FormState>({});
  const [gen1CoveredRoomAndTreatment, setGen1CoveredRoomAndTreatment] = useState("");
  const [gen1RoomDifference, setGen1RoomDifference] = useState("");
  const [gen1NonNhiInpatientTotal, setGen1NonNhiInpatientTotal] = useState("");
  const [gen1PriorPaidBenefit, setGen1PriorPaidBenefit] = useState("");
  const [gen1PriorServiceDays, setGen1PriorServiceDays] = useState("");
  const [gen1PolicyExclusionsCleared, setGen1PolicyExclusionsCleared] = useState(false);

  // ========================================
  // 치료 목록 / 수정 상태
  // ========================================

  const [
    plannedUsages,
    setPlannedUsages,
  ] = useState<MedicalUsage[]>(
    () => [...savedUsages]
  );

  const [
    editingUsageId,
    setEditingUsageId,
  ] = useState<string | null>(null);

  const [isTreatmentFormOpen, setIsTreatmentFormOpen] =
    useState(savedUsages.length === 0);

  const [currentTreatmentSlotIndex, setCurrentTreatmentSlotIndex] =
    useState(0);

  const [treatmentDrafts, setTreatmentDrafts] = useState<Record<number, TreatmentDraft>>({});

  const [isStep3Confirmed, setIsStep3Confirmed] = useState(false);

  const [hasNoPlannedTreatment, setHasNoPlannedTreatment] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isResetModalOpen,
    setIsResetModalOpen,
  ] = useState(false);

  const [
    riderDetailVisible,
    setRiderDetailVisible,
  ] = useState({
    special1: false,
    special2: false,
  });

  const [
    pendingDeleteUsage,
    setPendingDeleteUsage,
  ] = useState<MedicalUsage | null>(null);

  // ========================================
  // 샘플 보험증권 불러오기
  // ========================================

  const handleLoadSamplePolicy = (
    sampleId: SampleId
  ) => {
    try {
      const sample =
        samplePolicyService.load(
          sampleId
        );

      const scenario =
        sampleScenarioService.load(
          sampleId
        );

      setInsurer(sample.insurer);
      setProductName(
        sample.productName
      );
      setInceptionDate(
        sample.inceptionDate
      );
      setGeneration(
        sample.generation
      );
      setMonthlyPremium(
        String(
          sample.monthlyPremium
        )
      );

      setRenewalCycleMonths(
        sample.renewalCycleMonths != null
          ? String(
              sample.renewalCycleMonths
            )
          : ""
      );

      setReentryCycleYears(
        sample.reentryCycleMonths != null
          ? String(
              sample.reentryCycleMonths / 12
            )
          : ""
      );

      // 원본 HTML의 검증용 샘플과 같은 비교 조건을 함께 채운다.
      setTarget5GMonthlyPremiumInput("35000");

      /**
       * 샘플 시나리오에 명시된 계산 가정도
       * STEP 4 체크 상태에 그대로 반영한다.
       *
       * 사용자가 다음 단계로 넘어가기 전
       * 화면에서 직접 확인/해제할 수 있다.
       */
      setAssumeEntireMedicalCostCovered(
        scenario.calculationAssumptions
          .assumeEntireMedicalCostCovered
      );

      setAssumeNoPriorLimitUsage(
        scenario.calculationAssumptions
          .assumeNoPriorLimitUsage
      );

      setAssumeEachOccurrenceSeparate(
        scenario.calculationAssumptions
          .assumeEachOccurrenceSeparate
      );

      resetTreatmentForm();

      setSelectedSampleId(
        sampleId
      );

      setSampleScenarioNotice(
        scenario.notice
      );

      setIsSampleConfirmed(true);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "샘플 보험증권을 불러오지 못했습니다."
      );
    }
  };

  const buildCurrentTreatmentDraft = (): TreatmentDraft => ({
    treatmentName,
    careSetting,
    benefitClass,
    severityClass,
    frequency,
    unitCost,
    treatmentDate,
    treatmentCategory,
    institutionType,
    healthInsuranceCopayRatePercent,
    copayInstitution,
    copayRegion,
    coveredAmount,
    claimCause,
    nationalHealthInsuranceStatus,
    gen23Form,
    gen1CoveredRoomAndTreatment,
    gen1RoomDifference,
    gen1NonNhiInpatientTotal,
    gen1PriorPaidBenefit,
    gen1PriorServiceDays,
    gen1PolicyExclusionsCleared,
  });

  const applyTreatmentDraft = (draft: TreatmentDraft) => {
    setGen23Form(draft.gen23Form ?? {});
    setTreatmentSampleNotice("");
    setTreatmentName(draft.treatmentName);
    setCareSetting(draft.careSetting);
    setBenefitClass(draft.benefitClass as BenefitClass);
    setSeverityClass(draft.severityClass as SeverityClass);
    setFrequency(draft.frequency);
    setUnitCost(draft.unitCost);
    setTreatmentDate(draft.treatmentDate);
    setTreatmentCategory(draft.treatmentCategory);
    setInstitutionType(draft.institutionType as typeof institutionType);
    setCopayInstitution(draft.copayInstitution as CopayInstitution | "");
    setCopayRegion(draft.copayRegion as CopayRegion | "");
    setHealthInsuranceCopayRatePercent(draft.healthInsuranceCopayRatePercent);
    setCoveredAmount(draft.coveredAmount);
    setClaimCause(draft.claimCause as ClaimCause);
    setNationalHealthInsuranceStatus(draft.nationalHealthInsuranceStatus as NationalHealthInsuranceStatus);
    setGen1CoveredRoomAndTreatment(draft.gen1CoveredRoomAndTreatment);
    setGen1RoomDifference(draft.gen1RoomDifference);
    setGen1NonNhiInpatientTotal(draft.gen1NonNhiInpatientTotal);
    setGen1PriorPaidBenefit(draft.gen1PriorPaidBenefit);
    setGen1PriorServiceDays(draft.gen1PriorServiceDays);
    setGen1PolicyExclusionsCleared(draft.gen1PolicyExclusionsCleared);
  };

  const saveCurrentTreatmentDraft = (slotIndex = currentTreatmentSlotIndex) => {
    setTreatmentDrafts((previous) => ({
      ...previous,
      [slotIndex]: buildCurrentTreatmentDraft(),
    }));
  };

  // ========================================
  // 치료 입력칸 초기화
  // ========================================

  const resetTreatmentForm = () => {
    const emptyDraft = createEmptyTreatmentDraft();
    setGen23Form(emptyDraft.gen23Form);
    setTreatmentSampleNotice("");
    setTreatmentName(emptyDraft.treatmentName);
    setCareSetting(emptyDraft.careSetting);
    setBenefitClass(emptyDraft.benefitClass as BenefitClass);
    setSeverityClass(emptyDraft.severityClass as SeverityClass);
    setFrequency(emptyDraft.frequency);
    setUnitCost(emptyDraft.unitCost);
    setTreatmentDate(emptyDraft.treatmentDate);
    setTreatmentCategory(emptyDraft.treatmentCategory);
    setInstitutionType(emptyDraft.institutionType as typeof institutionType);
    setCopayInstitution(emptyDraft.copayInstitution as CopayInstitution | "");
    setCopayRegion(emptyDraft.copayRegion as CopayRegion | "");
    setHealthInsuranceCopayRatePercent(emptyDraft.healthInsuranceCopayRatePercent);
    setCoveredAmount(emptyDraft.coveredAmount);
    setClaimCause(emptyDraft.claimCause as ClaimCause);
    setNationalHealthInsuranceStatus(emptyDraft.nationalHealthInsuranceStatus as NationalHealthInsuranceStatus);
    setGen1CoveredRoomAndTreatment(emptyDraft.gen1CoveredRoomAndTreatment);
    setGen1RoomDifference(emptyDraft.gen1RoomDifference);
    setGen1NonNhiInpatientTotal(emptyDraft.gen1NonNhiInpatientTotal);
    setGen1PriorPaidBenefit(emptyDraft.gen1PriorPaidBenefit);
    setGen1PriorServiceDays(emptyDraft.gen1PriorServiceDays);
    setGen1PolicyExclusionsCleared(emptyDraft.gen1PolicyExclusionsCleared);
    setEditingUsageId(null);
    setTreatmentDrafts((previous) => ({
      ...previous,
      [currentTreatmentSlotIndex]: emptyDraft,
    }));
  };

  // ========================================
  // 전체 화면 입력 초기화
  // ========================================

  const resetLocalForm = () => {
    setInsurer("");
    setProductName("");
    setInceptionDate("");
    setGeneration(3);
    setSamsungGen23Variant("UNKNOWN");
    setGen1Product("UNKNOWN");
    setGen1ContractBasis("SAMPLE_SIMULATION");
    setGen1D1Coverage("UNKNOWN");
    setMonthlyPremium("");
    setRenewalCycleMonths("");
    setReentryCycleYears("");
    setSelectedSampleId(null);
    setIsSampleConfirmed(false);
    setSampleScenarioNotice("");

    setTarget5GMonthlyPremiumInput("");
    setHasTarget5GSpecialRider1(false);
    setHasTarget5GSpecialRider2(false);

    setAssumeEntireMedicalCostCovered(
      false
    );
    setAssumeNoPriorLimitUsage(false);
    setAssumeEachOccurrenceSeparate(
      false
    );

    setPlannedUsages([]);
    setHasNoPlannedTreatment(false);
    setIsStep3Confirmed(false);

    resetTreatmentForm();
    setIsTreatmentFormOpen(true);

    setErrorMessage("");
  };

  // ========================================
  // 전체 초기화
  // ========================================

  const handleResetAll = () => {
    setIsResetModalOpen(true);
  };

  const handleCancelResetAll = () => {
    setIsResetModalOpen(false);
  };

  const handleConfirmResetAll = () => {
    setIsResetModalOpen(false);

    // Zustand 초기화
    resetAnalysis();

    // 현재 M02 화면 상태도 초기화
    resetLocalForm();
  };

  // ========================================
  // 치료 객체 생성
  // ========================================

  const createCurrentUsage = (
    id?: string
  ) => {
    const frequencyNumber =
      Number(frequency);

    const unitCostNumber =
      Number(unitCost);

    const copayRatePercentNumber =
      healthInsuranceCopayRatePercent === ""
        ? null
        : Number(
            healthInsuranceCopayRatePercent
          );

    const coveredAmountNumber =
      coveredAmount === ""
        ? null
        : Number(coveredAmount);

    const optionalAmount = (value: string) => value === "" ? undefined : Number(value);

    if (!treatmentName.trim()) {
      setErrorMessage(
        "예정 치료명을 입력해주세요."
      );

      return null;
    }

    if (
      !Number.isInteger(
        frequencyNumber
      ) ||
      frequencyNumber < 1
    ) {
      setErrorMessage(
        "예상 치료 횟수는 1회 이상 입력해주세요."
      );

      return null;
    }

    if (
      !unitCost ||
      !Number.isFinite(
        unitCostNumber
      ) ||
      unitCostNumber <= 0
    ) {
      setErrorMessage(
        "회당 환자부담 의료비를 올바르게 입력해주세요."
      );

      return null;
    }

    if (
      copayRatePercentNumber !== null &&
      (
        !Number.isFinite(
          copayRatePercentNumber
        ) ||
        copayRatePercentNumber < 0 ||
        copayRatePercentNumber > 100
      )
    ) {
      setErrorMessage(
        "건강보험 본인부담률은 0~100 사이의 퍼센트로 입력해주세요."
      );

      return null;
    }

    if (
      coveredAmountNumber !== null &&
      (
        !Number.isFinite(
          coveredAmountNumber
        ) ||
        coveredAmountNumber < 0 ||
        coveredAmountNumber >
          unitCostNumber
      )
    ) {
      setErrorMessage(
        "보장대상 인정금액(C)은 0원 이상이며 회당 환자부담 의료비(M)를 초과할 수 없습니다."
      );

      return null;
    }

    if (
      treatmentDate &&
      !isValidIsoDate(treatmentDate)
    ) {
      setErrorMessage(
        "진료 예정일은 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요."
      );
      return null;
    }

    let gen23Values: Partial<MedicalUsage> = {};
    if (generation === 2 || generation === 3) {
      try {
        gen23Values = parseGen23Form(gen23Form);
        const careError = gen23CareSettingError({ careSetting, gen23CareSetting: gen23Values.gen23CareSetting });
        if (careError) throw new Error(careError);
      }
      catch (error) { setErrorMessage(error instanceof Error ? error.message : "계산 입력을 확인해주세요."); return null; }
    }
    const usage: MedicalUsage = {
      ...(id ? plannedUsages.find(item => item.id === id) : {}),
      ...gen23Values,
      id:
        id ??
        crypto.randomUUID(),

      treatmentName:
        treatmentName.trim(),

      careSetting,
      benefitClass,
      severityClass,

      frequency:
        frequencyNumber,

      unitCost:
        unitCostNumber,

      ...(treatmentDate
        ? { treatmentDate }
        : {}),

      ...(treatmentCategory.trim()
        ? {
            treatmentCategory:
              treatmentCategory.trim(),
          }
        : {}),

      ...(copayInstitution ? { copayInstitution } : {}),
      ...(copayRegion ? { copayRegion } : {}),
      ...(institutionType
        ? { institutionType }
        : {}),

      ...(copayRatePercentNumber !== null
        ? {
            healthInsuranceCopayRate:
              copayRatePercentNumber / 100,
          }
        : {}),

      ...(coveredAmountNumber !== null
        ? {
            coveredAmount:
              coveredAmountNumber,
          }
        : {}),

      ...(generation === 1 ? {
        claimCause,
        nationalHealthInsuranceStatus,
        gen1CoveredRoomAndTreatment: optionalAmount(gen1CoveredRoomAndTreatment),
        gen1RoomDifference: optionalAmount(gen1RoomDifference),
        gen1NonNhiInpatientTotal: optionalAmount(gen1NonNhiInpatientTotal),
        gen1PriorPaidBenefit: optionalAmount(gen1PriorPaidBenefit),
        gen1PriorServiceDays: optionalAmount(gen1PriorServiceDays),
        gen1PolicyExclusionsCleared,
      } : {}),
    };

    return usage;
  };

  // ========================================
  // 치료 추가 / 수정 완료
  // ========================================

  const handleAddTreatment = () => {
    setErrorMessage("");

    if (
      !editingUsageId &&
      plannedUsages.length >= MAX_TREATMENTS
    ) {
      setErrorMessage(
        `예정 치료는 최대 ${MAX_TREATMENTS}건까지 등록할 수 있습니다.`
      );
      return;
    }

    const usage =
      createCurrentUsage(
        editingUsageId ?? undefined
      );

    if (!usage) {
      return;
    }

    if (editingUsageId) {
      setPlannedUsages(
        (prev) =>
          prev.map((item) =>
            item.id ===
            editingUsageId
              ? usage
              : item
          )
      );
    } else {
      setPlannedUsages(
        (prev) => [
          ...prev,
          usage,
        ]
      );
    }

    resetTreatmentForm();
    setHasNoPlannedTreatment(false);
    setIsTreatmentFormOpen(false);
  };

  const handleStartNewTreatment = (slotIndex = 0) => {
    const targetDraft = treatmentDrafts[slotIndex] ?? createEmptyTreatmentDraft();

    if (isTreatmentFormOpen && !editingUsageId) {
      saveCurrentTreatmentDraft();
      setCurrentTreatmentSlotIndex(slotIndex);
      setIsTreatmentFormOpen(true);
      applyTreatmentDraft(targetDraft);
      setErrorMessage("");
      setHasNoPlannedTreatment(false);
      return;
    }

    if (plannedUsages.length >= MAX_TREATMENTS) {
      setErrorMessage(`예정 치료는 최대 ${MAX_TREATMENTS}건까지 등록할 수 있습니다.`);
      return;
    }

    saveCurrentTreatmentDraft();
    setCurrentTreatmentSlotIndex(slotIndex);
    setErrorMessage("");
    setHasNoPlannedTreatment(false);
    setIsTreatmentFormOpen(true);
    if (targetDraft) {
      applyTreatmentDraft(targetDraft);
    } else {
      resetTreatmentForm();
    }
  };

  const [treatmentSampleNotice, setTreatmentSampleNotice] = useState("");
  const treatmentHelpDialogRef = useRef<HTMLDialogElement>(null);
  const patientCostHelpDialogRef = useRef<HTMLDialogElement>(null);

  const treatmentSampleDialogRef = useRef<HTMLDialogElement>(null);

  const handleLoadSampleTreatments = (kind: TreatmentSampleKind) => {
    try {
      const scenario = loadTreatmentSample(selectedSampleId ?? "NON_COVERED", generation, kind);
      treatmentSampleDialogRef.current?.close();
      const sampleUsage = scenario.plannedUsages[0];

      if (!sampleUsage) {
        setErrorMessage("선택한 샘플에는 확정된 예정 치료 정보가 없습니다.");
        return;
      }

      const nextDraft = createDraftFromUsage(sampleUsage);
      saveCurrentTreatmentDraft();
      setTreatmentDrafts((previous) => ({
        ...previous,
        [currentTreatmentSlotIndex]: nextDraft,
      }));

      setGen23Form(restoreGen23Form(sampleUsage));
      if ((generation === 2 || generation === 3) && samsungGen23Variant === "UNKNOWN") setSamsungGen23Variant("standard");
      setAssumeEntireMedicalCostCovered(scenario.calculationAssumptions.assumeEntireMedicalCostCovered);
      setAssumeNoPriorLimitUsage(scenario.calculationAssumptions.assumeNoPriorLimitUsage);
      setAssumeEachOccurrenceSeparate(scenario.calculationAssumptions.assumeEachOccurrenceSeparate);
      setIsStep3Confirmed(false);
      setTreatmentSampleNotice(scenario.notice + ((generation === 2 || generation === 3) && samsungGen23Variant === "UNKNOWN" ? " 종형 미선택으로 표준형 예제를 불러왔습니다." : ""));

      applyTreatmentDraft(nextDraft);
      setHasNoPlannedTreatment(false);
      setIsTreatmentFormOpen(true);
      setSampleScenarioNotice(scenario.notice);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "샘플 예정 치료를 불러오지 못했습니다."
      );
    }
  };

  // ========================================
  // 치료 수정 시작
  // ========================================

  const handleEditTreatment = (
    usage: MedicalUsage
  ) => {
    setErrorMessage("");
    setIsTreatmentFormOpen(true);

    setEditingUsageId(
      usage.id
    );

    setTreatmentName(
      usage.treatmentName
    );

    setCareSetting(
      usage.careSetting
    );

    setBenefitClass(
      usage.benefitClass
    );

    setSeverityClass(
      usage.severityClass
    );

    setFrequency(
      String(usage.frequency)
    );

    setUnitCost(
      String(usage.unitCost)
    );

    setTreatmentDate(
      usage.treatmentDate ?? ""
    );

    setTreatmentCategory(
      usage.treatmentCategory ?? ""
    );

    setInstitutionType(
      usage.institutionType ?? ""
    );
    setCopayInstitution(usage.copayInstitution ?? "");
    setCopayRegion(usage.copayRegion ?? "");

    setHealthInsuranceCopayRatePercent(
      usage.healthInsuranceCopayRate ===
        undefined
        ? ""
        : String(
            usage.healthInsuranceCopayRate *
              100
          )
    );

    setCoveredAmount(
      usage.coveredAmount === undefined
        ? ""
        : String(
            usage.coveredAmount
          )
    );
    setGen23Form(restoreGen23Form(usage));
    setClaimCause(usage.claimCause ?? "UNKNOWN");
    setNationalHealthInsuranceStatus(usage.nationalHealthInsuranceStatus ?? "UNKNOWN");
    setGen1CoveredRoomAndTreatment(usage.gen1CoveredRoomAndTreatment === undefined ? "" : String(usage.gen1CoveredRoomAndTreatment));
    setGen1RoomDifference(usage.gen1RoomDifference === undefined ? "" : String(usage.gen1RoomDifference));
    setGen1NonNhiInpatientTotal(usage.gen1NonNhiInpatientTotal === undefined ? "" : String(usage.gen1NonNhiInpatientTotal));
    setGen1PriorPaidBenefit(usage.gen1PriorPaidBenefit === undefined ? "" : String(usage.gen1PriorPaidBenefit));
    setGen1PriorServiceDays(usage.gen1PriorServiceDays === undefined ? "" : String(usage.gen1PriorServiceDays));
    setGen1PolicyExclusionsCleared(usage.gen1PolicyExclusionsCleared ?? false);
  };

  // ========================================
  // 수정 취소
  // ========================================

  const handleCancelEdit = () => {
    resetTreatmentForm();
    setErrorMessage("");
    setIsTreatmentFormOpen(plannedUsages.length === 0);
  };

  // ========================================
  // 치료 삭제
  // ========================================

  const handleRemoveTreatment = (
    usage: MedicalUsage
  ) => {
    setPendingDeleteUsage(usage);
  };

  const handleCancelRemoveTreatment = () => {
    setPendingDeleteUsage(null);
  };

  const handleConfirmRemoveTreatment = () => {
    if (!pendingDeleteUsage) {
      return;
    }

    const usageId =
      pendingDeleteUsage.id;

    setPendingDeleteUsage(null);

    setPlannedUsages(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !== usageId
        )
    );

    if (
      editingUsageId === usageId
    ) {
      resetTreatmentForm();
    }
  };

  // ========================================
  // 다음
  // ========================================

  useEffect(() => {
    setUsages(plannedUsages);
  }, [plannedUsages, setUsages]);

  useEffect(() => {
    if (errorMessage) {
      const error = document.getElementById("input-errors");
      error?.scrollIntoView({ block: "center", behavior: "smooth" });
      error?.focus({ preventScroll: true });
    }
  }, [errorMessage]);

  const handleNext = () => {
    setErrorMessage("");
    if (!isStep3Confirmed) {
      setErrorMessage("입력 내용을 확인하고 ‘예정치료를 입력하셨나요?’에 체크해주세요.");
      return;
    }

    const currentPremiumNumber =
      Number(monthlyPremium);

    const targetPremiumNumber =
      Number(
        target5GMonthlyPremium
      );

    const renewalCycleNumber =
      renewalCycleMonths
        ? Number(
            renewalCycleMonths
          )
        : null;

    const reentryCycleNumber =
      reentryCycleYears
        ? Number(
            reentryCycleYears
          )
        : null;

    if (!insurer.trim()) {
      setErrorMessage(
        "보험사를 입력해주세요."
      );
      return;
    }

    if (!productName.trim()) {
      setErrorMessage(
        "보험 상품명을 입력해주세요."
      );
      return;
    }

    if (!inceptionDate) {
      setErrorMessage(
        "보험 가입일을 입력해주세요."
      );
      return;
    }

    if (!isValidIsoDate(inceptionDate)) {
      setErrorMessage(
        "보험 가입일은 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요."
      );
      return;
    }

    if (
      !monthlyPremium ||
      currentPremiumNumber <= 0
    ) {
      setErrorMessage(
        "현재 월 보험료를 올바르게 입력해주세요."
      );
      return;
    }

    if (
      renewalCycleNumber !== null &&
      (
        !Number.isInteger(
          renewalCycleNumber
        ) ||
        renewalCycleNumber <= 0
      )
    ) {
      setErrorMessage(
        "갱신 주기는 1개월 이상의 정수로 입력하거나 비워주세요."
      );
      return;
    }

    if (
      reentryCycleNumber !== null &&
      (
        !Number.isInteger(
          reentryCycleNumber
        ) ||
        reentryCycleNumber <= 0
      )
    ) {
      setErrorMessage(
        "재가입 주기는 1년 이상의 정수로 입력하거나 비워주세요."
      );
      return;
    }

    if (
      selectedSampleId &&
      !isSampleConfirmed
    ) {
      setErrorMessage(
        "불러온 샘플 보험증권 정보를 확인해주세요."
      );
      return;
    }

    if (
      !target5GMonthlyPremium ||
      targetPremiumNumber <= 0
    ) {
      setErrorMessage(
        "비교용 5세대 월 보험료를 올바르게 입력해주세요."
      );
      return;
    }

    let finalUsages = [
      ...plannedUsages,
    ];

    if (
      treatmentName.trim() ||
      unitCost ||
      treatmentDate ||
      treatmentCategory.trim() ||
      institutionType ||
      healthInsuranceCopayRatePercent ||
      coveredAmount
    ) {
      if (
        !editingUsageId &&
        finalUsages.length >= MAX_TREATMENTS
      ) {
        setErrorMessage(
          `예정 치료는 최대 ${MAX_TREATMENTS}건까지 등록할 수 있습니다.`
        );
        return;
      }

      const currentUsage =
        createCurrentUsage(
          editingUsageId ??
            undefined
        );

      if (!currentUsage) {
        return;
      }

      if (editingUsageId) {
        finalUsages =
          finalUsages.map(
            (usage) =>
              usage.id ===
              editingUsageId
                ? currentUsage
                : usage
          );
      } else {
        finalUsages = [
          ...finalUsages,
          currentUsage,
        ];
      }
    }

    const distinctTreatmentDates = new Set(
      finalUsages
        .map((usage) => usage.treatmentDate)
        .filter((value): value is string => Boolean(value))
    );

    if (
      distinctTreatmentDates.size > 1 &&
      !assumeEachOccurrenceSeparate
    ) {
      setErrorMessage(
        getSeparateVisitWarningMessage()
      );
      return;
    }

    const currentCoverages: string[] =
      [];

    if (generation === 5) {
      if (gen5SevereRider === "ENROLLED") {
        currentCoverages.push(
          "SPECIAL_RIDER_1"
        );
      }

      if (gen5NonSevereRider === "ENROLLED") {
        currentCoverages.push(
          "SPECIAL_RIDER_2"
        );
      }
    } else if (generation === 4 && gen4NonCoveredRider === "ENROLLED") {
      /**
       * 기존 세대의 현재 MVP 비급여 특약 확인값.
       * G3_MRI_OUTPATIENT 같은 기존세대 룰과 연결한다.
       */
      currentCoverages.push(
        "NON_COVERED"
      );
    }

    const target5GCoverages: string[] =
      [];

    if (
      hasTarget5GSpecialRider1
    ) {
      target5GCoverages.push(
        "SPECIAL_RIDER_1"
      );
    }

    if (
      hasTarget5GSpecialRider2
    ) {
      target5GCoverages.push(
        "SPECIAL_RIDER_2"
      );
    }

    setContract({
      insurer:
        insurer.trim(),

      productName:
        productName.trim(),

      inceptionDate,
      generation,

      monthlyPremium:
        currentPremiumNumber,

      renewalCycleMonths:
        renewalCycleNumber,

      reentryCycleMonths:
        reentryCycleNumber === null
          ? null
          : reentryCycleNumber * 12,

      coverages:
        currentCoverages,
    });

    setTarget5GMonthlyPremium(
      targetPremiumNumber
    );

    setTarget5GCoverages(
      target5GCoverages
    );

    setUsages(
      finalUsages
    );

    setCalculationAssumptions({
      assumeEntireMedicalCostCovered,
      assumeNoPriorLimitUsage,
      assumeEachOccurrenceSeparate,
    });

    setProductCalculationSelections({
      gen1Product,
      gen1ContractBasis,
      gen1D1Coverage,
      gen4NonCoveredRider,
      gen5ContractType,
      gen5SevereRider,
      gen5NonSevereRider,
      samsungGen23Variant
    });

    navigate("/confirm");
  };

  const handleStep1Next = () => {
    setErrorMessage("");

    if (!monthlyPremium || Number(monthlyPremium) <= 0) {
      setErrorMessage("현재 월 보험료를 입력해주세요.");
      return;
    }

    if (!insurer.trim() || !productName.trim()) {
      setErrorMessage("보험사와 상품명을 입력해주세요.");
      return;
    }

    goToInputStep(2);
  };

  const toggleRiderDetail = (
    type: "special1" | "special2"
  ) => {
    setRiderDetailVisible((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const selectedSample =
    SAMPLE_POLICY_OPTIONS.find(
      (option) =>
        option.id ===
        selectedSampleId
    );

  const scenarioNoticeHasUsage =
    plannedUsages.length > 0 &&
    selectedSampleId !== null;

  const isTreatmentLimitReached =
    plannedUsages.length >= MAX_TREATMENTS &&
    !editingUsageId;

  return (
    <AppShell currentStep={activeStep} onReset={handleConfirmResetAll}
      onStepChange={(step) => {
        if (step === 4) { handleNext(); return; }
        if (step === 1 || step === 2 || step === 3) goToInputStep(step);
      }}>
    <main className="navy-page navy-input-page">
      {errorMessage && (
        <div
          role="alert"
          tabIndex={-1}
          id="input-errors"
          className="notice-box error"
        >
          {errorMessage}
        </div>
      )}

      {/* STEP 1 */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 1}>
      <section id="input-step-1" tabIndex={-1} className="form-card">
        <span className="step-badge">
          STEP 1
        </span>

        <h2 className="card-title">
          현재 계약
        </h2>

        <p className="card-description">
          직접 입력하거나 시연용 샘플 보험증권을 불러와
          계약 정보를 자동으로 채울 수 있습니다.
        </p>

        <div className="html-sample-actions">
          <button
            type="button"
            className="sample-button"
            onClick={() => handleLoadSamplePolicy("NON_COVERED")}
          >
            샘플 불러오기
          </button>
          {selectedSampleId && (
            <span className="status-badge success" role="status">
              샘플 입력 완료
            </span>
          )}
        </div>

        <div
          className="legacy-sample-picker"
          style={{
            marginBottom: "26px",
            padding: "20px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary-050)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <div>
              <p
                className="amount-label"
                style={{ marginBottom: "4px" }}
              >
                빠른 시작
              </p>

              <h3 style={{ marginBottom: "6px" }}>
                샘플 보험증권 불러오기
              </h3>

              <p
                className="treatment-meta"
                style={{ marginBottom: 0 }}
              >
                샘플을 선택하면 계약 정보와 예정 치료가 자동으로 채워집니다.
                불러온 뒤 직접 수정할 수도 있습니다.
              </p>
            </div>

            <span className="rule-info">
              공모전 시연용
            </span>
          </div>

          <div className="card-grid">
            {SAMPLE_POLICY_OPTIONS.map(
              (option) => {
                const isSelected =
                  selectedSampleId ===
                  option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      handleLoadSamplePolicy(
                        option.id
                      )
                    }
                    aria-pressed={isSelected}
                    style={{
                      width: "100%",
                      minHeight: "108px",
                      padding: "16px",
                      border:
                        isSelected
                          ? "2px solid var(--color-primary-700)"
                          : "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        isSelected
                          ? "#ffffff"
                          : "var(--color-surface)",
                      color:
                        "var(--color-text)",
                      textAlign: "left",
                      boxShadow:
                        isSelected
                          ? "0 8px 20px rgba(29, 86, 143, 0.10)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        marginBottom: "7px",
                        color:
                          isSelected
                            ? "var(--color-primary-700)"
                            : "var(--color-text)",
                        fontWeight: 900,
                        fontSize: "1rem",
                      }}
                    >
                      {option.label}
                    </span>

                    <span
                      style={{
                        display: "block",
                        color:
                          "var(--color-text-sub)",
                        fontSize: "0.84rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {selectedSample && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius:
                  "var(--radius-sm)",
                background: "#ffffff",
                border:
                  "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <strong>
                  {selectedSample.label} 샘플을 불러왔습니다
                </strong>

                <span className="status-badge success">
                  자동 입력 완료
                </span>
              </div>

              {sampleScenarioNotice && (
                <p
                  className="treatment-meta"
                  style={{
                    margin: "0 0 12px",
                  }}
                >
                  {sampleScenarioNotice}
                </p>
              )}

              {scenarioNoticeHasUsage && (
                <div
                  className="notice-box"
                  style={{
                    marginBottom: "12px",
                  }}
                >
                  샘플에 필요한 계산 가정도 STEP 4에 자동 반영했습니다.
                  계산 전 직접 확인하거나 해제할 수 있습니다.
                </div>
              )}

              <label
                style={{
                  marginBottom: 0,
                  paddingTop: "12px",
                  borderTop:
                    "1px solid var(--color-border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    isSampleConfirmed
                  }
                  onChange={(e) =>
                    setIsSampleConfirmed(
                      e.target.checked
                    )
                  }
                />{" "}
                불러온 계약 정보와 예정 치료를 직접 확인했습니다.
              </label>
            </div>
          )}
        </div>

        <div className="form-grid">
          <label>
            보험사
          <input
            type="text"
            value={insurer}
            onChange={(e) =>
              setInsurer(
                e.target.value
              )
            }
            placeholder="예: OO손해보험"
          />
        </label>

        <label>
          상품명
          <input
            type="text"
            value={productName}
            onChange={(e) =>
              setProductName(
                e.target.value
              )
            }
            placeholder="보험 상품명"
          />
        </label>

        <label>
          가입일
          <IsoDateInput
            value={inceptionDate}
            onChange={(value) => {
              setInceptionDate(value);
              const detected = generationForInceptionDate(value);
              if (detected !== undefined) setGeneration(detected);
            }}
            placeholder="예: 2018-03-01"
          />
        </label>

        <label>
          실손 세대
          <select
            value={generation}
            onChange={(e) =>
              setGeneration(
                Number(
                  e.target.value
                ) as InsuranceGeneration
              )
            }
          >
            <option value={1}>
              1세대
            </option>

            <option value={2}>
              2세대
            </option>

            <option value={3}>
              3세대
            </option>

            <option value={4}>
              4세대
            </option>

            <option value={5}>
              5세대
            </option>
          </select>
        </label>
        {generation === 2 ||
        generation === 3 ? (
          <label>
            상품 종형
            <select
              value={samsungGen23Variant}
              onChange={(e) =>
                setSamsungGen23Variant(
                  e.target.value as SamsungGen23Variant
                )
              }
            >
              <option value="UNKNOWN">
                선택해주세요
              </option>

              <option value="standard">
                1종 표준형
              </option>

              <option value="selected2">
                2종 선택형Ⅱ
              </option>
            </select>
          </label>
        ) : null}

        <label>
          현재 월 보험료
          <span className="input-unit-row"><input
            type="text"
            inputMode="numeric"
            value={
              formatWonInput(monthlyPremium)
            }
            onChange={(e) =>
              setMonthlyPremium(
                getWonInputValue(e.target.value)
              )
            }
            placeholder="예: 60,000"
          /><span className="input-unit-label">원</span></span>
        </label>

          <label>
            갱신 주기
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={
                renewalCycleMonths
              }
              onChange={(e) =>
                setRenewalCycleMonths(
                  e.target.value
                )
              }
              placeholder="모르면 비워두기"
            /><span className="input-unit-label">개월</span></span>
          </label>

          <label>
            재가입 주기 (년)
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={
                reentryCycleYears
              }
              onChange={(e) =>
                setReentryCycleYears(
                  e.target.value
                )
              }
              placeholder="모르면 비워두기"
            /><span className="input-unit-label">년</span></span>
          </label>
        </div>

        <div
          className="notice-box"
          style={{
            marginTop: "-6px",
            marginBottom: "22px",
          }}
        >
          공모전 MVP에서는 사전에 검증한 샘플 정보를 사용할 수 있습니다.
          샘플을 불러온 경우 실제 계산 전 사용자가 내용을 다시 확인해야 합니다.
        </div>

        {generation === 1 && (
          <fieldset className="form-card" style={{ marginTop: "16px" }}>
            <legend>1세대 삼성화재 계약 확인</legend>
            <p className="card-description">보험증권을 기준으로 상품과 D1 담보를 선택해주세요.</p>

            <label>
              삼성화재 대표 상품
              <select
                value={gen1Product}
                onChange={(event) => {
                  const value = event.target.value as typeof gen1Product;
                  setGen1Product(value);
                  if (value === "SAMSUNG_0904_2") {
                    setInsurer("삼성화재");
                    setProductName("삼성 올라이프 100세 건강파트너보험(0904.2)");
                  }
                }}
              >
                <option value="UNKNOWN">확인할 수 없음</option>
                <option value="SAMSUNG_0904_2">삼성 올라이프 100세 건강파트너보험(0904.2)</option>
                <option value="OTHER">다른 상품</option>
              </select>
            </label>

            {gen1Product === "SAMSUNG_0904_2" && (
              <>
                <fieldset className="nested-fieldset">
                  <legend>보험증권에 표시된 담보</legend>
                  {([
                    ["INJURY", "상해 입·통원의료비(D1)"],
                    ["DISEASE", "질병 입·통원의료비(D1)"],
                    ["BOTH", "두 담보 모두"],
                    ["UNKNOWN", "확인할 수 없음"],
                  ] as const).map(([value, label]) => (
                    <label key={value} style={{ marginRight: "16px" }}>
                      <input type="radio" name="gen1-d1" checked={gen1D1Coverage === value} onChange={() => setGen1D1Coverage(value)} /> {label}
                    </label>
                  ))}
                </fieldset>

                <div className="gen1-conditional-inputs">
                  <h3>0904.2 D1 계산 조건</h3>
                  <div className="form-grid">
                    <label>질병 / 상해<select value={claimCause} onChange={(event) => setClaimCause(event.target.value as ClaimCause)}><option value="UNKNOWN">확인할 수 없음</option><option value="INJURY">상해</option><option value="DISEASE">질병</option></select></label>
                    <label>입원 / 통원<select value={careSetting} onChange={(event) => changeCareSetting(event.target.value as CareSetting)}><option value="INPATIENT">입원</option><option value="OUTPATIENT">통원</option></select></label>
                    <label>이번 진료의 국민건강보험 적용 여부<select value={nationalHealthInsuranceStatus} onChange={(event) => setNationalHealthInsuranceStatus(event.target.value as NationalHealthInsuranceStatus)}><option value="UNKNOWN">확인할 수 없음</option><option value="APPLIED">적용됨</option><option value="NOT_APPLIED">적용되지 않음</option><option value="PARTIAL">일부 적용</option></select></label>
                  </div>
                  {nationalHealthInsuranceStatus === "PARTIAL" && <div className="notice-box warning">일부 적용 조합은 RULE_NOT_VERIFIED로 처리됩니다.</div>}
                  {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "APPLIED" && <div className="form-grid">
                    <label>실제 부담액<input type="text" inputMode="numeric" value={formatWonInput(gen1CoveredRoomAndTreatment)} onChange={(event) => setGen1CoveredRoomAndTreatment(getWonInputValue(event.target.value))} />원</label>
                    <label>병실료 차액<input type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={(event) => setGen1RoomDifference(getWonInputValue(event.target.value))} placeholder="없으면 0" />원</label>
                  </div>}
                  {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "NOT_APPLIED" && <label>입원의료비 총액<input type="text" inputMode="numeric" value={formatWonInput(gen1NonNhiInpatientTotal)} onChange={(event) => setGen1NonNhiInpatientTotal(getWonInputValue(event.target.value))} />원</label>}
                  {careSetting === "OUTPATIENT" && (nationalHealthInsuranceStatus === "APPLIED" || nationalHealthInsuranceStatus === "NOT_APPLIED") && <label>통원의료비<input type="text" inputMode="numeric" value={formatWonInput(unitCost)} onChange={(event) => setUnitCost(getWonInputValue(event.target.value))} />원</label>}
                  <div className="form-grid">
                    <label>이전 지급액<input type="text" inputMode="numeric" value={formatWonInput(gen1PriorPaidBenefit)} onChange={(event) => setGen1PriorPaidBenefit(getWonInputValue(event.target.value))} />원</label>
                    {careSetting === "OUTPATIENT" && <label>이전 이용일수<input type="number" min="0" step="1" value={gen1PriorServiceDays} onChange={(event) => setGen1PriorServiceDays(event.target.value)} />일</label>}
                  </div>
                  <label className="no-treatment-option"><input type="checkbox" checked={gen1PolicyExclusionsCleared} onChange={(event) => setGen1PolicyExclusionsCleared(event.target.checked)} /><span><strong>보상하지 않는 사항에 해당하지 않음을 확인했습니다.</strong></span></label>
                </div>

                <fieldset className="nested-fieldset">
                  <legend>계산 기준</legend>
                  <label style={{ marginRight: "16px" }}><input type="radio" name="gen1-basis" checked={gen1ContractBasis === "SAMPLE_SIMULATION"} onChange={() => setGen1ContractBasis("SAMPLE_SIMULATION")} /> 대표 상품 샘플 시뮬레이션</label>
                  <label><input type="radio" name="gen1-basis" checked={gen1ContractBasis === "ACTUAL_CONTRACT"} onChange={() => setGen1ContractBasis("ACTUAL_CONTRACT")} /> 실제 가입 계약</label>
                </fieldset>

                <div className="notice-box">
                  {gen1ContractBasis === "SAMPLE_SIMULATION"
                    ? "SAMPLE_SIMULATION · 삼성화재 대표 상품을 가정한 계산 예시입니다."
                    : "ACTUAL_CONTRACT · 독립검수 전이므로 현재 실제 계약 계산은 RULE_NOT_VERIFIED로 표시됩니다."}
                </div>
              </>
            )}
          </fieldset>
        )}

        {generation === 4 && (
          <fieldset className="form-card generation-classification" style={{ marginTop: "16px" }}>
            <legend>4세대 계약 분류</legend>
            <p className="card-description">
              보험증권에 표시된 비급여 특약 가입 여부를 기준으로 현재 계약을 선택해주세요.
            </p>

            <div className="generation-classification__options">
              <label className="generation-classification__option">
                <input
                  type="radio"
                  name="gen4-rider"
                  checked={gen4NonCoveredRider === "ENROLLED"}
                  onChange={() => setGen4NonCoveredRider("ENROLLED")}
                />
                <span>
                  <strong>급여·비급여형</strong>
                  <small>급여 주계약과 비급여 특약에 모두 가입</small>
                </span>
              </label>

              <label className="generation-classification__option">
                <input
                  type="radio"
                  name="gen4-rider"
                  checked={gen4NonCoveredRider === "NOT_ENROLLED"}
                  onChange={() => setGen4NonCoveredRider("NOT_ENROLLED")}
                />
                <span>
                  <strong>급여형</strong>
                  <small>급여 주계약만 가입하고 비급여 특약은 미가입</small>
                </span>
              </label>

              <label className="generation-classification__option">
                <input
                  type="radio"
                  name="gen4-rider"
                  checked={gen4NonCoveredRider === "UNKNOWN"}
                  onChange={() => setGen4NonCoveredRider("UNKNOWN")}
                />
                <span>
                  <strong>확인 필요</strong>
                  <small>비급여 특약 가입 여부를 알 수 없음</small>
                </span>
              </label>
            </div>

            {gen4NonCoveredRider === "UNKNOWN" && <div className="notice-box">비급여 계산을 중단합니다. 보험증권에서 특약 가입 여부를 확인해주세요.</div>}
          </fieldset>
        )}

        {generation === 5 && (
          <fieldset className="form-card" style={{ marginTop: "16px" }}>
            <legend>5세대 현재 계약 구성</legend>
            <p>급여 기본계약: 가입 확인됨</p>
            <label>계약 유형{" "}
              <select value={gen5ContractType} onChange={(event) => setGen5ContractType(event.target.value as "GENERAL" | "CONVERSION")}>
                <option value="GENERAL">일반형</option><option value="CONVERSION">계약전환형</option>
              </select>
            </label>
            <p>특약1: 중증 비급여</p>
            {(["ENROLLED", "NOT_ENROLLED", "UNKNOWN"] as const).map((value) => (
              <label key={`severe-${value}`} style={{ marginRight: "16px" }}><input type="radio" name="gen5-severe" checked={gen5SevereRider === value} onChange={() => setGen5SevereRider(value)} /> {value === "ENROLLED" ? "가입함" : value === "NOT_ENROLLED" ? "가입하지 않음" : "확인할 수 없음"}</label>
            ))}
            <p>특약2: 비중증 비급여</p>
            {(["ENROLLED", "NOT_ENROLLED", "UNKNOWN"] as const).map((value) => (
              <label key={`non-severe-${value}`} style={{ marginRight: "16px" }}><input type="radio" name="gen5-non-severe" checked={gen5NonSevereRider === value} onChange={() => setGen5NonSevereRider(value)} /> {value === "ENROLLED" ? "가입함" : value === "NOT_ENROLLED" ? "가입하지 않음" : "확인할 수 없음"}</label>
            ))}
          </fieldset>
        )}
      </section>
      </div>

      {/* STEP 2 */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 2}>
      <section id="input-step-2" tabIndex={-1} className="compare-card">
        <span className="step-badge">
          STEP 2
        </span>

        <h2 className="card-title">
          5세대 전환 비교
        </h2>

        <p className="card-description">
          5세대로 전환한다고 가정했을 때
          사용할 비교 조건입니다.
        </p>

        <label htmlFor="target-premium">
          비교용 5세대 월 보험료 (필수)
            <InputHelp title="비교용 5세대 월 보험료" description="5세대 전환 시 예상되는 월 보험료입니다. 현재 보험료와 구분하고, 보험사에서 받은 견적을 입력하세요." source="보험사의 전환 견적 또는 상담" />
          <span className="input-unit-row"><input id="target-premium"
            type="text"
            inputMode="numeric"
            value={
              formatWonInput(target5GMonthlyPremium)
            }
            onChange={(e) =>
              setTarget5GMonthlyPremiumInput(
                getWonInputValue(e.target.value)
              )
            }
            placeholder="예: 35,000"
          /><span className="input-unit-label">원</span></span>
        </label>

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flex: 1,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="target-gen5-severe"
                checked={
                  gen5SevereRider === "ENROLLED"
                }
                onChange={() => { setGen5SevereRider("ENROLLED"); setHasTarget5GSpecialRider1(true); }}
              />
              <span>5세대 중증 비급여 특약1 가입</span>
            </label>
            <label><input type="radio" name="target-gen5-severe" checked={gen5SevereRider === "NOT_ENROLLED"} onChange={() => { setGen5SevereRider("NOT_ENROLLED"); setHasTarget5GSpecialRider1(false); }} /> 미가입</label>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                toggleRiderDetail("special1")
              }
              style={{
                minHeight: "38px",
                padding: "0 12px",
                fontSize: "0.82rem",
              }}
            >
              {riderDetailVisible.special1 ? "숨김" : "보이기"}
            </button>
          </div>

          <div
            style={{
              display: riderDetailVisible.special1 ? "block" : "none",
              marginTop: "22px",
              padding: "20px 18px",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 10px" }}>중증 비급여 (특약1)</h3>
            <p style={{ margin: 0, color: "var(--color-text-sub)", lineHeight: 1.7 }}>
              암, 뇌혈관·심장질환, 희귀난치성질환 등 건강보험 산정특례 대상 질환 및 그 합병증 치료를 집중 보장하는 필수 의료 지원 특약입니다. 상해·질병당 연간 5,000만 원 한도(통원 회당 20만 원, 연 100회)와 30%의 자기부담률 등 기존 4세대의 보장 수준을 유지하며, 상급종합병원 및 종합병원 입원 시 연간 자기부담금 500만 원 상한제를 신설하여 고액 치료비 부담을 크게 줄였습니다. 또한 비중증에서 제외되는 도수치료나 비급여 주사제라도 중증 질환 치료 목적임이 인정되면 통합 한도 내에서 보장되며, 비급여 이용량에 따른 보험료 할증도 적용되지 않습니다.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginTop: "14px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flex: 1,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="target-gen5-non-severe"
                checked={
                  gen5NonSevereRider === "ENROLLED"
                }
                onChange={() => { setGen5NonSevereRider("ENROLLED"); setHasTarget5GSpecialRider2(true); }}
              />
              <span>5세대 비급여 특약2 가입</span>
            </label>
            <label><input type="radio" name="target-gen5-non-severe" checked={gen5NonSevereRider === "NOT_ENROLLED"} onChange={() => { setGen5NonSevereRider("NOT_ENROLLED"); setHasTarget5GSpecialRider2(false); }} /> 미가입</label>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                toggleRiderDetail("special2")
              }
              style={{
                minHeight: "38px",
                padding: "0 12px",
                fontSize: "0.82rem",
              }}
            >
              {riderDetailVisible.special2 ? "숨김" : "보이기"}
            </button>
          </div>

          <div
            style={{
              display: riderDetailVisible.special2 ? "block" : "none",
              marginTop: "22px",
              padding: "20px 18px",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 10px" }}>비중증 비급여 (특약2)</h3>
            <p style={{ margin: 0, color: "var(--color-text-sub)", lineHeight: 1.7 }}>
              중증 비급여(특약1) 외 일반 비급여 치료를 대상으로 하며, 과잉 의료 이용 방지와 가입자 부담 완화를 위해 보장 구조가 개편되었습니다. 연간 보상한도는 1,000만 원(통원 일당 20만 원, 병·의원 입원 회당 300만 원, 비급여 MRI/MRA 연 300만 원)으로 조정되고 자기부담률은 50%로 상향되었습니다. 과잉 진료 우려가 큰 근골격계 물리치료(도수·체외충격파 등), 비급여 주사제, 미등재 신의료기술은 보장 대상에서 제외되며, 직전 2년 무사고 시 10% 보험료 할인 혜택 및 연간 수령액(100만 원 이상부터 할증)에 따라 최대 300%까지 차등 할증되는 제도가 적용됩니다.
            </p>
          </div>
        </div>

        <div className="notice-box">
          비교용 보험료는 사용자가 직접
          입력한 가정값입니다. 실제 5세대
          전환 보험료를 확정하지 않습니다.
        </div>
      </section>

      {/* STEP 3 */}
      <section className="form-card">
        {treatmentSampleNotice && <p className="notice-box" role="status">{treatmentSampleNotice}</p>}
        <span className="step-badge">STEP 3</span>
        <div className="treatment-heading-row">
          <h2 className="card-title" style={{ margin: 0 }}>예정 치료</h2>
          <div className="treatment-compact-actions">
            <button type="button" className="sample-button" aria-haspopup="dialog" onClick={() => treatmentHelpDialogRef.current?.showModal()}>필수 입력 안내 확인</button>
            <button type="button" className="sample-button" aria-haspopup="dialog" onClick={() => treatmentSampleDialogRef.current?.showModal()} disabled={isTreatmentLimitReached}>치료 샘플 불러오기</button>
            {[0, 1, 2].map((slotIndex) => (
              <button
                key={slotIndex}
                type="button"
                className="primary-button"
                onClick={() => handleStartNewTreatment(slotIndex)}
                disabled={shouldDisableAddTreatmentButton({ isTreatmentFormOpen, isTreatmentLimitReached })}
              >
                {slotIndex === 0 ? getTreatmentAddButtonLabel() : getTreatmentAddLabel(slotIndex)}
              </button>
            ))}
          </div>
        </div>

        <p className="card-description" style={{ fontSize: "0.85rem" }}>
          앞으로 예상되는 의료이용을
          선택적으로 입력합니다. 치료는 최대 3건까지
          추가하거나 수정할 수 있습니다.
        </p>

        {plannedUsages.length === 0 && (
          <label className={`no-treatment-option${hasNoPlannedTreatment ? " is-selected" : ""}`}>
            <input
              type="checkbox"
              checked={hasNoPlannedTreatment}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setHasNoPlannedTreatment(isChecked);
                if (isChecked) {
                  resetTreatmentForm();
                  setIsTreatmentFormOpen(false);
                } else {
                  setIsTreatmentFormOpen(true);
                }
              }}
            />
            <span>
              <strong>예정 치료가 없습니다.</strong>
              <small>예정된 의료이용 없이 보험료만 비교합니다.</small>
            </span>
          </label>
        )}

        {isTreatmentFormOpen && <>
          <fieldset className="form-card">
            <legend>
              <h3>
                {editingUsageId ? "치료 수정" : getTreatmentAddLabel(currentTreatmentSlotIndex)}
              </h3>
            </legend>

        {editingUsageId && (
          <div className="notice-box">
            현재 선택한 치료를 수정하고
            있습니다.
          </div>
        )}

        <label>
          치료명 (필수)
          <input
            type="text"
            value={
              treatmentName
            }
            onChange={(e) =>
              setTreatmentName(
                e.target.value
              )
            }
            placeholder="예: MRI"
          />
        </label>

        <div className="form-grid">
          <label>
            입원 / 통원 (필수)
            <select
              value={
                careSetting
              }
              onChange={(e) => {
                const nextCare = e.target.value as CareSetting;
                changeCareSetting(nextCare);
                if (generation === 2 || generation === 3) {
                  setGen23Form(previous => ({ ...previous, gen23CareSetting: syncGen23CareSetting(nextCare, previous.gen23CareSetting) }));
                }
              }}
            >
              <option value="OUTPATIENT">
                통원
              </option>

              <option value="INPATIENT">
                입원
              </option>
            </select>
          </label>

          <label>
            급여 여부 (필수)
            <select
              value={
                benefitClass
              }
              onChange={(e) =>
                setBenefitClass(
                  e.target
                    .value as BenefitClass
                )
              }
            >
              <option value="UNKNOWN">
                모름
              </option>

              <option value="COVERED">
                급여
              </option>

              <option value="NON_COVERED">
                비급여
              </option>
            </select>
          </label>


        </div>

        <div className="form-grid">
          <label>
            예상 횟수 (필수)
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value
                )
              }
            /><span className="input-unit-label">회</span></span>
          </label>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <label htmlFor="patient-unit-cost" style={{ marginBottom: 0 }}>한 번 진료받을 때 내가 내는 금액 (필수)</label>
              <button type="button" className="sample-button" style={{ minHeight: "30px", padding: "4px 9px", fontSize: "0.8rem" }} aria-label="진료비 입력 안내 확인" aria-haspopup="dialog" aria-controls="patient-cost-dialog" onClick={() => patientCostHelpDialogRef.current?.showModal()}>확인</button>
            </div>
            <span className="input-unit-row"><input
              id="patient-unit-cost"
              type="text"
              inputMode="numeric"
              value={formatWonInput(unitCost)}
              onChange={(e) =>
                setUnitCost(
                  getWonInputValue(e.target.value)
                )
              }
              placeholder="예: 400,000"
            /><span className="input-unit-label">원</span></span>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="copay-institution">
            의료기관 종별 {careSetting === "OUTPATIENT" && (generation === 2 || generation === 3 || benefitClass === "COVERED") && <span>(필수)</span>}
            <InputHelp title="의료기관 종별" description="병원 이름만 보고 판단하지 말고 등록된 의료기관 종류를 선택하세요. 종합병원과 상급종합병원은 서로 다른 선택지입니다." source="병원 안내·원무과" />
            <select id="copay-institution" value={copayInstitution || institutionType} onChange={(e) => {
              const value = e.target.value as CopayInstitution | "";
              setCopayInstitution(value);
              setInstitutionType(value === "TERTIARY" || value === "GENERAL" ? "GENERAL_TERTIARY" : value === "CLINIC" || value === "HOSPITAL" ? "CLINIC_HOSPITAL" : "");
              applyCopayDefault(careSetting, value);
              if (generation === 2 || generation === 3) {
                const institution = value === "TERTIARY" ? "GENERAL_TERTIARY" : value === "GENERAL" || value === "HOSPITAL" ? "HOSPITAL" : value === "CLINIC" ? "CLINIC" : "";
                setGen23Form(previous => ({ ...previous, gen23Institution: institution }));
              }
            }}>
              <option value="">모름 / 해당 없음</option>
              {!copayInstitution && institutionType && <option value={institutionType}>기존 분류 — 세부 종별을 선택해주세요</option>}
              <option value="TERTIARY">상급종합병원</option>
              <option value="GENERAL">종합병원</option>
              <option value="HOSPITAL">병원급</option>
              <option value="CLINIC">의원급</option>
              <option value="PUBLIC_HEALTH">보건기관</option>
            </select>
          </label>
          {(copayInstitution === "GENERAL" || copayInstitution === "HOSPITAL") && careSetting === "OUTPATIENT" && <label htmlFor="institution-region">
            의료기관 소재 지역 (필수)
            <InputHelp title="의료기관 소재 지역" description="거주지가 아니라 진료받는 의료기관의 주소를 기준으로 동지역 또는 읍·면지역을 선택하세요." source="의료기관 주소·병원 원무과" />
            <select id="institution-region" value={copayRegion} onChange={(e) => {
              const value = e.target.value as CopayRegion | "";
              setCopayRegion(value);
              applyCopayDefault(careSetting, copayInstitution, value);
            }}>
              <option value="">선택해주세요</option>
              <option value="DONG">동지역</option>
              <option value="EUP_MYEON">읍·면지역</option>
            </select>
          </label>}

          <label>
            건강보험 본인부담률 (r)
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              max="100"
              step="0.1"
              value={
                healthInsuranceCopayRatePercent
              }
              onChange={(e) =>
                setHealthInsuranceCopayRatePercent(
                  e.target.value
                )
              }
              placeholder="예: 40"
            /><span className="input-unit-label">%</span></span>
          </label>
        </div>

        <div className="form-grid">
          {getTreatmentAdditionalInfoFields().map((field) => {
            if (field.key === "treatmentDate") {
              return (
                <label key={field.key}>
                  {field.label}
                  <IsoDateInput
                    value={treatmentDate}
                    onChange={setTreatmentDate}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              );
            }

            if (field.key === "severityClass") {
              return (
                <label key={field.key}>
                  {field.label}
                  <select
                    value={
                      severityClass
                    }
                    onChange={(e) =>
                      setSeverityClass(
                        e.target
                          .value as SeverityClass
                      )
                    }
                  >
                    <option value="UNKNOWN">
                      모름
                    </option>

                    <option value="SEVERE">
                      산정특례 질환 치료 또는 관련 합병증으로 확인됨
                    </option>

                    <option value="NON_SEVERE">
                      산정특례 미적용 또는 다른 질환 치료로 확인됨
                    </option>
                  </select>
                </label>
              );
            }

            return (
              <label key={field.key}>
                {field.label}
                <span className="input-unit-row"><input
                  type="text"
                  inputMode="numeric"
                  value={
                    formatWonInput(coveredAmount)
                  }
                  onChange={(e) =>
                    setCoveredAmount(
                      getWonInputValue(e.target.value)
                    )
                  }
                  placeholder="모르면 비워두세요"
                /><span className="input-unit-label">원</span></span>
              </label>
            );
          })}
        </div>

          {(generation === 2 || generation === 3) && <Gen23Inputs generation={generation} variant={samsungGen23Variant} insurerName={insurer === "INS_001" ? "삼성화재" : insurer || "보험사"} embedded institutionManaged value={gen23Form} onChange={(values) => {
            setGen23Form(values);
            const selectedCare = genericGen23CareSetting(values.gen23CareSetting);
            if (selectedCare && selectedCare !== careSetting) changeCareSetting(selectedCare);
          }} />}

        {isTreatmentLimitReached && (
          <div className="notice-box">
            예정 치료 3건이 모두 등록되었습니다.
            추가하려면 기존 치료를 수정하거나 삭제해주세요.
          </div>
        )}

        <div className="button-group">
          <button
            type="button"
            className={
              editingUsageId
                ? "primary-button"
                : "secondary-button"
            }
            onClick={
              handleAddTreatment
            }
            disabled={
              isTreatmentLimitReached
            }
          >
            {editingUsageId ? "수정 확인" : "추가하기"}
          </button>

          {editingUsageId && (
            <button
              type="button"
              className="secondary-button"
              onClick={
                handleCancelEdit
              }
            >
              수정 취소
            </button>
          )}
        </div>
          </fieldset>
        </>}

        {plannedUsages.length >
          0 && (
          <div>
            <h3>
              추가된 치료
            </h3>

            {plannedUsages.map(
              (usage, index) => {
                const totalCost =
                  usage.frequency *
                  usage.unitCost;

                const isEditing =
                  editingUsageId ===
                  usage.id;

                const severityLabel =
                  usage.severityClass === "SEVERE"
                    ? "산정특례 질환 치료 또는 관련 합병증으로 확인됨"
                    : usage.severityClass === "NON_SEVERE"
                      ? "산정특례 미적용 또는 다른 질환 치료로 확인됨"
                      : "산정특례 여부 확인 필요";

                return (
                  <article
                    className="treatment-card"
                    key={usage.id}
                  >
                    <div className="treatment-card-header">
                      <div>
                        <span
                          className={
                            isEditing
                              ? "status-badge primary"
                              : "status-badge"
                          }
                        >
                          {isEditing
                            ? "수정 중"
                            : getTreatmentAddLabel(index)}
                        </span>

                        <h3>
                          {
                            usage.treatmentName
                          }
                        </h3>
                      </div>

                      <strong>
                        {totalCost.toLocaleString()}
                        원
                      </strong>
                    </div>

                    <p className="treatment-meta">
                      {usage.frequency}
                      회 ×{" "}
                      {usage.unitCost.toLocaleString()}
                      원
                    </p>

                    <div className="treatment-meta" style={{ display: "grid", gap: "6px" }}>
                      {usage.treatmentCategory && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>치료 분류:</strong>
                          {usage.treatmentCategory}
                        </div>
                      )}

                      {usage.treatmentDate && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>진료 예정일:</strong>
                          {usage.treatmentDate}
                        </div>
                      )}

                      <div>
                        <strong style={{ marginRight: "8px" }}>산정특례 및 치료 관련성:</strong>
                        {severityLabel}
                      </div>

                      {usage.coveredAmount !== undefined && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>회당 보장대상 인정금액 (C):</strong>
                          {usage.coveredAmount.toLocaleString()}원
                        </div>
                      )}
                    </div>

                    {(usage.institutionType ||
                      usage.healthInsuranceCopayRate !==
                        undefined ||
                      usage.coveredAmount !==
                        undefined) && (
                      <p className="treatment-meta">
                        {usage.institutionType ===
                        "CLINIC_HOSPITAL"
                          ? "병·의원"
                          : usage.institutionType ===
                              "GENERAL_TERTIARY"
                            ? "종합·상급종합병원"
                            : ""}
                        {usage.healthInsuranceCopayRate !==
                        undefined
                          ? ` · 건보 본인부담률 ${
                              usage.healthInsuranceCopayRate *
                              100
                            }%`
                          : ""}
                        {usage.coveredAmount !==
                        undefined
                          ? ` · C ${usage.coveredAmount.toLocaleString()}원`
                          : ""}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "18px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleEditTreatment(
                            usage
                          )
                        }
                        title={`${usage.treatmentName} 수정`}
                        aria-label={`${usage.treatmentName} 수정`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "7px",
                          minHeight: "40px",
                          padding: "0 14px",
                          border:
                            "1px solid var(--color-primary-200, #b9d1ea)",
                          borderRadius: "10px",
                          background: "#ffffff",
                          color:
                            "var(--color-primary-800, #164f86)",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 20H8L18.5 9.5C19.3284 8.67157 19.3284 7.32843 18.5 6.5L17.5 5.5C16.6716 4.67157 15.3284 4.67157 14.5 5.5L4 16V20Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13.5 6.5L17.5 10.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveTreatment(
                            usage
                          )
                        }
                        title={`${usage.treatmentName} 삭제`}
                        aria-label={`${usage.treatmentName} 삭제`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "7px",
                          minHeight: "40px",
                          padding: "0 14px",
                          border: "1px solid #fecaca",
                          borderRadius: "10px",
                          background: "#fff7f7",
                          color: "#b42318",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 7H20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M6.5 7L7.2 19C7.2352 19.6048 7.7359 20.0769 8.3417 20.0769H15.6583C16.2641 20.0769 16.7648 19.6048 16.8 19L17.5 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 11V16M14 11V16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        삭제
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
      </div>

      {/* STEP 4 */}
      <div className="workflow-panel" data-direction={transitionDirection} hidden={activeStep !== 3}>
      <section id="input-step-3" tabIndex={-1} className="form-card">
        <span className="step-badge">
          STEP 03 · 명시적 계산 가정
        </span>

        <h2 className="card-title">
          계산을 위한 추가 확인
        </h2>

        <p className="card-description">
          부족한 정보를 임의 추정하지 않습니다. 사실에 맞는 항목만 선택해주세요.
        </p>

        <div
          style={{
            display: "grid",
            gap: "14px",
            marginTop: "18px",
          }}
        >
          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeEntireMedicalCostCovered
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeEntireMedicalCostCovered
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeEntireMedicalCostCovered
              }
              onChange={(e) =>
                setAssumeEntireMedicalCostCovered(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                현재 계약과 5세대의 보장대상 금액(C)을 모르겠어요.
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                선택하면 현재 계약과 5세대 모두 입력한 회당 환자부담 의료비
                전액을 보장대상 금액(C)으로 가정합니다.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeNoPriorLimitUsage
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeNoPriorLimitUsage
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeNoPriorLimitUsage
              }
              onChange={(e) =>
                setAssumeNoPriorLimitUsage(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                올해 이미 사용한 보험 한도가 없어요.
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                같은 보장으로 받은 보험금이나 사용한 한도가 없다고 가정합니다.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: assumeEachOccurrenceSeparate
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: assumeEachOccurrenceSeparate
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                assumeEachOccurrenceSeparate
              }
              onChange={(e) =>
                setAssumeEachOccurrenceSeparate(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                각 치료를 별도 방문으로 계산
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                선택하면 입력한 치료 횟수를 각각 별도의 병원 방문으로 계산합니다.
                같은 날 여러 치료를 받을 예정이라면 선택하지 마세요.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "18px",
              border: isStep3Confirmed
                ? "1.5px solid var(--color-primary-600, #2d6fa8)"
                : "1px solid var(--color-border)",
              borderRadius: "16px",
              background: isStep3Confirmed
                ? "var(--color-primary-050, #f4f9fe)"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                isStep3Confirmed
              }
              onChange={(e) =>
                setIsStep3Confirmed(
                  e.target.checked
                )
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "1rem",
                }}
              >
                예정치료를 입력하셨나요?
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                예정 치료와 진료 예정일을 포함한 입력 내용을 확인했습니다.
                예정 치료가 없는 경우에는 해당 선택을 확인해주세요.
              </span>
            </span>
          </label>
        </div>

        <div
          className="notice-box"
          style={{ marginTop: "16px" }}
        >
          체크하지 않은 조건과 ‘모름’으로 둔 급여·중증 여부는 계산 근거에서
          보험사 확인 필요 항목으로 표시됩니다.
        </div>
      </section>
      </div>

      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          onClick={handleResetAll}
        >
          전체 초기화
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => activeStep === 1 ? navigate("/") : goToInputStep((activeStep - 1) as 1 | 2)}
        >
          이전
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={activeStep === 3 && !isStep3Confirmed}
          onClick={() => {
            if (activeStep === 1) handleStep1Next();
            else if (activeStep === 2) goToInputStep(3);
            else handleNext();
          }}
        >
          {activeStep < 3 ? "다음 단계" : "입력 정보 확인하기"}
        </button>
      </div>

      <dialog id="patient-cost-dialog" ref={patientCostHelpDialogRef} className="treatment-help-dialog" aria-labelledby="patient-cost-title" aria-describedby="patient-cost-help" onClick={(event) => {
        if (event.target === event.currentTarget) patientCostHelpDialogRef.current?.close();
      }}>
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="patient-cost-title" className="card-title">한 번 진료받을 때 내가 내는 금액</h2>
          <p id="patient-cost-help">진료비 영수증의 환자부담금 합계(급여 본인부담금 + 비급여)를 입력하세요. 보험사에서 돌려받을 금액은 빼지 않습니다. 진료 전이라면 병원에서 안내받은 예상 금액을 입력하세요.</p>
          <p>정밀 계산 항목은 확인되는 값만 입력하세요. 모르는 값은 비워두면 임의로 추정하지 않고 결과에서 확인 필요로 표시합니다.</p>
          <div className="button-group"><button type="button" className="primary-button" autoFocus onClick={() => patientCostHelpDialogRef.current?.close()}>닫기</button></div>
        </section>
      </dialog>

      <dialog ref={treatmentSampleDialogRef} className="treatment-help-dialog" aria-labelledby="treatment-sample-title">
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="treatment-sample-title" className="card-title">치료 샘플 선택</h2>
          <p>내 상황과 가까운 입력 예제를 선택하세요. 금액과 계약 조건은 연습용 가정입니다. 횟수와 급여 여부는 불러온 뒤 직접 입력해주세요.</p>
          <div style={{ display: "grid", gap: "12px" }}>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("OUTPATIENT")}>일반 외래 진료</button>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("EXAM")}>외래 검사</button>
            <button type="button" className="sample-button" onClick={() => handleLoadSampleTreatments("MRI")}>MRI 검사</button>
            <button type="button" className="secondary-button" onClick={() => treatmentSampleDialogRef.current?.close()}>닫기</button>
          </div>
        </section>
      </dialog>

      <dialog
        ref={treatmentHelpDialogRef}
        className="treatment-help-dialog"
        aria-labelledby="treatment-help-title"
        aria-describedby="treatment-help-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) treatmentHelpDialogRef.current?.close();
        }}
      >
        <section className="app-card" style={{ margin: 0 }}>
          <h2 id="treatment-help-title" className="card-title">필수 항목을 정확하게 입력해주세요</h2>
          <p id="treatment-help-description" className="card-description">
            ‘필수’로 표시된 항목을 실제 정보에 맞게 입력할수록, 내 상황에 맞는 비교 결과를 확인하는 데 도움이 됩니다.
            항목이 비어 있거나 실제와 다른 값을 입력하면 계산이 제한되거나 결과가 달라질 수 있습니다.
          </p>
          <p>진료비는 영수증이나 병원의 예상 비용을 참고하고, 모르는 값은 임의로 채우지 마세요. 샘플을 불러왔다면 본인의 치료·계약 정보로 수정해주세요.</p>
          <p>입력을 모두 완료해도 실제 보험금 지급액이 확정되는 것은 아닙니다.</p>
          <div className="button-group">
            <button type="button" className="primary-button" autoFocus onClick={() => treatmentHelpDialogRef.current?.close()}>확인</button>
          </div>
        </section>
      </dialog>

      {isResetModalOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelResetAll();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background:
              "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(4px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="input-reset-dialog-title"
            aria-describedby="input-reset-dialog-description"
            className="app-card"
            style={{
              width: "min(100%, 460px)",
              margin: 0,
              padding:
                "clamp(22px, 5vw, 30px)",
              boxSizing: "border-box",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <span className="step-badge">
              입력 초기화
            </span>

            <h2
              id="input-reset-dialog-title"
              className="card-title"
              style={{ marginTop: "10px" }}
            >
              입력 내용을 모두 지울까요?
            </h2>

            <p
              id="input-reset-dialog-description"
              className="card-description"
            >
              현재 계약, 5세대 비교 조건, 예정 치료와 계산 가정이 모두 초기화됩니다.
            </p>

            <div
              className="button-group"
              style={{ marginTop: "22px" }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelResetAll}
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmResetAll}
              >
                전체 초기화
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingDeleteUsage && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelRemoveTreatment();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background:
              "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(4px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="treatment-delete-dialog-title"
            aria-describedby="treatment-delete-dialog-description"
            className="app-card"
            style={{
              width: "min(100%, 460px)",
              margin: 0,
              padding:
                "clamp(22px, 5vw, 30px)",
              boxSizing: "border-box",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <span className="step-badge">
              예정 치료 삭제
            </span>

            <h2
              id="treatment-delete-dialog-title"
              className="card-title"
              style={{ marginTop: "10px" }}
            >
              이 치료를 삭제할까요?
            </h2>

            <p
              id="treatment-delete-dialog-description"
              className="card-description"
            >
              “{pendingDeleteUsage.treatmentName}” 항목이 예정 치료 목록에서 삭제됩니다.
            </p>

            <div
              className="button-group"
              style={{ marginTop: "22px" }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelRemoveTreatment}
                autoFocus
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleConfirmRemoveTreatment}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  minHeight: "48px",
                  padding: "0 18px",
                  border: "1px solid #dc2626",
                  borderRadius: "12px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    "0 6px 16px rgba(220, 38, 38, 0.18)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 7L7.2 19C7.2352 19.6048 7.7359 20.0769 8.3417 20.0769H15.6583C16.2641 20.0769 16.7648 19.6048 16.8 19L17.5 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11V16M14 11V16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                삭제
              </button>
            </div>
          </section>
        </div>
      )}
      {activeStep === 2 && plannedUsages.map(usage => <SamsungPrecisionInputs key={usage.id} usage={usage} onChange={updated => setPlannedUsages(previous => previous.map(item => item.id === updated.id ? updated : item))} />)}
    </main>
    </AppShell>
  );
}

export default M02InputPage;
