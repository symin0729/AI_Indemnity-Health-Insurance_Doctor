import { validateContractDetails } from './contractRequirements';
import { gen2VariantsForInceptionDate } from "../../domain/insuranceInputDefaults";
import { GEN3_RIDER_DEFAULT, type Gen3RiderSelections } from "../../domain/gen3Riders";
import { contractStepResetPatch, type ContractPatch } from "./contractTransitions";
import { isUnregisteredVariantSelected, validateContractStep, type InputFailure } from "./inputModel";
import { GEN23_VARIANT_NAMES, gen23VariantDescription } from "../../domain/samsungGen23Variant";
import { useState } from "react";
import type { ClaimCause, NationalHealthInsuranceStatus } from "../../domain/medical";
import { SAMPLE_POLICY_OPTIONS, type SampleId } from "../../services/samplePolicyService";
import { type RiderEnrollmentStatus } from "../../store/useAnalysisStore";
import { contractDetailsFromUsage, type ContractDetailForm } from "../../domain/contractDetails";
import { gen23PriorFormFromUsages } from "../../domain/gen23PriorUsage";
import { samsungContractForm, type SamsungContractForm } from '../../domain/samsungContractFacts';

import type { BaseApi } from "./useM02Base";

export function useContractFields(deps: BaseApi) {
  const {
    generation,
    goToInputStep,
    samsungGen23Variant,
    savedCalculationAssumptions,
    savedContract,
    savedProductCalculationSelections,
    savedUsages,
    setErrorMessage,
    isGenerationSelected,
    setGeneration,
    setIsGenerationSelected,
    setIsResetModalOpen,
    setSamsungGen23Variant,
    showTargetPremiumHelp,
  } = deps;


  // ========================================
  // 현재 계약
  // ========================================

  // 입력한 보험사·상품명(모든 세대 공통). 계산용 값은 저장할 때 resolveContractNames가 정한다.
  const [insurerLabel, setInsurerLabel] = useState(
    savedContract?.insurerLabel ??
      (savedContract?.generation === 1 && savedProductCalculationSelections.gen1Product !== "SAMSUNG_0904_2" ? savedContract.insurer : "")
  );

  const [productLabel, setProductLabel] = useState(
    savedContract?.productLabel ??
      (savedContract?.generation === 1 && savedProductCalculationSelections.gen1Product !== "SAMSUNG_0904_2" ? savedContract.productName : "")
  );


  const [inceptionDate, setInceptionDate] =
    useState(
      savedContract?.inceptionDate ?? ""
    );


  const [gen4NonCoveredRider, setGen4NonCoveredRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen4NonCoveredRider === "UNKNOWN"
      ? "NOT_ENROLLED"
      : savedProductCalculationSelections.gen4NonCoveredRider
  );


const [gen1Product, setGen1Product] =
  useState(
    savedProductCalculationSelections.gen1Product
  );


const [gen3Riders, setGen3Riders] =
  useState<Gen3RiderSelections>(
    savedProductCalculationSelections.gen3Riders ?? GEN3_RIDER_DEFAULT
  );


const [gen1ContractBasis, setGen1ContractBasis] =
  useState(
    savedProductCalculationSelections.gen1ContractBasis
  );


// 특약은 체크한 것만 가입으로 보고, 체크하지 않은 상태(가입 없음)가 기본값이다.
const [gen1D1Coverage, setGen1D1Coverage] =
  useState(
    savedProductCalculationSelections.gen1D1Coverage === "UNKNOWN"
      ? "NONE"
      : savedProductCalculationSelections.gen1D1Coverage
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


  const [claimCause, setClaimCause] = useState<ClaimCause>("UNKNOWN");

  // 정책: 건강보험 적용 여부는 필수이며 기본값은 '적용됨'이다(대부분의 진료가 해당).
  const [nationalHealthInsuranceStatus, setNationalHealthInsuranceStatus] =
    useState<NationalHealthInsuranceStatus>("APPLIED");

  const [gen1CoveredRoomAndTreatment, setGen1CoveredRoomAndTreatment] = useState("");

  const [gen1RoomDifference, setGen1RoomDifference] = useState("");

  const [gen1NonNhiInpatientTotal, setGen1NonNhiInpatientTotal] = useState("");

  const [gen1PriorPaidBenefit, setGen1PriorPaidBenefit] = useState("");

  const [gen1PriorServiceDays, setGen1PriorServiceDays] = useState("");

  const [gen1DaysSinceAccident, setGen1DaysSinceAccident] = useState("");

  // 현재 계약 상세(가입금액·다른 실손·보장기간). 보험증권에서 확인하는 값이라 STEP 1에서 받는다.
  const [currentContractFactsForm, setCurrentContractFactsForm] = useState<SamsungContractForm>(() => samsungContractForm(savedCalculationAssumptions.currentContractFacts ?? {
    coveredBenefitCap: savedCalculationAssumptions.contractBenefitCap,
    coveredOutpatientCap: savedCalculationAssumptions.perOccurrenceBenefitCap,
  }));
  const [contractDetails, setContractDetails] = useState<ContractDetailForm>(() => {
    if (savedContract?.generation === 2 || savedContract?.generation === 3) return { ...contractDetailsFromUsage(savedUsages[0]), ...gen23PriorFormFromUsages(savedUsages) };
    if (savedContract?.generation === 4) {
      return {
        ...(savedCalculationAssumptions.contractBenefitCap !== undefined ? { gen4ContractBenefitCap: String(savedCalculationAssumptions.contractBenefitCap) } : {}),
        ...(savedCalculationAssumptions.perOccurrenceBenefitCap !== undefined ? { gen4PerOccurrenceBenefitCap: String(savedCalculationAssumptions.perOccurrenceBenefitCap) } : {}),
      };
    }
    return {};
  });

  /** 모든 세대 공통: 보상하지 않는 사항에 해당하지 않음 확인(현재 계약과 5세대 전환 계산 모두 필요). */
  const [policyExclusionsCleared, setPolicyExclusionsCleared] = useState(false);


  const gen2Availability = gen2VariantsForInceptionDate(inceptionDate);

  const gen23VariantItems = (
    generation === 2
      ? gen2Availability.options.map((option, index) => ({ value: option.value, number: index + 1 }))
      : [{ value: "standard" as const, number: 1 }, { value: "selected2" as const, number: 2 }]
  ).map(({ value, number }) => ({
    value,
    label: `${number}. ${GEN23_VARIANT_NAMES[value]}`,
    description: gen23VariantDescription(generation === 2 ? 2 : 3, value),
  }));

  const isGen1Placeholder = generation === 1 && gen1Product === "SAMSUNG_0904_2";

  // 1세대 외에는 입력한 표시용 이름(없으면 OO)만 보여준다. 계산용 내부 값은 저장 시 삼성화재 상품으로 고정한다.
  const isVariantUnregistered = isUnregisteredVariantSelected({ generation, gen1Product, samsungGen23Variant });


  const blockUnregisteredVariant = () => {
    if (!isVariantUnregistered) return false;
    document.getElementById("variant-unregistered-banner")?.scrollIntoView({ block: "center", behavior: "smooth" });
    document.getElementById(generation === 1 ? "samsung-gen1-product" : "samsung-gen23-variant")?.focus();
    return true;
  };


  // 드롭다운이 열려 있는 동안 값을 비워 두면 같은 세대를 다시 골라도 변경 이벤트가 발생한다.
  const [isGenerationPickerOpen, setIsGenerationPickerOpen] = useState(false);


  /** 규칙(contractTransitions.ts)이 돌려준 변경 내용을 STEP 1 입력에 그대로 적용한다. */
  const applyContractPatch = (patch: ContractPatch) => {
    if (patch.generation !== undefined) setGeneration(patch.generation);
    if (patch.isGenerationSelected !== undefined) setIsGenerationSelected(patch.isGenerationSelected);
    if (patch.inceptionDate !== undefined) setInceptionDate(patch.inceptionDate);
    if (patch.insurerLabel !== undefined) setInsurerLabel(patch.insurerLabel);
    if (patch.productLabel !== undefined) setProductLabel(patch.productLabel);
    if (patch.gen1Product !== undefined) setGen1Product(patch.gen1Product);
    if (patch.gen1D1Coverage !== undefined) setGen1D1Coverage(patch.gen1D1Coverage);
    if (patch.gen1ContractBasis !== undefined) setGen1ContractBasis(patch.gen1ContractBasis);
    if (patch.samsungGen23Variant !== undefined) setSamsungGen23Variant(patch.samsungGen23Variant);
    if (patch.gen4NonCoveredRider !== undefined) setGen4NonCoveredRider(patch.gen4NonCoveredRider);
    if (patch.gen3Riders !== undefined) setGen3Riders(patch.gen3Riders);
    if (patch.monthlyPremium !== undefined) setMonthlyPremium(patch.monthlyPremium);
    if (patch.renewalCycleMonths !== undefined) setRenewalCycleMonths(patch.renewalCycleMonths);
    if (patch.reentryCycleYears !== undefined) setReentryCycleYears(patch.reentryCycleYears);
    if (patch.selectedSampleId !== undefined) setSelectedSampleId(patch.selectedSampleId as SampleId | null);
    if (patch.isSampleConfirmed !== undefined) setIsSampleConfirmed(patch.isSampleConfirmed);
    if (patch.contractDetails !== undefined) {
      setContractDetails(patch.contractDetails);
      setCurrentContractFactsForm({});
    }
    if (patch.currentContractFacts !== undefined) setCurrentContractFactsForm(patch.currentContractFacts);
  };


  // ========================================
  // STEP 1 초기화
  // ========================================

  const handleResetAll = () => {
    setIsResetModalOpen(true);
  };

  /**
   * STEP 1(고객 보험 정보)에 입력한 값만 지운다.
   * 5세대 전환 비교, 예정 치료(1세대 세부 입력 포함), 계산 가정은 건드리지 않는다.
   */
  const resetContractStep = () => {
    applyContractPatch(contractStepResetPatch());
    setErrorMessage("");
  };


  /** 검증 실패 결과를 화면에 반영한다. 검증 규칙 자체는 inputModel.ts에 있다. */
  const applyInputFailure = (failure: InputFailure) => {
    if (failure.reveal === "TARGET_PREMIUM_HELP") {
      showTargetPremiumHelp();
      return;
    }
    if (failure.reveal === "UNREGISTERED_VARIANT") {
      blockUnregisteredVariant();
      return;
    }
    if (failure.message) setErrorMessage(failure.message);
    if (failure.goToStep) goToInputStep(failure.goToStep);
    if (failure.focusId) window.requestAnimationFrame(() => {
      const field = document.getElementById(failure.focusId!);
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      field?.focus();
    });
  };


  const handleStep1Next = () => {
    setErrorMessage("");

    const failure = validateContractStep({
      generation,
      generationSelected: isGenerationSelected,
      inceptionDate,
      gen1D1Coverage,
      insurerLabel,
      productLabel,
      monthlyPremium,
      samsungGen23Variant,
      gen1Product,
    });
    if (failure) {
      applyInputFailure(failure);
      return;
    }

    const detailFailure = validateContractDetails({ generation, contractDetails, currentContractFactsForm, gen4NonCoveredRider });
    if (detailFailure) { applyInputFailure(detailFailure); return; }
    goToInputStep(2);
  };


  const selectedSample =
    SAMPLE_POLICY_OPTIONS.find(
      (option) =>
        option.id ===
        selectedSampleId
    );

  return {
    insurerLabel,
    setInsurerLabel,
    productLabel,
    setProductLabel,
    inceptionDate,
    setInceptionDate,
    gen4NonCoveredRider,
    setGen4NonCoveredRider,
    gen1Product,
    setGen1Product,
    gen3Riders,
    setGen3Riders,
    gen1ContractBasis,
    setGen1ContractBasis,
    gen1D1Coverage,
    setGen1D1Coverage,
    monthlyPremium,
    setMonthlyPremium,
    renewalCycleMonths,
    setRenewalCycleMonths,
    reentryCycleYears,
    setReentryCycleYears,
    selectedSampleId,
    setSelectedSampleId,
    isSampleConfirmed,
    setIsSampleConfirmed,
    claimCause,
    setClaimCause,
    nationalHealthInsuranceStatus,
    setNationalHealthInsuranceStatus,
    gen1CoveredRoomAndTreatment,
    setGen1CoveredRoomAndTreatment,
    gen1RoomDifference,
    setGen1RoomDifference,
    gen1NonNhiInpatientTotal,
    setGen1NonNhiInpatientTotal,
    gen1PriorPaidBenefit,
    setGen1PriorPaidBenefit,
    gen1PriorServiceDays,
    setGen1PriorServiceDays,
    gen1DaysSinceAccident,
    setGen1DaysSinceAccident,
    contractDetails,
    currentContractFactsForm,
    setCurrentContractFactsForm,
    setContractDetails,
    policyExclusionsCleared,
    setPolicyExclusionsCleared,
    gen2Availability,
    gen23VariantItems,
    isGen1Placeholder,
    isVariantUnregistered,
    blockUnregisteredVariant,
    isGenerationPickerOpen,
    setIsGenerationPickerOpen,
    applyContractPatch,
    handleResetAll,
    resetContractStep,
    applyInputFailure,
    handleStep1Next,
    selectedSample,
  };
}

export type ContractApi = ReturnType<typeof useContractFields>;
