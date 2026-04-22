import { GAS_URL, WEBHOOK_URL } from '../constants';

export const loadFromGoogleDB = async () => {
  if (!GAS_URL) return null;
  try {
    const res = await fetch(GAS_URL + '?action=LOAD_ALL');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('구글 DB 로드 실패:', error);
    return null;
  }
};

export const saveToGoogleDB = async (type, payload) => {
  if (!GAS_URL) return;
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ type: type, data: payload })
    });
  } catch (error) {
    console.error('구글 DB 저장 실패:', error);
  }
};

export const notifyWebhook = async (message, type = 'INFO') => {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `[EQ-PMS 알림: ${type}]\n${message}` }) });
  } catch (error) {
    console.error('Webhook failed', error);
  }
};
