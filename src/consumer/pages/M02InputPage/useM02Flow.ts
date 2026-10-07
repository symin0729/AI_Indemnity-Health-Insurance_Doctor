import { gen3EnrollmentForTreatment } from '../../../domain/gen3Riders';
import { validateContractStep } from './inputModel';
import { targetContractFormForSelection, currentContractFormForSelection, singleContractDetails, validateContractDetails } from './contractRequirements';
import { buildSubmission } from "./inputModel";
import { needsManualTherapyImprovementAssumption } from "../../../domain/manualTherapyCount";
import { usagesNeedingInstitutionAssumption, usagesNeedingSeverityAssumption } from "../../../domain/gen5NonCoveredAssumptions";
import { parseSamsungContractFacts } from '../../../domain/samsungContractFacts';
import { applyGen23ContractInputs } from "../../../domain/contractDetails";
import { contractSamplePatch } from "./contractTransitions";
import { TARGET_SAMPLES, type ContractSampleId, type TargetSampleId } from "../../../domain/contractSamples";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";
import type { TreatmentApi } from "./useTreatmentFields";
import type { AssumptionApi } from "./useAssumptionFields";
import type { TreatmentActionsApi } from "./useTreatmentActions";

export function useM02Flow(deps: BaseApi & ContractApi & CompareApi & TreatmentApi & AssumptionApi & TreatmentActionsApi) {
  const {
    activeStep,
    resetAnalysis,
    applyContractPatch,
    applyInputFailure,
    comparisonBasis,
    assumeNoPolicyExclusions,
    assumeManualTherapyImprovement,
    assumeNonSevereNonCovered,
    assumeNonCoveredInpatientSmallHospital,
    assumeEachOccurrenceSeparate,
    assumeEntireMedicalCostCovered,
    assumeNoPriorLimitUsage,
    contractDetails,
    currentContractFactsForm,
    targetContractFactsForm,
    setCurrentContractFactsForm,
    setTargetContractFactsForm,
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
    setAssumeNoPolicyExclusions,
    setAssumeManualTherapyImprovement,
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
  const handleLoadContractSample = (sampleId: ContractSampleId) => {
    try {
      applyContractPatch(contractSamplePatch(sampleId));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "샘플 보험 정보를 불러오지 못했습니다.");
    }
  };


  // ========================================
  // 전체 화면 입력 초기화
  // ========================================

  const resetLocalForm = () => {
    setCurrentContractFactsForm({});
    setTargetContractFactsForm({});
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
    setAssumeNoPolicyExclusions(false);
    setAssumeManualTherapyImprovement(false);
    setAssumeEachOccurrenceSeparate(
      false
    );

    setPlannedUsages([]);
    treatmentSampleTemplatesRef.current = {};
    setIsStep3Confirmed(false);
    setIsTargetPremiumHelpConfirmed(false);

    resetTreatmentForm();
    setIsTreatmentFormOpen(true);

    setErrorMessage("");
  };


  /** 5세대 조건(STEP 3)에 입력한 값만 지운다: 월 보험료, 비급여 특약, 가입금액, 비급여 치료별 5세대 확인(산정특례·입원 종별). */
  const resetTargetStep = () => {
    setTarget5GMonthlyPremiumInput("");
    setHasTarget5GSpecialRider1(false);
    setHasTarget5GSpecialRider2(false);
    setTargetContractFactsForm({});
    setIsTargetPremiumHelpConfirmed(false);
    setPlannedUsages(previous => previous.map(usage => usage.benefitClass === "NON_COVERED"
      ? { ...usage, severityClass: "UNKNOWN", ...(usage.careSetting === "INPATIENT" ? { institutionType: undefined, copayInstitution: undefined } : {}) }
      : usage));
    setErrorMessage("");
  };

  /** 5세대 조건(STEP 3)의 샘플 불러오기: 설명용 가정값으로 월 보험료·특약·가입금액을 채운다. */
  const handleLoadTargetSample = (sampleId: TargetSampleId) => {
    const sample = TARGET_SAMPLES.find((item) => item.id === sampleId);
    if (!sample) return;
    setTarget5GMonthlyPremiumInput(sample.monthlyPremium);
    setHasTarget5GSpecialRider1(sample.hasSpecialRider1);
    setHasTarget5GSpecialRider2(sample.hasSpecialRider2);
    setTargetContractFactsForm({ ...sample.contractFacts });
    setErrorMessage("");
  };

  /** 입력 화면의 "초기화" 버튼(확인 창에서 확인 후): 현재 화면에 입력한 내용만 지운다. 예정 치료(STEP 2)는 화면 안의 자체 초기화를 쓴다. */
  const handleConfirmResetAll = () => {
    setIsResetModalOpen(false);
    if (activeStep === 3) resetTargetStep();
    else resetContractStep();
  };

  /** 오른쪽 상단 "전체 초기화": 모든 단계의 입력을 지우고 1단계로 돌아간다. */
  const handleFullReset = () => {
    setIsResetModalOpen(false);
    resetLocalForm();
    resetAnalysis();
    goToInputStep(1);
  };


  const handleNext = () => {
    setErrorMessage("");

    const contractFailure = validateContractStep({ generation, generationSelected: isGenerationSelected, inceptionDate, gen1D1Coverage, insurerLabel, productLabel, monthlyPremium, samsungGen23Variant, gen1Product })
      ?? validateContractDetails({ generation, contractDetails, currentContractFactsForm, gen4NonCoveredRider });
    if (contractFailure) { applyInputFailure({ ...contractFailure, goToStep: 1 }); return; }

    // STEP 1의 계약 상세(2·3세대 가입금액 등)를 확정 시점에 모든 예정 치료에 반영한다.
    let usagesWithContractDetails: typeof plannedUsages = plannedUsages.map(usage => ({
      ...usage,
      samsungCalculationInput: { ...usage.samsungCalculationInput, otherIndemnityPoliciesExist: false, proportionalPaymentFactor: undefined },
    }));
    if (generation === 2 || generation === 3) {
      try {
        const inputs = singleContractDetails(contractDetails, samsungGen23Variant);
        usagesWithContractDetails = usagesWithContractDetails.map((usage) => applyGen23ContractInputs(generation === 3 ? { ...usage, gen23RiderEnrollmentStatus: gen3EnrollmentForTreatment(usage.gen23TreatmentType, gen3Riders) } : usage, inputs));
      } catch (error) {
        setErrorMessage(`내 보험 정보(STEP 1)의 가입금액·계약 상세를 확인해주세요. ${error instanceof Error ? error.message : ""}`);
        goToInputStep(1);
        return;
      }
    }

    let contractFacts;
    try {
      contractFacts = {
        ...(generation === 4 ? { currentContractFacts: parseSamsungContractFacts(currentContractFormForSelection(currentContractFactsForm, gen4NonCoveredRider), 4) } : {}),
        targetContractFacts: parseSamsungContractFacts(targetContractFormForSelection(targetContractFactsForm, hasTarget5GSpecialRider1, hasTarget5GSpecialRider2), 5),
      };
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '계약 상세를 확인해주세요.');
      return;
    }
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
      plannedUsages: usagesWithContractDetails,
      editingUsageId,
      selectedSampleId,
      isSampleConfirmed,
      isTargetPremiumHelpConfirmed,
      isStep3Confirmed,
      calculationAssumptions: {
        comparisonBasis,
        assumeNoPolicyExclusions,
        // 도수치료 10회 초과가 아니면 남아 있는 선택이 결과에 영향을 주지 않게 한다.
        assumeManualTherapyImprovement: assumeManualTherapyImprovement && needsManualTherapyImprovementAssumption(plannedUsages),
        // 5세대 비급여 특약을 선택하고 해당 치료가 있을 때만 남긴다.
        assumeNonSevereNonCovered: assumeNonSevereNonCovered && hasTarget5GSpecialRider1 && usagesNeedingSeverityAssumption(plannedUsages).length > 0,
        assumeNonCoveredInpatientSmallHospital: assumeNonCoveredInpatientSmallHospital && (hasTarget5GSpecialRider1 || hasTarget5GSpecialRider2) && usagesNeedingInstitutionAssumption(plannedUsages).length > 0,
        assumeSingleIndemnityContract: true,
        assumeEntireMedicalCostCovered,
        assumeNoPriorLimitUsage,
        assumeEachOccurrenceSeparate,
        ...contractFacts,
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

    navigate("/consumer/confirm");
  };


  const handleStep2Next = () => {
    setErrorMessage("");
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

  const handleStep3Next = () => {
    setErrorMessage('');
    if (!target5GMonthlyPremium || !Number.isFinite(Number(target5GMonthlyPremium)) || Number(target5GMonthlyPremium) <= 0) {
      setErrorMessage('비교용 5세대 월 보험료를 올바르게 입력해주세요.');
      return;
    }
    try { parseSamsungContractFacts(targetContractFormForSelection(targetContractFactsForm, hasTarget5GSpecialRider1, hasTarget5GSpecialRider2), 5); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : '5세대 가입금액을 확인해주세요.'); return; }
    goToInputStep(4);
  };

  return {
    handleLoadContractSample,
    resetLocalForm,
    handleConfirmResetAll,
    handleFullReset,
    handleLoadTargetSample,
    handleNext,
    handleStep2Next,
    handleStep3Next,
  };
}

export type FlowApi = ReturnType<typeof useM02Flow>;
