import type { M02Form } from './useM02Form';

export default function ComparisonBasisField({ form }: { form: M02Form }) {
  return <div className="comparison-basis-field">
    <label htmlFor="comparison-basis">비교 시작 조건</label>
    <select id="comparison-basis" value={form.comparisonBasis} onChange={event => form.setComparisonBasis(event.target.value as M02Form['comparisonBasis'])}>
      <option value="FRESH_YEAR">한도 사용 전부터 1년 비교</option>
      <option value="REMAINING_LIMITS">기존 사용분 반영 (선택)</option>
    </select>
    <p className="sample-note">{form.comparisonBasis === 'FRESH_YEAR' ? '두 계약 모두 기존 사용분 0에서 시작합니다. 같은 예정 치료를 비교하기 위한 모의 조건입니다.' : '현재 계약의 기존 지급액·횟수를 아래에 입력합니다. 5세대는 신규 계약으로 사용분 0에서 시작합니다.'}</p>
  </div>;
}
