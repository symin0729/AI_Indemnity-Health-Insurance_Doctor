import { useNavigate } from "react-router-dom";

function M01StartPage() {
  const navigate = useNavigate();

  return (
    <main>
      <section
        style={{
          paddingTop: "20px",
          paddingBottom: "32px",
        }}
      >
        <p
          style={{
            marginBottom: "8px",
            color: "#3182f6",
            fontWeight: 800,
          }}
        >
          AI 실손 닥터
        </p>

        <h1
          style={{
            marginBottom: "16px",
            fontSize: "36px",
            lineHeight: 1.35,
          }}
        >
          지금 실손보험,
          <br />
          5세대로 바꾸면
          <br />
          얼마나 달라질까요?
        </h1>

        <p
          style={{
            maxWidth: "560px",
            color: "#6b7684",
            fontSize: "17px",
            lineHeight: 1.7,
          }}
        >
          현재 보험료와 예정 치료 정보를
          입력하면 현재 계약 유지와 5세대
          전환 시 예상되는 1년 부담을
          비교해드립니다.
        </p>
      </section>

      <section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            style={{
              padding: "20px",
              border: "1px solid #e5e8eb",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                fontSize: "26px",
              }}
            >
              ①
            </div>

            <h3>내 보험 입력</h3>

            <p
              style={{
                color: "#6b7684",
                fontSize: "14px",
              }}
            >
              현재 실손 세대와 월 보험료,
              가입 특약을 입력합니다.
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              border: "1px solid #e5e8eb",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                fontSize: "26px",
              }}
            >
              ②
            </div>

            <h3>치료 계획 입력</h3>

            <p
              style={{
                color: "#6b7684",
                fontSize: "14px",
              }}
            >
              MRI, 도수치료 등 예정된
              의료이용 조건을 입력합니다.
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              border: "1px solid #e5e8eb",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                fontSize: "26px",
              }}
            >
              ③
            </div>

            <h3>1년 부담 비교</h3>

            <p
              style={{
                color: "#6b7684",
                fontSize: "14px",
              }}
            >
              보험료와 예상 자기부담금을
              합산해 두 선택지를 비교합니다.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            padding: "20px",
            borderRadius: "16px",
            background: "#f7faff",
            border: "1px solid #dcecff",
          }}
        >
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "18px",
            }}
          >
            비교 결과에서 확인할 수 있어요
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <p
                style={{
                  marginBottom: "2px",
                  color: "#6b7684",
                  fontSize: "13px",
                }}
              >
                현재 계약
              </p>

              <strong>
                연 보험료
              </strong>
            </div>

            <div>
              <p
                style={{
                  marginBottom: "2px",
                  color: "#6b7684",
                  fontSize: "13px",
                }}
              >
                의료 이용
              </p>

              <strong>
                예상 자기부담금
              </strong>
            </div>

            <div>
              <p
                style={{
                  marginBottom: "2px",
                  color: "#6b7684",
                  fontSize: "13px",
                }}
              >
                최종 비교
              </p>

              <strong>
                1년 예상 총 부담
              </strong>
            </div>
          </div>
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
            lineHeight: 1.6,
          }}
        >
          본 서비스는 입력값과 MVP 계산
          룰을 활용한 모의 비교 서비스입니다.
          실제 보험금 지급액이나 보험상품
          전환 조건을 확정하지 않습니다.
        </div>
      </section>

      <button
        onClick={() => navigate("/input")}
        style={{
          width: "100%",
          minHeight: "54px",
          marginTop: "8px",
          fontSize: "17px",
        }}
      >
        내 보험 비교 시작하기
      </button>
    </main>
  );
}

export default M01StartPage;