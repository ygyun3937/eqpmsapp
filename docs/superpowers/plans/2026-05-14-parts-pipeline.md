# 자재/파트 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계→구매→QC→제조→납품 5단계 파이프라인 + QR 스캔 기반 최소 입력 자재 관리 시스템 구현

**Architecture:** App.js에 `pipelineParts` / `partEvents` 상태 추가 (기존 `parts` 스페어파트 청구 유지). PartsListView를 탭 구조로 개편. 신규 모달 4개 추가. `qrcode` npm으로 QR dataURL 생성. GAS에 `UPDATE_PIPELINE_PARTS` / `UPDATE_PART_EVENTS` 액션 추가.

**Tech Stack:** React 19, Tailwind CSS 3, qrcode@1.5.x, Lucide Icons, GAS + Google Sheets

---

## 파일 구조 (변경/신규)

```
src/
├── constants/index.js          ← PART_PIPELINE_PHASES, PART_TYPES 추가
├── utils/
│   ├── partPipeline.js         ← NEW: 파이프라인 순수 헬퍼 함수
│   ├── qr.js                   ← NEW: QR dataURL 생성
│   └── partDocuments.js        ← NEW: QC 성적서·납품확인서 HTML 템플릿
├── components/
│   ├── modals/
│   │   ├── PartPipelineModal.js  ← NEW: 파트 등록 (체크리스트 정의 포함)
│   │   ├── QRLabelModal.js       ← NEW: QR 라벨 미리보기 + 인쇄
│   │   ├── PartStageModal.js     ← NEW: 단계 전환 (QC 게이트 포함)
│   │   └── MobilePartPipelineModal.js ← NEW: 모바일 QC 스캔 뷰
│   └── views/
│       └── PartsListView.js    ← MODIFY: 탭 구조 + 파이프라인 뷰 추가
├── App.js                      ← MODIFY: 상태·핸들러·모달 추가
docs/
└── gas-backend.gs              ← MODIFY: 신규 액션 2개 추가
```

---

## Phase A: 기반 (Tasks 1–4)

### Task 1: qrcode 라이브러리 설치 + 상수 추가

**Files:**
- Modify: `package.json` (npm install)
- Modify: `src/constants/index.js`

- [ ] **Step 1: qrcode 설치**

```bash
npm install qrcode
```

Expected output: `added 1 package` (또는 유사)

- [ ] **Step 2: constants/index.js에 상수 추가**

`src/constants/index.js` 파일 맨 아래에 추가:

```js
// === 파트 파이프라인 (신규 제작/구매 자재 생애주기) ===
export const PART_PIPELINE_PHASES = ['설계', '구매', 'QC', '제조', '납품'];
export const PART_TYPES = ['설계외주형', '구매형'];

// QC 단계 인덱스 — 이전 단계에서 QC 미완료 시 제조 진입 차단
export const PART_QC_INDEX = 2; // PART_PIPELINE_PHASES.indexOf('QC')

// 단계별 기본 체크리스트 템플릿 (자재 타입별)
export const DEFAULT_CHECKLISTS = {
  '설계외주형': {
    설계: ['도면 완성', '설계 검토 완료', '외주사 선정'],
    구매: ['발주서 발행', '납기일 확인', '대금 처리'],
    QC: ['치수 검사', '표면 처리 확인', '재질 확인', '도면 번호 일치'],
    제조: ['조립 완료', '기능 테스트', '외관 검사'],
    납품: ['포장 완료', '납품서 발행', '고객 서명'],
  },
  '구매형': {
    설계: ['사양 확정', '공급처 선정'],
    구매: ['발주서 발행', '납기일 확인'],
    QC: ['외관 검사', '규격/사양 확인', '수량 확인'],
    제조: ['조립/통합 완료', '기능 테스트'],
    납품: ['포장 완료', '납품서 발행', '고객 서명'],
  },
};
```

- [ ] **Step 3: 빌드 오류 없는지 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `Compiled successfully` 또는 기존과 동일한 warning만

- [ ] **Step 4: 커밋**

```bash
git add src/constants/index.js package.json package-lock.json
git commit -m "feat: PART_PIPELINE_PHASES 상수 + qrcode 패키지 추가"
```

---

### Task 2: utils/partPipeline.js — 순수 헬퍼 함수

**Files:**
- Create: `src/utils/partPipeline.js`
- Create: `src/utils/partPipeline.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성**

`src/utils/partPipeline.test.js`:

```js
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
});

describe('canAdvanceStage', () => {
  test('QC 미완료면 제조로 진입 불가', () => {
    const events = []; // QC 완료 기록 없음
    expect(canAdvanceStage('구매', '제조', events, 'PART-001')).toBe(false);
  });
  test('QC 완료(합격)면 제조 진입 가능', () => {
    const events = [
      { partId: 'PART-001', stage: 'QC', status: '합격', completedAt: '2026-05-10' },
    ];
    expect(canAdvanceStage('구매', '제조', events, 'PART-001')).toBe(true);
  });
  test('일반 단계 전환은 항상 가능', () => {
    expect(canAdvanceStage('설계', '구매', [], 'PART-001')).toBe(true);
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
});

describe('getStageCompletion', () => {
  test('완료된 단계 목록 반환', () => {
    const events = [
      { partId: 'PART-001', stage: '설계', status: '완료' },
      { partId: 'PART-001', stage: '구매', status: '완료' },
    ];
    const completed = getStageCompletion('PART-001', events);
    expect(completed).toContain('설계');
    expect(completed).toContain('구매');
    expect(completed).not.toContain('QC');
  });
});

describe('isPipelineComplete', () => {
  test('납품 완료면 true', () => {
    const events = [{ partId: 'PART-001', stage: '납품', status: '완료' }];
    expect(isPipelineComplete('PART-001', events)).toBe(true);
  });
  test('납품 미완료면 false', () => {
    expect(isPipelineComplete('PART-001', [])).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test -- --testPathPattern=partPipeline --watchAll=false 2>&1 | tail -10
```

Expected: `FAIL` (함수 미구현)

- [ ] **Step 3: partPipeline.js 구현**

`src/utils/partPipeline.js`:

```js
import { PART_PIPELINE_PHASES, PART_QC_INDEX } from '../constants';

export const getNextStage = (currentStage) => {
  const idx = PART_PIPELINE_PHASES.indexOf(currentStage);
  if (idx < 0 || idx >= PART_PIPELINE_PHASES.length - 1) return null;
  return PART_PIPELINE_PHASES[idx + 1];
};

// QC 게이트: 구매→제조 직접 이동 차단. 반드시 QC 합격 기록 필요.
export const canAdvanceStage = (fromStage, toStage, partEvents, partId) => {
  const toIdx = PART_PIPELINE_PHASES.indexOf(toStage);
  if (toIdx > PART_QC_INDEX) {
    const qcPassed = partEvents.some(
      (e) => e.partId === partId && e.stage === 'QC' && e.status === '합격'
    );
    if (!qcPassed) return false;
  }
  return true;
};

export const createStageRecord = (partId, stage, actor, checklistResults = {}, status = '완료', notes = '', photoUrls = '') => ({
  id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  partId,
  stage,
  status,
  actor,
  completedAt: new Date().toISOString(),
  checklistResults,
  notes,
  photoUrls,
  aiDocUrl: '',
});

export const getStageCompletion = (partId, partEvents) =>
  partEvents
    .filter((e) => e.partId === partId && (e.status === '완료' || e.status === '합격'))
    .map((e) => e.stage);

export const isPipelineComplete = (partId, partEvents) =>
  partEvents.some((e) => e.partId === partId && e.stage === '납품' && (e.status === '완료' || e.status === '합격'));
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- --testPathPattern=partPipeline --watchAll=false 2>&1 | tail -10
```

Expected: `PASS`, `Tests: 8 passed`

- [ ] **Step 5: 커밋**

```bash
git add src/utils/partPipeline.js src/utils/partPipeline.test.js
git commit -m "feat: partPipeline 헬퍼 + 테스트 (QC 게이트 로직 포함)"
```

---

### Task 3: utils/qr.js — QR dataURL 생성

**Files:**
- Create: `src/utils/qr.js`

- [ ] **Step 1: qr.js 작성**

`src/utils/qr.js`:

```js
import QRCode from 'qrcode';

// partId를 포함한 URL로 QR 생성. 앱이 서버에 배포된 후 실제 URL로 변경 가능.
// 개발 환경에서는 localhost:3001/parts/{partId} 형태.
const getPartUrl = (partId) => {
  const base = window.location.origin;
  return `${base}?part=${partId}`;
};

// SVG 문자열로 반환 (인쇄 품질 최적)
export const generateQRSvg = async (partId) => {
  try {
    return await QRCode.toString(getPartUrl(partId), { type: 'svg', width: 200, margin: 1 });
  } catch (err) {
    console.error('QR SVG 생성 실패:', err);
    return '';
  }
};

// dataURL(PNG)로 반환 (img src에 직접 사용)
export const generateQRDataUrl = async (partId) => {
  try {
    return await QRCode.toDataURL(getPartUrl(partId), { width: 200, margin: 1 });
  } catch (err) {
    console.error('QR dataURL 생성 실패:', err);
    return '';
  }
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/utils/qr.js
git commit -m "feat: QR dataURL/SVG 생성 유틸 추가"
```

---

### Task 4: App.js — pipelineParts / partEvents 상태 + 핸들러

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: import 추가**

`src/App.js` 상단 import 섹션에 추가 (기존 lazy import 목록 아래):

```js
const PartPipelineModal = lazy(() => import('./components/modals/PartPipelineModal'));
const QRLabelModal = lazy(() => import('./components/modals/QRLabelModal'));
const PartStageModal = lazy(() => import('./components/modals/PartStageModal'));
const MobilePartPipelineModal = lazy(() => import('./components/modals/MobilePartPipelineModal'));
```

그리고 utils import에 추가:

```js
import { getNextStage, canAdvanceStage, createStageRecord } from './utils/partPipeline';
```

- [ ] **Step 2: 데이터 상태 추가**

`src/App.js`에서 `const [parts, setParts] = useState([]);` 바로 다음 줄에 추가:

```js
const [pipelineParts, setPipelineParts] = useState([]);
const [partEvents, setPartEvents] = useState([]);
```

- [ ] **Step 3: 모달 상태 추가**

`src/App.js`에서 `const [isPartModalOpen, setIsPartModalOpen] = useState(false);` 바로 다음에 추가:

```js
const [isPipelinePartModalOpen, setIsPipelinePartModalOpen] = useState(false);
const [isQRLabelModalOpen, setIsQRLabelModalOpen] = useState(false);
const [qrLabelTarget, setQrLabelTarget] = useState(null);
const [isPartStageModalOpen, setIsPartStageModalOpen] = useState(false);
const [partStageTarget, setPartStageTarget] = useState(null); // { part, nextStage }
const [pipelinePartToDelete, setPipelinePartToDelete] = useState(null);
```

- [ ] **Step 4: GAS 로드 시 pipelineParts/partEvents 불러오기**

App.js 내 `loadFromGoogleDB` 호출 후 데이터를 상태에 설정하는 블록을 찾아서 (보통 `setProjects`, `setParts` 등을 호출하는 곳), 다음을 추가:

```js
if (Array.isArray(data.pipelineParts)) setPipelineParts(data.pipelineParts);
if (Array.isArray(data.partEvents)) setPartEvents(data.partEvents);
```

- [ ] **Step 5: syncPipelineParts / syncPartEvents 헬퍼 추가**

`handleUpdatePartStatus` (line ~1115) 바로 다음에 추가:

```js
const syncPipelineParts = (updated) => {
  setPipelineParts(updated);
  saveToGoogleDB('UPDATE_PIPELINE_PARTS', updated);
};

const syncPartEvents = (updated) => {
  setPartEvents(updated);
  saveToGoogleDB('UPDATE_PART_EVENTS', updated);
};
```

- [ ] **Step 6: 파이프라인 핸들러 추가**

`syncPartEvents` 바로 다음에 추가:

```js
const handleAddPipelinePart = (newPart) => {
  const selectedProject = projects.find(p => p.id === newPart.projectId);
  const part = {
    ...newPart,
    id: generateUniqueId('PLT'),
    projectName: selectedProject ? selectedProject.name : t('알 수 없는 프로젝트', 'Unknown Project'),
    currentStage: '설계',
    date: TODAY.toISOString().split('T')[0],
  };
  const updatedParts = [part, ...pipelineParts];
  syncPipelineParts(updatedParts);

  // 설계 단계 시작 이벤트 자동 생성
  const startEvent = createStageRecord(part.id, '설계', currentUser.name || currentUser.id, {}, '진행중');
  syncPartEvents([startEvent, ...partEvents]);

  setIsPipelinePartModalOpen(false);
  showToast(t('파트가 등록되었습니다.', 'Part registered.'));
};

const handleAdvancePipelineStage = (partId, nextStage, stageData) => {
  const { checklistResults = {}, notes = '', photoUrls = '', status = '완료' } = stageData;

  if (!canAdvanceStage(
    pipelineParts.find(p => p.id === partId)?.currentStage,
    nextStage,
    partEvents,
    partId
  )) {
    showToast(t('QC 합격 기록이 없으면 제조 단계로 진입할 수 없습니다.', 'QC must pass before manufacturing.'));
    return;
  }

  const event = createStageRecord(partId, nextStage === '납품' ? '납품' : pipelineParts.find(p => p.id === partId)?.currentStage, currentUser.name || currentUser.id, checklistResults, status, notes, photoUrls);
  const updatedEvents = [event, ...partEvents];
  syncPartEvents(updatedEvents);

  const updatedParts = pipelineParts.map(p =>
    p.id === partId ? { ...p, currentStage: nextStage } : p
  );
  syncPipelineParts(updatedParts);

  setIsPartStageModalOpen(false);
  setPartStageTarget(null);
  showToast(t(`${nextStage} 단계로 이동했습니다.`, `Moved to ${nextStage}.`));
};

const handleRejectPipelineStage = (partId, fromStage, notes) => {
  // 불합격: 이전 단계(구매)로 복귀
  const prevStageMap = { QC: '구매', 제조: 'QC', 납품: '제조' };
  const prevStage = prevStageMap[fromStage] || fromStage;

  const event = createStageRecord(partId, fromStage, currentUser.name || currentUser.id, {}, '불합격', notes);
  syncPartEvents([event, ...partEvents]);

  const updatedParts = pipelineParts.map(p =>
    p.id === partId ? { ...p, currentStage: prevStage } : p
  );
  syncPipelineParts(updatedParts);

  setIsPartStageModalOpen(false);
  setPartStageTarget(null);
  showToast(t(`${fromStage} 불합격 — ${prevStage} 단계로 반려됐습니다.`, `${fromStage} failed — returned to ${prevStage}.`));
};

const handleDeletePipelinePart = () => {
  if (!pipelinePartToDelete) return;
  syncPipelineParts(pipelineParts.filter(p => p.id !== pipelinePartToDelete.id));
  syncPartEvents(partEvents.filter(e => e.partId !== pipelinePartToDelete.id));
  setPipelinePartToDelete(null);
  showToast(t('파트가 삭제되었습니다.', 'Part deleted.'));
};
```

- [ ] **Step 7: PartsListView props 업데이트**

App.js에서 `<PartsListView` 렌더링 부분 (line ~2096)을 다음으로 교체:

```jsx
{activeTab === 'parts' && (
  <PartsListView
    parts={parts}
    pipelineParts={pipelineParts}
    partEvents={partEvents}
    getStatusColor={getStatusColor}
    onUpdateStatus={handleUpdatePartStatus}
    onDeletePart={(part) => setPartToDelete(part)}
    onAddClick={() => setIsPartModalOpen(true)}
    onAddPipelinePart={() => setIsPipelinePartModalOpen(true)}
    onOpenStageModal={(part, nextStage) => { setPartStageTarget({ part, nextStage }); setIsPartStageModalOpen(true); }}
    onOpenQRLabel={(part) => { setQrLabelTarget(part); setIsQRLabelModalOpen(true); }}
    onDeletePipelinePart={(part) => setPipelinePartToDelete(part)}
    currentUser={currentUser}
    t={t}
  />
)}
```

- [ ] **Step 8: 신규 모달 렌더링 추가**

App.js에서 기존 `{isPartModalOpen && <PartModal ...` 바로 다음에 추가:

```jsx
{isPipelinePartModalOpen && (
  <PartPipelineModal
    projects={projects}
    onClose={() => setIsPipelinePartModalOpen(false)}
    onSubmit={handleAddPipelinePart}
    t={t}
  />
)}
{isQRLabelModalOpen && qrLabelTarget && (
  <QRLabelModal
    part={qrLabelTarget}
    onClose={() => { setIsQRLabelModalOpen(false); setQrLabelTarget(null); }}
    t={t}
  />
)}
{isPartStageModalOpen && partStageTarget && (
  isMobileMode
    ? <MobilePartPipelineModal
        part={partStageTarget.part}
        nextStage={partStageTarget.nextStage}
        partEvents={partEvents}
        onClose={() => { setIsPartStageModalOpen(false); setPartStageTarget(null); }}
        onAdvance={handleAdvancePipelineStage}
        onReject={handleRejectPipelineStage}
        t={t}
      />
    : <PartStageModal
        part={partStageTarget.part}
        nextStage={partStageTarget.nextStage}
        partEvents={partEvents}
        onClose={() => { setIsPartStageModalOpen(false); setPartStageTarget(null); }}
        onAdvance={handleAdvancePipelineStage}
        onReject={handleRejectPipelineStage}
        t={t}
      />
)}
{pipelinePartToDelete && (
  <DeleteConfirmModal
    type="part"
    item={pipelinePartToDelete}
    onClose={() => setPipelinePartToDelete(null)}
    onConfirm={handleDeletePipelinePart}
    t={t}
  />
)}
```

- [ ] **Step 9: 커밋**

```bash
git add src/App.js
git commit -m "feat: App.js에 pipelineParts/partEvents 상태 + 파이프라인 핸들러 추가"
```

---

## Phase B: UI 컴포넌트 (Tasks 5–8)

### Task 5: PartPipelineModal — 파트 등록 (체크리스트 정의)

**Files:**
- Create: `src/components/modals/PartPipelineModal.js`

- [ ] **Step 1: PartPipelineModal.js 작성**

`src/components/modals/PartPipelineModal.js`:

```jsx
import React, { useState, memo } from 'react';
import { Package, Plus, X } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';
import { PART_TYPES, DEFAULT_CHECKLISTS, PART_PIPELINE_PHASES } from '../../constants';

const PartPipelineModal = memo(function PartPipelineModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    projectId: projects[0]?.id || '',
    partName: '',
    partNumber: '',
    quantity: 1,
    urgency: 'Medium',
    type: '구매형',
    author: '',
  });

  const [checklists, setChecklists] = useState(() => ({ ...DEFAULT_CHECKLISTS['구매형'] }));
  const [newItem, setNewItem] = useState({ stage: 'QC', text: '' });

  const handleTypeChange = (type) => {
    setData(d => ({ ...d, type }));
    setChecklists({ ...DEFAULT_CHECKLISTS[type] });
  };

  const addChecklistItem = () => {
    if (!newItem.text.trim()) return;
    setChecklists(c => ({
      ...c,
      [newItem.stage]: [...(c[newItem.stage] || []), newItem.text.trim()],
    }));
    setNewItem(n => ({ ...n, text: '' }));
  };

  const removeChecklistItem = (stage, idx) => {
    setChecklists(c => ({ ...c, [stage]: c[stage].filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...data, pipelineConfig: { checklists } });
  };

  return (
    <ModalWrapper
      title={t('파트 등록', 'Register Part')}
      icon={<Package size={18} />}
      color="amber"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t('QR 포함 등록', 'Register with QR')}
    >
      <div className="grid grid-cols-2 gap-6">
        {/* 좌측: 기본 정보 */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('기본 정보', 'Basic Info')}</p>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')} *</label>
            <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e => setData(d => ({ ...d, projectId: e.target.value }))}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('파트명', 'Part Name')} *</label>
              <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.partName} onChange={e => setData(d => ({ ...d, partName: e.target.value }))} placeholder="ex) BMS 컨트롤 보드" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('수량', 'Qty')} *</label>
              <input required type="number" min="1" className="w-full p-2.5 border rounded-lg text-sm text-blue-600 font-bold" value={data.quantity} onChange={e => setData(d => ({ ...d, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('도면번호 (P/N)', 'Part Number')}</label>
            <input className="w-full p-2.5 border rounded-lg text-sm font-mono" value={data.partNumber} onChange={e => setData(d => ({ ...d, partNumber: e.target.value }))} placeholder="ex) MAK-BMS-2024-A01" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('긴급도', 'Urgency')}</label>
              <select className="w-full p-2.5 border rounded-lg text-sm" value={data.urgency} onChange={e => setData(d => ({ ...d, urgency: e.target.value }))}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('자재 타입', 'Type')}</label>
              <select className="w-full p-2.5 border rounded-lg text-sm" value={data.type} onChange={e => handleTypeChange(e.target.value)}>
                {PART_TYPES.map(tp => <option key={tp}>{tp}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('등록자', 'Author')} *</label>
            <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e => setData(d => ({ ...d, author: e.target.value }))} />
          </div>
        </div>

        {/* 우측: QC 체크리스트 정의 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('단계별 체크리스트', 'Stage Checklists')}</p>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">🔒 QC 게이트</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {PART_PIPELINE_PHASES.map(stage => (
              <div key={stage} className={`rounded-lg border p-2.5 ${stage === 'QC' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-bold mb-1.5 ${stage === 'QC' ? 'text-amber-700' : 'text-slate-600'}`}>{stage}</p>
                {(checklists[stage] || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-0.5">
                    <span>• {item}</span>
                    <button type="button" onClick={() => removeChecklistItem(stage, idx)} className="text-slate-300 hover:text-red-400 ml-2"><X size={12} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <select className="text-xs border rounded-lg px-2 py-1.5" value={newItem.stage} onChange={e => setNewItem(n => ({ ...n, stage: e.target.value }))}>
              {PART_PIPELINE_PHASES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              className="flex-1 text-xs border rounded-lg px-2 py-1.5"
              placeholder={t('항목 추가...', 'Add item...')}
              value={newItem.text}
              onChange={e => setNewItem(n => ({ ...n, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
            />
            <button type="button" onClick={addChecklistItem} className="bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1.5 border">
              <Plus size={14} />
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            {t('QC 체크리스트는 모든 항목 완료 후에만 제조 단계로 넘어갑니다.', 'QC checklist must be fully completed to proceed to manufacturing.')}
          </p>
        </div>
      </div>
    </ModalWrapper>
  );
});

export default PartPipelineModal;
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/modals/PartPipelineModal.js
git commit -m "feat: PartPipelineModal — 파트 등록 + QC 체크리스트 정의"
```

---

### Task 6: QRLabelModal — QR 라벨 미리보기 + 인쇄

**Files:**
- Create: `src/components/modals/QRLabelModal.js`

- [ ] **Step 1: QRLabelModal.js 작성**

`src/components/modals/QRLabelModal.js`:

```jsx
import React, { useEffect, useState, memo } from 'react';
import { QrCode, Printer, X } from 'lucide-react';
import { generateQRDataUrl } from '../../utils/qr';
import { PART_PIPELINE_PHASES } from '../../constants';

const QRLabelModal = memo(function QRLabelModal({ part, onClose, t }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    generateQRDataUrl(part.id).then(setQrDataUrl);
  }, [part.id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR 라벨 — ${part.partName}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .label { border: 2px solid #333; padding: 16px; width: 420px; }
        .header { background: #4f46e5; color: white; padding: 8px 12px; margin: -16px -16px 12px; }
        .row { display: flex; gap: 16px; }
        .qr img { width: 140px; height: 140px; }
        .checklist { font-size: 12px; }
        .checklist li { margin: 2px 0; list-style: none; }
        .checklist li::before { content: '☐ '; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="label">
        <div class="header">
          <div style="font-size:11px;opacity:0.8">MAK-PMS · 자재 라벨 | ${part.projectName}</div>
          <div style="font-size:18px;font-weight:bold;margin-top:2px">${part.partName}</div>
        </div>
        <div class="row">
          <div class="qr">
            ${qrDataUrl ? `<img src="${qrDataUrl}" />` : '<div style="width:140px;height:140px;background:#eee;display:flex;align-items:center;justify-content:center">QR</div>'}
            <div style="font-size:10px;text-align:center;margin-top:4px;font-family:monospace">${part.id}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;margin-bottom:8px">
              <div><b>P/N:</b> ${part.partNumber || '—'}</div>
              <div><b>수량:</b> ${part.quantity} EA</div>
              <div><b>긴급도:</b> ${part.urgency}</div>
              <div><b>타입:</b> ${part.type || '—'}</div>
              <div><b>등록일:</b> ${part.date}</div>
            </div>
            <div style="background:#fef3c7;border:1px solid #f59e0b;padding:6px;border-radius:4px">
              <div style="font-size:11px;font-weight:bold;margin-bottom:4px">🔒 QC 체크리스트</div>
              <ul class="checklist">
                ${(part.pipelineConfig?.checklists?.QC || []).map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:10px;color:#666;border-top:1px solid #eee;padding-top:8px">
          현재 단계: ${PART_PIPELINE_PHASES.join(' → ')}
        </div>
      </div>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-indigo-600" />
            <span className="font-bold text-slate-800">{t('QR 라벨 미리보기', 'QR Label Preview')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              <Printer size={15} /> {t('인쇄', 'Print')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={18} /></button>
          </div>
        </div>

        {/* 라벨 미리보기 */}
        <div className="p-6 flex justify-center">
          <div className="border-2 border-slate-300 rounded-xl overflow-hidden w-[460px] shadow-md">
            <div className="bg-indigo-600 text-white px-4 py-3">
              <p className="text-xs opacity-75">{part.projectName} · {part.id}</p>
              <p className="text-lg font-bold mt-0.5">{part.partName}</p>
            </div>
            <div className="p-4 flex gap-4">
              <div className="flex flex-col items-center">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR" className="w-32 h-32 border border-slate-200 rounded" />
                  : <div className="w-32 h-32 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">생성 중...</div>
                }
                <p className="text-[9px] font-mono text-slate-400 mt-1">{part.id}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{t('스캔하여 열기', 'Scan to open')}</p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-slate-500">P/N</span><p className="font-mono font-bold">{part.partNumber || '—'}</p></div>
                  <div><span className="text-slate-500">수량</span><p className="text-blue-600 font-bold">{part.quantity} EA</p></div>
                  <div><span className="text-slate-500">긴급도</span><p className={`font-bold ${part.urgency === 'High' ? 'text-red-600' : part.urgency === 'Medium' ? 'text-amber-600' : 'text-green-600'}`}>{part.urgency}</p></div>
                  <div><span className="text-slate-500">타입</span><p className="font-medium">{part.type || '—'}</p></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-amber-700 mb-1">🔒 QC 체크리스트</p>
                  {(part.pipelineConfig?.checklists?.QC || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-[11px] text-slate-600">
                      <span className="text-slate-300">☐</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {PART_PIPELINE_PHASES.map((s, i) => (
                  <React.Fragment key={s}>
                    <span className={s === part.currentStage ? 'text-indigo-600 font-bold' : ''}>{s}</span>
                    {i < PART_PIPELINE_PHASES.length - 1 && <span>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QRLabelModal;
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/modals/QRLabelModal.js
git commit -m "feat: QRLabelModal — QR 라벨 미리보기 + 인쇄"
```

---

### Task 7: PartStageModal — 단계 전환 (PC용)

**Files:**
- Create: `src/components/modals/PartStageModal.js`

- [ ] **Step 1: PartStageModal.js 작성**

`src/components/modals/PartStageModal.js`:

```jsx
import React, { useState, memo } from 'react';
import { CheckSquare, X, AlertTriangle, ArrowRight } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const PartStageModal = memo(function PartStageModal({ part, nextStage, partEvents, onClose, onAdvance, onReject, t }) {
  const currentStage = part.currentStage;
  const isQC = currentStage === 'QC';
  const checklists = part.pipelineConfig?.checklists?.[currentStage] || [];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');

  const allChecked = checklists.length === 0 || checklists.every(item => checked[item]);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const toggleItem = (item) => setChecked(c => ({ ...c, [item]: !c[item] }));

  const handleAdvance = (e) => {
    e.preventDefault();
    onAdvance(part.id, nextStage, {
      checklistResults: checked,
      notes,
      status: isQC ? '합격' : '완료',
    });
  };

  const handleReject = () => {
    if (!notes.trim()) { alert(t('반려 사유를 입력해주세요.', 'Please enter rejection reason.')); return; }
    onReject(part.id, currentStage, notes);
  };

  return (
    <ModalWrapper
      title={`${currentStage} → ${nextStage}`}
      icon={<CheckSquare size={18} />}
      color={isQC ? 'amber' : 'indigo'}
      onClose={onClose}
      onSubmit={handleAdvance}
      submitText={t(`${nextStage} 단계로 이동`, `Move to ${nextStage}`)}
      submitDisabled={isQC && !allChecked}
    >
      {/* 파트 요약 */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
        <p className="font-bold text-slate-800">{part.partName}</p>
        <p className="text-xs text-slate-500 font-mono">{part.id} · {part.projectName}</p>
      </div>

      {/* QC 체크리스트 */}
      {checklists.length > 0 && (
        <div className={`rounded-xl border p-4 space-y-2 ${isQC ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-bold ${isQC ? 'text-amber-800' : 'text-slate-700'}`}>
              {isQC ? `🔒 QC 체크리스트` : `${currentStage} 체크리스트`}
            </p>
            <span className="text-xs font-bold text-slate-500">{completedCount} / {checklists.length}</span>
          </div>
          {checklists.map((item) => (
            <label key={item} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={() => toggleItem(item)}
                className="w-5 h-5 rounded accent-indigo-600"
              />
              <span className={`text-sm ${checked[item] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item}</span>
            </label>
          ))}
          {isQC && !allChecked && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
              <AlertTriangle size={12} /> {t('모든 항목 완료 후 다음 단계로 이동 가능합니다.', 'All items must be checked to proceed.')}
            </p>
          )}
        </div>
      )}

      {/* 메모 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Notes (optional)')}</label>
        <textarea
          className="w-full p-2.5 border rounded-lg text-sm resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('특이사항 또는 반려 사유 입력...', 'Enter notes or rejection reason...')}
        />
      </div>

      {/* 반려 버튼 (QC/제조/납품 단계에서만) */}
      {isQC && (
        <button
          type="button"
          onClick={handleReject}
          className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
        >
          ❌ {t('QC 불합격 — 구매 단계로 반려', 'QC Failed — Return to Purchase')}
        </button>
      )}
    </ModalWrapper>
  );
});

export default PartStageModal;
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/modals/PartStageModal.js
git commit -m "feat: PartStageModal — 단계 전환 + QC 게이트 UI"
```

---

### Task 8: MobilePartPipelineModal — 모바일 QC 스캔 뷰

**Files:**
- Create: `src/components/modals/MobilePartPipelineModal.js`

- [ ] **Step 1: MobilePartPipelineModal.js 작성**

`src/components/modals/MobilePartPipelineModal.js`:

```jsx
import React, { useState, useRef, memo } from 'react';
import { Camera, CheckSquare, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { PART_PIPELINE_PHASES } from '../../constants';

const MobilePartPipelineModal = memo(function MobilePartPipelineModal({ part, nextStage, partEvents, onClose, onAdvance, onReject, t }) {
  const currentStage = part.currentStage;
  const isQC = currentStage === 'QC';
  const checklists = part.pipelineConfig?.checklists?.[currentStage] || [];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  const allChecked = checklists.length === 0 || checklists.every(item => checked[item]);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdvance = () => {
    onAdvance(part.id, nextStage, {
      checklistResults: checked,
      notes,
      photoUrls: photoPreview || '',
      status: isQC ? '합격' : '완료',
    });
  };

  const handleReject = () => {
    if (!notes.trim()) { alert(t('반려 사유를 입력해주세요.', 'Enter rejection reason.')); return; }
    onReject(part.id, currentStage, notes);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* 상단 */}
      <div className="bg-indigo-600 text-white px-4 pt-10 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75">MAK-PMS QC</p>
          <p className="font-bold text-lg">{part.partName}</p>
          <p className="text-xs opacity-75 font-mono mt-0.5">{part.id}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><X size={20} /></button>
      </div>

      {/* 현재 단계 표시 */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1 overflow-x-auto">
          {PART_PIPELINE_PHASES.map((s, i) => (
            <React.Fragment key={s}>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-bold ${s === currentStage ? 'bg-indigo-100 text-indigo-700' : PART_PIPELINE_PHASES.indexOf(s) < PART_PIPELINE_PHASES.indexOf(currentStage) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {s === currentStage ? `← 현재` : s}
              </span>
              {i < PART_PIPELINE_PHASES.length - 1 && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {checklists.length > 0 && (
          <div className={`rounded-2xl border-2 p-4 space-y-3 ${isQC ? 'border-amber-300 bg-amber-50' : 'border-indigo-200 bg-indigo-50'}`}>
            <div className="flex justify-between items-center">
              <p className="font-bold text-slate-800">{currentStage} 체크리스트</p>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${allChecked ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{completedCount}/{checklists.length}</span>
            </div>
            {checklists.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setChecked(c => ({ ...c, [item]: !c[item] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${checked[item] ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked[item] ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                  {checked[item] && <CheckSquare size={14} className="text-white" />}
                </div>
                <span className={`text-sm font-medium ${checked[item] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item}</span>
              </button>
            ))}
          </div>
        )}

        {/* 사진 촬영 */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">{t('검사 사진 (선택)', 'Photo (optional)')}</p>
          {photoPreview
            ? <div className="relative"><img src={photoPreview} alt="preview" className="w-full rounded-xl border" /><button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button></div>
            : <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-6 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center text-slate-400">
                <Camera size={28} className="mb-1" />
                <span className="text-sm font-bold">{t('사진 촬영', 'Take Photo')}</span>
              </button>
          }
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('메모', 'Notes')}</label>
          <textarea className="w-full p-3 border-2 rounded-xl text-sm resize-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('특이사항 또는 반려 사유...', 'Notes or rejection reason...')} />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-4 pb-8 pt-4 space-y-3 border-t border-slate-100 bg-white">
        {isQC && !allChecked && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {t('모든 항목 체크 후 합격 처리 가능합니다.', 'Check all items to pass QC.')}
          </p>
        )}
        <button
          type="button"
          onClick={handleAdvance}
          disabled={isQC && !allChecked}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✅ {isQC ? t('QC 합격 처리', 'QC Pass') : t(`${nextStage} 단계로 완료`, `Complete → ${nextStage}`)}
        </button>
        {isQC && (
          <button type="button" onClick={handleReject} className="w-full py-4 rounded-2xl border-2 border-red-300 text-red-600 font-bold text-base hover:bg-red-50 transition-colors">
            ❌ {t('QC 불합격 — 반려', 'QC Failed — Reject')}
          </button>
        )}
      </div>
    </div>
  );
});

export default MobilePartPipelineModal;
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/modals/MobilePartPipelineModal.js
git commit -m "feat: MobilePartPipelineModal — 모바일 QC 스캔 뷰"
```

---

## Phase C: 파이프라인 리스트 뷰 + 문서 (Tasks 9–11)

### Task 9: PartsListView — 탭 구조 + 파이프라인 뷰

**Files:**
- Modify: `src/components/views/PartsListView.js`

- [ ] **Step 1: PartsListView.js 전체 교체**

`src/components/views/PartsListView.js`:

```jsx
import React, { useState, useMemo, memo } from 'react';
import { Plus, Filter, Trash, Download, QrCode, ChevronRight, Lock, Package, AlertTriangle } from 'lucide-react';
import { PART_PHASES, PART_PIPELINE_PHASES } from '../../constants';
import { exportToExcel } from '../../utils/export';
import { getStageCompletion, isPipelineComplete } from '../../utils/partPipeline';

// ===== 파이프라인 탭 =====
const PipelineTab = memo(function PipelineTab({
  pipelineParts, partEvents, getStatusColor,
  onAddPipelinePart, onOpenStageModal, onOpenQRLabel, onDeletePipelinePart, currentUser, t,
}) {
  const [filterStage, setFilterStage] = useState('all');

  const filtered = useMemo(() =>
    filterStage === 'all' ? pipelineParts : pipelineParts.filter(p => p.currentStage === filterStage),
    [pipelineParts, filterStage]
  );

  const getStepClass = (part, step) => {
    const completedStages = getStageCompletion(part.id, partEvents);
    const currentIdx = PART_PIPELINE_PHASES.indexOf(part.currentStage);
    const stepIdx = PART_PIPELINE_PHASES.indexOf(step);
    if (completedStages.includes(step) || stepIdx < currentIdx) return 'bg-indigo-500 text-white border-indigo-600';
    if (step === part.currentStage) return 'bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400';
    if (step === 'QC') return 'bg-amber-50 text-amber-500 border-amber-200';
    return 'bg-slate-100 text-slate-400 border-slate-200';
  };

  const isQCBlocked = (part, step) => {
    if (step !== '제조') return false;
    return !partEvents.some(e => e.partId === part.id && e.stage === 'QC' && e.status === '합격');
  };

  const getNextStageForPart = (part) => {
    const idx = PART_PIPELINE_PHASES.indexOf(part.currentStage);
    if (idx >= PART_PIPELINE_PHASES.length - 1) return null;
    return PART_PIPELINE_PHASES[idx + 1];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={15} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
              <option value="all">{t('전체 단계', 'All Stages')}</option>
              {PART_PIPELINE_PHASES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddPipelinePart} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus size={16} className="mr-1.5" /> {t('파트 등록', 'Register Part')}
          </button>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-slate-500 bg-white rounded-xl px-4 py-2 border border-slate-200">
        <span className="font-bold">{t('범례', 'Legend')}:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> {t('완료', 'Done')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-400 inline-block" /> {t('현재', 'Current')}</span>
        <span className="flex items-center gap-1"><Lock size={11} className="text-amber-500" /> {t('QC 게이트', 'QC Gate')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> {t('불합격', 'Rejected')}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트', 'Project')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('수량/긴급도', 'Qty/Urgency')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('파이프라인 단계', 'Pipeline')}</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">{t('등록된 파트가 없습니다.', 'No parts registered.')}</td></tr>
            ) : filtered.map(part => {
              const isComplete = isPipelineComplete(part.id, partEvents);
              const nextStage = getNextStageForPart(part);
              const hasQCFail = partEvents.some(e => e.partId === part.id && e.stage === 'QC' && e.status === '불합격');
              return (
                <tr key={part.id} className={`hover:bg-slate-50 transition-colors align-middle ${isComplete ? 'bg-green-50/30' : ''} ${hasQCFail ? 'bg-red-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                        <Package size={20} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{part.partName}</p>
                        <p className="text-xs font-mono text-slate-500">{part.partNumber || '—'}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${part.type === '설계외주형' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{part.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700">{part.projectName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{part.author} · {part.date}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-blue-600">{part.quantity} EA</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PIPELINE_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <div className="relative">
                            <button
                              disabled={step !== part.currentStage || !nextStage || currentUser.role === 'CUSTOMER'}
                              onClick={() => step === part.currentStage && nextStage && onOpenStageModal(part, nextStage)}
                              className={`text-[10px] px-2 py-1 rounded border transition-colors ${getStepClass(part, step)} ${step === part.currentStage && nextStage ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : 'cursor-default'} ${isQCBlocked(part, step) ? 'opacity-40' : ''}`}
                            >
                              {step === 'QC' && <Lock size={9} className="inline mr-0.5 text-amber-500" />}
                              {step}
                            </button>
                          </div>
                          {idx < PART_PIPELINE_PHASES.length - 1 && <ChevronRight size={11} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                      {hasQCFail && <span className="ml-2 text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle size={10} /> QC 불합격</span>}
                      {isComplete && <span className="ml-2 text-[10px] text-green-600 font-bold">✓ 완료</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onOpenQRLabel(part)} className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors" title={t('QR 라벨', 'QR Label')}>
                        <QrCode size={14} />
                      </button>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onDeletePipelinePart(part)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ===== 스페어파트 탭 (기존 유지) =====
const SparePartsTab = memo(function SparePartsTab({ parts, getStatusColor, onUpdateStatus, onDeletePart, onAddClick, currentUser, t }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const filtered = useMemo(() => filterStatus === 'all' ? parts : parts.filter(p => p.status === filterStatus), [parts, filterStatus]);

  const handleExport = () => {
    exportToExcel('자재_리스트', [{
      name: '자재 리스트',
      rows: filtered.map(p => ({ id: p.id, projectName: p.projectName, partName: p.partName, partNumber: p.partNumber, quantity: p.quantity, urgency: p.urgency, status: p.status, author: p.author, date: p.date })),
      columns: [
        { header: 'ID', key: 'id' }, { header: '프로젝트', key: 'projectName' }, { header: '파트명', key: 'partName' },
        { header: 'P/N', key: 'partNumber' }, { header: '수량', key: 'quantity' }, { header: '긴급도', key: 'urgency' },
        { header: '상태', key: 'status' }, { header: '청구자', key: 'author' }, { header: '일자', key: 'date' },
      ],
    }]);
  };

  const getStepClass = (currentStatus, step) => {
    const statusIndex = PART_PHASES.indexOf(currentStatus);
    const stepIndex = PART_PHASES.indexOf(step);
    if (stepIndex < statusIndex) return 'bg-indigo-500 text-white border-indigo-600';
    if (stepIndex === statusIndex) return 'bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400';
    return 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
            <Download size={15} className="mr-1.5" /> Excel
          </button>
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={15} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{t('전체', 'All')}</option>
              {PART_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddClick} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus size={16} className="mr-1.5" /> {t('자재 청구', 'Request Part')}
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트 / 청구자', 'Project / Author')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('수량 및 중요도', 'Qty / Urgency')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('처리 단계', 'Status Phase')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filtered.length === 0
              ? <tr><td colSpan={5} className="text-center py-10 text-slate-400">{t('내역이 없습니다.', 'No parts.')}</td></tr>
              : filtered.map(part => (
                <tr key={part.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">{part.partName}</div>
                    <div className="text-xs text-slate-500 font-mono">P/N: {part.partNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{part.projectName}</div>
                    <div className="text-xs text-slate-500">{part.author} ({part.date})</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-blue-600">{part.quantity} EA</span>
                    <div className="mt-1"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <button disabled={currentUser.role === 'ENGINEER'} onClick={() => onUpdateStatus(part.id, step)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${getStepClass(part.status, step)}`}>{step}</button>
                          {idx < PART_PHASES.length - 1 && <ChevronRight size={11} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                      <button onClick={() => onDeletePart(part)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        <Trash size={13} className="mr-1" />{t('삭제', 'Delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ===== 메인 뷰 =====
const PartsListView = memo(function PartsListView({
  parts, pipelineParts = [], partEvents = [],
  getStatusColor, onUpdateStatus, onDeletePart, onAddClick,
  onAddPipelinePart, onOpenStageModal, onOpenQRLabel, onDeletePipelinePart,
  currentUser, t,
}) {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('자재 및 스페어파트 관리', 'Parts Management')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('설계→구매→QC→제조→납품 파이프라인 + 스페어파트 청구', 'Pipeline & Spare Parts')}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('pipeline')} className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          📦 {t('파이프라인 관리', 'Pipeline')}
          {pipelineParts.length > 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{pipelineParts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('spare')} className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'spare' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          🔧 {t('스페어파트 청구', 'Spare Parts')}
          {parts.length > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{parts.length}</span>}
        </button>
      </div>

      {activeTab === 'pipeline'
        ? <PipelineTab pipelineParts={pipelineParts} partEvents={partEvents} getStatusColor={getStatusColor} onAddPipelinePart={onAddPipelinePart} onOpenStageModal={onOpenStageModal} onOpenQRLabel={onOpenQRLabel} onDeletePipelinePart={onDeletePipelinePart} currentUser={currentUser} t={t} />
        : <SparePartsTab parts={parts} getStatusColor={getStatusColor} onUpdateStatus={onUpdateStatus} onDeletePart={onDeletePart} onAddClick={onAddClick} currentUser={currentUser} t={t} />
      }
    </div>
  );
});

export default PartsListView;
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add src/components/views/PartsListView.js
git commit -m "feat: PartsListView — 파이프라인 탭 + 스페어파트 탭 구조 개편"
```

---

### Task 10: utils/partDocuments.js — 문서 자동 생성

**Files:**
- Create: `src/utils/partDocuments.js`

- [ ] **Step 1: partDocuments.js 작성**

`src/utils/partDocuments.js`:

```js
// QC 성적서 HTML 생성 — 브라우저 print()로 PDF 저장 가능
export const generateQCReport = (part, stageRecord) => {
  const { actor, completedAt, checklistResults = {}, notes = '', photoUrls = '' } = stageRecord;
  const date = completedAt ? new Date(completedAt).toLocaleDateString('ko-KR') : '-';
  const passed = Object.values(checklistResults).every(Boolean);

  const rows = Object.entries(checklistResults).map(([item, result]) =>
    `<tr><td>${item}</td><td style="color:${result ? 'green' : 'red'};font-weight:bold">${result ? '합격 ✓' : '불합격 ✗'}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>QC 성적서 — ${part.partName}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
    h1 { color: #1e293b; font-size: 22px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 14px; }
    .meta span { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .verdict { font-size: 20px; font-weight: bold; padding: 12px; border-radius: 8px; text-align: center; margin: 16px 0; }
    .pass { background: #d1fae5; color: #065f46; }
    .fail { background: #fee2e2; color: #991b1b; }
    .photo img { max-width: 300px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>QC 성적서 (Inspection Report)</h1>
  <div class="meta">
    <div><span>파트명:</span> <strong>${part.partName}</strong></div>
    <div><span>파트 ID:</span> <strong>${part.id}</strong></div>
    <div><span>도면번호:</span> <strong>${part.partNumber || '-'}</strong></div>
    <div><span>프로젝트:</span> <strong>${part.projectName}</strong></div>
    <div><span>검사자:</span> <strong>${actor}</strong></div>
    <div><span>검사일:</span> <strong>${date}</strong></div>
  </div>
  <div class="verdict ${passed ? 'pass' : 'fail'}">${passed ? '✅ 최종 합격' : '❌ 최종 불합격'}</div>
  <table>
    <thead><tr><th>검사 항목</th><th>결과</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${notes ? `<p><strong>특이사항:</strong> ${notes}</p>` : ''}
  ${photoUrls ? `<div class="photo"><strong>첨부 사진:</strong><br/><img src="${photoUrls}" /></div>` : ''}
  <p style="font-size:12px;color:#94a3b8;margin-top:32px">본 성적서는 MAK-PMS에서 자동 생성되었습니다. 생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
};

// 납품확인서 HTML 생성
export const generateDeliveryNote = (part, stageRecord) => {
  const { actor, completedAt, notes = '', photoUrls = '' } = stageRecord;
  const date = completedAt ? new Date(completedAt).toLocaleDateString('ko-KR') : '-';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>납품확인서 — ${part.partName}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
    h1 { color: #1e293b; font-size: 22px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 14px; }
    .meta span { color: #64748b; }
    .sign-box { border: 2px solid #334155; padding: 24px; margin: 24px 0; min-height: 80px; }
    .confirmed { font-size: 18px; font-weight: bold; padding: 12px; background: #d1fae5; color: #065f46; border-radius: 8px; text-align: center; margin: 16px 0; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>납품확인서 (Delivery Confirmation)</h1>
  <div class="meta">
    <div><span>파트명:</span> <strong>${part.partName}</strong></div>
    <div><span>수량:</span> <strong>${part.quantity} EA</strong></div>
    <div><span>도면번호:</span> <strong>${part.partNumber || '-'}</strong></div>
    <div><span>프로젝트:</span> <strong>${part.projectName}</strong></div>
    <div><span>납품 담당자:</span> <strong>${actor}</strong></div>
    <div><span>납품일:</span> <strong>${date}</strong></div>
  </div>
  <div class="confirmed">✅ 납품 완료</div>
  ${notes ? `<p><strong>비고:</strong> ${notes}</p>` : ''}
  <div class="sign-box">
    <p style="font-size:12px;color:#64748b;margin:0 0 16px">고객 서명 / Customer Signature:</p>
    ${photoUrls ? `<img src="${photoUrls}" style="max-width:200px" />` : ''}
  </div>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px">본 납품확인서는 MAK-PMS에서 자동 생성되었습니다. 생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
};

// 문서를 새 창에서 열어 인쇄 다이얼로그 표시
export const openDocumentForPrint = (html) => {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};
```

- [ ] **Step 2: PartStageModal에서 문서 자동 생성 연동**

`src/components/modals/PartStageModal.js`의 `handleAdvance` 에서 QC 합격 또는 납품 완료 시 문서 자동 생성 추가:

파일 상단에 import 추가:
```js
import { generateQCReport, generateDeliveryNote, openDocumentForPrint } from '../../utils/partDocuments';
```

`handleAdvance` 함수 수정 (form submit 핸들러 내부):
```js
const handleAdvance = (e) => {
  e.preventDefault();
  const stageData = {
    checklistResults: checked,
    notes,
    status: isQC ? '합격' : '완료',
  };
  onAdvance(part.id, nextStage, stageData);

  // QC 합격 시 성적서 자동 생성
  if (isQC) {
    const record = { actor: '현재 사용자', completedAt: new Date().toISOString(), checklistResults: checked, notes };
    openDocumentForPrint(generateQCReport(part, record));
  }
  // 납품 완료 시 납품확인서 자동 생성
  if (part.currentStage === '납품' || nextStage === '납품') {
    const record = { actor: '현재 사용자', completedAt: new Date().toISOString(), notes };
    openDocumentForPrint(generateDeliveryNote(part, record));
  }
};
```

- [ ] **Step 3: 커밋**

```bash
git add src/utils/partDocuments.js src/components/modals/PartStageModal.js
git commit -m "feat: QC 성적서·납품확인서 자동 생성 + 인쇄"
```

---

### Task 11: GAS 백엔드 — 신규 액션 추가

**Files:**
- Modify: `docs/gas-backend.gs`

- [ ] **Step 1: gas-backend.gs에서 `UPDATE_PARTS` 처리 블록 찾기**

`docs/gas-backend.gs` 에서 `UPDATE_PARTS` 를 처리하는 case 블록을 찾는다:

```bash
grep -n "UPDATE_PARTS\|UPDATE_ISSUES\|UPDATE_PROJECTS" docs/gas-backend.gs | head -10
```

- [ ] **Step 2: 신규 액션 추가**

찾은 `case 'UPDATE_PARTS':` 블록 바로 다음에 동일한 패턴으로 추가:

```js
case 'UPDATE_PIPELINE_PARTS':
  saveSheet(ss, 'pipeline_parts', data);
  logChange(ss, action, 'pipeline_parts', null, null, user);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);

case 'UPDATE_PART_EVENTS':
  saveSheet(ss, 'part_events', data);
  logChange(ss, action, 'part_events', null, null, user);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
```

- [ ] **Step 3: doGet 응답에 신규 시트 포함**

`docs/gas-backend.gs`에서 `doGet` 함수 내 JSON 응답 조합 부분을 찾아 다음 두 줄 추가:

```js
pipelineParts: loadSheet(ss, 'pipeline_parts'),
partEvents: loadSheet(ss, 'part_events'),
```

- [ ] **Step 4: GAS 재배포 안내**

> ⚠️ **수동 작업 필요**: Google Apps Script 편집기에서 코드를 업데이트하고 **새 버전으로 재배포** 해야 합니다.
> 1. drive.google.com → 스프레드시트 → 확장 프로그램 → Apps Script
> 2. `docs/gas-backend.gs` 내용을 붙여넣기
> 3. 배포 → 배포 관리 → 연필 아이콘 → 새 버전 → 배포

- [ ] **Step 5: 커밋**

```bash
git add docs/gas-backend.gs
git commit -m "feat: GAS — UPDATE_PIPELINE_PARTS / UPDATE_PART_EVENTS 액션 추가"
```

---

## 최종 확인

- [ ] **전체 빌드 통과**

```bash
npm run build 2>&1 | tail -5
```

Expected: `Compiled successfully`

- [ ] **테스트 통과**

```bash
npm test -- --watchAll=false 2>&1 | tail -10
```

Expected: `Tests: X passed`

- [ ] **개발 서버에서 동작 확인 체크리스트**
  - [ ] 자재 페이지 → "파이프라인 관리" 탭 표시
  - [ ] "파트 등록" 버튼 → PartPipelineModal 열림
  - [ ] 파트 등록 후 QR 아이콘 → QRLabelModal 열림
  - [ ] QR 라벨 인쇄 동작
  - [ ] 현재 단계 버튼 클릭 → PartStageModal 열림
  - [ ] QC 체크리스트 미완료 시 "이동" 버튼 비활성화
  - [ ] QC 합격 시 성적서 자동 생성 (인쇄 팝업)
  - [ ] QC 불합격 → 구매 단계로 반려 + 빨간 표시

- [ ] **최종 커밋**

```bash
git add -A
git commit -m "feat: 자재 파이프라인 — 전체 구현 완료 (설계→구매→QC→제조→납품 + QR)"
```
