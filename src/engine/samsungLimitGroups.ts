import groups from '../../knowledge/rules/samsung/accumulation-groups.json';
import type { MedicalUsage } from '../domain/medical';

interface GroupDefinition {
  benefit: string; count: string; serviceDays: string; deductible: string;
  deductibleOverrides?: Array<{ category: string; careSetting: string; group: string }>;
}

/** Declarative scope keys are separate from running amounts and scenario initialization. */
export function samsungLimitGroups(_generation: number, ruleId: string, usage: MedicalUsage) {
  const definition: GroupDefinition = (groups as Record<string, GroupDefinition>)[ruleId]
    ?? { benefit: ruleId, count: ruleId, serviceDays: ruleId, deductible: ruleId };
  const category = usage.samsungGen5Facts?.threeNonCoveredCategory ?? usage.gen23TreatmentType ?? usage.treatmentCategory ?? 'GENERAL';
  const resolve = (value: string) => value.replaceAll('{cause}', usage.claimCause ?? 'UNKNOWN').replaceAll('{category}', category);
  const deductible = definition.deductibleOverrides?.find(item => item.category === category && item.careSetting === usage.careSetting)?.group ?? definition.deductible;
  return { benefit: resolve(definition.benefit), count: resolve(definition.count), serviceDays: resolve(definition.serviceDays), deductible: resolve(deductible) };
}
