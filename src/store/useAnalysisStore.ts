import { create } from "zustand";

import type {
  InsuranceContract,
} from "../domain/insurance";

import type {
  MedicalUsage,
} from "../domain/medical";

export interface AnalysisCalculationAssumptions {
  /**
   * true일 때만 C 미입력 시 M 전체를 C로 본다.
   */
  assumeEntireMedicalCostCovered: boolean;

  /**
   * true일 때만 비교 시작 전 지급한도/상한 사용량을 0으로 본다.
   */
  assumeNoPriorLimitUsage: boolean;

  /**
   * 여러 회 치료의 날짜/입원 구분이 없을 때
   * 각 회차를 서로 다른 계산 단위로 본다.
   */
  assumeEachOccurrenceSeparate: boolean;
}

interface AnalysisState {
  contract:
    | InsuranceContract
    | null;

  target5GMonthlyPremium:
    | number
    | null;

  target5GCoverages: string[];

  usages: MedicalUsage[];

  calculationAssumptions:
    AnalysisCalculationAssumptions;

  setContract: (
    contract: InsuranceContract
  ) => void;

  setTarget5GMonthlyPremium: (
    monthlyPremium: number
  ) => void;

  setTarget5GCoverages: (
    coverages: string[]
  ) => void;

  setUsages: (
    usages: MedicalUsage[]
  ) => void;

  setCalculationAssumptions: (
    assumptions:
      AnalysisCalculationAssumptions
  ) => void;

  resetAnalysis: () => void;
}

const initialState = {
  contract: null,

  target5GMonthlyPremium:
    null,

  target5GCoverages: [],

  usages: [],

  calculationAssumptions: {
    assumeEntireMedicalCostCovered:
      false,

    assumeNoPriorLimitUsage:
      false,

    assumeEachOccurrenceSeparate:
      false,
  },
};

export const useAnalysisStore =
  create<AnalysisState>(
    (set) => ({
      ...initialState,

      setContract: (
        contract
      ) =>
        set({
          contract,
        }),

      setTarget5GMonthlyPremium:
        (monthlyPremium) =>
          set({
            target5GMonthlyPremium:
              monthlyPremium,
          }),

      setTarget5GCoverages:
        (coverages) =>
          set({
            target5GCoverages:
              coverages,
          }),

      setUsages: (
        usages
      ) =>
        set({
          usages,
        }),

      setCalculationAssumptions:
        (assumptions) =>
          set({
            calculationAssumptions:
              assumptions,
          }),

      resetAnalysis: () =>
        set({
          ...initialState,
        }),
    })
  );
