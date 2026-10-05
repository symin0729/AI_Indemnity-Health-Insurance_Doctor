import { gen2VariantsForInceptionDate } from "../../domain/insuranceInputDefaults";
import { GEN3_RIDER_DEFAULT, type Gen3RiderSelections } from "../../domain/gen3Riders";
import { isUnregisteredVariantSelected, validateContractStep, type InputFailure } from "./inputModel";
import { GEN23_VARIANT_NAMES, gen23VariantDescription } from "../../domain/samsungGen23Variant";
import { useState } from "react";
import type { ClaimCause, NationalHealthInsuranceStatus } from "../../domain/medical";
import { SAMPLE_POLICY_OPTIONS, type SampleId } from "../../services/samplePolicyService";
import { type RiderEnrollmentStatus } from "../../store/useAnalysisStore";

import type { BaseApi } from "./useM02Base";

export function useContractFields(deps: BaseApi) {
  const {
    generation,
    goToInputStep,
    samsungGen23Variant,
    savedContract,
    savedProductCalculationSelections,
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

  const [insurer, setInsurer] =
    useState(
      savedContract?.insurer ?? ""
    );


  const [insurerLabel, setInsurerLabel] = useState(savedContract?.insurerLabel ?? "");

  const [productLabel, setProductLabel] = useState(savedContract?.productLabel ?? "");


  const [productName, setProductName] =
    useState(
      savedContract?.productName ?? ""
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


const [gen5ContractType, setGen5ContractType] =
  useState<"GENERAL" | "CONVERSION">(
    savedProductCalculationSelections.gen5ContractType
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


  const [claimCause, setClaimCause] = useState<ClaimCause>("UNKNOWN");

  const [nationalHealthInsuranceStatus, setNationalHealthInsuranceStatus] =
    useState<NationalHealthInsuranceStatus>("UNKNOWN");

  const [gen1CoveredRoomAndTreatment, setGen1CoveredRoomAndTreatment] = useState("");

  const [gen1RoomDifference, setGen1RoomDifference] = useState("");

  const [gen1NonNhiInpatientTotal, setGen1NonNhiInpatientTotal] = useState("");

  const [gen1PriorPaidBenefit, setGen1PriorPaidBenefit] = useState("");

  const [gen1PriorServiceDays, setGen1PriorServiceDays] = useState("");

  const [gen1PolicyExclusionsCleared, setGen1PolicyExclusionsCleared] = useState(false);


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


  const resetProductTypeSelections = () => {
    setGen1Product("UNKNOWN");
    setSamsungGen23Variant("UNKNOWN");
    setGen4NonCoveredRider("NOT_ENROLLED");
    setGen3Riders(GEN3_RIDER_DEFAULT);
  };


  // ========================================
  // 전체 초기화
  // ========================================

  const handleResetAll = () => {
    setIsResetModalOpen(true);
  };

  /**
   * STEP 1(내 보험 정보)에 입력한 값만 지운다.
   * 5세대 전환 비교, 예정 치료(1세대 세부 입력 포함), 계산 가정은 건드리지 않는다.
   */
  const resetContractStep = () => {
    setInsurer("");
    setProductName("");
    setInsurerLabel("");
    setProductLabel("");
    setInceptionDate("");
    setGeneration(3);
    setIsGenerationSelected(false);
    resetProductTypeSelections();
    setGen1ContractBasis("SAMPLE_SIMULATION");
    setGen1D1Coverage("NONE");
    setGen5ContractType("GENERAL");
    setMonthlyPremium("");
    setRenewalCycleMonths("");
    setReentryCycleYears("");
    setSelectedSampleId(null);
    setIsSampleConfirmed(false);
    setSampleScenarioNotice("");
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
    if (failure.focusId) document.getElementById(failure.focusId)?.focus();
    if (failure.goToStep) goToInputStep(failure.goToStep);
  };


  const handleStep1Next = () => {
    setErrorMessage("");

    const failure = validateContractStep({
      generation,
      generationSelected: isGenerationSelected,
      gen1D1Coverage,
      insurer,
      productName,
      monthlyPremium,
      samsungGen23Variant,
      gen1Product,
    });
    if (failure) {
      applyInputFailure(failure);
      return;
    }

    goToInputStep(2);
  };


  const selectedSample =
    SAMPLE_POLICY_OPTIONS.find(
      (option) =>
        option.id ===
        selectedSampleId
    );

  return {
    insurer,
    setInsurer,
    insurerLabel,
    setInsurerLabel,
    productLabel,
    setProductLabel,
    productName,
    setProductName,
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
    gen5ContractType,
    setGen5ContractType,
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
    sampleScenarioNotice,
    setSampleScenarioNotice,
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
    gen1PolicyExclusionsCleared,
    setGen1PolicyExclusionsCleared,
    gen2Availability,
    gen23VariantItems,
    isGen1Placeholder,
    isVariantUnregistered,
    blockUnregisteredVariant,
    isGenerationPickerOpen,
    setIsGenerationPickerOpen,
    resetProductTypeSelections,
    handleResetAll,
    resetContractStep,
    applyInputFailure,
    handleStep1Next,
    selectedSample,
  };
}

export type ContractApi = ReturnType<typeof useContractFields>;
