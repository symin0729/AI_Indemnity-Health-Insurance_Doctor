import fs from 'node:fs';
import { expect, it } from 'vitest';
import groups from '../knowledge/rules/samsung/accumulation-groups.json';
import { samsungLimitGroups } from '../src/engine/samsungLimitGroups';
import type { MedicalUsage } from '../src/domain/medical';

it('49개 규칙마다 근거와 누적 범위가 일대일로 등록되어 있다', () => {
  const directory = 'knowledge/drafts/samsung/executable-specs';
  const rules = fs.readdirSync(directory).filter(file => file.endsWith('.json')).flatMap(file => JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8')).rules);
  expect(rules).toHaveLength(49);
  expect(Object.keys(groups).sort()).toEqual(rules.map(rule => rule.ruleId).sort());
  for (const rule of rules) {
    expect(rule.accumulation, rule.ruleId).toEqual(groups[rule.ruleId as keyof typeof groups]);
    expect(rule.source.pdfPage, rule.ruleId).toBeGreaterThan(0);
    expect(rule.source.article, rule.ruleId).toBeTruthy();
    for (const key of ['benefit', 'count', 'serviceDays', 'deductible']) expect(typeof rule.accumulation[key]).toBe('string');
  }
});
it('공유하는 연 한도와 독립적인 상해·질병 범위를 구분한다', () => {
  const usage = { claimCause: 'INJURY', careSetting: 'OUTPATIENT' } as MedicalUsage;
  expect(samsungLimitGroups(5, 'G5-01', usage).benefit).toBe(samsungLimitGroups(5, 'G5-02', usage).benefit);
  expect(samsungLimitGroups(5, 'G5-01', usage).benefit).not.toBe(samsungLimitGroups(5, 'G5-01', { ...usage, claimCause: 'DISEASE' }).benefit);
  expect(samsungLimitGroups(4, 'G4-01', usage).deductible).toBe(samsungLimitGroups(4, 'G4-02', usage).deductible);
});
