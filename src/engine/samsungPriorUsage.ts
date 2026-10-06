import type { SamsungContractFacts } from "../domain/samsungContractFacts";
import type { MedicalUsage } from "../domain/medical";

/**
 * 4세대 현재 계약의 "올해 이미 이용한 내역"을 계산 규칙의 한도 묶음(담보)에 맞춰 꺼낸다.
 * 값이 undefined이면 입력하지 않은 것이다(0과 다르다). 호출하는 쪽이 '사용한 한도 없음' 가정이 있을 때만 0으로 본다.
 */
export interface Gen4PriorUsage {
  paid?: number;
  count?: number;
  eligibleDeductible?: number;
  /** 이 규칙에서 올해 사용분이 반드시 필요한 값 */
  needs: { paid: boolean; count: boolean; eligibleDeductible: boolean };
}

export function gen4PriorUsage(facts: SamsungContractFacts | undefined, ruleId: string, claimCause: MedicalUsage["claimCause"]): Gen4PriorUsage {
  const injury = claimCause === "INJURY";
  const coveredInpatient = ["G4-01", "G4-02"].includes(ruleId);
  const coveredOutpatient = ["G4-08", "G4-09"].includes(ruleId);
  const nonCoveredGeneral = ["G4-03", "G4-04"].includes(ruleId);
  const covered = coveredInpatient || coveredOutpatient;
  // 3대 비급여는 치료 종류별로 연 한도가 따로다(도수·체외충격파·증식 / 주사 / MRI).
  const threeNonCovered = { "G4-05": ["priorManualTherapyPaid", "priorManualTherapyCount"], "G4-06": ["priorInjectionPaid", "priorInjectionCount"], "G4-07": ["priorMriPaid", undefined] } as const;
  const three = threeNonCovered[ruleId as keyof typeof threeNonCovered];
  const paid = covered
    ? (ruleId === "G4-01" || ruleId === "G4-08" ? facts?.priorCoveredInjuryPaid : facts?.priorCoveredDiseasePaid)
    : nonCoveredGeneral ? (injury ? facts?.priorNonCoveredInjuryPaid : facts?.priorNonCoveredDiseasePaid)
      : three ? facts?.[three[0]] : undefined;
  const count = ruleId === "G4-04" ? (injury ? facts?.priorNonCoveredInjuryVisits : facts?.priorNonCoveredDiseaseVisits)
    : three?.[1] ? facts?.[three[1]] : undefined;
  return {
    paid,
    count,
    eligibleDeductible: coveredInpatient ? facts?.priorCoveredInpatientDeductible : undefined,
    needs: { paid: true, count: ruleId === "G4-04" || Boolean(three?.[1]), eligibleDeductible: coveredInpatient },
  };
}
