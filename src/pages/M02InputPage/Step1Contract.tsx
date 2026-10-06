import { MASKED_INSURER, MASKED_PRODUCT_NAME } from "../../domain/displayMask";
import { GEN3_RIDERS, type Gen3RiderKey } from "../../domain/gen3Riders";
import { GEN1_COMPANY_OPTIONS, gen1CoverageChecks, gen1CoverageFromChecks, GEN1_PRODUCT_INSURER_DISPLAY, GEN1_PRODUCT_LABEL, GEN1_PRODUCT_NAME_DISPLAY, GEN1_UNREGISTERED_NOTE, gen1CompanyLabel, gen1CompanyProductName } from "../../domain/gen1Product";
import OptionDropdown from "../../components/OptionDropdown";
import { generationSelectedPatch, inceptionDateTypedPatch } from "./contractTransitions";
import type { InsuranceGeneration } from "../../domain/insurance";
import { SAMPLE_POLICY_OPTIONS } from "../../services/samplePolicyService";
import { type SamsungGen23Variant } from "../../store/useAnalysisStore";
import { formatWonInput, getWonInputValue, IsoDateInput } from "./M02Shared";
import type { M02Form } from "./useM02Form";
import Step1ContractDetails from "./Step1ContractDetails";

export default function Step1Contract({ form }: { form: M02Form }) {
  const {
    gen1D1Coverage,
    gen1Product,
    gen23VariantItems,
    gen3Riders,
    gen4NonCoveredRider,
    generation: formGeneration,
    isGenerationSelected,
    handleLoadSamplePolicy,
    handleResetAll,
    inceptionDate,
    insurerLabel,
    isGen1Placeholder,
    isGenerationPickerOpen,
    isSampleConfirmed,
    monthlyPremium,
    productLabel,
    reentryCycleYears,
    renewalCycleMonths,
    applyContractPatch,
    samsungGen23Variant,
    selectedSample,
    selectedSampleId,
    setGen1D1Coverage,
    setGen1Product,
    setGen3Riders,
    setGen4NonCoveredRider,
    setInsurerLabel,
    setIsGenerationPickerOpen,
    setIsSampleConfirmed,
    setMonthlyPremium,
    setProductLabel,
    setReentryCycleYears,
    setRenewalCycleMonths,
    setSamsungGen23Variant,
    setSelectedSampleId,
  } = form;

  // 실손 세대를 고르기 전(0)에는 세대별 입력 항목을 보여주지 않는다.
  const generation = isGenerationSelected ? formGeneration : 0;

  return (
    <>
    <section id="input-step-1" tabIndex={-1} className="form-card">
        <span className="step-badge">
          STEP 1-1 · 고객 정보
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
                샘플을 선택하면 현재 계약 정보가 자동으로 채워집니다.
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
                불러온 계약 정보를 직접 확인했습니다.
              </label>
            </div>
          )}
        </div>

        <div className="form-grid">
          <label>
            보험사
          <input
            type="text"
            value={insurerLabel}
            onChange={(e) => {
              setSelectedSampleId(null);
              setInsurerLabel(e.target.value);
            }}
            placeholder={generation === 1 ? (isGen1Placeholder ? GEN1_PRODUCT_INSURER_DISPLAY : "예: OO손해보험") : MASKED_INSURER}
          />
        </label>

        <label>
          상품명
          <input
            type="text"
            value={productLabel}
            onChange={(e) => {
              setSelectedSampleId(null);
              setProductLabel(e.target.value);
            }}
            placeholder={generation === 1 ? (isGen1Placeholder ? GEN1_PRODUCT_NAME_DISPLAY : "보험 상품명") : MASKED_PRODUCT_NAME}
          />
        </label>

        <label>
          실손 세대 <span className="required-mark">필수</span>
          <select
            id="generation-select"
            required aria-required="true"
            className={isGenerationSelected ? undefined : "is-placeholder"}
            value={isGenerationPickerOpen || !isGenerationSelected ? "" : generation}
            onMouseDown={() => setIsGenerationPickerOpen(true)}
            onTouchStart={() => setIsGenerationPickerOpen(true)}
            onBlur={() => setIsGenerationPickerOpen(false)}
            onChange={(e) => {
              setIsGenerationPickerOpen(false);
              const selectedGeneration = Number(e.target.value) as Exclude<InsuranceGeneration, 5>;
              // 같은 세대를 다시 선택해도 같은 규칙(contractTransitions.ts)으로 초기 상태로 되돌린다.
              applyContractPatch(generationSelectedPatch(selectedGeneration, { selectedSampleId }));
            }}
          >
            <option value="" disabled hidden>{isGenerationSelected ? "" : "예: 3세대"}</option>
            <option value={1}>1세대</option>
            <option value={2}>2세대</option>
            <option value={3}>3세대</option>
            <option value={4}>4세대</option>
          </select>
          {generation === 1 && <small className="sample-note generation-note">대표 상품을 가정한 계산 예시입니다.</small>}
        </label>

        <label>
          가입일 <span className="required-mark">필수</span>
          <IsoDateInput id="current-inception-date" required
            value={inceptionDate}
            onChange={(value) => applyContractPatch(inceptionDateTypedPatch(value))}
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
            가입 상품 <span className="required-mark">필수</span>
            <select
              id="samsung-gen1-product"
              className={gen1Product === "UNKNOWN" ? "is-placeholder" : undefined}
              value={gen1Product}
              required
              aria-required="true"
              aria-invalid={gen1Product === "UNKNOWN"}
              onChange={(event) => {
                const value = event.target.value as typeof gen1Product;
                setGen1Product(value);
                // 선택한 상품에 맞는 이름을 자동으로 채운다(이후 직접 수정할 수 있다).
                if (value === "SAMSUNG_0904_2") {
                  setInsurerLabel(GEN1_PRODUCT_INSURER_DISPLAY);
                  setProductLabel(GEN1_PRODUCT_NAME_DISPLAY);
                } else {
                  const company = gen1CompanyLabel(value);
                  if (company) {
                    setInsurerLabel(company);
                    setProductLabel(gen1CompanyProductName(company));
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
              특약 가입 여부 <span className="optional-mark">가입한 특약만 선택</span>
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
          현재 월 보험료 <span className="required-mark">필수</span>
          <span className="input-unit-row"><input
            type="text"
            inputMode="numeric"
            id="current-monthly-premium" required aria-required="true"
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

        {/* 1세대를 고르면 바로 특약(상해/질병) 가입 여부를 받는다. 하나 이상 체크해야 한다. */}
        {generation === 1 ? (
          <div className="select-like-field rider-row">
            <span id="gen1-d1-title">
              특약 가입 여부 <span className="required-mark">필수</span>
              <small className="sample-note rider-row__hint">가입한 특약을 하나 이상 체크해주세요.</small>
            </span>
            <div className="rider-row__boxes rider-row__boxes--two" role="group" aria-labelledby="gen1-d1-title">
              {([
                ["injury", "상해", "사고로 다쳤을 때의 입원·통원 의료비를 보장하는 특약"],
                ["disease", "질병", "질병으로 치료받을 때의 입원·통원 의료비를 보장하는 특약"],
              ] as const).map(([key, label, description]) => (
                <label key={key} className="no-treatment-option">
                  <input
                    id={key === "injury" ? "gen1-d1-injury" : undefined}
                    type="checkbox"
                    checked={gen1CoverageChecks(gen1D1Coverage)[key]}
                    aria-invalid={gen1D1Coverage === "NONE"}
                    onChange={(event) => {
                      const checks = gen1CoverageChecks(gen1D1Coverage);
                      setGen1D1Coverage(gen1CoverageFromChecks(key === "injury" ? event.target.checked : checks.injury, key === "disease" ? event.target.checked : checks.disease));
                    }}
                  />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {generation === 3 ? (
          <div className="select-like-field rider-row">
            <span id="gen3-rider-title">
              특약 가입 여부 <span className="optional-mark">가입한 특약만 선택</span>
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

      </section>

      {isGenerationSelected && (
        <section className="form-card" aria-label="가입한 보장의 가입금액">
          <span className="step-badge">STEP 1-2 · 고객 정보</span>
          <h2 className="card-title">가입한 보장의 가입금액</h2>
          {generation === 1 ? (
            <p className="card-description">1세대는 가입금액과 한도가 약관에 정해져 있어 따로 입력할 내용이 없습니다.</p>
          ) : (
            <>
              <p className="card-description">보험증권에 기재된 가입금액을 입력해주세요. 가입한 담보의 한도만 계산에 사용합니다.</p>
        <Step1ContractDetails form={form} />
            </>
          )}
        </section>
      )}
    </>
  );
}
