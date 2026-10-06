import { InputHelp } from "../../components/InputHelp";
import { getTreatmentAdditionalInfoFields, getTreatmentAddLabel } from "./treatmentSequence";
import { type CopayInstitution, type CopayRegion } from "../../domain/insuranceInputDefaults";
import { genericGen23CareSetting, syncGen23CareSetting } from "../../domain/samsungGen23CareSetting";
import { Gen23Inputs } from "../../components/samsung/Gen23Inputs";
import { MASKED_INSURER } from "../../domain/displayMask";
import { GEN23_CONTRACT_DETAIL_KEYS } from "../../domain/contractDetails";
import { NON_COVERED_TREATMENT_TYPES, nonCoveredTreatmentTypeLabel, toNonCoveredTreatmentType } from "../../domain/nonCoveredTreatmentType";
import type { BenefitClass, CareSetting, ClaimCause, NationalHealthInsuranceStatus, SeverityClass } from "../../domain/medical";
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
    claimCause,
    gen1CoveredRoomAndTreatment,
    gen1NonNhiInpatientTotal,
    policyExclusionsCleared,
    gen1DaysSinceAccident,
    gen1Product,
    gen1RoomDifference,
    nationalHealthInsuranceStatus,
    setClaimCause,
    setGen1CoveredRoomAndTreatment,
    setGen1NonNhiInpatientTotal,
    setPolicyExclusionsCleared,
    setGen1DaysSinceAccident,
    setGen1RoomDifference,
    setNationalHealthInsuranceStatus,
    applyCopayDefault,
    benefitClass,
    careSetting,
    changeCareSetting,
    copayInstitution,
    copayRegion,
    coveredAmount,
    currentTreatmentSlotIndex,
    editingUsageId,
    frequency,
    gen23Form,
    generation,
    handleAddTreatment,
    handleCancelEdit,
    handleEditTreatment,
    handleRemoveTreatment,
    healthInsuranceCopayRatePercent,
    institutionType,
    isTreatmentFormOpen,
    isTreatmentLimitReached,
    patientCostHelpDialogRef,
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
    setSeverityClass,
    setTreatmentDate,
    setTreatmentName,
    setUnitCost,
    severityClass,
    treatmentDate,
    treatmentHelpDialogRef,
    treatmentName,
    treatmentSampleDialogRef,
    treatmentSampleNotice,
    unitCost,
  } = form;

  return (
    <section id="input-step-2" tabIndex={-1} className="form-card">
        {treatmentSampleNotice && <p className="notice-box" role="status">{treatmentSampleNotice}</p>}
        <span className="step-badge">STEP 2 · 예정 치료</span>
        <div className="treatment-heading-row">
          <h2 className="card-title" style={{ margin: 0 }}>예정 치료</h2>
          <div className="treatment-compact-actions">
            <button type="button" className="sample-button" aria-haspopup="dialog" onClick={() => treatmentHelpDialogRef.current?.showModal()}>입력 도움말</button>
            <button type="button" className="sample-button" aria-haspopup="dialog" onClick={() => treatmentSampleDialogRef.current?.showModal()} disabled={isTreatmentLimitReached}>치료 샘플 불러오기</button>
          </div>
        </div>

        <p className="card-description" style={{ fontSize: "0.85rem" }}>
          앞으로 예상되는 의료이용을 입력한 뒤 반드시 하단의 ‘추가하기’를 눌러주세요.
          치료는 최대 3건까지 추가하거나 수정할 수 있습니다.
        </p>

        {isTreatmentFormOpen && <>
          <fieldset className="form-card">
            <legend>
              <h3>
                {editingUsageId ? "치료 수정" : getTreatmentAddLabel(currentTreatmentSlotIndex)}
              </h3>
            </legend>

        {editingUsageId && (
          <div className="notice-box">
            현재 선택한 치료를 수정하고
            있습니다.
          </div>
        )}

        <label>
          치료명 (필수)
          <input
            type="text"
            value={
              treatmentName
            }
            onChange={(e) =>
              setTreatmentName(
                e.target.value
              )
            }
            placeholder="예: MRI"
          />
        </label>

        <div className="form-grid">
          <label>
            입원 / 통원 (필수)
            <select
              value={
                careSetting
              }
              onChange={(e) => {
                const nextCare = e.target.value as CareSetting;
                changeCareSetting(nextCare);
                if (generation === 2 || generation === 3) {
                  setGen23Form(previous => ({ ...previous, gen23CareSetting: syncGen23CareSetting(nextCare, previous.gen23CareSetting) }));
                }
              }}
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
            급여 여부 (필수)
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


        </div>

        <div className="form-grid">
          <label>
            예상 횟수 (필수)
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value
                )
              }
            /><span className="input-unit-label">회</span></span>
          </label>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <label htmlFor="patient-unit-cost" style={{ marginBottom: 0 }}>한 번 진료받을 때 내가 내는 금액 (필수)</label>
              <button type="button" className="sample-button" style={{ minHeight: "30px", padding: "4px 9px", fontSize: "0.8rem" }} aria-label="진료비 입력 도움말" aria-haspopup="dialog" aria-controls="patient-cost-dialog" onClick={() => patientCostHelpDialogRef.current?.showModal()}>도움말</button>
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
          <label htmlFor="copay-institution">
            의료기관 종별 {careSetting === "OUTPATIENT" && (generation === 2 || generation === 3 || benefitClass === "COVERED") && <span>(필수)</span>}
            <InputHelp title="의료기관 종별" description="병원 이름만 보고 판단하지 말고 등록된 의료기관 종류를 선택하세요. 종합병원과 상급종합병원은 서로 다른 선택지입니다." source="병원 안내·원무과" />
            <select id="copay-institution" value={copayInstitution || institutionType} onChange={(e) => {
              const value = e.target.value as CopayInstitution | "";
              setCopayInstitution(value);
              setInstitutionType(value === "TERTIARY" || value === "GENERAL" ? "GENERAL_TERTIARY" : value === "CLINIC" || value === "HOSPITAL" ? "CLINIC_HOSPITAL" : "");
              applyCopayDefault(careSetting, value);
              if (generation === 2 || generation === 3) {
                const institution = value === "TERTIARY" ? "GENERAL_TERTIARY" : value === "GENERAL" || value === "HOSPITAL" ? "HOSPITAL" : value === "CLINIC" ? "CLINIC" : "";
                setGen23Form(previous => ({ ...previous, gen23Institution: institution }));
              }
            }}>
              <option value="">모름 / 해당 없음</option>
              {!copayInstitution && institutionType && <option value={institutionType}>기존 분류 — 세부 종별을 선택해주세요</option>}
              <option value="TERTIARY">상급종합병원</option>
              <option value="GENERAL">종합병원</option>
              <option value="HOSPITAL">병원급</option>
              <option value="CLINIC">의원급</option>
              <option value="PUBLIC_HEALTH">보건기관</option>
            </select>
          </label>
          {(copayInstitution === "GENERAL" || copayInstitution === "HOSPITAL") && careSetting === "OUTPATIENT" && <label htmlFor="institution-region">
            의료기관 소재 지역 (필수)
            <InputHelp title="의료기관 소재 지역" description="거주지가 아니라 진료받는 의료기관의 주소를 기준으로 동지역 또는 읍·면지역을 선택하세요." source="의료기관 주소·병원 원무과" />
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

          {benefitClass === "COVERED" && careSetting === "OUTPATIENT" && <label>
            건강보험 본인부담률
            <span className="input-unit-row"><input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              max="100"
              step="0.1"
              value={
                healthInsuranceCopayRatePercent
              }
              onChange={(e) =>
                setHealthInsuranceCopayRatePercent(
                  e.target.value
                )
              }
              placeholder="예: 40"
            /><span className="input-unit-label">%</span></span>
          </label>}
        </div>

        <div className="form-grid">
          {getTreatmentAdditionalInfoFields().map((field) => {
            if (field.key === "treatmentDate") {
              return (
                <label key={field.key}>
                  {field.label}
                  <IsoDateInput
                    value={treatmentDate}
                    onChange={setTreatmentDate}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              );
            }

            if (field.key === "severityClass") {
              if (benefitClass !== "NON_COVERED") return null;
              return (
                <label key={field.key}>
                  {field.label}
                  <select
                    value={
                      severityClass
                    }
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
                      산정특례 질환 치료 또는 관련 합병증으로 확인됨
                    </option>

                    <option value="NON_SEVERE">
                      산정특례 미적용 또는 다른 질환 치료로 확인됨
                    </option>
                  </select>
                </label>
              );
            }

            return (
              <label key={field.key}>
                {field.label}
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
            );
          })}
        </div>

        {/* 모든 세대 공통: 현재 계약과 5세대 전환 계산이 같은 값을 쓴다. */}
        <fieldset className="treatment-section" aria-label="치료 원인과 보장 확인">
          <legend><h3>치료 원인과 보장 확인</h3></legend>
          <div className="form-grid">
            <label>
              치료 원인 (필수)
              <InputHelp title="치료 원인" description="사고로 다친 치료면 상해, 그 밖의 병 치료면 질병을 선택하세요. 상해와 질병은 보장 한도와 계산 규칙이 다릅니다." source="진료기록·진단서" />
              <select value={claimCause} onChange={(event) => setClaimCause(event.target.value as ClaimCause)}>
                <option value="UNKNOWN">선택해주세요</option>
                <option value="INJURY">상해</option>
                <option value="DISEASE">질병</option>
              </select>
            </label>
            <label>
              이번 진료의 국민건강보험 적용 (필수)
              <InputHelp title="국민건강보험 적용" description="대부분의 병원 진료는 건강보험이 적용됩니다. 비급여 항목이 있다는 이유만으로 '적용되지 않음'을 고르지 마세요." source="진료비 영수증·병원 원무과" />
              <select value={nationalHealthInsuranceStatus} onChange={(event) => setNationalHealthInsuranceStatus(event.target.value as NationalHealthInsuranceStatus)}>
                <option value="APPLIED">적용됨</option>
                <option value="NOT_APPLIED">적용되지 않음</option>
                <option value="PARTIAL">일부 적용</option>
              </select>
            </label>
          </div>
          {benefitClass === "NON_COVERED" && (
            <div className="form-grid">
              <label>
                비급여 치료 종류
                <InputHelp title="비급여 치료 종류" description="도수치료·체외충격파·증식치료, 비급여 주사, MRI/MRA는 약관에서 공제금액과 한도를 따로 정합니다. 해당하지 않으면 일반 비급여를 고르세요." source="진료비 세부내역서·병원 안내" />
                <select value={toNonCoveredTreatmentType(benefitClass, treatmentCategory)} onChange={(event) => setTreatmentCategory(event.target.value)}>
                  {NON_COVERED_TREATMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          )}
          {nationalHealthInsuranceStatus === "PARTIAL" && <div className="notice-box warning">건강보험 일부 적용은 비용을 나누는 기준이 확인되지 않아 계산이 보류됩니다.</div>}
          <label className="no-treatment-option">
            <input type="checkbox" checked={policyExclusionsCleared} onChange={(event) => setPolicyExclusionsCleared(event.target.checked)} />
            <span><strong>증권·약관에서 보장 제외 사유가 없음을 확인함 (선택)</strong></span>
          </label>
        </fieldset>

          {(generation === 2 || generation === 3) && <Gen23Inputs generation={generation} riderManaged={generation === 3} variant={samsungGen23Variant} insurerName={MASKED_INSURER} embedded institutionManaged hiddenKeys={new Set([...(careSetting === "OUTPATIENT" ? ["gen23CoveredCopay", "gen23NonCoveredExpense"] : []), ...gen23HiddenInTreatment(careSetting === "INPATIENT", generation === 3 && toNonCoveredTreatmentType(benefitClass, treatmentCategory) !== ""), ...(form.comparisonBasis === "FRESH_YEAR" ? ["gen23PriorPaidBenefit", "gen23BenefitLimitRestored"] : [])])} value={{ ...gen23Form, ...contractDetails, claimCause, nationalHealthInsuranceStatus, gen23PolicyExclusionsCleared: String(policyExclusionsCleared), ...(generation === 3 ? { gen23TreatmentType: toNonCoveredTreatmentType(benefitClass, treatmentCategory) || "BASE" } : {}) }} onChange={(values) => {
            setGen23Form(values);
            const selectedCare = genericGen23CareSetting(values.gen23CareSetting);
            if (selectedCare && selectedCare !== careSetting) changeCareSetting(selectedCare);
          }} />}

        {generation === 4 && careSetting === 'INPATIENT' && benefitClass === 'NON_COVERED' && <fieldset className="treatment-section">
          <legend><h3>입원 비용 구분</h3></legend>
          <p className="sample-note">병실료 차액은 보상 비율과 하루 한도가 달라 따로 계산합니다. 위 보장대상 금액에 포함된 차액을 입력하세요.</p>
          <div className="form-grid">
            <label>병실료 차액 (없으면 0)<span className="input-unit-row"><input type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={event => setGen1RoomDifference(getWonInputValue(event.target.value))} /><span className="input-unit-label">원</span></span></label>
            {Number(gen1RoomDifference) > 0 && <label>입원일수<span className="input-unit-row"><input type="number" min="1" step="1" value={gen23Form.gen23InpatientDays ?? ''} onChange={event => setGen23Form({ ...gen23Form, gen23InpatientDays: event.target.value })} /><span className="input-unit-label">일</span></span></label>}
          </div>
        </fieldset>}

        {/* 세대별 세부 입력: 1세대는 삼성 0904.2 D1 계산에 필요한 값을 여기서 입력한다. */}
        {generation === 1 && gen1Product === "SAMSUNG_0904_2" && (
          <fieldset className="form-card" aria-label="1세대 세부 입력">
            <legend><h3>1세대 세부 입력 (D1 계산 조건)</h3></legend>
            <div className="form-grid">
              <label>
                사고일·발병일부터 경과일 (필수)
                <InputHelp title="사고일·발병일부터 경과일" description="상해는 사고일, 질병은 발병일부터 이번 진료일까지의 날수입니다. 1세대는 이 날부터 365일까지만 보장합니다." source="진료기록·진단서" />
                <span className="input-unit-row"><input type="number" min="0" step="1" value={gen1DaysSinceAccident} onChange={(event) => setGen1DaysSinceAccident(event.target.value)} placeholder="예: 30" /><span className="input-unit-label">일</span></span>
              </label>
            </div>
            {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "APPLIED" && <div className="form-grid">
              <label>실제 부담액<input type="text" inputMode="numeric" value={formatWonInput(gen1CoveredRoomAndTreatment)} onChange={(event) => setGen1CoveredRoomAndTreatment(getWonInputValue(event.target.value))} />원</label>
              <label>병실료 차액<input type="text" inputMode="numeric" value={formatWonInput(gen1RoomDifference)} onChange={(event) => setGen1RoomDifference(getWonInputValue(event.target.value))} placeholder="없으면 0" />원</label>
            </div>}
            {careSetting === "INPATIENT" && nationalHealthInsuranceStatus === "NOT_APPLIED" && <label>입원의료비 총액<input type="text" inputMode="numeric" value={formatWonInput(gen1NonNhiInpatientTotal)} onChange={(event) => setGen1NonNhiInpatientTotal(getWonInputValue(event.target.value))} />원</label>}
            {careSetting === "OUTPATIENT" && <p className="sample-note">통원 금액은 위의 ‘한 번 진료받을 때 내가 내는 금액’을 사용합니다.</p>}

          </fieldset>
        )}

        {isTreatmentLimitReached && (
          <div className="notice-box">
            예정 치료 3건이 모두 등록되었습니다.
            추가하려면 기존 치료를 수정하거나 삭제해주세요.
          </div>
        )}

        <div className="button-group">
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
                  usage.severityClass === "SEVERE"
                    ? "산정특례 질환 치료 또는 관련 합병증으로 확인됨"
                    : usage.severityClass === "NON_SEVERE"
                      ? "산정특례 미적용 또는 다른 질환 치료로 확인됨"
                      : "산정특례 여부 확인 필요";

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

                      <div>
                        <strong style={{ marginRight: "8px" }}>산정특례 및 치료 관련성:</strong>
                        {severityLabel}
                      </div>

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
