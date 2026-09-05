import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type {
  BenefitClass,
  CareSetting,
  MedicalUsage,
  SeverityClass,
} from "../../domain/medical";

import type {
  InsuranceGeneration,
} from "../../domain/insurance";

import {
  SAMPLE_POLICY_OPTIONS,
  samplePolicyService,
  type SampleId,
} from "../../services/samplePolicyService";

import {
  sampleScenarioService,
} from "../../services/sampleScenarioService";

import { useAnalysisStore } from "../../store/useAnalysisStore";

function M02InputPage() {
  const navigate = useNavigate();

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
    hasCurrentNonCoveredCoverage,
    setHasCurrentNonCoveredCoverage,
  ] = useState(
    savedContract?.coverages.includes(
      "NON_COVERED"
    ) ?? false
  );

  const [
    hasCurrentSpecialRider2,
    setHasCurrentSpecialRider2,
  ] = useState(
    savedContract?.coverages.includes(
      "SPECIAL_RIDER_2"
    ) ?? false
  );

  // ========================================
  // 샘플 보험증권
  // ========================================

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
    hasTarget5GSpecialRider2,
    setHasTarget5GSpecialRider2,
  ] = useState(
    savedTarget5GCoverages.includes(
      "SPECIAL_RIDER_2"
    )
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

      // 현재 계약 샘플값
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

      setHasCurrentNonCoveredCoverage(
        sample.coverages.includes(
          "NON_COVERED"
        )
      );

      setHasCurrentSpecialRider2(
        sample.coverages.includes(
          "SPECIAL_RIDER_2"
        )
      );

      // 시연용 예정 치료
      setPlannedUsages(
        scenario.plannedUsages.map(
          (usage) => ({
            ...usage,
          })
        )
      );

      // 시연 시나리오에서 문서 근거가 있는 경우에만
      // 비교용 특약2 상태를 자동 설정
      if (
        scenario.target5GSpecialRider2 !==
        null
      ) {
        setHasTarget5GSpecialRider2(
          scenario.target5GSpecialRider2
        );
      }

      // 기존 작성 중이던 치료 draft 제거
      setTreatmentName("");
      setCareSetting("OUTPATIENT");
      setBenefitClass("UNKNOWN");
      setSeverityClass("UNKNOWN");
      setFrequency("1");
      setUnitCost("");
      setEditingUsageId(null);

      setSelectedSampleId(
        sampleId
      );

      setSampleScenarioNotice(
        scenario.notice
      );

      // 사용자가 불러온 값을 확인해야 다음 단계 진행
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

    setHasCurrentNonCoveredCoverage(
      false
    );

    setHasCurrentSpecialRider2(
      false
    );

    setSelectedSampleId(null);
    setIsSampleConfirmed(false);
    setSampleScenarioNotice("");

    setTarget5GMonthlyPremiumInput(
      ""
    );

    setHasTarget5GSpecialRider2(
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

  const handleConfirmResetAll =
    () => {
      setIsResetModalOpen(false);

      resetAnalysis();
      resetLocalForm();
    };

  const handleCancelResetAll =
    () => {
      setIsResetModalOpen(false);
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
      unitCostNumber <= 0
    ) {
      setErrorMessage(
        "회당 치료비를 올바르게 입력해주세요."
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
      plannedUsages.length >= 3
    ) {
      setErrorMessage(
        "예정 치료는 최대 3건까지 추가할 수 있습니다."
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
    const confirmed =
      window.confirm(
        `"${usage.treatmentName}" 치료를 삭제할까요?`
      );

    if (!confirmed) {
      return;
    }

    setPlannedUsages(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !== usage.id
        )
    );

    if (
      editingUsageId === usage.id
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

    const hasDraftTreatment =
      treatmentName.trim() ||
      unitCost;

    if (hasDraftTreatment) {
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
        if (
          finalUsages.length >= 3
        ) {
          setErrorMessage(
            "예정 치료는 최대 3건까지 추가할 수 있습니다."
          );

          return;
        }

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

    if (
      finalUsages.length > 3
    ) {
      setErrorMessage(
        "예정 치료는 최대 3건까지 입력할 수 있습니다."
      );

      return;
    }

    const currentCoverages: string[] =
      [];

    if (
      hasCurrentNonCoveredCoverage
    ) {
      currentCoverages.push(
        "NON_COVERED"
      );
    }

    if (
      hasCurrentSpecialRider2
    ) {
      currentCoverages.push(
        "SPECIAL_RIDER_2"
      );
    }

    const target5GCoverages: string[] =
      [];

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

    navigate("/confirm");
  };

  const selectedSample =
    SAMPLE_POLICY_OPTIONS.find(
      (option) =>
        option.id ===
        selectedSampleId
    );

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
              보험과 예정 치료를 입력해 주세요
            </h1>

            <p
              className="page-description"
              style={{
                maxWidth: "640px",
                marginBottom: "18px",
              }}
            >
              현재 계약과 5세대 비교 조건을 먼저
              확인한 뒤, 앞으로 예상되는 치료를
              최대 3건까지 입력합니다.
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
          직접 입력하거나 시연용 샘플
          보험증권 정보를 불러올 수 있습니다.
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
                공모전 MVP에서는 사전에 검증한
                샘플 정보를 사용합니다.
                샘플을 선택하면 계약 정보와
                예정 치료가 자동으로 채워지며,
                불러온 값은 직접 확인한 뒤
                계산에 사용합니다.
              </p>
            </div>

            <span className="rule-info">
              직접 수정 가능
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
                  {selectedSample.label} 샘플을
                  불러왔습니다
                </strong>

                <span className="status-badge success">
                  입력 완료
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
                불러온 계약 정보를 직접
                확인했습니다.
              </label>
            </div>
          )}
        </div>

        <div
          style={{
            marginBottom: "14px",
          }}
        >
          <p
            className="amount-label"
            style={{ marginBottom: "4px" }}
          >
            계약 기본 정보
          </p>

          <h3 style={{ marginBottom: 0 }}>
            현재 가입 내용을 확인해 주세요
          </h3>
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
            <input
              type="date"
              value={
                inceptionDate
              }
              onChange={(e) =>
                setInceptionDate(
                  e.target.value
                )
              }
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
              inputMode="numeric"
              onWheel={(e) =>
                e.currentTarget.blur()
              }
              min="1"
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
              onWheel={(e) =>
                e.currentTarget.blur()
              }
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
              onWheel={(e) =>
                e.currentTarget.blur()
              }
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

        <div
          style={{
            marginTop: "8px",
            padding: "18px",
            border:
              "1px solid var(--color-border)",
            borderRadius:
              "var(--radius-sm)",
            background:
              "var(--color-surface-soft)",
          }}
        >
          <p
            className="amount-label"
            style={{ marginBottom: "10px" }}
          >
            현재 계약 특약
          </p>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <label
              style={{ marginBottom: 0 }}
            >
              <input
                type="checkbox"
                checked={
                  hasCurrentNonCoveredCoverage
                }
                onChange={(e) =>
                  setHasCurrentNonCoveredCoverage(
                    e.target.checked
                  )
                }
              />{" "}
              비급여 특약 가입
            </label>

            <label
              style={{ marginBottom: 0 }}
            >
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
              비급여 특약2 가입
            </label>
          </div>

          <p
            className="treatment-meta"
            style={{
              margin: "14px 0 0",
              paddingTop: "12px",
              borderTop:
                "1px solid var(--color-border)",
            }}
          >
            일반 비급여 특약과 비급여 특약2는
            같은 특약으로 자동 판단하지 않습니다.
            실제 가입 내용을 확인해 주세요.
          </p>
        </div>
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

        <div className="card-grid">
          <div
            style={{
              padding: "18px",
              border:
                "1px solid var(--color-border)",
              borderRadius:
                "var(--radius-sm)",
              background: "#ffffff",
            }}
          >
            <label style={{ marginBottom: 0 }}>
              비교용 5세대 월 보험료
              <input
                type="number"
                inputMode="numeric"
                onWheel={(e) =>
                  e.currentTarget.blur()
                }
                min="1"
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
          </div>

          <div
            style={{
              padding: "18px",
              border:
                "1px solid var(--color-border)",
              borderRadius:
                "var(--radius-sm)",
              background: "#ffffff",
            }}
          >
            <p
              className="amount-label"
              style={{ marginBottom: "12px" }}
            >
              비교 대상 특약
            </p>

            <label style={{ marginBottom: 0 }}>
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
          </div>
        </div>

        <div className="notice-box warning">
          비교용 보험료는 사용자가 입력하는
          가정값입니다. 실제 전환 보험료와
          가입 가능 여부는 보험사 확인이
          필요합니다.
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

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <p
            className="card-description"
            style={{ marginBottom: 0 }}
          >
            예정 의료이용을 최소 1건,
            최대 3건까지 입력합니다.
          </p>

          <span className="rule-info">
            현재 {plannedUsages.length}/3건
          </span>
        </div>

        <div className="notice-box">
          시연 시 MRI·주사·물리치료 등의
          예정 의료이용을 입력할 수 있습니다.
          문서에 수치가 확인되지 않은 치료비나
          횟수는 자동 생성하지 않습니다.
        </div>

        {editingUsageId && (
          <div className="notice-box">
            현재 선택한 치료를
            수정하고 있습니다.
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
              inputMode="numeric"
              onWheel={(e) =>
                e.currentTarget.blur()
              }
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
            회당 비용
            <input
              type="number"
              inputMode="numeric"
              onWheel={(e) =>
                e.currentTarget.blur()
              }
              min="1"
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
              !editingUsageId &&
              plannedUsages.length >= 3
            }
          >
            {editingUsageId
              ? "치료 수정 완료"
              : plannedUsages.length >= 3
                ? "최대 3건 입력 완료"
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
              추가된 치료 (
              {plannedUsages.length}
              /3)
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
                      {usage.careSetting ===
                      "OUTPATIENT"
                        ? "통원"
                        : "입원"}
                      {" · "}
                      {usage.benefitClass ===
                      "COVERED"
                        ? "급여"
                        : usage.benefitClass ===
                            "NON_COVERED"
                          ? "비급여"
                          : "급여 여부 모름"}
                      {" · "}
                      {usage.severityClass ===
                      "SEVERE"
                        ? "중증"
                        : usage.severityClass ===
                            "NON_SEVERE"
                          ? "비중증"
                          : "중증 여부 모름"}
                    </p>

                    <p className="treatment-meta">
                      {usage.frequency}
                      회 ×{" "}
                      {usage.unitCost.toLocaleString()}
                      원
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
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
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          minHeight: "38px",
                          padding: "8px 12px",
                          border:
                            "1px solid var(--color-border-strong)",
                          borderRadius:
                            "var(--radius-xs)",
                          background:
                            "#ffffff",
                          color:
                            "var(--color-primary-800)",
                          fontWeight: 800,
                        }}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m14 8 3 3"
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
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          minHeight: "38px",
                          padding: "8px 12px",
                          border:
                            "1px solid rgba(180, 35, 24, 0.28)",
                          borderRadius:
                            "var(--radius-xs)",
                          background:
                            "var(--color-error-bg)",
                          color:
                            "var(--color-error)",
                          fontWeight: 800,
                        }}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 6h18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8 6V4h8v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19 6 18 20H6L5 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 11v5M14 11v5"
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

      <div className="notice-box warning">
        급여 여부나 중증 여부를 모르는
        경우에는 임의로 판단하지 않고
        결과 화면에서 확인 필요 상태로
        표시합니다.
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
          className="calculation-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="input-reset-modal-title"
          aria-describedby="input-reset-modal-description"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelResetAll();
            }
          }}
        >
          <div
            style={{
              width: "min(92vw, 440px)",
              padding:
                "clamp(24px, 5vw, 34px)",
              border:
                "1px solid rgba(255,255,255,0.75)",
              borderRadius: "24px",
              background: "#ffffff",
              boxShadow:
                "var(--shadow-modal)",
              animation:
                "modalPop 240ms var(--ease-standard) both",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: "54px",
                height: "54px",
                marginBottom: "18px",
                borderRadius: "16px",
                background:
                  "var(--color-warning-bg)",
                color:
                  "var(--color-warning)",
              }}
              aria-hidden="true"
            >
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 9v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M10.3 3.8 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p
              className="amount-label"
              style={{
                marginBottom: "6px",
              }}
            >
              입력 내용 초기화
            </p>

            <h2
              id="input-reset-modal-title"
              style={{
                marginBottom: "10px",
                fontSize:
                  "clamp(1.35rem, 4vw, 1.65rem)",
              }}
            >
              입력한 내용을 모두 지울까요?
            </h2>

            <p
              id="input-reset-modal-description"
              className="card-description"
              style={{
                marginBottom: 0,
                lineHeight: 1.65,
              }}
            >
              현재 보험 정보, 5세대 비교 조건,
              예정 치료 입력값이 모두 초기화됩니다.
            </p>

            <div
              style={{
                marginTop: "18px",
                padding: "14px 15px",
                borderRadius:
                  "var(--radius-sm)",
                background:
                  "var(--color-surface-soft)",
                color:
                  "var(--color-text-sub)",
                fontSize: "0.88rem",
                lineHeight: 1.55,
              }}
            >
              초기화 후에는 입력한 내용을
              다시 복구할 수 없습니다.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(0, 1.2fr)",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={
                  handleCancelResetAll
                }
                autoFocus
              >
                계속 입력하기
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmResetAll
                }
                style={{
                  minHeight: "48px",
                  padding:
                    "12px 16px",
                  border:
                    "1px solid var(--color-primary-700)",
                  borderRadius:
                    "var(--radius-sm)",
                  background:
                    "var(--color-primary-700)",
                  color: "#ffffff",
                  fontWeight: 800,
                  boxShadow:
                    "0 8px 18px rgba(29, 86, 143, 0.18)",
                }}
              >
                전체 초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default M02InputPage;