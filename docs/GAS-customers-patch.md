# GAS 백엔드 패치 — 고객사(Customers) 시트 + CRUD API

MAK-PMS 프론트에 신규 추가된 **고객사 관리(Customers)** 기능을 위해 Apps Script 측에서 추가해야 하는 코드 변경분입니다. 다른 마스터(Sites, Engineers 등)와 동일한 패턴을 따르므로 기존 함수와 짝을 맞추면 됩니다.

> 적용 후에는 별도 마이그레이션 작업이 필요하지 않습니다. 빈 `CustomerList` 시트가 자동 생성되며, 프론트가 처음 로드될 때 빈 배열을 받습니다.

---

## 1. 시트 스키마

신규 시트 이름: **`CustomerList`**

| id            | name      | domain | phone | address | website | note | contacts (JSON) | createdAt | updatedAt |
|---------------|-----------|--------|-------|---------|---------|------|------------------|-----------|-----------|
| `CST-123456`  | A전자     | 반도체 | …     | …       | …       | …    | `[{...}, ...]`   | ISO       | ISO       |

- `contacts`는 담당자 배열을 **`JSON.stringify` 한 문자열**로 1개 셀에 저장합니다.
- 프론트는 `'['`로 시작하는 문자열을 자동으로 `JSON.parse`합니다(`App.js`의 `ensureArr` 헬퍼).

### Contact(담당자) 객체 스키마

```json
{
  "id": 1714291237000,
  "name": "홍길동",
  "title": "과장",
  "dept": "생산기술팀",
  "email": "hong@customer.com",
  "officePhone": "02-1234-5678",
  "mobile": "010-1234-5678",
  "siteIds": ["SIT-aaaaaa", "SIT-bbbbbb"],
  "note": ""
}
```

---

## 2. Apps Script — 함수 추가

기존 `getSites()` / `saveSites()`와 동일한 패턴입니다.

```javascript
function getCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CustomerList');
  if (!sheet) {
    sheet = ss.insertSheet('CustomerList');
    sheet.appendRow(['id','name','domain','phone','address','website','note','contacts','createdAt','updatedAt']);
    return [];
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(row => row[0]).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    if (typeof obj.contacts === 'string' && obj.contacts.trim().startsWith('[')) {
      try { obj.contacts = JSON.parse(obj.contacts); } catch (_) { obj.contacts = []; }
    }
    if (!Array.isArray(obj.contacts)) obj.contacts = [];
    return obj;
  });
}

function saveCustomers(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CustomerList');
  if (!sheet) sheet = ss.insertSheet('CustomerList');
  sheet.clear();
  if (!Array.isArray(data) || data.length === 0) {
    sheet.appendRow(['id','name','domain','phone','address','website','note','contacts','createdAt','updatedAt']);
    return;
  }
  // 첫 객체의 키를 헤더로 — 프론트의 normalizeArrayKeys로 모든 객체가 동일 키를 갖도록 정규화돼 들어옴
  const headers = Object.keys(data[0]);
  sheet.appendRow(headers);
  const rows = data.map(c => headers.map(h => {
    const v = c[h];
    if (v == null) return '';
    if (Array.isArray(v) || (typeof v === 'object')) return JSON.stringify(v);
    return v;
  }));
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
```

---

## 3. `doGet` — 응답에 `customers` 추가

```javascript
function doGet(e) {
  // ...기존 코드...
  const payload = {
    projects: getProjects(),
    issues: getIssues(),
    releases: getReleases(),
    engineers: getEngineers(),
    parts: getParts(),
    sites: getSites(),
    customers: getCustomers(),     // ← 추가
    users: getUsers(),
    settings: getSettings(),
    weeklyReports: getWeeklyReports()
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 4. `doPost` — `UPDATE_CUSTOMERS` 액션 추가

```javascript
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const { action, data } = body;

  switch (action) {
    // ...기존 case 들...
    case 'UPDATE_SITES':
      saveSites(data);
      break;
    case 'UPDATE_CUSTOMERS':       // ← 추가
      saveCustomers(data);
      break;
    // ...
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 5. 배포

1. Apps Script 에디터에서 위 변경분 저장
2. **배포 → 새 배포 → 웹 앱** (또는 기존 배포 관리 → 새 버전)
3. 프론트는 별도 변경 없이 새 데이터를 받게 됨 (캐시 무효화 시 새로고침)

---

## 6. 빈 상태 동작

- `CustomerList` 시트가 비어 있어도 프론트는 정상 동작합니다.
- 고객사가 0개인 동안 프로젝트·사이트 모달의 고객사 필드는 **기존처럼 텍스트 입력**으로 동작합니다.
- 첫 고객사가 등록되는 순간부터 드롭다운 모드로 전환됩니다.

---

## 7. 검증 체크리스트

- [ ] `CustomerList` 시트가 자동 생성됨
- [ ] 프론트에서 새 고객사 등록 → 시트 1행 추가, `contacts` 셀에 JSON 문자열 저장
- [ ] 새로고침 후 등록한 고객사가 다시 로드됨 (`contacts` 배열 복원 OK)
- [ ] 프로젝트 생성 시 고객사 드롭다운에 표시됨
- [ ] 미등록 customer 텍스트가 들어있는 프로젝트 → "고객사 관리" 페이지 상단 amber 배너에 자동 발견 표시
- [ ] "한 번에 등록" 클릭 시 customers 시트 + projects/sites 시트 모두 갱신됨
