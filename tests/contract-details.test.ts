import { currentContractFormForSelection, singleContractDetails, singleContractForm, validateContractDetails } from '../src/pages/M02InputPage/contractRequirements';
import { describe, expect, it } from "vitest";
import { applyGen23ContractDetails, contractDetailsFromUsage, GEN23_SAMPLE_CONTRACT_DETAILS, parseGen23ContractDetails } from "../src/domain/contractDetails";
import { generationSelectedPatch, inceptionDateTypedPatch, samplePolicyPatch } from "../src/pages/M02InputPage/contractTransitions";
import { samplePolicyService } from "../src/services/samplePolicyService";
import type { MedicalUsage } from "../src/domain/medical";

const usage = { id: "u", treatmentName: "t", careSetting: "OUTPATIENT", benefitClass: "COVERED", severityClass: "UNKNOWN", frequency: 1, unitCost: 100_000 } as MedicalUsage;

describe("현재 계약 상세(가입금액·주계약 가입)", () => {
  it("입력값을 계산용 값으로 바꾸고, 예정 치료와 5세대 계산 입력에 모두 반영한다", () => {
    const details = parseGen23ContractDetails({ gen23OutpatientBenefitCap: "250000", gen23OtherIndemnityPoliciesExist: "false", gen23RequiredCoverageConfirmed: "true" });
    const applied = applyGen23ContractDetails({ ...usage, samsungCalculationInput: { otherIndemnityPoliciesExist: true, policyExclusionsCleared: true } }, details);
    expect(applied).toMatchObject({ gen23OutpatientBenefitCap: 250_000, gen23OtherIndemnityPoliciesExist: false });
    // 샘플이 남긴 값보다 STEP 1 입력이 우선한다. 치료에서 받은 면책 확인은 유지한다.
    expect(applied.samsungCalculationInput).toMatchObject({ otherIndemnityPoliciesExist: false, requiredCoverageConfirmed: true, outpatientBenefitCap: 250_000, policyExclusionsCleared: true });
  });

  it("조건에 맞지 않는 칸은 계산에 넣지 않는다(다른 실손이 없으면 비례보상계수)", () => {
    const details = parseGen23ContractDetails({ gen23OtherIndemnityPoliciesExist: "false", gen23ProportionalPaymentFactor: "0.5" });
    expect(details.gen23ProportionalPaymentFactor).toBeUndefined();
  });

  it("형식이 틀린 값은 칸 이름과 함께 알려준다", () => {
    expect(() => parseGen23ContractDetails({ gen23OutpatientBenefitCap: "-1" })).toThrow("외래 가입금액");
  });

  it("저장된 치료에서 입력값을 되살린다", () => {
    expect(contractDetailsFromUsage({ ...usage, gen23OutpatientBenefitCap: 250_000, gen23OtherIndemnityPoliciesExist: false })).toEqual({ gen23OutpatientBenefitCap: "250000", gen23OtherIndemnityPoliciesExist: "false" });
  });

  it("세대를 바꾸거나 가입일을 바꾸면 계약 상세를 비운다", () => {
    expect(generationSelectedPatch(2, { selectedSampleId: null }).contractDetails).toEqual({});
    expect(inceptionDateTypedPatch("2016-01-01").contractDetails).toEqual({});
  });

  it("2·3세대 샘플 계약은 계약 상세도 설명용 값으로 채우고, 4세대 샘플은 비워 약관상 최대값을 가정한다", () => {
    for (const id of ["LOW_USAGE", "NON_COVERED", "COVERAGE_GAP"] as const) {
      const sample = samplePolicyService.load(id);
      const patch = samplePolicyPatch(id, sample);
      expect(patch.contractDetails, id).toEqual(sample.generation === 2 || sample.generation === 3 ? GEN23_SAMPLE_CONTRACT_DETAILS : {});
    }
  });
});


describe('설계사용 단일 실손 계약 비교', () => {
  it('이전 중복가입 입력을 재사용해 보험금을 줄이지 않고 가입금액과 보장기간은 유지한다', () => {
    const legacy = { coveredBenefitCap: '30000000', coveredOutpatientCap: '100000', coveragePeriod: 'ACTIVE', otherIndemnityPoliciesExist: 'true', proportionalPaymentFactor: '0.5' };
    expect(singleContractForm(legacy)).toEqual({ ...legacy, otherIndemnityPoliciesExist: 'false', proportionalPaymentFactor: undefined });
    expect(currentContractFormForSelection(legacy, 'ENROLLED')).toMatchObject({ coveredBenefitCap: '30000000', otherIndemnityPoliciesExist: 'false', proportionalPaymentFactor: undefined });
    expect(validateContractDetails({ generation: 4, contractDetails: {}, currentContractFactsForm: legacy, gen4NonCoveredRider: 'NOT_ENROLLED' })).toBeNull();
    const details = parseGen23ContractDetails(singleContractDetails({ ...GEN23_SAMPLE_CONTRACT_DETAILS, gen23OtherIndemnityPoliciesExist: 'true', gen23ProportionalPaymentFactor: '0.5' }));
    expect(details.gen23OtherIndemnityPoliciesExist).toBe(false);
    expect(details.gen23ProportionalPaymentFactor).toBeUndefined();
    expect(details.gen23ContractBenefitCap).toBe(50_000_000);
  });
});

it('주계약은 지원되는 상품 종형 선택으로 판단하고 중복 가입 질문은 요구하지 않는다', () => {
  for (const variant of ['standard', 'selected2'] as const) {
    expect(parseGen23ContractDetails(singleContractDetails({}, variant)).gen23RequiredCoverageConfirmed).toBe(true);
  }
  expect(parseGen23ContractDetails(singleContractDetails({}, 'UNKNOWN')).gen23RequiredCoverageConfirmed).toBe(false);
  expect(validateContractDetails({ generation: 3, contractDetails: { gen23ContractBenefitCap: '50000000', gen23OutpatientBenefitCap: '250000', gen23PrescriptionBenefitCap: '50000' }, currentContractFactsForm: {}, gen4NonCoveredRider: 'NOT_ENROLLED' })).toBeNull();
});
