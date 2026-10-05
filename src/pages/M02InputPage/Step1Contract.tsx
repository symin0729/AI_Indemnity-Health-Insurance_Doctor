import { formatInceptionDateInput, generationForInceptionDate, inceptionDateForGeneration } from "../../domain/insuranceInputDefaults";
import { MASKED_INSURER, MASKED_PRODUCT_NAME, displayInsurer, displayProductName } from "../../domain/displayMask";
import { GEN3_RIDERS, type Gen3RiderKey } from "../../domain/gen3Riders";
import { GEN1_COMPANY_OPTIONS, GEN1_PRODUCT_LABEL, GEN1_UNREGISTERED_NOTE, gen1CompanyLabel, gen1CompanyProductName } from "../../domain/gen1Product";
import OptionDropdown from "../../components/OptionDropdown";
import type { CareSetting, ClaimCause, NationalHealthInsuranceStatus } from "../../domain/medical";
import type { InsuranceGeneration } from "../../domain/insurance";
import { SAMPLE_POLICY_OPTIONS } from "../../services/samplePolicyService";
import { type SamsungGen23Variant } from "../../store/useAnalysisStore";
import { formatWonInput, getWonInputValue, IsoDateInput } from "./M02Shared";
import type { M02Form } from "./useM02Form";

export default function Step1Contract({ form }: { form: M02Form }) {
  const {
    careSetting,
    changeCareSetting,
    claimCause,
    gen1ContractBasis,
    gen1CoveredRoomAndTreatment,
    gen1D1Coverage,
    gen1NonNhiInpatientTotal,
    gen1PolicyExclusionsCleared,
    gen1PriorPaidBenefit,
    gen1PriorServiceDays,
    gen1Product,
    gen1RoomDifference,
    gen23VariantItems,
    gen3Riders,
    gen4NonCoveredRider,
    gen5ContractType,
    gen5NonSevereRider,
    gen5SevereRider,
    generation,
    handleLoadSamplePolicy,
    handleResetAll,
    inceptionDate,
    insurer,
    insurerLabel,
    isGen1Placeholder,
    isGenerationPickerOpen,
    isSampleConfirmed,
    monthlyPremium,
    nationalHealthInsuranceStatus,
    productLabel,
    productName,
    reentryCycleYears,
    renewalCycleMonths,
    resetProductTypeSelections,
    sampleScenarioNotice,
    samsungGen23Variant,
    scenarioNoticeHasUsage,
    selectedSample,
    selectedSampleId,
    setClaimCause,
    setGen1ContractBasis,
    setGen1CoveredRoomAndTreatment,
    setGen1D1Coverage,
    setGen1NonNhiInpatientTotal,
    setGen1PolicyExclusionsCleared,
    setGen1PriorPaidBenefit,
    setGen1PriorServiceDays,
    setGen1Product,
    setGen1RoomDifference,
    setGen3Riders,
    setGen4NonCoveredRider,
    setGen5ContractType,
    setGen5NonSevereRider,
    setGen5SevereRider,
    setGeneration,
    setInceptionDate,
    setInsurer,
    setInsurerLabel,
    setIsGenerationPickerOpen,
    setIsSampleConfirmed,
    setMonthlyPremium,
    setNationalHealthInsuranceStatus,
    setProductLabel,
    setProductName,
    setReentryCycleYears,
    setRenewalCycleMonths,
    setSamsungGen23Variant,
    setSelectedSampleId,
    setUnitCost,
    unitCost,
  } = form;

  return (
    <section id="input-step-1" tabIndex={-1} className="form-card">
        <span className="step-badge">
          STEP 1
        </span>

        <h2 className="card-title">
          현재 계약
        </h2>

        <p className="card-description">
          직접 입력하거나 시연용 샘플 보험증권을 불러와
          계약 정보를 자동으로 채울 수 있습니다.
        </p>

        <div className="html-sample-actions">
          <button
            type="button"
            className="sample-button"
            onClick={() => handleLoadSamplePolicy("NON_COVERED")}
          >
            샘플 불러오기
          </button>
          <button
            type="button"
            className="sample-button"
            onClick={handleResetAll}
          >
            초기화
          </button>
          {selectedSampleId && (
            <span className="status-badge success" role="status">
              샘플 입력 완료
            </span>
          )}
        </div>
        <p className="sample-note">
          MVP에서는 사전에 검증한 샘플 정보를 사용할 수 있습니다.
          샘플을 불러온 경우 계산 전 사용자가 내용을 확인합니다.
        </p>

        <div
          className="legacy-sample-picker"
          style={{
            marginBottom: "26px",
            padding: "20px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary-050)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <div>
              <p
                className="amount-label"
                style={{ marginBottom: "4px" }}
              >
                빠른 시작
              </p>

              <h3 style={{ marginBottom: "6px" }}>
                샘플 보험증권 불러오기
              </h3>

              <p
                className="treatment-meta"
                style={{ marginBottom: 0 }}
              >
                샘플을 선택하면 계약 정보와 예정 치료가 자동으로 채워집니다.
                불러온 뒤 직접 수정할 수도 있습니다.
              </p>
            </div>

            <span className="rule-info">
              공모전 시연용
            </span>
          </div>

          <div className="card-grid">
            {SAMPLE_POLICY_OPTIONS.map(
              (option) => {
                const isSelected =
                  selectedSampleId ===
                  option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      handleLoadSamplePolicy(
                        option.id
                      )
                    }
                    aria-pressed={isSelected}
                    style={{
                      width: "100%",
                      minHeight: "108px",
                      padding: "16px",
                      border:
                        isSelected
                          ? "2px solid var(--color-primary-700)"
                          : "1px solid var(--color-border)",
                      borderRadius:
                        "var(--radius-sm)",
                      background:
                        isSelected
                          ? "#ffffff"
                          : "var(--color-surface)",
                      color:
                        "var(--color-text)",
                      textAlign: "left",
                      boxShadow:
                        isSelected
                          ? "0 8px 20px rgba(29, 86, 143, 0.10)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        marginBottom: "7px",
                        color:
                          isSelected
                            ? "var(--color-primary-700)"
                            : "var(--color-text)",
                        fontWeight: 900,
                        fontSize: "1rem",
                      }}
                    >
                      {option.label}
                    </span>

                    <span
                      style={{
                        display: "block",
                        color:
                          "var(--color-text-sub)",
                        fontSize: "0.84rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {selectedSample && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius:
                  "var(--radius-sm)",
                background: "#ffffff",
                border:
                  "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <strong>
                  {selectedSample.label} 샘플을 불러왔습니다
                </strong>

                <span className="status-badge success">
                  자동 입력 완료
                </span>
              </div>

              {sampleScenarioNotice && (
                <p
                  className="treatment-meta"
                  style={{
                    margin: "0 0 12px",
                  }}
                >
                  {sampleScenarioNotice}
                </p>
              )}

              {scenarioNoticeHasUsage && (
                <div
                  className="notice-box"
                  style={{
                    marginBottom: "12px",
                  }}
                >
                  샘플에 필요한 계산 가정도 STEP 4에 자동 반영했습니다.
                  계산 전 직접 확인하거나 해제할 수 있습니다.
                </div>
              )}

              <label
                style={{
                  marginBottom: 0,
                  paddingTop: "12px",
                  borderTop:
                    "1px solid var(--color-border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    isSampleConfirmed
                  }
                  onChange={(e) =>
                    setIsSampleConfirmed(
                      e.target.checked
                    )
                  }
                />{" "}
                불러온 계약 정보와 예정 치료를 직접 확인했습니다.
              </label>
            </div>
          )}
        </div>

        <div className="form-grid">
          <label>
            보험사
          <input
            type="text"
            value={generation === 1 ? displayInsurer({ generation, gen1Product }, insurer) : insurerLabel}
            readOnly={isGen1Placeholder}
            onChange={(e) => {
              setSelectedSampleId(null);
              if (generation === 1) setInsurer(e.target.value);
              else setInsurerLabel(e.target.value);
            }}
            placeholder={generation === 1 ? "예: OO손해보험" : MASKED_INSURER}
          />
        </label>

        <label>
          상품명
          <input
            type="text"
            value={generation === 1 ? displayProductName({ generation, gen1Product }, productName) : productLabel}
            readOnly={isGen1Placeholder}
            onChange={(e) => {
              setSelectedSampleId(null);
              if (generation === 1) setProductName(e.target.value);
              else setProductLabel(e.target.value);
            }}
            placeholder={generation === 1 ? "보험 상품명" : MASKED_PRODUCT_NAME}
          />
        </label>

        <label>
          실손 세대
          <select
            value={isGenerationPickerOpen ? "" : generation}
            onMouseDown={() => setIsGenerationPickerOpen(true)}
            onTouchStart={() => setIsGenerationPickerOpen(true)}
            onBlur={() => setIsGenerationPickerOpen(false)}
            onChange={(e) => {
              setIsGenerationPickerOpen(false);
              const selectedGeneration = Number(e.target.value) as Exclude<InsuranceGeneration, 5>;
              // 같은 세대를 다시 선택해도 보험사·상품명·상품 종형·가입일을 초기 상태로 되돌린다.
              resetProductTypeSelections();
              setSelectedSampleId(null);
              setInsurer("");
              setProductName("");
              setInsurerLabel("");
              setProductLabel("");
              setGeneration(selectedGeneration);
              setInceptionDate(inceptionDateForGeneration(selectedGeneration));
            }}
          >
            <option value="" disabled hidden></option>
            <option value={1}>1세대</option>
            <option value={2}>2세대</option>
            <option value={3}>3세대</option>
            <option value={4}>4세대</option>
          </select>
        </label>

        <label>
          가입일
          <IsoDateInput
            value={inceptionDate}
            onChange={(value) => {
              const formattedValue = formatInceptionDateInput(value);
              resetProductTypeSelections();
              setInceptionDate(formattedValue);
              const detected = generationForInceptionDate(formattedValue);
              if (detected !== undefined) setGeneration(detected);
            }}
            placeholder="YYYY-MM-DD (예: 2018-03-01)"
          />
        </label>
        {generation === 2 ||
        generation === 3 ? (
          <div className="select-like-field">
            <span id="samsung-gen23-variant-title">
              상품 종형 <span className="required-mark">필수</span>
            </span>
            <OptionDropdown
              id="samsung-gen23-variant"
              value={samsungGen23Variant}
              placeholder="필수 선택"
              invalid={samsungGen23Variant === "UNKNOWN"}
              onChange={(next) => setSamsungGen23Variant(next as SamsungGen23Variant)}
              options={gen23VariantItems}
            />
          </div>
        ) : null}


        {generation === 1 ? (
          <label>
            상품 종형 <span className="required-mark">필수</span>
            <select
              id="samsung-gen1-product"
              value={gen1Product}
              required
              aria-required="true"
              aria-invalid={gen1Product === "UNKNOWN"}
              onChange={(event) => {
                const value = event.target.value as typeof gen1Product;
                setGen1Product(value);
                if (value === "SAMSUNG_0904_2") {
                  setInsurer("삼성화재");
                  setProductName("삼성 올라이프 100세 건강파트너보험(0904.2)");
                } else {
                  const company = gen1CompanyLabel(value);
                  if (company) {
                    setInsurer(company);
                    setProductName(gen1CompanyProductName(company));
                  }
                }
              }}
            >
              <option value="UNKNOWN" disabled hidden>필수 선택</option>
              <option value="SAMSUNG_0904_2">1. {GEN1_PRODUCT_LABEL} ✓</option>
              {GEN1_COMPANY_OPTIONS.map((option, index) => (
                <option key={option.value} value={option.value}>{index + 2}. {option.label} ({GEN1_UNREGISTERED_NOTE})</option>
              ))}
            </select>
          </label>
        ) : null}

        {generation === 4 ? (
          <div className="select-like-field">
            <span id="gen4-rider-title">
              특약 가입 여부 <span className="optional-mark">선택</span>
            </span>
            <label className="no-treatment-option">
              <input
                type="checkbox"
                checked={gen4NonCoveredRider === "ENROLLED"}
                onChange={(event) => setGen4NonCoveredRider(event.target.checked ? "ENROLLED" : "NOT_ENROLLED")}
              />
              <span><strong>비급여 특약</strong></span>
            </label>
            <small className="sample-note">급여 주계약은 필수 가입으로 자동 포함</small>
          </div>
        ) : null}

        <label>
          현재 월 보험료
          <span className="input-unit-row"><input
            type="text"
            inputMode="numeric"
            value={
              formatWonInput(monthlyPremium)
            }
            onChange={(e) =>
              setMonthlyPremium(
                getWonInputValue(e.target.value)
              )
            }
            placeholder="예: 60,000"
          /><span className="input-unit-label">원</span></span>
        </label>

        {generation === 3 ? (
          <div className="select-like-field rider-row">
            <span id="gen3-rider-title">
              특약 가입 여부 <span className="optional-mark">선택</span>
              <small className="sample-note rider-row__hint">가입한 특약만 체크. 체크하지 않은 특약은 미가입으로 계산.</small>
            </span>
            <div className="rider-row__boxes" role="group" aria-labelledby="gen3-rider-title">
              {GEN3_RIDERS.map(({ key, label }) => (
                <label key={key} className="no-treatment-option">
                  <input
                    type="checkbox"
                    checked={gen3Riders[key] === "ENROLLED"}
                    onChange={(event) => setGen3Riders((previous) => ({ ...previous, [key as Gen3RiderKey]: event.target.checked ? "ENROLLED" : "NOT_ENROLLED" }))}
                  />
                  <span><strong>{label}</strong></span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

          <label>
            갱신 주기
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={
                renewalCycleMonths
              }
              onChange={(e) =>
                setRenewalCycleMonths(
                  e.target.value
                )
              }
              placeholder="모르면 비워두기"
            /><span className="input-unit-label">개월</span></span>
          </label>

          <label>
            재가입 주기 (년)
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={
                reentryCycleYears
              }
              onChange={(e) =>
                setReentryCycleYears(
                  e.target.value
                )
              }
              placeholder="모르면 비워두기"
            /><span className="input-unit-label">년</span></span>
          </label>
        </div>

        {generation === 1 && (
          <fieldset className="form-card" style={{ marginTop: "16px" }}>
            <legend>1세대 계약 확인</legend>
            <p className="card-description">보험증권을 기준으로 상품과 D1 담보를 선택해주세요.</p>

            {gen1Product === "SAMSUNG_0904_2" && (
              <>
                <fieldset className="nested-fieldset">
                  <legend>보험증권에 표시된 담보</legend>
                  {([
                    ["INJURY", "상해 입·통원의료비(D1)"],
                    ["DISEASE", "질병 입·통원의료비(D1)"],
                    ["BOTH", "두 담보 모두"],
                    ["UNKNOWN", "확인할 수 없음"],
                  ] as const).map(([value, label]) => (
                    <label key={value} style={{ marginRight: "16px" }}>
                      <input type="radio" name="gen1-d1" checked={gen1D1Coverage === value} onChange={() => setGen1D1Coverage(value)} /> {label}
                    </label>
                  ))}
                </fieldset>

                <div className="gen1-conditional-inputs">
                  <h3>0904.2 D1 계산 조건</h3>
                  <div className="form-grid">
                    <label>질병 / 상해<select value={claimCause} onChange={(event) => setClaimCause(event.target.value as ClaimCause)}><option value="UNKNOWN">확인할 수 없음</option><option value="INJURY">상해</option><option value="DISEASE">질병</option></select></label>
                    <label>입원 / 통원<select value={careSetting} onChange={(event) => changeCareSetting(event.target.value as CareSetting)}><option value="INPATIENT">입원</option><option value="OUTPATIENT">통원</option></select></label>
                    <label>이번 진료의 국민건강보험 적용 여부<select value={nationalHealthInsuranceStatus} onChange={(event) => setNationalHealthInsuranceStatus(event.target.value as NationalHealthInsuranceStatus)}><option value="UNKNOWN">확인할 수 없음</option><option value="APPLIED">적용됨</option><option value="NOT_APPLIED">적용되지 않음</option><option value="PARTIAL">일부 적용</option></select></label>
                  </div>
                  {nationalHealthInsuranceStatus === "PARTIAL" && <div className="notice-box warning">일부 적용 조합은 RULE_NOT_VERIFIED로 처리됩니다.</div>}
                  {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "APPLIED" && <div className="form-grid">
                    <label>실제 부담액<input type="text" inputMode="numeric" value={formatWonInput(gen1CoveredRoomAndTreatment)} onChange={(event) => setGen1CoveredRoomAndTreatment(getWonInputValue(event.target.value))} />원</label>
                    <label>병실료 차액<input type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={(event) => setGen1RoomDifference(getWonInputValue(event.target.value))} placeholder="없으면 0" />원</label>
                  </div>}
                  {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "NOT_APPLIED" && <label>입원의료비 총액<input type="text" inputMode="numeric" value={formatWonInput(gen1NonNhiInpatientTotal)} onChange={(event) => setGen1NonNhiInpatientTotal(getWonInputValue(event.target.value))} />원</label>}
                  {careSetting === "OUTPATIENT" && (nationalHealthInsuranceStatus === "APPLIED" || nationalHealthInsuranceStatus === "NOT_APPLIED") && <label>통원의료비<input type="text" inputMode="numeric" value={formatWonInput(unitCost)} onChange={(event) => setUnitCost(getWonInputValue(event.target.value))} />원</label>}
                  <div className="form-grid">
                    <label>이전 지급액<input type="text" inputMode="numeric" value={formatWonInput(gen1PriorPaidBenefit)} onChange={(event) => setGen1PriorPaidBenefit(getWonInputValue(event.target.value))} />원</label>
                    {careSetting === "OUTPATIENT" && <label>이전 이용일수<input type="number" min="0" step="1" value={gen1PriorServiceDays} onChange={(event) => setGen1PriorServiceDays(event.target.value)} />일</label>}
                  </div>
                  <label className="no-treatment-option"><input type="checkbox" checked={gen1PolicyExclusionsCleared} onChange={(event) => setGen1PolicyExclusionsCleared(event.target.checked)} /><span><strong>보상하지 않는 사항에 해당하지 않음을 확인했습니다.</strong></span></label>
                </div>

                <fieldset className="nested-fieldset">
                  <legend>계산 기준</legend>
                  <label style={{ marginRight: "16px" }}><input type="radio" name="gen1-basis" checked={gen1ContractBasis === "SAMPLE_SIMULATION"} onChange={() => setGen1ContractBasis("SAMPLE_SIMULATION")} /> 대표 상품 샘플 시뮬레이션</label>
                  <label><input type="radio" name="gen1-basis" checked={gen1ContractBasis === "ACTUAL_CONTRACT"} onChange={() => setGen1ContractBasis("ACTUAL_CONTRACT")} /> 실제 가입 계약</label>
                </fieldset>

                <div className="notice-box">
                  {gen1ContractBasis === "SAMPLE_SIMULATION"
                    ? "SAMPLE_SIMULATION · 대표 상품을 가정한 계산 예시입니다."
                    : "ACTUAL_CONTRACT · 독립검수 전이므로 현재 실제 계약 계산은 RULE_NOT_VERIFIED로 표시됩니다."}
                </div>
              </>
            )}
          </fieldset>
        )}

        {generation === 5 && (
          <fieldset className="form-card" style={{ marginTop: "16px" }}>
            <legend>5세대 현재 계약 구성</legend>
            <p>급여 기본계약: 가입 확인됨</p>
            <label>계약 유형{" "}
              <select value={gen5ContractType} onChange={(event) => setGen5ContractType(event.target.value as "GENERAL" | "CONVERSION")}>
                <option value="GENERAL">일반형</option><option value="CONVERSION">계약전환형</option>
              </select>
            </label>
            <p>특약1: 중증 비급여</p>
            {(["ENROLLED", "NOT_ENROLLED", "UNKNOWN"] as const).map((value) => (
              <label key={`severe-${value}`} style={{ marginRight: "16px" }}><input type="radio" name="gen5-severe" checked={gen5SevereRider === value} onChange={() => setGen5SevereRider(value)} /> {value === "ENROLLED" ? "가입함" : value === "NOT_ENROLLED" ? "가입하지 않음" : "확인할 수 없음"}</label>
            ))}
            <p>특약2: 비중증 비급여</p>
            {(["ENROLLED", "NOT_ENROLLED", "UNKNOWN"] as const).map((value) => (
              <label key={`non-severe-${value}`} style={{ marginRight: "16px" }}><input type="radio" name="gen5-non-severe" checked={gen5NonSevereRider === value} onChange={() => setGen5NonSevereRider(value)} /> {value === "ENROLLED" ? "가입함" : value === "NOT_ENROLLED" ? "가입하지 않음" : "확인할 수 없음"}</label>
            ))}
          </fieldset>
        )}
      </section>
  );
}
