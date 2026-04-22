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

export const saveToGoogleDB = async (action, data, retries = 3) => {
  if (!GAS_URL) return;
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data })
      });
      return;
    } catch (error) {
      console.warn(`구글 DB 저장 시도 ${i + 1}/${retries} 실패:`, error.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error('구글 DB 저장 최종 실패');
};

export const notifyWebhook = async (message, type = 'INFO') => {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `[EQ-PMS 알림: ${type}]\n${message}` }) });
  } catch (error) {
    console.error('Webhook failed', error);
  }
};
