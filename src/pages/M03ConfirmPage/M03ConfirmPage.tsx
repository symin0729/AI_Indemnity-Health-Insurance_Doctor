import { useNavigate } from "react-router-dom";
import { useAnalysisStore } from "../../store/useAnalysisStore";

function M03ConfirmPage() {
  const navigate = useNavigate();

  const contract = useAnalysisStore(
    (state) => state.contract
  );

  const target5GMonthlyPremium = useAnalysisStore(
    (state) => state.target5GMonthlyPremium
  );

  const target5GCoverages = useAnalysisStore(
    (state) => state.target5GCoverages
  );

  const usages = useAnalysisStore(
    (state) => state.usages
  );

  if (!contract) {
    return (
      <main>
        <h1>확인할 보험 정보가 없습니다.</h1>

        <button onClick={() => navigate("/input")}>
          입력 화면으로
        </button>
      </main>
    );
  }

  const getCareSettingLabel = (
    careSetting: "INPATIENT" | "OUTPATIENT"
  ) => {
    if (careSetting === "INPATIENT") {
      return "입원";
    }

    return "통원";
  };

  const getBenefitClassLabel = (
    benefitClass:
      | "COVERED"
      | "NON_COVERED"
      | "UNKNOWN"
  ) => {
    if (benefitClass === "COVERED") {
      return "급여";
    }

    if (benefitClass === "NON_COVERED") {
      return "비급여";
    }

    return "모름";
  };

  const getSeverityClassLabel = (
    severityClass:
      | "SEVERE"
      | "NON_SEVERE"
      | "UNKNOWN"
  ) => {
    if (severityClass === "SEVERE") {
      return "중증";
    }

    if (severityClass === "NON_SEVERE") {
      return "비중증";
    }

    return "모름";
  };

  const getCoverageLabel = (
    coverage: string
  ) => {
    if (
      coverage === "SPECIAL_RIDER_2"
    ) {
      return "비급여 특약2";
    }

    return coverage;
  };

  const cardStyle = {
    padding: "22px",
    border: "1px solid #e5e8eb",
    borderRadius: "16px",
    background: "#ffffff",
  };

  const labelStyle = {
    marginBottom: "3px",
    color: "#6b7684",
    fontSize: "13px",
  };

  const valueStyle = {
    marginTop: 0,
    fontWeight: 700,
  };

  return (
    <main>
      <div
        style={{
          marginBottom: "32px",
        }}
      >
        <p
          style={{
            marginBottom: "6px",
            color: "#3182f6",
            fontWeight: 700,
          }}
        >
          AI 실손 닥터
        </p>

        <h1>입력 정보 확인</h1>

        <p
          style={{
            color: "#6b7684",
          }}
        >
          계산하기 전에 입력한 보험과
          예정 치료 정보를 확인해주세요.
        </p>
      </div>

      <section>
        <h2>보험 비교 조건</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              flex: "1",
              minWidth: "260px",
            }}
          >
            <p
              style={{
                color: "#6b7684",
                fontWeight: 700,
              }}
            >
              현재 계약
            </p>

            <h3>
              {contract.generation}세대 실손
            </h3>

            <p style={labelStyle}>
              보험사
            </p>

            <p style={valueStyle}>
              {contract.insurer}
            </p>

            <p style={labelStyle}>
              상품명
            </p>

            <p style={valueStyle}>
              {contract.productName}
            </p>

            <p style={labelStyle}>
              가입일
            </p>

            <p style={valueStyle}>
              {contract.inceptionDate}
            </p>

            <p style={labelStyle}>
              월 보험료
            </p>

            <p
              style={{
                ...valueStyle,
                fontSize: "22px",
              }}
            >
              {contract.monthlyPremium.toLocaleString()}
              원
            </p>

            <p style={labelStyle}>
              가입 특약
            </p>

            {contract.coverages.length ===
            0 ? (
              <p style={valueStyle}>
                없음
              </p>
            ) : (
              <ul>
                {contract.coverages.map(
                  (coverage) => (
                    <li key={coverage}>
                      {getCoverageLabel(
                        coverage
                      )}
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

          <div
            style={{
              ...cardStyle,
              flex: "1",
              minWidth: "260px",
              border: "2px solid #3182f6",
              background: "#f7faff",
            }}
          >
            <p
              style={{
                color: "#3182f6",
                fontWeight: 700,
              }}
            >
              비교 대상
            </p>

            <h3>5세대 실손</h3>

            <p style={labelStyle}>
              비교용 월 보험료
            </p>

            <p
              style={{
                ...valueStyle,
                fontSize: "22px",
              }}
            >
              {target5GMonthlyPremium ===
              null
                ? "입력되지 않음"
                : `${target5GMonthlyPremium.toLocaleString()}원`}
            </p>

            <p style={labelStyle}>
              비교 계약 특약
            </p>

            {target5GCoverages.length ===
            0 ? (
              <p style={valueStyle}>
                없음
              </p>
            ) : (
              <ul>
                {target5GCoverages.map(
                  (coverage) => (
                    <li key={coverage}>
                      {getCoverageLabel(
                        coverage
                      )}
                    </li>
                  )
                )}
              </ul>
            )}

            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                borderRadius: "10px",
                background: "#eaf3ff",
                color: "#1769d2",
                fontSize: "13px",
              }}
            >
              입력한 5세대 보험료는 비교용
              값이며 실제 전환 보험료를
              확정하지 않습니다.
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>예정 치료</h2>

        {usages.length === 0 ? (
          <div style={cardStyle}>
            <p>
              입력된 예정 치료가 없습니다.
            </p>
          </div>
        ) : (
          usages.map((usage, index) => {
            const totalCost =
              usage.frequency *
              usage.unitCost;

            return (
              <div
                key={usage.id}
                style={{
                  ...cardStyle,
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        marginBottom: "4px",
                        color: "#6b7684",
                        fontSize: "13px",
                      }}
                    >
                      예정 치료 {index + 1}
                    </p>

                    <h3
                      style={{
                        marginTop: 0,
                      }}
                    >
                      {usage.treatmentName}
                    </h3>
                  </div>

                  <strong
                    style={{
                      fontSize: "20px",
                    }}
                  >
                    {totalCost.toLocaleString()}
                    원
                  </strong>
                </div>

                <hr
                  style={{
                    margin: "16px 0",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <p style={labelStyle}>
                      이용 형태
                    </p>

                    <p style={valueStyle}>
                      {getCareSettingLabel(
                        usage.careSetting
                      )}
                    </p>
                  </div>

                  <div>
                    <p style={labelStyle}>
                      급여 여부
                    </p>

                    <p style={valueStyle}>
                      {getBenefitClassLabel(
                        usage.benefitClass
                      )}
                    </p>
                  </div>

                  <div>
                    <p style={labelStyle}>
                      중증 여부
                    </p>

                    <p style={valueStyle}>
                      {getSeverityClassLabel(
                        usage.severityClass
                      )}
                    </p>
                  </div>

                  <div>
                    <p style={labelStyle}>
                      예상 횟수
                    </p>

                    <p style={valueStyle}>
                      {usage.frequency}회
                    </p>
                  </div>

                  <div>
                    <p style={labelStyle}>
                      회당 비용
                    </p>

                    <p style={valueStyle}>
                      {usage.unitCost.toLocaleString()}
                      원
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section>
        <div
          style={{
            padding: "20px",
            borderRadius: "14px",
            background: "#f2f4f6",
          }}
        >
          <h2
            style={{
              marginBottom: "12px",
            }}
          >
            계산 기준
          </h2>

          <p>
            비교 대상:{" "}
            <strong>
              현재 계약 유지 vs 5세대 전환
            </strong>
          </p>

          <p>
            의료이용 시나리오:{" "}
            <strong>동일하게 유지</strong>
          </p>

          <p>
            계산 기간:{" "}
            <strong>1년</strong>
          </p>
        </div>
      </section>

      <section>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#fff8e6",
            color: "#795b00",
            fontSize: "14px",
          }}
        >
          본 서비스의 결과는 입력값과 MVP
          계산 룰에 따른 모의 결과이며 실제
          보험금 지급액을 확정하지 않습니다.
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "24px",
        }}
      >
        <button
          onClick={() =>
            navigate("/input")
          }
        >
          입력 수정
        </button>

        <button
          onClick={() =>
            navigate("/result")
          }
        >
          비교 결과 보기
        </button>
      </div>
    </main>
  );
}

export default M03ConfirmPage;