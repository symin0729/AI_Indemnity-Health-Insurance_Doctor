// Reviewed sheet remains verbatim. These display mappings reconcile its summary/detail
// columns and the cited body pages; formulas and numerical enforcement stay separate.
export function reviewedLimit(row) {
  const id = row[3].replace('G5-CONV-', 'G5-');
  const summary = row[8];
  const detail = row[9];
  if (id === 'G1-05') return `${summary}; 재보장 간격 180일`;
  if (['G2-SEL2-01', 'G2-STD-01'].includes(id)) return `${summary}; ${detail.split(' / ')[1]}`;
  if (id === 'G3-STD-BASE-01') return `연간 자기부담 2,000,000원 초과분 보상; ${detail.split(' / ')[1]}`;
  if (['G3-SEL2-01', 'G5-04', 'G5-06', 'G5-07'].includes(id)) return detail;
  if (['G4-01', 'G4-02', 'G5-01'].includes(id)) return `${detail}; ${summary.split('; ')[1]}`;
  if (id === 'G4-03') return `${summary}; ${detail}`;
  if (id === 'G4-04') return `${detail}; 공제표 적용`;
  if (id === 'G5-02') return '급여 상해/질병 각각 입원·통원 합산 연간 보험가입금액(최대 50,000,000원); 통원 1회당 최대 200,000원';
  if (id === 'G5-03') return `${detail.split(' / ')[0]}; ${summary}`;
  return summary;
}

export function reviewedSource(ruleId) {
  if (!ruleId.startsWith('G5-')) return {};
  const number = Number(ruleId.split('-').at(-1));
  const sourceSection = number <= 2 ? '기본형 실손의료보험(급여 실손의료비)'
    : number <= 5 ? '실손의료비보험 특별약관1(중증 비급여 실손의료비)'
    : '실손의료비보험 특별약관2(비중증 비급여 실손의료비)';
  const paragraphs = {
    1: '(1) 상해급여 제1항 입원', 2: '(1) 상해급여 제1항 통원 표1',
    3: '(1) 상해비급여 제1항 입원', 4: '(1) 상해비급여 제1항 통원 표1',
    5: '(3) 3대비급여 제1항', 6: '(1) 상해비급여 제1항 입원',
    7: '(1) 상해비급여 제1항 통원 표1', 8: '(3) 비급여 자기공명영상진단 제1항',
    9: '제3항 요율 상대도 표 및 제4항~제5항',
  };
  if (!paragraphs[number]) throw new Error(`Unknown G5 evidence: ${ruleId}`);
  return { sourceSection, article: number === 9 ? '제6조 (보험료의 계산)' : '제3조 (보장종목별 보상내용)', paragraph: paragraphs[number] };
}
