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


  return {
    assumeEntireMedicalCostCovered,
    setAssumeEntireMedicalCostCovered,
    assumeNoPriorLimitUsage,
    setAssumeNoPriorLimitUsage,
    assumeEachOccurrenceSeparate,
    setAssumeEachOccurrenceSeparate,
  };
}

export type AssumptionApi = ReturnType<typeof useAssumptionFields>;
