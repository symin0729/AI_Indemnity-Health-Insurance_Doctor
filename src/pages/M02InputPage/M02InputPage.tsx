import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  SAMPLE_POLICY,
} from "../../samples/samplePolicy";

import type {
  BenefitClass,
  CareSetting,
  MedicalUsage,
  SeverityClass,
} from "../../domain/medical";

import type { InsuranceGeneration } from "../../domain/insurance";

import { useAnalysisStore } from "../../store/useAnalysisStore";

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
    savedContract?.renewalCycleMonths
      ? String(
          savedContract.renewalCycleMonths
        )
      : ""
  );

  const [
    reentryCycleMonths,
    setReentryCycleMonths,
  ] = useState(
    savedContract?.reentryCycleMonths
      ? String(
          savedContract.reentryCycleMonths
        )
      : ""
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
    isSampleContractLoaded,
    setIsSampleContractLoaded,
  ] = useState(false);

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
    setHasCurrentSpecialRider2(false);

    setTarget5GMonthlyPremiumInput("");
    setHasTarget5GSpecialRider2(false);

    setPlannedUsages([]);

    resetTreatmentForm();

    setErrorMessage("");
    setIsSampleContractLoaded(false);
  };

  // ========================================
  // 시연용 샘플 보험증권 불러오기
  // ========================================

  const handleLoadSampleContract = () => {
    setInsurer(
      SAMPLE_POLICY.insurer
    );

    setProductName(
      SAMPLE_POLICY.productName
    );

    setInceptionDate(
      SAMPLE_POLICY.inceptionDate
    );

    setGeneration(
      SAMPLE_POLICY.generation
    );

    setMonthlyPremium(
      String(
        SAMPLE_POLICY.monthlyPremium
      )
    );

    setRenewalCycleMonths(
      String(
        SAMPLE_POLICY.renewalCycleMonths
      )
    );

    setReentryCycleMonths(
      String(
        SAMPLE_POLICY.reentryCycleMonths
      )
    );

    setHasCurrentSpecialRider2(
      SAMPLE_POLICY.coverages.includes(
        "SPECIAL_RIDER_2"
      )
    );

    setErrorMessage("");
    setIsSampleContractLoaded(true);
  };

  // ========================================
  // 전체 초기화
  // ========================================

  const handleResetAll = () => {
    const confirmed = window.confirm(
      "입력한 보험 정보와 예정 치료를 모두 초기화할까요?"
    );

    if (!confirmed) {
      return;
    }

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
    const confirmed = window.confirm(
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
      Number(
        renewalCycleMonths
      );

    const reentryCycleNumber =
      Number(
        reentryCycleMonths
      );

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
      !renewalCycleMonths ||
      !Number.isInteger(
        renewalCycleNumber
      ) ||
      renewalCycleNumber <= 0
    ) {
      setErrorMessage(
        "갱신주기를 1개월 이상의 정수로 입력해주세요."
      );
      return;
    }

    if (
      !reentryCycleMonths ||
      !Number.isInteger(
        reentryCycleNumber
      ) ||
      reentryCycleNumber <= 0
    ) {
      setErrorMessage(
        "재가입주기를 1개월 이상의 정수로 입력해주세요."
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
      unitCost
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

  // ========================================
  // STEP별 입력 완료 상태
  // ========================================

  const isCurrentContractComplete =
    insurer.trim().length > 0 &&
    productName.trim().length > 0 &&
    inceptionDate.length > 0 &&
    Number(monthlyPremium) > 0 &&
    Number(renewalCycleMonths) > 0 &&
    Number(reentryCycleMonths) > 0;

  const isTargetConditionComplete =
    Number(target5GMonthlyPremium) > 0;

  const hasDraftTreatment =
    treatmentName.trim().length > 0 ||
    unitCost.length > 0;

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
      <header className="page-header">
        <span className="page-brand">
          AI 실손 닥터
        </span>

        <h1>
          내 보험 정보
        </h1>

        <p className="page-description">
          현재 보험과 5세대 비교 조건,
          앞으로 예상되는 의료이용 정보를
          입력해주세요.
        </p>
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
          현재 유지하고 있는 실손보험
          정보를 입력합니다.
        </p>

        <div className="button-group">
          <button
            type="button"
            className="secondary-button"
            onClick={handleLoadSampleContract}
          >
            시연용 샘플 증권 불러오기
          </button>
        </div>

        {isSampleContractLoaded && (
          <div className="notice-box">
            <strong>시연용 샘플을 불러왔습니다.</strong>
            <br />
            실제 OCR 결과가 아니라 사전에 정의된 샘플 계약값입니다.
            비급여 특약은 현재 MVP의 비급여 특약2와 동일하다고
            임의 판단하지 않아 자동 체크하지 않았습니다.
          </div>
        )}

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

        <div className="form-grid">
          <label>
            갱신주기
            <input
              type="number"
              min="1"
              step="1"
              onWheel={(e) =>
                e.currentTarget.blur()
              }
              value={
                renewalCycleMonths
              }
              onChange={(e) =>
                setRenewalCycleMonths(
                  e.target.value
                )
              }
              placeholder="예: 12"
            />
            개월
          </label>

          <label>
            재가입주기
            <input
              type="number"
              min="1"
              step="1"
              onWheel={(e) =>
                e.currentTarget.blur()
              }
              value={
                reentryCycleMonths
              }
              onChange={(e) =>
                setReentryCycleMonths(
                  e.target.value
                )
              }
              placeholder="예: 180"
            />
            개월
          </label>
        </div>

        <div className="notice-box">
          갱신주기와 재가입주기는 현재
          보험증권 또는 보험사 안내에서
          확인한 값을 입력해주세요.
          모르는 값을 임의로 추정하지 않습니다.
        </div>

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
          현재 계약 비급여 특약2 가입
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

              <option value="CRITICAL">
                중증
              </option>

              <option value="NON_CRITICAL">
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
            회당 비용
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
                    </p>

                    <div className="button-group">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          handleEditTreatment(
                            usage
                          )
                        }
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          handleRemoveTreatment(
                            usage
                          )
                        }
                      >
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
    </main>
  );
}

export default M02InputPage;