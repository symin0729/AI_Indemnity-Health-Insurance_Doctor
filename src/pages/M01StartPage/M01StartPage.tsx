import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModeToggle from "../../components/ModeToggle";
import { useAnalysisStore } from "../../store/useAnalysisStore";
import headerLogo from "../../assets/header-logo.png";

type StartMode = "consumer" | "planner";

const modeContent: Record<StartMode, {
  tabLabel: string;
  tabHint: string;
  badge: string;
  title: string[];
  description: string;
  stepsTitle: string;
  stepsDescription: string;
  steps: { title: string; description: string }[];
  cautions: string[];
  consent: string;
  privacyConsent?: { title: string; items: { label: string; text: string }[]; agree: string };
  startLabel: string;
}> = {
  consumer: {
    tabLabel: "소비자용",
    tabHint: "내 실손보험 간편 비교",
    badge: "내 실손보험, 쉽게 확인",
    title: ["보험료뿐 아니라", "달라지는 보장까지 비교하세요."],
    description: "현재 실손보험을 유지할 때와 5세대로 전환할 때의 연간 총부담을 같은 의료이용 조건에서 비교합니다.",
    stepsTitle: "이렇게 간단하게 확인합니다.",
    stepsDescription: "알고 있는 정보만 입력해도 비교할 수 있고, 모르는 항목은 일반적인 값으로 추정해 알려드립니다.",
    steps: [
      { title: "간단히 입력", description: "가입 시기와 최근 병원 이용 정도만 알려주세요." },
      { title: "쉬운 결과 확인", description: "연간 부담과 달라지는 보장을 한눈에 확인합니다." },
      { title: "궁금한 점 질문", description: "결과에 대해 궁금한 내용을 도우미에게 물어볼 수 있습니다." },
    ],
    cautions: [
      "본 서비스는 보험상품 가입을 추천하거나 실제 보험금 지급을 보장하지 않는 모의 비교 서비스입니다.",
      "모르는 항목은 일반적인 값으로 추정하므로 결과가 실제와 다를 수 있으며, 추정 항목은 결과에 표시됩니다.",
      "5세대 예상 보험료와 보장 여부, 전환 가능 여부는 가입한 보험사를 통해 최종 확인해야 합니다.",
      "급여 여부, 중증 여부 등 확인되지 않은 정보는 임의로 확정하지 않으며 ‘확인 필요’로 표시합니다.",
      "보험료와 보장 계산은 현재 브라우저에서 수행합니다. 다만 AI 설명이나 질문 기능을 이용하면 관련 입력 내용이 설명 생성을 위해 서버로 전송될 수 있습니다.",
    ],
    consent: "서비스 목적과 위 유의사항을 확인했으며, 결과가 실제 보험금 또는 상품 추천을 의미하지 않는다는 점을 이해했습니다.",
    startLabel: "소비자용 비교 시작하기",
  },
  planner: {
    tabLabel: "설계사용",
    tabHint: "고객 상담용 정밀 비교",
    badge: "설계사 상담용 · 약관 기반 5세대 실손 전환 비교",
    title: ["고객 상담에 바로 쓰는", "실손 전환 정밀 비교"],
    description: "고객의 계약과 예정 치료를 정밀하게 입력해 현재 계약 유지와 5세대 전환의 연간 총부담, 보장 차이, 계산 근거를 확인하고 고객 상담에 활용 가능합니다.",
    stepsTitle: "상담에서는 이렇게 사용합니다.",
    stepsDescription: "입력한 계약과 예정 치료를 구조화된 계산 규칙에 적용해 결과와 근거를 함께 보여드립니다.",
    steps: [
      { title: "계약·치료 정밀 입력", description: "가입 세대, 담보, 특약, 예정 치료를 상세히 입력하고 확인합니다." },
      { title: "동일 조건 계산", description: "동일한 예정 치료를 현재 계약과 5세대 규칙에 각각 적용합니다." },
      { title: "근거 확인과 고객 설명", description: "연간 총부담, 보장 차이, 확인 필요 항목과 Rule Trace를 확인하며 고객에게 설명합니다." },
    ],
    cautions: [
      "본 서비스는 보험상품 가입이나 전환을 권유하지 않으며 실제 보험금 지급을 보장하지 않는 모의 비교 도구입니다.",
      "결과는 입력값과 현재 지원되는 규칙을 사용합니다. 실제 계약의 약관·특약·면책·지급한도와 다를 수 있으므로 고객에게 안내할 때 이 점을 함께 설명해야 합니다.",
      "5세대 예상 보험료와 보장 여부, 전환 가능 여부는 가입한 보험사를 통해 최종 확인해야 합니다.",
      "급여 여부, 중증 여부 등 확인되지 않은 정보는 임의로 확정하지 않으며 결과에 ‘확인 필요’로 표시합니다.",
      "고객의 계약·치료 정보를 입력할 때는 고객에게 개인정보 수집·이용 동의를 받아야 합니다.",
      "보험료와 보장 계산은 현재 브라우저에서 수행합니다. 다만 AI 설명이나 질문 기능을 이용하면 관련 입력 내용이 설명 생성을 위해 서버로 전송될 수 있습니다.",
    ],
    consent: "서비스 목적과 위 유의사항을 확인했으며, 결과가 실제 보험금 또는 상품 추천을 의미하지 않는다는 점을 고객에게 안내하겠습니다.",
    privacyConsent: {
      title: "개인정보 수집·이용 동의 (고객 정보 입력 시)",
      items: [
        { label: "수집·이용 목적", text: "실손보험 계약 유지와 5세대 전환의 보험료·보장 비교 계산 및 상담 자료 제공" },
        { label: "수집 항목", text: "가입 세대, 가입 시기, 담보·특약 정보, 예정 치료와 의료비 등 고객이 입력한 계약·진료 관련 정보" },
        { label: "처리 방식", text: "입력 정보는 별도 회원 DB에 저장하지 않으며 현재 브라우저에서 계산합니다. 새로고침하거나 창을 닫으면 사라집니다. 다만 AI 설명·질문 기능을 이용하면 설명 생성을 위해 관련 입력 내용이 서버로 전송될 수 있습니다." },
        { label: "동의 거부 권리", text: "고객은 동의를 거부할 수 있으며, 거부 시 고객 정보를 입력하는 상담 기능은 이용할 수 없습니다." },
      ],
      agree: "고객에게 위 내용을 설명하고 개인정보 수집·이용에 대한 동의를 받았음을 확인합니다.",
    },
    startLabel: "설계사용 비교 시작하기",
  },
};

const insuranceGenerations = [
  { generation: "1세대", period: "1999~2009", description: "초기 실손보험으로, 상품과 계약에 따라 보장 조건의 차이가 컸습니다." },
  { generation: "2세대", period: "2009~2017", description: "표준화 약관이 도입되며 보험사별 보장 기준이 정비되었습니다." },
  { generation: "3세대", period: "2017~2021", description: "일부 비급여 치료를 별도 특약으로 구분해 보장 구조를 세분화했습니다." },
  { generation: "4세대", period: "2021~2026", description: "급여와 비급여를 분리하고 비급여 이용량을 보험료에 반영했습니다." },
  { generation: "5세대", period: "2026~", description: "비급여를 중증과 비중증으로 나누고 중증·필수 치료 중심으로 개편했습니다." },
];

function M01StartPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setStoreMode = useAnalysisStore((state) => state.setMode);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [hasPrivacyConsent, setHasPrivacyConsent] = useState(false);

  const mode: StartMode = searchParams.get("mode") === "consumer" ? "consumer" : "planner";
  const content = modeContent[mode];
  const isConsumerReady = false;
  const needsPrivacyConsent = Boolean(content.privacyConsent);
  const canStart = hasConfirmed && (!needsPrivacyConsent || hasPrivacyConsent) && (mode === "planner" || isConsumerReady);

  const selectMode = (next: StartMode) => {
    setSearchParams(next === "planner" ? {} : { mode: next }, { replace: true });
  };

  return (
    <div className="start-page">
      <header className="start-page__header">
        <div className="start-page__nav">
          <div className="start-page__brand">
            <img className="start-page__logo" src={headerLogo} alt="" aria-hidden="true" />
            <span>AI 실손 닥터</span>
          </div>
          <ModeToggle mode={mode} onChange={selectMode} />
        </div>
      </header>

      <main className="start-page__main">
        <div id="start-mode-panel" role="tabpanel" aria-labelledby={`start-tab-${mode}`}>
          <section className="start-hero">
            <div className="start-hero__copy">
              <span className="start-hero__badge">{content.badge}</span>
              <h1>{content.title[0]}<br />{content.title[1]}</h1>
              <p>{content.description}</p>
            </div>
            <div className="start-hero__visual">
              <img src={headerLogo} alt="AI 실손 닥터" />
            </div>
          </section>
        </div>

        <section className="insurance-history" aria-labelledby="insurance-history-title">
          <div className="insurance-history__heading">
            <div>
              <span className="insurance-history__eyebrow">실손보험 제도의 변화</span>
              <h2 id="insurance-history-title">1세대부터 5세대까지</h2>
            </div>
            <p>세대가 바뀌면서 보장 구조와 자기부담, 보험료 산정 방식도 달라졌습니다.</p>
          </div>

          <ol className="insurance-history__timeline">
            {insuranceGenerations.map((item) => (
              <li className="insurance-history__item" key={item.generation}>
                <div className="insurance-history__marker" aria-hidden="true" />
                <div className="insurance-history__meta">
                  <strong>{item.generation}</strong>
                  <span>{item.period}</span>
                </div>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>

          <p className="insurance-history__note">실제 보장 내용은 가입 시기와 상품 약관에 따라 달라질 수 있습니다.</p>
        </section>

        <section className="start-guide">
          <h2>{content.stepsTitle}</h2>
          <p className="start-guide__description">{content.stepsDescription}</p>

          <div className="start-guide__steps">
            {content.steps.map((step, index) => (
              <article className="start-guide__step" key={step.title}>
                <span className="start-guide__number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>

          <div className="start-cautions">
            <h3>이용 전 반드시 확인해주세요.</h3>
            <div className="start-cautions__list">
              {content.cautions.map((caution) => (
                <div className="start-cautions__item" key={caution}>
                  <span aria-hidden="true">!</span><p>{caution}</p>
                </div>
              ))}
            </div>
          </div>

          <label className={`start-consent${hasConfirmed ? " is-checked" : ""}`}>
            <input type="checkbox" checked={hasConfirmed} onChange={(event) => setHasConfirmed(event.target.checked)} />
            <span>{content.consent}</span>
          </label>

          {content.privacyConsent && (
            <section className="start-privacy" aria-labelledby="start-privacy-title">
              <h3 id="start-privacy-title">{content.privacyConsent.title}</h3>
              <dl className="start-privacy__list">
                {content.privacyConsent.items.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.text}</dd>
                  </div>
                ))}
              </dl>
              <label className={`start-consent${hasPrivacyConsent ? " is-checked" : ""}`}>
                <input type="checkbox" checked={hasPrivacyConsent} onChange={(event) => setHasPrivacyConsent(event.target.checked)} />
                <span>{content.privacyConsent.agree}</span>
              </label>
            </section>
          )}

          <div className="start-action">
            <button type="button" className="start-action__button" disabled={!canStart} onClick={() => { setStoreMode(mode); navigate("/input"); }}>
              {content.startLabel} <span aria-hidden="true">→</span>
            </button>
          </div>
          {mode === "consumer" && (
            <p className="start-modes__notice" role="status">소비자용 간편 비교는 준비 중입니다. 현재는 설계사용을 이용해 주세요.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default M01StartPage;
