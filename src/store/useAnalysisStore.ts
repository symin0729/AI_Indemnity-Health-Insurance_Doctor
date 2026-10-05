import { create } from "zustand";

import type { SamsungGen23Variant } from "../domain/samsungGen23Variant";
import type { Gen1ProductChoice } from "../domain/gen1Product";
import { GEN3_RIDER_DEFAULT, type Gen3RiderSelections } from "../domain/gen3Riders";

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

export type RiderEnrollmentStatus = "ENROLLED" | "NOT_ENROLLED" | "UNKNOWN";
export type { SamsungGen23Variant };

export interface ProductCalculationSelections {
  gen1Product: Gen1ProductChoice;
  gen1ContractBasis: "SAMPLE_SIMULATION" | "ACTUAL_CONTRACT";
  gen1D1Coverage: "INJURY" | "DISEASE" | "BOTH" | "NONE" | "UNKNOWN";
  gen4NonCoveredRider: RiderEnrollmentStatus;
  gen5ContractType: "GENERAL" | "CONVERSION";
  gen5SevereRider: RiderEnrollmentStatus;
  gen5NonSevereRider: RiderEnrollmentStatus;
  samsungGen23Variant: SamsungGen23Variant;
  gen3Riders?: Gen3RiderSelections;
}

interface AnalysisState {
  mode: "consumer" | "planner";

  setMode: (mode: "consumer" | "planner") => void;

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

  productCalculationSelections: ProductCalculationSelections;

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

  setProductCalculationSelections: (selections: ProductCalculationSelections) => void;

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

  productCalculationSelections: {
    gen1Product: "UNKNOWN" as const,
    gen1ContractBasis: "SAMPLE_SIMULATION" as const,
    gen1D1Coverage: "UNKNOWN" as const,
    gen4NonCoveredRider: "UNKNOWN" as RiderEnrollmentStatus,
    gen5ContractType: "GENERAL" as const,
    gen5SevereRider: "UNKNOWN" as RiderEnrollmentStatus,
    gen5NonSevereRider: "UNKNOWN" as RiderEnrollmentStatus,
    samsungGen23Variant: "UNKNOWN" as const,
    gen3Riders: GEN3_RIDER_DEFAULT,
  },
};

export const useAnalysisStore =
  create<AnalysisState>(
    (set) => ({
      ...initialState,

      mode: "planner",

      setMode: (mode) => set({ mode }),

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

      setProductCalculationSelections: (productCalculationSelections) => set({ productCalculationSelections }),

      resetAnalysis: () =>
        set({
          ...initialState,
        }),
    })
  );
