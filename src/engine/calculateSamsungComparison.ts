import { toGen1EngineProduct } from "../domain/gen1Product";
import type { InsuranceContract } from '../domain/insurance';
import type { MedicalUsage } from '../domain/medical';
import type { ProductCalculationSelections, AnalysisCalculationAssumptions } from '../store/useAnalysisStore';
import { calculateSamsungGen1Sample } from './calculateSamsungGen1';
import { calculateSamsungGen2Sample } from './calculateSamsungGen2';
import { calculateSamsungGen3Sample } from './calculateSamsungGen3';
import { calculateSamsungGen4Claim } from './calculateSamsungGen4';
import { calculateSamsungGen5Claim } from './calculateSamsungGen5';
import type { SamsungDraftCalculationInput } from './evaluateSamsungExecutionSpec';
import { calculateBreakEvenBySimulation } from './calculateBreakEven';

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
  };
}

export function calculateSamsungComparisonItem(contract: InsuranceContract, selections: ProductCalculationSelections, usage: MedicalUsage, assumptions: AnalysisCalculationAssumptions, target = false) {
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
    return 'reason' in result ? hold(result.reason) : { claim: result.claim, deductible: result.deductible, capEligibleDeductible: result.enforcementTrace?.capEligibleDeductible ?? result.deductible, reasons: result.warnings, ruleId: result.ruleId };
  }
  const expense = usage.coveredAmount ?? (assumptions.assumeEntireMedicalCostCovered ? usage.patientPaidAmount ?? usage.unitCost : undefined);
  const input: SamsungDraftCalculationInput = {
    ...usage.samsungCalculationInput,
    eligibleExpense: usage.samsungCalculationInput?.eligibleExpense ?? expense,
    healthInsuranceCopayRate: usage.healthInsuranceCopayRate,
    institution: usage.institutionType,
    nhiApplied: usage.nationalHealthInsuranceStatus === 'APPLIED' ? true : usage.nationalHealthInsuranceStatus === 'NOT_APPLIED' ? false : undefined,
    claimCause: usage.claimCause === 'UNKNOWN' ? undefined : usage.claimCause,
  };
  if (assumptions.assumeNoPriorLimitUsage) {
    input.priorPaidBenefit ??= 0; input.priorAnnualCount ??= 0; input.priorServiceDays ??= 0; input.priorEligibleDeductible ??= 0;
  }
  if (generation === 1) {
    const result = calculateSamsungGen1Sample({ product: toGen1EngineProduct(selections.gen1Product), contractBasis: selections.gen1ContractBasis, d1Coverage: selections.gen1D1Coverage, claimCause: usage.claimCause ?? 'UNKNOWN', careSetting: usage.careSetting, nhiStatus: usage.nationalHealthInsuranceStatus ?? 'UNKNOWN' }, {
      ...input, coveredRoomAndTreatment: usage.gen1CoveredRoomAndTreatment ?? input.coveredRoomAndTreatment,
      roomDifference: usage.gen1RoomDifference ?? input.roomDifference, nonNhiInpatientTotal: usage.gen1NonNhiInpatientTotal ?? input.nonNhiInpatientTotal,
      outpatientExpense: input.eligibleExpense, priorPaidBenefit: usage.gen1PriorPaidBenefit ?? input.priorPaidBenefit,
      priorServiceDays: usage.gen1PriorServiceDays ?? input.priorServiceDays,
      policyExclusionsCleared: input.policyExclusionsCleared ?? usage.gen1PolicyExclusionsCleared,
      requiredCoverageConfirmed: selections.gen1D1Coverage !== 'UNKNOWN',
    });
    return 'reason' in result ? hold(result.reason) : { claim: result.claim, deductible: result.deductible, capEligibleDeductible: result.enforcementTrace?.capEligibleDeductible ?? result.deductible, reasons: result.warnings, ruleId: result.ruleId };
  }
  if (usage.benefitClass === 'UNKNOWN') return hold('급여·비급여 구분을 확인해주세요.');
  if (usage.nationalHealthInsuranceStatus === 'PARTIAL') return hold('건강보험 일부 적용 비용을 분리해주세요.');
  const category = usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.treatmentCategory?.toUpperCase();
  if (generation === 4) {
    if (usage.claimCause !== 'INJURY' && usage.claimCause !== 'DISEASE') return hold('상해·질병을 확인해주세요.');
    const result = calculateSamsungGen4Claim({ baseCoveredConfirmed: input.requiredCoverageConfirmed === true, nonCoveredRider: selections.gen4NonCoveredRider, benefitClass: usage.benefitClass, careSetting: usage.careSetting, claimCause: usage.claimCause, treatmentType: category === 'MRI' || category === 'MRI_MRA' ? 'MRI_MRA' : category === 'MANUAL_THERAPY' ? 'MANUAL_THERAPY' : category === 'INJECTION' ? 'INJECTION' : 'GENERAL' }, input);
    if (result.status === 'NOT_COVERED') return {claim:0,deductible:0,capEligibleDeductible:0,reasons:[result.reason],ruleId:''};
    return result.status === 'CALCULATED' ? {claim:result.result.claim,deductible:result.result.deductible,capEligibleDeductible:result.result.enforcementTrace?.capEligibleDeductible ?? result.result.deductible,reasons:result.result.warnings,ruleId:result.ruleId} : hold('reason' in result ? result.reason : '담보 확인이 필요합니다.');
  }
  const facts = usage.samsungGen5Facts ?? (usage.benefitClass === 'COVERED' ? {specialCaseDisease: 'UNKNOWN' as const, treatmentRelatedness: 'UNKNOWN' as const, policyExcludedTreatment: 'UNKNOWN' as const} : undefined);
  if (!facts) return hold('5세대 산정특례·치료 관련성·보장 제외 여부 확인이 필요합니다.');
  if (target) input.requiredCoverageConfirmed = true;
  const result = calculateSamsungGen5Claim(target ? 'GENERAL' : selections.gen5ContractType, target ? {baseCovered:'ENROLLED',severeNonCoveredRider:contract.coverages.includes('SPECIAL_RIDER_1')?'ENROLLED':'NOT_ENROLLED',nonSevereNonCoveredRider:contract.coverages.includes('SPECIAL_RIDER_2')?'ENROLLED':'NOT_ENROLLED'} : {baseCovered:input.requiredCoverageConfirmed ? 'ENROLLED':'UNKNOWN',severeNonCoveredRider:selections.gen5SevereRider,nonSevereNonCoveredRider:selections.gen5NonSevereRider}, {...facts,benefitClass:usage.benefitClass,careSetting:usage.careSetting}, input);
  if (result.status === 'NOT_COVERED') return {claim:0,deductible:0,capEligibleDeductible:0,reasons:[result.reason],ruleId:''};
  return result.status === 'CALCULATED' ? {claim:result.result.claim,deductible:result.result.deductible,capEligibleDeductible:result.result.enforcementTrace?.capEligibleDeductible ?? result.result.deductible,reasons:result.result.warnings,ruleId:result.result.ruleId} : hold('reason' in result ? result.reason : '분류 확인이 필요합니다.');
}

export type SamsungComparisonItemResult = ReturnType<typeof calculateSamsungComparisonItem>;

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

interface LimitGroups {
  benefit: string;
  count: string;
  serviceDays: string;
  deductible: string;
}

interface RunningLimitAccumulator {
  paid: Map<string, number>;
  count: Map<string, number>;
  serviceDays: Map<string, number>;
  eligibleDeductible: Map<string, number>;
  countedEvents: Set<string>;
}

function createAccumulator(): RunningLimitAccumulator {
  return { paid: new Map(), count: new Map(), serviceDays: new Map(), eligibleDeductible: new Map(), countedEvents: new Set() };
}

function limitGroups(generation: number, ruleId: string, usage: MedicalUsage): LimitGroups {
  const cause = usage.claimCause ?? 'UNKNOWN';
  const category = usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.gen23TreatmentType ?? usage.treatmentCategory ?? 'GENERAL';
  let benefit = ruleId;
  let count = ruleId;
  let serviceDays = ruleId;
  let deductible = ruleId;
  if (generation === 1 && ['G1-01', 'G1-02'].includes(ruleId)) benefit = 'G1-INJURY-INPATIENT';
  if (generation === 4) {
    if (['G4-01', 'G4-08'].includes(ruleId)) benefit = 'G4-COVERED-INJURY';
    if (['G4-02', 'G4-09'].includes(ruleId)) benefit = 'G4-COVERED-DISEASE';
    if (['G4-03', 'G4-04'].includes(ruleId)) benefit = 'G4-NONCOVERED-GENERAL';
  }
  if (generation === 5) {
    const conversion = ruleId.includes('CONV') ? 'CONVERSION' : 'GENERAL';
    const suffix = ruleId.replace('G5-CONV-', '').replace('G5-', '');
    if (['03', '04'].includes(suffix)) benefit = `G5-${conversion}-SEVERE-GENERAL`;
    if (['06', '07'].includes(suffix)) benefit = `G5-${conversion}-NONSEVERE-GENERAL`;
    if (suffix === '05') benefit = `G5-${conversion}-SEVERE-THREE-${category}`;
    count = `${ruleId}-${cause}`;
    serviceDays = `${ruleId}-${cause}`;
  }
  return { benefit, count, serviceDays, deductible };
}

function eventKey(usage: MedicalUsage, occurrence: number): string {
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

function initialState(usage: MedicalUsage, generation: number): RunningLimitState {
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

function calculateScenarioOccurrences(
  contract: InsuranceContract,
  selections: ProductCalculationSelections,
  usage: MedicalUsage,
  assumptions: AnalysisCalculationAssumptions,
  target: boolean,
  accumulator: RunningLimitAccumulator,
) {
  const generation = target ? 5 : contract.generation;
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
  for (let occurrence = 0; occurrence < usage.frequency; occurrence += 1) {
    let result = calculateSamsungComparisonItem(contract, selections, usage, assumptions, target);
    if (result.claim === null) return { total: null, latest: result };
    const groups = limitGroups(generation, result.ruleId || usage.id, usage);
    const initial = initialState(usage, generation);
    const occurrenceEvent = `${groups.count}|${eventKey(usage, occurrence)}`;
    const eventAlreadyCounted = accumulator.countedEvents.has(occurrenceEvent);
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

export function calculateSamsungAnnualComparison(
  contract: InsuranceContract,
  target5GMonthlyPremium: number,
  target5GCoverages: string[],
  selections: ProductCalculationSelections,
  usages: MedicalUsage[],
  assumptions: AnalysisCalculationAssumptions,
) {
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
  const complete = premiumsValid
    && medicalCost !== null
    && items.every((item) => item.currentClaimTotal !== null && item.targetClaimTotal !== null);
  const currentClaimTotal = complete ? items.reduce((sum, item) => sum + (item.currentClaimTotal ?? 0), 0) : null;
  const targetClaimTotal = complete ? items.reduce((sum, item) => sum + (item.targetClaimTotal ?? 0), 0) : null;
  return {
    items,
    complete,
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
