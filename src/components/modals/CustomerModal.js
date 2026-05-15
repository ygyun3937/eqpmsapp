import React, { useState, useMemo, useRef, memo } from 'react';
import {
  Building2, X, Plus, Trash, Edit, Check, Mail, Phone, Smartphone,
  MapPin, StickyNote, IdCard, Briefcase, Users, Link2
} from 'lucide-react';
import { DOMAINS, formatDomain } from '../../constants';

const ensureArr = (v) => (Array.isArray(v) ? v : []);
// 충돌 없는 contact id 생성 — Date.now() 단독은 같은 ms에 두 개 추가 시 충돌하여
// 이후 saveEdit/removeContact가 양쪽 모두에 영향을 미치는 버그가 있었음.
const newContactId = () => `CT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// 명함 카드(미리보기)
const BusinessCard = ({ contact, customerName, customerDomain, sites }) => {
  const linkedSites = ensureArr(contact.siteIds)
    .map(id => sites.find(s => s.id === id))
    .filter(Boolean);
  return (
    <div className="relative bg-gradient-to-br from-white via-white to-indigo-50/40 border border-slate-300 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700" />
      <div className="pl-4 pr-4 py-3.5">
        <div className="flex items-start justify-between mb-1.5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase truncate">
              {customerName || '고객사'}
            </div>
            {customerDomain && (
              <div className="text-[9px] text-slate-400 mt-0.5">{customerDomain}</div>
            )}
          </div>
          <Building2 size={16} className="text-indigo-300 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <div className="text-base font-bold text-slate-900 truncate">{contact.name || '(이름)'}</div>
          {contact.title && <div className="text-[11px] font-medium text-slate-500 shrink-0">{contact.title}</div>}
        </div>
        {contact.dept && (
          <div className="text-[11px] text-slate-500 mb-1.5 flex items-center"><Briefcase size={10} className="mr-1" />{contact.dept}</div>
        )}
        <div className="space-y-0.5 text-[11px] text-slate-700 mt-2 pt-2 border-t border-slate-100">
          {contact.email && <div className="flex items-center truncate"><Mail size={11} className="mr-1.5 text-slate-400 shrink-0" />{contact.email}</div>}
          {contact.officePhone && <div className="flex items-center truncate"><Phone size={11} className="mr-1.5 text-slate-400 shrink-0" />{contact.officePhone}</div>}
          {contact.mobile && <div className="flex items-center truncate"><Smartphone size={11} className="mr-1.5 text-slate-400 shrink-0" />{contact.mobile}</div>}
        </div>
        {linkedSites.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
            {linkedSites.slice(0, 4).map(s => (
              <span key={s.id} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                {s.fab}{s.line ? `·${s.line}` : ''}
              </span>
            ))}
            {linkedSites.length > 4 && (
              <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">+{linkedSites.length - 4}</span>
            )}
          </div>
        )}
        {contact.note && (
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 italic line-clamp-2">{contact.note}</div>
        )}
      </div>
    </div>
  );
};

// 담당자 인라인 편집 폼
const ContactEditForm = ({ form, setForm, sites, onSave, onCancel, t }) => (
  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 space-y-2">
    <div className="grid grid-cols-12 gap-2">
      <div className="col-span-5">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('이름', 'Name')} *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('홍길동', 'Name')} className="w-full p-1.5 border rounded text-xs" />
      </div>
      <div className="col-span-3">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('직책', 'Title')}</label>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('과장', 'Mgr')} className="w-full p-1.5 border rounded text-xs" />
      </div>
      <div className="col-span-4">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('부서', 'Dept')}</label>
        <input value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} placeholder={t('생산기술팀', 'Mfg')} className="w-full p-1.5 border rounded text-xs" />
      </div>
    </div>
    <div className="grid grid-cols-12 gap-2">
      <div className="col-span-12">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('이메일', 'Email')}</label>
        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="hong@customer.com" className="w-full p-1.5 border rounded text-xs" />
      </div>
    </div>
    <div className="grid grid-cols-12 gap-2">
      <div className="col-span-6">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('사무실 전화', 'Office')}</label>
        <input value={form.officePhone} onChange={e => setForm({...form, officePhone: e.target.value})} placeholder="02-1234-5678" className="w-full p-1.5 border rounded text-xs" />
      </div>
      <div className="col-span-6">
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('모바일', 'Mobile')}</label>
        <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="010-1234-5678" className="w-full p-1.5 border rounded text-xs" />
      </div>
    </div>
    {sites.length > 0 && (
      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('담당 사이트 (다중 선택)', 'Sites (multi)')}</label>
        <div className="flex flex-wrap gap-1 bg-white border border-amber-200 rounded p-1.5 max-h-24 overflow-y-auto">
          {sites.map(s => {
            const checked = ensureArr(form.siteIds).includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => {
                  // 함수형 업데이트 — 빠른 연속 클릭에 stale closure로 이전 토글이 사라지는 것을 방지
                  setForm(prev => {
                    const cur = ensureArr(prev.siteIds);
                    const isOn = cur.includes(s.id);
                    return { ...prev, siteIds: isOn ? cur.filter(x => x !== s.id) : [...cur, s.id] };
                  });
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${checked ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                {s.fab}{s.line ? `·${s.line}` : ''}
              </button>
            );
          })}
        </div>
      </div>
    )}
    <div>
      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('메모', 'Note')}</label>
      <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder={t('전결 권한, 보고 라인 등', 'Authority, reporting line, etc.')} className="w-full p-1.5 border rounded text-xs" />
    </div>
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onSave} disabled={!form.name.trim()} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded p-1.5 flex items-center justify-center"><Check size={13} className="mr-1" />{t('저장', 'Save')}</button>
      <button type="button" onClick={onCancel} className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded p-1.5">{t('취소', 'Cancel')}</button>
    </div>
  </div>
);

// 역할별(엔드유저/설비업체) 프로젝트 섹션. 한 곳에서 정의해서 두 번 재사용.
const ProjectRoleSection = ({
  role, themeColor, title, linkedList, candidates,
  showPicker, setShowPicker, pickerSearch, setPickerSearch,
  customer, onAttachProject, onDetachProject, t
}) => {
  // 테마 컬러 매핑 (tailwind는 동적 클래스 안 되니까 명시적으로)
  const themes = {
    blue:   { border: 'border-blue-100', text: 'text-blue-700', btnBg: 'bg-blue-600 hover:bg-blue-700', cardBorder: 'border-blue-200', cardHover: 'hover:border-blue-400', pickerBorder: 'border-blue-200', pickerHover: 'hover:bg-blue-50 hover:border-blue-300', linkText: 'text-blue-600' },
    purple: { border: 'border-purple-100', text: 'text-purple-700', btnBg: 'bg-purple-600 hover:bg-purple-700', cardBorder: 'border-purple-200', cardHover: 'hover:border-purple-400', pickerBorder: 'border-purple-200', pickerHover: 'hover:bg-purple-50 hover:border-purple-300', linkText: 'text-purple-600' }
  };
  const c = themes[themeColor] || themes.blue;
  return (
    <div>
      <div className={`flex items-center justify-between border-b ${c.border} pb-1.5 mb-3`}>
        <h3 className={`text-xs font-bold ${c.text} uppercase tracking-wider flex items-center`}>
          <Link2 size={12} className="mr-1.5" />
          {title}
          <span className="ml-1.5 text-slate-400 normal-case font-normal">({linkedList.length})</span>
        </h3>
        {onAttachProject && (
          <button
            type="button"
            onClick={() => { setShowPicker(v => !v); setPickerSearch(''); }}
            className={`text-[11px] font-bold px-2 py-1 rounded inline-flex items-center transition-colors ${showPicker ? 'bg-slate-200 text-slate-700' : `${c.btnBg} text-white`}`}
          >
            {showPicker ? <X size={11} className="mr-1" /> : <Plus size={11} className="mr-1" />}
            {showPicker ? t('닫기', 'Close') : t('프로젝트 연결', 'Link Project')}
          </button>
        )}
      </div>

      {showPicker && onAttachProject && (
        <div className={`mb-3 p-3 bg-white border-2 ${c.pickerBorder} rounded-lg space-y-2`}>
          <input
            autoFocus
            type="text"
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            placeholder={t('프로젝트 검색 (이름/현재 고객사/사이트/PM)...', 'Search projects (name / customer / site / PM)...')}
            className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
          />
          <div className="text-[10px] text-slate-500">
            {t(`연결 후보 ${candidates.length}건`, `${candidates.length} candidates`)}
            {candidates.length > 0 && <span className="ml-1 text-slate-400">· {t('항목 클릭 시 즉시 연결됩니다.', 'Click to link.')}</span>}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {candidates.length === 0 ? (
              <div className="text-center text-[11px] text-slate-400 py-4">
                {t('연결할 수 있는 프로젝트가 없습니다.', 'No projects available to link.')}
              </div>
            ) : candidates.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onAttachProject(p.id, customer.id, role); setPickerSearch(''); }}
                className={`w-full text-left bg-slate-50 ${c.pickerHover} border border-slate-200 rounded p-2 transition-colors flex items-center justify-between gap-2`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                    {p.status && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${p.status === '완료' ? 'bg-emerald-50 text-emerald-700' : p.status === '이슈발생' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{p.status}</span>
                    )}
                    {p.domain && <span className="text-[9px] text-slate-400 shrink-0">{formatDomain(p.domain, p.subDomain)}</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {p.endUser && <span>엔드유저: <strong>{p.endUser}</strong></span>}
                    {p.vendor && <span className="ml-2">설비: <strong>{p.vendor}</strong></span>}
                    {!p.endUser && !p.vendor && <span className="italic text-slate-400">{t('고객사 없음', 'No customer')}</span>}
                    {p.site && <span className="ml-2 text-slate-400">· {p.site}</span>}
                    {p.manager && <span className="ml-2 text-slate-400">· {p.manager}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold ${c.linkText} shrink-0`}>{t('연결 →', 'Link →')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {linkedList.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center text-slate-400 text-xs">
          {t('연관된 프로젝트가 없습니다.', 'No linked projects.')}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
          {linkedList.map(p => (
            <div key={p.id} className={`relative group bg-white border ${c.cardBorder} rounded-lg p-2.5 ${c.cardHover} transition-colors`}>
              <div className="flex items-center justify-between mb-1 pr-10">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.status === '완료' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : p.status === '이슈발생' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{p.status || '진행중'}</span>
                {p.domain && <span className="text-[9px] text-slate-400">{formatDomain(p.domain, p.subDomain)}</span>}
              </div>
              <div className="text-xs font-bold text-slate-800 truncate" title={p.name}>{p.name}</div>
              {(p.site || p.manager) && (
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {p.site || ''}{p.site && p.manager ? ' · ' : ''}{p.manager || ''}
                </div>
              )}
              <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold px-1 py-0.5 rounded ${p._matchType === 'id' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                {p._matchType === 'id' ? 'ID' : '名'}
              </span>
              {onDetachProject && (
                <button
                  type="button"
                  onClick={() => onDetachProject(p.id, role)}
                  className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('연결 해제', 'Detach')}
                >
                  {t('연결 해제', 'Detach')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerModal = memo(function CustomerModal({ customer, sites, projects, onClose, onSubmit, onDetachProject, onDetachSite, onAttachSite, onAttachProject, t }) {
  const [data, setData] = useState(() => {
    // 기존 contact id 중복 자동 정리 — 과거 Date.now() 단독 사용 시 동일 ms 추가로 발생한 충돌 복구
    const seen = new Set();
    const normalizedContacts = ensureArr(customer?.contacts).map((c, idx) => {
      const id = c.id;
      if (!id || seen.has(id)) {
        const newId = newContactId();
        seen.add(newId);
        return { ...c, id: newId };
      }
      seen.add(id);
      return { ...c, siteIds: ensureArr(c.siteIds) };
    });
    return {
      name: customer?.name || '',
      domain: customer?.domain || '반도체',
      phone: customer?.phone || '',
      address: customer?.address || '',
      note: customer?.note || '',
      contacts: normalizedContacts
    };
  });
  const blankContact = { name: '', title: '', dept: '', email: '', officePhone: '', mobile: '', siteIds: [], note: '' };
  const [newContact, setNewContact] = useState(blankContact);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(blankContact);
  const [showNewForm, setShowNewForm] = useState(false);
  // 사이트/프로젝트 연결 추가 (기존 항목 선택)
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [showEndUserPicker, setShowEndUserPicker] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [sitePickerSearch, setSitePickerSearch] = useState('');
  const [projectPickerSearch, setProjectPickerSearch] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  const initialDataRef = useRef(data);
  const isDirty = JSON.stringify(data) !== JSON.stringify(initialDataRef.current) || showNewForm;

  const handleClose = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  // 사이트는 같은 고객사명에 매칭되거나 customerId가 지정된 것만 보여줌 — 단, 신규 모드에선 전체 후보 제공
  // matchType 부여: 'id' (명시 연결) | 'name' (텍스트 일치)
  const customerSites = useMemo(() => {
    if (!customer) return sites; // 신규는 매핑 전이라 전체 노출
    const cid = customer.id || '';
    const cname = String(customer.name || '').trim();
    return sites
      .map(s => {
        if (cid && s.customerId === cid) return { ...s, _matchType: 'id' };
        if (!s.customerId && cname && String(s.customer || '').trim() === cname) return { ...s, _matchType: 'name' };
        return null;
      })
      .filter(Boolean);
  }, [sites, customer]);

  // 엔드유저로 연결된 프로젝트
  const endUserProjects = useMemo(() => {
    if (!customer) return [];
    const cid = customer.id || '';
    const cname = String(customer.name || '').trim();
    return projects
      .map(p => {
        const linkId = p.endUserId || p.customerId; // 마이그레이션 호환
        if (cid && linkId === cid) return { ...p, _matchType: 'id' };
        if (!linkId && cname && String(p.endUser || p.customer || '').trim() === cname) return { ...p, _matchType: 'name' };
        return null;
      })
      .filter(Boolean);
  }, [projects, customer]);

  // 설비업체로 연결된 프로젝트
  const vendorProjects = useMemo(() => {
    if (!customer) return [];
    const cid = customer.id || '';
    const cname = String(customer.name || '').trim();
    return projects
      .map(p => {
        if (cid && p.vendorId === cid) return { ...p, _matchType: 'id' };
        if (!p.vendorId && cname && String(p.vendor || '').trim() === cname) return { ...p, _matchType: 'name' };
        return null;
      })
      .filter(Boolean);
  }, [projects, customer]);

  // 두 역할 합친 총 수 — 헤더 카운트용 (중복 프로젝트는 중복 카운트)
  const linkedProjects = useMemo(() => [...endUserProjects, ...vendorProjects], [endUserProjects, vendorProjects]);

  // 이 고객사에 아직 연결 안 된 후보 (다른 고객사 소속이거나 미연결)
  const candidateSites = useMemo(() => {
    if (!customer) return [];
    const cid = customer.id || '';
    const cname = String(customer.name || '').trim();
    const linkedIds = new Set(customerSites.map(s => s.id));
    const kw = sitePickerSearch.trim().toLowerCase();
    return sites.filter(s => {
      if (linkedIds.has(s.id)) return false;
      if (cid && s.customerId === cid) return false;
      if (!s.customerId && cname && String(s.customer || '').trim() === cname) return false;
      if (!kw) return true;
      const hay = [s.fab, s.line, s.customer, s.power, s.note].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [sites, customer, customerSites, sitePickerSearch]);

  // 엔드유저 후보: 이 고객사에 엔드유저로 안 묶인 프로젝트 (설비업체로만 연결돼 있는 건 OK — 다른 역할이라 추가 가능)
  const candidateEndUserProjects = useMemo(() => {
    if (!customer) return [];
    const cid = customer.id || '';
    const linkedIds = new Set(endUserProjects.map(p => p.id));
    const kw = projectPickerSearch.trim().toLowerCase();
    return projects.filter(p => {
      if (linkedIds.has(p.id)) return false;
      const linkId = p.endUserId || p.customerId;
      if (cid && linkId === cid) return false;
      if (!kw) return true;
      const hay = [p.name, p.customer, p.endUser, p.vendor, p.site, p.manager, p.domain].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [projects, customer, endUserProjects, projectPickerSearch]);

  const candidateVendorProjects = useMemo(() => {
    if (!customer) return [];
    const cid = customer.id || '';
    const linkedIds = new Set(vendorProjects.map(p => p.id));
    const kw = projectPickerSearch.trim().toLowerCase();
    return projects.filter(p => {
      if (linkedIds.has(p.id)) return false;
      if (cid && p.vendorId === cid) return false;
      if (!kw) return true;
      const hay = [p.name, p.customer, p.endUser, p.vendor, p.site, p.manager, p.domain].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [projects, customer, vendorProjects, projectPickerSearch]);

  const addContact = () => {
    if (!newContact.name.trim()) return;
    const newId = newContactId();
    // 함수형 업데이트 — 다른 contact 수정 중에 add를 누르면 stale data로 인해 다른 contact가 사라지던 경우 방지
    setData(prev => ({...prev, contacts: [...prev.contacts, { ...newContact, siteIds: [...ensureArr(newContact.siteIds)], id: newId }]}));
    setNewContact(blankContact);
    setShowNewForm(false);
  };
  const removeContact = (id) => {
    setData(prev => ({...prev, contacts: prev.contacts.filter(c => c.id !== id)}));
    if (editingId === id) setEditingId(null);
  };
  const startEdit = (c) => {
    setEditingId(c.id);
    // siteIds는 새 배열로 복사 — 원본 contact 객체의 siteIds 참조 공유 방지
    setEditForm({ ...blankContact, ...c, siteIds: [...ensureArr(c.siteIds)] });
  };
  const saveEdit = () => {
    if (!editForm.name.trim()) return;
    // 함수형 업데이트 + 정확히 1건만 교체 (editingId가 정확한 id면 단일 매칭)
    setData(prev => ({...prev, contacts: prev.contacts.map(c => c.id === editingId ? { ...editForm, siteIds: [...ensureArr(editForm.siteIds)] } : c)}));
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center">
            <Building2 size={20} className="mr-2 text-indigo-600" />
            {customer ? t('고객사 정보 수정', 'Edit Customer') : t('새 고객사 등록', 'New Customer')}
            {customer && (
              <span className="ml-3 text-xs font-normal text-indigo-600">
                · {t('엔드유저', 'End User')} <strong>{endUserProjects.length}</strong> / {t('설비업체', 'Vendor')} <strong>{vendorProjects.length}</strong> / {t('사이트', 'Sites')} <strong>{customerSites.length}</strong>
              </span>
            )}
          </h2>
          <button type="button" onClick={handleClose} className="text-indigo-700 opacity-70 hover:opacity-100"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6 p-6">
            {/* 좌측 — 기본 정보 */}
            <div className="col-span-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">{t('기본 정보', 'Basic Info')}</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('고객사명', 'Customer Name')} *</label>
                <input required autoFocus value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={t('예: A전자', 'e.g. ACME Corp')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('산업군', 'Domain')}</label>
                  <select value={data.domain} onChange={e => setData({...data, domain: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center"><Phone size={11} className="mr-1 text-slate-400" />{t('대표 전화', 'Main Phone')}</label>
                  <input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="02-1234-5678" className="w-full p-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center"><MapPin size={11} className="mr-1 text-slate-400" />{t('주소', 'Address')}</label>
                <input value={data.address} onChange={e => setData({...data, address: e.target.value})} placeholder={t('본사 주소', 'Headquarters')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center"><StickyNote size={11} className="mr-1 text-slate-400" />{t('메모', 'Note')}</label>
                <textarea rows="3" value={data.note} onChange={e => setData({...data, note: e.target.value})} placeholder={t('거래 이력, 특이사항 등', 'History, notes, etc.')} className="w-full p-2 border rounded-lg text-sm resize-none" />
              </div>

            </div>

            {/* 우측 — 담당자 명함 카드 */}
            <div className="col-span-7 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><IdCard size={12} className="mr-1.5" />{t('담당자 명함', 'Contact Cards')} <span className="ml-1.5 text-slate-400 normal-case font-normal">({data.contacts.length})</span></h3>
                <button type="button" onClick={() => { setShowNewForm(true); setEditingId(null); }} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded inline-flex items-center"><Plus size={12} className="mr-1" />{t('담당자 추가', 'Add Contact')}</button>
              </div>

              {/* 신규 추가 폼 */}
              {showNewForm && (
                <ContactEditForm
                  form={newContact}
                  setForm={setNewContact}
                  sites={customerSites}
                  onSave={addContact}
                  onCancel={() => { setShowNewForm(false); setNewContact(blankContact); }}
                  t={t}
                />
              )}

              {/* 명함 카드 그리드 */}
              {data.contacts.length === 0 && !showNewForm && (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
                  <Users size={28} className="mx-auto mb-2 text-slate-300" />
                  {t('등록된 담당자가 없습니다.', 'No contacts.')} <br/>
                  <span className="text-xs">{t('"담당자 추가" 버튼으로 명함을 만들어보세요.', 'Click "Add Contact" to create a card.')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.contacts.map(c => (
                  editingId === c.id ? (
                    <div key={c.id} className="md:col-span-2">
                      <ContactEditForm
                        form={editForm}
                        setForm={setEditForm}
                        sites={customerSites}
                        onSave={saveEdit}
                        onCancel={() => setEditingId(null)}
                        t={t}
                      />
                    </div>
                  ) : (
                    <div key={c.id} className="relative group">
                      <BusinessCard contact={c} customerName={data.name} customerDomain={data.domain} sites={customerSites} />
                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => startEdit(c)} className="bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 rounded p-1 shadow-sm" title={t('수정', 'Edit')}><Edit size={12} /></button>
                        <button type="button" onClick={() => removeContact(c.id)} className="bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded p-1 shadow-sm" title={t('삭제', 'Delete')}><Trash size={12} /></button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* 하단 — 연관 사이트 / 연관 프로젝트 (편집 모드에서만) */}
          {customer && (
            <div className="px-6 pb-6 border-t border-slate-200 bg-slate-50/40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                {/* 연관 사이트 */}
                <div>
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5 mb-3">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center">
                      <Link2 size={12} className="mr-1.5" />
                      {t('연관 사이트', 'Linked Sites')}
                      <span className="ml-1.5 text-slate-400 normal-case font-normal">({customerSites.length})</span>
                    </h3>
                    {onAttachSite && (
                      <button
                        type="button"
                        onClick={() => { setShowSitePicker(v => !v); setSitePickerSearch(''); }}
                        className={`text-[11px] font-bold px-2 py-1 rounded inline-flex items-center transition-colors ${showSitePicker ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                      >
                        {showSitePicker ? <X size={11} className="mr-1" /> : <Plus size={11} className="mr-1" />}
                        {showSitePicker ? t('닫기', 'Close') : t('사이트 연결', 'Link Site')}
                      </button>
                    )}
                  </div>

                  {/* 사이트 선택 패널 */}
                  {showSitePicker && onAttachSite && (
                    <div className="mb-3 p-3 bg-white border-2 border-emerald-200 rounded-lg space-y-2">
                      <input
                        autoFocus
                        type="text"
                        value={sitePickerSearch}
                        onChange={e => setSitePickerSearch(e.target.value)}
                        placeholder={t('사이트 검색 (Fab/Line/현재 고객사명 등)...', 'Search sites (fab / line / current customer)...')}
                        className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-500"
                      />
                      <div className="text-[10px] text-slate-500">
                        {t(`연결 후보 ${candidateSites.length}건`, `${candidateSites.length} candidates`)}
                        {candidateSites.length > 0 && <span className="ml-1 text-slate-400">· {t('항목 클릭 시 즉시 연결됩니다.', 'Click to link.')}</span>}
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {candidateSites.length === 0 ? (
                          <div className="text-center text-[11px] text-slate-400 py-4">
                            {t('연결할 수 있는 사이트가 없습니다.', 'No sites available to link.')}
                          </div>
                        ) : candidateSites.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { onAttachSite(s.id, customer.id); setSitePickerSearch(''); }}
                            className="w-full text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded p-2 transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {s.fab}{s.line ? ` · ${s.line}` : ''}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {s.customer
                                  ? <>{t('현재 고객사:', 'Current:')} <strong>{s.customer}</strong>{s.customerId ? '' : <span className="text-amber-600 ml-1">({t('미연결', 'Unlinked')})</span>}</>
                                  : <span className="italic text-slate-400">{t('고객사 없음', 'No customer')}</span>}
                                {s.power && <span className="ml-2 text-slate-400">⚡ {s.power}</span>}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 shrink-0">{t('연결 →', 'Link →')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {customerSites.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center text-slate-400 text-xs">
                      {t('연관된 사이트가 없습니다.', 'No linked sites.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {customerSites.map(s => {
                        const siteContacts = data.contacts.filter(c => ensureArr(c.siteIds).includes(s.id));
                        return (
                        <div key={s.id} className="relative group bg-white border border-emerald-200 rounded-lg p-2.5 hover:border-emerald-400 transition-colors">
                          <div className="flex items-baseline gap-1.5 mb-1 pr-12">
                            <span className="text-sm font-bold text-slate-800 truncate">{s.fab}</span>
                            {s.line && <span className="text-[10px] text-slate-500 shrink-0">{s.line}</span>}
                          </div>
                          {s.customer && <div className="text-[10px] text-slate-400 truncate">"{s.customer}"</div>}
                          {s.power && <div className="text-[10px] text-slate-500 truncate">⚡ {s.power}</div>}
                          {Array.isArray(s.customSpecs) && s.customSpecs.length > 0 && (
                            <div className="text-[10px] text-purple-600 mt-1 font-bold">+{s.customSpecs.length}{t(' 추가 스펙', ' specs')}</div>
                          )}
                          {/* 이 사이트에 배정된 담당자들 — 여러 명 가능 */}
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                              <IdCard size={9} className="mr-1" />
                              {t('이 사이트 담당자', 'Site Contacts')} ({siteContacts.length})
                            </div>
                            {siteContacts.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic">{t('아직 배정된 담당자 없음', 'No contacts assigned')}</div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {siteContacts.map(ct => (
                                  <span key={ct.id} className="inline-flex items-center text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold" title={[ct.title, ct.dept, ct.email].filter(Boolean).join(' · ')}>
                                    {ct.name}{ct.title ? ` ${ct.title}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* 매칭 이유 뱃지 */}
                          <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold px-1 py-0.5 rounded ${s._matchType === 'id' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`} title={s._matchType === 'id' ? `customerId=${s.customerId}` : `텍스트 매칭: "${s.customer}"`}>
                            {s._matchType === 'id' ? 'ID' : '名'}
                          </span>
                          {/* 연결 해제 버튼 — ID/名 매칭 모두 */}
                          {onDetachSite && (
                            <button
                              type="button"
                              onClick={() => onDetachSite(s.id)}
                              className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t('이 사이트의 고객사 연결을 해제 (사이트 자체는 유지)', 'Detach customer from this site')}
                            >
                              {t('연결 해제', 'Detach')}
                            </button>
                          )}
                        </div>
                      );})}
                    </div>
                  )}
                </div>

                {/* 엔드유저로 연결된 프로젝트 */}
                <ProjectRoleSection
                  role="endUser"
                  themeColor="blue"
                  title={t('엔드유저 프로젝트', 'End-User Projects')}
                  linkedList={endUserProjects}
                  candidates={candidateEndUserProjects}
                  showPicker={showEndUserPicker}
                  setShowPicker={setShowEndUserPicker}
                  pickerSearch={projectPickerSearch}
                  setPickerSearch={setProjectPickerSearch}
                  customer={customer}
                  onAttachProject={onAttachProject}
                  onDetachProject={onDetachProject}
                  t={t}
                />

                {/* 설비업체로 연결된 프로젝트 */}
                <ProjectRoleSection
                  role="vendor"
                  themeColor="purple"
                  title={t('설비업체 프로젝트', 'Vendor Projects')}
                  linkedList={vendorProjects}
                  candidates={candidateVendorProjects}
                  showPicker={showVendorPicker}
                  setShowPicker={setShowVendorPicker}
                  pickerSearch={projectPickerSearch}
                  setPickerSearch={setProjectPickerSearch}
                  customer={customer}
                  onAttachProject={onAttachProject}
                  onDetachProject={onDetachProject}
                  t={t}
                />
              </div>
            </div>
          )}

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            {confirmClose ? (
              <>
                <span className="text-sm text-amber-700 font-bold flex items-center mr-auto">
                  ⚠️ {t('저장하지 않은 변경사항이 있습니다.', 'You have unsaved changes.')}
                </span>
                <button type="button" onClick={() => setConfirmClose(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg">{t('계속 편집', 'Keep Editing')}</button>
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm">{t('저장 없이 닫기', 'Close Without Saving')}</button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg">{t('취소', 'Cancel')}</button>
                <button type="submit" disabled={!data.name.trim()} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm">{customer ? t('저장', 'Save') : t('등록하기', 'Create')}</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
});

export default CustomerModal;
