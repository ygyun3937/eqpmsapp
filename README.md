# EQ-PMS (Equipment Project Management System)

장비 프로젝트 셋업 관리 시스템  
반도체 / 디스플레이 / 2차전지 장비의 현장 셋업 프로젝트를 통합 관리하는 웹 애플리케이션

---

## 1. 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | React 19 (Create React App) |
| UI/스타일링 | Tailwind CSS (CDN), Lucide React Icons |
| 백엔드/DB | Google Apps Script (GAS) Web App → Google Sheets |
| 알림 | Google Apps Script Webhook |
| 배포 | 정적 빌드 (SPA), standalone HTML도 지원 |
| 언어 지원 | 한국어 / English 실시간 전환 |

---

## 2. 프로젝트 구조

```
eq-pms-app/
├── public/                  # 프로덕션 빌드 결과물
│   ├── index.html           # 빌드된 HTML
│   └── static/              # 빌드된 CSS/JS 번들
├── src/
│   ├── App.js               # ★ 전체 애플리케이션 로직 (싱글 파일, ~2,300줄)
│   ├── App.css              # 커스텀 스타일
│   ├── index.js             # React 엔트리포인트
│   ├── index.html           # standalone 버전 (빌드 없이 브라우저 직접 실행 가능)
│   └── index.css            # 글로벌 스타일
├── package.json
└── README.md
```

> `App.js` 하나에 상수, 유틸리티, UI 컴포넌트, 모달, 페이지 뷰, 메인 App이 모두 포함된 **싱글 파일 구조**

---

## 3. 전체 시스템 아키텍처

```
[사용자 브라우저]
    │
    ├── PC 데스크톱 모드 (사이드바 + 7개 메뉴)
    │
    └── 모바일 현장 모드 (하단탭 + 카메라/갤러리 직접 연동)
         │
         ▼
[React SPA (App.js)]
    │
    ├── useState로 로컬 상태 관리 (프로젝트/이슈/자재/인력 등)
    │
    ├── saveToGoogleDB() ──→ [Google Apps Script Web App] ──→ [Google Sheets DB]
    │
    └── notifyWebhook()  ──→ [GAS Webhook] ──→ 이메일/알림 발송
```

```mermaid
graph LR
    Browser[사용자 브라우저] -->|React SPA| App[App.js]
    App -->|CRUD| GAS[Google Apps Script]
    App -->|알림| Webhook[GAS Webhook]
    GAS -->|Read/Write| GSheet[(Google Sheets)]
```

---

## 4. 사용자 역할 및 권한

4개 역할 기반 접근 제어 (RBAC). 로그인 시 역할에 따라 메뉴/버튼이 자동으로 제한됨.

| 역할 | ID / PW | 설명 | 접근 범위 |
|------|---------|------|-----------|
| **ADMIN** | `admin` / `1234` | 본사 관리자 | 전체 메뉴 + 삭제 권한 |
| **PM** | `pm` / `1234` | 프로젝트 매니저 | 전체 메뉴 (프로젝트 관리 중심) |
| **ENGINEER** | `eng` / `1234` | 셋업 엔지니어 | 전체 메뉴 (업무 확인/이슈 등록 중심) |
| **CUSTOMER** | `client` / `1234` | 고객사 담당자 (A전자) | 대시보드/프로젝트/이슈 열람 + Buy-off 서명만 가능 |

- CUSTOMER 역할은 자재/사이트/인력/릴리즈 메뉴가 숨겨짐
- CUSTOMER는 파이프라인 단계 변경 불가 (읽기 전용)

---

## 5. 주요 기능 (7개 메뉴)

### 5-1. 대시보드 (Dashboard)
- 프로젝트 현황 통계 카드: 총 프로젝트 수, 진행중, 미해결 이슈, 완료
- 상태별 분포 도넛 차트
- 도메인별 프로젝트 수 바 차트
- 엔지니어 파견 현황 요약

### 5-2. 프로젝트 관리 (Projects)
- 프로젝트 생성/조회/삭제 (CRUD)
- **7단계 파이프라인 스테퍼**: 영업/수주 → 설계 → 구매/자재 → 제조/조립 → 출하 → 현장 셋업 → 완료
- 도메인 선택 시 해당 도메인의 기본 셋업 태스크 & 체크리스트 자동 로드
- **기대 진행률 vs 실제 진행률** 비교 (일정 기반 vs 태스크 완료 기반)
- 리스트 뷰 / 간트 차트 뷰 전환
- HW / SW / FW 버전 관리
- ICS 캘린더 파일 다운로드 / 구글 캘린더 일정 추가
- Notion 링크 연동
- 프로젝트별 미해결 이슈 뱃지 표시 → 클릭하면 이슈 목록 드롭다운

### 5-3. 이슈/펀치 관리 (Issues)
- 이슈 등록 (심각도: High / Medium / Low)
- **3단계 이슈 추적**: 이슈 확인 → 조치 진행 중 → 조치 완료
- 코멘트 스레드 (담당자 간 소통)
- 현장 사진 첨부 (카메라 촬영 / 갤러리 선택)
- 이슈 등록 시 알림 이메일 지정 → Webhook으로 알림 발송

### 5-4. 자재/스페어파트 (Parts)
- 자재 청구 등록: 부품명, 파트넘버, 수량, 긴급도, 사진 첨부
- **4단계 자재 추적**: 청구 → 발주 → 입고 → 교체완료
- 긴급도별 필터링 (High / Medium / Low)

### 5-5. 사이트/유틸 마스터 (Sites)
- 고객사 Fab 인프라 정보 등록/수정/삭제
- 관리 항목: 전력(Power), 냉각수(PCW), 가스(Gas), 반입 중량 제한, 특이사항
- 현장 엔지니어가 셋업 전 인프라 제약 조건을 사전 확인하는 용도

### 5-6. 인력/리소스 관리 (Resources)
- 엔지니어 정보 등록/수정/삭제: 이름, 소속, 역할, 현재 파견지
- 상태 관리: 현장 파견 / 본사 복귀
- **출입 권한 만료일** 추적 (만료 임박 시 경고)
- 배정 프로젝트 연결

### 5-7. 버전 릴리즈 관리 (Releases)
- HW / SW / FW 릴리즈 이력 등록/삭제
- 버전별 변경 사항(Description) 기록
- 작성자 및 일자 관리

---

## 6. 장비 셋업 프로세스 (도메인별)

프로젝트 생성 시 **4개 도메인** 중 선택하면, 해당 도메인에 맞는 셋업 태스크와 Buy-off 체크리스트가 자동으로 세팅됨.

### 반도체 (7단계)
1. 장비 반입, 도킹 및 Leveling
2. 유틸리티 (PCW, Power, Gas, Vacuum) 훅업
3. 전원 인가 및 I/O, Interlock 체크
4. 소프트웨어 셋업 및 SECS/GEM 통신 연동
5. 웨이퍼 로봇 티칭 및 이송 테스트
6. 공정(Process) 테스트 및 수율 확보
7. **최종 검수 (Buy-off) 및 인수인계**

> 체크리스트: Leveling 확인, PCW/Vacuum 압력, SECS/GEM Online, 웨이퍼 Scratch, EMO/파티클

### 디스플레이 (6단계)
1. 챔버/모듈 반입 및 프레임 조립
2. 유틸리티 (Power, PCW, CDA) 훅업
3. 전원 인가 및 System Alarm Clear
4. 글라스 이송 로봇 및 스테이지 얼라인먼트
5. 진공/플라즈마 테스트 및 Tact Time 최적화
6. **최종 양산 평가 (Buy-off) 및 인수인계**

> 체크리스트: 도킹 단차/Leveling, CDA/PCW/Power, Glass Alignment, 진공/플라즈마, 안전펜스/EMO

### 2차전지 사이클러 (7단계)
1. 랙(Rack) 및 채널 유닛 반입/조립
2. 대전류 케이블 및 통신 케이블 포설
3. 전원 인가 및 BMS 네트워크 훅업
4. 채널별 전압/전류(V/I) 캘리브레이션
5. 충방전 프로파일 구동 및 발열 테스트
6. 화재/온도 보호 인터락 동작 테스트
7. **최종 검수 (Buy-off) 및 고객 인수인계**

> 체크리스트: 절연/접지 저항, 체결 토크, BMS 통신, V/I 편차, 과전압/화재 알람

### 2차전지 EOL (6단계)
1. 라인 반입 및 컨베이어/스토퍼 도킹
2. 전원, 공압 훅업 및 I/O 테스트
3. 계측기 (IR/OCV, 헬륨 리크 디텍터) 셋업
4. 바코드/비전 스캐너 연동 및 상위 MES 통신
5. 마스터 샘플 검증 (Gauge R&R, Cpk 확보)
6. **최종 검수 (Buy-off) 및 양산 이관**

> 체크리스트: 컨베이어/롤러, I/O/공압, IR/OCV 영점, 바코드/MES 매핑, Area Sensor/EMO

---

## 7. 프로젝트 라이프사이클 (전체 흐름)

```
[프로젝트 생성]
    │  도메인 선택 (반도체/디스플레이/2차전지 사이클러/2차전지 EOL)
    │  기본 정보 입력 (고객사, 사이트, 일정, 담당 PM)
    ▼
[파이프라인 관리]
    │  영업/수주 → 설계 → 구매/자재 → 제조/조립 → 출하 → 현장 셋업 → 완료
    │  각 단계 클릭으로 진행 상태 변경
    ▼
[현장 셋업 단계]
    │  도메인별 셋업 태스크 체크 (완료 토글)
    │  지연 발생 시 사유 입력
    │  이슈 발생 시 이슈 등록 + 사진 첨부 + 알림
    │  필요 자재 청구 (청구→발주→입고→교체완료)
    ▼
[Buy-off 검수]
    │  도메인별 체크리스트 항목 OK/NG/N-A 판정
    │  모든 항목 확인 후 고객 서명 (SignaturePad)
    ▼
[완료]
    │  Buy-off Report PDF 자동 생성 및 인쇄
    │  프로젝트 상태 "완료"로 전환
    └  CSV 데이터 내보내기 가능
```

```mermaid
flowchart TD
    A[프로젝트 생성<br/>도메인 선택 + 기본정보] --> B[파이프라인 7단계 관리]
    B --> C[현장 셋업]
    C --> D[셋업 태스크 수행]
    C --> E[이슈 발생 시 등록]
    C --> F[자재 필요 시 청구]
    D --> G[Buy-off 체크리스트 점검]
    E --> E1[이슈 확인 → 조치 진행 → 조치 완료]
    F --> F1[청구 → 발주 → 입고 → 교체완료]
    E1 --> G
    F1 --> G
    G --> H[고객 서명 SignOff]
    H --> I[Buy-off Report PDF 출력]
    I --> J[프로젝트 완료]
```

---

## 8. PC 모드 vs 모바일 현장 모드

하나의 앱에서 버튼 하나로 PC/모바일 모드를 전환 가능.

| 구분 | PC 데스크톱 모드 | 모바일 현장 모드 |
|------|-----------------|-----------------|
| **레이아웃** | 좌측 사이드바 + 상단 헤더 + 메인 콘텐츠 | 상단 헤더 + 하단 탭바 (고정) |
| **메뉴 수** | 7개 전체 | 4개 (홈/프로젝트/이슈/인프라) |
| **이슈 등록** | 일반 폼 모달 | 전체 화면 모달 + 카메라/갤러리 직접 연동 |
| **자재 청구** | 일반 폼 모달 | 전체 화면 모달 (현장 최적화 UI) |
| **대시보드** | 통계 차트 + 상세 테이블 | 빠른 액션 버튼 4개 + 배정 현장 요약 카드 |
| **전환 방법** | 헤더의 "모바일 현장 모드" 버튼 | 헤더의 "PC화면" 버튼 |

---

## 9. App.js 내부 코드 구성 (6개 섹션)

| 섹션 | 라인 범위 | 내용 |
|------|----------|------|
| **1. 전역 상수/데이터** | 1~101 | PROJECT_PHASES, MOCK_USERS, DOMAIN_TASKS (도메인별 셋업 태스크), DOMAIN_CHECKLIST (도메인별 검수표) |
| **2. 유틸리티 함수** | 104~230 | getStatusColor, calcExp(기대진행률), calcAct(실제진행률), downloadICS, openGoogleCalendar, generatePDF, exportToCSV |
| **3. 공통 UI 컴포넌트** | 232~418 | NavItem, StatCard, SimpleDonutChart, SimpleBarChart, ProjectPipelineStepper, ProjectIssueBadge, SignaturePad |
| **4. 모달 래퍼** | 419~455 | ModalWrapper (공통 모달 프레임) |
| **5. 개별 모달** | 456~806 | ProjectModal, SiteModal, IssueModal, PartModal, DailyReportModal, VersionModal, ReleaseModal, EngineerModal |
| **6. 페이지 뷰 + 메인** | 807~2319 | DashboardView, ProjectListView(리스트+간트), IssueListView, PartsListView, SiteListView, ResourceListView, VersionHistoryView, LoginScreen, MobileIssueModal, MobilePartModal, DeleteConfirmModal, **App (export default)** |

---

## 10. Google Apps Script 연동

`App.js`의 `GAS_URL`에 웹앱 URL을 설정하면 모든 CRUD가 Google Sheets에 자동 동기화됨.

### 동작 방식
1. 사용자가 UI에서 데이터 변경 (생성/수정/삭제)
2. React state 즉시 업데이트 (화면 반영)
3. `saveToGoogleDB(type, payload)`로 GAS에 비동기 POST
4. GAS가 Google Sheets에 데이터 기록
5. 이슈 등록 시 `notifyWebhook()`으로 추가 알림 발송

### 지원 API 액션 목록

| 대상 | 생성 | 수정 | 삭제 |
|------|------|------|------|
| 프로젝트 | ADD_PROJECT | UPDATE_PHASE | DELETE_PROJECT |
| 태스크 | ADD_TASK | TOGGLE_TASK, EDIT_TASK_NAME, UPDATE_DELAY_REASON | DELETE_TASK |
| 체크리스트 | ADD_CHECKLIST_ITEM, LOAD_DEFAULT_CHECKLIST | UPDATE_CHECKLIST | DELETE_CHECKLIST_ITEM |
| 이슈 | ADD_ISSUE | UPDATE_ISSUE_STATUS | DELETE_ISSUE |
| 코멘트 | ADD_COMMENT | - | - |
| 자재 | ADD_PART | UPDATE_PART_STATUS | DELETE_PART |
| 사이트 | ADD_SITE | UPDATE_SITE | DELETE_SITE |
| 엔지니어 | ADD_ENGINEER | UPDATE_ENGINEER | DELETE_ENGINEER |
| 릴리즈 | ADD_RELEASE | - | DELETE_RELEASE |
| 기타 | ADD_DAILY_REPORT, SIGN_OFF | UPDATE_VERSION | - |

---

## 11. 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm start

# 프로덕션 빌드
npm run build
```

`src/index.html`을 브라우저에서 직접 열면 빌드 없이도 standalone으로 실행 가능 (Babel 인라인 트랜스파일 방식).
