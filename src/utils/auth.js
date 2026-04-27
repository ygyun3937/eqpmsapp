// 비밀번호 SHA-256 해시
// - 보안 컨텍스트(HTTPS/localhost)에서는 Web Crypto API 사용
// - 그 외(사내 HTTP 서버 등)에서는 js-sha256 라이브러리로 폴백
//
// 주의: 클라이언트 사이드 해시는 평문 노출 방지 수준이며,
// HTTPS 및 GAS 백엔드 권한 설정과 함께 사용해야 함.

import { sha256 as jsSha256 } from 'js-sha256';

const SALT = 'EQ-PMS::v1::';

const hasWebCrypto = () =>
  typeof crypto !== 'undefined' &&
  crypto.subtle &&
  typeof crypto.subtle.digest === 'function';

export const hashPassword = async (plain) => {
  if (!plain) return '';
  const text = SALT + plain;
  if (hasWebCrypto()) {
    try {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // 일부 브라우저는 secure context 외에서 호출 시 throw
      return jsSha256(text);
    }
  }
  return jsSha256(text);
};

export const verifyPassword = async (plain, hash) => {
  if (!plain || hash === undefined || hash === null || hash === '') return false;
  const computed = await hashPassword(plain);
  // Google Sheets가 숫자형 문자열(예: '1234')을 number로 자동 변환하는 케이스 방어
  return computed === String(hash);
};

// 기존(평문) 비밀번호와의 호환을 위한 보조 비교
// 시드/마이그레이션 단계에서만 사용. 평문 매치 시 true.
export const matchPasswordCompat = async (plain, stored) => {
  if (stored === undefined || stored === null || stored === '') return false;
  const storedStr = String(stored);
  if (await verifyPassword(plain, storedStr)) return true;
  return String(plain) === storedStr;
};
