import type { SamsungContractFacts } from '../../src/domain/samsungContractFacts';

// Explicit contract values for test scenarios, never production defaults.
export const confirmedContractFacts: SamsungContractFacts = {
  coveredBenefitCap: 50_000_000,
  nonCoveredBenefitCap: 50_000_000,
  nonSevereBenefitCap: 10_000_000,
  coveredOutpatientCap: 200_000,
  nonCoveredOutpatientCap: 200_000,
  otherIndemnityPoliciesExist: false,
};
