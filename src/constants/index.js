export const PROJECT_PHASES = ['영업/수주', '설계', '구매/자재', '제조/조립', '출하', '현장 셋업', '워런티', '완료'];
// 기존 7단계 (완료=6) → 신 8단계 (완료=7) 호환을 위한 마이그레이션 인덱스
export const PHASE_COMPLETED_INDEX = 7;
export const PHASE_WARRANTY_INDEX = 6;
export const ISSUE_PHASES = ['이슈 확인', '조치 진행 중', '조치 완료'];
export const PART_PHASES = ['청구', '발주', '입고', '교체완료'];

// AS 분류 — HW(현장 출동형) / SW(원격 패치형) 단계 분기
export const AS_CATEGORIES = ['HW', 'SW'];
export const AS_HW_TYPES = ['정기점검', '긴급출동', '부품교체', '불량수리', '보증수리'];
export const AS_SW_TYPES = ['버그 수정', '기능 개선', '성능 튜닝', '설정 변경', '데이터 복구', '보안 패치'];
export const AS_HW_STATUSES = ['접수', '출동', '조치', '완료'];
export const AS_SW_STATUSES = ['접수', '분석', '개발', '적용', '검증', '완료'];
// 기존 레코드는 category 없음 → HW로 간주 (마이그레이션)
export const AS_DEFAULT_CATEGORY = 'HW';
export const getASTypesByCategory = (cat) => cat === 'SW' ? AS_SW_TYPES : AS_HW_TYPES;
export const getASStatusesByCategory = (cat) => cat === 'SW' ? AS_SW_STATUSES : AS_HW_STATUSES;
// === 도메인 계층화 (대분류 / 중분류) ===
// 대분류 — 시스템 차원 고정 목록 (ADMIN만 수정 가능, 향후 settings로 이전 가능)
export const PARENT_DOMAINS = ['2차전지', '반도체', '디스플레이'];
// 중분류 기본값 — 신규 등록 시 추천. settings.subDomains로 사용자 추가/삭제 가능
export const SUB_DOMAIN_PRESETS = {
  '2차전지': ['EOL', 'ESS', '사이클러'],
  '반도체': ['플라즈마'],
  '디스플레이': []
};

// 레거시 단일 도메인 → 신 (domain, subDomain) 분리
// 기존 데이터/시드 호환을 위한 마이그레이션 매핑
export const migrateLegacyDomain = (legacy) => {
  if (!legacy) return { domain: '', subDomain: '' };
  if (legacy === '2차전지 EOL')      return { domain: '2차전지', subDomain: 'EOL' };
  if (legacy === '2차전지 사이클러') return { domain: '2차전지', subDomain: '사이클러' };
  if (PARENT_DOMAINS.indexOf(legacy) >= 0) return { domain: legacy, subDomain: '' };
  return { domain: legacy, subDomain: '' };
};

export const isBatteryDomain = (domain) => domain === '2차전지';
export const formatDomain = (domain, subDomain) =>
  (domain && subDomain) ? `${domain} · ${subDomain}` : (domain || '');

// 시드 조회 헬퍼 — '대분류/중분류' 키 우선, 없으면 '대분류' 폴백
const lookupSeed = (table, domain, subDomain, fallback = []) => {
  if (subDomain && table[`${domain}/${subDomain}`]) return table[`${domain}/${subDomain}`];
  if (table[domain]) return table[domain];
  return fallback;
};

// 레거시: 이전 코드와 호환 (기존 DOMAINS 사용처 점진 마이그레이션용)
export const DOMAINS = ['반도체', '디스플레이', '2차전지 사이클러', '2차전지 EOL'];
export const BATTERY_DOMAINS = ['2차전지 사이클러', '2차전지 EOL'];

// 빌드 타임 환경 변수: REACT_APP_TEST_MODE
// "true"  → 사내 테스트 모드 (다중 계정 자동 시드, 강제 변경 끔, 안내 노출)
// "false" 또는 미설정 → 운영 모드 (관리자 1명만 시드 + 강제 변경)
export const TEST_MODE = (process.env.REACT_APP_TEST_MODE || '').toLowerCase() === 'true';

// 운영 모드 시드 (테이블이 비어있을 때 1회 자동 생성)
// 비밀번호 평문 'admin1234' — 첫 로그인 직후 변경 강제됨
export const SEED_ADMIN = {
  id: 'admin',
  pw: 'admin1234',
  name: '본사 관리자',
  email: '',
  role: 'ADMIN',
  dept: '운영팀',
  customer: '',
  assignedProjectIds: [],
  active: true,
  mustChangePassword: true,
  createdAt: '',
  lastLoginAt: ''
};

// 사내 테스트 모드 시드 (4개 권한별 계정, 비밀번호 모두 '1234')
// 강제 변경 비활성화 — 시연/QA 흐름이 막히지 않도록
export const SEED_TEST_USERS = [
  { id: 'admin',  pw: '1234', name: '본사 관리자',     email: 'admin@example.com',  role: 'ADMIN',    dept: '운영팀',     customer: '',     assignedProjectIds: [], active: true, mustChangePassword: false },
  { id: 'pm',     pw: '1234', name: '김철수 PM',       email: 'pm@example.com',     role: 'PM',       dept: '제조기술팀', customer: '',     assignedProjectIds: [], active: true, mustChangePassword: false },
  { id: 'eng',    pw: '1234', name: '이셋업 선임',     email: 'eng@example.com',    role: 'ENGINEER', dept: 'CS팀',       customer: '',     assignedProjectIds: [], active: true, mustChangePassword: false },
  { id: 'client', pw: '1234', name: 'A전자 담당자',    email: 'client@a-elec.com',  role: 'CUSTOMER', dept: '',           customer: 'A전자', assignedProjectIds: ['PRJ-2026-001'], active: true, mustChangePassword: false }
];

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: '본사 관리자' },
  { value: 'PM', label: '현장 PM' },
  { value: 'ENGINEER', label: '엔지니어' },
  { value: 'CUSTOMER', label: '고객사' }
];

// 엔지니어 직급 추천 옵션 (회사마다 다를 수 있어 datalist로 자유 입력 가능)
export const ENGINEER_GRADES = [
  '사원', '주임', '대리', '선임', '책임', '수석', '과장', '차장', '부장', '이사'
];

// 도메인별 버전 카테고리 추천 (자유 추가 가능)
// 키 컨벤션: '대분류' 또는 '대분류/중분류' (중분류 우선 → 대분류 폴백)
export const DOMAIN_VERSION_CATEGORIES = {
  '2차전지': ['HW', 'SW', '충방전기 FW', '인터페이스 FW'],
  '2차전지/사이클러': ['HW', 'SW', '충방전기 FW', '인터페이스 FW'],
  '2차전지/EOL': ['HW', 'SW', '충방전기 FW', '인터페이스 FW'],
  '반도체': ['HW', 'SW', 'FW'],
  '디스플레이': ['HW', 'SW', 'FW']
};
export const DEFAULT_VERSION_CATEGORIES = ['HW', 'SW', 'FW'];
export const getVersionCategoriesForDomain = (domain, subDomain) =>
  lookupSeed(DOMAIN_VERSION_CATEGORIES, domain, subDomain, DEFAULT_VERSION_CATEGORIES);

// 도메인별 태스크 시드 — 키: '대분류' 또는 '대분류/중분류'
// 중분류별 특화 시드가 있으면 사용, 없으면 대분류 기본 시드 사용
export const DOMAIN_TASKS = {
  '반도체': [
    { id: 1, name: '장비 반입, 도킹 및 Leveling', isCompleted: false, delayReason: '' },
    { id: 2, name: '유틸리티 (PCW, Power, Gas, Vacuum) 훅업', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 I/O, Interlock 체크', isCompleted: false, delayReason: '' },
    { id: 4, name: '소프트웨어 셋업 및 SECS/GEM 통신 연동', isCompleted: false, delayReason: '' },
    { id: 5, name: '웨이퍼 로봇 티칭 및 이송 테스트', isCompleted: false, delayReason: '' },
    { id: 6, name: '공정(Process) 테스트 및 수율 확보', isCompleted: false, delayReason: '' },
    { id: 7, name: '최종 검수 (Buy-off) 및 인수인계', isCompleted: false, delayReason: '' },
  ],
  '디스플레이': [
    { id: 1, name: '챔버/모듈 반입 및 프레임 조립', isCompleted: false, delayReason: '' },
    { id: 2, name: '유틸리티 (Power, PCW, CDA) 훅업', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 System Alarm Clear', isCompleted: false, delayReason: '' },
    { id: 4, name: '글라스 이송 로봇 및 스테이지 얼라인먼트', isCompleted: false, delayReason: '' },
    { id: 5, name: '진공/플라즈마 테스트 및 Tact Time 최적화', isCompleted: false, delayReason: '' },
    { id: 6, name: '최종 양산 평가 (Buy-off) 및 인수인계', isCompleted: false, delayReason: '' },
  ],
  // 2차전지 대분류 기본 — 사이클러 시드를 일반 템플릿으로 (신규 중분류는 이걸 상속)
  '2차전지': [
    { id: 1, name: '랙(Rack) 및 채널 유닛 반입/조립', isCompleted: false, delayReason: '' },
    { id: 2, name: '대전류 케이블 및 통신 케이블 포설', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 BMS 네트워크 훅업', isCompleted: false, delayReason: '' },
    { id: 4, name: '채널별 전압/전류(V/I) 캘리브레이션', isCompleted: false, delayReason: '' },
    { id: 5, name: '충방전 프로파일 구동 및 발열 테스트', isCompleted: false, delayReason: '' },
    { id: 6, name: '화재/온도 보호 인터락 동작 테스트', isCompleted: false, delayReason: '' },
    { id: 7, name: '최종 검수 (Buy-off) 및 고객 인수인계', isCompleted: false, delayReason: '' },
  ],
  '2차전지/사이클러': [
    { id: 1, name: '랙(Rack) 및 채널 유닛 반입/조립', isCompleted: false, delayReason: '' },
    { id: 2, name: '대전류 케이블 및 통신 케이블 포설', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 BMS 네트워크 훅업', isCompleted: false, delayReason: '' },
    { id: 4, name: '채널별 전압/전류(V/I) 캘리브레이션', isCompleted: false, delayReason: '' },
    { id: 5, name: '충방전 프로파일 구동 및 발열 테스트', isCompleted: false, delayReason: '' },
    { id: 6, name: '화재/온도 보호 인터락 동작 테스트', isCompleted: false, delayReason: '' },
    { id: 7, name: '최종 검수 (Buy-off) 및 고객 인수인계', isCompleted: false, delayReason: '' },
  ],
  '2차전지/EOL': [
    { id: 1, name: '라인 반입 및 컨베이어/스토퍼 도킹', isCompleted: false, delayReason: '' },
    { id: 2, name: '전원, 공압 훅업 및 I/O 테스트', isCompleted: false, delayReason: '' },
    { id: 3, name: '계측기 (IR/OCV, 헬륨 리크 디텍터) 셋업', isCompleted: false, delayReason: '' },
    { id: 4, name: '바코드/비전 스캐너 연동 및 상위 MES 통신', isCompleted: false, delayReason: '' },
    { id: 5, name: '마스터 샘플 검증 (Gauge R&R, Cpk 확보)', isCompleted: false, delayReason: '' },
    { id: 6, name: '최종 검수 (Buy-off) 및 양산 이관', isCompleted: false, delayReason: '' },
  ],
};
export const getTasksForDomain = (domain, subDomain) => lookupSeed(DOMAIN_TASKS, domain, subDomain);

// 도메인별 체크리스트 시드 — 키 컨벤션 동일 ('대분류' 또는 '대분류/중분류')
export const DOMAIN_CHECKLIST = {
  '반도체': [
    { category: '기구/반입', task: '장비 Leveling (±0.05도) 및 내진 고정 확인', status: 'Pending', note: '' },
    { category: '유틸리티', task: 'PCW 수압, Leak 여부 및 Vacuum 도달 압력 확인', status: 'Pending', note: '' },
    { category: '소프트웨어', task: '초기 부팅 Error 및 SECS/GEM Online 상태', status: 'Pending', note: '' },
    { category: '로봇/이송', task: 'Wafer 핸들링 간섭 및 긁힘(Scratch) 여부', status: 'Pending', note: '' },
    { category: '안전/환경', task: 'EMO 동작 및 Door Interlock, 파티클 기준치 달성', status: 'Pending', note: '' },
  ],
  '디스플레이': [
    { category: '기구/반입', task: '모듈간 도킹 단차 및 프레임 Leveling 확인', status: 'Pending', note: '' },
    { category: '유틸리티', task: 'CDA 압력, PCW 누수 및 Main Power 상 확인', status: 'Pending', note: '' },
    { category: '제어/로봇', task: 'Glass 이송 스테이지 Alignment 및 간섭 확인', status: 'Pending', note: '' },
    { category: '공정', task: '진공 도달 시간 및 플라즈마 방전 안정성 확인', status: 'Pending', note: '' },
    { category: '안전/환경', task: '안전 펜스 센서, EMO 및 배기(Exhaust) 정상 작동', status: 'Pending', note: '' },
  ],
  '2차전지': [
    { category: '기구/전장', task: '랙(Rack) 하중 고정 및 절연/접지 저항 규격 확인', status: 'Pending', note: '' },
    { category: '전장', task: '채널별 대전류 단자 체결 토크 및 케이블 마감', status: 'Pending', note: '' },
    { category: '소프트웨어', task: '채널 인식 상태 및 BMS 연동 통신 에러 확인', status: 'Pending', note: '' },
    { category: '계측/공정', task: 'V/I Calibration 후 편차 기준치 이내 확인', status: 'Pending', note: '' },
    { category: '안전/환경', task: '과전압/과전류 알람 및 화재 감지/소화 연동 테스트', status: 'Pending', note: '' },
  ],
  '2차전지/사이클러': [
    { category: '기구/전장', task: '랙(Rack) 하중 고정 및 절연/접지 저항 규격 확인', status: 'Pending', note: '' },
    { category: '전장', task: '채널별 대전류 단자 체결 토크 및 케이블 마감', status: 'Pending', note: '' },
    { category: '소프트웨어', task: '채널 인식 상태 및 BMS 연동 통신 에러 확인', status: 'Pending', note: '' },
    { category: '계측/공정', task: 'V/I Calibration 후 편차 기준치 이내 확인', status: 'Pending', note: '' },
    { category: '안전/환경', task: '과전압/과전류 알람 및 화재 감지/소화 연동 테스트', status: 'Pending', note: '' },
  ],
  '2차전지/EOL': [
    { category: '기구/반입', task: '컨베이어 수평, 롤러 상태 및 스토퍼 위치 확인', status: 'Pending', note: '' },
    { category: '전장/유틸', task: 'I/O 센서 동작, 공압 실린더 구동 및 Power 확인', status: 'Pending', note: '' },
    { category: '계측', task: 'IR/OCV 측정 영점 세팅 및 리크 디텍터 감도 확인', status: 'Pending', note: '' },
    { category: '통신/제어', task: '바코드 리딩률, PLC 및 MES(상위) 데이터 매핑', status: 'Pending', note: '' },
    { category: '안전/환경', task: 'Area Sensor(광센서) 동작 및 EMO 비상정지 확인', status: 'Pending', note: '' },
  ],
};
export const getChecklistForDomain = (domain, subDomain) => lookupSeed(DOMAIN_CHECKLIST, domain, subDomain);

// 실시간 오늘 날짜 — 시간 부분은 0시로 정규화 (D-Day 계산 정확도)
export const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

export const GAS_URL = "https://script.google.com/macros/s/AKfycbwVargrc_T8Gw-GJeqv1WtsmiRv5i62lhqJ60ut8aOjhAkBtDR8Ztl7cVfoHtmn4mfh3g/exec";
export const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwVargrc_T8Gw-GJeqv1WtsmiRv5i62lhqJ60ut8aOjhAkBtDR8Ztl7cVfoHtmn4mfh3g/exec";

export const INITIAL_PROJECTS = [
  { id: 'PRJ-2026-001', domain: '반도체', name: 'A사 텍사스 Fab 신규 셋업', customer: 'A전자', site: 'US-Texas Fab2', startDate: '2026-03-01', dueDate: '2026-06-30', status: '진행중', manager: '김철수 PM', hwVersion: 'Rev.A', swVersion: 'v2.1.0', fwVersion: '1.05.00', phaseIndex: 5, notionLink: 'https://www.notion.so/', tasks: [...DOMAIN_TASKS['반도체'].map((t, i) => i < 3 ? {...t, isCompleted: true} : t)], checklist: [...DOMAIN_CHECKLIST['반도체'].map((c, i) => ({ ...c, id: Date.now()+i, status: i < 3 ? 'OK' : 'Pending' }))], signOff: null },
  { id: 'PRJ-2026-002', domain: '디스플레이', name: 'B사 평택 라인 장비 개조', customer: 'B반도체', site: 'KR-Pyeongtaek P3', startDate: '2026-01-15', dueDate: '2026-04-15', status: '마감임박', manager: '이영희 책임', hwVersion: 'Rev.B (Mod)', swVersion: 'v1.8.4', fwVersion: '1.04.12', phaseIndex: 5, notionLink: '', tasks: [...DOMAIN_TASKS['디스플레이'].map((t, i) => i < 5 ? {...t, isCompleted: true} : t)], checklist: [...DOMAIN_CHECKLIST['디스플레이'].map((c, i) => ({ ...c, id: Date.now()+10+i, status: i < 4 ? 'OK' : 'Pending' }))], signOff: null }
];

export const INITIAL_ISSUES = [
  { id: 'ISS-001', projectId: 'PRJ-2026-001', projectName: 'A사 텍사스 Fab 신규 셋업', title: '파워 케이블 스펙 변경 필요', severity: 'Medium', status: '조치 진행 중', date: '2026-04-02', author: '이셋업 선임', alertEmail: '', comments: [{ id: 1, author: '박구매 책임', text: '대체 케이블 스펙 확인하여 현지 발주 넣었습니다.', date: '2026-04-03 09:30' }], photo: null },
  { id: 'ISS-002', projectId: 'PRJ-2026-002', projectName: 'B사 평택 라인 장비 개조', title: '소프트웨어 통신 에러 (SECS/GEM)', severity: 'High', status: '조치 완료', date: '2026-03-28', author: '박제어 책임', alertEmail: '', comments: [] },
];

export const INITIAL_RELEASES = [{ id: 'REL-001', type: 'SW', version: 'v2.1.0', date: '2026-04-01', author: '최개발 선임', description: '에러 수정' }];

export const INITIAL_ENGINEERS = [
  { id: 'ENG-001', name: '김철수 PM', dept: '제조기술팀', role: 'Project Manager', currentSite: 'US-Texas Fab2', status: '현장 파견', accessExpiry: '2026-12-31' },
  { id: 'ENG-002', name: '이영희 책임', dept: 'CS팀', role: '제어 엔지니어', currentSite: 'KR-Pyeongtaek P3', status: '현장 파견', accessExpiry: '2026-04-15' },
  { id: 'ENG-003', name: '박지성 선임', dept: 'CS팀', role: '셋업 엔지니어', currentSite: 'KR-Gumi L8', status: '본사 복귀', accessExpiry: '2026-08-20' }
];

export const INITIAL_PARTS = [{ id: 'PRT-001', projectId: 'PRJ-2026-001', projectName: 'A사 텍사스 Fab 신규 셋업', partName: 'O-Ring', partNumber: 'OR-V-050', quantity: 10, urgency: 'High', status: '발주', date: '2026-04-02', author: '이셋업 선임', photo: null }];

export const INITIAL_SITES = [{ id: 'SIT-001', customer: 'A전자', fab: 'US-Texas Fab2', line: 'Ph 1 Cleanroom', power: '208V', pcw: '수압 4.0 kgf/cm2', gas: 'CDA 6kgf', limit: '최대 2.5T', note: '', date: '2026-04-01' }];
