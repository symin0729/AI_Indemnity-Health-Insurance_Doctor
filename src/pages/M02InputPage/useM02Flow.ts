import { GEN3_RIDER_DEFAULT } from "../../domain/gen3Riders";
import { MASKED_INSURER, MASKED_PRODUCT_NAME } from "../../domain/displayMask";
import { buildSubmission } from "./inputModel";
import { samplePolicyService, type SampleId } from "../../services/samplePolicyService";
import { sampleScenarioService } from "../../services/sampleScenarioService";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";
import type { TreatmentApi } from "./useTreatmentFields";
import type { AssumptionApi } from "./useAssumptionFields";
import type { TreatmentActionsApi } from "./useTreatmentActions";

export function useM02Flow(deps: BaseApi & ContractApi & CompareApi & TreatmentApi & AssumptionApi & TreatmentActionsApi) {
  const {
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
    gen5ContractType,
    gen5NonSevereRider,
    gen5SevereRider,
    generation,
    goToInputStep,
    hasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    inceptionDate,
    insurer,
    insurerLabel,
    isSampleConfirmed,
    isStep3Confirmed,
    isTargetPremiumHelpConfirmed,
    isTreatmentHelpConfirmed,
    monthlyPremium,
    navigate,
    plannedUsages,
    productLabel,
    productName,
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
    setGen3Riders,
    setGen4NonCoveredRider,
    setGen5NonSevereRider,
    setGen5SevereRider,
    setGeneration,
    setIsGenerationSelected,
    isGenerationSelected,
    setHasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider2,
    setInceptionDate,
    setInsurer,
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
    setProductName,
    setReentryCycleYears,
    setRenewalCycleMonths,
    setSampleScenarioNotice,
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
      // 1세대 외에는 실제 이름 대신 OO 이름을 자동으로 채운다.
      setInsurerLabel(sample.generation === 1 ? "" : MASKED_INSURER);
      setProductLabel(sample.generation === 1 ? "" : MASKED_PRODUCT_NAME);
      setInceptionDate(
        sample.inceptionDate
      );
      setGeneration(
        sample.generation
      );
      setIsGenerationSelected(true);
      if (sample.generation === 4) setGen4NonCoveredRider("ENROLLED");
      // 2·3세대 샘플은 상품 종형을 1. 표준형으로 선택한다. 3세대 특약은 하나도 선택하지 않은 상태로 시작한다.
      if (sample.generation === 2 || sample.generation === 3) setSamsungGen23Variant("standard");
      if (sample.generation === 3) setGen3Riders(GEN3_RIDER_DEFAULT);
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
      setHasTarget5GSpecialRider1(false);
      setGen5SevereRider("NOT_ENROLLED");
      if (scenario.target5GSpecialRider2 !== null) {
        setHasTarget5GSpecialRider2(scenario.target5GSpecialRider2);
        setGen5NonSevereRider(
          scenario.target5GSpecialRider2 ? "ENROLLED" : "NOT_ENROLLED"
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


  // ========================================
  // 전체 화면 입력 초기화
  // ========================================

  const resetLocalForm = () => {
    setInsurer("");
    setProductName("");
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
      insurer,
      productName,
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
      gen5ContractType,
      gen5SevereRider,
      gen5NonSevereRider,
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
