import { create } from "zustand";

import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

import type { InsuranceContract } from "../domain/insurance";
import type { MedicalUsage } from "../domain/medical";

interface AnalysisState {
  contract: InsuranceContract | null;

  target5GMonthlyPremium: number | null;

  target5GCoverages: string[];

  usages: MedicalUsage[];

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

  resetAnalysis: () => void;
}

const initialState = {
  contract: null,
  target5GMonthlyPremium: null,
  target5GCoverages: [],
  usages: [],
};

export const useAnalysisStore =
  create<AnalysisState>()(
    persist(
      (set) => ({
        ...initialState,

        setContract: (contract) => {
          set({
            contract,
          });
        },

        setTarget5GMonthlyPremium: (
          monthlyPremium
        ) => {
          set({
            target5GMonthlyPremium:
              monthlyPremium,
          });
        },

        setTarget5GCoverages: (
          coverages
        ) => {
          set({
            target5GCoverages:
              coverages,
          });
        },

        setUsages: (usages) => {
          set({
            usages,
          });
        },

        resetAnalysis: () => {
          set({
            ...initialState,
          });
        },
      }),
      {
        name: "ai-indemnity-doctor-analysis",

        storage: createJSONStorage(
          () => sessionStorage
        ),

        partialize: (state) => ({
          contract: state.contract,

          target5GMonthlyPremium:
            state.target5GMonthlyPremium,

          target5GCoverages:
            state.target5GCoverages,

          usages: state.usages,
        }),
      }
    )
  );