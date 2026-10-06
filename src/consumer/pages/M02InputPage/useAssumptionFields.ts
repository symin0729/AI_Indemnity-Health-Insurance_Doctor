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


  const [comparisonBasis, setComparisonBasis] = useState<"FRESH_YEAR" | "REMAINING_LIMITS">(savedCalculationAssumptions.comparisonBasis ?? 'FRESH_YEAR');
  const [assumeNoPolicyExclusions, setAssumeNoPolicyExclusions] = useState(savedCalculationAssumptions.assumeNoPolicyExclusions ?? false);

  const [isStep3Confirmed, setIsStep3Confirmed] = useState(false);


  return {
    comparisonBasis, setComparisonBasis, assumeNoPolicyExclusions, setAssumeNoPolicyExclusions,
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
