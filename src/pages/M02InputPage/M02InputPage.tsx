import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type {
  BenefitClass,
  CareSetting,
  MedicalUsage,
  SeverityClass,
} from "../../domain/medical";

import type { InsuranceGeneration } from "../../domain/insurance";
import { useAnalysisStore } from "../../store/useAnalysisStore";

function M02InputPage() {
  const navigate = useNavigate();

  const setContract = useAnalysisStore(
    (state) => state.setContract
  );

  const setTarget5GMonthlyPremium = useAnalysisStore(
    (state) => state.setTarget5GMonthlyPremium
  );

  const setTarget5GCoverages = useAnalysisStore(
    (state) => state.setTarget5GCoverages
  );

  const setUsages = useAnalysisStore(
    (state) => state.setUsages
  );

  // 현재 보험
  const [insurer, setInsurer] = useState("");
  const [productName, setProductName] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");

  const [generation, setGeneration] =
    useState<InsuranceGeneration>(3);

  const [monthlyPremium, setMonthlyPremium] =
    useState("");

  const [
    hasCurrentSpecialRider2,
    setHasCurrentSpecialRider2,
  ] = useState(false);

  // 5세대 비교
  const [
    target5GMonthlyPremium,
    setTarget5GMonthlyPremiumInput,
  ] = useState("");

  const [
    hasTarget5GSpecialRider2,
    setHasTarget5GSpecialRider2,
  ] = useState(false);

  // 치료 입력
  const [treatmentName, setTreatmentName] =
    useState("");

  const [careSetting, setCareSetting] =
    useState<CareSetting>("OUTPATIENT");

  const [benefitClass, setBenefitClass] =
    useState<BenefitClass>("UNKNOWN");

  const [severityClass, setSeverityClass] =
    useState<SeverityClass>("UNKNOWN");

  const [frequency, setFrequency] =
    useState("1");

  const [unitCost, setUnitCost] =
    useState("");

  const [plannedUsages, setPlannedUsages] =
    useState<MedicalUsage[]>([]);

  const [errorMessage, setErrorMessage] =
    useState("");

  const createCurrentUsage = () => {
    const frequencyNumber =
      Number(frequency);

    const unitCostNumber =
      Number(unitCost);

    if (!treatmentName.trim()) {
      setErrorMessage(
        "예정 치료명을 입력해주세요."
      );

      return null;
    }

    if (
      !Number.isInteger(frequencyNumber) ||
      frequencyNumber < 1
    ) {
      setErrorMessage(
        "예상 치료 횟수는 1회 이상 입력해주세요."
      );

      return null;
    }

    if (
      !unitCost ||
      unitCostNumber <= 0
    ) {
      setErrorMessage(
        "회당 치료비를 올바르게 입력해주세요."
      );

      return null;
    }

    const usage: MedicalUsage = {
      id: crypto.randomUUID(),
      treatmentName:
        treatmentName.trim(),
      careSetting,
      benefitClass,
      severityClass,
      frequency: frequencyNumber,
      unitCost: unitCostNumber,
    };

    return usage;
  };

  const handleAddTreatment = () => {
    setErrorMessage("");

    const usage =
      createCurrentUsage();

    if (!usage) {
      return;
    }

    setPlannedUsages((prev) => [
      ...prev,
      usage,
    ]);

    setTreatmentName("");
    setCareSetting("OUTPATIENT");
    setBenefitClass("UNKNOWN");
    setSeverityClass("UNKNOWN");
    setFrequency("1");
    setUnitCost("");
  };

  const handleRemoveTreatment = (
    id: string
  ) => {
    setPlannedUsages((prev) =>
      prev.filter(
        (usage) => usage.id !== id
      )
    );
  };

  const handleNext = () => {
    setErrorMessage("");

    const currentPremiumNumber =
      Number(monthlyPremium);

    const targetPremiumNumber =
      Number(target5GMonthlyPremium);

    if (!insurer.trim()) {
      setErrorMessage(
        "보험사를 입력해주세요."
      );
      return;
    }

    if (!productName.trim()) {
      setErrorMessage(
        "보험 상품명을 입력해주세요."
      );
      return;
    }

    if (!inceptionDate) {
      setErrorMessage(
        "보험 가입일을 입력해주세요."
      );
      return;
    }

    if (
      !monthlyPremium ||
      currentPremiumNumber <= 0
    ) {
      setErrorMessage(
        "현재 월 보험료를 올바르게 입력해주세요."
      );
      return;
    }

    if (
      !target5GMonthlyPremium ||
      targetPremiumNumber <= 0
    ) {
      setErrorMessage(
        "비교용 5세대 월 보험료를 올바르게 입력해주세요."
      );
      return;
    }

    let finalUsages = [
      ...plannedUsages,
    ];

    if (
      treatmentName.trim() ||
      unitCost
    ) {
      const currentUsage =
        createCurrentUsage();

      if (!currentUsage) {
        return;
      }

      finalUsages = [
        ...finalUsages,
        currentUsage,
      ];
    }

    if (finalUsages.length === 0) {
      setErrorMessage(
        "예정 치료를 1개 이상 입력해주세요."
      );
      return;
    }

    const currentCoverages: string[] =
      [];

    if (hasCurrentSpecialRider2) {
      currentCoverages.push(
        "SPECIAL_RIDER_2"
      );
    }

    const target5GCoverages: string[] =
      [];

    if (hasTarget5GSpecialRider2) {
      target5GCoverages.push(
        "SPECIAL_RIDER_2"
      );
    }

    setContract({
      insurer: insurer.trim(),
      productName:
        productName.trim(),
      inceptionDate,
      generation,
      monthlyPremium:
        currentPremiumNumber,
      coverages:
        currentCoverages,
    });

    setTarget5GMonthlyPremium(
      targetPremiumNumber
    );

    setTarget5GCoverages(
      target5GCoverages
    );

    setUsages(finalUsages);

    navigate("/confirm");
  };

  const sectionCardStyle = {
    marginBottom: "20px",
    padding: "24px",
    border: "1px solid #e5e8eb",
    borderRadius: "16px",
    background: "#ffffff",
  };

  const sectionHeaderStyle = {
    marginBottom: "20px",
  };

  const descriptionStyle = {
    marginTop: "4px",
    color: "#6b7684",
    fontSize: "14px",
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
            fontWeight: 800,
          }}
        >
          AI 실손 닥터
        </p>

        <h1>내 보험 정보</h1>

        <p
          style={{
            color: "#6b7684",
          }}
        >
          현재 보험과 예정된 의료이용 정보를
          입력해주세요.
        </p>
      </div>

      {errorMessage && (
        <p role="alert">
          {errorMessage}
        </p>
      )}

      <section style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <p
            style={{
              marginBottom: "4px",
              color: "#6b7684",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            STEP 1
          </p>

          <h2
            style={{
              marginBottom: "4px",
            }}
          >
            현재 계약
          </h2>

          <p style={descriptionStyle}>
            현재 유지 중인 실손보험 정보를
            입력합니다.
          </p>
        </div>

        <label>
          보험사
          <input
            type="text"
            value={insurer}
            onChange={(e) =>
              setInsurer(
                e.target.value
              )
            }
            placeholder="예: OO손해보험"
          />
        </label>

        <label>
          상품명
          <input
            type="text"
            value={productName}
            onChange={(e) =>
              setProductName(
                e.target.value
              )
            }
            placeholder="보험 상품명"
          />
        </label>

        <label>
          가입일
          <input
            type="date"
            value={inceptionDate}
            onChange={(e) =>
              setInceptionDate(
                e.target.value
              )
            }
          />
        </label>

        <label>
          실손 세대
          <select
            value={generation}
            onChange={(e) =>
              setGeneration(
                Number(
                  e.target.value
                ) as InsuranceGeneration
              )
            }
          >
            <option value={1}>
              1세대
            </option>

            <option value={2}>
              2세대
            </option>

            <option value={3}>
              3세대
            </option>

            <option value={4}>
              4세대
            </option>

            <option value={5}>
              5세대
            </option>
          </select>
        </label>

        <label>
          현재 월 보험료
          <input
            type="number"
            min="0"
            value={monthlyPremium}
            onChange={(e) =>
              setMonthlyPremium(
                e.target.value
              )
            }
            placeholder="예: 60000"
          />
          원
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={
              hasCurrentSpecialRider2
            }
            onChange={(e) =>
              setHasCurrentSpecialRider2(
                e.target.checked
              )
            }
          />

          현재 계약 비급여 특약2 가입
        </label>
      </section>

      <section
        style={{
          ...sectionCardStyle,
          border: "2px solid #3182f6",
          background: "#f7faff",
        }}
      >
        <div style={sectionHeaderStyle}>
          <p
            style={{
              marginBottom: "4px",
              color: "#3182f6",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            STEP 2
          </p>

          <h2
            style={{
              marginBottom: "4px",
            }}
          >
            5세대 전환 비교
          </h2>

          <p style={descriptionStyle}>
            5세대로 전환한다고 가정했을 때의
            비교 조건을 입력합니다.
          </p>
        </div>

        <label>
          비교용 5세대 월 보험료
          <input
            type="number"
            min="0"
            value={
              target5GMonthlyPremium
            }
            onChange={(e) =>
              setTarget5GMonthlyPremiumInput(
                e.target.value
              )
            }
            placeholder="예: 35000"
          />
          원
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={
              hasTarget5GSpecialRider2
            }
            onChange={(e) =>
              setHasTarget5GSpecialRider2(
                e.target.checked
              )
            }
          />

          5세대 비급여 특약2 가입
        </label>

        <div
          style={{
            marginTop: "20px",
            padding: "14px",
            borderRadius: "10px",
            background: "#eaf3ff",
            color: "#1769d2",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          비교용 보험료는 사용자가 입력한
          가정값이며 실제 5세대 전환 보험료를
          확정하지 않습니다.
        </div>
      </section>

      <section style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <p
            style={{
              marginBottom: "4px",
              color: "#6b7684",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            STEP 3
          </p>

          <h2
            style={{
              marginBottom: "4px",
            }}
          >
            예정 치료
          </h2>

          <p style={descriptionStyle}>
            앞으로 예상되는 의료이용을
            입력해주세요. 여러 개의 치료를
            추가할 수 있습니다.
          </p>
        </div>

        <label>
          치료명
          <input
            type="text"
            value={treatmentName}
            onChange={(e) =>
              setTreatmentName(
                e.target.value
              )
            }
            placeholder="예: MRI"
          />
        </label>

        <label>
          입원 / 통원
          <select
            value={careSetting}
            onChange={(e) =>
              setCareSetting(
                e.target
                  .value as CareSetting
              )
            }
          >
            <option value="OUTPATIENT">
              통원
            </option>

            <option value="INPATIENT">
              입원
            </option>
          </select>
        </label>

        <label>
          급여 여부
          <select
            value={benefitClass}
            onChange={(e) =>
              setBenefitClass(
                e.target
                  .value as BenefitClass
              )
            }
          >
            <option value="UNKNOWN">
              모름
            </option>

            <option value="COVERED">
              급여
            </option>

            <option value="NON_COVERED">
              비급여
            </option>
          </select>
        </label>

        <label>
          중증 여부
          <select
            value={severityClass}
            onChange={(e) =>
              setSeverityClass(
                e.target
                  .value as SeverityClass
              )
            }
          >
            <option value="UNKNOWN">
              모름
            </option>

            <option value="SEVERE">
              중증
            </option>

            <option value="NON_SEVERE">
              비중증
            </option>
          </select>
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
          }}
        >
          <label>
            예상 횟수
            <input
              type="number"
              min="1"
              step="1"
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value
                )
              }
            />
            회
          </label>

          <label>
            회당 비용
            <input
              type="number"
              min="0"
              value={unitCost}
              onChange={(e) =>
                setUnitCost(
                  e.target.value
                )
              }
              placeholder="예: 400000"
            />
            원
          </label>
        </div>

        <button
          type="button"
          onClick={
            handleAddTreatment
          }
          style={{
            width: "100%",
            marginTop: "8px",
          }}
        >
          + 치료 추가
        </button>

        {plannedUsages.length > 0 && (
          <div
            style={{
              marginTop: "28px",
            }}
          >
            <h3>추가된 치료</h3>

            {plannedUsages.map(
              (usage, index) => (
                <div
                  key={usage.id}
                  style={{
                    marginTop: "12px",
                    padding: "18px",
                    border:
                      "1px solid #e5e8eb",
                    borderRadius: "12px",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
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
                        치료 {index + 1}
                      </p>

                      <strong>
                        {usage.treatmentName}
                      </strong>
                    </div>

                    <strong>
                      {(
                        usage.frequency *
                        usage.unitCost
                      ).toLocaleString()}
                      원
                    </strong>
                  </div>

                  <p
                    style={{
                      color: "#6b7684",
                      fontSize: "14px",
                    }}
                  >
                    {usage.frequency}회 ×{" "}
                    {usage.unitCost.toLocaleString()}
                    원
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveTreatment(
                        usage.id
                      )
                    }
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    삭제
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "24px",
        }}
      >
        <button
          onClick={() => navigate("/")}
        >
          이전
        </button>

        <button
          onClick={handleNext}
          style={{
            flex: 1,
          }}
        >
          입력 정보 확인하기
        </button>
      </div>
    </main>
  );
}

export default M02InputPage;