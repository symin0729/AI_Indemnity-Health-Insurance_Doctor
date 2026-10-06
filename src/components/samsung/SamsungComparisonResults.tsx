import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import AppShell from '../AppShell';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { calculateSamsungAnnualBreakEven, calculateSamsungAnnualComparison } from '../../engine/calculateSamsungComparison';
export default function SamsungComparisonResults() {
  const navigate = useNavigate();
  const {contract,usages,productCalculationSelections: selections,calculationAssumptions: assumptions,target5GMonthlyPremium,target5GCoverages} = useAnalysisStore();
  const comparison = useMemo(()=>contract && target5GMonthlyPremium !== null ? calculateSamsungAnnualComparison(contract,target5GMonthlyPremium,target5GCoverages,selections,usages,assumptions) : null,[contract,target5GMonthlyPremium,target5GCoverages,selections,usages,assumptions]);
  const breakEven = useMemo(()=>contract && target5GMonthlyPremium !== null ? usages.map((usage)=>({usage,result:calculateSamsungAnnualBreakEven(contract,target5GMonthlyPremium,target5GCoverages,selections,usages,assumptions,usage.id)})) : [],[contract,target5GMonthlyPremium,target5GCoverages,selections,usages,assumptions]);
  if (!contract || target5GMonthlyPremium === null || !comparison) return <AppShell currentStep={6}><main className="navy-page"><p>계약과 비교 조건을 먼저 입력해주세요.</p><button onClick={()=>navigate('/input')}>입력하기</button></main></AppShell>;
  const {items,currentTotal,targetTotal} = comparison;
  const money=(value:number|null)=>value===null?'확인 필요':`${value.toLocaleString()}원`;
  return <AppShell currentStep={6}><main className="navy-page"><header className="page-header"><h1>상품별 계산 결과</h1><p>초안 검산 · 실제 보험금 지급액이 아닙니다. 운영 계산은 비활성 상태입니다.</p></header>
    <section className="app-card"><h2>연간 비교</h2><p>현재 계약: {money(currentTotal)}</p><p>5세대 일반형 비교안: {money(targetTotal)}</p><p>5세대 절감액: {money(currentTotal===null||targetTotal===null?null:currentTotal-targetTotal)}</p>{!comparison.complete&&<p className="notice-box">미확인 조건이 있어 연간 합계를 확정하지 않습니다.</p>}</section>
    {items.map(({usage,current,target,currentClaimTotal,targetClaimTotal})=><section className="app-card" key={usage.id}><h2>{usage.treatmentName}</h2><p>예상 {usage.frequency}회를 회차별로 다시 계산하고 같은 규칙의 연간 한도를 순차 반영했습니다.</p>{[{label:`현재 ${contract.generation}세대`,result:current,total:currentClaimTotal},{label:'5세대 일반형 비교안',result:target,total:targetClaimTotal}].map(({label,result,total})=><div key={label}><h3>{label}</h3><p>연간 예상 보험금: {money(total)}</p><p>마지막 회차 보험금: {money(result.claim)}</p>{result.ruleId&&<p>적용 규칙: {result.ruleId}</p>}{result.reasons.map((reason,index)=><p key={index}>{reason}</p>)}</div>)}</section>)}
    {breakEven.map(({usage,result})=><section className="app-card" key={`break-even-${usage.id}`}><h2>{usage.treatmentName} 손익분기</h2><p>{result?.message ?? '손익분기 계산을 실행할 수 없습니다.'}</p>{result?.threshold!==null&&result?.threshold!==undefined&&<p>확인된 기준 횟수: 연 {result.threshold}회</p>}{result?.warnings.map((warning,index)=><p key={index}>{warning}</p>)}</section>)}
    <button className="primary-button" onClick={()=>navigate('/input#input-step-2')}>치료·비교 조건 수정</button><button className="secondary-button" onClick={()=>navigate('/confirm')}>입력 확인</button>
  </main></AppShell>;
}
