import { GAS_URL, WEBHOOK_URL } from '../constants';

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
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data: payload })
      });
      return;
    } catch (error) {
      console.warn(`구글 DB 저장 시도 ${i + 1}/${retries} 실패:`, error.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error('구글 DB 저장 최종 실패');
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
