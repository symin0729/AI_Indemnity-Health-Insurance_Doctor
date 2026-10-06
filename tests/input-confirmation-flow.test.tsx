// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PlannerInput from '../src/pages/M02InputPage/M02InputPage';
import PlannerConfirm from '../src/pages/M03ConfirmPage/M03ConfirmPage';
import ConsumerInput from '../src/consumer/pages/M02InputPage/M02InputPage';
import ConsumerConfirm from '../src/consumer/pages/M03ConfirmPage/M03ConfirmPage';
import { useAnalysisStore as plannerStore } from '../src/store/useAnalysisStore';
import { useAnalysisStore as consumerStore } from '../src/consumer/store/useAnalysisStore';
import { confirmedContractFacts } from './fixtures/confirmed-contract-facts';

beforeEach(() => {
  plannerStore.getState().resetAnalysis();
  consumerStore.getState().resetAnalysis();
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

const modes = [
  { mode: '설계사용', base: '', store: plannerStore, Input: PlannerInput, Confirm: PlannerConfirm },
  { mode: '소비자용', base: '/consumer', store: consumerStore, Input: ConsumerInput, Confirm: ConsumerConfirm },
];

describe.each(modes)('$mode: 가정 페이지와 원래 입력 확인 페이지를 분리', ({ base, store, Input, Confirm }) => {
  const setup = (start = 'input') => {
    store.setState({
      contract: { insurer: '삼성화재', productName: '대표 상품', inceptionDate: '2022-01-01', generation: 4, monthlyPremium: 50000, renewalCycleMonths: 12, reentryCycleMonths: 60, coverages: [] },
      target5GMonthlyPremium: 30000, target5GCoverages: [],
      usages: [{ id: 'shared', treatmentName: '검증 치료', careSetting: 'OUTPATIENT', benefitClass: 'COVERED', severityClass: 'UNKNOWN', frequency: 2, unitCost: 100000, coveredAmount: 100000, claimCause: 'DISEASE', institutionType: 'CLINIC_HOSPITAL', nationalHealthInsuranceStatus: 'APPLIED', healthInsuranceCopayRate: 0.3, samsungCalculationInput: { policyExclusionsCleared: true } }],
      calculationAssumptions: { comparisonBasis: 'FRESH_YEAR', assumeSingleIndemnityContract: true, assumeEntireMedicalCostCovered: false, assumeNoPriorLimitUsage: false, assumeEachOccurrenceSeparate: true, currentContractFacts: confirmedContractFacts, targetContractFacts: confirmedContractFacts },
    });
    window.history.replaceState(null, '', `${base}/input#input-step-4`);
    render(<MemoryRouter initialEntries={[`${base}/${start}`]}><Routes>
      <Route path={`${base}/input`} element={<Input />} />
      <Route path={`${base}/confirm`} element={<Confirm />} />
      <Route path={`${base}/result`} element={<h1>검증 결과 화면</h1>} />
    </Routes></MemoryRouter>);
    return userEvent.setup();
  };

  it('4단계에서 가정을 선택하고 5단계의 네 카드·최종 확인을 거쳐 결과로 이동한다', async () => {
    const user = setup();
    expect(screen.getByRole('heading', { name: '계산에 적용할 가정을 선택해주세요' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '계산 전 정보를 확인해주세요.' })).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: /^보장 제외 사유가 없다고 가정/ }));
    await user.click(screen.getByRole('button', { name: '입력 정보 확인하기' }));
    expect(screen.getByRole('heading', { name: '계산 전 정보를 확인해주세요.' })).toBeTruthy();
    for (const name of ['현재 계약 확인', '5세대 계약전환 조건 확인', '예정 치료 확인', '계산 기준 및 추가 확인']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy();
    }
    const assumptions = screen.getByRole('region', { name: '선택한 계산 가정 확인' });
    expect(assumptions.textContent).toMatch(/보장 제외 사유가 없다(고 가정합니다|는 가정 적용)/);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    const calculate = screen.getByRole('button', { name: '이 조건으로 비교 계산하기' }) as HTMLButtonElement;
    expect(calculate.disabled).toBe(true);
    await user.click(screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }));
    expect(calculate.disabled).toBe(false);
    await user.click(calculate);
    expect(await screen.findByRole('heading', { name: '검증 결과 화면' }, { timeout: 2500 })).toBeTruthy();
  });

  it('가정 수정은 4단계로 돌아가며, 다시 확인 페이지에 오면 최종 확인을 다시 요구한다', async () => {
    const user = setup('confirm');
    await user.click(screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }));
    await user.click(screen.getByRole('button', { name: '명시적 계산 가정 수정하기' }));
    expect(screen.getByRole('heading', { name: '계산에 적용할 가정을 선택해주세요' })).toBeTruthy();
    await user.click(screen.getByRole('checkbox', { name: /^입력한 환자부담금 전액/ }));
    await user.click(screen.getByRole('button', { name: '입력 정보 확인하기' }));
    expect((screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }) as HTMLInputElement).checked).toBe(false);
    expect(store.getState().calculationAssumptions.assumeEntireMedicalCostCovered).toBe(true);
  });

  it('추가 가정을 선택하지 않아도 입력 확인을 거쳐 진행할 수 있다', async () => {
    const user = setup();
    await user.click(screen.getByRole('checkbox', { name: /^반복 치료를 각각 별도 방문/ }));
    expect(screen.getByRole('region', { name: '선택한 계산 가정 요약' }).textContent).toContain('선택한 추가 가정이 없습니다');
    await user.click(screen.getByRole('button', { name: '입력 정보 확인하기' }));
    await user.click(screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }));
    expect((screen.getByRole('button', { name: '이 조건으로 비교 계산하기' }) as HTMLButtonElement).disabled).toBe(false);
    expect(store.getState().calculationAssumptions.assumeEachOccurrenceSeparate).toBe(false);
  });

  it('입력 확인 중 계약값이 바뀌면 확인을 해제하고 결과·챗봇 단계는 계산 전 잠근다', async () => {
    const user = setup('confirm');
    expect((screen.getByRole('button', { name: '6단계 비교 결과' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '7단계 챗봇' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: '5단계 입력 확인' }).getAttribute('aria-current')).toBe('step');
    await user.click(screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }));
    act(() => store.getState().setTarget5GMonthlyPremium(25000));
    expect((screen.getByRole('checkbox', { name: /^입력한 계약·담보·예정 치료/ }) as HTMLInputElement).checked).toBe(false);
    expect(within(screen.getByRole('main')).getByText(/월 25,000원/)).toBeTruthy();
  });
});
