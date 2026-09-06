import { useState } from "react";
import { useNavigate } from "react-router-dom";
import headerLogo from "../../assets/header-logo.png";

const comparisonSteps = [
  { title: "현재 계약 입력", description: "가입 세대, 보험료, 특약 등 현재 보험 정보를 입력합니다." },
  { title: "동일 조건 계산", description: "동일한 예정 치료를 현재 계약과 5세대 규칙에 각각 적용합니다." },
  { title: "결과와 근거 확인", description: "연간 총부담, 보장 차이, 확인 필요 항목과 Rule Trace를 확인합니다." },
];

const cautions = [
  "본 서비스는 보험상품 가입을 추천하거나 실제 보험금 지급을 보장하지 않는 모의 비교 서비스입니다.",
  "현재 결과는 입력값과 MVP 대표 규칙을 사용합니다. 실제 계약의 약관·특약·면책·지급한도와 다를 수 있습니다.",
  "5세대 예상 보험료와 보장 여부, 전환 가능 여부는 가입한 보험사를 통해 최종 확인해야 합니다.",
  "급여 여부, 중증 여부 등 확인되지 않은 정보는 임의로 확정하지 않으며 결과에 ‘확인 필요’로 표시합니다.",
  "입력한 보험·치료 정보는 별도 서버나 회원 DB로 전송하지 않고 현재 브라우저에서만 계산합니다.",
];

function M01StartPage() {
  const navigate = useNavigate();
  const [hasConfirmed, setHasConfirmed] = useState(false);

  return (
    <div className="start-page">
      <header className="start-page__header">
        <div className="start-page__nav">
          <div className="start-page__brand">
            <img className="start-page__logo" src={headerLogo} alt="" aria-hidden="true" />
            <span>AI 실손 닥터</span>
          </div>
        </div>
      </header>

      <main className="start-page__main">
        <section className="start-hero">
          <div className="start-hero__copy">
            <span className="start-hero__badge">약관 기반 5세대 실손 전환 비교</span>
            <h1>보험료뿐 아니라<br />달라지는 보장까지 비교하세요.</h1>
            <p>현재 실손보험을 유지할 때와 5세대로 전환할 때의 연간 총부담을 같은 의료이용 조건에서 비교합니다.</p>
          </div>
          <div className="start-hero__visual">
            <img src={headerLogo} alt="AI 실손 닥터" />
          </div>
        </section>

        <section className="start-guide">
          <h2>AI 실손 닥터는 이렇게 비교합니다.</h2>
          <p className="start-guide__description">입력한 보험 정보와 예정 치료를 구조화된 계산 규칙에 적용해 결과와 근거를 함께 보여드립니다.</p>

          <div className="start-guide__steps">
            {comparisonSteps.map((step, index) => (
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
              {cautions.map((caution) => (
                <div className="start-cautions__item" key={caution}>
                  <span aria-hidden="true">!</span><p>{caution}</p>
                </div>
              ))}
            </div>
          </div>

          <label className={`start-consent${hasConfirmed ? " is-checked" : ""}`}>
            <input type="checkbox" checked={hasConfirmed} onChange={(event) => setHasConfirmed(event.target.checked)} />
            <span>서비스 목적과 위 유의사항을 확인했으며, 결과가 실제 보험금 또는 상품 추천을 의미하지 않는다는 점을 이해했습니다.</span>
          </label>

          <div className="start-action">
            <button type="button" className="start-action__button" disabled={!hasConfirmed} onClick={() => navigate("/input") }>
              비교 시작하기 <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default M01StartPage;
