// 통합 주소록 — 사용자 관리(내부)와 고객사 담당자(외부)를 하나의 contact 리스트로 합친다.
// 메일 송부 모달의 자동완성 / 주소록 모달의 데이터 소스로 사용.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (s) => String(s || '').trim().toLowerCase();

// 내부 사용자 → contact 형태로 변환
const userToContact = (u) => ({
  key: `user:${u.id}`,
  name: u.name || u.id || '',
  email: String(u.email || '').trim(),
  source: 'internal',
  dept: u.dept || '',
  company: '',
  title: u.position || '',
  role: u.role || ''
});

// 고객사 담당자(contact) → contact 형태로 변환
const customerContactToContact = (customer, c) => ({
  key: `contact:${customer.id || customer.name}:${c.id || c.email || c.name}`,
  name: c.name || '',
  email: String(c.email || '').trim(),
  source: 'customer',
  dept: c.dept || '',
  company: customer.name || '',
  title: c.title || '',
  role: ''
});

// 사용자 + 고객사 → 통합 주소록 (email 있는 항목만, email 기준 중복 제거)
export const buildAddressBook = (users, customers) => {
  const list = [];
  const seenEmails = new Set();

  (users || []).forEach(u => {
    const c = userToContact(u);
    if (!c.email || !EMAIL_RE.test(c.email)) return;
    const key = c.email.toLowerCase();
    if (seenEmails.has(key)) return;
    seenEmails.add(key);
    list.push(c);
  });

  (customers || []).forEach(cust => {
    (cust.contacts || []).forEach(cc => {
      const c = customerContactToContact(cust, cc);
      if (!c.email || !EMAIL_RE.test(c.email)) return;
      const key = c.email.toLowerCase();
      if (seenEmails.has(key)) return;
      seenEmails.add(key);
      list.push(c);
    });
  });

  return list;
};

// 검색어로 contact 필터 — 이름/이메일/부서/회사/직책 매칭
export const searchAddressBook = (addressBook, query) => {
  const kw = normalize(query);
  if (!kw) return addressBook;
  return addressBook.filter(c =>
    normalize(c.name).includes(kw) ||
    normalize(c.email).includes(kw) ||
    normalize(c.dept).includes(kw) ||
    normalize(c.company).includes(kw) ||
    normalize(c.title).includes(kw)
  );
};

// 자동완성용 — 이미 선택된 이메일은 제외, 최대 N개
export const suggestFromAddressBook = (addressBook, query, excludedEmails = [], limit = 6) => {
  const excludedSet = new Set(excludedEmails.map(e => String(e).toLowerCase()));
  const filtered = searchAddressBook(addressBook, query).filter(c => !excludedSet.has(c.email.toLowerCase()));
  return filtered.slice(0, limit);
};

// 표시용 라벨 (드롭다운/모달용)
export const contactDisplayLabel = (c) => {
  const parts = [c.name];
  if (c.title) parts.push(c.title);
  if (c.source === 'internal' && c.dept) parts.push(c.dept);
  if (c.source === 'customer' && c.company) parts.push(c.company);
  return parts.filter(Boolean).join(' · ');
};
