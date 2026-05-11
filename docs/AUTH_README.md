# MAK-PMS 로그인/사용자 관리 적용 가이드

## 변경 요약
- 기존 4개 고정 계정(`MOCK_USERS`) 제거
- 사용자 정보를 Google Sheets(`users` 시트)에 저장하고 GAS API 로 CRUD
- 비밀번호는 SHA-256 + salt 해시 저장 (Web Crypto API)
- ADMIN 전용 "사용자 관리" 화면 추가 (추가 / 편집 / 비활성화 / 비밀번호 초기화 / 삭제)
- 모든 사용자: 헤더의 열쇠 아이콘으로 자기 비밀번호 변경
- `mustChangePassword` 플래그가 켜진 계정은 로그인 직후 비밀번호 변경 모달이 강제 표시
- 고객사(`CUSTOMER`) 계정은 사용자별로 `assignedProjectIds`에 지정된 프로젝트만 보이고 그에 연계된 이슈만 조회

## 모드 (TEST vs 운영)

빌드 타임 환경변수 `REACT_APP_TEST_MODE` 로 두 가지 동작이 결정됨.

| 항목 | TEST 모드 (`true`) | 운영 모드 (`false` / 미설정) |
|---|---|---|
| 시드 계정 | `admin/pm/eng/client` 4개 (PW 모두 `1234`) | `admin` 1개 (PW `admin1234`) |
| 첫 로그인 비밀번호 변경 강제 | OFF | ON |
| 로그인 화면 테스트 계정 안내 | 표시 | 비표시 |
| 시드 시점 | `users` 시트가 비어있을 때 자동 1회 | 동일 |

### 빌드/실행 방법

- **개발 (`npm start`)**: `.env.development` 의 `REACT_APP_TEST_MODE=true` → 자동 TEST 모드
- **운영 빌드 (`npm run build`)**: `.env.production` 의 `REACT_APP_TEST_MODE=false` → 운영 모드
- **명시적 빌드**:
  - `npm run build:test` → 사내 테스트용 빌드 (4계정 시드)
  - `npm run build:prod` → 전사 배포용 빌드 (admin 시드 + 강제 변경)
- **로컬 임시 덮어쓰기**: `.env.production.local` 에 `REACT_APP_TEST_MODE=true` 작성 (git 무시됨)

### 사내 테스트 → 전사 배포 전환 체크리스트

1. `users` 시트의 시드 4계정(`admin/pm/eng/client`) 삭제 또는 실제 계정으로 교체
2. `npm run build:prod` (또는 일반 `npm run build`) 로 운영 빌드
3. 시드 admin 계정의 비밀번호를 즉시 변경
4. ADMIN 로그인 후 사용자 관리 메뉴에서 실 사용자 등록
5. 고객사(CUSTOMER) 계정에 `접근 가능 프로젝트` 명시 부여

## 첫 실행
1. **GAS 백엔드 갱신**: 기존 GAS 코드에 두 줄만 추가하거나, `docs/gas-backend.gs` 통째로 교체 후 **새 버전으로 재배포**.
   - 추가 필요: `doGet` 의 `users: readFromSheet("Users") || []` + `doPost` 의 `else if (action === 'UPDATE_USERS') { writeToSheet("Users", data); }`
   - `Users` 시트는 첫 호출 시 자동 생성됨 (`writeToSheet` 헬퍼가 시트 없으면 `insertSheet` 함)
2. 앱을 새로고침하면 `users` 시트가 비어있는 경우 모드별 시드 계정이 자동 생성됨
   - **TEST 모드**: `admin / pm / eng / client` (PW 모두 `1234`, 강제 변경 OFF)
   - **운영 모드**: `admin` (PW `admin1234`) — 첫 로그인 후 비밀번호 변경 강제
3. ADMIN 로그인 → 좌측 사이드바 **사용자 관리** 메뉴 → 실제 계정 발급

## 사용자 객체 구조
```js
{
  id: 'kim.cs',                       // 영문/숫자/._- (2~32자)
  name: '김철수 PM',
  role: 'PM',                         // ADMIN | PM | ENGINEER | CUSTOMER
  dept: '제조기술팀',
  customer: '',                       // role==='CUSTOMER' 일 때 회사명
  assignedProjectIds: [],             // role==='CUSTOMER' 일 때만 의미 있음
  pw: '<sha256 hex>',                 // 클라이언트에서 해시 후 저장
  active: true,
  mustChangePassword: false,
  createdAt: '2026-04-27T...Z',
  lastLoginAt: '2026-04-27T...Z'
}
```

## 권한 매트릭스 (UI 단)
| 메뉴 / 동작        | ADMIN | PM  | ENGINEER | CUSTOMER |
|--------------------|:-----:|:---:|:--------:|:--------:|
| 대시보드          | ●     | ●   | ●        | ● (할당분만) |
| 프로젝트 관리      | ●     | ●   | ●        | ● (할당분만) |
| 이슈 관리          | ●     | ●   | ●        | ● (할당분만) |
| 자재/사이트/리소스 | ●     | ●   | ●        | -        |
| 버전 릴리즈        | ●     | ●   | ●        | -        |
| 사용자 관리        | ●     | -   | -        | -        |
| 비밀번호 변경(자기)| ●     | ●   | ●        | ●        |

## 보안 메모
- 클라이언트 사이드 해시는 평문 비밀번호의 네트워크 노출을 막기 위한 1차 방어선이며,
  정식 인증 시스템을 대체하지 않음.
- GAS 웹앱은 가급적 [같은 Google 계정으로 액세스] 또는 도메인 제한이 가능한 환경으로 배포 권장.
- 운영 단계로 갈수록 ① 서버 측 인증 + ② 세션 토큰 + ③ 비밀번호 정책(만료/복잡도) 추가 검토 필요.

## 비밀번호 초기화 흐름
1. 사용자 관리 > 대상 행의 열쇠 아이콘 클릭
2. 임시 비밀번호 토스트 안내 (예: `temp4821`) → 사용자에게 전달
3. `mustChangePassword=true` 로 자동 설정되어 다음 로그인 시 변경 강제
