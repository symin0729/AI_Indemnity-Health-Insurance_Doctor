import { type TreatmentDraft } from "./treatmentSequence";
import { generationForInceptionDate } from "../../domain/insuranceInputDefaults";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CareSetting, MedicalUsage } from "../../domain/medical";
import type { InsuranceGeneration } from "../../domain/insurance";
import { useAnalysisStore, type RiderEnrollmentStatus, type SamsungGen23Variant } from "../../store/useAnalysisStore";



export function useM02Base() {

  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(() => {
    const hashStep = Number(window.location.hash.match(/input-step-(\d)/)?.[1]);
    return hashStep === 2 || hashStep === 3 ? hashStep : 1;
  });

  const [transitionDirection, setTransitionDirection] =
    useState<"forward" | "backward">("forward");


  const goToInputStep = (step: 1 | 2 | 3) => {
    setTransitionDirection(step >= activeStep ? "forward" : "backward");
    setActiveStep(step);
    window.history.replaceState(null, "", `/input#input-step-${step}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };



  const MAX_TREATMENTS = 3;


  // ========================================
  // Store 기존 데이터
  // ========================================

  const savedContract = useAnalysisStore(
    (state) => state.contract
  );


  const savedTarget5GMonthlyPremium =
    useAnalysisStore(
      (state) =>
        state.target5GMonthlyPremium
    );


  const savedTarget5GCoverages =
    useAnalysisStore(
      (state) =>
        state.target5GCoverages
    );


  const savedUsages = useAnalysisStore(
    (state) => state.usages
  );


  const savedCalculationAssumptions =
    useAnalysisStore(
      (state) =>
        state.calculationAssumptions
    );


  const savedProductCalculationSelections = useAnalysisStore((state) => state.productCalculationSelections);


  // ========================================
  // Store setter
  // ========================================

  const setContract = useAnalysisStore(
    (state) => state.setContract
  );


  const setTarget5GMonthlyPremium =
    useAnalysisStore(
      (state) =>
        state.setTarget5GMonthlyPremium
    );


  const setTarget5GCoverages =
    useAnalysisStore(
      (state) =>
        state.setTarget5GCoverages
    );


  const setUsages = useAnalysisStore(
    (state) => state.setUsages
  );


  const setCalculationAssumptions =
    useAnalysisStore(
      (state) =>
        state.setCalculationAssumptions
    );


  const setProductCalculationSelections = useAnalysisStore((state) => state.setProductCalculationSelections);


  const resetAnalysis = useAnalysisStore(
    (state) => state.resetAnalysis
  );


  const [generation, setGeneration] =
    useState<InsuranceGeneration>(
      generationForInceptionDate(savedContract?.inceptionDate ?? "") ?? savedContract?.generation ?? 3
    );

  // 실손 세대는 사용자가 직접 선택해야 한다. 선택 전에는 3세대를 예시로만 보여준다.
  const [isGenerationSelected, setIsGenerationSelected] = useState(savedContract !== null);


const [samsungGen23Variant, setSamsungGen23Variant] =
  useState<SamsungGen23Variant>(
    savedProductCalculationSelections.samsungGen23Variant
  );


const [gen5SevereRider, setGen5SevereRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen5SevereRider
  );


const [gen5NonSevereRider, setGen5NonSevereRider] =
  useState<RiderEnrollmentStatus>(
    savedProductCalculationSelections.gen5NonSevereRider
  );


  const [careSetting, setCareSetting] =
    useState<CareSetting>(
      "OUTPATIENT"
    );


  const [unitCost, setUnitCost] =
    useState("");


  const [
    treatmentCategory,
    setTreatmentCategory,
  ] = useState("");


  const [treatmentDrafts, setTreatmentDrafts] = useState<Record<number, TreatmentDraft>>({});

  const treatmentSampleTemplatesRef = useRef<Record<number, MedicalUsage>>({});


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    isResetModalOpen,
    setIsResetModalOpen,
  ] = useState(false);


  const [
    pendingDeleteUsage,
    setPendingDeleteUsage,
  ] = useState<MedicalUsage | null>(null);


  const handleCancelResetAll = () => {
    setIsResetModalOpen(false);
  };


  const handleCancelRemoveTreatment = () => {
    setPendingDeleteUsage(null);
  };


  useEffect(() => {
    if (errorMessage) {
      const error = document.getElementById("input-errors");
      error?.scrollIntoView({ block: "center", behavior: "smooth" });
      error?.focus({ preventScroll: true });
    }
  }, [errorMessage]);


  const showTargetPremiumHelp = () => {
    setErrorMessage("");
    goToInputStep(2);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("target-premium-help-area")?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    });
  };

  return {
    navigate,
    activeStep,
    setActiveStep,
    transitionDirection,
    setTransitionDirection,
    goToInputStep,
    MAX_TREATMENTS,
    savedContract,
    savedTarget5GMonthlyPremium,
    savedTarget5GCoverages,
    savedUsages,
    savedCalculationAssumptions,
    savedProductCalculationSelections,
    setContract,
    setTarget5GMonthlyPremium,
    setTarget5GCoverages,
    setUsages,
    setCalculationAssumptions,
    setProductCalculationSelections,
    resetAnalysis,
    generation,
    setGeneration,
    isGenerationSelected,
    setIsGenerationSelected,
    samsungGen23Variant,
    setSamsungGen23Variant,
    gen5SevereRider,
    setGen5SevereRider,
    gen5NonSevereRider,
    setGen5NonSevereRider,
    careSetting,
    setCareSetting,
    unitCost,
    setUnitCost,
    treatmentCategory,
    setTreatmentCategory,
    treatmentDrafts,
    setTreatmentDrafts,
    treatmentSampleTemplatesRef,
    errorMessage,
    setErrorMessage,
    isResetModalOpen,
    setIsResetModalOpen,
    pendingDeleteUsage,
    setPendingDeleteUsage,
    handleCancelResetAll,
    handleCancelRemoveTreatment,
    showTargetPremiumHelp,
  };
}

export type BaseApi = ReturnType<typeof useM02Base>;
