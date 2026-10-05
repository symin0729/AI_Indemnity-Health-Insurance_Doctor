import { InputHelp } from "../../../components/InputHelp";
import { getTreatmentAdditionalInfoFields, getTreatmentAddLabel } from "./treatmentSequence";
import { type CopayInstitution, type CopayRegion } from "../../../domain/insuranceInputDefaults";
import { genericGen23CareSetting, syncGen23CareSetting } from "../../../domain/samsungGen23CareSetting";
import { Gen23Inputs } from "../../../components/samsung/Gen23Inputs";
import { MASKED_INSURER } from "../../../domain/displayMask";
import type { BenefitClass, CareSetting, SeverityClass } from "../../../domain/medical";
import { formatWonInput, getWonInputValue, IsoDateInput } from "./M02Shared";
import type { M02Form } from "./useM02Form";

export default function Step2Treatment({ form }: { form: M02Form }) {
  const {
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
    isTreatmentHelpConfirmed,
    isTreatmentLimitReached,
    patientCostHelpDialogRef,
    plannedUsages,
    samsungGen23Variant,
    setBenefitClass,
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
    <section className="form-card">
        {treatmentSampleNotice && <p className="notice-box" role="status">{treatmentSampleNotice}</p>}
        <span className="step-badge">STEP 2-2</span>
        <div className="treatment-heading-row">
          <h2 className="card-title" style={{ margin: 0 }}>예정 치료</h2>
          <div className="treatment-compact-actions">
            <button type="button" className={`sample-button required-confirm-button${isTreatmentHelpConfirmed ? " is-confirmed" : ""}`} aria-haspopup="dialog" onClick={() => treatmentHelpDialogRef.current?.showModal()}>{isTreatmentHelpConfirmed ? "✓ 필수 입력 안내 확인 완료" : "필수 입력 안내 확인"}</button>
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
              <button type="button" className="sample-button" style={{ minHeight: "30px", padding: "4px 9px", fontSize: "0.8rem" }} aria-label="진료비 입력 안내 확인" aria-haspopup="dialog" aria-controls="patient-cost-dialog" onClick={() => patientCostHelpDialogRef.current?.showModal()}>확인</button>
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

          <label>
            건강보험 본인부담률 (r)
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
          </label>
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

          {(generation === 2 || generation === 3) && <Gen23Inputs generation={generation} riderManaged={generation === 3} variant={samsungGen23Variant} insurerName={MASKED_INSURER} embedded institutionManaged value={gen23Form} onChange={(values) => {
            setGen23Form(values);
            const selectedCare = genericGen23CareSetting(values.gen23CareSetting);
            if (selectedCare && selectedCare !== careSetting) changeCareSetting(selectedCare);
          }} />}

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
                          {usage.treatmentCategory}
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
