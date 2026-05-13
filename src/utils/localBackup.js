// localBackup.js — 데이터 보호 4중 방어 1단계 (클라이언트 측)
//
// 목적: 사용자 변경이 GAS로 전송되기 직전 + 직후 상태를 localStorage에 스냅샷으로
// 보관해서, 부팅 시 원격(=GAS)이 로컬보다 데이터가 적으면 사용자에게 복원 안내.
//
// 키 정책:
//   eq_pms_snapshot_<key>        — 가장 최근 sync 후 상태 (rolling)
//   eq_pms_last_known_good_<key> — 사용자가 정상적으로 본 최근 원격 상태
//                                   (load 직후 + 사용자 작업 직전에 갱신)
//   eq_pms_pending_changes       — sync에 실패했거나 unload된 변경 큐 (action+data)
//
// 모든 값은 JSON 문자열 (`{ts, data}` 래퍼). 5MB localStorage 한도 보호를 위해
// 큰 페이로드(projects 같은 배열)는 size 검사 후 잘라내거나 마지막 N개만 보관.

const PREFIX = 'eq_pms_';
const SNAPSHOT = (key) => `${PREFIX}snapshot_${key}`;
const LAST_KNOWN_GOOD = (key) => `${PREFIX}last_known_good_${key}`;
const PENDING = `${PREFIX}pending_changes`;

// localStorage 항목당 안전 한도 — Chrome/Firefox 5MB 전체 한도 중 단일 키 4MB까지 허용
const MAX_BYTES_PER_KEY = 4 * 1024 * 1024;

const safeSet = (storageKey, value) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_BYTES_PER_KEY) {
      // 너무 크면 메타만 저장 — 데이터 자체는 보관 불가
      const meta = { ts: Date.now(), oversized: true, size: json.length, keyHint: storageKey };
      localStorage.setItem(storageKey, JSON.stringify(meta));
      return false;
    }
    localStorage.setItem(storageKey, json);
    return true;
  } catch (e) {
    console.warn('[localBackup] save 실패', storageKey, e.message);
    return false;
  }
};

const safeGet = (storageKey) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

// 단일 컬렉션 스냅샷 저장 — sync 직후 호출
export const saveSnapshot = (key, data) => {
  safeSet(SNAPSHOT(key), { ts: Date.now(), data });
};

// 최근 스냅샷 로드
export const loadSnapshot = (key) => {
  const wrap = safeGet(SNAPSHOT(key));
  return wrap ? wrap.data : null;
};

// "정상적으로 본" 원격 상태 보관 (load 직후 + 사용자 액션 직전)
export const saveLastKnownGood = (key, data) => {
  safeSet(LAST_KNOWN_GOOD(key), { ts: Date.now(), data });
};
export const loadLastKnownGood = (key) => {
  const wrap = safeGet(LAST_KNOWN_GOOD(key));
  return wrap ? wrap.data : null;
};

// 부팅 시 비교 — 원격(GAS)에서 막 로드한 데이터와 로컬 스냅샷 비교
// 반환: { missingInRemote: [...], onlyInLocal: [...], identical: bool }
// projects/issues 같은 배열(id 필드 있는) 전용.
export const compareWithRemote = (local, remote, idKey = 'id') => {
  if (!Array.isArray(local) || !Array.isArray(remote)) {
    return { missingInRemote: [], onlyInLocal: [], identical: false, comparable: false };
  }
  const remoteIds = new Set(remote.map(r => r && r[idKey]).filter(Boolean));
  const missingInRemote = local.filter(l => l && l[idKey] && !remoteIds.has(l[idKey]));
  // 같은 id인데 timestamp 차이가 큰 항목도 의심 — 단, 여기서는 단순 존재만 비교
  return {
    missingInRemote,
    onlyInLocal: missingInRemote,
    identical: missingInRemote.length === 0 && remote.length === local.length,
    comparable: true
  };
};

// 미반영(보류) 변경 추가 — sync 실패 또는 unload 시점 보관용
export const addPendingChange = (action, data) => {
  const cur = safeGet(PENDING) || [];
  cur.push({ ts: Date.now(), action, data });
  // 200건 초과 시 오래된 것부터 삭제 (메모리 한도 보호)
  while (cur.length > 200) cur.shift();
  safeSet(PENDING, cur);
};

// 미반영 변경 목록 조회
export const getPendingChanges = () => safeGet(PENDING) || [];

// 미반영 변경 비우기 (재전송 성공 후 호출)
export const clearPendingChanges = () => {
  try { localStorage.removeItem(PENDING); } catch (_) {}
};

// 삭제 가드용 — 단일 항목 단독 스냅샷 (Drive 임시 폴더 백업 실패 대비 폴백)
export const saveDeletedItemSnapshot = (collection, item) => {
  const stampKey = `${PREFIX}deleted_${collection}_${item.id}_${Date.now()}`;
  safeSet(stampKey, { ts: Date.now(), collection, item });
  // 50개 초과 시 가장 오래된 deleted_* 키 정리
  try {
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${PREFIX}deleted_`)) allKeys.push(k);
    }
    if (allKeys.length > 50) {
      allKeys.sort();
      const drop = allKeys.length - 50;
      for (let i = 0; i < drop; i++) localStorage.removeItem(allKeys[i]);
    }
  } catch (_) {}
};

// 모든 deleted_* 스냅샷 조회 (관리자 복구용)
export const listDeletedSnapshots = () => {
  const out = [];
  if (typeof localStorage === 'undefined') return out;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${PREFIX}deleted_`)) {
        const w = safeGet(k);
        if (w) out.push({ key: k, ...w });
      }
    }
  } catch (_) {}
  return out.sort((a, b) => b.ts - a.ts);
};
