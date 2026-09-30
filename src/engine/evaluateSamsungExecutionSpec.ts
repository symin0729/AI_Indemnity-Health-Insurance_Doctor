export type SamsungInstitution =
  | "CLINIC"
  | "HOSPITAL"
  | "GENERAL_TERTIARY"
  | "CLINIC_HOSPITAL"
  | "GENERAL_HOSPITAL";

export interface SamsungDraftCalculationInput {
  contractType?: "GENERAL" | "CONVERSION";
  conversionContractSubtype?: "CONTRACT_CONVERSION" | "RESUMPTION" | "CHILD_CONVERSION";
  conversionEligibilityConfirmed?: boolean;
  eligibleExpense?: number;
  coveredRoomAndTreatment?: number;
  nonNhiInpatientTotal?: number;
  outpatientExpense?: number;
  coveredCopay?: number;
  nonCoveredExpense?: number;
  inpatientExcludingRoomDifference?: number;
  nonCoveredInpatientExcludingRoom?: number;
  severeNonCoveredInpatientExcludingRoom?: number;
  nonSevereNonCoveredInpatientExcludingRoom?: number;
  roomDifference?: number;
  inpatientDays?: number;
  nhiApplied?: boolean;
  healthInsuranceCopayRate?: number;
  institution?: SamsungInstitution;
  priorEligibleDeductible?: number;
  priorPaidBenefit?: number;
  benefitAmountForTier?: number;
  priorAnnualCount?: number;
  priorServiceDays?: number;
  daysSinceAccidentOrDiagnosis?: number;
  improvementEvidenceConfirmed?: boolean;
  aggregationUnit?: "VISIT" | "SERVICE_DAY" | "TREATMENT" | "DIAGNOSTIC_ACTION" | "PRESCRIPTION";
  proportionalPaymentFactor?: number;
  specifiedThreeNonCoveredTreatment?: boolean;
  requiredCoverageConfirmed?: boolean;
  policyExclusionsCleared?: boolean;
  daysSinceLastDischarge?: number;
  contractBenefitCap?: number;
  perOccurrenceBenefitCap?: number;
  outpatientBenefitCap?: number;
  prescriptionBenefitCap?: number;
  benefitLimitRestored?: boolean;
  otherIndemnityPoliciesExist?: boolean;
  coveragePeriodConfirmed?: boolean;
  /** 2세대 통원: 갱신·재가입 등 정상 보장 해당 여부도 호출자가 확인합니다. */
  coveragePeriod?: "ACTIVE" | "POST_TERMINATION" | "UNKNOWN";
  postTerminationContinuationConfirmed?: boolean;
  daysSinceTermination?: number;
  /** 종료 후 계속 치료 기간 내 누적 외래 횟수 또는 처방 건수(현재 건 제외). */
  priorContinuationCount?: number;
  sameDayAggregationConfirmed?: boolean;
  threeNonCoveredCategory?: "MANUAL_THERAPY" | "INJECTION" | "MRI";
  threeNonCoveredExcludedFromBaseConfirmed?: boolean;
  claimCause?: "INJURY" | "DISEASE";
  /** 3세대: 현재 규칙에 필요한 담보별 상태. UNKNOWN은 미가입과 다릅니다. */
  coverageStates?: Partial<Record<string, "CONFIRMED" | "NOT_ENROLLED" | "UNKNOWN">>;
  /** 항암제·항생제·희귀의약품이 아닌 특약 대상 주사료로 분류했는지 확인. */
  injectionRiderEligibleConfirmed?: boolean;
}

export interface SamsungExecutionRule {
  ruleId: string;
  generation?: number;
  variant?: string;
  requiredCoverages?: string[];
  calculation: Record<string, unknown> & { type: string };
  source: {
    documentId: string;
    applicableContractTypes?: Array<"GENERAL" | "CONVERSION">;
    article: string;
    paragraph: string;
    pdfPage: number;
    printedPage: number | null;
  };
  verificationStatus: string;
  enforcement?: {
    windowDays?: number;
    maxServiceDays?: number;
    annualDeductibleCap?: number;
    annualBenefitCap?: number;
    maxAnnualCount?: number;
    countUnit?: string;
    improvementEvidenceAfterCount?: number;
    benefitCap?: number;
    resetAfterGapDays?: number;
    requiresPerOccurrenceBenefitCap?: boolean;
    maxPerOccurrenceBenefitCap?: number;
    fixedPerOccurrenceBenefitCap?: number;
    fixedPerOccurrenceCapAppliesWhen?: string;
    requiresContractBenefitCap?: boolean;
    categoryLimits?: Record<string, SamsungExecutionRule["enforcement"]>;
    aggregationUnitMustBeProvided?: boolean;
    appliesWhen?: string;
  } | null;
}

export interface SamsungDraftCalculationResult {
  ruleId: string;
  claim: number | null;
  deductible: number | null;
  status: "DRAFT_CALCULATED" | "CONFIRMATION_REQUIRED" | "NOT_ENROLLED";
  appliedFormula: string;
  source: SamsungExecutionRule["source"];
  warnings: string[];
  /** 2세대 검산용: deductible은 한도/비례분담으로 인한 추가 미지급액을 포함하지 않습니다. */
  gen2Trace?: {
    deductible: number | null;
    capEligibleDeductible: number | null;
    restored: number;
    enforcedDeductible: number | null;
    enforcedClaim: number;
  };
}

type AmountKey = Exclude<
  keyof SamsungDraftCalculationInput,
  "institution" | "nhiApplied"
>;

const basisKeys: Record<string, AmountKey> = {
  ELIGIBLE_EXPENSE: "eligibleExpense",
  NON_NHI_INPATIENT_TOTAL: "nonNhiInpatientTotal",
  COVERED_ROOM_AND_TREATMENT: "coveredRoomAndTreatment",
  COVERED_COPAY: "coveredCopay",
  NON_COVERED_EXPENSE: "nonCoveredExpense",
  INPATIENT_EXCLUDING_ROOM_DIFFERENCE: "inpatientExcludingRoomDifference",
  NON_COVERED_INPATIENT_EXCLUDING_ROOM: "nonCoveredInpatientExcludingRoom",
  SEVERE_NON_COVERED_INPATIENT_EXCLUDING_ROOM: "severeNonCoveredInpatientExcludingRoom",
  NON_SEVERE_NON_COVERED_INPATIENT_EXCLUDING_ROOM: "nonSevereNonCoveredInpatientExcludingRoom",
  ROOM_DIFFERENCE: "roomDifference",
};

function amount(input: SamsungDraftCalculationInput, key: AmountKey): number | null {
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function expense(input: SamsungDraftCalculationInput): number | null {
  return amount(input, "eligibleExpense") ?? amount(input, "outpatientExpense");
}

function institutionMinimum(
  table: Record<string, number>,
  institution: SamsungInstitution | undefined,
): number | null {
  if (!institution) return null;
  if (institution === "CLINIC_HOSPITAL") return table.CLINIC_HOSPITAL ?? table.CLINIC ?? null;
  return table[institution] ?? null;
}

function confirmation(rule: SamsungExecutionRule, warning: string): SamsungDraftCalculationResult {
  return {
    ruleId: rule.ruleId,
    claim: null,
    deductible: null,
    status: "CONFIRMATION_REQUIRED",
    appliedFormula: rule.calculation.type,
    source: rule.source,
    warnings: [warning],
  };
}

function calculated(
  rule: SamsungExecutionRule,
  input: SamsungDraftCalculationInput,
  claim: number,
  deductible: number | null,
  warnings: string[] = [],
  capEligibleDeductible: number | null = deductible,
): SamsungDraftCalculationResult {
  let enforcement = rule.enforcement;
  if (enforcement?.categoryLimits) {
    if (!input.threeNonCoveredCategory) {
      return confirmation(rule, "3대 비급여 치료 종류(도수·주사·MRI)를 구분해야 합니다.");
    }
    enforcement = enforcement.categoryLimits[input.threeNonCoveredCategory] ?? null;
    if (!enforcement) return confirmation(rule, "해당 3대 비급여 치료 종류의 한도 규칙을 찾을 수 없습니다.");
  }
  let enforcedClaim = Math.max(0, claim);
  let enforcedDeductible = deductible;
  const enforcementWarnings: string[] = [];
  if (enforcement?.windowDays !== undefined && input.daysSinceAccidentOrDiagnosis !== undefined
    && input.daysSinceAccidentOrDiagnosis > enforcement.windowDays) {
    if (enforcement.resetAfterGapDays !== undefined) {
      if (input.daysSinceLastDischarge === undefined) {
        return confirmation(rule, `${enforcement.windowDays}일 초과 후 새로운 질병 입원 판정을 위해 최종 퇴원일부터의 경과일이 필요합니다.`);
      }
      if (input.daysSinceLastDischarge < enforcement.resetAfterGapDays) {
        enforcedClaim = 0;
        enforcementWarnings.push(`${enforcement.windowDays}일 보장 기간을 초과했고 ${enforcement.resetAfterGapDays}일 재보장 간격을 충족하지 못했습니다.`);
      } else {
        enforcementWarnings.push(`최종 퇴원 후 ${enforcement.resetAfterGapDays}일 경과로 새로운 발병 기준을 적용했습니다.`);
      }
    } else {
      enforcedClaim = 0;
      enforcementWarnings.push(`${enforcement.windowDays}일 보장 기간을 초과했습니다.`);
    }
  }
  let usedCount = enforcement?.countUnit === "SERVICE_DAY"
    ? input.priorServiceDays
    : input.priorAnnualCount;
  if ([2, 3].includes(rule.generation ?? 0) && enforcement?.requiresPerOccurrenceBenefitCap) {
    if (input.coveragePeriod !== "ACTIVE" && input.coveragePeriod !== "POST_TERMINATION") {
      return confirmation(rule, "정상 보장기간인지 계약 종료 후 계속 치료인지 확인해야 합니다.");
    }
    if (input.coveragePeriod === "POST_TERMINATION") {
      const days = amount(input, "daysSinceTermination");
      if (input.postTerminationContinuationConfirmed !== true || days === null || !Number.isInteger(days) || days < 1) {
        return confirmation(rule, "계약 종료 후 계속 치료 조건 충족 여부와 종료 다음 날부터의 경과일을 확인해야 합니다.");
      }
      // 1611.7 계속 치료: 종료 다음 날부터 180일, 외래 90회·처방 90건.
      // 조건 충족 자체를 추론하지 않고 확인된 입력만 사용합니다.
      enforcement = { ...enforcement, maxAnnualCount: 90 };
      usedCount = input.priorContinuationCount;
      if (days > 180) {
        enforcedClaim = 0;
        enforcementWarnings.push("계약 종료 후 계속 치료 180일 보상기간을 초과했습니다.");
      }
    }
    if (usedCount === undefined || !Number.isInteger(usedCount) || usedCount < 0) {
      return confirmation(rule, "해당 보장기간의 기존 외래 횟수 또는 처방 건수를 확인해야 합니다.");
    }
  }
  if (enforcement?.maxServiceDays !== undefined && input.priorServiceDays !== undefined
    && input.priorServiceDays >= enforcement.maxServiceDays) {
    enforcedClaim = 0;
    enforcementWarnings.push(`${enforcement.maxServiceDays}일 보장 한도를 소진했습니다.`);
  }
  if (enforcement?.maxAnnualCount !== undefined && usedCount !== undefined
    && usedCount >= enforcement.maxAnnualCount) {
    enforcedClaim = 0;
    enforcementWarnings.push(`${rule.generation === 2 && input.coveragePeriod === "POST_TERMINATION" ? "계약 종료 후 계속 치료" : "연간"} ${enforcement.maxAnnualCount}회/일 한도를 소진했습니다.`);
  }
  if ([2, 3, 4, 5].includes(rule.generation ?? 0) && enforcement?.maxAnnualCount !== undefined && usedCount === undefined) {
    return confirmation(rule, `연간 ${enforcement.maxAnnualCount}회/건 한도 적용을 위해 기존 이용 횟수가 필요합니다.`);
  }
  if (enforcement?.improvementEvidenceAfterCount !== undefined && (usedCount ?? 0) >= enforcement.improvementEvidenceAfterCount
    && input.improvementEvidenceConfirmed !== true) {
    return confirmation(rule, `최초 ${enforcement.improvementEvidenceAfterCount}회 후 증상 개선·병변 호전 확인이 필요합니다.`);
  }
  if (enforcement?.aggregationUnitMustBeProvided && !input.aggregationUnit) {
    return confirmation(rule, "건별·방문별·행위별 합산 단위가 필요합니다.");
  }
  let restored = 0;
  const capBasis = [2, 3].includes(rule.generation ?? 0) ? capEligibleDeductible : enforcedDeductible;
  const deductibleCapApplies =
    (![2, 3].includes(rule.generation ?? 0) || (capBasis !== null && capBasis > 0)) &&
    (enforcement?.appliesWhen !== "GENERAL_OR_TERTIARY_HOSPITAL_EXCLUDING_SPECIFIED_THREE"
      || (input.institution === "GENERAL_TERTIARY" && input.specifiedThreeNonCoveredTreatment === false));

  if ([2, 3, 5].includes(rule.generation ?? 0) && enforcement?.annualDeductibleCap !== undefined && deductibleCapApplies && enforcedDeductible !== null
    && input.priorEligibleDeductible === undefined) {
    return confirmation(rule, `연간 자기부담 ${enforcement.annualDeductibleCap.toLocaleString("ko-KR")}원 상한 적용을 위해 기존 누적 자기부담액이 필요합니다.`);
  }
  if (enforcement?.annualDeductibleCap !== undefined && deductibleCapApplies && enforcedDeductible !== null && capBasis !== null
    && input.priorEligibleDeductible !== undefined) {
    const before = Math.max(0, input.priorEligibleDeductible - enforcement.annualDeductibleCap);
    const after = Math.max(0, input.priorEligibleDeductible + capBasis - enforcement.annualDeductibleCap);
    restored = Math.min(capBasis, after - before);
    enforcedClaim += restored;
    enforcedDeductible -= restored;
  }
  if (enforcement?.annualBenefitCap !== undefined && [3, 4, 5].includes(rule.generation ?? 0) && input.priorPaidBenefit === undefined) {
    return confirmation(rule, `연간 ${enforcement.annualBenefitCap.toLocaleString("ko-KR")}원 한도 적용을 위해 기지급 보험금이 필요합니다.`);
  }
  if (enforcement?.annualBenefitCap !== undefined && input.priorPaidBenefit !== undefined) {
    let annualCap = enforcement.annualBenefitCap;
    if (enforcement.requiresContractBenefitCap) {
      if (input.contractBenefitCap === undefined || input.contractBenefitCap <= 0) {
        return confirmation(rule, "계약의 연간 보험가입금액이 필요합니다(약관상 최대 5천만원).");
      }
      annualCap = Math.min(annualCap, input.contractBenefitCap);
    }
    enforcedClaim = Math.min(enforcedClaim, Math.max(0, annualCap - input.priorPaidBenefit));
  }
  if (enforcement?.benefitCap !== undefined) {
    const cap = [2, 3].includes(rule.generation ?? 0)
      ? Math.min(enforcement.benefitCap, input.contractBenefitCap ?? Number.POSITIVE_INFINITY)
      : enforcement.benefitCap;
    if ([2, 3].includes(rule.generation ?? 0) && input.contractBenefitCap === undefined) {
      return confirmation(rule, "계약의 입원의료비 보험가입금액이 필요합니다(약관상 최대 5천만원).");
    }
    if (input.priorPaidBenefit === undefined) {
      return confirmation(rule, `누적 ${cap.toLocaleString("ko-KR")}원 한도 적용을 위해 기지급 보험금이 필요합니다.`);
    }
    let priorPaidBenefit = input.priorPaidBenefit;
    if ([2, 3].includes(rule.generation ?? 0) && input.coveragePeriod !== "POST_TERMINATION" && priorPaidBenefit >= cap) {
      if (input.benefitLimitRestored === undefined) {
        return confirmation(rule, "입원 한도 소진 후 90일/365일 기준에 따른 보상한도 복원 여부 확인이 필요합니다.");
      }
      if (input.benefitLimitRestored) priorPaidBenefit = 0;
    }
    enforcedClaim = Math.min(enforcedClaim, Math.max(0, cap - priorPaidBenefit));
  }
  if (enforcement?.requiresPerOccurrenceBenefitCap) {
    let cap = input.perOccurrenceBenefitCap;
    if ([2, 3].includes(rule.generation ?? 0)) {
      const outpatientCap = amount(input, "outpatientBenefitCap");
      const prescriptionCap = amount(input, "prescriptionBenefitCap");
      if (outpatientCap === null || prescriptionCap === null || outpatientCap + prescriptionCap > 300000) {
        return confirmation(rule, "외래·처방 가입금액을 각각 확인해야 하며 합계는 300,000원 이하여야 합니다.");
      }
      cap = enforcement.countUnit === "VISIT" ? outpatientCap : prescriptionCap;
      if (input.perOccurrenceBenefitCap !== undefined && input.perOccurrenceBenefitCap !== cap) {
        return confirmation(rule, "기존 회당 가입금액과 외래·처방별 가입금액이 일치하지 않습니다.");
      }
    }
    const maximumCap = enforcement.maxPerOccurrenceBenefitCap ?? 300000;
    if (cap === undefined || cap <= 0 || cap > maximumCap) {
      return confirmation(rule, `통원의료비의 계약상 회당 보험가입금액(최대 ${maximumCap.toLocaleString("ko-KR")}원)이 필요합니다.`);
    }
    enforcedClaim = Math.min(enforcedClaim, cap);
  }
  if (enforcement?.fixedPerOccurrenceBenefitCap !== undefined) {
    if (enforcement.fixedPerOccurrenceCapAppliesWhen === "NON_GENERAL_OR_TERTIARY_HOSPITAL" && !input.institution) {
      return confirmation(rule, "입원 회당 한도 적용을 위해 의료기관 종별이 필요합니다.");
    }
    const applies = enforcement.fixedPerOccurrenceCapAppliesWhen !== "NON_GENERAL_OR_TERTIARY_HOSPITAL"
      || input.institution !== "GENERAL_TERTIARY";
    if (applies) enforcedClaim = Math.min(enforcedClaim, enforcement.fixedPerOccurrenceBenefitCap);
  }
  if (input.proportionalPaymentFactor !== undefined) {
    if (([2, 3].includes(rule.generation ?? 0) && !Number.isFinite(input.proportionalPaymentFactor))
      || input.proportionalPaymentFactor < 0 || input.proportionalPaymentFactor > 1) {
      return confirmation(rule, "다수계약 비례보상 계수는 0~1 사이여야 합니다.");
    }
    enforcedClaim *= input.proportionalPaymentFactor;
    enforcementWarnings.push("다수계약 비례보상 계수를 적용했습니다.");
  }
  return {
    ruleId: rule.ruleId,
    ...(rule.generation === 2 ? { gen2Trace: {
      deductible, capEligibleDeductible, restored, enforcedDeductible, enforcedClaim,
    } } : {}),
    claim: enforcedClaim,
    deductible: enforcedDeductible,
    status: "DRAFT_CALCULATED",
    appliedFormula: rule.calculation.type,
    source: rule.source,
    warnings: [
      "AI 검증 초안입니다. 원문·경계값·RAG 검증이 완료되기 전에는 운영에 사용할 수 없습니다.",
      ...warnings,
      ...enforcementWarnings,
    ],
  };
}

/**
 * 14번 산출물의 실행 명세를 검산하기 위한 비운영 계산기입니다.
 * 명세의 calculationEnabled=false를 우회하거나 운영 RuleSet으로 로드하지 않습니다.
 */
export function evaluateSamsungExecutionSpec(
  rule: SamsungExecutionRule,
  input: SamsungDraftCalculationInput,
): SamsungDraftCalculationResult {
  const calculation = rule.calculation;
  if ([2, 3].includes(rule.generation ?? 0)) {
    // Validate supplied numbers even if this branch would not consume them.
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
        return confirmation(rule, `${key}: 유한한 0 이상의 숫자가 필요합니다.`);
      }
    }
    if (input.proportionalPaymentFactor !== undefined && input.otherIndemnityPoliciesExist === false) {
      return confirmation(rule, "다수보험 없음과 비례보상 계수 입력이 서로 일치하지 않습니다.");
    }
    const inpatient = calculation.type === "COMPONENT_SUM";
    const special = rule.generation === 3 && (/^G3-STD-0[1-3]$/.test(rule.ruleId) || rule.ruleId === "G3-SEL2-02");
    if (inpatient || special) {
      if (input.coveragePeriod !== "ACTIVE" && input.coveragePeriod !== "POST_TERMINATION") {
        return confirmation(rule, "정상 보장기간인지 계약 종료 후 계속 치료인지 확인해야 합니다.");
      }
      if (input.coveragePeriod === "POST_TERMINATION") {
        // 1611.7 PDF 48/53/106/112; 1704.1 PDF 49/53/107/112, 특약 167/174/180.
        // 갱신·동일회사 재가입은 연장된 ACTIVE로 확인해야 합니다.
        if (input.postTerminationContinuationConfirmed !== true || !Number.isInteger(input.daysSinceTermination)
          || input.daysSinceTermination! < 1 || input.daysSinceTermination! > 180) {
          return confirmation(rule, "종료 시 계속 중인 치료 여부와 종료일 제외 180일 이내 보장기간을 확인해야 합니다.");
        }
      }
    }
    if (input.contractBenefitCap !== undefined && (input.contractBenefitCap <= 0 || input.contractBenefitCap > 50000000)) {
      return confirmation(rule, "입원 보험가입금액은 0원 초과 5천만원 이하여야 합니다.");
    }
    if (input.nhiApplied !== undefined && typeof input.nhiApplied !== "boolean") {
      return confirmation(rule, "국민건강보험 적용 여부가 필요합니다.");
    }
    if (input.priorAnnualCount !== undefined && !Number.isInteger(input.priorAnnualCount)) {
      return confirmation(rule, "기존 이용 횟수는 0 이상의 정수여야 합니다.");
    }
  }
  if (rule.generation === 3) {
    if (input.institution === "GENERAL_HOSPITAL") input = { ...input, institution: "HOSPITAL" };
    const specialCategory = rule.ruleId === "G3-STD-01" ? "MANUAL_THERAPY"
      : rule.ruleId === "G3-STD-02" ? "INJECTION"
      : rule.ruleId === "G3-STD-03" ? "MRI"
      : rule.ruleId === "G3-SEL2-02" ? input.threeNonCoveredCategory : undefined;
    const specialRule = /^G3-STD-0[1-3]$/.test(rule.ruleId) || rule.ruleId === "G3-SEL2-02";
    const supported = specialRule || /^G3-STD-BASE-0[1-3]$/.test(rule.ruleId)
      || /^G3-SEL2-BASE-0[23]$/.test(rule.ruleId) || rule.ruleId === "G3-SEL2-01";
    if (!supported || rule.source.documentId !== "SAMSUNG_1704_1_TERMS"
      || rule.verificationStatus !== "SOURCE_AND_ENGINE_VALIDATED_RAG_PENDING") {
      return confirmation(rule, "NEEDS_REVIEW: 원문 검산 대상 규칙이 아닙니다.");
    }
    if (specialRule && !specialCategory) return confirmation(rule, "3대 비급여 치료 종류를 확인해야 합니다.");
    if (input.coverageStates) {
      const variant = rule.ruleId.includes("SEL2") ? "VARIANT_SELECTED2" : "VARIANT_STANDARD";
      const state = input.coverageStates[specialCategory ?? "BASE"];
      if (input.coverageStates[variant] !== "CONFIRMED" || state === undefined || state === "UNKNOWN") {
        return confirmation(rule, "가입 유형 및 해당 담보의 UNKNOWN 상태를 확인해야 합니다.");
      }
      if (state === "NOT_ENROLLED") return { ...confirmation(rule, "해당 담보에 가입하지 않았습니다."), status: "NOT_ENROLLED", claim: 0 };
      if (state !== "CONFIRMED") return confirmation(rule, "담보 가입 상태가 올바르지 않습니다.");
    }
    if (specialCategory) {
      if (input.threeNonCoveredCategory !== undefined && input.threeNonCoveredCategory !== specialCategory) {
        return confirmation(rule, "선택한 특약 종류와 적용 규칙이 일치하지 않습니다.");
      }
      const unit = specialCategory === "MRI" ? "DIAGNOSTIC_ACTION" : specialCategory === "INJECTION" ? "VISIT" : "TREATMENT";
      if (input.aggregationUnit !== unit) return confirmation(rule, `특약 공제 단위 ${unit} 확인이 필요합니다(주사는 1회 입원 또는 통원 단위).`);
      if (specialCategory === "INJECTION" && input.injectionRiderEligibleConfirmed !== true) {
        return confirmation(rule, "항암제·항생제·희귀의약품은 기본형 대상입니다. 특약 대상 주사료 분류를 확인해야 합니다.");
      }
    }
  }


  if ([1, 2, 3, 4, 5].includes(rule.generation ?? 0)) {
    if (rule.generation === 5) {
      const expectedContractType = rule.variant === "conversion" ? "CONVERSION" : "GENERAL";
      if (input.contractType !== expectedContractType) {
        return confirmation(rule, `5세대 ${rule.variant === "conversion" ? "계약전환형" : "일반형"} 계산에는 계약 유형 ${expectedContractType} 확인이 필요합니다.`);
      }
      if (rule.variant === "conversion") {
        if (!input.conversionContractSubtype) {
          return confirmation(rule, "계약전환형의 전환 세부유형(계약전환·재개·자녀보험전환)이 필요합니다.");
        }
        if (input.conversionEligibilityConfirmed !== true) {
          return confirmation(rule, "계약전환형의 전환 자격과 계속 치료 적용 조건 확인이 필요합니다.");
        }
      }
    }

    if (rule.requiredCoverages?.length && input.requiredCoverageConfirmed !== true
      && !(rule.generation === 3 && input.coverageStates)) {
      return confirmation(rule, `필수 특약 가입 여부를 확인해야 합니다: ${rule.requiredCoverages.join(", ")}`);
    }
    if (input.policyExclusionsCleared !== true) {
      return confirmation(rule, "보상하지 않는 사항에 해당하지 않는지 확인해야 합니다.");
    }
    const thirdGenerationSpecial = rule.generation === 3
      && (/^G3-STD-0[1-3]$/.test(rule.ruleId) || rule.ruleId === "G3-SEL2-02");
    const fourthGenerationCovered = rule.generation === 4
      && ["G4-01", "G4-02", "G4-08", "G4-09"].includes(rule.ruleId);
    const fifthGenerationNhiStatusRequired = rule.generation === 5 && rule.ruleId === "G5-01";
    if ((!thirdGenerationSpecial && rule.generation !== 5 && (rule.generation !== 4 || fourthGenerationCovered)
      && input.nhiApplied === undefined)
      || (fifthGenerationNhiStatusRequired && input.nhiApplied === undefined)) {
      return confirmation(rule, "국민건강보험 적용 여부가 필요합니다.");
    }
    if ([2, 3, 4, 5].includes(rule.generation ?? 0) && input.otherIndemnityPoliciesExist === undefined) {
      return confirmation(rule, "다른 실손의료보험 계약 존재 여부를 확인해야 합니다.");
    }
    if ([2, 3, 4, 5].includes(rule.generation ?? 0) && input.otherIndemnityPoliciesExist && input.proportionalPaymentFactor === undefined) {
      return confirmation(rule, "다수보험 비례분담 계산에 필요한 계약별 보상책임액이 필요합니다.");
    }
    if ([2, 3, 4, 5].includes(rule.generation ?? 0) && input.coveragePeriodConfirmed !== true) {
      return confirmation(rule, "보험기간 또는 계약 종료 후 계속 치료 보상기간에 해당하는지 확인해야 합니다.");
    }
    if ((rule.generation === 2 || (rule.generation === 3 && rule.ruleId.includes("BASE")))
      && rule.enforcement?.maxAnnualCount !== undefined
      && input.sameDayAggregationConfirmed !== true) {
      return confirmation(rule, "같은 날 동일 목적의 중복 통원·처방을 1회·1건으로 합산했는지 확인해야 합니다.");
    }
    if (rule.generation === 3 && !thirdGenerationSpecial
      && input.threeNonCoveredExcludedFromBaseConfirmed !== true) {
      return confirmation(rule, "기본형 계산에서 3대 비급여 선택특약 대상 의료비를 제외했는지 확인해야 합니다.");
    }
    if (rule.generation === 4 && ["G4-08", "G4-09", "G4-04"].includes(rule.ruleId)
      && input.sameDayAggregationConfirmed !== true) {
      return confirmation(rule, "같은 날 동일 목적의 통원을 1회로 합산했는지 확인해야 합니다.");
    }
    if (rule.generation === 4 && ["G4-03", "G4-04"].includes(rule.ruleId)) {
      if (!input.claimCause) return confirmation(rule, "일반 비급여의 상해·질병 구분이 필요합니다.");
      if (input.threeNonCoveredExcludedFromBaseConfirmed !== true) {
        return confirmation(rule, "일반 비급여 계산에서 3대 비급여 대상 의료비를 제외했는지 확인해야 합니다.");
      }
    }
    if (rule.generation === 5 && ["G5-04", "G5-07"].includes(rule.ruleId) && !input.claimCause) {
      return confirmation(rule, "연간 통원 횟수·일수 한도를 적용하려면 상해·질병 구분이 필요합니다.");
    }
    if (rule.ruleId === "G1-02" && input.nhiApplied !== false) {
      return confirmation(rule, "G1-02는 국민건강보험 미적용 입원 사례에만 적용합니다.");
    }
    if (rule.ruleId === "G1-03" && input.nhiApplied !== true) {
      return confirmation(rule, "G1-03 병실료 차액 50% 조항은 국민건강보험 적용 입원 사례에만 적용합니다.");
    }
  }

  if (calculation.type === "RATE_BENEFIT") {
    const components = calculation.components as Array<{ basis?: string; benefitRate: number }> | undefined;
    const component = components?.[0];
    const key = component?.basis ? basisKeys[component.basis] : undefined;
    const eligible = (key ? amount(input, key) : null) ?? expense(input);
    if (eligible === null || !component) return confirmation(rule, "보상대상의료비가 필요합니다.");
    const nonNhiFallback = calculation.nonNhiFallback as { benefitRate: number } | undefined;
    const rate = input.nhiApplied === false && nonNhiFallback
      ? nonNhiFallback.benefitRate
      : component.benefitRate;
    return calculated(rule, input, eligible * rate, eligible * (1 - rate));
  }

  if (calculation.type === "COMPONENT_SUM") {
    const nonNhiFallback = calculation.nonNhiFallback as { benefitRate: number } | undefined;
    if (input.nhiApplied === false && nonNhiFallback) {
      const nonNhiTotal = amount(input, "nonNhiInpatientTotal");
      if (nonNhiTotal === null) return confirmation(rule, "건강보험 미적용 입원의료비 총액이 필요합니다.");
      return calculated(rule, input, nonNhiTotal * nonNhiFallback.benefitRate, nonNhiTotal * (1 - nonNhiFallback.benefitRate), [], 0);
    }
    const components = calculation.components as Array<{
      basis: string;
      benefitRate: number;
      dailyBenefitCap?: number;
    }>;
    let capEligibleDeductible = 0;
    let totalInput = 0;
    let claim = 0;
    const nonRoomComponents = components.filter((item) => item.basis !== "ROOM_DIFFERENCE");
    for (const component of components) {
      const key = basisKeys[component.basis];
      let value = key ? amount(input, key) : null;
      if (value === null && nonRoomComponents.length === 1 && component.basis !== "ROOM_DIFFERENCE") {
        value = expense(input);
      }
      if (value === null && component.basis !== "ROOM_DIFFERENCE") {
        return confirmation(rule, `${component.basis} 계산 입력이 필요합니다.`);
      }
      if ([2, 3].includes(rule.generation ?? 0) && value === null) {
        return confirmation(rule, "병실료 차액을 확인해야 합니다. 차액이 없으면 0을 명시하세요.");
      }
      if ([2, 3].includes(rule.generation ?? 0) && component.dailyBenefitCap !== undefined && value !== 0
        && (amount(input, "inpatientDays") === null || !Number.isInteger(input.inpatientDays) || input.inpatientDays! < 1)) {
        return confirmation(rule, "병실료 일당 한도 적용을 위해 확인된 입원일수가 필요합니다.");
      }
      value ??= 0;
      totalInput += value;
      const componentBenefit = value * component.benefitRate;
      // 2세대의 명시적 차액 0원은 일수와 무관합니다. 차액이 있으면 위에서 일수를 확인했습니다.
      const capped = component.dailyBenefitCap === undefined || ([2, 3].includes(rule.generation ?? 0) && value === 0)
        ? componentBenefit
        : Math.min(componentBenefit, component.dailyBenefitCap * ([2, 3].includes(rule.generation ?? 0) ? input.inpatientDays! : (input.inpatientDays ?? 1)));
      if (component.basis !== "ROOM_DIFFERENCE") capEligibleDeductible += value - capped;
      claim += capped;
    }
    return calculated(rule, input, claim, Math.max(0, totalInput - claim), [], capEligibleDeductible);
  }

  if (calculation.type === "EXPENSE_MINUS_MAX_DEDUCTIBLE") {
    const eligible = expense(input);
    const rate = calculation.deductibleRate as number;
    let minimum = calculation.minimumAmount as number | null | undefined;
    if (minimum == null && calculation.minimumByInstitution) {
      minimum = institutionMinimum(
        calculation.minimumByInstitution as Record<string, number>,
        input.institution,
      );
    }
    if (eligible === null || minimum == null) return confirmation(rule, "보상대상의료비와 의료기관 구분이 필요합니다.");
    const deductible = Math.min(eligible, Math.max(minimum, eligible * rate));
    const isThirdGenerationRider = rule.generation === 3 && (/^G3-STD-0[1-3]$/.test(rule.ruleId) || rule.ruleId === "G3-SEL2-02");
    const claim = input.nhiApplied === false && !isThirdGenerationRider ? (eligible - deductible) * 0.4 : eligible - deductible;
    return calculated(rule, input, claim, eligible - claim);
  }

  if (calculation.type === "EXPENSE_MINUS_MAX_WEIGHTED_DEDUCTIBLE") {
    const covered = amount(input, "coveredCopay");
    const nonCovered = amount(input, "nonCoveredExpense");
    if (covered === null || nonCovered === null) return confirmation(rule, "급여 본인부담금과 비급여 부담액이 필요합니다.");
    const components = calculation.deductibleComponents as Array<{ basis: string; rate: number }>;
    const weighted = components.reduce((sum, component) => {
      const key = basisKeys[component.basis];
      return sum + (key ? (amount(input, key) ?? 0) : 0) * component.rate;
    }, 0);
    const table = calculation.minimumByInstitution as Record<string, number> | undefined;
    const minimum = table
      ? institutionMinimum(table, input.institution)
      : (calculation.minimumAmount as number | undefined);
    if (minimum == null) return confirmation(rule, "의료기관 구분 또는 최소공제액이 필요합니다.");
    const eligible = covered + nonCovered;
    const deductible = Math.min(eligible, Math.max(minimum, weighted));
    const claim = input.nhiApplied === false ? (eligible - deductible) * 0.4 : eligible - deductible;
    return calculated(rule, input, claim, eligible - claim);
  }

  if (calculation.type === "FIXED_DEDUCTIBLE_THEN_RATE_WITH_CAP") {
    const eligible = amount(input, "outpatientExpense") ?? expense(input);
    if (eligible === null) return confirmation(rule, "통원의료비가 필요합니다.");
    const afterDeductible = Math.max(0, eligible - (calculation.minimumAmount as number));
    const fallback = calculation.nonNhiFallback as { benefitRate: number } | undefined;
    const rate = input.nhiApplied === false ? fallback?.benefitRate : (calculation.benefitRate as number);
    if (rate === undefined) return confirmation(rule, "건강보험 적용 여부가 필요합니다.");
    const claim = Math.min(calculation.perOccurrenceBenefitCap as number, afterDeductible * rate);
    return calculated(rule, input, claim, eligible - claim);
  }

  if (calculation.type === "COVERED_OUTPATIENT_MAX_DEDUCTIBLE") {
    const eligible = expense(input);
    const copayRate = input.healthInsuranceCopayRate;
    const minimum = institutionMinimum(
      calculation.minimumByInstitution as Record<string, number>,
      input.institution,
    );
    if (eligible === null || copayRate === undefined || minimum === null) {
      return confirmation(rule, "보상대상의료비, 건강보험 본인부담률, 의료기관 구분이 필요합니다.");
    }
    const deductible = Math.min(eligible, Math.max(eligible * 0.2, eligible * copayRate, minimum));
    return calculated(rule, input, eligible - deductible, deductible);
  }

  if (calculation.type === "INSTITUTION_MINIMUM_LOOKUP") {
    const minimum = institutionMinimum(
      calculation.minimumByInstitution as Record<string, number>,
      input.institution,
    );
    if (minimum === null) return confirmation(rule, "의료기관 구분이 필요합니다.");
    return calculated(rule, input, 0, minimum, ["이 보조 규칙은 연결된 계산 규칙과 함께 적용해야 합니다."]);
  }

  if (calculation.type === "TIER_LOOKUP") {
    const value = amount(input, "benefitAmountForTier");
    if (value === null) return confirmation(rule, "보험료 차등 판정 대상 보험금 합계가 필요합니다.");
    const tiers = calculation.tiers as Array<{
      minInclusive: number;
      maxExclusive: number | null;
      relativeRate: number | string;
    }>;
    const tier = tiers.find((item) => value >= item.minInclusive && (item.maxExclusive === null || value < item.maxExclusive));
    if (!tier) return confirmation(rule, "해당 금액의 보험료 차등 구간을 찾을 수 없습니다.");
    return confirmation(rule, `보험료 차등 결과(${String(tier.relativeRate)})는 보험금 claim으로 반환하지 않습니다. 별도 보험료 계산 모델 확정이 필요합니다.`);
  }

  return confirmation(rule, `지원하지 않는 계산식입니다: ${calculation.type}`);
}
