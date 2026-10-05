import { buildSubmission } from "./inputModel";
import { samplePolicyPatch } from "./contractTransitions";
import { samplePolicyService, type SampleId } from "../../services/samplePolicyService";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";
import type { TreatmentApi } from "./useTreatmentFields";
import type { AssumptionApi } from "./useAssumptionFields";
import type { TreatmentActionsApi } from "./useTreatmentActions";

export function useM02Flow(deps: BaseApi & ContractApi & CompareApi & TreatmentApi & AssumptionApi & TreatmentActionsApi) {
  const {
    applyContractPatch,
    applyInputFailure,
    assumeEachOccurrenceSeparate,
    assumeEntireMedicalCostCovered,
    assumeNoPriorLimitUsage,
    editingUsageId,
    gen1ContractBasis,
    gen1D1Coverage,
    gen1Product,
    gen3Riders,
    gen4NonCoveredRider,
    generation,
    goToInputStep,
    hasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    inceptionDate,
    insurerLabel,
    isSampleConfirmed,
    isStep3Confirmed,
    isTargetPremiumHelpConfirmed,
    isTreatmentHelpConfirmed,
    monthlyPremium,
    navigate,
    plannedUsages,
    productLabel,
    reentryCycleYears,
    renewalCycleMonths,
    resetContractStep,
    resetTreatmentForm,
    samsungGen23Variant,
    selectedSampleId,
    setAssumeEachOccurrenceSeparate,
    setAssumeEntireMedicalCostCovered,
    setAssumeNoPriorLimitUsage,
    setCalculationAssumptions,
    setContract,
    setErrorMessage,
    setGen1ContractBasis,
    setGen1D1Coverage,
    setGen1Product,
    setGeneration,
    setIsGenerationSelected,
    isGenerationSelected,
    setHasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider2,
    setInceptionDate,
    setInsurerLabel,
    setIsResetModalOpen,
    setIsSampleConfirmed,
    setIsStep3Confirmed,
    setIsTargetPremiumHelpConfirmed,
    setIsTreatmentFormOpen,
    setIsTreatmentHelpConfirmed,
    setMonthlyPremium,
    setPlannedUsages,
    setProductCalculationSelections,
    setProductLabel,
    setReentryCycleYears,
    setRenewalCycleMonths,
    setSamsungGen23Variant,
    setSelectedSampleId,
    setTarget5GCoverages,
    setTarget5GMonthlyPremium,
    setTarget5GMonthlyPremiumInput,
    setUsages,
    showTargetPremiumHelp,
    target5GMonthlyPremium,
    treatmentSampleTemplatesRef,
  } = deps;


  // ========================================
  // 샘플 보험증권 불러오기
  // ========================================

  /**
   * STEP 1의 "샘플 불러오기": 현재 계약(내 보험 정보)만 채운다.
   * STEP 2(5세대 비교 조건, 예정 치료)와 STEP 3(계산 가정)은 건드리지 않는다.
   */
  const handleLoadSamplePolicy = (
    sampleId: SampleId
  ) => {
    try {
      applyContractPatch(samplePolicyPatch(sampleId, samplePolicyService.load(sampleId)));
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
  // 전체 화면 입력 초기화
  // ========================================

  const resetLocalForm = () => {
    setInsurerLabel("");
    setProductLabel("");
    setInceptionDate("");
    setGeneration(3);
    setIsGenerationSelected(false);
    setSamsungGen23Variant("UNKNOWN");
    setGen1Product("UNKNOWN");
    setGen1ContractBasis("SAMPLE_SIMULATION");
    setGen1D1Coverage("NONE");
    setMonthlyPremium("");
    setRenewalCycleMonths("");
    setReentryCycleYears("");
    setSelectedSampleId(null);
    setIsSampleConfirmed(false);

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
    treatmentSampleTemplatesRef.current = {};
    setIsStep3Confirmed(false);
    setIsTargetPremiumHelpConfirmed(false);
    setIsTreatmentHelpConfirmed(false);

    resetTreatmentForm();
    setIsTreatmentFormOpen(true);

    setErrorMessage("");
  };


  /** 입력 화면의 "초기화" 버튼: 현재 화면(STEP 1)에 입력한 내용만 지운다. */
  const handleConfirmResetAll = () => {
    setIsResetModalOpen(false);
    resetContractStep();
  };


  const handleNext = () => {
    setErrorMessage("");

    const result = buildSubmission({
      generation,
      generationSelected: isGenerationSelected,
      insurerLabel,
      productLabel,
      inceptionDate,
      monthlyPremium,
      renewalCycleMonths,
      reentryCycleYears,
      samsungGen23Variant,
      gen1Product,
      gen1ContractBasis,
      gen1D1Coverage,
      gen4NonCoveredRider,
      gen3Riders,
      target5GMonthlyPremium,
      hasTarget5GSpecialRider1,
      hasTarget5GSpecialRider2,
      plannedUsages,
      editingUsageId,
      selectedSampleId,
      isSampleConfirmed,
      isTargetPremiumHelpConfirmed,
      isTreatmentHelpConfirmed,
      isStep3Confirmed,
      calculationAssumptions: {
        assumeEntireMedicalCostCovered,
        assumeNoPriorLimitUsage,
        assumeEachOccurrenceSeparate,
      },
    });

    if (!result.ok) {
      applyInputFailure(result);
      return;
    }

    setContract(result.contract);
    setTarget5GMonthlyPremium(result.target5GMonthlyPremium);
    setTarget5GCoverages(result.target5GCoverages);
    setUsages(result.usages);
    setCalculationAssumptions(result.calculationAssumptions);
    setProductCalculationSelections(result.productCalculationSelections);

    navigate("/confirm");
  };


  const handleStep2Next = () => {
    setErrorMessage("");
    if (!target5GMonthlyPremium || Number(target5GMonthlyPremium) <= 0) {
      setErrorMessage("비교용 5세대 월 보험료를 올바르게 입력해주세요.");
      return;
    }
    if (!isTargetPremiumHelpConfirmed) {
      showTargetPremiumHelp();
      return;
    }
    if (plannedUsages.length === 0) {
      setErrorMessage("예정 치료를 입력한 뒤 하단의 ‘추가하기’ 버튼을 눌러 등록해주세요.");
      return;
    }
    if (editingUsageId) {
      setErrorMessage("수정 중인 예정 치료는 ‘수정 확인’ 버튼을 눌러 저장해주세요.");
      return;
    }
    goToInputStep(3);
  };

  return {
    handleLoadSamplePolicy,
    resetLocalForm,
    handleConfirmResetAll,
    handleNext,
    handleStep2Next,
  };
}

export type FlowApi = ReturnType<typeof useM02Flow>;
