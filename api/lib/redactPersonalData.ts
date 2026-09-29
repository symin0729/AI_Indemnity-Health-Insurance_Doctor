interface SensitivePattern {
  label: string;
  pattern: RegExp;
}

const sensitivePatterns: SensitivePattern[] = [
  { label: "이름", pattern: /(?:이름|성명)\s*(?:은|는|이|가|:)?\s*[가-힣]{2,5}/g },
  { label: "주민등록번호", pattern: /\b\d{6}\s*[- ]?\s*[1-4]\d{6}\b/g },
  { label: "외국인등록번호", pattern: /\b\d{6}\s*[- ]?\s*[5-8]\d{6}\b/g },
  {
    label: "여권번호",
    pattern: /(?:여권\s*(?:번호|No\.?|#)?)\s*(?:은|는|이|가|:)?\s*[A-Z][A-Z0-9]{6,11}/gi,
  },
  {
    label: "운전면허번호",
    pattern: /(?:운전\s*)?면허\s*(?:번호|No\.?|#)?\s*(?:은|는|이|가|:)?\s*\d{2}\s*[- ]?\s*\d{2}\s*[- ]?\s*\d{6}\s*[- ]?\s*\d{2}/gi,
  },
  { label: "전화번호", pattern: /\b01[016789]\s*[- ]?\s*\d{3,4}\s*[- ]?\s*\d{4}\b/g },
  { label: "이메일", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  {
    label: "주소",
    pattern: /(?:주소|거주지|사는\s*곳)\s*(?:은|는|이|가|:)?\s*(?:[가-힣A-Za-z0-9-]+\s*){1,8}(?:로|길|동|읍|면)\s*\d*(?:-\d+)?/g,
  },
  {
    label: "보험증권 번호",
    pattern: /(?:보험\s*)?증권\s*(?:번호|No\.?|#)?\s*(?:은|는|이|가|:)?\s*[A-Z0-9][A-Z0-9-]{4,}/gi,
  },
  {
    label: "보험회사 고객번호",
    pattern: /(?:보험사|보험회사)?\s*고객\s*(?:번호|ID|No\.?)\s*(?:은|는|이|가|:)?\s*[A-Z0-9][A-Z0-9-]{3,}/gi,
  },
  { label: "카드번호", pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g },
  { label: "계좌번호", pattern: /\b\d{2,6}(?:[- ]\d{2,6}){2,5}\b/g },
  {
    label: "비밀번호 또는 인증코드",
    pattern: /(?:비밀번호|비밀번호|password|passwd|otp|인증\s*(?:번호|코드))\s*(?:은|는|이|가|:)?\s*[^\s,]{4,}/gi,
  },
  {
    label: "개인 계약 상세정보",
    pattern: /(?:제|내|저의|본인)\s*(?:보험(?!료|금)|계약|상품|특약|가입일|가입\s*내역|현재\s*세대)/g,
  },
  {
    label: "개인 치료내역",
    pattern: /(?:제가|나는|저는|내가|제|내|저의)\s*(?:받은|다닌|했던|한)?\s*(?:치료|진료|수술|입원|통원|병원|의료기관|치료비|진료일)/g,
  },
  {
    label: "진단명과 개인 식별정보",
    pattern: /(?:제|내|저의|본인)\s*(?:진단명|진단|질환|병명)|(?:진단명|병명)\s*:\s*[가-힣A-Za-z0-9 -]{2,}/g,
  },
  {
    label: "개인 보험료",
    pattern: /(?:제|내|저의|본인|제가\s*내는|현재\s*납부(?:하는)?|월)\s*(?:보험료|납입보험료)(?:\s*(?:는|은|이|가|:))?\s*[\d,]*\s*원?/g,
  },
  {
    label: "개인 보험금 계산 결과",
    pattern: /(?:제|내|저의|본인)\s*(?:예상\s*)?(?:보험금|지급액|수령액)(?:\s*(?:은|는|이|가|:))?\s*[\d,]*\s*원?/g,
  },
  {
    label: "개인 총부담 계산 결과",
    pattern: /(?:제|내|저의|본인)\s*(?:예상\s*)?(?:총\s*부담|총부담|최종\s*부담)(?:\s*(?:은|는|이|가|:))?\s*[\d,]*\s*원?/g,
  },
  {
    label: "개인 손익분기 계산 결과",
    pattern: /(?:제|내|저의|본인)\s*(?:손익분기점|손익분기)(?:\s*(?:은|는|이|가|:))?\s*[\d,.]*\s*(?:년|개월|회|원)?/g,
  },
  {
    label: "전체 계산 JSON",
    pattern: /\{[\s\S]*(?:calculationResult|totalBurden|insuranceBenefit|breakEven|target5G)[\s\S]*\}/gi,
  },
  {
    label: "Rule Engine 입력값",
    pattern: /\{[\s\S]*(?:calculationAssumptions|target5GMonthlyPremium|target5GCoverages|medicalUsages|usages|contract)[\s\S]*\}/gi,
  },
];

export interface RedactionResult {
  value: string;
  detected: string[];
}

export const redactPersonalData = (question: string): RedactionResult => {
  const detected = new Set<string>();
  let value = question;
  for (const { label, pattern } of sensitivePatterns) {
    value = value.replace(pattern, () => {
      detected.add(label);
      return `[${label} 삭제]`;
    });
  }
  return { value, detected: [...detected] };
};
