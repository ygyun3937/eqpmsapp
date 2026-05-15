/**
 * MAK-PMS Google Apps Script Backend
 *
 * [설치 방법 — 메인 GAS]
 * 1. 구글 스프레드시트를 생성합니다.
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 지우고 이 코드를 붙여넣습니다.
 * 4. 상단 [배포] > [새 배포] > 유형: '웹 앱',
 *    - 다음 사용자로 실행: 나(소유자)
 *    - 액세스 권한: 모든 사용자
 *    로 설정하여 배포합니다.
 * 5. 생성된 '웹 앱 URL'을 복사하여 React 코드의 GAS_URL 변수에 붙여넣습니다.
 * 6. 첫 배포 시 MailApp + Drive 권한 승인 프롬프트가 뜨면 [허용] 클릭.
 *
 * [메일 발송 GAS — 듀얼 배포 (선택, 본인 계정 발송 원할 때)]
 * 1. 같은 스프레드시트의 Apps Script에 본 코드 그대로 사용 OR 메일 함수만 별도 분리 가능
 * 2. 별도 [새 배포] > 유형: '웹 앱',
 *    - 다음 사용자로 실행: **웹 앱에 접근하는 사용자** (중요!)
 *    - 액세스 권한: Google Workspace 도메인 내 사용자 (또는 모든 사용자)
 * 3. 생성된 별도 URL을 시스템 설정의 'mailGasUrl' 필드에 등록
 * 4. 사용자가 처음 메일 발송 시도 시 → Google OAuth 동의 화면 1회 → "허용" 클릭
 * 5. 이후로 그 사용자는 자기 Gmail 계정으로 자동 발송 + 자기 보낸편지함에 저장됨
 * 6. mailGasUrl 미설정 시 → 메인 GAS로 호출되어 시스템 계정 발송 (현행 동작)
 *
 * [데이터 저장 방식]
 * - 시트별로 컬럼 분리 저장 (1행: 헤더 = 객체 키, 2행~: 행별 1건)
 * - 객체/배열 값(tasks, comments, assignedProjectIds 등)은 셀에 JSON 문자열로 직렬화 저장,
 *   읽을 때 다시 객체로 복원.
 * - Settings 시트: 단일 행(시스템 설정 객체) 저장
 *
 * [지원 액션 (POST body { action, data })]
 *   UPDATE_PROJECT_BY_ID  — 단일 프로젝트 행 delta 저장 (성능 최적화)
 *   UPDATE_PROJECTS, UPDATE_ISSUES, UPDATE_RELEASES,
 *   UPDATE_ENGINEERS, UPDATE_PARTS, UPDATE_PIPELINE_PARTS, UPDATE_PART_EVENTS,
 *   UPDATE_SITES, UPDATE_CUSTOMERS,
 *   UPDATE_USERS, UPDATE_SETTINGS, UPDATE_WEEKLY_REPORTS
 *   BACKUP_PROJECT    — 삭제 직전 프로젝트 단독 백업 (data: { project, user }) — 30일 보관
 *   UPLOAD_FILE       — Drive에 파일 업로드 (data: { projectId, customer, projectName, fileName, mimeType, base64, category })
 *                       category: '명세서' | '도면' | '회의록' | '노트' | 'AS' | '기타' (생략 시 '기타')
 *   DELETE_FILE       — Drive 파일 휴지통 이동 (data: { fileId })
 *   VERIFY_DRIVE_FOLDER — 폴더 ID 접근 검증 (data: { folderId })
 *   SEND_REPORT_EMAIL, LOG_MAIL, READ_MAIL_LOG — 메일 발송/로깅 (별도 섹션)
 *   READ_CHANGE_LOG   — CHANGE_LOG 시트 조회 (관리자 시스템 활동 이력) (data: { limit?, sinceDays?, actionFilter?, targetFilter? })
 *
 * [데이터 보호 4중 방어 — 1단계]
 *   1. CHANGE_LOG 시트 — 모든 UPDATE_* 변경을 timestamp/user/action/target/before/after 기록
 *   2. 일별 백업 — dailyBackup() + installDailyBackupTrigger() — Drive에 .xlsx 30일 + 월별 12개월
 *   3. 삭제 단독 백업 — BACKUP_PROJECT 액션 — JSON 파일로 30일 보관
 *   4. 클라이언트 측 localStorage 스냅샷 — 부팅 시 비교, 불일치 시 사용자 안내
 *
 *   [최초 1회 설치] Apps Script 편집기에서 'installDailyBackupTrigger' 함수 [실행] —
 *   매일 자정 자동 백업 활성화. DriveApp/UrlFetchApp 권한 승인 프롬프트 → 허용.
 *
 * [알림 (POST body 가 'MAK-PMS 알림' 텍스트 포함)]
 *   handleWebhook 으로 전달 → MailApp.sendEmail 발송
 *   meta.targetEmail 가 유효하면 그 주소로, 아니면 기본 수신자(DEFAULT_NOTIFY_EMAIL)
 *   meta.{projectName, issueTitle, severity} 있으면 [프로젝트][이슈][레벨] 제목 포맷
 */

// ⚠️ 운영 환경에 맞게 변경하세요 (메타에 수신자가 없을 때의 기본 수신처)
var DEFAULT_NOTIFY_EMAIL = "yyg2025@mak.co.kr";

// 1. 웹 앱에서 데이터를 요청(GET)할 때 실행 - DB 읽기
function doGet(e) {
  var settingsArr = readFromSheet("Settings");
  var settings = (settingsArr && settingsArr.length > 0) ? settingsArr[0] : {};

  var data = {
    projects: readFromSheet("Projects") || [],
    issues: readFromSheet("Issues") || [],
    releases: readFromSheet("Releases") || [],
    engineers: readFromSheet("Engineers") || [],
    parts: readFromSheet("Parts") || [],
    pipelineParts: readFromSheet("PipelineParts") || [],
    partEvents: readFromSheet("PartEvents") || [],
    sites: readFromSheet("Sites") || [],
    customers: readFromSheet("Customers") || [],
    users: readFromSheet("Users") || [],
    weeklyReports: readFromSheet("WeeklyReports") || [],
    settings: settings
  };

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. 웹 앱에서 데이터를 저장(POST)할 때 실행 - DB 쓰기
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var data = body.data;

    // 만약 클라이언트에서 'action' 없이 단순 텍스트(웹훅 형태)로 보냈다면
    var rawData = e.postData.contents;
    if (rawData && rawData.indexOf('MAK-PMS 알림') !== -1) {
      var success = handleWebhook(rawData);
      return ContentService.createTextOutput(JSON.stringify({ status: success ? "webhook_success" : "webhook_error" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // React에서 보내는 action에 따라 해당 시트에 덮어쓰기 저장
    // 데이터 보호 (Track B4) — 모든 UPDATE_* 액션 진입 시 CHANGE_LOG 시트에 변경 기록
    if (action === 'UPDATE_PROJECT_BY_ID') {
      // Delta 저장 — 전체 배열 덮어쓰기 대신 단일 행만 update/append/delete
      // data: { projectId: 'PRJ-...', project: {...} | null }  (project=null이면 삭제)
      try { logChange(action, data.projectId, getCurrentRowById_('Projects', 'id', data.projectId), data.project); } catch (_) {}
      updateRowById('Projects', 'id', data.projectId, data.project);
    } else if (action === 'UPDATE_PROJECTS') {
      try { logChange(action, 'Projects', { count: getRowCount_('Projects') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Projects", data);
    } else if (action === 'UPDATE_ISSUES') {
      try { logChange(action, 'Issues', { count: getRowCount_('Issues') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Issues", data);
    } else if (action === 'UPDATE_RELEASES') {
      try { logChange(action, 'Releases', { count: getRowCount_('Releases') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Releases", data);
    } else if (action === 'UPDATE_ENGINEERS') {
      try { logChange(action, 'Engineers', { count: getRowCount_('Engineers') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Engineers", data);
    } else if (action === 'UPDATE_PARTS') {
      try { logChange(action, 'Parts', { count: getRowCount_('Parts') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Parts", data);
    } else if (action === 'UPDATE_PIPELINE_PARTS') {
      try { logChange(action, 'PipelineParts', { count: getRowCount_('PipelineParts') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("PipelineParts", data);
    } else if (action === 'UPDATE_PART_EVENTS') {
      try { logChange(action, 'PartEvents', { count: getRowCount_('PartEvents') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("PartEvents", data);
    } else if (action === 'UPDATE_SITES') {
      try { logChange(action, 'Sites', { count: getRowCount_('Sites') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Sites", data);
    } else if (action === 'UPDATE_CUSTOMERS') {
      try { logChange(action, 'Customers', { count: getRowCount_('Customers') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Customers", data);
    } else if (action === 'UPDATE_USERS') {
      try { logChange(action, 'Users', { count: getRowCount_('Users') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("Users", data);
    } else if (action === 'UPDATE_WEEKLY_REPORTS') {
      try { logChange(action, 'WeeklyReports', { count: getRowCount_('WeeklyReports') }, { count: (data || []).length }); } catch (_) {}
      writeToSheet("WeeklyReports", data);
    } else if (action === 'UPDATE_SETTINGS') {
      // Settings는 단일 객체 → 1행짜리 배열로 감싸 저장
      try { logChange(action, 'Settings', '(stored)', '(updated)'); } catch (_) {}
      writeToSheet("Settings", [data || {}]);
    } else if (action === 'BACKUP_PROJECT') {
      // 데이터 보호 (Track A4) — 삭제 직전 프로젝트 단독 백업
      // data: { project: {...}, user: '김철수' }
      var bk = backupSingleProject(data);
      return ContentService.createTextOutput(JSON.stringify(bk))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'UPLOAD_FILE') {
      var uploaded = uploadFileToDrive(data);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", file: uploaded }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'DELETE_FILE') {
      var ok = deleteFileFromDrive(data);
      return ContentService.createTextOutput(JSON.stringify({ status: ok ? "success" : "error" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'VERIFY_DRIVE_FOLDER') {
      var verify = verifyDriveFolder(data);
      return ContentService.createTextOutput(JSON.stringify(verify))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'SEND_REPORT_EMAIL') {
      // 출장신청서 / 출장보고서 / AS보고서 — HTML 양식 메일 발송
      //
      // 이 액션은 듀얼 배포된 GAS에서도 동일하게 노출됩니다:
      //   · 메인 GAS (소유자 실행) → 호출 시 시스템 계정으로 발송
      //   · 메일 GAS (사용자 실행) → 호출 시 호출자(본인) 계정으로 발송
      // 동일한 함수 sendReportEmail()이 양쪽 모두에서 작동합니다.
      var mailResult = sendReportEmail(data);
      return ContentService.createTextOutput(JSON.stringify(mailResult))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'LOG_MAIL') {
      // 메일 발송 이벤트 별도 로깅 (메일 GAS가 사용자 권한이라
      // 시스템 시트에 직접 못 쓰는 경우 프론트가 이 액션으로 별도 호출)
      appendMailLog(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'READ_MAIL_LOG') {
      // 관리자 메일 발송 이력 조회 — ADMIN role 사용자만 호출
      // payload: { limit?, sinceDays? }
      var logs = readMailLog(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', logs: logs }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'READ_CHANGE_LOG') {
      // 관리자 시스템 활동 이력 조회 — CHANGE_LOG 시트 (모든 UPDATE_* 변경 기록)
      // payload: { limit?, sinceDays?, actionFilter?, targetFilter? }
      var clogs = readChangeLog(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', logs: clogs }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 헬퍼 함수: 시트에서 데이터 읽어오기 ---
function readFromSheet(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      // JSON 문자열로 저장된 배열/객체(tasks, comments, assignedProjectIds 등)는 객체로 복원
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

// --- 헬퍼 함수: 시트에 데이터 쓰기 ---
// Delta 업데이트 — id로 단일 행 찾아 update/append/delete
// idValue로 행을 찾아 객체로 덮어씀. 없으면 append. recordObj=null이면 삭제.
// 동기화 속도 개선용 — 전체 배열을 매번 다시 쓰지 않고 변경된 행만 처리.
function updateRowById(sheetName, idKey, idValue, recordObj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // 시트가 없으면 전체 배열 모드(writeToSheet) 사용 권장 — 그래도 안전하게 처리
    sheet = ss.insertSheet(sheetName);
    if (recordObj) {
      var headers0 = Object.keys(recordObj);
      var row0 = headers0.map(function(h) {
        var v = recordObj[h];
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        return v == null ? '' : v;
      });
      sheet.appendRow(headers0);
      sheet.appendRow(row0);
    }
    return;
  }
  var range = sheet.getDataRange().getValues();
  if (range.length === 0) {
    // 빈 시트 — 헤더부터 만들고 append
    if (!recordObj) return;
    var hdrs = Object.keys(recordObj);
    sheet.appendRow(hdrs);
    sheet.appendRow(hdrs.map(function(h) {
      var v = recordObj[h];
      if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
      return v == null ? '' : v;
    }));
    return;
  }
  var headers = range[0];
  var idCol = headers.indexOf(idKey);
  if (idCol < 0) {
    // id 컬럼이 없으면 전체 재구성 불가 — 폴백: 아무 일도 하지 않고 경고
    Logger.log('updateRowById: id 컬럼 없음 ' + sheetName);
    return;
  }
  var foundRow = -1;
  for (var i = 1; i < range.length; i++) {
    if (String(range[i][idCol]) === String(idValue)) {
      foundRow = i;
      break;
    }
  }
  if (foundRow >= 0) {
    if (recordObj === null) {
      // 삭제
      sheet.deleteRow(foundRow + 1);
    } else {
      // 업데이트 — 기존 헤더 순서대로 셀 갱신. 새 키가 있으면 헤더 확장 후 추가.
      var newKeys = Object.keys(recordObj).filter(function(k) { return headers.indexOf(k) < 0; });
      if (newKeys.length > 0) {
        // 헤더 확장 (오른쪽에 추가)
        for (var nk = 0; nk < newKeys.length; nk++) {
          sheet.getRange(1, headers.length + 1 + nk).setValue(newKeys[nk]);
        }
        headers = headers.concat(newKeys);
      }
      var rowVals = headers.map(function(h) {
        var v = recordObj[h];
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        return v == null ? '' : v;
      });
      sheet.getRange(foundRow + 1, 1, 1, headers.length).setValues([rowVals]);
    }
    return;
  }
  // 찾지 못함 → append (신규 등록 케이스)
  if (recordObj) {
    var newKeys2 = Object.keys(recordObj).filter(function(k) { return headers.indexOf(k) < 0; });
    if (newKeys2.length > 0) {
      for (var nk2 = 0; nk2 < newKeys2.length; nk2++) {
        sheet.getRange(1, headers.length + 1 + nk2).setValue(newKeys2[nk2]);
      }
      headers = headers.concat(newKeys2);
    }
    var newRowVals = headers.map(function(h) {
      var v = recordObj[h];
      if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
      return v == null ? '' : v;
    });
    sheet.appendRow(newRowVals);
  }
}

function writeToSheet(sheetName, dataArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // 시트가 없으면 자동 생성
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear(); // 기존 데이터 초기화
  if (!dataArray || dataArray.length === 0) return;

  // 객체의 Key를 헤더(열 이름)로 사용
  var headers = Object.keys(dataArray[0]);
  var rows = [headers];

  for (var i = 0; i < dataArray.length; i++) {
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var val = dataArray[i][headers[j]];
      // 객체나 배열(tasks, comments 등)은 엑셀 셀에 들어가도록 텍스트 변환
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      row.push(val);
    }
    rows.push(row);
  }

  // 시트에 일괄 기록
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

// ==============================================
// Google Drive 업로드/삭제/검증 (참고자료 첨부 기능)
// ==============================================

// 폴더 URL/ID에서 ID만 추출 (관리자가 URL 전체를 붙여넣어도 동작)
function extractFolderId(input) {
  if (!input) return '';
  input = String(input).trim();
  // /folders/<ID> 패턴
  var m1 = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  // ?id=<ID> 패턴
  var m2 = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  // 그 자체가 ID
  return input;
}

function getOrCreateSubFolder(parent, name) {
  var safe = String(name || '').replace(/[\/\\:*?"<>|]/g, '_').trim() || '미분류';
  var iter = parent.getFoldersByName(safe);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(safe);
}

// Settings 시트에서 driveRootFolderId 읽기
function getRootFolderIdFromSettings() {
  var arr = readFromSheet("Settings");
  if (!arr || arr.length === 0) return '';
  return extractFolderId(arr[0].driveRootFolderId || '');
}

// 폴더 접근 검증 (관리자 설정 페이지에서 "연결 테스트")
function verifyDriveFolder(payload) {
  try {
    var id = extractFolderId(payload && payload.folderId);
    if (!id) return { ok: false, message: '폴더 ID/URL이 비어 있습니다.' };
    var folder = DriveApp.getFolderById(id);
    return {
      ok: true,
      folderId: id,
      folderName: folder.getName(),
      folderUrl: folder.getUrl()
    };
  } catch (e) {
    return { ok: false, message: '폴더 접근 실패: ' + e.toString() };
  }
}

// 카테고리 정규화 — 알 수 없는 값은 '기타' 폴더로
// '노트'와 'AS'는 회의록과 별개 폴더로 분리 (운영 흐름이 다름)
var ALLOWED_CATEGORIES = ['명세서', '도면', '회의록', '노트', 'AS', '자재', '기타'];
function normalizeCategory(cat) {
  if (!cat) return '기타';
  var s = String(cat).trim();
  for (var i = 0; i < ALLOWED_CATEGORIES.length; i++) {
    if (ALLOWED_CATEGORIES[i] === s) return s;
  }
  return '기타';
}

// 파일 업로드 (base64) — 프로젝트별 + 카테고리별 하위 폴더 자동 생성
function uploadFileToDrive(payload) {
  var rootId = getRootFolderIdFromSettings();
  if (!rootId) throw new Error('Drive 루트 폴더가 설정되지 않았습니다. 시스템 설정에서 폴더 ID를 등록하세요.');
  var root = DriveApp.getFolderById(rootId);

  var customer = payload.customer || '미분류고객사';
  var projectName = payload.projectName || '미분류프로젝트';
  var projectId = payload.projectId || '';
  var fileName = payload.fileName || ('upload-' + new Date().getTime());
  var mimeType = payload.mimeType || MimeType.PLAIN_TEXT;
  var base64 = payload.base64 || '';
  var category = normalizeCategory(payload.category);

  // 폴더 구조: [루트] / [고객사] / [프로젝트명-PRJxxxxxx] / [카테고리]
  var customerFolder = getOrCreateSubFolder(root, customer);
  var projectFolderName = projectName + (projectId ? ('-' + projectId) : '');
  var projectFolder = getOrCreateSubFolder(customerFolder, projectFolderName);
  var categoryFolder = getOrCreateSubFolder(projectFolder, category);

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var file = categoryFolder.createFile(blob);

  // 링크로 누구나 보기 (조직 정책에 따라 조정하세요)
  // 외부 공유를 막으려면 아래 줄을 주석 처리하고 명시적 권한 부여 사용
  // file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    viewUrl: file.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
    folderUrl: projectFolder.getUrl(),
    categoryFolderUrl: categoryFolder.getUrl(),
    category: category
  };
}

// 파일 삭제 (휴지통 이동)
function deleteFileFromDrive(payload) {
  try {
    var id = (payload && payload.fileId) || '';
    if (!id) return false;
    var file = DriveApp.getFileById(id);
    file.setTrashed(true);
    return true;
  } catch (e) {
    return false;
  }
}

// ==============================================
// 웹훅(Webhook) 처리 전용 함수 - 메일 발송
// ==============================================
function handleWebhook(payload) {
  try {
    var data = JSON.parse(payload);
    var messageText = data.text || "내용 없음";
    var meta = data.meta || null;

    // 기본값
    var targetEmail = DEFAULT_NOTIFY_EMAIL;
    var subject = "[MAK-PMS 시스템 자동 알림]";

    // meta에 구조화된 데이터가 있으면 제목 포맷: [프로젝트][이슈명][레벨]
    if (meta) {
      if (meta.targetEmail && meta.targetEmail.indexOf('@') !== -1) {
        targetEmail = meta.targetEmail;
      }
      if (meta.projectName && meta.issueTitle && meta.severity) {
        subject = '[' + meta.projectName + '][' + meta.issueTitle + '][' + meta.severity + ']';
      }
    } else {
      // 하위 호환: 메시지에서 수신자 추출
      var emailMatch = messageText.match(/수신자: (.+?)$/m);
      if (emailMatch && emailMatch[1] && emailMatch[1].indexOf('@') !== -1) {
        targetEmail = emailMatch[1].trim();
      }
    }

    MailApp.sendEmail({
      to: targetEmail,
      subject: subject,
      body: messageText
    });

    return true;
  } catch(e) {
    Logger.log("웹훅 처리 에러: " + e.toString());
    return false;
  }
}

// === 보고서 메일 송부 (출장신청 / 출장보고 / AS보고) ===
//
// 발신자 정책 (단계적):
//   1) 우선 구현 — GmailApp 사용. 발신자는 GAS 배포자 계정.
//      디스플레이 이름(name)을 작성자 이름으로 표기, reply-to를 작성자 이메일로 설정.
//      수신자가 "From: 김철수 (mak-pms@회사.co.kr)"으로 인식하고, 답장은 작성자 메일로 감.
//   2) 향후 (옵션) — Workspace 관리자가 도메인 위임을 설정하면
//      GmailApp.sendEmail(...)를 본인 계정으로 발송하도록 전환 가능 (별도 작업).
//
// payload: {
//   kind: 'trip_request' | 'trip_report' | 'as_report',
//   to:        ['email1@...', ...],      // 수신
//   cc:        ['email2@...', ...],      // 참조 (선택)
//   replyTo:   'author@회사.co.kr',      // 답장 받을 주소 (작성자)
//   senderName:'김철수 (출장신청)',       // 보낸이 표시 이름
//   subject:   '[MAK-PMS] 출장신청서 — ...',
//   htmlBody:  '<html>...</html>',       // HTML 양식
//   plainFallback: '평문 폴백',
//   projectId: 'PRJ-...',                 // 로그용
//   projectName: '...',                   // 로그용
//   author:    '김철수'                   // 로그용
// }
//
// 반환: { ok, message, loggedAt }
function sendReportEmail(payload) {
  try {
    if (!payload || !payload.to || payload.to.length === 0) {
      return { ok: false, message: '수신인이 비어있습니다.' };
    }
    var to = (payload.to || []).filter(function (s) { return s && s.trim(); }).join(',');
    var cc = (payload.cc || []).filter(function (s) { return s && s.trim(); }).join(',');
    var subject = String(payload.subject || '[MAK-PMS] 보고서');
    var html = String(payload.htmlBody || '');
    var plain = String(payload.plainFallback || subject);
    var options = {
      htmlBody: html,
      name: payload.senderName || 'MAK-PMS'
    };
    if (cc) options.cc = cc;
    if (payload.replyTo) options.replyTo = payload.replyTo;

    // HTML 파일도 첨부 — 받는 클라이언트가 인라인 스타일을 망가뜨려도 첨부 HTML은 그대로 열어볼 수 있도록.
    // payload.attachHtml === false 인 경우만 미첨부, 기본은 첨부 ON.
    // 파일명은 한국어 보존(GmailApp이 RFC2231로 자동 인코딩). 위험문자만 제거.
    if (payload.attachHtml !== false && html) {
      var rawName = payload.attachmentName ? String(payload.attachmentName) : String(subject);
      // 파일시스템 위험문자(/\:*?"<>|)와 줄바꿈만 제거. 한글/공백/하이픈은 보존.
      var safeName = rawName.replace(/[\/\\:*?"<>|\r\n\t]/g, '_').replace(/\s+/g, ' ').trim();
      if (!safeName) safeName = 'MAK-PMS-보고서-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (!/\.html?$/i.test(safeName)) safeName += '.html';
      if (safeName.length > 100) safeName = safeName.substring(0, 96) + '.html';
      // BOM(U+FEFF) prefix — 다운로드한 HTML을 브라우저가 UTF-8로 확실히 인식하도록
      // contentType은 단순히 'text/html' — charset suffix 붙이면 일부 환경에서 첨부 누락 사례
      var blob = Utilities.newBlob(String.fromCharCode(0xFEFF) + html, 'text/html', safeName);
      options.attachments = [blob];
    }

    GmailApp.sendEmail(to, subject, plain, options);

    // 송신 로그 시트 기록은 메인 GAS의 LOG_MAIL 액션으로 분리됨.
    // (메일 GAS가 사용자 권한으로 실행되는 경우 사용자에게 시트 쓰기 권한이 없을 수 있으므로,
    //  로깅은 프론트가 별도로 메인 GAS에 LOG_MAIL 호출하도록 위임)
    // 단, 이 함수가 메인 GAS에서 호출된 경우엔 여기서 바로 기록 가능 — 시도하고 실패하면 무시.
    try {
      appendMailLog({
        kind: payload.kind || '',
        to: to, cc: cc,
        subject: subject,
        author: payload.author || '',
        senderEmail: Session.getActiveUser().getEmail() || '',
        projectId: payload.projectId || '',
        projectName: payload.projectName || ''
      });
    } catch (_logErr) {}

    return {
      ok: true,
      message: '메일이 발송되었습니다.',
      loggedAt: new Date().toISOString(),
      senderEmail: Session.getActiveUser().getEmail() || ''
    };
  } catch (err) {
    return { ok: false, message: '발송 실패: ' + err.toString() };
  }
}

// 메일 송신 감사 로그 — MAIL_LOG 시트에 한 줄 추가
// 컬럼: 발송시각 / 종류 / 수신 / 참조 / 제목 / 작성자(시스템) / 발송계정(실제 Gmail) / 프로젝트 ID / 프로젝트명
function appendMailLog(entry) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MAIL_LOG');
  if (!sheet) {
    sheet = ss.insertSheet('MAIL_LOG');
    sheet.appendRow(['발송시각', '종류', '수신', '참조', '제목', '작성자', '발송계정', '프로젝트 ID', '프로젝트명']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#e0e7ff');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    entry.kind || '',
    entry.to || '',
    entry.cc || '',
    entry.subject || '',
    entry.author || '',
    entry.senderEmail || '',
    entry.projectId || '',
    entry.projectName || ''
  ]);
}

// 메일 발송 이력 조회 (관리자용) — 최근 발송 순 정렬
// payload: { limit?: number = 200, sinceDays?: number }
function readMailLog(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MAIL_LOG');
  if (!sheet) return [];
  var rng = sheet.getDataRange().getValues();
  if (rng.length < 2) return [];
  var headers = rng[0];
  var limit = (payload && Number(payload.limit)) || 200;
  var sinceDays = payload && Number(payload.sinceDays);
  var cutoff = (sinceDays > 0) ? (Date.now() - sinceDays * 86400000) : 0;
  var out = [];
  for (var i = rng.length - 1; i >= 1 && out.length < limit; i--) {
    var row = rng[i];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      var v = row[c];
      if (v instanceof Date) v = v.toISOString();
      obj[key] = v;
    }
    // 날짜 필터 (cutoff 보다 이전이면 제외)
    if (cutoff > 0) {
      var t = new Date(obj['발송시각'] || 0).getTime();
      if (t < cutoff) continue;
    }
    out.push(obj);
  }
  return out;
}

// 테스트용: Apps Script 편집기에서 함수 선택 후 [실행] 으로 메일 발송 검증
function testEmail() {
  var testPayload = JSON.stringify({
    text: "테스트 메시지\nMAK-PMS 알림: 동작 검증",
    type: "ISSUE",
    meta: {
      projectName: "테스트 프로젝트",
      issueTitle: "테스트 이슈",
      severity: "High",
      targetEmail: DEFAULT_NOTIFY_EMAIL
    }
  });
  var result = handleWebhook(testPayload);
  Logger.log("결과: " + result);
}

// ==============================================
// 데이터 보호 4중 방어 — 1단계 (서버 측, Track B)
// ==============================================
//
// [설치 — 일별 자동 백업 트리거 등록]
// Apps Script 편집기에서 'installDailyBackupTrigger' 함수를 한 번 [실행] 클릭.
// 매일 자정에 dailyBackup() 가 자동 실행되어 Drive에 전체 시트 백업 + 보관 정책 적용.
//
// [백업 정책]
//   · 매일 1회 자정 → MAK-PMS_백업/YYYY-MM-DD.xlsx
//   · 30일 일별 보관 (오늘부터 30일 전까지)
//   · 매월 1일자 파일은 12개월 보관 (월별 아카이브 폴더로 이동)
//   · 그 외는 자동 휴지통 이동
//
// [CHANGE_LOG 시트]
//   · 모든 UPDATE_* 액션 진입 시 자동 추가
//   · 컬럼: timestamp / user / action / target / before / after
//   · 사용자(user)는 GAS가 사용자 권한 실행이면 Session.getActiveUser(), 아니면 빈값
//
// [BACKUP_PROJECT 액션]
//   · 클라이언트가 프로젝트 삭제 직전에 호출
//   · Drive의 MAK-PMS_삭제백업/ 폴더에 JSON 파일로 저장
//   · 파일명: YYYY-MM-DD_HHmm_<projectId>_<projectName>.json
//   · 30일 후 자동 삭제 (dailyBackup에서 함께 정리)

var BACKUP_FOLDER_NAME = 'MAK-PMS_백업';
var BACKUP_ARCHIVE_FOLDER_NAME = 'MAK-PMS_백업/월별보관';
var DELETED_BACKUP_FOLDER_NAME = 'MAK-PMS_삭제백업';
var BACKUP_RETENTION_DAYS = 30;
var BACKUP_MONTHLY_RETENTION_MONTHS = 12;
var CHANGE_LOG_SHEET = 'CHANGE_LOG';

// 일별 백업 — Time Trigger에서 호출
function dailyBackup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var folder = getOrCreateDriveFolder_(BACKUP_FOLDER_NAME);
    var today = new Date();
    var stampDay = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var fileName = stampDay + '_' + ss.getName() + '.xlsx';

    // Drive Advanced Service 없이 export 가능한 방법: spreadsheet의 url + token으로 다운로드
    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    var token = ScriptApp.getOAuthToken();
    var resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() === 200) {
      // 같은 날 파일 중복 방지 — 기존 같은 이름은 휴지통으로
      var existing = folder.getFilesByName(fileName);
      while (existing.hasNext()) existing.next().setTrashed(true);
      folder.createFile(resp.getBlob().setName(fileName));
    } else {
      Logger.log('dailyBackup export 실패: ' + resp.getResponseCode());
    }

    // 보관 정책 적용
    applyBackupRetention_();
    // 삭제 백업도 같이 정리
    cleanupDeletedProjectBackups_();
  } catch (e) {
    Logger.log('dailyBackup 에러: ' + e.toString());
  }
}

// 보관 정책 — 30일 일별 + 12개월 월별 + 그 외 휴지통
function applyBackupRetention_() {
  var folder = getOrCreateDriveFolder_(BACKUP_FOLDER_NAME);
  var archive = getOrCreateDriveFolder_(BACKUP_ARCHIVE_FOLDER_NAME);
  var now = Date.now();
  var dayMs = 86400000;
  var monthlyCutoff = now - BACKUP_MONTHLY_RETENTION_MONTHS * 31 * dayMs;
  var dailyCutoff = now - BACKUP_RETENTION_DAYS * dayMs;

  // 일별 폴더의 파일들 검사
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    // YYYY-MM-DD_* 패턴만 처리
    var m = name.match(/^(\d{4})-(\d{2})-(\d{2})_/);
    if (!m) continue;
    var fileDate = new Date(m[1] + '-' + m[2] + '-' + m[3]).getTime();
    var isMonth1 = (m[3] === '01');
    if (fileDate < dailyCutoff) {
      // 30일 지남 — 매월 1일자만 월별 폴더로 옮기고 나머지는 휴지통
      if (isMonth1 && fileDate >= monthlyCutoff) {
        // 월별 폴더로 이동 (복제 후 원본 삭제 패턴 — moveFile은 v8 런타임에서만)
        archive.addFile(f);
        folder.removeFile(f);
      } else {
        f.setTrashed(true);
      }
    }
  }
  // 월별 폴더도 12개월 초과한 건 정리
  var archFiles = archive.getFiles();
  while (archFiles.hasNext()) {
    var af = archFiles.next();
    var am = af.getName().match(/^(\d{4})-(\d{2})-(\d{2})_/);
    if (!am) continue;
    var afDate = new Date(am[1] + '-' + am[2] + '-' + am[3]).getTime();
    if (afDate < monthlyCutoff) af.setTrashed(true);
  }
}

// 일별 백업 트리거 등록 — Apps Script 편집기에서 한 번 [실행]
function installDailyBackupTrigger() {
  // 기존 트리거가 있으면 제거 (중복 방지)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyBackup') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(0).create();
  Logger.log('dailyBackup 트리거 등록됨 (매일 00시)');
}

// 단일 프로젝트 삭제 직전 백업 — JSON 파일로 Drive 보관
function backupSingleProject(payload) {
  try {
    var project = payload && payload.project;
    if (!project) return { ok: false, message: 'project가 비어있습니다.' };
    var folder = getOrCreateDriveFolder_(DELETED_BACKUP_FOLDER_NAME);
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    var safeName = String(project.name || project.id || 'unnamed').replace(/[\/\\:*?"<>|]/g, '_').substring(0, 60);
    var fileName = stamp + '_' + (project.id || 'noid') + '_' + safeName + '.json';
    var content = JSON.stringify({
      backedUpAt: new Date().toISOString(),
      deletedBy: payload.user || '',
      project: project
    }, null, 2);
    var file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
    // CHANGE_LOG에도 기록
    try { logChange('DELETE_PROJECT', project.id, project, null); } catch (_) {}
    return { ok: true, fileId: file.getId(), fileName: fileName, folderUrl: folder.getUrl() };
  } catch (e) {
    return { ok: false, message: e.toString() };
  }
}

// 삭제 백업 정리 (30일 지난 것 휴지통)
function cleanupDeletedProjectBackups_() {
  var folder = getOrCreateDriveFolder_(DELETED_BACKUP_FOLDER_NAME);
  var cutoff = Date.now() - BACKUP_RETENTION_DAYS * 86400000;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true);
  }
}

// CHANGE_LOG 시트 자동 생성 + 한 줄 추가
function logChange(action, target, before, after) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CHANGE_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CHANGE_LOG_SHEET);
    sheet.appendRow(['timestamp', 'user', 'action', 'target', 'before', 'after']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#fef3c7');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 160);
    sheet.setColumnWidth(5, 400);
    sheet.setColumnWidth(6, 400);
  }
  var user = '';
  try { user = Session.getActiveUser().getEmail() || ''; } catch (_) {}
  // before/after는 객체면 JSON 직렬화 (셀 한도 50000자 보호 위해 자르기)
  var beforeStr = typeof before === 'object' ? JSON.stringify(before) : String(before || '');
  var afterStr = typeof after === 'object' ? JSON.stringify(after) : String(after || '');
  if (beforeStr.length > 49000) beforeStr = beforeStr.substring(0, 49000) + '...[truncated]';
  if (afterStr.length > 49000) afterStr = afterStr.substring(0, 49000) + '...[truncated]';
  sheet.appendRow([new Date(), user, action, String(target || ''), beforeStr, afterStr]);

  // CHANGE_LOG가 너무 커지면 (10000행 이상) 오래된 절반 삭제 — 보관 부담 방지
  if (sheet.getLastRow() > 10000) {
    sheet.deleteRows(2, 5000);
  }
}

// 현재 시트의 단일 행을 객체로 가져옴 (logChange의 before 캡처용)
function getCurrentRowById_(sheetName, idKey, idValue) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return null;
    var range = sheet.getDataRange().getValues();
    if (range.length < 2) return null;
    var headers = range[0];
    var idCol = headers.indexOf(idKey);
    if (idCol < 0) return null;
    for (var i = 1; i < range.length; i++) {
      if (String(range[i][idCol]) === String(idValue)) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) obj[headers[j]] = range[i][j];
        return obj;
      }
    }
    return null;
  } catch (_) { return null; }
}

// 행 개수 (logChange의 count 비교용 — 전체 데이터 직렬화는 비싸므로 카운트만)
function getRowCount_(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return 0;
    return Math.max(0, sheet.getLastRow() - 1);
  } catch (_) { return 0; }
}

// Drive 폴더 가져오거나 생성 — 경로 형식 'A/B' 지원
function getOrCreateDriveFolder_(path) {
  var parts = String(path || '').split('/').filter(function (s) { return s.length > 0; });
  if (parts.length === 0) return DriveApp.getRootFolder();
  var current = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var iter = current.getFoldersByName(parts[i]);
    if (iter.hasNext()) {
      current = iter.next();
    } else {
      current = current.createFolder(parts[i]);
    }
  }
  return current;
}

// 시스템 활동 이력 조회 — CHANGE_LOG 시트에서 최근 변경 N건 (관리자용)
// payload: { limit?: 500, sinceDays?: 30, actionFilter?: 'UPDATE_PROJECT_BY_ID' 등, targetFilter?: 'PRJ-xxx' 등 }
function readChangeLog(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CHANGE_LOG_SHEET);
  if (!sheet) return [];
  var rng = sheet.getDataRange().getValues();
  if (rng.length < 2) return [];
  var headers = rng[0];
  var limit = (payload && Number(payload.limit)) || 500;
  var sinceDays = payload && Number(payload.sinceDays);
  var cutoff = (sinceDays > 0) ? (Date.now() - sinceDays * 86400000) : 0;
  var actionFilter = (payload && payload.actionFilter) ? String(payload.actionFilter) : '';
  var targetFilter = (payload && payload.targetFilter) ? String(payload.targetFilter).toLowerCase() : '';
  var out = [];
  // 최신순 (역방향 순회) — limit 도달 시 조기 종료
  for (var i = rng.length - 1; i >= 1 && out.length < limit; i--) {
    var row = rng[i];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      var v = row[c];
      if (v instanceof Date) v = v.toISOString();
      obj[key] = v;
    }
    if (cutoff > 0) {
      var ts = new Date(obj['timestamp'] || 0).getTime();
      if (isNaN(ts) || ts < cutoff) continue;
    }
    if (actionFilter && obj['action'] !== actionFilter) continue;
    if (targetFilter) {
      var tgt = String(obj['target'] || '').toLowerCase();
      if (tgt.indexOf(targetFilter) < 0) continue;
    }
    out.push(obj);
  }
  return out;
}

// 테스트 — Apps Script 편집기에서 함수 선택 후 [실행]
function testDailyBackup() {
  dailyBackup();
  Logger.log('dailyBackup 수동 실행 완료. Drive에서 ' + BACKUP_FOLDER_NAME + ' 폴더 확인하세요.');
}
