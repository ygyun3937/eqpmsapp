import { GAS_URL, WEBHOOK_URL } from '../constants';

// === 진행 중인 저장 추적 + beforeunload 플러시 ===
// 사용자가 새로고침하거나 탭을 닫으려 할 때, 발사만 하고 응답 못 받은 fetch가
// 브라우저에 의해 취소되면 GAS에 도달 못 함 → 새로고침 후 옛 데이터 표시되는 버그.
// 이를 막기 위해 (a) 대기 중인 페이로드를 보관하고 (b) unload 시 sendBeacon으로 강제 전송.
const _pendingPayloads = new Map(); // action → 최신 payload (덮어쓰기)
let _inFlightCount = 0;
const _listeners = new Set(); // 저장 상태 변경 알림 (UI 저장 인디케이터용)
const notifyListeners = () => _listeners.forEach(fn => { try { fn(_inFlightCount + _pendingPayloads.size); } catch (_) {} });
export const subscribeSaveState = (fn) => { _listeners.add(fn); return () => _listeners.delete(fn); };
export const getPendingSaveCount = () => _inFlightCount + _pendingPayloads.size;

// 페이지 떠나기 직전 모든 대기 페이로드를 sendBeacon으로 발송.
// sendBeacon은 페이지 unload 중에도 보장 발송되는 API.
function flushAllOnUnload() {
  if (!GAS_URL) return;
  _pendingPayloads.forEach((data, action) => {
    try {
      const blob = new Blob([JSON.stringify({ action, data })], { type: 'application/json' });
      navigator.sendBeacon(GAS_URL, blob);
    } catch (_) {}
  });
  _pendingPayloads.clear();
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAllOnUnload);
  window.addEventListener('pagehide', flushAllOnUnload);
}

export const loadFromGoogleDB = async (retries = 3) => {
  if (!GAS_URL) return null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(GAS_URL);
      const data = await res.json();
      return data;
    } catch (error) {
      console.warn(`구글 DB 로드 시도 ${i + 1}/${retries} 실패:`, error.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error('구글 DB 로드 최종 실패');
  return null;
};

// GAS는 첫 객체의 키만 헤더로 사용 → 새 필드(trips, extraTasks, badges 등)가
// 첫 항목에 없으면 컬럼이 생성되지 않아 저장 누락. 모든 객체가 동일 키 셋을 갖도록 정규화.
const normalizeArrayKeys = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const allKeys = new Set();
  arr.forEach(o => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      Object.keys(o).forEach(k => allKeys.add(k));
    }
  });
  if (allKeys.size === 0) return arr;
  return arr.map(o => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
    const next = {};
    allKeys.forEach(k => { next[k] = o[k] !== undefined ? o[k] : null; });
    return next;
  });
};

export const saveToGoogleDB = async (action, data, retries = 3) => {
  if (!GAS_URL) return;
  const payload = Array.isArray(data) ? normalizeArrayKeys(data) : data;
  // 같은 action이 in-flight일 가능성 대비 — 최신 페이로드를 pending에 보관 (unload 시 beacon으로 flush)
  _pendingPayloads.set(action, payload);
  notifyListeners();
  _inFlightCount++;
  notifyListeners();
  try {
    for (let i = 0; i < retries; i++) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action, data: payload }),
          keepalive: true // 페이지가 떠나도 요청 완료 시도
        });
        // 성공 — pending에서 제거 (해당 action 한정, 다른 action은 그대로)
        if (_pendingPayloads.get(action) === payload) {
          _pendingPayloads.delete(action);
          notifyListeners();
        }
        return;
      } catch (error) {
        console.warn(`구글 DB 저장 시도 ${i + 1}/${retries} 실패:`, error.message);
        if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
      }
    }
    console.error('구글 DB 저장 최종 실패');
  } finally {
    _inFlightCount = Math.max(0, _inFlightCount - 1);
    notifyListeners();
  }
};

// 응답을 받아야 하는 액션용 (UPLOAD_FILE, VERIFY_DRIVE_FOLDER 등)
export const callGoogleAction = async (action, data) => {
  if (!GAS_URL) return { status: 'error', message: 'GAS_URL이 설정되지 않았습니다.' };
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action, data })
    });
    return await res.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

// Delta 저장 — 단일 프로젝트 행만 업데이트. 전체 배열 덮어쓰기보다 빠름.
// project=null이면 해당 ID 삭제, 객체면 update/append.
export const saveProjectDelta = (projectId, project) => {
  return saveToGoogleDB('UPDATE_PROJECT_BY_ID', { projectId, project });
};

// 메일 발송 전용 호출 — mailGasUrl이 설정되어 있으면 그쪽으로 (사용자 권한 실행 GAS),
// 미설정 시 메인 GAS로 폴백 (시스템 계정 발송).
// 호출 후 별도 LOG_MAIL을 메인 GAS로 보내 감사 로그 기록.
export const callMailAction = async (data, mailGasUrl) => {
  const target = (mailGasUrl && String(mailGasUrl).trim()) || GAS_URL;
  if (!target) return { ok: false, message: '메일 발송 URL이 설정되지 않았습니다.' };
  try {
    const res = await fetch(target, {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_REPORT_EMAIL', data })
    });
    const result = await res.json();
    // 성공 시 별도 로깅 (메일 GAS와 메인 GAS가 다를 경우)
    if (result && result.ok && target !== GAS_URL && GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'LOG_MAIL',
            data: {
              kind: data.kind || '',
              to: (data.to || []).join(','),
              cc: (data.cc || []).join(','),
              subject: data.subject || '',
              author: data.author || '',
              senderEmail: result.senderEmail || '',
              projectId: data.projectId || '',
              projectName: data.projectName || ''
            }
          })
        });
      } catch (_) {}
    }
    return result;
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

// 파일을 base64로 변환 (Drive 업로드 전 준비)
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    // data:<mime>;base64,<data> → <data>만 추출
    const result = reader.result || '';
    const idx = String(result).indexOf(',');
    resolve(idx >= 0 ? String(result).slice(idx + 1) : String(result));
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const notifyWebhook = async (message, type = 'INFO', meta = null) => {
  if (!WEBHOOK_URL) return;
  try {
    const payload = {
      text: `[MAK-PMS 알림: ${type}]\n${message}`,
      type,
      meta
    };
    await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) });
  } catch (error) {
    console.error('Webhook failed', error);
  }
};
