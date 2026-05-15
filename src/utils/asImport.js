// 기존 AS 통합관리(V4.1) 엑셀/CSV → 현 시스템 AS 레코드 이관 변환
// - 순수 함수: 파싱(parseASWorkbook) + 매핑(mapLegacyASRow)
// - 멱등성: 원본 ID를 legacyId로 보존하여 재import 시 중복 스킵 (handleImportAS에서 처리)

import * as XLSX from 'xlsx';

// 기존 AS_Data 시트의 표준 컬럼 (검증용)
export const LEGACY_AS_COLUMNS = [
  'ID', 'Code', 'Customer', 'Manager', 'Serial', 'Contact', 'Priority',
  'ReqDate', 'Visit', 'Issue', 'Status', 'Engineer', 'StatusText', 'Part',
  'Cost', 'History', 'ReportFile', 'IsDeleted', 'CreatedAt', 'UpdatedAt', 'ASType', 'Billing'
];

// HTML 본문(Issue) → 평문. 줄바꿈 보존, 흔한 엔티티 복원, 태그 제거.
const stripHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(div|p|li|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const isTruthyFlag = (v) => v === true || /^(true|1|y|yes)$/i.test(String(v == null ? '' : v).trim());

// 기존 상태(wait/ing/done) → 현 HW 상태 흐름(접수/출동/조치/완료)
const STATUS_MAP = { wait: '접수', ing: '조치', done: '완료' };

// 워크북(ArrayBuffer) → 원본 행 배열. AS_Data 시트 우선, 없으면 첫 비어있지 않은 시트.
export function parseASWorkbook(arrayBuffer) {
  const data = arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer;
  const wb = XLSX.read(data, { type: 'array' });
  let sheetName = wb.SheetNames.find(n => n === 'AS_Data');
  if (!sheetName) {
    sheetName = wb.SheetNames.find(n => {
      const j = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
      return j.length > 0;
    });
  }
  if (!sheetName) return { rows: [], sheetName: null };
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  return { rows, sheetName };
}

// 레거시 1행 → { code, legacyId, skip, record }
// skip=true 이면 IsDeleted 행 (이관 제외)
export function mapLegacyASRow(row, idx = 0) {
  const legacyId = row.ID != null && String(row.ID).trim() !== '' ? String(row.ID).trim() : '';
  if (isTruthyFlag(row.IsDeleted)) {
    return { code: String(row.Code || '').trim(), legacyId, skip: true, record: null };
  }

  const created = String(row.CreatedAt || '').trim();
  const updated = String(row.UpdatedAt || '').trim();
  const statusRaw = String(row.Status || '').trim().toLowerCase();
  const status = STATUS_MAP[statusRaw] || '접수';
  const priority = /상|긴급|urgent|high/i.test(String(row.Priority || '')) ? '긴급' : '보통';

  // History(JSON 문자열) → comments[]
  const baseId = Number(legacyId) || (Date.now() + idx * 1000);
  const comments = [];
  const statusText = String(row.StatusText || '').trim();
  if (statusText) {
    comments.push({ id: baseId + 1, author: '(이관)', text: `[현황 요약] ${statusText}`, time: created });
  }
  try {
    const hist = row.History ? JSON.parse(row.History) : [];
    if (Array.isArray(hist)) {
      hist.forEach((h, i) => {
        const text = [h && h.action, h && h.details].filter(Boolean).join(': ');
        if (!text) return;
        comments.push({
          id: baseId + 10 + i,
          author: (h && h.user) || '(이관)',
          text: stripHtml(text),
          time: (h && h.time) || ''
        });
      });
    }
  } catch (_) { /* History 파싱 실패 시 무시 */ }

  // ReportFile: URL → 링크 보고서, 완료인데 비어있음 → N/A(이관)
  const reportFile = String(row.ReportFile || '').trim();
  let report = null;
  if (/^https?:\/\//i.test(reportFile)) {
    report = { fileName: '이관 보고서 링크', viewUrl: reportFile, completedAt: updated || created || '' };
  } else if (status === '완료') {
    report = { naReason: reportFile && reportFile !== 'N/A' ? reportFile : 'N/A (이관)', completedAt: updated || created || '' };
  }

  const code = String(row.Code || '').trim();
  const record = {
    id: Number(legacyId) || (Date.now() + idx * 1000),
    legacyId,                 // 재import 중복 방지 키
    legacyCode: code,         // 원본 프로젝트 코드 — 버킷에서도 추적·재연결 기준
    _imported: true,          // 이관분 표식
    category: 'HW',           // 기존 시스템엔 HW/SW 구분 없음 → HW
    type: '이관',             // 접수유형 원본 없음 → 식별용
    status,
    engineer: String(row.Engineer || '').trim(),
    coEngineers: [],
    description: stripHtml(row.Issue),
    resolution: '',
    priority,
    manager: String(row.Manager || '').trim(),
    contact: String(row.Contact || '').trim(),
    serial: String(row.Serial || '').trim(),
    part: String(row.Part || '').trim(),
    cost: String(row.Cost || '').trim(),
    reqDate: String(row.ReqDate || '').trim(),
    visit: String(row.Visit || '').trim(),
    asType: String(row.ASType || '').trim(),
    billing: String(row.Billing || '').trim(),
    comments,
    report,
    date: created || updated || '',
    files: []
  };

  const customer = String(row.Customer || '').trim();
  return { code, customer, legacyId, skip: false, record };
}

// 이관 Code → 프로젝트 id 매칭.
// 기존 식별 체계인 "장비 코드"(project.equipments[].code)와 일치하는 프로젝트를 찾음.
// 보조로 project.id 도 비교. 대소문자/공백 무시.
export const findProjectIdByCode = (code, projects) => {
  const c = String(code == null ? '' : code).trim().toLowerCase();
  if (!c) return null;
  const hit = (projects || []).find(p => {
    if (String(p.id == null ? '' : p.id).trim().toLowerCase() === c) return true;
    const eqs = Array.isArray(p.equipments) ? p.equipments : [];
    return eqs.some(e => e && String(e.code == null ? '' : e.code).trim().toLowerCase() === c);
  });
  return hit ? hit.id : null;
};

// 이미 이관된 legacyId 집합 (재import 멱등성)
export const collectLegacyIds = (projects) => {
  const s = new Set();
  (projects || []).forEach(p => (p.asRecords || []).forEach(a => {
    if (a && a.legacyId != null && String(a.legacyId) !== '') s.add(String(a.legacyId));
  }));
  return s;
};

// 전체 행 변환 — { items: [{code, legacyId, record}], skipped: n }
export function mapLegacyASRows(rows) {
  const items = [];
  let skipped = 0;
  (rows || []).forEach((r, i) => {
    const m = mapLegacyASRow(r, i);
    if (m.skip) { skipped += 1; return; }
    if (!m.record) return;
    items.push(m);
  });
  return { items, skipped };
}
