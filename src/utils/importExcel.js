import * as XLSX from 'xlsx';

// 헤더 별칭 — 한/영 모두 허용. 최종적으로 표준 키로 매핑.
const HEADER_ALIASES = {
  name:       ['name', '작업명', '항목', '이름', 'task'],
  type:       ['type', '유형', '분류', 'category'],
  requester:  ['requester', '요청자', '신청자', '고객', 'customer'],
  startDate:  ['startdate', '시작일', '착수일', 'start', 'begin'],
  endDate:    ['enddate', '종료일', '완료일', '마감', 'end', 'due'],
  status:     ['status', '상태', '진행상태', 'state'],
  note:       ['note', '메모', '비고', '내용', 'remark'],
};

const TYPE_WHITELIST = ['기능 추가', '기능 개선', '버그 수정', 'UI 변경', '공정 튜닝', '기타'];
const STATUS_WHITELIST = ['대기', '검토중', '진행중', '완료', '반려'];

// 상태 별칭 — 화이트리스트에 없지만 의미가 같은 값들을 표준 상태로 자동 매핑
//  · "미진행"/"진행안함"/"시작전"/"대기중" → 대기
//  · "검토"/"리뷰" → 검토중
//  · "진행"/"진행 중"/"in progress" → 진행중
//  · "완료됨"/"done"/"끝" → 완료
//  · "거절"/"reject"/"보류" → 반려
const STATUS_ALIASES = {
  '미진행': '대기', '진행안함': '대기', '시작전': '대기', '대기중': '대기', 'pending': '대기',
  '검토': '검토중', '리뷰': '검토중', 'review': '검토중',
  '진행': '진행중', '진행 중': '진행중', 'inprogress': '진행중', 'wip': '진행중',
  '완료됨': '완료', 'done': '완료', '끝': '완료', 'finished': '완료',
  '거절': '반려', 'reject': '반려', 'rejected': '반려', '보류': '반려'
};
// 유형 별칭
const TYPE_ALIASES = {
  'feature': '기능 추가', '신규기능': '기능 추가', '신규 기능': '기능 추가',
  'improvement': '기능 개선', '개선': '기능 개선', '사용성 개선': '기능 개선',
  'bugfix': '버그 수정', 'bug': '버그 수정', '버그': '버그 수정',
  'ui': 'UI 변경', '디자인': 'UI 변경',
  '튜닝': '공정 튜닝', 'tuning': '공정 튜닝', '공정': '공정 튜닝',
  '개발 요청': '기타', '개발요청': '기타', '요청': '기타'
};

const normalize = (s) => String(s || '').trim().toLowerCase().replace(/[\s_-]/g, '');

// 헤더 행 → 표준 키 매핑
function resolveHeaders(rawHeaders) {
  const map = {}; // colIndex → standardKey
  rawHeaders.forEach((h, i) => {
    const norm = normalize(h);
    for (const stdKey in HEADER_ALIASES) {
      if (HEADER_ALIASES[stdKey].some(alias => normalize(alias) === norm)) {
        map[i] = stdKey;
        break;
      }
    }
  });
  return map;
}

// 셀 값 정규화 — 날짜 객체 / 숫자 / 문자열 통일
function cellToString(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

// 날짜 셀 전용 정규화 — ISO 문자열 / Date / 'YYYY-MM-DD' / 'YYYY/M/D' 모두 'YYYY-MM-DD'로
function cellToDateString(v) {
  if (v == null || v === '') return '';
  // 1) Date 객체
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (!s) return '';
  // 2) 이미 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // 3) ISO 문자열 / 기타 파싱 가능한 형태
  const t = new Date(s).getTime();
  if (!isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  // 4) "YYYY. M. D." 한국 로케일 등 — 숫자만 추출
  const m = s.match(/(\d{4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return s; // 알 수 없는 형식은 원본 유지 (사용자 확인)
}

// 화이트리스트 매칭 + 별칭 매핑 — 매칭되면 정규 형태 반환, 별칭이면 별칭 표준으로,
// 둘 다 없으면 원본 그대로 유지 (사용자 자유 입력 보존)
function snapToWhitelistLoose(value, whitelist, aliases = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return { value: '', matched: true };
  const norm = normalize(trimmed);
  // 1) 화이트리스트 정확 매칭
  const found = whitelist.find(w => normalize(w) === norm);
  if (found) return { value: found, matched: true, aliased: false };
  // 2) 별칭 매핑
  for (const alias in aliases) {
    if (normalize(alias) === norm) {
      return { value: aliases[alias], matched: true, aliased: true, from: trimmed };
    }
  }
  // 3) 매칭 안 됨 — 원본 보존
  return { value: trimmed, matched: false };
}

// 파일 또는 클립보드 TSV 텍스트를 row 배열로 파싱
//  - 반환: { rows: Array<row>, errors: Array<{rowIdx, message}>, totalRead: number }
//  - row: { name, type, requester, startDate, endDate, status, note, _rowIndex, _errors: [], _warnings: [] }
export async function parseImportSource({ file, pasteText }) {
  let aoa = null; // array of arrays

  if (file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  } else if (pasteText) {
    // TSV (Excel/시트 복사 시 기본 포맷) 또는 CSV 감지
    const text = String(pasteText).replace(/\r\n/g, '\n').trim();
    const sep = text.split('\n')[0].includes('\t') ? '\t' : ',';
    aoa = text.split('\n').map(line => line.split(sep));
  } else {
    return { rows: [], errors: [{ rowIdx: -1, message: '입력 데이터 없음' }], totalRead: 0 };
  }

  if (!aoa || aoa.length < 2) {
    return { rows: [], errors: [{ rowIdx: -1, message: '헤더 + 데이터 행이 필요합니다.' }], totalRead: 0 };
  }

  const headerMap = resolveHeaders(aoa[0]);
  if (!Object.values(headerMap).includes('name')) {
    return { rows: [], errors: [{ rowIdx: 0, message: "'name' / '작업명' 컬럼이 필요합니다." }], totalRead: 0 };
  }

  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const rawRow = aoa[i];
    if (!rawRow || rawRow.every(c => cellToString(c) === '')) continue; // 빈 행 skip
    const row = { _rowIndex: i + 1, _errors: [], _warnings: [] };
    Object.entries(headerMap).forEach(([colIdx, stdKey]) => {
      // 날짜 컬럼은 전용 파서로
      if (stdKey === 'startDate' || stdKey === 'endDate') {
        row[stdKey] = cellToDateString(rawRow[colIdx]);
      } else {
        row[stdKey] = cellToString(rawRow[colIdx]);
      }
    });
    // 필수: name
    if (!row.name) {
      row._errors.push("'작업명' 누락");
    }
    // type — 화이트리스트 + 별칭, 둘 다 안 되면 원본 보존
    const t1 = snapToWhitelistLoose(row.type, TYPE_WHITELIST, TYPE_ALIASES);
    row.type = t1.value || '기타';
    if (t1.aliased) row._warnings.push(`유형 '${t1.from}' → '${t1.value}'`);
    else if (!t1.matched) row._warnings.push(`유형 '${t1.value}' 자유 입력 (표준 외)`);
    // status — 화이트리스트 + 별칭 (미진행→대기 등)
    const s1 = snapToWhitelistLoose(row.status, STATUS_WHITELIST, STATUS_ALIASES);
    row.status = s1.value || '대기';
    if (s1.aliased) row._warnings.push(`상태 '${s1.from}' → '${s1.value}'`);
    else if (!s1.matched) row._warnings.push(`상태 '${s1.value}' 자유 입력 (표준 외)`);
    rows.push(row);
  }

  return { rows, errors: [], totalRead: rows.length };
}

// 임포트 템플릿 (.xlsx) 다운로드
export function downloadImportTemplate() {
  const headers = ['name', 'type', 'requester', 'startDate', 'endDate', 'status', 'note'];
  const sample = [
    ['캘리브레이션 추가', '기능 추가', 'LGES 김선임', '2026-01-15', '2026-02-20', '진행중', '1차 협의 완료'],
    ['UI 색상 변경', 'UI 변경', 'A전자 박과장', '2026-02-01', '', '대기', ''],
    ['알람 메시지 보완', '기능 개선', '', '', '', '대기', '내부 요청'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(14, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '추가 대응 임포트');
  XLSX.writeFile(wb, '추가대응_임포트_템플릿.xlsx');
}

// === 버전 이력 임포트 (초기 일괄 등록) ===
const VERSION_HEADER_ALIASES = {
  category:    ['category', '카테고리', '분류', '구분'],
  version:     ['version', '버전', 'ver'],
  releaseDate: ['releasedate', '출시일', '배포일', '날짜', 'date'],
  note:        ['note', '변경노트', '노트', '비고', '내용', '변경사항'],
};

function resolveVersionHeaders(rawHeaders) {
  const map = {};
  rawHeaders.forEach((h, i) => {
    const norm = normalize(h);
    for (const stdKey in VERSION_HEADER_ALIASES) {
      if (VERSION_HEADER_ALIASES[stdKey].some(alias => normalize(alias) === norm)) {
        map[i] = stdKey;
        break;
      }
    }
  });
  return map;
}

// 버전 이력 파일/붙여넣기 파싱
export async function parseVersionImportSource({ file, pasteText }) {
  let aoa = null;
  if (file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  } else if (pasteText) {
    const text = String(pasteText).replace(/\r\n/g, '\n').trim();
    const sep = text.split('\n')[0].includes('\t') ? '\t' : ',';
    aoa = text.split('\n').map(line => line.split(sep));
  } else {
    return { rows: [], errors: [{ rowIdx: -1, message: '입력 데이터 없음' }], totalRead: 0 };
  }
  if (!aoa || aoa.length < 2) {
    return { rows: [], errors: [{ rowIdx: -1, message: '헤더 + 데이터 행이 필요합니다.' }], totalRead: 0 };
  }
  const headerMap = resolveVersionHeaders(aoa[0]);
  const stdKeys = Object.values(headerMap);
  if (!stdKeys.includes('category') || !stdKeys.includes('version')) {
    return { rows: [], errors: [{ rowIdx: 0, message: "'category'/'카테고리' 와 'version'/'버전' 컬럼이 모두 필요합니다." }], totalRead: 0 };
  }
  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const rawRow = aoa[i];
    if (!rawRow || rawRow.every(c => cellToString(c) === '')) continue;
    const row = { _rowIndex: i + 1, _errors: [], _warnings: [] };
    Object.entries(headerMap).forEach(([colIdx, stdKey]) => {
      if (stdKey === 'releaseDate') row[stdKey] = cellToDateString(rawRow[colIdx]);
      else row[stdKey] = cellToString(rawRow[colIdx]);
    });
    if (!row.category) row._errors.push("'카테고리' 누락");
    if (!row.version)  row._errors.push("'버전' 누락");
    rows.push(row);
  }
  return { rows, errors: [], totalRead: rows.length };
}

export function downloadVersionImportTemplate() {
  const headers = ['category', 'version', 'releaseDate', 'note'];
  const sample = [
    ['HW', 'Rev.A', '2025-06-01', '초도 출하'],
    ['HW', 'Rev.B', '2025-09-15', '냉각 채널 개선'],
    ['SW', 'v1.0.0', '2025-06-01', '초도 릴리즈'],
    ['SW', 'v1.2.0', '2025-08-10', '알람 화면 개선'],
    ['FW', '1.00.00', '2025-06-01', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(14, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '버전 이력 임포트');
  XLSX.writeFile(wb, '버전이력_임포트_템플릿.xlsx');
}
