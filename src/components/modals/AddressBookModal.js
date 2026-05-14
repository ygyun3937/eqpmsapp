import React, { useState, useMemo, memo } from 'react';
import { X, Search, BookUser, Plus, Users, Building2 } from 'lucide-react';
import { searchAddressBook, contactDisplayLabel } from '../../utils/addressBook';

const AddressBookModal = memo(function AddressBookModal({
  addressBook,        // [{key, name, email, source, dept, company, title, role}]
  initialTarget,      // 'to' | 'cc' — 어디로 추가할지 기본값
  selectedEmails,     // 이미 To/Cc에 들어간 이메일 (체크박스 비활성)
  onAdd,              // (emails, target) => void
  onClose,
  t
}) {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'internal' | 'customer'
  const [companyFilter, setCompanyFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [picked, setPicked] = useState(() => new Set()); // 체크한 이메일들
  const [target, setTarget] = useState(initialTarget || 'to');

  const alreadySet = useMemo(() => new Set((selectedEmails || []).map(e => String(e).toLowerCase())), [selectedEmails]);

  const companies = useMemo(() => {
    const s = new Set();
    addressBook.forEach(c => { if (c.company) s.add(c.company); });
    return Array.from(s).sort();
  }, [addressBook]);

  const depts = useMemo(() => {
    const s = new Set();
    addressBook.forEach(c => { if (c.dept) s.add(c.dept); });
    return Array.from(s).sort();
  }, [addressBook]);

  const filtered = useMemo(() => {
    let list = addressBook;
    if (sourceFilter !== 'all') list = list.filter(c => c.source === sourceFilter);
    if (companyFilter !== 'all') list = list.filter(c => c.company === companyFilter);
    if (deptFilter !== 'all') list = list.filter(c => c.dept === deptFilter);
    return searchAddressBook(list, query);
  }, [addressBook, query, sourceFilter, companyFilter, deptFilter]);

  // 내부/고객사로 그룹핑
  const groups = useMemo(() => {
    const internal = filtered.filter(c => c.source === 'internal');
    const customer = filtered.filter(c => c.source === 'customer');
    return { internal, customer };
  }, [filtered]);

  const toggle = (email) => {
    const next = new Set(picked);
    if (next.has(email)) next.delete(email); else next.add(email);
    setPicked(next);
  };

  const toggleGroupAll = (group) => {
    const available = group.filter(c => !alreadySet.has(c.email.toLowerCase()));
    const allPicked = available.every(c => picked.has(c.email));
    const next = new Set(picked);
    if (allPicked) available.forEach(c => next.delete(c.email));
    else available.forEach(c => next.add(c.email));
    setPicked(next);
  };

  const handleAdd = () => {
    const emails = Array.from(picked);
    if (emails.length === 0) return;
    onAdd(emails, target);
  };

  const renderContact = (c) => {
    const isDup = alreadySet.has(c.email.toLowerCase());
    const isChecked = picked.has(c.email);
    return (
      <label key={c.key} className={`flex items-start gap-2 p-2 rounded-lg border ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'} ${isDup ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
        <input
          type="checkbox"
          className="mt-0.5"
          checked={isChecked}
          disabled={isDup}
          onChange={() => toggle(c.email)}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-800 truncate">{contactDisplayLabel(c)}</div>
          <div className="text-[10px] text-slate-500 font-mono truncate">{c.email}</div>
          {isDup && <div className="text-[10px] text-amber-600 font-bold mt-0.5">{t('이미 추가됨', 'Already added')}</div>}
        </div>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[88vh]">
        <div className="px-5 py-3 flex justify-between items-center shrink-0 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold flex items-center text-slate-800">
            <BookUser size={16} className="mr-2 text-indigo-600" />
            {t('주소록', 'Address Book')}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg">
            <Search size={14} className="text-slate-400 mr-2" />
            <input
              autoFocus
              className="bg-transparent outline-none text-sm w-full"
              placeholder={t('이름·이메일·부서·회사·직책 검색', 'Search name/email/dept/company/title')}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="text-xs p-1.5 border rounded-md bg-white" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              <option value="all">{t('전체', 'All sources')}</option>
              <option value="internal">{t('내부 직원', 'Internal')}</option>
              <option value="customer">{t('고객사 담당자', 'Customer')}</option>
            </select>
            {companies.length > 0 && (
              <select className="text-xs p-1.5 border rounded-md bg-white" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                <option value="all">{t('전체 고객사', 'All companies')}</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {depts.length > 0 && (
              <select className="text-xs p-1.5 border rounded-md bg-white" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="all">{t('전체 부서', 'All depts')}</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <span className="text-[11px] text-slate-400 ml-auto self-center">
              {t('총', 'Total')} <strong className="text-slate-700">{filtered.length}</strong> / {addressBook.length}
            </span>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {filtered.length === 0 && (
            <div className="text-center text-xs text-slate-400 italic py-10">
              {addressBook.length === 0
                ? t('등록된 주소록이 없습니다. 사용자 관리 또는 고객사 담당자에 이메일을 등록하세요.', 'No contacts yet. Add emails in User Management or Customer Contacts.')
                : t('검색 결과 없음', 'No matching contacts')}
            </div>
          )}

          {groups.internal.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center text-xs font-bold text-blue-700">
                  <Users size={12} className="mr-1" />
                  {t('내부 직원', 'Internal')} <span className="ml-1 text-slate-400 font-normal">({groups.internal.length})</span>
                </div>
                <button type="button" onClick={() => toggleGroupAll(groups.internal)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                  {t('이 그룹 전체 선택/해제', 'Toggle group')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {groups.internal.map(renderContact)}
              </div>
            </div>
          )}

          {groups.customer.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center text-xs font-bold text-amber-700">
                  <Building2 size={12} className="mr-1" />
                  {t('고객사 담당자', 'Customer')} <span className="ml-1 text-slate-400 font-normal">({groups.customer.length})</span>
                </div>
                <button type="button" onClick={() => toggleGroupAll(groups.customer)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                  {t('이 그룹 전체 선택/해제', 'Toggle group')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {groups.customer.map(renderContact)}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap">
          <div className="text-xs text-slate-600">
            {picked.size > 0
              ? <span><strong className="text-indigo-700">{picked.size}</strong> {t('명 선택됨', 'selected')}</span>
              : <span className="text-slate-400 italic">{t('체크박스로 선택하세요', 'Tick checkboxes to select')}</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden text-xs">
              <button type="button" onClick={() => setTarget('to')} className={`px-3 py-1.5 font-bold ${target === 'to' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {t('수신 (To)', 'To')}
              </button>
              <button type="button" onClick={() => setTarget('cc')} className={`px-3 py-1.5 font-bold ${target === 'cc' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {t('참조 (CC)', 'Cc')}
              </button>
            </div>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">
              {t('취소', 'Cancel')}
            </button>
            <button
              onClick={handleAdd}
              disabled={picked.size === 0}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg inline-flex items-center"
            >
              <Plus size={11} className="mr-1" />{t('추가', 'Add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AddressBookModal;
