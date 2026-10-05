import { useM02Base } from "./useM02Base";
import { useContractFields } from "./useContractFields";
import { useCompareFields } from "./useCompareFields";
import { useTreatmentFields } from "./useTreatmentFields";
import { useAssumptionFields } from "./useAssumptionFields";
import { useTreatmentActions } from "./useTreatmentActions";
import { useM02Flow } from "./useM02Flow";

/** 입력 화면의 상태와 처리 함수. 단계별 파일로 나뉘어 있고, 여기서 순서대로 합친다. */
export function useM02Form() {
  const base = useM02Base();
  const contract = useContractFields({ ...base });
  const compare = useCompareFields({ ...base, ...contract });
  const treatment = useTreatmentFields({ ...base, ...contract, ...compare });
  const assumption = useAssumptionFields({ ...base, ...contract, ...compare, ...treatment });
  const treatmentActions = useTreatmentActions({ ...base, ...contract, ...compare, ...treatment, ...assumption });
  const flow = useM02Flow({ ...base, ...contract, ...compare, ...treatment, ...assumption, ...treatmentActions });

  return { ...base, ...contract, ...compare, ...treatment, ...assumption, ...treatmentActions, ...flow };
}

export type M02Form = ReturnType<typeof useM02Form>;
