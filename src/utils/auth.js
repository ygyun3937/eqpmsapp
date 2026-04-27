// 비밀번호 SHA-256 해시 (Web Crypto API)
// 주의: 클라이언트 사이드 해시는 평문 노출 방지 수준이며,
// HTTPS 및 GAS 백엔드 권한 설정과 함께 사용해야 함.

const SALT = 'EQ-PMS::v1::';

export const hashPassword = async (plain) => {
  if (!plain) return '';
  const data = new TextEncoder().encode(SALT + plain);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (plain, hash) => {
  if (!plain || !hash) return false;
  const computed = await hashPassword(plain);
  return computed === hash;
};

// 기존(평문) 비밀번호와의 호환을 위한 보조 비교
// 시드/마이그레이션 단계에서만 사용. 평문 매치 시 true.
export const matchPasswordCompat = async (plain, stored) => {
  if (!stored) return false;
  if (await verifyPassword(plain, stored)) return true;
  return plain === stored;
};
