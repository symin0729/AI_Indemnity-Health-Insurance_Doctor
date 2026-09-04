import { create } from "zustand";

import type { InsuranceContract } from "../domain/insurance";
import type { MedicalUsage } from "../domain/medical";

interface AnalysisState {
  contract: InsuranceContract | null;

  target5GMonthlyPremium: number | null;

  target5GCoverages: string[];

  usages: MedicalUsage[];

  setContract: (contract: InsuranceContract) => void;

  setTarget5GMonthlyPremium: (
    monthlyPremium: number
  ) => void;

  setTarget5GCoverages: (
    coverages: string[]
  ) => void;

  setUsages: (usages: MedicalUsage[]) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  contract: null,

  target5GMonthlyPremium: null,

  target5GCoverages: [],

  usages: [],

  setContract: (contract) => {
    set({ contract });
  },

  setTarget5GMonthlyPremium: (monthlyPremium) => {
    set({
      target5GMonthlyPremium: monthlyPremium,
    });
  },

  setTarget5GCoverages: (coverages) => {
    set({
      target5GCoverages: coverages,
    });
  },

  setUsages: (usages) => {
    set({ usages });
  },
}));