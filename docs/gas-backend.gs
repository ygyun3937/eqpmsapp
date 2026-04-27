/**
 * EQ-PMS Google Apps Script Backend
 *
 * [설치 방법]
 * 1. 구글 스프레드시트를 생성합니다.
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 지우고 이 코드를 붙여넣습니다.
 * 4. 상단 [배포] > [새 배포] > 유형: '웹 앱', 액세스 권한: '모든 사용자'로 설정하여 배포합니다.
 * 5. 생성된 '웹 앱 URL'을 복사하여 React 코드의 GAS_URL 변수에 붙여넣습니다.
 * 6. 첫 배포 시 MailApp 권한 승인 프롬프트가 뜨면 [허용] 클릭.
 *
 * [데이터 저장 방식]
 * - 시트별로 컬럼 분리 저장 (1행: 헤더 = 객체 키, 2행~: 행별 1건)
 * - 객체/배열 값(tasks, comments, assignedProjectIds 등)은 셀에 JSON 문자열로 직렬화 저장,
 *   읽을 때 다시 객체로 복원.
 *
 * [지원 액션 (POST body { action, data })]
 *   UPDATE_PROJECTS, UPDATE_ISSUES, UPDATE_RELEASES,
 *   UPDATE_ENGINEERS, UPDATE_PARTS, UPDATE_SITES, UPDATE_USERS
 *
 * [알림 (POST body 가 'EQ-PMS 알림' 텍스트 포함)]
 *   handleWebhook 으로 전달 → MailApp.sendEmail 발송
 *   meta.targetEmail 가 유효하면 그 주소로, 아니면 기본 수신자(DEFAULT_NOTIFY_EMAIL)
 *   meta.{projectName, issueTitle, severity} 있으면 [프로젝트][이슈][레벨] 제목 포맷
 */

// ⚠️ 운영 환경에 맞게 변경하세요 (메타에 수신자가 없을 때의 기본 수신처)
var DEFAULT_NOTIFY_EMAIL = "yyg2025@mak.co.kr";

// 1. 웹 앱에서 데이터를 요청(GET)할 때 실행 - DB 읽기
function doGet(e) {
  var data = {
    projects: readFromSheet("Projects") || [],
    issues: readFromSheet("Issues") || [],
    releases: readFromSheet("Releases") || [],
    engineers: readFromSheet("Engineers") || [],
    parts: readFromSheet("Parts") || [],
    sites: readFromSheet("Sites") || [],
    users: readFromSheet("Users") || []
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
    if (rawData && rawData.indexOf('EQ-PMS 알림') !== -1) {
      var success = handleWebhook(rawData);
      return ContentService.createTextOutput(JSON.stringify({ status: success ? "webhook_success" : "webhook_error" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // React에서 보내는 action에 따라 해당 시트에 덮어쓰기 저장
    if (action === 'UPDATE_PROJECTS') {
      writeToSheet("Projects", data);
    } else if (action === 'UPDATE_ISSUES') {
      writeToSheet("Issues", data);
    } else if (action === 'UPDATE_RELEASES') {
      writeToSheet("Releases", data);
    } else if (action === 'UPDATE_ENGINEERS') {
      writeToSheet("Engineers", data);
    } else if (action === 'UPDATE_PARTS') {
      writeToSheet("Parts", data);
    } else if (action === 'UPDATE_SITES') {
      writeToSheet("Sites", data);
    } else if (action === 'UPDATE_USERS') {
      writeToSheet("Users", data);
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
// 웹훅(Webhook) 처리 전용 함수 - 메일 발송
// ==============================================
function handleWebhook(payload) {
  try {
    var data = JSON.parse(payload);
    var messageText = data.text || "내용 없음";
    var meta = data.meta || null;

    // 기본값
    var targetEmail = DEFAULT_NOTIFY_EMAIL;
    var subject = "[EQ-PMS 시스템 자동 알림]";

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

// 테스트용: Apps Script 편집기에서 함수 선택 후 [실행] 으로 메일 발송 검증
function testEmail() {
  var testPayload = JSON.stringify({
    text: "테스트 메시지\nEQ-PMS 알림: 동작 검증",
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
