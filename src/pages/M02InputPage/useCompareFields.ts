import { useState } from "react";
import { samsungContractForm, type SamsungContractForm } from '../../domain/samsungContractFacts';

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";

export function useCompareFields(deps: BaseApi & ContractApi) {
  const {
    savedTarget5GCoverages,
    savedTarget5GMonthlyPremium,
  } = deps;
  const [targetContractFactsForm, setTargetContractFactsForm] = useState<SamsungContractForm>(() => samsungContractForm(deps.savedCalculationAssumptions.targetContractFacts));


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
    hasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider1,
  ] = useState(
    savedTarget5GCoverages.includes(
      "SPECIAL_RIDER_1"
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

  const [isTargetPremiumHelpConfirmed, setIsTargetPremiumHelpConfirmed] = useState(false);


  const [
    riderDetailVisible,
    setRiderDetailVisible,
  ] = useState({
    special1: false,
    special2: false,
  });


  const toggleRiderDetail = (
    type: "special1" | "special2"
  ) => {
    setRiderDetailVisible((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return {
    targetContractFactsForm,
    setTargetContractFactsForm,
    target5GMonthlyPremium,
    setTarget5GMonthlyPremiumInput,
    hasTarget5GSpecialRider1,
    setHasTarget5GSpecialRider1,
    hasTarget5GSpecialRider2,
    setHasTarget5GSpecialRider2,
    isTargetPremiumHelpConfirmed,
    setIsTargetPremiumHelpConfirmed,
    riderDetailVisible,
    setRiderDetailVisible,
    toggleRiderDetail,
  };
}

export type CompareApi = ReturnType<typeof useCompareFields>;
