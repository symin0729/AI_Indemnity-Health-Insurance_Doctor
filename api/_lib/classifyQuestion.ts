import { redactPersonalData } from "./redactPersonalData.js";

/**
 * 챗봇 질문 분류 (docs/ai-silson-doctor/19_chatbot_master_guide.md 2장).
 * 팀 확정 스코프: IN(5세대 전환 판단 질문) / OUT-01~04(고정 안내문) / PRIVACY(OUT-05) / 보험과 무관.
 * 외부 호출 없이 로컬 규칙만으로 판단하며, 애매하면 허용하지 않고 OUT-01 쪽(안전)으로 보낸다.
 */
export type ClassificationRoute = "IN" | "OUT" | "PRIVACY" | "OUT_OF_DOMAIN";

export type ClassificationId = "IN" | "OUT-01" | "OUT-02" | "OUT-03" | "OUT-04" | "OUT-05" | "OUT-DOMAIN";

export interface Classification {
  route: ClassificationRoute;
  id: ClassificationId;
  /** 어떤 규칙에 걸렸는지(디버깅·평가용). 사용자에게 보여 주지 않는다. */
  reason: string;
}

/** 값 자체(번호·연락처 등)를 담고 있어 보내기만 해도 안 되는 개인정보 라벨 */
const VALUE_LABELS = new Set([
  "이름", "주민등록번호", "외국인등록번호", "여권번호", "운전면허번호", "전화번호", "이메일", "주소",
  "보험증권 번호", "보험회사 고객번호", "카드번호", "계좌번호", "비밀번호 또는 인증코드",
  "전체 계산 JSON", "Rule Engine 입력값",
]);

/** 띄어쓰기·문장부호·가운뎃점을 없애 표현 변형에 강하게 만든다 */
const compact = (text: string): string => text.toLowerCase().replace(/[\s?!.,'"“”‘’~·ㆍ]/g, "");

const test = (pattern: RegExp, text: string): boolean => pattern.test(text);

// --- OUT-05 개인정보: 개인 식별 항목을 알려주거나 조회·저장해 달라는 요청 ---
const personalItems = /(주민번호|주민등록|증권번호|계약번호|전화번호|계좌번호|카드번호|이름과|병력|진단서|의무기록|진료기록|처방전)/;
const lookupVerbs = /(조회|알려드릴|알려줄테니|기억|저장|보관|등록|넘겨|올려|맡겨|전달|확인해줘|확인해주세요|보내드릴)/;

// --- OUT-03 보험금 수령 목적 의료상담: 어떤 치료·병원을 택해야 하는지 묻는 질문 ---
// "특약"·"약관"의 약은 의료용어가 아니다
const medicalWords = "(수술|시술|치료|입원|검사|(?<!특)약(?!관)|병원|의사|진료)";
const medicalAdvice = [
  new RegExp(`${medicalWords}.{0,10}(받아야|해야하나|해야할까|해야돼|받는게좋|하는게좋|하는게낫|받는게낫|하면좋|해도되나)`),
  /(어느|어떤|무슨).{0,4}(병원|의사|치료|수술|(?<!특)약(?!관)).{0,12}(좋|받|가야|해야|추천)/,
  /보험금.{0,14}(받으려면|받기위해|받을수있|나오려면|더받).{0,14}(어떤|무슨|어느).{0,6}(치료|수술|검사|병원)/,
  /(입원|수술|치료|시술)하는게(낫|좋)/,
];

// --- 선택·추천 요구(보험과 무관해 보여도 OUT-01) ---
// "특약 하나만 가입해도 되나요"처럼 단순히 수량을 말하는 "하나만"은 선택 강제가 아니다
const selectionWords = /((하나만|딱하나만?).{0,6}(추천|골라|정해|선택|알려줘|말해)|골라|둘중|어느쪽이|(?<!확)정해줘|(?<!확)정해주세요|결정해)/;
// --- OUT-01 직접 추천 ---
const strongRecommend = /(추천|권해|제일좋|가장좋|최고의)/;
const personalRef = /(저한테|저에게|제가|저는|내가|나는|우리부모|부모님|가족|엄마|아빠|남편|아내|우리집)/;
const evaluationWords = /(좋을까|좋을지|좋나요|좋은가|나을까|나을지|나은가|나은지|이득|유리|손해|맞나요|맞을까|괜찮을까|맞는지)/;
const switchObligation = /(갈아타|바꿔|바꾸어|전환해|유지해|해지해|옮겨)야(하나|할까|돼|되나|할지)/;
const switchWords = /(5세대|세대|기존실손|지금보험|유지|전환|갈아타|갈아탈|바꾸|바꿀|갈아탄)/;
const midEvaluation = /(더좋|더나은|더유리|더이득|좋을까|나을까|좋은가|나은가|좋나요|나을지|좋을지|무조건좋|항상좋)/;
// 비교 기준을 묻는 질문(B)
const criteriaAsk = new RegExp(
  [
    "(무엇|뭘|뭐|어떤점|어떤항목|어떤것|어떤걸|어떤내용|어떤부분).{0,14}(비교|확인|따져|봐야|고려|살펴|물어|체크|알아봐)",
    "(비교기준|판단기준|판단하려면|판단할때|비교하면되|체크할것|확인할것|물어봐야)",
  ].join("|"),
);
// IN-02 예외: 예전·기존 실손의 넓은 보장이 유리한지 묻는 일반 사실 질문
const olderGenerationFact = [
  /(예전|옛날|기존|구|1세대|2세대|1,2세대|12세대).{0,10}(실손|보험|세대).{0,16}(보장|넓).{0,24}(유리|좋|사실|맞|이유)/,
  /(예전|옛날|기존|구).{0,6}실손.{0,8}(더좋다는데|더낫다는데|좋다는데|유리하다는데).{0,8}(사실|맞)/,
  /(1세대|2세대|12세대|1,2세대).{0,10}보장.{0,6}(넓|많).{0,16}(유리|좋)/,
];

// --- OUT-04 개별 심사·분쟁 판단 ---
const disputeEvent = /(거절|부지급|삭감|깎았|감액|거부|지급안|안줬|안주)/;
const disputeJudge = /(잘못|부당|불법|맞나|맞는|옳|정당|판단해|봐주세요|알려주세요|아닌가|이게맞)/;
const disputeDirect = /(지급거절|지급심사|심사결과|지급결정|보험사의결정).{0,14}(잘못|부당|불법|맞나|맞는|옳|정당|봐주세요|알려주세요)/;

// --- OUT-02 개인 보험금 확정 ---
const amountText = /\d[\d,.]*(만원|천원|원)/;
const payoutAsk = /(받아요|받나요|받을수|나와요|나오나요|나올까요|지급되|얼마나온|얼마받|얼마지급|얼마가나)/;
const exactAsk = /(정확히|확정해|확정해주|꼭지급|반드시지급|꼭받|반드시받).{0,14}(얼마|지급|나오|받|확정)|얼마.{0,10}(확정|정확)/;
const asIsAsk = /(실제로|그대로).{0,8}(나오|지급|받)/;
const certaintyAsk = /(100%|백퍼센트|전액|무조건|틀림없이).{0,10}(보상|지급|받|나오)/;

// --- 보험·5세대 전환 영역 여부 ---
const domainTerms = /(실손|보험|세대|특약|급여|비급여|보장|보험료|보험금|자기부담|갱신|전환|철회|가입|약관|공제|청구|총부담|손익분기|결과화면|서비스|입력한정보|도수|주사|mri|자기공명|한도|할인|할증|무사고|재가입|심사|상급병실|임신|출산|표준약관|보험사|보험회사|보상|지급|거절|부당|유지할|바꿀|바꾸|바꿔|갈아타|갈아탈|옮겨|갈아탔|바꿨|바꾼|취소|금액)/;

export const classifyQuestion = (question: string): Classification => {
  const text = compact(question);
  const redaction = redactPersonalData(question);

  // 1) 개인정보 값이 들어 있거나, 개인 식별 항목을 조회·저장해 달라는 요청
  if (redaction.detected.some((label) => VALUE_LABELS.has(label))) {
    return { route: "PRIVACY", id: "OUT-05", reason: "개인정보 값 탐지" };
  }
  if (test(personalItems, text) && test(lookupVerbs, text)) {
    return { route: "PRIVACY", id: "OUT-05", reason: "개인정보 조회·저장 요구" };
  }
  // "제 보험료는 120,000원입니다"처럼 개인 계약·치료 표현에 구체적인 수치가 붙으면 개인정보로 본다
  // 세대·특약 번호(5세대, 특약2, 1~4세대)는 개인 수치가 아니므로 제외하고 금액·날짜 같은 수치만 본다
  const personalNumbers = question.replace(/\d+\s*[~∼-]\s*\d+\s*세대/g, "").replace(/\d+\s*(세대|세|개월|회|%)/g, "").replace(/특약\s*\d/g, "");
  if (redaction.detected.length > 0 && /\d/.test(personalNumbers)) {
    return { route: "PRIVACY", id: "OUT-05", reason: "개인 정보 표현에 수치 포함" };
  }

  // 2) 보험금을 받기 위한 치료·병원 선택 상담 (OUT-03). 보장 범위를 묻는 질문과는 구분한다.
  if (medicalAdvice.some((pattern) => test(pattern, text))) {
    return { route: "OUT", id: "OUT-03", reason: "치료·병원 선택 상담" };
  }

  // 3) 하나만 고르라는 등 선택 강제 표현은 보험 용어가 없어도 직접 추천 요구로 본다
  if (test(selectionWords, text)) {
    return { route: "OUT", id: "OUT-01", reason: "선택 강제 표현" };
  }

  // 4) 보험·5세대 전환과 무관하면 범위 밖. 단 "무엇을 비교해야 하나요"처럼 비교 기준을 묻는 문장은
  //    보험 용어가 없어도 전환 판단 질문(IN-01)으로 본다(예: "저한테 맞는지 판단하려면 무엇을 비교해야 하나요?").
  if (!test(domainTerms, text) && !test(criteriaAsk, text)) {
    return { route: "OUT_OF_DOMAIN", id: "OUT-DOMAIN", reason: "보험 관련 용어 없음" };
  }

  // 5) 개별 심사·분쟁 판단 (OUT-04)
  if ((test(disputeEvent, text) && test(disputeJudge, text)) || test(disputeDirect, text)) {
    return { route: "OUT", id: "OUT-04", reason: "지급 거절·심사 판단 요구" };
  }

  // 6) 개인 보험금 확정 (OUT-02)
  if (
    (test(amountText, text) && test(payoutAsk, text)) ||
    test(exactAsk, text) ||
    test(asIsAsk, text) ||
    test(certaintyAsk, text)
  ) {
    return { route: "OUT", id: "OUT-02", reason: "개인 보험금 확정·계산 요구" };
  }

  // 7) 직접 추천 (OUT-01) — 19 종합문서 2.4절 판정 순서
  if (test(strongRecommend, text)) {
    return { route: "OUT", id: "OUT-01", reason: "추천 요구" };
  }
  if (test(criteriaAsk, text)) {
    return { route: "IN", id: "IN", reason: "비교 기준 질문" };
  }
  if (test(switchObligation, text)) {
    return { route: "OUT", id: "OUT-01", reason: "전환·유지 행동 판단 요구" };
  }
  if (test(personalRef, text) && test(evaluationWords, text)) {
    return { route: "OUT", id: "OUT-01", reason: "개인 맞춤 평가 요구" };
  }
  if (test(switchWords, text) && test(midEvaluation, text)) {
    if (olderGenerationFact.some((pattern) => test(pattern, text))) {
      return { route: "IN", id: "IN", reason: "예전 실손 보장 사실 질문(IN-02)" };
    }
    return { route: "OUT", id: "OUT-01", reason: "세대·선택 우열 판정 요구" };
  }

  return { route: "IN", id: "IN", reason: "일반 IN" };
};
