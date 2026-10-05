import { expect, it } from 'vitest';
import { calculateSamsungGen5 } from '../src/engine/calculateSamsungGen5';
import { calculateSamsungGen1Sample } from '../src/engine/calculateSamsungGen1';
import { calculateSamsungAnnualBreakEven, calculateSamsungAnnualComparison, calculateSamsungComparisonItem, SAMSUNG_BREAK_EVEN_MAX_FREQUENCY } from '../src/engine/calculateSamsungComparison';
import { useAnalysisStore } from '../src/store/useAnalysisStore';
const common={policyExclusionsCleared:true,otherIndemnityPoliciesExist:false,coveragePeriodConfirmed:true};
it('rejects invalid outpatient rates including NaN',()=>{for(const rate of [NaN,Infinity,-0.3,1.1]) expect(calculateSamsungGen5('GENERAL','COVERED_OUTPATIENT',{...common,eligibleExpense:100000,institution:'CLINIC_HOSPITAL',healthInsuranceCopayRate:rate}).claim).toBeNull();});
it('requires cause on conversion outpatient',()=>expect(calculateSamsungGen5('CONVERSION','SEVERE_NON_COVERED_OUTPATIENT',{...common,conversionContractSubtype:'CONTRACT_CONVERSION',conversionEligibilityConfirmed:true,requiredCoverageConfirmed:true,eligibleExpense:100000,priorAnnualCount:0,priorPaidBenefit:0}).claim).toBeNull());
it('holds gen1 unknown service period',()=>expect(calculateSamsungGen1Sample({product:'SAMSUNG_0904_2',contractBasis:'SAMPLE_SIMULATION',d1Coverage:'INJURY',claimCause:'INJURY',careSetting:'OUTPATIENT',nhiStatus:'APPLIED'},{requiredCoverageConfirmed:true,policyExclusionsCleared:true,nhiApplied:true,outpatientExpense:100000})).toMatchObject({status:'CONFIRMATION_REQUIRED',claim:null}));
it('routes gen4 to Samsung rule, independently of MVP',()=>{
 const result=calculateSamsungComparisonItem({insurer:'삼성화재',productName:'2107.1',inceptionDate:'2021-07-01',generation:4,monthlyPremium:50000,renewalCycleMonths:null,reentryCycleMonths:null,coverages:[]},useAnalysisStore.getState().productCalculationSelections,{id:'x',treatmentName:'급여 입원',careSetting:'INPATIENT',benefitClass:'COVERED',severityClass:'UNKNOWN',frequency:1,unitCost:100000,coveredAmount:100000,claimCause:'INJURY',nationalHealthInsuranceStatus:'APPLIED',samsungCalculationInput:{...common,requiredCoverageConfirmed:true,contractBenefitCap:50000000,priorPaidBenefit:0}},{assumeEntireMedicalCostCovered:false,assumeNoPriorLimitUsage:false,assumeEachOccurrenceSeparate:false});
 expect(result).toMatchObject({ruleId:'G4-01',claim:80000});
});

const assumptions={assumeEntireMedicalCostCovered:false,assumeNoPriorLimitUsage:false,assumeEachOccurrenceSeparate:false};
const contract={insurer:'삼성화재',productName:'검산 샘플',inceptionDate:'2026-06-01',generation:5 as const,monthlyPremium:60000,renewalCycleMonths:null,reentryCycleMonths:null,coverages:[]};
const selections={...useAnalysisStore.getState().productCalculationSelections,gen1Product:'SAMSUNG_0904_2' as const,gen1D1Coverage:'INJURY' as const,gen4NonCoveredRider:'ENROLLED' as const,gen5SevereRider:'NOT_ENROLLED' as const,gen5NonSevereRider:'ENROLLED' as const,samsungGen23Variant:'standard' as const};
const baseUsage={id:'normal',treatmentName:'정상 통원',careSetting:'OUTPATIENT' as const,benefitClass:'COVERED' as const,severityClass:'UNKNOWN' as const,frequency:1,unitCost:100000,coveredAmount:100000,institutionType:'CLINIC_HOSPITAL' as const,healthInsuranceCopayRate:0.3,claimCause:'INJURY' as const,nationalHealthInsuranceStatus:'APPLIED' as const,samsungCalculationInput:{...common,requiredCoverageConfirmed:true,sameDayAggregationConfirmed:true,contractBenefitCap:50000000,perOccurrenceBenefitCap:200000,priorPaidBenefit:0,priorAnnualCount:0,priorServiceDays:0,daysSinceAccidentOrDiagnosis:1}};
it('gen1 screen adapter pays 95000 and retains precision exclusion confirmation',()=>expect(calculateSamsungComparisonItem({...contract,generation:1},selections,baseUsage,assumptions)).toMatchObject({claim:95000,ruleId:'G1-04'}));
it('gen1 uses the explicitly entered eligible amount',()=>expect(calculateSamsungComparisonItem({...contract,generation:1},selections,{...baseUsage,samsungCalculationInput:{...baseUsage.samsungCalculationInput,eligibleExpense:50000}},assumptions)).toMatchObject({claim:45000,ruleId:'G1-04'}));
it('gen1 outpatient uses the amount paid per visit, not the covered-amount field',()=>expect(calculateSamsungComparisonItem({...contract,generation:1},selections,{...baseUsage,unitCost:60000,coveredAmount:100000},assumptions)).toMatchObject({claim:55000,ruleId:'G1-04'}));
it('gen1 pays 0 and explains when the entered cause is not covered by the checked D1 rider',()=>expect(calculateSamsungComparisonItem({...contract,generation:1},{...selections,gen1D1Coverage:'DISEASE'},{...baseUsage,claimCause:'INJURY'},assumptions)).toMatchObject({claim:0,deductible:0,reasons:['선택한 진료의 원인(질병/상해)에 해당하는 D1 특약에 가입하지 않아 현재 계약은 보상하지 않습니다.']}));
it('gen4 screen adapter pays 80000 and applies remaining annual cap',()=>{
 expect(calculateSamsungComparisonItem({...contract,generation:4},selections,baseUsage,assumptions)).toMatchObject({claim:80000,ruleId:'G4-08'});
 expect(calculateSamsungComparisonItem({...contract,generation:4},selections,{...baseUsage,samsungCalculationInput:{...baseUsage.samsungCalculationInput,priorPaidBenefit:49990000}},assumptions).claim).toBe(10000);
});
it('gen5 covered needs no severe facts and compares independently',()=>{
 expect(calculateSamsungComparisonItem(contract,selections,baseUsage,assumptions)).toMatchObject({claim:70000,ruleId:'G5-02'});
 expect(calculateSamsungComparisonItem({...contract,generation:2},selections,baseUsage,assumptions).claim).toBeNull();
 expect(calculateSamsungComparisonItem({...contract,generation:2},selections,baseUsage,assumptions,true)).toMatchObject({claim:70000,ruleId:'G5-02'});
});
for(const generation of [2,3] as const) for(const variant of ['standard','selected2'] as const) for(const care of ['INPATIENT','OUTPATIENT','PRESCRIPTION'] as const) {
 it(`screen adapter gen${generation}/${variant}/${care}`,()=>{
 const usage={...baseUsage,careSetting:care==='INPATIENT'?'INPATIENT' as const:'OUTPATIENT' as const,gen23CareSetting:care,gen23CoveredCopay:100000,gen23NonCoveredExpense:0,gen23InpatientExcludingRoomDifference:100000,gen23RoomDifference:0,gen23PriorEligibleDeductible:0,gen23PriorPaidBenefit:0,gen23PriorAnnualCount:0,gen23ContractBenefitCap:50000000,gen23OutpatientBenefitCap:250000,gen23PrescriptionBenefitCap:50000,gen23OtherIndemnityPoliciesExist:false,gen23CoveragePeriod:'ACTIVE' as const,gen23CoveragePeriodConfirmed:true,gen23RequiredCoverageConfirmed:true,gen23PolicyExclusionsCleared:true,gen23SameDayAggregationConfirmed:true,gen23TreatmentType:'BASE' as const,gen23RiderEnrollmentStatus:'ENROLLED' as const,gen23Institution:'CLINIC' as const,gen23ThreeNonCoveredExcludedFromBaseConfirmed:true};
 expect(calculateSamsungComparisonItem({...contract,generation},{...selections,samsungGen23Variant:variant},usage,assumptions).claim).toBe(care==='PRESCRIPTION'?50000:variant==='standard'?80000:90000);
 const unknownPrior={...usage,gen23PriorPaidBenefit:undefined,gen23PriorAnnualCount:undefined,gen23PriorEligibleDeductible:undefined};
 expect(calculateSamsungComparisonItem({...contract,generation},{...selections,samsungGen23Variant:variant},unknownPrior,{...assumptions,assumeNoPriorLimitUsage:true}).claim).toBe(care==='PRESCRIPTION'?50000:variant==='standard'?80000:90000);
 });
}
it('maps confirmed generic treatment fields into a generation-2 base outpatient calculation',()=>{
 const usage={...baseUsage,gen23ContractBenefitCap:50000000,gen23OutpatientBenefitCap:250000,gen23PrescriptionBenefitCap:50000,gen23OtherIndemnityPoliciesExist:false,gen23CoveragePeriod:'ACTIVE' as const,gen23CoveragePeriodConfirmed:true,gen23RequiredCoverageConfirmed:true,gen23PolicyExclusionsCleared:true,gen23SameDayAggregationConfirmed:true,gen23ThreeNonCoveredExcludedFromBaseConfirmed:true};
 expect(calculateSamsungComparisonItem({...contract,generation:2},selections,usage,{...assumptions,assumeNoPriorLimitUsage:true}).claim).toBe(80000);
});
it('gen5 nonsevere MRI annual cap, no-rider and unknown facts',()=>{
 const usage={...baseUsage,benefitClass:'NON_COVERED' as const,samsungGen5Facts:{specialCaseDisease:'NO' as const,treatmentRelatedness:'UNKNOWN' as const,policyExcludedTreatment:'NO' as const,threeNonCoveredCategory:'MRI' as const},samsungCalculationInput:{...baseUsage.samsungCalculationInput,priorPaidBenefit:1990000}};
 expect(calculateSamsungComparisonItem(contract,selections,usage,assumptions)).toMatchObject({claim:10000,ruleId:'G5-08'});
 expect(calculateSamsungComparisonItem(contract,{...selections,gen5NonSevereRider:'NOT_ENROLLED'},usage,assumptions).claim).toBe(0);
 expect(calculateSamsungComparisonItem(contract,selections,{...usage,samsungGen5Facts:undefined},assumptions).claim).toBeNull();
});
it('recalculates every occurrence and includes frequency in annual totals',()=>{
 const result=calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,frequency:2}],{...assumptions,assumeEachOccurrenceSeparate:true});
 expect(result).toMatchObject({complete:true,medicalCost:200000,currentClaimTotal:140000,targetClaimTotal:140000,currentTotal:780000,targetTotal:480000});
});
it('carries a shared rule annual benefit limit into the next treatment',()=>{
 const nearCap={...baseUsage,samsungCalculationInput:{...baseUsage.samsungCalculationInput,priorPaidBenefit:49990000}};
 const result=calculateSamsungAnnualComparison({...contract,generation:4},35000,[],selections,[nearCap,{...nearCap,id:'second'}],assumptions);
 expect(result.currentClaimTotal).toBe(10000);
 expect(result.items.map(item=>item.currentClaimTotal)).toEqual([10000,0]);
 expect(result.items.map(item=>item.targetClaimTotal)).toEqual([70000,70000]);
});
it('finds break-even by rerunning the Samsung annual engine for each frequency',()=>{
 const result=calculateSamsungAnnualBreakEven({...contract,generation:4},35000,[],selections,[baseUsage],{...assumptions,assumeEachOccurrenceSeparate:true},baseUsage.id);
  expect(result).toMatchObject({status:'AVAILABLE',threshold:30,exactTieFrequencies:[30],rangeChecked:{min:0,max:SAMSUNG_BREAK_EVEN_MAX_FREQUENCY}});
});
it('fails closed for invalid annual comparison inputs',()=>{
 expect(calculateSamsungAnnualComparison({...contract,monthlyPremium:-1},35000,[],selections,[baseUsage],assumptions)).toMatchObject({complete:false,currentTotal:null,targetTotal:null});
 expect(calculateSamsungAnnualComparison(contract,Number.NaN,[],selections,[baseUsage],assumptions)).toMatchObject({complete:false,currentTotal:null,targetTotal:null});
 expect(calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,frequency:1.5}],assumptions)).toMatchObject({complete:false,currentClaimTotal:null,targetClaimTotal:null,currentTotal:null,targetTotal:null});
 expect(calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,frequency:10001}],assumptions)).toMatchObject({complete:false,currentClaimTotal:null,targetClaimTotal:null,currentTotal:null,targetTotal:null});
 expect(calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,unitCost:Number.NaN}],assumptions)).toMatchObject({complete:false,medicalCost:null,currentTotal:null,targetTotal:null});
 expect(calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,unitCost:Number.NaN,patientPaidAmount:100000}],assumptions)).toMatchObject({complete:false,currentClaimTotal:null,targetClaimTotal:null,currentTotal:null,targetTotal:null});
});
it('does not run an ambiguous break-even search when usage ids are duplicated',()=>{
 expect(calculateSamsungAnnualBreakEven(contract,35000,[],selections,[baseUsage,{...baseUsage}],assumptions,baseUsage.id)).toBeNull();
});
it('holds repeated treatment until separate occurrences are confirmed',()=>{
 const result=calculateSamsungAnnualComparison(contract,35000,[],selections,[{...baseUsage,frequency:2}],assumptions);
 expect(result.complete).toBe(false);
 expect(result.items[0].current.reasons[0]).toContain('별도 방문');
});
it('shares the fourth-generation covered annual cap across inpatient and outpatient rules',()=>{
 const commonInput={...baseUsage.samsungCalculationInput,priorPaidBenefit:49900000};
 const inpatient={...baseUsage,id:'inpatient',careSetting:'INPATIENT' as const,samsungCalculationInput:commonInput};
 const outpatient={...baseUsage,id:'outpatient',samsungCalculationInput:commonInput};
 const result=calculateSamsungAnnualComparison({...contract,generation:4},35000,[],selections,[inpatient,outpatient],assumptions);
 expect(result.currentClaimTotal).toBe(100000);
 expect(result.items.map(item=>item.currentClaimTotal)).toEqual([80000,20000]);
});
it('counts multiple treatments in the same visit as one annual visit',()=>{
 const severe={...baseUsage,benefitClass:'NON_COVERED' as const,sameDayGroupId:'visit-1',samsungGen5Facts:{specialCaseDisease:'YES' as const,treatmentRelatedness:'RELATED' as const,policyExcludedTreatment:'NO' as const},samsungCalculationInput:{...baseUsage.samsungCalculationInput,priorAnnualCount:99,priorPaidBenefit:0}};
 const result=calculateSamsungAnnualComparison(contract,35000,['SPECIAL_RIDER_1'],{...selections,gen5SevereRider:'ENROLLED'},[severe,{...severe,id:'same-visit-second'}],assumptions);
 expect(result.currentClaimTotal).toBe(140000);
});
