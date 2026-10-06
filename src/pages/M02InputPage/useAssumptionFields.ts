import { useState } from "react";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";
import type { TreatmentApi } from "./useTreatmentFields";

export function useAssumptionFields(deps: BaseApi & ContractApi & CompareApi & TreatmentApi) {
  const {
    savedCalculationAssumptions,
  } = deps;


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


  const [comparisonBasis, setComparisonBasis] = useState<"FRESH_YEAR" | "REMAINING_LIMITS">('FRESH_YEAR'); // 설계사용은 기존 사용분을 받지 않고 항상 한도 사용 전부터 비교한다.
  const [assumeNoPolicyExclusions, setAssumeNoPolicyExclusions] = useState(savedCalculationAssumptions.assumeNoPolicyExclusions ?? false);
  const [assumeManualTherapyImprovement, setAssumeManualTherapyImprovement] = useState(savedCalculationAssumptions.assumeManualTherapyImprovement ?? false);

  const [isStep3Confirmed, setIsStep3Confirmed] = useState(false);


  return {
    comparisonBasis, setComparisonBasis, assumeNoPolicyExclusions, setAssumeNoPolicyExclusions,
    assumeManualTherapyImprovement, setAssumeManualTherapyImprovement,
    assumeEntireMedicalCostCovered,
    setAssumeEntireMedicalCostCovered,
    assumeNoPriorLimitUsage,
    setAssumeNoPriorLimitUsage,
    assumeEachOccurrenceSeparate,
    setAssumeEachOccurrenceSeparate,
    isStep3Confirmed,
    setIsStep3Confirmed,
  };
}

export type AssumptionApi = ReturnType<typeof useAssumptionFields>;
