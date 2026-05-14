import {
  getNextStage,
  canAdvanceStage,
  createStageRecord,
  getStageCompletion,
  isPipelineComplete,
} from './partPipeline';

describe('getNextStage', () => {
  test('설계 다음은 구매', () => {
    expect(getNextStage('설계')).toBe('구매');
  });
  test('납품 다음은 null (완료)', () => {
    expect(getNextStage('납품')).toBeNull();
  });
  test('알 수 없는 단계는 null', () => {
    expect(getNextStage('없는단계')).toBeNull();
  });
});

describe('canAdvanceStage', () => {
  test('QC 미완료면 제조로 진입 불가', () => {
    const events = [];
    expect(canAdvanceStage('구매', '제조', events, 'PART-001')).toBe(false);
  });
  test('QC 합격 기록 있으면 제조 진입 가능', () => {
    const events = [
      { partId: 'PART-001', stage: 'QC', status: '합격', completedAt: '2026-05-10' },
    ];
    expect(canAdvanceStage('구매', '제조', events, 'PART-001')).toBe(true);
  });
  test('납품 진입도 QC 합격 필요', () => {
    expect(canAdvanceStage('제조', '납품', [], 'PART-001')).toBe(false);
  });
  test('일반 단계 전환(설계→구매)은 항상 가능', () => {
    expect(canAdvanceStage('설계', '구매', [], 'PART-001')).toBe(true);
  });
  test('QC→제조는 QC 합격 필요', () => {
    expect(canAdvanceStage('QC', '제조', [], 'PART-001')).toBe(false);
  });
});

describe('createStageRecord', () => {
  test('필수 필드를 가진 레코드 반환', () => {
    const record = createStageRecord('PART-001', 'QC', '홍길동', { '치수 검사': true }, '합격');
    expect(record.partId).toBe('PART-001');
    expect(record.stage).toBe('QC');
    expect(record.actor).toBe('홍길동');
    expect(record.status).toBe('합격');
    expect(record.checklistResults).toEqual({ '치수 검사': true });
    expect(record.id).toBeTruthy();
    expect(record.completedAt).toBeTruthy();
  });
  test('기본값으로 완료 상태 반환', () => {
    const record = createStageRecord('PART-001', '설계', '홍길동');
    expect(record.status).toBe('완료');
  });
});

describe('getStageCompletion', () => {
  test('완료된 단계 목록 반환', () => {
    const events = [
      { partId: 'PART-001', stage: '설계', status: '완료' },
      { partId: 'PART-001', stage: '구매', status: '완료' },
      { partId: 'PART-002', stage: '설계', status: '완료' },
    ];
    const completed = getStageCompletion('PART-001', events);
    expect(completed).toContain('설계');
    expect(completed).toContain('구매');
    expect(completed).not.toContain('QC');
    expect(completed).toHaveLength(2);
  });
  test('합격 상태도 완료로 처리', () => {
    const events = [{ partId: 'PART-001', stage: 'QC', status: '합격' }];
    const completed = getStageCompletion('PART-001', events);
    expect(completed).toContain('QC');
  });
});

describe('isPipelineComplete', () => {
  test('납품 완료면 true', () => {
    const events = [{ partId: 'PART-001', stage: '납품', status: '완료' }];
    expect(isPipelineComplete('PART-001', events)).toBe(true);
  });
  test('납품 합격도 true', () => {
    const events = [{ partId: 'PART-001', stage: '납품', status: '합격' }];
    expect(isPipelineComplete('PART-001', events)).toBe(true);
  });
  test('납품 미완료면 false', () => {
    expect(isPipelineComplete('PART-001', [])).toBe(false);
  });
});
