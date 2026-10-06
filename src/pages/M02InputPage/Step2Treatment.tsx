import { getTreatmentAddButtonLabel, getTreatmentAddLabel } from "./treatmentSequence";
import { type CopayInstitution, type CopayRegion } from "../../domain/insuranceInputDefaults";
import { genericGen23CareSetting, syncGen23CareSetting } from "../../domain/samsungGen23CareSetting";
import { Gen23Inputs } from "../../components/samsung/Gen23Inputs";
import { MASKED_INSURER } from "../../domain/displayMask";
import { GEN23_CONTRACT_DETAIL_KEYS } from "../../domain/contractDetails";
import { NON_COVERED_TREATMENT_TYPES, nonCoveredTreatmentTypeLabel, toNonCoveredTreatmentType } from "../../domain/nonCoveredTreatmentType";
import type { BenefitClass, ClaimCause } from "../../domain/medical";
import { formatWonInput, getWonInputValue, IsoDateInput } from "./M02Shared";
import type { M02Form } from "./useM02Form";

/** 예정 치료의 2·3세대 세부 입력에서 숨기는 칸: 공통 칸(치료 원인 등)과 STEP 1에서 받는 계약 상세·올해 이용 내역. */
const GEN23_HIDDEN_IN_TREATMENT: ReadonlySet<string> = new Set([
  "gen23PriorPaidBenefit", "gen23BenefitLimitRestored",
  "gen23SameDayAggregationConfirmed", "gen23AggregationUnit", "gen23EligibleExpense",
  "claimCause", "nationalHealthInsuranceStatus", "gen23PolicyExclusionsCleared", "gen23TreatmentType",
  ...GEN23_CONTRACT_DETAIL_KEYS,
  // 연간 계약 단위 올해 이용 내역은 STEP 1-2에서 받는다.
  "gen23PriorAnnualCount", "gen23PriorEligibleDeductible",
]);
/** 입원의 '이미 받은 보험금'(1상해·1질병 한도)만 예정 치료에서 받는다. 외래·처방·3대 특약은 STEP 1-2 값을 쓴다. */
const gen23HiddenInTreatment = (inpatient: boolean, special: boolean): ReadonlySet<string> =>
  inpatient && !special ? GEN23_HIDDEN_IN_TREATMENT : new Set([...GEN23_HIDDEN_IN_TREATMENT, "gen23PriorPaidBenefit"]);

export default function Step2Treatment({ form }: { form: M02Form }) {
  const {
    treatmentCareSelected,
    claimCause,
    policyExclusionsCleared,
    gen1DaysSinceAccident,
    gen1Product,
    gen1RoomDifference,
    setClaimCause,
    setGen1DaysSinceAccident,
    setGen1RoomDifference,
    applyCopayDefault,
    benefitClass,
    careSetting,
    changeCareSetting,
    copayInstitution,
    copayRegion,
    coveredAmount,
    editingUsageId,
    frequency,
    gen23Form,
    generation,
    handleAddTreatment,
    handleOpenTreatmentForm,
    handleResetTreatments,
    handleCancelEdit,
    handleEditTreatment,
    handleRemoveTreatment,
    healthInsuranceCopayRatePercent,
    institutionType,
    isTreatmentFormOpen,
    isTreatmentLimitReached,
    plannedUsages,
    samsungGen23Variant,
    setBenefitClass,
    treatmentCategory,
    setTreatmentCategory,
    contractDetails,
    setCopayInstitution,
    setCopayRegion,
    setCoveredAmount,
    setFrequency,
    setGen23Form,
    setHealthInsuranceCopayRatePercent,
    setInstitutionType,
    setTreatmentDate,
    setTreatmentName,
    setUnitCost,
    treatmentDate,
    treatmentName,
    treatmentSampleDialogRef,
    treatmentSampleNotice,
    treatmentSampleLoaded,
    unitCost,
  } = form;

  const handleInstitutionChange = (value: CopayInstitution | "") => {
    setCopayInstitution(value);
    setInstitutionType(value === "TERTIARY" || value === "GENERAL" ? "GENERAL_TERTIARY" : value === "CLINIC" || value === "HOSPITAL" ? "CLINIC_HOSPITAL" : "");
    applyCopayDefault(careSetting, value);
    if (generation === 2 || generation === 3) {
      const institution = value === "TERTIARY" ? "GENERAL_TERTIARY" : value === "GENERAL" || value === "HOSPITAL" ? "HOSPITAL" : value === "CLINIC" ? "CLINIC" : "";
      setGen23Form(previous => ({ ...previous, gen23Institution: institution }));
    }
  };
  // 2세대, 그리고 3세대 일반 치료의 입원은 위의 예상 금액에서 병실료 차액만 따로 받는다.
  const gen3NonCoveredType = generation === 3 ? toNonCoveredTreatmentType(benefitClass, treatmentCategory) : "";
  const gen23SplitInpatient = careSetting === "INPATIENT" && (generation === 2 || (generation === 3 && gen3NonCoveredType === ""));
  return (
    <section id="input-step-2" tabIndex={-1} className="form-card">
        {treatmentSampleNotice && <p className="notice-box" role="status">{treatmentSampleNotice}</p>}
        <span className="step-badge">STEP 2 · 예정 치료</span>
        <div className="treatment-heading-row">
          <h2 className="card-title">예정 치료</h2>
        <p className="card-description" style={{ fontSize: "0.85rem" }}>
          앞으로 예상되는 의료이용을 입력한 뒤 반드시 하단의 ‘추가하기’를 눌러주세요.
          치료는 최대 3건까지 추가하거나 수정할 수 있습니다.
        </p>
          <div className="treatment-compact-actions">
            {!isTreatmentLimitReached && <button type="button" className="sample-button" onClick={handleOpenTreatmentForm} disabled={isTreatmentFormOpen}>{getTreatmentAddButtonLabel()}</button>}
            <button type="button" className="sample-button" aria-haspopup="dialog" onClick={() => treatmentSampleDialogRef.current?.showModal()} disabled={isTreatmentLimitReached}>치료 샘플 불러오기</button>
            <button type="button" className="sample-button" onClick={handleResetTreatments}>초기화</button>
            {treatmentSampleLoaded && <span className="status-badge success" role="status">샘플 입력 완료</span>}
          </div>
        </div>



        {isTreatmentFormOpen && <>
          <div className="treatment-form-container">
          <fieldset className="form-card treatment-form-card">
            <legend><h3 id="treatment-basic-title">치료 정보</h3></legend>

        {editingUsageId && (
          <div className="notice-box">
            현재 선택한 치료를 수정하고
            있습니다.
          </div>
        )}

        <section className="treatment-input-group" aria-labelledby="treatment-basic-title">
        <div className="form-grid">
        <div>
          <label htmlFor="treatment-kind" className="treatment-field-heading">치료 종류 <span className="required-mark">필수</span><small className="treatment-inline-hint">기타는 직접 입력 · 특약 적용은 별도 확인</small></label>
          {(treatmentCategory === 'OTHER' || (!['MANUAL_THERAPY', 'INJECTION', 'MRI'].includes(treatmentCategory) && treatmentName !== '' && treatmentName !== '일반 비급여')) ? (
            <div className="treatment-kind-input">
              <input id="treatment-kind" type="text" autoFocus value={treatmentName} onChange={event => setTreatmentName(event.target.value)} placeholder="예: 외래 진료, 검사, 수술" />
              <button type="button" className="sample-button" onClick={() => { setTreatmentCategory(''); setTreatmentName('일반 비급여'); }}>목록 선택</button>
            </div>
          ) : (
            <select id="treatment-kind" value={['MANUAL_THERAPY', 'INJECTION', 'MRI'].includes(treatmentCategory) ? treatmentCategory : treatmentName ? 'GENERAL' : ''}
              onChange={event => {
                const value = event.target.value;
                setTreatmentCategory(value === 'GENERAL' ? '' : value);
                setTreatmentName(value === 'OTHER' ? '' : value === 'GENERAL' ? '일반 비급여' : nonCoveredTreatmentTypeLabel(value));
              }}>
              {!treatmentName && <option value="" disabled>예: MRI/MRA, 도수치료</option>}
              {NON_COVERED_TREATMENT_TYPES.map(([value, label]) => <option key={value} value={value || 'GENERAL'}>{label}</option>)}
              <option value="OTHER">기타 (직접 입력)</option>
            </select>
          )}
        </div>

          <div className="treatment-date-field"><label htmlFor="treatment-date" className="treatment-field-heading">진료 예정일</label><IsoDateInput id="treatment-date" value={treatmentDate} onChange={setTreatmentDate} placeholder="YYYY-MM-DD" /></div>
        </div>
        <div>
          <fieldset className="treatment-cause-care" aria-label="치료 구분 (필수)">
            <legend>치료 구분 <span className="required-mark">필수</span><small className="treatment-inline-hint">상해·질병 구분 후 입원·통원 중 하나 선택</small></legend>
            <div className="form-grid treatment-cause-row">
            <div>
            <label htmlFor="treatment-cause" className="sr-only">치료 원인 (필수)</label>
            <select id="treatment-cause" value={claimCause} onChange={event => setClaimCause(event.target.value as ClaimCause)}>
              {claimCause === "UNKNOWN" && <option value="UNKNOWN" disabled>예: 상해 / 질병</option>}
              <option value="INJURY">상해</option>
              <option value="DISEASE">질병</option>
            </select>
            </div>
            <div>
            <div className="treatment-care-options">
              {(['INPATIENT', 'OUTPATIENT'] as const).map(setting => <label className="no-treatment-option" key={setting}>
                <input type="checkbox" checked={treatmentCareSelected && careSetting === setting} disabled={claimCause === 'UNKNOWN'} onChange={() => {
                  changeCareSetting(setting);
                  if (generation === 2 || generation === 3) setGen23Form(previous => ({ ...previous, gen23CareSetting: syncGen23CareSetting(setting, previous.gen23CareSetting) }));
                }} />
                <span>{setting === 'INPATIENT' ? '입원' : '통원'}</span>
              </label>)}
            </div>
            </div>
            </div>
          </fieldset>

        </div>

        </section>
        <section className="treatment-input-group treatment-coverage-layout" aria-label="담보와 의료기관 정보">
          <div>
          <label>
            <span className="treatment-field-heading">급여 여부 <span className="required-mark">필수</span></span>
            <select
              value={
                benefitClass
              }
              onChange={(e) =>
                setBenefitClass(
                  e.target
                    .value as BenefitClass
                )
              }
            >
              {benefitClass === 'UNKNOWN' && <option value="UNKNOWN" disabled>예: 급여 / 비급여</option>}
              <option value="COVERED">
                급여
              </option>

              <option value="NON_COVERED">
                비급여
              </option>
            </select>
          </label>
          </div>
          <div className="treatment-coverage-stack">
        {/* 급여를 고르면 의료기관 종별·소재 지역·건강보험 본인부담률, 비급여를 고르면 산정특례·치료 관련성을 받는다. */}
        {(benefitClass === "COVERED" || benefitClass === "NON_COVERED") && <>
        {benefitClass === "COVERED" && <div className="treatment-coverage-stack">
          {benefitClass === "COVERED" && <label htmlFor="copay-institution">
            <span className="treatment-field-heading">
            의료기관 종별 {careSetting === "OUTPATIENT" && <span className="required-mark">필수</span>}
            </span>
            <select id="copay-institution" value={copayInstitution || institutionType} onChange={(e) => handleInstitutionChange(e.target.value as CopayInstitution | "")}>
              <option value="" disabled hidden>선택해주세요</option>
              {!copayInstitution && institutionType && <option value={institutionType}>기존 분류 — 세부 종별을 선택해주세요</option>}
              <option value="TERTIARY">상급종합병원 (대형 대학병원 등)</option>
              <option value="GENERAL">종합병원 (여러 진료과, 100병상 이상)</option>
              <option value="HOSPITAL">병원급 (30병상 이상)</option>
              <option value="CLINIC">의원급 (동네 의원)</option>
              <option value="PUBLIC_HEALTH">보건기관 (보건소·보건지소)</option>
            </select>
          </label>}
          {benefitClass === "COVERED" && (copayInstitution === "GENERAL" || copayInstitution === "HOSPITAL") && <label htmlFor="institution-region">
            <span className="treatment-field-heading">
            의료기관 소재 지역 <span className="required-mark">필수</span>
            <small className="treatment-inline-hint">진료받는 병원의 주소 기준</small>
            </span>
            <select id="institution-region" value={copayRegion} onChange={(e) => {
              const value = e.target.value as CopayRegion | "";
              setCopayRegion(value);
              applyCopayDefault(careSetting, copayInstitution, value);
            }}>
              <option value="">선택해주세요</option>
              <option value="DONG">동지역</option>
              <option value="EUP_MYEON">읍·면지역</option>
            </select>
          </label>}
          {benefitClass === "COVERED" && <label>
            <span className="treatment-field-heading">건강보험 본인부담률</span>
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              max="100"
              step="0.1"
              value={healthInsuranceCopayRatePercent}
              onChange={(e) => setHealthInsuranceCopayRatePercent(e.target.value)}
              placeholder="예: 40"
            /><span className="input-unit-label">%</span></span>
          </label>}
        </div>}
        </>}

          </div>
        </section>
        <section className="treatment-input-group treatment-cost-block">

        <div className="form-grid">
          <label>
            <span className="treatment-field-heading">예상 횟수 <span className="required-mark">필수</span><small className="treatment-inline-hint">앞으로 1년간 이 치료를 받을 횟수</small></span>
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              placeholder="예: 3"
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value
                )
              }
            /><span className="input-unit-label">회</span></span>
          </label>

          <div>
            <div className="treatment-field-heading">
              <label htmlFor="patient-unit-cost" style={{ marginBottom: 0 }}>한 번 진료받을 때 내가 내는 금액 <span className="required-mark">필수</span></label>
            </div>
            <span className="input-unit-row"><input
              id="patient-unit-cost"
              type="text"
              inputMode="numeric"
              value={formatWonInput(unitCost)}
              onChange={(e) =>
                setUnitCost(
                  getWonInputValue(e.target.value)
                )
              }
              placeholder="예: 400,000"
            /><span className="input-unit-label">원</span></span>
          </div>
        </div>

        <div className="form-grid">

              <label>
                <span className="treatment-field-heading">회당 보장대상 인정금액 (C)</span>
                <span className="input-unit-row"><input
                  type="text"
                  inputMode="numeric"
                  value={
                    formatWonInput(coveredAmount)
                  }
                  onChange={(e) =>
                    setCoveredAmount(
                      getWonInputValue(e.target.value)
                    )
                  }
                  placeholder="모르면 비워두세요"
                /><span className="input-unit-label">원</span></span>
              </label>

        </div>

        </section>



          {(generation === 2 || generation === 3) && <Gen23Inputs generation={generation} roomDifferenceOptional={gen23SplitInpatient} riderManaged={generation === 3} variant={samsungGen23Variant} insurerName={MASKED_INSURER} embedded institutionManaged hiddenKeys={new Set([...(careSetting === "OUTPATIENT" ? ["gen23CoveredCopay", "gen23NonCoveredExpense"] : []), ...(gen23SplitInpatient ? ["gen23CoveredCopay", "gen23NonCoveredExpense", "gen23InpatientExcludingRoomDifference", "gen23NonNhiInpatientTotal"] : []),
              // 3세대: 특약 대상 치료는 인정금액으로 계산하므로 급여·비급여 칸을 받지 않고, 일반 치료의 '3대 특약 제외 확인'은 치료 종류로 갈음한다. 주사 확인은 주사일 때만 묻는다.
              ...(generation === 3 ? ["gen23ThreeNonCoveredExcludedFromBaseConfirmed", ...(gen3NonCoveredType !== "" ? ["gen23CoveredCopay", "gen23NonCoveredExpense"] : []), ...(gen3NonCoveredType !== "INJECTION" ? ["gen23InjectionRiderEligibleConfirmed"] : [])] : []), ...gen23HiddenInTreatment(careSetting === "INPATIENT", generation === 3 && toNonCoveredTreatmentType(benefitClass, treatmentCategory) !== ""), ...(form.comparisonBasis === "FRESH_YEAR" ? ["gen23PriorPaidBenefit", "gen23BenefitLimitRestored"] : [])])} value={{ ...gen23Form, ...contractDetails, gen23CareSetting: gen23Form.gen23CareSetting || (careSetting === "INPATIENT" ? "INPATIENT" : "OUTPATIENT"), claimCause, nationalHealthInsuranceStatus: "APPLIED", gen23PolicyExclusionsCleared: String(policyExclusionsCleared), ...(generation === 3 ? { gen23TreatmentType: toNonCoveredTreatmentType(benefitClass, treatmentCategory) || "BASE" } : {}) }} onChange={(values) => {
            setGen23Form(values);
            const selectedCare = genericGen23CareSetting(values.gen23CareSetting);
            if (selectedCare && selectedCare !== careSetting) changeCareSetting(selectedCare);
          }} />}

        {generation === 4 && careSetting === 'INPATIENT' && benefitClass === 'NON_COVERED' && <fieldset className="treatment-section">
          <legend><h3>4세대 세부 보장 및 계약 확인</h3></legend>
          <div className="form-grid">
            <label>
              <span className="gen1-field-heading">입원일 수{Number(gen1RoomDifference) > 0 && <span className="required-mark">필수</span>}</span>
              <span className="input-unit-row"><input aria-label="입원일 수" type="number" min="1" step="1" value={gen23Form.gen23InpatientDays ?? ''} onChange={event => setGen23Form({ ...gen23Form, gen23InpatientDays: event.target.value })} placeholder={Number(gen1RoomDifference) > 0 ? "예: 7" : "예: 7 · 모르면 비워두세요"} /><span className="input-unit-label">일</span></span>
            </label>
            <label>
              <span className="gen1-field-heading">병실료 차액 <small className="treatment-inline-hint">상급병실(1~2인실)을 쓸 때만 입력, 다인실이면 비워두세요</small></span>
              <span className="input-unit-row"><input aria-label="병실료 차액" type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={event => setGen1RoomDifference(getWonInputValue(event.target.value))} placeholder="예: 200,000 · 모르면 비워두세요" /><span className="input-unit-label">원</span></span>
            </label>
          </div>
        </fieldset>}

        {/* 세대별 세부 입력: 1세대는 삼성 0904.2 D1 계산에 필요한 값을 여기서 입력한다. */}
        {generation === 1 && gen1Product === "SAMSUNG_0904_2" && (
          <fieldset className="form-card gen1-detail-inputs" aria-label="1세대 세부 입력">
            <legend><h3>1세대 세부 입력</h3></legend>
            <div className="form-grid">
              <label>
                사고일·발병일부터 경과일 <span className="required-mark">필수</span>
                <small className="treatment-inline-hint">사고·발병일부터 이번 진료일까지의 일수</small>
                <span className="input-unit-row"><input type="number" min="0" step="1" value={gen1DaysSinceAccident} onChange={(event) => setGen1DaysSinceAccident(event.target.value)} placeholder="예: 30" /><span className="input-unit-label">일</span></span>
              </label>
            </div>
            {careSetting === "INPATIENT" && <div className="form-grid">
              <label>
                <span className="gen1-field-heading">병실료 차액 <small className="treatment-inline-hint">상급병실(1~2인실)을 쓸 때만 입력, 다인실이면 비워두세요</small></span>
                <span className="input-unit-row"><input aria-label="병실료 차액" type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={(event) => setGen1RoomDifference(getWonInputValue(event.target.value))} placeholder="예: 200,000" /><span className="input-unit-label">원</span></span>
              </label>
            </div>}

          </fieldset>
        )}

        {isTreatmentLimitReached && (
          <div className="notice-box">
            예정 치료 3건이 모두 등록되었습니다.
            추가하려면 기존 치료를 수정하거나 삭제해주세요.
          </div>
        )}

        <div className="button-group treatment-submit-actions">
          <button
            type="button"
            className={
              editingUsageId
                ? "primary-button"
                : "secondary-button"
            }
            onClick={
              handleAddTreatment
            }
            disabled={
              isTreatmentLimitReached
            }
          >
            {editingUsageId ? "수정 확인" : "추가하기"}
          </button>

          {editingUsageId && (
            <button
              type="button"
              className="secondary-button"
              onClick={
                handleCancelEdit
              }
            >
              수정 취소
            </button>
          )}
        </div>
          </fieldset>
          </div>
        </>}


        {plannedUsages.length >
          0 && (
          <div>
            <h3>
              추가된 치료
            </h3>

            {plannedUsages.map(
              (usage, index) => {
                const totalCost =
                  usage.frequency *
                  usage.unitCost;

                const isEditing =
                  editingUsageId ===
                  usage.id;

                const severityLabel =
                  usage.severityClass === "SEVERE" ? "예" : usage.severityClass === "NON_SEVERE" ? "아니오" : "미입력";

                return (
                  <article
                    className="treatment-card"
                    key={usage.id}
                  >
                    <div className="treatment-card-header">
                      <div>
                        <span
                          className={
                            isEditing
                              ? "status-badge primary"
                              : "status-badge"
                          }
                        >
                          {isEditing
                            ? "수정 중"
                            : getTreatmentAddLabel(index)}
                        </span>

                        <h3>
                          {
                            usage.treatmentName
                          }
                        </h3>
                      </div>

                      <strong>
                        {totalCost.toLocaleString()}
                        원
                      </strong>
                    </div>

                    <p className="treatment-meta">
                      {usage.frequency}
                      회 ×{" "}
                      {usage.unitCost.toLocaleString()}
                      원
                    </p>

                    <div className="treatment-meta" style={{ display: "grid", gap: "6px" }}>
                      {usage.treatmentCategory && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>치료 분류:</strong>
                          {nonCoveredTreatmentTypeLabel(usage.treatmentCategory)}
                        </div>
                      )}

                      {usage.treatmentDate && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>진료 예정일:</strong>
                          {usage.treatmentDate}
                        </div>
                      )}

                      {usage.benefitClass === "NON_COVERED" && <div>
                        <strong style={{ marginRight: "8px" }}>5세대 산정특례 질환 치료:</strong>
                        {severityLabel}
                      </div>}

                      {usage.coveredAmount !== undefined && (
                        <div>
                          <strong style={{ marginRight: "8px" }}>회당 보장대상 인정금액 (C):</strong>
                          {usage.coveredAmount.toLocaleString()}원
                        </div>
                      )}
                    </div>

                    {(usage.institutionType ||
                      usage.healthInsuranceCopayRate !==
                        undefined ||
                      usage.coveredAmount !==
                        undefined) && (
                      <p className="treatment-meta">
                        {usage.institutionType ===
                        "CLINIC_HOSPITAL"
                          ? "병·의원"
                          : usage.institutionType ===
                              "GENERAL_TERTIARY"
                            ? "종합·상급종합병원"
                            : ""}
                        {usage.healthInsuranceCopayRate !==
                        undefined
                          ? ` · 건보 본인부담률 ${
                              usage.healthInsuranceCopayRate *
                              100
                            }%`
                          : ""}
                        {usage.coveredAmount !==
                        undefined
                          ? ` · C ${usage.coveredAmount.toLocaleString()}원`
                          : ""}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "18px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleEditTreatment(
                            usage
                          )
                        }
                        title={`${usage.treatmentName} 수정`}
                        aria-label={`${usage.treatmentName} 수정`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "7px",
                          minHeight: "40px",
                          padding: "0 14px",
                          border:
                            "1px solid var(--color-primary-200, #b9d1ea)",
                          borderRadius: "10px",
                          background: "#ffffff",
                          color:
                            "var(--color-primary-800, #164f86)",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 20H8L18.5 9.5C19.3284 8.67157 19.3284 7.32843 18.5 6.5L17.5 5.5C16.6716 4.67157 15.3284 4.67157 14.5 5.5L4 16V20Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13.5 6.5L17.5 10.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveTreatment(
                            usage
                          )
                        }
                        title={`${usage.treatmentName} 삭제`}
                        aria-label={`${usage.treatmentName} 삭제`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "7px",
                          minHeight: "40px",
                          padding: "0 14px",
                          border: "1px solid #fecaca",
                          borderRadius: "10px",
                          background: "#fff7f7",
                          color: "#b42318",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 7H20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M6.5 7L7.2 19C7.2352 19.6048 7.7359 20.0769 8.3417 20.0769H15.6583C16.2641 20.0769 16.7648 19.6048 16.8 19L17.5 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 11V16M14 11V16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        삭제
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
  );
}
