import { singleContractDetails } from './contractRequirements';
import { toNonCoveredTreatmentType } from "../../../domain/nonCoveredTreatmentType";
import { applyGen23ContractInputs } from "../../../domain/contractDetails";
import { createDraftFromUsage, createEmptyTreatmentDraft, policyExclusionsFromUsage, type TreatmentDraft } from "./treatmentSequence";
import { type CopayInstitution, type CopayRegion } from "../../../domain/insuranceInputDefaults";
import { gen23CareSettingError } from "../../../domain/samsungGen23CareSetting";
import { parseGen23Form, restoreGen23Form } from "../../../domain/samsungGen23Form";
import { gen3EnrollmentForTreatment } from "../../../domain/gen3Riders";
import { isValidIsoDate } from "./inputModel";
import type { BenefitClass, MedicalUsage, SeverityClass, ClaimCause, NationalHealthInsuranceStatus } from "../../../domain/medical";
import { loadTreatmentSample, type TreatmentSampleKind } from "../../../services/sampleScenarioService";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";
import type { TreatmentApi } from "./useTreatmentFields";
import type { AssumptionApi } from "./useAssumptionFields";

export function useTreatmentActions(deps: BaseApi & ContractApi & CompareApi & TreatmentApi & AssumptionApi) {
  const {
    MAX_TREATMENTS,
    assumeEntireMedicalCostCovered,
    benefitClass,
    careSetting,
    claimCause,
    copayInstitution,
    copayRegion,
    coveredAmount,
    currentTreatmentSlotIndex,
    editingUsageId,
    frequency,
    gen1CoveredRoomAndTreatment,
    gen1NonNhiInpatientTotal,
    policyExclusionsCleared,
    gen1PriorPaidBenefit,
    gen1PriorServiceDays,
    gen1DaysSinceAccident,
    gen1Product,
    contractDetails,
    gen1RoomDifference,
    gen23Form,
    gen3Riders,
    samsungGen23Variant,
    generation,
    healthInsuranceCopayRatePercent,
    institutionType,
    nationalHealthInsuranceStatus,
    pendingDeleteUsage,
    plannedUsages,
    setBenefitClass,
    setCareSetting,
    setClaimCause,
    setCopayInstitution,
    setCopayRegion,
    setCoveredAmount,
    setEditingUsageId,
    setErrorMessage,
    setFrequency,
    setGen1CoveredRoomAndTreatment,
    setGen1NonNhiInpatientTotal,
    setPolicyExclusionsCleared,
    setGen1PriorPaidBenefit,
    setGen1PriorServiceDays,
    setGen1DaysSinceAccident,
    setGen1RoomDifference,
    setGen23Form,
    setHealthInsuranceCopayRatePercent,
    setInstitutionType,
    setIsTreatmentFormOpen,
    setNationalHealthInsuranceStatus,
    setPendingDeleteUsage,
    setPlannedUsages,
    setSeverityClass,
    setTreatmentCategory,
    setTreatmentDate,
    setTreatmentDrafts,
    setTreatmentName,
    setTreatmentSampleNotice,
    setUnitCost,
    severityClass,
    treatmentCategory,
    treatmentDate,
    treatmentDrafts,
    treatmentName,
    treatmentSampleDialogRef,
    treatmentSampleTemplatesRef,
    unitCost,
  } = deps;


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
    gen1DaysSinceAccident,
    policyExclusionsCleared,
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
    setGen1DaysSinceAccident(draft.gen1DaysSinceAccident ?? "");
    setPolicyExclusionsCleared(draft.policyExclusionsCleared);
  };


  const saveCurrentTreatmentDraft = (slotIndex = currentTreatmentSlotIndex) => {
    setTreatmentDrafts((previous) => ({
      ...previous,
      [slotIndex]: {
        ...buildCurrentTreatmentDraft(),
        sourceUsage: previous[slotIndex]?.sourceUsage,
      },
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
    setGen1DaysSinceAccident(emptyDraft.gen1DaysSinceAccident);
    setPolicyExclusionsCleared(emptyDraft.policyExclusionsCleared);
    setEditingUsageId(null);
    setTreatmentDrafts((previous) => ({
      ...previous,
      [currentTreatmentSlotIndex]: emptyDraft,
    }));
    delete treatmentSampleTemplatesRef.current[currentTreatmentSlotIndex];
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

    // 모든 세대 공통 필수: 현재 계약과 5세대 전환 계산이 모두 이 값을 쓴다.
    if (claimCause !== "INJURY" && claimCause !== "DISEASE") {
      setErrorMessage("치료 원인(질병/상해)을 선택해주세요.");
      return null;
    }
    if (nationalHealthInsuranceStatus === "UNKNOWN") {
      setErrorMessage("이번 진료의 국민건강보험 적용 여부를 선택해주세요.");
      return null;
    }
    const daysSinceAccidentNumber = gen1DaysSinceAccident === "" ? null : Number(gen1DaysSinceAccident);
    // 경과일은 1세대 대표상품(0904.2) 세부 입력에서만 받는다.
    if (generation === 1 && gen1Product === "SAMSUNG_0904_2" && (daysSinceAccidentNumber === null || !Number.isInteger(daysSinceAccidentNumber) || daysSinceAccidentNumber < 0)) {
      setErrorMessage("1세대는 사고일 또는 발병일부터의 경과일을 0 이상의 정수로 입력해주세요.");
      return null;
    }

    const nonCoveredType = toNonCoveredTreatmentType(benefitClass, treatmentCategory);
    let gen23Values: Partial<MedicalUsage> = {};
    if (generation === 2 || generation === 3) {
      try {
        gen23Values = {
          ...parseGen23Form(gen23Form),
          claimCause,
          nationalHealthInsuranceStatus,
          gen23PolicyExclusionsCleared: policyExclusionsCleared || undefined,
          // 3세대 치료 분류는 공통 칸의 비급여 치료 종류에서 가져온다.
          ...(generation === 3 ? { gen23TreatmentType: nonCoveredType || "BASE" } : {}),
        };
        const careError = gen23CareSettingError({ careSetting, gen23CareSetting: gen23Values.gen23CareSetting });
        if (careError) throw new Error(careError);
      }
      catch (error) { setErrorMessage(error instanceof Error ? error.message : "계산 입력을 확인해주세요."); return null; }
    }
    if (generation === 3) {
      const enrollment = gen3EnrollmentForTreatment(gen23Values.gen23TreatmentType, gen3Riders);
      if (enrollment) gen23Values = { ...gen23Values, gen23RiderEnrollmentStatus: enrollment };
    }
    const sourceUsage = {
      ...(treatmentSampleTemplatesRef.current[currentTreatmentSlotIndex] ??
        treatmentDrafts[currentTreatmentSlotIndex]?.sourceUsage),
      ...(id ? plannedUsages.find(item => item.id === id) : {}),
    } as Partial<MedicalUsage>;
    const usage: MedicalUsage = {
      ...sourceUsage,
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

      // 비급여 치료 종류만 저장한다(급여 치료나 일반 비급여는 비워 샘플 값이 남지 않게 한다).
      treatmentCategory: nonCoveredType || undefined,
      // 5세대 판정값은 화면 입력(중증 여부·면책 확인·치료 종류)으로 계산 시점에 다시 만든다. 샘플 값이 남지 않게 비운다.
      samsungGen5Facts: undefined,

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

      claimCause,
      nationalHealthInsuranceStatus,

      ...(generation === 1 ? {
        gen1CoveredRoomAndTreatment: optionalAmount(gen1CoveredRoomAndTreatment),
        gen1RoomDifference: optionalAmount(gen1RoomDifference),
        gen1NonNhiInpatientTotal: optionalAmount(gen1NonNhiInpatientTotal),
        gen1PriorPaidBenefit: optionalAmount(gen1PriorPaidBenefit),
        gen1PriorServiceDays: optionalAmount(gen1PriorServiceDays),
        gen1PolicyExclusionsCleared: policyExclusionsCleared || undefined,
      } : {}),
    };

    if (generation === 2 || generation === 3) {
      usage.samsungCalculationInput = {
        ...sourceUsage.samsungCalculationInput,
        eligibleExpense:
          sourceUsage.samsungCalculationInput?.eligibleExpense ??
          coveredAmountNumber ??
          (assumeEntireMedicalCostCovered ? unitCostNumber : undefined),
        requiredCoverageConfirmed:
          sourceUsage.samsungCalculationInput?.requiredCoverageConfirmed ??
          usage.gen23RequiredCoverageConfirmed,
        policyExclusionsCleared:
          sourceUsage.samsungCalculationInput?.policyExclusionsCleared ??
          usage.gen23PolicyExclusionsCleared,
        otherIndemnityPoliciesExist:
          sourceUsage.samsungCalculationInput?.otherIndemnityPoliciesExist ??
          usage.gen23OtherIndemnityPoliciesExist,
        sameDayAggregationConfirmed:
          sourceUsage.samsungCalculationInput?.sameDayAggregationConfirmed ??
          usage.gen23SameDayAggregationConfirmed,
        priorPaidBenefit:
          sourceUsage.samsungCalculationInput?.priorPaidBenefit ??
          usage.gen23PriorPaidBenefit,
        priorAnnualCount:
          sourceUsage.samsungCalculationInput?.priorAnnualCount ??
          usage.gen23PriorAnnualCount,
        priorEligibleDeductible:
          sourceUsage.samsungCalculationInput?.priorEligibleDeductible ??
          usage.gen23PriorEligibleDeductible,
      };
    }

    // 공통 확인값은 샘플 값보다 사용자가 입력한 값을 우선한다(5세대 전환 계산도 이 값을 읽는다).
    usage.samsungCalculationInput = {
      ...usage.samsungCalculationInput,
      policyExclusionsCleared: policyExclusionsCleared || undefined,
      ...(careSetting === 'INPATIENT' && benefitClass === 'NON_COVERED' ? {
        roomDifference: optionalAmount(generation === 2 || generation === 3 ? gen23Form.gen23RoomDifference ?? "" : gen1RoomDifference),
        inpatientDays: optionalAmount(gen23Form.gen23InpatientDays ?? ''),
      } : {}),
      ...(generation === 1 && daysSinceAccidentNumber !== null ? { daysSinceAccidentOrDiagnosis: daysSinceAccidentNumber } : {}),
    };

    // 2·3세대: STEP 1의 가입금액·계약 상세를 반영한다(입력을 확정할 때도 다시 반영한다).
    if (generation === 2 || generation === 3) {
      try {
        return applyGen23ContractInputs(usage, singleContractDetails(contractDetails, samsungGen23Variant));
      } catch (error) {
        setErrorMessage(`내 보험 정보(STEP 1)의 가입금액·계약 상세를 확인해주세요. ${error instanceof Error ? error.message : ""}`);
        return null;
      }
    }

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
    setIsTreatmentFormOpen(false);
  };


  /**
   * STEP 2의 "치료 샘플 불러오기": 예정 치료 입력만 채운다.
   * STEP 1(현재 계약)과 STEP 3(계산 가정)은 건드리지 않고, STEP 1에서 고른 샘플과도 무관하게 동작한다.
   */
  const handleLoadSampleTreatments = (kind: TreatmentSampleKind) => {
    try {
      const scenario = loadTreatmentSample("NON_COVERED", generation, kind);
      treatmentSampleDialogRef.current?.close();
      const sampleUsage = scenario.plannedUsages[0];

      if (!sampleUsage) {
        setErrorMessage("선택한 샘플에는 확정된 예정 치료 정보가 없습니다.");
        return;
      }

      const nextDraft = createDraftFromUsage(sampleUsage);
      treatmentSampleTemplatesRef.current[currentTreatmentSlotIndex] = sampleUsage;
      saveCurrentTreatmentDraft();
      setTreatmentDrafts((previous) => ({
        ...previous,
        [currentTreatmentSlotIndex]: nextDraft,
      }));

      setGen23Form(restoreGen23Form(sampleUsage));
      setTreatmentSampleNotice(scenario.notice);

      applyTreatmentDraft(nextDraft);
      setIsTreatmentFormOpen(true);
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
    setGen23Form(createDraftFromUsage(usage).gen23Form);
    setClaimCause(usage.claimCause ?? "UNKNOWN");
    setNationalHealthInsuranceStatus(usage.nationalHealthInsuranceStatus ?? "APPLIED");
    setGen1CoveredRoomAndTreatment(usage.gen1CoveredRoomAndTreatment === undefined ? "" : String(usage.gen1CoveredRoomAndTreatment));
    setGen1RoomDifference(createDraftFromUsage(usage).gen1RoomDifference);
    setGen1NonNhiInpatientTotal(usage.gen1NonNhiInpatientTotal === undefined ? "" : String(usage.gen1NonNhiInpatientTotal));
    setGen1PriorPaidBenefit(usage.gen1PriorPaidBenefit === undefined ? "" : String(usage.gen1PriorPaidBenefit));
    setGen1PriorServiceDays(usage.gen1PriorServiceDays === undefined ? "" : String(usage.gen1PriorServiceDays));
    setPolicyExclusionsCleared(policyExclusionsFromUsage(usage));
    setGen1DaysSinceAccident(usage.samsungCalculationInput?.daysSinceAccidentOrDiagnosis === undefined ? "" : String(usage.samsungCalculationInput.daysSinceAccidentOrDiagnosis));
  };


  // ========================================
  // 수정 취소
  // ========================================

  const handleCancelEdit = () => {
    resetTreatmentForm();
    setErrorMessage("");
    setIsTreatmentFormOpen(plannedUsages.length === 0);
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


  return {
    buildCurrentTreatmentDraft,
    applyTreatmentDraft,
    saveCurrentTreatmentDraft,
    resetTreatmentForm,
    createCurrentUsage,
    handleAddTreatment,
    handleLoadSampleTreatments,
    handleEditTreatment,
    handleCancelEdit,
    handleConfirmRemoveTreatment,
  };
}

export type TreatmentActionsApi = ReturnType<typeof useTreatmentActions>;
