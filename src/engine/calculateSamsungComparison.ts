import { samsungLimitGroups as limitGroups } from "./samsungLimitGroups";
import { prepareUsageForSamsungComparison } from "./prepareSamsungComparison";
import { toGen1EngineProduct } from "../domain/gen1Product";
import type { InsuranceContract } from '../domain/insurance';
import type { MedicalUsage } from '../domain/medical';
import type { ProductCalculationSelections, AnalysisCalculationAssumptions } from '../store/useAnalysisStore';
import { calculateSamsungGen1Sample } from './calculateSamsungGen1';
import { calculateSamsungGen2Sample } from './calculateSamsungGen2';
import { calculateSamsungGen3Sample } from './calculateSamsungGen3';
import { calculateSamsungGen4Claim } from './calculateSamsungGen4';
import { calculateSamsungGen5Claim } from './calculateSamsungGen5';
import type { SamsungCalculationDetails, SamsungDraftCalculationInput } from './evaluateSamsungExecutionSpec';
import { calculateBreakEvenBySimulation } from './calculateBreakEven';
import { applySamsungDefaultAssumptions } from './samsungDefaultAssumptions';
import { gen4PriorUsage } from './samsungPriorUsage';
import { contractFactsForUsage } from '../domain/samsungContractFacts';

/**
 * 5세대 통원 보장은 상해·질병별 연 100회 한도가 있으므로
 * 한도 직후의 총부담 변화까지 확인할 수 있게 120회까지 탐색한다.
 */
export const SAMSUNG_BREAK_EVEN_MAX_FREQUENCY = 120;
const MAX_SUPPORTED_ANNUAL_USAGE_FREQUENCY = 10_000;

export const samsungCalculationLabel = (generation: number) => `${generation}세대 · 상품별 실행 스펙 · 초안 검산`;

function normalizeGen23Usage(usage: MedicalUsage, assumptions: AnalysisCalculationAssumptions): MedicalUsage {
  const expense = usage.coveredAmount ?? (assumptions.assumeEntireMedicalCostCovered ? usage.patientPaidAmount ?? usage.unitCost : undefined);
  const category = usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase();
  const treatmentType = category === 'MANUAL_THERAPY' || category === 'INJECTION' || category === 'MRI'
    ? category
    : 'BASE';
  const institution = usage.institutionType === 'GENERAL_TERTIARY'
    ? 'GENERAL_TERTIARY'
    : usage.institutionType === 'CLINIC_HOSPITAL'
      ? 'CLINIC'
      : undefined;
  return {
    ...usage,
    gen23CareSetting: usage.gen23CareSetting ?? usage.careSetting,
    gen23CoveredCopay: usage.gen23CoveredCopay ?? (usage.benefitClass === 'COVERED' ? expense : 0),
    gen23NonCoveredExpense: usage.gen23NonCoveredExpense ?? (usage.benefitClass === 'NON_COVERED' ? expense : 0),
    gen23Institution: usage.gen23Institution ?? institution,
    gen23TreatmentType: usage.gen23TreatmentType ?? treatmentType,
    gen23EligibleExpense: usage.gen23EligibleExpense ?? expense,
    gen23AggregationUnit: usage.gen23AggregationUnit ?? (treatmentType === 'MRI' ? 'DIAGNOSTIC_ACTION' : treatmentType === 'MANUAL_THERAPY' ? 'TREATMENT' : 'VISIT'),
  };
}

export interface SamsungComparisonItemResult {
  calculationDetails?: SamsungCalculationDetails;
  claim: number | null;
  deductible: number | null;
  capEligibleDeductible: number | null;
  reasons: string[];
  ruleId: string;
  /** 사용자가 입력하지 않아 약관상 표준값으로 채운 항목(결과 화면의 "적용된 가정"). */
  appliedAssumptions?: string[];
}

export function calculateSamsungComparisonItem(contract: InsuranceContract, selections: ProductCalculationSelections, usage: MedicalUsage, assumptions: AnalysisCalculationAssumptions, target = false): SamsungComparisonItemResult {
  const explicitEligibleExpense = usage.samsungCalculationInput?.eligibleExpense;
  usage = prepareUsageForSamsungComparison(usage, assumptions);
  if (!target && contract.generation === 1 && usage.careSetting === 'OUTPATIENT') {
    usage = { ...usage, samsungCalculationInput: { ...usage.samsungCalculationInput, eligibleExpense: explicitEligibleExpense } };
  }
  // Planner comparisons use one contract even when a persisted case contains old sharing inputs.
  if (assumptions.assumeSingleIndemnityContract) {
    usage = { ...usage, gen23OtherIndemnityPoliciesExist: false, gen23ProportionalPaymentFactor: undefined,
      samsungCalculationInput: { ...usage.samsungCalculationInput, otherIndemnityPoliciesExist: false, proportionalPaymentFactor: undefined } };
    assumptions = { ...assumptions,
      currentContractFacts: { ...assumptions.currentContractFacts, otherIndemnityPoliciesExist: false, proportionalPaymentFactor: undefined },
      targetContractFacts: { ...assumptions.targetContractFacts, otherIndemnityPoliciesExist: false, proportionalPaymentFactor: undefined } };
  }
  const appliedAssumptions: string[] = [];
  if (assumptions.assumeNoPolicyExclusions) {
    const input = usage.samsungCalculationInput ?? {};
    if (input.policyExclusionsCleared === undefined) {
      usage = { ...usage, gen1PolicyExclusionsCleared: usage.gen1PolicyExclusionsCleared ?? true,
        gen23PolicyExclusionsCleared: usage.gen23PolicyExclusionsCleared ?? true,
        samsungCalculationInput: { ...input, policyExclusionsCleared: true },
        samsungGen5Facts: usage.samsungGen5Facts && usage.samsungGen5Facts.policyExcludedTreatment === 'UNKNOWN'
          ? { ...usage.samsungGen5Facts, policyExcludedTreatment: 'NO' } : usage.samsungGen5Facts };
      appliedAssumptions.push('보장 제외 사유가 없다는 가정으로 모의 계산함. 실제 면책 심사 결과가 아님');
    }
  }
  // 4·5세대 도수·체외충격파·증식치료는 최초 10회 이후 증상 개선 확인이 있어야 보상한다. 확인 입력이 없으므로 선택한 가정으로만 채운다.
  if (assumptions.assumeManualTherapyImprovement && (usage.treatmentCategory ?? '').toUpperCase() === 'MANUAL_THERAPY'
    && usage.samsungCalculationInput?.improvementEvidenceConfirmed === undefined) {
    usage = { ...usage, samsungCalculationInput: { ...usage.samsungCalculationInput, improvementEvidenceConfirmed: true } };
    if (usage.frequency > 10 && (target || contract.generation === 4)) appliedAssumptions.push('도수·체외충격파·증식치료는 10회 이후에도 증상 개선이 확인되어 보상되는 것으로 봄');
  }
  if (assumptions.assumeEachOccurrenceSeparate) {
    usage = { ...usage, gen23SameDayAggregationConfirmed: usage.gen23SameDayAggregationConfirmed ?? true,
      samsungCalculationInput: { ...usage.samsungCalculationInput, sameDayAggregationConfirmed: usage.samsungCalculationInput?.sameDayAggregationConfirmed ?? true } };
  }
  return { ...calculateComparisonItem(contract, selections, usage, assumptions, target, appliedAssumptions), appliedAssumptions };
}

function calculateComparisonItem(contract: InsuranceContract, selections: ProductCalculationSelections, usage: MedicalUsage, assumptions: AnalysisCalculationAssumptions, target: boolean, appliedAssumptions: string[]) {
  const generation = target ? 5 : contract.generation;
  const hold = (reason: string) => ({ claim: null as number | null, deductible: null as number | null, capEligibleDeductible: null as number | null, reasons: [reason], ruleId: '' });
  if (!target && !contract.insurer.includes('삼성')) return hold('현재는 지원하는 상품의 계산만 제공합니다.');
  if (generation === 2 || generation === 3) {
    const normalizedUsage = normalizeGen23Usage(usage, assumptions);
    const calculationUsage = assumptions.assumeNoPriorLimitUsage ? {
      ...normalizedUsage,
      gen23PriorPaidBenefit: normalizedUsage.gen23PriorPaidBenefit ?? 0,
      gen23PriorAnnualCount: normalizedUsage.gen23PriorAnnualCount ?? 0,
      gen23PriorEligibleDeductible: normalizedUsage.gen23PriorEligibleDeductible ?? 0,
    } : normalizedUsage;
    const result = (generation === 2 ? calculateSamsungGen2Sample : calculateSamsungGen3Sample)(selections.samsungGen23Variant, calculationUsage);
    return 'reason' in result ? hold(result.reason) : { calculationDetails: result.calculationDetails, claim: result.claim, deductible: result.deductible, capEligibleDeductible: result.enforcementTrace?.capEligibleDeductible ?? result.deductible, reasons: result.warnings, ruleId: result.ruleId };
  }
  const expense = usage.coveredAmount ?? (assumptions.assumeEntireMedicalCostCovered ? usage.patientPaidAmount ?? usage.unitCost : undefined);
  const input: SamsungDraftCalculationInput = {
    ...usage.samsungCalculationInput,
    careSetting: usage.careSetting,
    specifiedThreeNonCoveredTreatment: usage.samsungCalculationInput?.specifiedThreeNonCoveredTreatment
      ?? (['MANUAL_THERAPY', 'INJECTION'].includes(usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase() ?? '')),
    ...(target ? contractFactsForUsage(assumptions.targetContractFacts ?? {}, usage, 5)
      : assumptions.currentContractFacts ? contractFactsForUsage(assumptions.currentContractFacts, usage, generation) : {}),
    eligibleExpense: usage.samsungCalculationInput?.eligibleExpense ?? expense,
    healthInsuranceCopayRate: usage.healthInsuranceCopayRate,
    institution: usage.institutionType,
    nhiApplied: usage.nationalHealthInsuranceStatus === 'APPLIED' ? true : usage.nationalHealthInsuranceStatus === 'NOT_APPLIED' ? false : undefined,
    claimCause: usage.claimCause === 'UNKNOWN' ? undefined : usage.claimCause,
  };
  if (target) {
    input.conversionContractSubtype = 'CONTRACT_CONVERSION';
    input.conversionEligibilityConfirmed = assumptions.targetContractFacts?.conversionEligibilityConfirmed;
  }
  if (assumptions.assumeNoPriorLimitUsage) {
    input.priorPaidBenefit ??= 0; input.priorAnnualCount ??= 0; input.priorServiceDays ??= 0; input.priorEligibleDeductible ??= 0;
  }
  appliedAssumptions.push(...applySamsungDefaultAssumptions(input, { generation, target, usage, assumeEachOccurrenceSeparate: assumptions.assumeEachOccurrenceSeparate, contractBenefitCap: assumptions.contractBenefitCap, perOccurrenceBenefitCap: assumptions.perOccurrenceBenefitCap }));
  if (generation === 1) {
    const result = calculateSamsungGen1Sample({ product: toGen1EngineProduct(selections.gen1Product), contractBasis: selections.gen1ContractBasis, d1Coverage: selections.gen1D1Coverage, claimCause: usage.claimCause ?? 'UNKNOWN', careSetting: usage.careSetting, nhiStatus: usage.nationalHealthInsuranceStatus ?? 'UNKNOWN' }, {
      ...input, coveredRoomAndTreatment: usage.gen1CoveredRoomAndTreatment ?? input.coveredRoomAndTreatment,
      roomDifference: usage.gen1RoomDifference ?? input.roomDifference, nonNhiInpatientTotal: usage.gen1NonNhiInpatientTotal ?? input.nonNhiInpatientTotal,
      // 명시한 인정금액이 없으면 "한 번 진료받을 때 내가 내는 금액"을 쓴다
      outpatientExpense: usage.samsungCalculationInput?.eligibleExpense ?? usage.unitCost,
      priorPaidBenefit: usage.gen1PriorPaidBenefit ?? input.priorPaidBenefit,
      priorServiceDays: usage.gen1PriorServiceDays ?? input.priorServiceDays,
      policyExclusionsCleared: input.policyExclusionsCleared ?? usage.gen1PolicyExclusionsCleared,
      requiredCoverageConfirmed: selections.gen1D1Coverage !== 'UNKNOWN' && selections.gen1D1Coverage !== 'NONE',
    });
    if ('reason' in result && result.status === 'NOT_ENROLLED') return { claim: 0, deductible: 0, capEligibleDeductible: 0, reasons: [result.reason], ruleId: '' };
    return 'reason' in result ? hold(result.reason) : { calculationDetails: result.calculationDetails, claim: result.claim, deductible: result.deductible, capEligibleDeductible: result.enforcementTrace?.capEligibleDeductible ?? result.deductible, reasons: result.warnings, ruleId: result.ruleId };
  }
  if (usage.benefitClass === 'UNKNOWN') return hold('급여·비급여 구분을 확인해주세요.');
  if (usage.nationalHealthInsuranceStatus === 'PARTIAL') return hold('건강보험 일부 적용 비용을 분리해주세요.');
  const category = usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase();
  if (generation === 4) {
    if (usage.claimCause !== 'INJURY' && usage.claimCause !== 'DISEASE') return hold('상해·질병을 확인해주세요.');
    const result = calculateSamsungGen4Claim({ baseCoveredConfirmed: input.requiredCoverageConfirmed === true, nonCoveredRider: selections.gen4NonCoveredRider, benefitClass: usage.benefitClass, careSetting: usage.careSetting, claimCause: usage.claimCause, treatmentType: category === 'MRI' || category === 'MRI_MRA' ? 'MRI_MRA' : category === 'MANUAL_THERAPY' ? 'MANUAL_THERAPY' : category === 'INJECTION' ? 'INJECTION' : 'GENERAL' }, input);
    if (result.status === 'NOT_COVERED') return {claim:0,deductible:0,capEligibleDeductible:0,reasons:[result.reason],ruleId:''};
    return result.status === 'CALCULATED' ? {calculationDetails:result.result.calculationDetails,claim:result.result.claim,deductible:result.result.deductible,capEligibleDeductible:result.result.enforcementTrace?.capEligibleDeductible ?? result.result.deductible,reasons:result.result.warnings,ruleId:result.ruleId} : hold('reason' in result ? result.reason : '담보 확인이 필요합니다.');
  }
  const facts = usage.samsungGen5Facts ?? (usage.benefitClass === 'COVERED' ? {specialCaseDisease: 'UNKNOWN' as const, treatmentRelatedness: 'UNKNOWN' as const, policyExcludedTreatment: 'UNKNOWN' as const} : undefined);
  if (!facts) return hold('5세대 산정특례·치료 관련성·보장 제외 여부 확인이 필요합니다.');
  if (target) input.requiredCoverageConfirmed = true;
  const result = calculateSamsungGen5Claim(target ? 'CONVERSION' : selections.gen5ContractType, target ? {baseCovered:'ENROLLED',severeNonCoveredRider:contract.coverages.includes('SPECIAL_RIDER_1')?'ENROLLED':'NOT_ENROLLED',nonSevereNonCoveredRider:contract.coverages.includes('SPECIAL_RIDER_2')?'ENROLLED':'NOT_ENROLLED'} : {baseCovered:input.requiredCoverageConfirmed ? 'ENROLLED':'UNKNOWN',severeNonCoveredRider:selections.gen5SevereRider,nonSevereNonCoveredRider:selections.gen5NonSevereRider}, {...facts,benefitClass:usage.benefitClass,careSetting:usage.careSetting}, input);
  if (result.status === 'NOT_COVERED') return {claim:0,deductible:0,capEligibleDeductible:0,reasons:[result.reason],ruleId:''};
  return result.status === 'CALCULATED' ? {calculationDetails:result.result.calculationDetails,claim:result.result.claim,deductible:result.result.deductible,capEligibleDeductible:result.result.enforcementTrace?.capEligibleDeductible ?? result.result.deductible,reasons:result.result.warnings,ruleId:result.result.ruleId} : hold('reason' in result ? result.reason : '분류 확인이 필요합니다.');
}


export interface SamsungAnnualComparisonItem {
  usage: MedicalUsage;
  current: SamsungComparisonItemResult;
  target: SamsungComparisonItemResult;
  currentClaimTotal: number | null;
  targetClaimTotal: number | null;
}

interface RunningLimitState {
  paid: number;
  count: number;
  serviceDays: number;
  eligibleDeductible: number;
}

interface RunningLimitAccumulator {
  paid: Map<string, number>;
  count: Map<string, number>;
  serviceDays: Map<string, number>;
  eligibleDeductible: Map<string, number>;
  countedEvents: Set<string>;
  unresolvedGroups: Set<string>;
  unresolvedClassification: boolean;
}

function createAccumulator(): RunningLimitAccumulator {
  return { paid: new Map(), count: new Map(), serviceDays: new Map(), eligibleDeductible: new Map(), countedEvents: new Set(), unresolvedGroups: new Set(), unresolvedClassification: false };
}

function eventKey(usage: MedicalUsage, occurrence: number): string {
  // 예상 횟수 N회는 N번의 방문이다. 진료 예정일은 첫 방문일 뿐이라 2회차부터는 같은 날로 보지 않는다.
  if (occurrence > 0) return `OCCURRENCE:${usage.id}:${occurrence}`;
  if (usage.sameDayGroupId) return `DAY:${usage.sameDayGroupId}`;
  if (usage.treatmentDate) return `DATE:${usage.treatmentDate}`;
  if (usage.admissionId) return `ADMISSION:${usage.admissionId}`;
  return `OCCURRENCE:${usage.id}:${occurrence}`;
}

function withRunningState(usage: MedicalUsage, generation: number, state?: RunningLimitState): MedicalUsage {
  if (!state) return usage;
  if (generation === 2 || generation === 3) return {
    ...usage,
    gen23PriorPaidBenefit: state.paid,
    gen23PriorAnnualCount: state.count,
    gen23PriorEligibleDeductible: state.eligibleDeductible,
  };
  if (generation === 1) return {
    ...usage,
    gen1PriorPaidBenefit: state.paid,
    gen1PriorServiceDays: state.serviceDays,
    samsungCalculationInput: {
      ...usage.samsungCalculationInput,
      priorPaidBenefit: state.paid,
      priorServiceDays: state.serviceDays,
      priorAnnualCount: state.count,
      priorEligibleDeductible: state.eligibleDeductible,
    },
  };
  return {
    ...usage,
    samsungCalculationInput: {
      ...usage.samsungCalculationInput,
      priorPaidBenefit: state.paid,
      priorAnnualCount: state.count,
      priorServiceDays: state.serviceDays,
      priorEligibleDeductible: state.eligibleDeductible,
    },
  };
}

/** 5세대는 새로 가입하는 계약이므로 올해 사용한 보험금·횟수·자기부담 없이 시작한다. */
const NEW_CONTRACT_STATE: RunningLimitState = { paid: 0, count: 0, serviceDays: 0, eligibleDeductible: 0 };

function initialState(usage: MedicalUsage, generation: number, target = false): RunningLimitState {
  if (target) return NEW_CONTRACT_STATE;
  if (generation === 2 || generation === 3) return {
    paid: usage.gen23PriorPaidBenefit ?? 0,
    count: usage.gen23PriorAnnualCount ?? 0,
    serviceDays: 0,
    eligibleDeductible: usage.gen23PriorEligibleDeductible ?? 0,
  };
  return {
    paid: usage.gen1PriorPaidBenefit ?? usage.samsungCalculationInput?.priorPaidBenefit ?? 0,
    count: usage.samsungCalculationInput?.priorAnnualCount ?? 0,
    serviceDays: usage.gen1PriorServiceDays ?? usage.samsungCalculationInput?.priorServiceDays ?? 0,
    eligibleDeductible: usage.samsungCalculationInput?.priorEligibleDeductible ?? 0,
  };
}

function calculateScenarioOccurrencesUnchecked(
  contract: InsuranceContract,
  selections: ProductCalculationSelections,
  usage: MedicalUsage,
  assumptions: AnalysisCalculationAssumptions,
  target: boolean,
  accumulator: RunningLimitAccumulator,
) {
  const generation = target ? 5 : contract.generation;
  // 현재 계약에 입력한 올해 사용분이 5세대 계산에 섞이지 않도록, 5세대 계산용 치료에서는 사용분을 새 계약 기준으로 바꾼다.
  if (target) usage = withRunningState(usage, generation, NEW_CONTRACT_STATE);
  const medicalCost = usage.patientPaidAmount ?? usage.unitCost;
  if (
    !Number.isInteger(usage.frequency) ||
    usage.frequency < 1 ||
    usage.frequency > MAX_SUPPORTED_ANNUAL_USAGE_FREQUENCY
  ) {
    return {
      total: null,
      latest: {
        claim: null,
        deductible: null,
        capEligibleDeductible: null,
        reasons: [`연간 예상 이용 횟수는 1~${MAX_SUPPORTED_ANNUAL_USAGE_FREQUENCY.toLocaleString('ko-KR')} 범위의 정수여야 합니다.`],
        ruleId: '',
      },
    };
  }
  if (
    !Number.isFinite(usage.unitCost) ||
    usage.unitCost <= 0 ||
    (usage.patientPaidAmount !== undefined &&
      (!Number.isFinite(usage.patientPaidAmount) || usage.patientPaidAmount < 0)) ||
    !Number.isFinite(medicalCost) ||
    medicalCost < 0
  ) {
    return {
      total: null,
      latest: {
        claim: null,
        deductible: null,
        capEligibleDeductible: null,
        reasons: ['회당 환자부담 의료비를 확인해주세요.'],
        ruleId: '',
      },
    };
  }
  if (usage.frequency > 1 && !assumptions.assumeEachOccurrenceSeparate) {
    const unresolved = calculateSamsungComparisonItem(contract, selections, usage, assumptions, target);
    return {
      total: null,
      latest: {
        ...unresolved,
        claim: null,
        deductible: null,
        capEligibleDeductible: null,
        reasons: ['반복 치료를 회차별로 계산하려면 각 치료가 별도 방문인지 확인해야 합니다.'],
      },
    };
  }
  let total = 0;
  let latest: SamsungComparisonItemResult | null = null;
  // 4세대 현재 계약은 STEP 1-2에서 입력한 담보별 올해 이용 내역을 쓴다. 규칙(담보)을 알아야 어느 값인지 정해지므로
  // 첫 계산은 올해 사용분 확인을 건너뛰고 규칙만 알아낸 뒤, 아래에서 담보별 값 유무를 직접 확인한다.
  const usesGroupPrior = !target && generation === 4;
  for (let occurrence = 0; occurrence < usage.frequency; occurrence += 1) {
    let result = calculateSamsungComparisonItem(contract, selections, usage, usesGroupPrior ? { ...assumptions, assumeNoPriorLimitUsage: true } : assumptions, target);
    if (result.claim === null) return { total: null, latest: result };
    const groups = limitGroups(generation, result.ruleId || usage.id, usage);
    if (accumulator.unresolvedClassification || Object.values(groups).some(key => accumulator.unresolvedGroups.has(key))) {
      return { total: null, latest: { ...result, claim: null, deductible: null, capEligibleDeductible: null,
        reasons: ['앞선 미확인 치료가 같은 한도에 영향을 줄 수 있어 이 치료의 연간 보험금도 보류합니다.'] } };
    }
    let initial = initialState(usage, generation, target);
    if (usesGroupPrior) {
      const prior = gen4PriorUsage(assumptions.currentContractFacts, result.ruleId, usage.claimCause);
      const legacy = usage.samsungCalculationInput;
      const paid = prior.paid ?? legacy?.priorPaidBenefit;
      const count = prior.count ?? legacy?.priorAnnualCount;
      const eligibleDeductible = prior.eligibleDeductible ?? legacy?.priorEligibleDeductible;
      const missing = (prior.needs.paid && paid === undefined) || (prior.needs.count && count === undefined) || (prior.needs.eligibleDeductible && eligibleDeductible === undefined);
      if (missing && !assumptions.assumeNoPriorLimitUsage) {
        return { total: null, latest: { ...result, claim: null, deductible: null, capEligibleDeductible: null,
          reasons: ['올해 이미 이용한 내역을 입력하거나(STEP 1-2), 사용한 한도가 없다고 선택해야(STEP 3) 한도를 계산할 수 있습니다.'] } };
      }
      initial = { paid: paid ?? 0, count: count ?? 0, serviceDays: initial.serviceDays, eligibleDeductible: eligibleDeductible ?? 0 };
    }
    const occurrenceEvent = `${groups.count}|${eventKey(usage, occurrence)}`;
    const eventAlreadyCounted = accumulator.countedEvents.has(occurrenceEvent);
    const combinedOutpatient = generation === 4 && ['G4-04', 'G4-08', 'G4-09'].includes(result.ruleId)
      || generation === 5 && /^(G5-|G5-CONV-)(02|04|07)$/.test(result.ruleId);
    if (eventAlreadyCounted && combinedOutpatient) {
      return { total: null, latest: { ...result, claim: null, deductible: null, capEligibleDeductible: null,
        reasons: ['같은 날 동일 담보의 외래·처방은 의료비를 합산한 한 항목으로 입력해주세요. 중복 공제·한도 적용을 방지하기 위해 계산을 보류합니다.'] } };
    }
    const storedCount = accumulator.count.get(groups.count) ?? initial.count;
    const storedServiceDays = accumulator.serviceDays.get(groups.serviceDays) ?? initial.serviceDays;
    const state = {
      paid: accumulator.paid.get(groups.benefit) ?? initial.paid,
      count: eventAlreadyCounted ? Math.max(0, storedCount - 1) : storedCount,
      serviceDays: eventAlreadyCounted ? Math.max(0, storedServiceDays - 1) : storedServiceDays,
      eligibleDeductible: accumulator.eligibleDeductible.get(groups.deductible) ?? initial.eligibleDeductible,
    };
    result = calculateSamsungComparisonItem(contract, selections, withRunningState(usage, generation, state), assumptions, target);
    if (result.claim === null) return { total: null, latest: result };
    total += result.claim;
    accumulator.paid.set(groups.benefit, state.paid + result.claim);
    accumulator.count.set(groups.count, eventAlreadyCounted ? storedCount : storedCount + 1);
    accumulator.serviceDays.set(groups.serviceDays, eventAlreadyCounted ? storedServiceDays : storedServiceDays + 1);
    accumulator.eligibleDeductible.set(groups.deductible, state.eligibleDeductible + (result.capEligibleDeductible ?? 0));
    accumulator.countedEvents.add(occurrenceEvent);
    latest = result;
  }
  return { total, latest: latest ?? calculateSamsungComparisonItem(contract, selections, usage, assumptions, target) };
}

/** Failed items must not commit partially calculated usage or make later shared limits look certain. */
function calculateScenarioOccurrences(
  contract: InsuranceContract, selections: ProductCalculationSelections, usage: MedicalUsage,
  assumptions: AnalysisCalculationAssumptions, target: boolean, accumulator: RunningLimitAccumulator,
) {
  const trial: RunningLimitAccumulator = {
    paid: new Map(accumulator.paid), count: new Map(accumulator.count), serviceDays: new Map(accumulator.serviceDays),
    eligibleDeductible: new Map(accumulator.eligibleDeductible), countedEvents: new Set(accumulator.countedEvents),
    unresolvedGroups: new Set(accumulator.unresolvedGroups), unresolvedClassification: accumulator.unresolvedClassification,
  };
  const result = calculateScenarioOccurrencesUnchecked(contract, selections, usage, assumptions, target, trial);
  if (result.total !== null) Object.assign(accumulator, trial);
  else if (result.latest.ruleId) {
    for (const key of Object.values(limitGroups(target ? 5 : contract.generation, result.latest.ruleId, usage))) accumulator.unresolvedGroups.add(key);
  } else accumulator.unresolvedClassification = true;
  return result;
}

export function calculateSamsungAnnualComparison(
  contract: InsuranceContract,
  target5GMonthlyPremium: number,
  target5GCoverages: string[],
  selections: ProductCalculationSelections,
  usages: MedicalUsage[],
  assumptions: AnalysisCalculationAssumptions,
) {
  if (assumptions.comparisonBasis === 'FRESH_YEAR') {
    usages = usages.map(usage => withRunningState(usage, contract.generation, NEW_CONTRACT_STATE));
    const facts = { ...assumptions.currentContractFacts };
    for (const key of Object.keys(facts) as Array<keyof typeof facts>) {
      if (key.startsWith('prior')) delete facts[key];
    }
    assumptions = { ...assumptions, currentContractFacts: facts, assumeNoPriorLimitUsage: true };
  }
  const currentStates = createAccumulator();
  const targetStates = createAccumulator();
  const targetContract = { ...contract, generation: 5 as const, coverages: target5GCoverages };
  const items: SamsungAnnualComparisonItem[] = usages.map((usage) => {
    const current = calculateScenarioOccurrences(contract, selections, usage, assumptions, false, currentStates);
    const target = calculateScenarioOccurrences(targetContract, selections, usage, assumptions, true, targetStates);
    return { usage, current: current.latest, target: target.latest, currentClaimTotal: current.total, targetClaimTotal: target.total };
  });
  const premiumsValid = Number.isFinite(contract.monthlyPremium)
    && contract.monthlyPremium > 0
    && Number.isFinite(target5GMonthlyPremium)
    && target5GMonthlyPremium > 0;
  const usageCosts = usages.map((usage) => (usage.patientPaidAmount ?? usage.unitCost) * usage.frequency);
  const medicalCost = usageCosts.every((cost) => Number.isFinite(cost) && cost >= 0)
    ? usageCosts.reduce((sum, cost) => sum + cost, 0)
    : null;
  const currentComplete = premiumsValid && medicalCost !== null && items.every(item => item.currentClaimTotal !== null);
  const targetComplete = premiumsValid && medicalCost !== null && items.every(item => item.targetClaimTotal !== null);
  const complete = currentComplete && targetComplete;
  const currentClaimTotal = currentComplete ? items.reduce((sum, item) => sum + item.currentClaimTotal!, 0) : null;
  const targetClaimTotal = targetComplete ? items.reduce((sum, item) => sum + item.targetClaimTotal!, 0) : null;
  return {
    items,
    complete,
    currentComplete,
    targetComplete,
    medicalCost,
    currentClaimTotal,
    targetClaimTotal,
    currentTotal: currentClaimTotal === null || medicalCost === null ? null : contract.monthlyPremium * 12 + medicalCost - currentClaimTotal,
    targetTotal: targetClaimTotal === null || medicalCost === null ? null : target5GMonthlyPremium * 12 + medicalCost - targetClaimTotal,
  };
}

export function calculateSamsungAnnualBreakEven(
  contract: InsuranceContract,
  target5GMonthlyPremium: number,
  target5GCoverages: string[],
  selections: ProductCalculationSelections,
  usages: MedicalUsage[],
  assumptions: AnalysisCalculationAssumptions,
  usageId: string,
) {
  if (usages.filter((usage) => usage.id === usageId).length !== 1) return null;
  return calculateBreakEvenBySimulation({
    minFrequency: 0,
    maxFrequency: SAMSUNG_BREAK_EVEN_MAX_FREQUENCY,
    evaluate: (frequency) => {
      const simulated = frequency === 0
        ? usages.filter((usage) => usage.id !== usageId)
        : usages.map((usage) => usage.id === usageId ? { ...usage, frequency } : usage);
      const result = calculateSamsungAnnualComparison(
        contract,
        target5GMonthlyPremium,
        target5GCoverages,
        selections,
        simulated,
        assumptions,
      );
      return {
        currentTotalBurden: result.currentTotal,
        targetTotalBurden: result.targetTotal,
        warnings: result.complete ? [] : ['미확인 계산 조건 때문에 손익분기점을 확정할 수 없습니다.'],
      };
    },
  });
}
