// 저장용 타임스탬프 — "2025-05-13 15:30:00" (sv-SE 로케일)
// 읽기 좋고 new Date()로도 파싱 가능. 한국 로케일 toLocaleString()의
// "2025. 5. 13. 오후 3:30:00" 은 파싱 불가라 집계/정렬에서 탈락하던 버그를 차단.
export const nowStored = () => new Date().toLocaleString('sv-SE');

// 견고한 날짜 파서 — 신/구 포맷 모두 ms로 변환. 실패 시 NaN.
//  · ISO ("2025-05-13T15:30:00Z" / "2025-05-13 15:30:00") → 정상
//  · 한국 로케일 ("2025. 5. 13. 오후 3:30:00") → 일자만 추출해서 정오로 보정
//  · "YYYY-MM-DD" / "YYYY/MM/DD" → 정상
export const parseAnyDate = (s) => {
  if (!s) return NaN;
  if (typeof s === 'number') return s;
  const native = new Date(s).getTime();
  if (!isNaN(native)) return native;
  const m = String(s).match(/(\d{4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T12:00:00`;
    const t2 = new Date(iso).getTime();
    if (!isNaN(t2)) return t2;
  }
  return NaN;
};

// 정렬 비교자 — 최신순(desc)
export const compareDateDesc = (a, b) => (parseAnyDate(b) || 0) - (parseAnyDate(a) || 0);
// 정렬 비교자 — 오래된순(asc)
export const compareDateAsc = (a, b) => (parseAnyDate(a) || 0) - (parseAnyDate(b) || 0);
