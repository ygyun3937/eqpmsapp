/**
 * EQ-PMS Google Apps Script 백엔드
 *
 * 적용 방법
 * 1) Google Sheets 새 스프레드시트 생성 (또는 기존 사용)
 * 2) 확장 프로그램 → Apps Script
 * 3) 본 파일 전체 내용을 Code.gs 에 붙여넣기
 * 4) 배포 → 새 배포 → 유형 [웹 앱] → 액세스 [모든 사용자] → 게시
 * 5) 발급된 /exec URL 을 src/constants/index.js 의 GAS_URL 에 입력
 *
 * 시트 자동 생성: 첫 호출 시 필요한 시트가 없으면 자동으로 만든다.
 *
 * 지원 액션 (POST body { action, data })
 *   UPDATE_PROJECTS, UPDATE_ISSUES, UPDATE_RELEASES,
 *   UPDATE_ENGINEERS, UPDATE_PARTS, UPDATE_SITES,
 *   UPDATE_USERS, ADD_DAILY_REPORT
 *
 * GET: 모든 시트의 데이터를 한꺼번에 JSON 으로 반환.
 */

const SHEETS = {
  projects: 'projects',
  issues: 'issues',
  releases: 'releases',
  engineers: 'engineers',
  parts: 'parts',
  sites: 'sites',
  users: 'users',
  dailyReports: 'dailyReports'
};

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // 첫 행에 단일 컬럼 'json' 사용 (각 row 1건의 JSON 직렬화)
    sh.getRange(1, 1).setValue('json');
  }
  return sh;
}

function readArray_(name) {
  const sh = getOrCreateSheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, 1).getValues();
  const out = [];
  values.forEach(row => {
    const v = row[0];
    if (!v) return;
    try { out.push(JSON.parse(v)); } catch (e) { /* skip malformed */ }
  });
  return out;
}

function writeArray_(name, arr) {
  const sh = getOrCreateSheet_(name);
  sh.clear();
  sh.getRange(1, 1).setValue('json');
  if (!arr || !arr.length) return;
  const rows = arr.map(item => [JSON.stringify(item)]);
  sh.getRange(2, 1, rows.length, 1).setValues(rows);
}

function appendRow_(name, item) {
  const sh = getOrCreateSheet_(name);
  sh.appendRow([JSON.stringify(item)]);
}

function doGet(e) {
  const data = {
    projects: readArray_(SHEETS.projects),
    issues: readArray_(SHEETS.issues),
    releases: readArray_(SHEETS.releases),
    engineers: readArray_(SHEETS.engineers),
    parts: readArray_(SHEETS.parts),
    sites: readArray_(SHEETS.sites),
    users: readArray_(SHEETS.users)
  };
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  const action = body.action;
  const data = body.data;

  // 알림 (text 필드가 있으면 단순 알림 포맷)
  if (body && body.text && !action) {
    // 외부 웹훅용 — 필요 시 GmailApp / Slack webhook 연동
    Logger.log('NOTIFY ' + body.text);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  }

  switch (action) {
    case 'UPDATE_PROJECTS':  writeArray_(SHEETS.projects, data); break;
    case 'UPDATE_ISSUES':    writeArray_(SHEETS.issues, data); break;
    case 'UPDATE_RELEASES':  writeArray_(SHEETS.releases, data); break;
    case 'UPDATE_ENGINEERS': writeArray_(SHEETS.engineers, data); break;
    case 'UPDATE_PARTS':     writeArray_(SHEETS.parts, data); break;
    case 'UPDATE_SITES':     writeArray_(SHEETS.sites, data); break;
    case 'UPDATE_USERS':     writeArray_(SHEETS.users, data); break;
    case 'ADD_DAILY_REPORT': appendRow_(SHEETS.dailyReports, data); break;
    default:
      return ContentService.createTextOutput(JSON.stringify({ ok: false, err: 'unknown action' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
