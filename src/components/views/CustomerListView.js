import React, { useState, useMemo, memo } from 'react';
import {
  Building2, Plus, Edit, Trash, Users, Phone, MapPin,
  Search, Download, IdCard, Link2, Sparkles, AlertCircle
} from 'lucide-react';
import { exportToExcel } from '../../utils/export';

const ensureArr = (v) => (Array.isArray(v) ? v : []);

const CustomerListView = memo(function CustomerListView({
  customers, sites, projects,
  onAddClick, onEditClick, onDeleteClick, onQuickRegister,
  currentUser, t
}) {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('전체');

  const isAdmin = currentUser?.role === 'ADMIN';

  // 자동 발견: 프로젝트·사이트의 customer 텍스트 중 customers에 없는 unique 이름
  const unregistered = useMemo(() => {
    const known = new Set(customers.map(c => String(c.name || '').trim().toLowerCase()).filter(Boolean));
    const found = new Map();
    (projects || []).forEach(p => {
      if (p.customerId) return;
      const name = String(p.customer || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (known.has(key)) return;
      const entry = found.get(key) || { name, projects: 0, sites: 0, domain: p.domain };
      entry.projects += 1;
      found.set(key, entry);
    });
    (sites || []).forEach(s => {
      if (s.customerId) return;
      const name = String(s.customer || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (known.has(key)) return;
      const entry = found.get(key) || { name, projects: 0, sites: 0 };
      entry.sites += 1;
      found.set(key, entry);
    });
    return Array.from(found.values()).sort((a, b) => (b.projects + b.sites) - (a.projects + a.sites));
  }, [customers, projects, sites]);

  const enriched = useMemo(() => {
    return customers.map(c => {
      const cid = c.id || '';
      const cName = String(c.name || '').trim();
      const linkedSites = (sites || []).filter(s =>
        (cid && s.customerId === cid) ||
        (!s.customerId && cName && String(s.customer || '').trim() === cName)
      );
      const linkedProjects = (projects || []).filter(p =>
        (cid && p.customerId === cid) ||
        (!p.customerId && cName && String(p.customer || '').trim() === cName)
      );
      const contactsCount = ensureArr(c.contacts).length;
      return { ...c, linkedSites, linkedProjects, contactsCount };
    });
  }, [customers, sites, projects]);

  const domains = useMemo(() => {
    const set = new Set();
    customers.forEach(c => { if (c.domain) set.add(c.domain); });
    return ['전체', ...Array.from(set).sort()];
  }, [customers]);

  const visible = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return enriched.filter(c => {
      if (domainFilter !== '전체' && c.domain !== domainFilter) return false;
      if (!kw) return true;
      const hay = [c.name, c.domain, c.phone, c.address, c.note, ...(c.contacts || []).flatMap(ct => [ct.name, ct.title, ct.dept, ct.email, ct.mobile, ct.officePhone])].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [enriched, search, domainFilter]);

  const handleExport = () => {
    const rows = customers.map(c => ({
      id: c.id,
      name: c.name, domain: c.domain || '', phone: c.phone || '',
      address: c.address || '',
      contactsCount: ensureArr(c.contacts).length,
      contacts: ensureArr(c.contacts).map(ct => `${ct.name}${ct.title ? `(${ct.title})` : ''}${ct.email ? ` ${ct.email}` : ''}${ct.mobile ? ` ${ct.mobile}` : ''}`).join(' / '),
      note: c.note || ''
    }));
    exportToExcel('고객사_리스트', [{
      name: '고객사',
      rows,
      columns: [
        { header: 'ID', key: 'id' }, { header: '고객사명', key: 'name' },
        { header: '산업군', key: 'domain' }, { header: '대표 전화', key: 'phone' },
        { header: '주소', key: 'address' },
        { header: '담당자 수', key: 'contactsCount' }, { header: '담당자 목록', key: 'contacts' },
        { header: '메모', key: 'note' }
      ]
    }]);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('고객사 정보 관리', 'Customer Management')}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t('고객사 기본 정보와 담당자(명함)를 한 곳에서 관리합니다. 한 담당자는 여러 사이트를 담당할 수 있습니다.', 'Manage customer info and contact business cards. One contact can cover multiple sites.')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          {isAdmin && (
            <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"><Plus size={16} className="mr-1" /> {t('새 고객사 등록', 'New Customer')}</button>
          )}
        </div>
      </div>

      {/* 검색·필터 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('고객사명·담당자·이메일 검색...', 'Search customer/contact/email...')}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          />
        </div>
        {domains.length > 1 && (
          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <div className="ml-auto text-xs text-slate-500">
          {t(`총 ${visible.length}개 고객사`, `${visible.length} customers`)}
        </div>
      </div>

      {/* 자동 발견 안내 */}
      {isAdmin && unregistered.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-amber-800 font-bold text-sm">
              <Sparkles size={16} className="mr-1.5" />
              {t(`프로젝트·사이트에서 ${unregistered.length}개의 미등록 고객사가 발견됐습니다.`, `${unregistered.length} unregistered customers found in projects/sites.`)}
            </div>
            {onQuickRegister && (
              <button
                onClick={() => onQuickRegister(unregistered)}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded inline-flex items-center"
              >
                <Plus size={12} className="mr-1" />{t('한 번에 등록', 'Register all')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unregistered.slice(0, 10).map(u => (
              <span key={u.name} className="text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded font-bold">
                {u.name}
                <span className="text-amber-500 font-normal ml-1">
                  {u.projects > 0 && `P${u.projects}`}{u.sites > 0 && ` S${u.sites}`}
                </span>
              </span>
            ))}
            {unregistered.length > 10 && (
              <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">+{unregistered.length - 10}</span>
            )}
          </div>
        </div>
      )}

      {/* 고객사 카드 그리드 */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Building2 size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm mb-1">{t('등록된 고객사가 없습니다.', 'No customers yet.')}</p>
          <p className="text-slate-400 text-xs">{t('새 고객사 등록 버튼으로 시작하세요.', 'Click "New Customer" to begin.')}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">{t('검색 결과가 없습니다.', 'No results.')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 size={16} className="text-indigo-600 shrink-0" />
                    <h3 className="text-base font-bold text-slate-800 truncate">{c.name}</h3>
                  </div>
                  {c.domain && <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">{c.domain}</span>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onEditClick(c)} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs" title={t('수정', 'Edit')}><Edit size={12} /></button>
                    <button onClick={() => onDeleteClick(c)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs" title={t('삭제', 'Delete')}><Trash size={12} /></button>
                  </div>
                )}
              </div>

              {/* 본문 — 정보 메타 + 통계 */}
              <div className="p-4 space-y-2">
                {c.phone && <div className="text-xs text-slate-600 flex items-center"><Phone size={11} className="mr-1.5 text-slate-400" />{c.phone}</div>}
                {c.address && <div className="text-xs text-slate-600 flex items-center truncate"><MapPin size={11} className="mr-1.5 text-slate-400 shrink-0" />{c.address}</div>}

                <div className="grid grid-cols-3 gap-1.5 pt-2 mt-2 border-t border-slate-100">
                  <div className="bg-slate-50 rounded p-1.5 text-center" title={t('담당자 명함', 'Contact cards')}>
                    <IdCard size={12} className="mx-auto text-slate-400 mb-0.5" />
                    <div className="text-sm font-bold text-slate-700">{c.contactsCount}</div>
                  </div>
                  <div className="bg-emerald-50 rounded p-1.5 text-center" title={t('연관 사이트', 'Linked sites')}>
                    <Link2 size={12} className="mx-auto text-emerald-500 mb-0.5" />
                    <div className="text-sm font-bold text-emerald-700">{c.linkedSites.length}</div>
                  </div>
                  <div className="bg-blue-50 rounded p-1.5 text-center" title={t('연관 프로젝트', 'Linked projects')}>
                    <Users size={12} className="mx-auto text-blue-500 mb-0.5" />
                    <div className="text-sm font-bold text-blue-700">{c.linkedProjects.length}</div>
                  </div>
                </div>

                {/* 담당자 미리보기 */}
                {c.contactsCount > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('주요 담당자', 'Key Contacts')}</div>
                    <div className="space-y-1">
                      {ensureArr(c.contacts).slice(0, 2).map(ct => (
                        <div key={ct.id} className="text-xs text-slate-700 flex items-baseline gap-1.5">
                          <span className="font-bold">{ct.name}</span>
                          {ct.title && <span className="text-[10px] text-slate-500">{ct.title}</span>}
                          {ct.dept && <span className="text-[10px] text-slate-400">· {ct.dept}</span>}
                        </div>
                      ))}
                      {c.contactsCount > 2 && <div className="text-[10px] text-slate-400">+{c.contactsCount - 2}{t('명', '')}</div>}
                    </div>
                  </div>
                )}

                {/* 연결 안 된 안내 */}
                {c.linkedSites.length === 0 && c.linkedProjects.length === 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400 italic flex items-center">
                    <AlertCircle size={10} className="mr-1" />
                    {t('아직 연관된 사이트/프로젝트가 없습니다.', 'No linked sites/projects yet.')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default CustomerListView;
