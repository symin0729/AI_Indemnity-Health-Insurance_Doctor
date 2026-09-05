import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type {
  BenefitClass,
  CareSetting,
  MedicalInstitutionType,
  MedicalUsage,
  SeverityClass,
} from "../../domain/medical";

import type { InsuranceGeneration } from "../../domain/insurance";

import {
  SAMPLE_POLICY_OPTIONS,
  samplePolicyService,
  type SampleId,
} from "../../services/samplePolicyService";

import {
  sampleScenarioService,
} from "../../services/sampleScenarioService";

import { useAnalysisStore } from "../../store/useAnalysisStore";


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
    reentryCycleMonths,
    setReentryCycleMonths,
  ] = useState(
    savedContract?.reentryCycleMonths != null
      ? String(
          savedContract.reentryCycleMonths
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

  const [
    hasCurrentSpecialRider1,
    setHasCurrentSpecialRider1,
  ] = useState(
    savedContract?.coverages.includes(
      "SPECIAL_RIDER_1"
    ) ?? false
  );

  const [
    hasCurrentSpecialRider2,
    setHasCurrentSpecialRider2,
  ] = useState(
    savedContract?.coverages.includes(
      "SPECIAL_RIDER_2"
    ) ||
      savedContract?.coverages.includes(
        "NON_COVERED"
      ) ||
      false
  );

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

  /**
   * C: 해당 비교안에서 약관상 보장대상으로 인정되는 금액.
   * 모르면 비워두고 결과에서 확인 필요로 처리한다.
   */
  const [
    coveredAmount,
    setCoveredAmount,
  ] = useState("");

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

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isResetModalOpen,
    setIsResetModalOpen,
  ] = useState(false);

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

      setReentryCycleMonths(
        sample.reentryCycleMonths != null
          ? String(
              sample.reentryCycleMonths
            )
          : ""
      );

      setHasCurrentSpecialRider1(
        sample.coverages.includes(
          "SPECIAL_RIDER_1"
        )
      );

      setHasCurrentSpecialRider2(
        sample.coverages.includes(
          "SPECIAL_RIDER_2"
        ) ||
          sample.coverages.includes(
            "NON_COVERED"
          )
      );

      setPlannedUsages(
        scenario.plannedUsages.map(
          (usage) => ({
            ...usage,
          })
        )
      );

      if (
        scenario.target5GSpecialRider2 !==
        null
      ) {
        setHasTarget5GSpecialRider2(
          scenario.target5GSpecialRider2
        );
      }

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

      setIsSampleConfirmed(false);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "샘플 보험증권을 불러오지 못했습니다."
      );
    }
  };

  // ========================================
  // 치료 입력칸 초기화
  // ========================================

  const resetTreatmentForm = () => {
    setTreatmentName("");
    setCareSetting("OUTPATIENT");
    setBenefitClass("UNKNOWN");
    setSeverityClass("UNKNOWN");
    setFrequency("1");
    setUnitCost("");
    setTreatmentDate("");
    setTreatmentCategory("");
    setInstitutionType("");
    setHealthInsuranceCopayRatePercent("");
    setCoveredAmount("");
    setEditingUsageId(null);
  };

  // ========================================
  // 전체 화면 입력 초기화
  // ========================================

  const resetLocalForm = () => {
    setInsurer("");
    setProductName("");
    setInceptionDate("");
    setGeneration(3);
    setMonthlyPremium("");
    setRenewalCycleMonths("");
    setReentryCycleMonths("");
    setSelectedSampleId(null);
    setIsSampleConfirmed(false);
    setSampleScenarioNotice("");
    setHasCurrentSpecialRider1(false);
    setHasCurrentSpecialRider2(false);

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

    resetTreatmentForm();

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

    const usage: MedicalUsage = {
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
  };

  // ========================================
  // 치료 수정 시작
  // ========================================

  const handleEditTreatment = (
    usage: MedicalUsage
  ) => {
    setErrorMessage("");

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
  };

  // ========================================
  // 수정 취소
  // ========================================

  const handleCancelEdit = () => {
    resetTreatmentForm();
    setErrorMessage("");
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

  const handleNext = () => {
    setErrorMessage("");

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
      reentryCycleMonths
        ? Number(
            reentryCycleMonths
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
        "재가입 주기는 1개월 이상의 정수로 입력하거나 비워주세요."
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

    if (
      finalUsages.length === 0
    ) {
      setErrorMessage(
        "예정 치료를 1개 이상 입력해주세요."
      );

      return;
    }

    const currentCoverages: string[] =
      [];

    if (generation === 5) {
      if (hasCurrentSpecialRider1) {
        currentCoverages.push(
          "SPECIAL_RIDER_1"
        );
      }

      if (hasCurrentSpecialRider2) {
        currentCoverages.push(
          "SPECIAL_RIDER_2"
        );
      }
    } else if (
      hasCurrentSpecialRider2
    ) {
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
        reentryCycleNumber,

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

    navigate("/confirm");
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

  // ========================================
  // STEP별 입력 완료 상태
  // ========================================

  const isCurrentContractComplete =
    insurer.trim().length > 0 &&
    productName.trim().length > 0 &&
    inceptionDate.length > 0 &&
    Number(monthlyPremium) > 0;

  const isTargetConditionComplete =
    Number(target5GMonthlyPremium) > 0;

  const hasDraftTreatment =
    treatmentName.trim().length > 0 ||
    unitCost.length > 0 ||
    treatmentDate.length > 0 ||
    treatmentCategory.trim().length > 0 ||
    institutionType.length > 0 ||
    healthInsuranceCopayRatePercent.length > 0 ||
    coveredAmount.length > 0;

  const treatmentStatusText =
    plannedUsages.length >= MAX_TREATMENTS
      ? `${MAX_TREATMENTS}건 등록 · 최대`
      : plannedUsages.length > 0
        ? `${plannedUsages.length}건 등록`
        : hasDraftTreatment
          ? "입력 중"
          : "미입력";

  const isTreatmentLimitReached =
    plannedUsages.length >= MAX_TREATMENTS &&
    !editingUsageId;

  return (
    <main>
      <header
        className="page-header"
        style={{
          position: "relative",
          maxWidth: "none",
          padding: "clamp(22px, 4vw, 36px)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          background:
            "linear-gradient(135deg, var(--color-primary-050) 0%, #ffffff 72%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "clamp(18px, 4vw, 42px)",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: "1 1 480px",
              minWidth: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <span className="page-brand">
              AI 실손 닥터
            </span>

            <h1
              style={{
                marginTop: "18px",
                maxWidth: "680px",
              }}
            >
              내 보험 정보
            </h1>

            <p
              className="page-description"
              style={{
                maxWidth: "640px",
                marginBottom: "18px",
              }}
            >
              현재 보험과 5세대 비교 조건,
              앞으로 예상되는 의료이용 정보를
              입력해주세요.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span className="rule-info">
                현재 계약 확인
              </span>

              <span className="rule-info">
                5세대 비교 조건
              </span>

              <span className="rule-info">
                예정 치료 1~3건
              </span>

              <span className="rule-info">
                계산 가정 직접 선택
              </span>
            </div>
          </div>

          <div
            style={{
              flex: "0 1 320px",
              width: "min(100%, 320px)",
              marginLeft: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/ai-insurance-contract.png"
              alt="보험 계약서와 보장 항목을 확인하는 AI 도우미 일러스트"
              style={{
                width: "100%",
                maxWidth: "320px",
                height: "auto",
                objectFit: "contain",
                filter:
                  "drop-shadow(0 16px 28px rgba(21, 55, 91, 0.14))",
              }}
            />
          </div>
        </div>
      </header>

      <section className="app-card">
        <h2 className="card-title">
          입력 진행 상태
        </h2>

        <p className="card-description">
          현재 입력된 내용을 기준으로 각 단계의 완료 상태를 표시합니다.
        </p>

        <div className="form-grid">
          <div>
            <p className="amount-label">
              STEP 1 · 현재 계약
            </p>

            <span
              className={
                isCurrentContractComplete
                  ? "status-badge success"
                  : "status-badge warning"
              }
            >
              {isCurrentContractComplete
                ? "입력 완료"
                : "입력 필요"}
            </span>
          </div>

          <div>
            <p className="amount-label">
              STEP 2 · 5세대 비교
            </p>

            <span
              className={
                isTargetConditionComplete
                  ? "status-badge success"
                  : "status-badge warning"
              }
            >
              {isTargetConditionComplete
                ? "비교 조건 완료"
                : "보험료 입력 필요"}
            </span>
          </div>

          <div>
            <p className="amount-label">
              STEP 3 · 예정 치료
            </p>

            <span
              className={
                plannedUsages.length > 0
                  ? "status-badge success"
                  : hasDraftTreatment
                    ? "status-badge primary"
                    : "status-badge warning"
              }
            >
              {treatmentStatusText}
            </span>
          </div>

          <div>
            <p className="amount-label">
              STEP 4 · 계산 가정
            </p>

            <span className="status-badge primary">
              직접 선택
            </span>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          className="notice-box error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* STEP 1 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 1
        </span>

        <h2 className="card-title">
          현재 계약
        </h2>

        <p className="card-description">
          직접 입력하거나 시연용 샘플 보험증권을 불러와
          계약 정보와 예정 치료를 자동으로 채울 수 있습니다.
        </p>

        <div
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
            onChange={setInceptionDate}
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

        <label>
          현재 월 보험료
          <input
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            value={
              monthlyPremium
            }
            onChange={(e) =>
              setMonthlyPremium(
                e.target.value
              )
            }
            placeholder="예: 60000"
          />
          원
        </label>

          <label>
            갱신 주기
            <input
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
            />
            개월
          </label>

          <label>
            재가입 주기
            <input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={
                reentryCycleMonths
              }
              onChange={(e) =>
                setReentryCycleMonths(
                  e.target.value
                )
              }
              placeholder="모르면 비워두기"
            />
            개월
          </label>
        </div>

        <div className="notice-box">
          공모전 MVP에서는 사전에 검증한 샘플 정보를 사용할 수 있습니다.
          샘플을 불러온 경우 실제 계산 전 사용자가 내용을 다시 확인해야 합니다.
        </div>

        {generation === 5 && (
          <label>
            <input
              type="checkbox"
              checked={
                hasCurrentSpecialRider1
              }
              onChange={(e) =>
                setHasCurrentSpecialRider1(
                  e.target.checked
                )
              }
            />{" "}
            현재 계약 중증 비급여 특약1 가입
          </label>
        )}

        <label>
          <input
            type="checkbox"
            checked={
              hasCurrentSpecialRider2
            }
            onChange={(e) =>
              setHasCurrentSpecialRider2(
                e.target.checked
              )
            }
          />{" "}
          {generation === 5
            ? "현재 계약 비중증 비급여 특약2 가입"
            : "현재 계약 비급여 특약 가입"}
        </label>
      </section>

      {/* STEP 2 */}
      <section className="compare-card">
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

        <label>
          비교용 5세대 월 보험료
          <input
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            value={
              target5GMonthlyPremium
            }
            onChange={(e) =>
              setTarget5GMonthlyPremiumInput(
                e.target.value
              )
            }
            placeholder="예: 35000"
          />
          원
        </label>

        <label>
          <input
            type="checkbox"
            checked={
              hasTarget5GSpecialRider1
            }
            onChange={(e) =>
              setHasTarget5GSpecialRider1(
                e.target.checked
              )
            }
          />{" "}
          5세대 중증 비급여 특약1 가입
        </label>

        <label>
          <input
            type="checkbox"
            checked={
              hasTarget5GSpecialRider2
            }
            onChange={(e) =>
              setHasTarget5GSpecialRider2(
                e.target.checked
              )
            }
          />{" "}
          5세대 비급여 특약2 가입
        </label>

        <div className="notice-box">
          비교용 보험료는 사용자가 직접
          입력한 가정값입니다. 실제 5세대
          전환 보험료를 확정하지 않습니다.
        </div>
      </section>

      {/* STEP 3 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 3
        </span>

        <h2 className="card-title">
          예정 치료
        </h2>

        <p className="card-description">
          앞으로 예상되는 의료이용을
          입력합니다. 치료는 최대 3건까지
          추가하거나 수정할 수 있습니다.
        </p>

        {editingUsageId && (
          <div className="notice-box">
            현재 선택한 치료를 수정하고
            있습니다.
          </div>
        )}

        <label>
          치료명
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
            치료 분류
            <input
              type="text"
              value={
                treatmentCategory
              }
              onChange={(e) =>
                setTreatmentCategory(
                  e.target.value
                )
              }
              placeholder="예: MRI"
            />
          </label>

          <label>
            진료 예정일
            <IsoDateInput
              value={treatmentDate}
              onChange={setTreatmentDate}
              placeholder="YYYY-MM-DD (선택)"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            입원 / 통원
            <select
              value={
                careSetting
              }
              onChange={(e) =>
                setCareSetting(
                  e.target
                    .value as CareSetting
                )
              }
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
            급여 여부
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

          <label>
            중증 여부
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
                중증
              </option>

              <option value="NON_SEVERE">
                비중증
              </option>
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            예상 횟수
            <input
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
            />
            회
          </label>

          <label>
            회당 환자부담 의료비 (M)
            <input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              value={unitCost}
              onChange={(e) =>
                setUnitCost(
                  e.target.value
                )
              }
              placeholder="예: 400000"
            />
            원
          </label>
        </div>

        <div className="notice-box">
          아래 정밀 계산 항목은 확인되는 값만 입력하세요.
          모르는 값은 비워두면 임의로 추정하지 않고 결과에서 확인 필요로 표시합니다.
        </div>

        <div className="form-grid">
          <label>
            의료기관 종별
            <select
              value={
                institutionType
              }
              onChange={(e) =>
                setInstitutionType(
                  e.target.value as
                    | ""
                    | MedicalInstitutionType
                )
              }
            >
              <option value="">
                모름 / 해당 없음
              </option>
              <option value="CLINIC_HOSPITAL">
                병·의원
              </option>
              <option value="GENERAL_TERTIARY">
                종합·상급종합병원
              </option>
            </select>
          </label>

          <label>
            건강보험 본인부담률 (r)
            <input
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
            />
            %
          </label>
        </div>

        <label>
          회당 보장대상 인정금액 (C)
          <input
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            value={
              coveredAmount
            }
            onChange={(e) =>
              setCoveredAmount(
                e.target.value
              )
            }
            placeholder="모르면 비워두세요"
          />
          원
        </label>

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
            {editingUsageId
              ? "치료 수정 완료"
              : isTreatmentLimitReached
                ? "최대 3건 등록 완료"
                : "+ 치료 추가"}
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
                            : `치료 ${index + 1}`}
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
                      {usage.treatmentCategory
                        ? ` · ${usage.treatmentCategory}`
                        : ""}
                      {usage.treatmentDate
                        ? ` · ${usage.treatmentDate}`
                        : ""}
                    </p>

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

      {/* STEP 4 */}
      <section className="form-card">
        <span className="step-badge">
          STEP 4
        </span>

        <h2 className="card-title">
          계산을 위한 추가 확인
        </h2>

        <p className="card-description">
          정확한 계산에 필요한 정보가 부족할 때만 아래 항목을 선택해주세요.
          잘 모르겠다면 체크하지 않아도 됩니다.
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
                보장되는 금액을 모르겠어요
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                입력한 회당 치료비 전액이 보험 보장대상이라고 가정해서 계산합니다.
                실제 보장범위가 다르면 결과도 달라질 수 있습니다.
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
                올해 이미 사용한 보험 한도가 없어요
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                올해 같은 보장으로 이미 받은 보험금이나 사용한 한도가 없다고 가정합니다.
                이미 보험금을 받은 적이 있다면 체크하지 마세요.
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
                여러 번의 치료는 각각 다른 날에 받는다고 볼게요
              </strong>
              <span
                style={{
                  display: "block",
                  color: "var(--color-text-sub)",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                치료 날짜를 입력하지 않은 경우 각 회차를 서로 다른 진료일이나 입원 건으로 계산합니다.
                같은 날 여러 번 치료하거나 같은 입원 중 반복 치료라면 체크하지 마세요.
              </span>
            </span>
          </label>
        </div>

        <div
          className="notice-box"
          style={{ marginTop: "16px" }}
        >
          체크하지 않은 항목은 임의로 추정하지 않습니다.
          필요한 경우 결과 화면에서 <strong>확인 필요</strong>로 안내합니다.
        </div>
      </section>

      <div className="notice-box warning">
        급여 여부나 중증 여부처럼 확실하지 않은 정보도 임의로 정하지 않습니다.
        모르는 항목은 그대로 두면 결과에서 확인이 필요한 부분을 알려드립니다.
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
          onClick={() =>
            navigate("/")
          }
        >
          이전
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={
            handleNext
          }
        >
          입력 정보 확인하기
        </button>
      </div>

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
    </main>
  );
}

export default M02InputPage;