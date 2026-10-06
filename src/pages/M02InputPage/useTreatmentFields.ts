import { generalPatientCopayPercent, type CopayInstitution, type CopayRegion } from "../../domain/insuranceInputDefaults";
import { type Gen23FormState } from "../../domain/samsungGen23Form";
import { useEffect, useRef, useState } from "react";
import type { BenefitClass, CareSetting, MedicalInstitutionType, MedicalUsage, SeverityClass } from "../../domain/medical";

import type { BaseApi } from "./useM02Base";
import type { ContractApi } from "./useContractFields";
import type { CompareApi } from "./useCompareFields";

export function useTreatmentFields(deps: BaseApi & ContractApi & CompareApi) {
  const {
    MAX_TREATMENTS,
    savedUsages,
    setCareSetting,
    setPendingDeleteUsage,
    setUsages,
  } = deps;


  // ========================================
  // 치료 입력
  // ========================================

  const [treatmentName, setTreatmentName] =
    useState("");


  const [benefitClass, setBenefitClass] =
    useState<BenefitClass>(
      "UNKNOWN"
    );


  const [
    severityClass,
    setSeverityClass,
  ] = useState<SeverityClass>(
    "UNKNOWN"
  );


  const [frequency, setFrequency] =
    useState("");


  const [
    treatmentDate,
    setTreatmentDate,
  ] = useState("");


  const [
    institutionType,
    setInstitutionType,
  ] = useState<
    "" | MedicalInstitutionType
  >("");


  /**
   * 화면에서는 사용자가 이해하기 쉽게 0~100%로 입력받고,
   * MedicalUsage에는 0~1 비율로 저장한다.
   */
  const [
    healthInsuranceCopayRatePercent,
    setHealthInsuranceCopayRatePercent,
  ] = useState("");


  const [copayInstitution, setCopayInstitution] = useState<CopayInstitution | "">("");

  const [copayRegion, setCopayRegion] = useState<CopayRegion | "">("");

  const applyCopayDefault = (care: CareSetting, institution = copayInstitution, region = copayRegion) => {
    const rate = generalPatientCopayPercent(care, institution || undefined, region || undefined);
    setHealthInsuranceCopayRatePercent(rate === undefined ? "" : String(rate));
  };

  const [treatmentCareSelected, setTreatmentCareSelected] = useState(false);
  const changeCareSetting = (care: CareSetting) => {
    setTreatmentCareSelected(true);
    setCareSetting(care);
    applyCopayDefault(care);
  };


  /**
   * C: 해당 비교안에서 약관상 보장대상으로 인정되는 금액.
   * 모르면 비워두고 결과에서 확인 필요로 처리한다.
   */
  const [
    coveredAmount,
    setCoveredAmount,
  ] = useState("");

  const [gen23Form, setGen23Form] = useState<Gen23FormState>({});


  // ========================================
  // 치료 목록 / 수정 상태
  // ========================================

  const [
    plannedUsages,
    setPlannedUsages,
  ] = useState<MedicalUsage[]>(
    () => [...savedUsages]
  );


  const [
    editingUsageId,
    setEditingUsageId,
  ] = useState<string | null>(null);


  const [isTreatmentFormOpen, setIsTreatmentFormOpen] =
    useState(savedUsages.length === 0);


  const currentTreatmentSlotIndex = 0;


  const [treatmentSampleNotice, setTreatmentSampleNotice] = useState("");
  const [treatmentSampleLoaded, setTreatmentSampleLoaded] = useState(false);

  const patientCostHelpDialogRef = useRef<HTMLDialogElement>(null);


  const treatmentSampleDialogRef = useRef<HTMLDialogElement>(null);


  // ========================================
  // 치료 삭제
  // ========================================

  const handleRemoveTreatment = (
    usage: MedicalUsage
  ) => {
    setPendingDeleteUsage(usage);
  };


  // ========================================
  // 다음
  // ========================================

  useEffect(() => {
    setUsages(plannedUsages);
  }, [plannedUsages, setUsages]);


  const isTreatmentLimitReached =
    plannedUsages.length >= MAX_TREATMENTS &&
    !editingUsageId;

  return {
    treatmentCareSelected,
    setTreatmentCareSelected,
    treatmentName,
    setTreatmentName,
    benefitClass,
    setBenefitClass,
    severityClass,
    setSeverityClass,
    frequency,
    setFrequency,
    treatmentDate,
    setTreatmentDate,
    institutionType,
    setInstitutionType,
    healthInsuranceCopayRatePercent,
    setHealthInsuranceCopayRatePercent,
    copayInstitution,
    setCopayInstitution,
    copayRegion,
    setCopayRegion,
    applyCopayDefault,
    changeCareSetting,
    coveredAmount,
    setCoveredAmount,
    gen23Form,
    setGen23Form,
    plannedUsages,
    setPlannedUsages,
    editingUsageId,
    setEditingUsageId,
    isTreatmentFormOpen,
    setIsTreatmentFormOpen,
    currentTreatmentSlotIndex,
    treatmentSampleLoaded,
    setTreatmentSampleLoaded,
    treatmentSampleNotice,
    setTreatmentSampleNotice,
    patientCostHelpDialogRef,
    treatmentSampleDialogRef,
    handleRemoveTreatment,
    isTreatmentLimitReached,
  };
}

export type TreatmentApi = ReturnType<typeof useTreatmentFields>;
