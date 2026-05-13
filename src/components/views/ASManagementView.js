import React, { useState, useMemo, useRef, memo } from 'react';
import { LifeBuoy, Filter, User, Calendar, CalendarDays, Building, Wrench, AlertTriangle, CheckCircle, Clock, Download, Search, ExternalLink, Code, MessageSquare, Send, Paperclip, X, ShieldOff, Phone, HardDrive, Package, Loader, Edit, MapPin, Plus, Upload, Mail } from 'lucide-react';
import StatCard from '../common/StatCard';
import SendReportEmailModal from '../modals/SendReportEmailModal';
import { exportToExcel } from '../../utils/export';
import { AS_HW_TYPES, AS_SW_TYPES, AS_HW_STATUSES, AS_SW_STATUSES, AS_DEFAULT_CATEGORY, getASStatusesByCategory, getASTypesByCategory } from '../../constants';

const AS_TYPES = ['전체', ...AS_HW_TYPES, ...AS_SW_TYPES];
// HW/SW 통합 상태: 중복 제거 + 표시 순서 보존
const AS_STATUS_ALL = Array.from(new Set(['전체', ...AS_HW_STATUSES, ...AS_SW_STATUSES]));

const ASManagementView = memo(function ASManagementView({ projects, onProjectClick, onUpdateAS, onAddAS, onAddASComment, onCompleteAS, onRevertCompleteAS, onUploadAttachment, driveConfigured, mailGasUrl, currentUser, t }) {
  const [filterType, setFilterType] = useState('전체');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterPhase, setFilterPhase] = useState('all'); // 'all' | 'open' | 'done' | 'urgent'
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState({}); // key: `${projectId}-${asId}` → text
  const [expanded, setExpanded] = useState({}); // 같은 키, 코멘트 펼침 토글
  const [completeModal, setCompleteModal] = useState(null); // { projectId, asId, file, isNA, uploading }
  const [revertPrompt, setRevertPrompt] = useState(null); // { projectId, asId, reason }
  const [emailTarget, setEmailTarget] = useState(null); // { project, as } — 메일 발송 모달 대상
  const [editingKey, setEditingKey] = useState(null); // 인라인 편집 중인 레코드 키
  const [editDraft, setEditDraft] = useState({}); // 편집 중 값 (manager/contact/serial/part/cost/priority/reqDate/visit)
  const [createModal, setCreateModal] = useState(null); // 통합 페이지 직접 접수 모달
  const lastSeenIdRef = useRef(null); // 신규 접수 알림용 (이번 세션 진입 시점 기준)

  // 모든 프로젝트의 AS 레코드를 평탄화
  const allRecords = useMemo(() => {
    const recs = [];
    (projects || []).forEach(p => {
      (p.asRecords || []).forEach(r => {
        recs.push({
          ...r,
          projectId: p.id,
          projectName: p.name,
          customer: p.customer,
          site: p.site,
          domain: p.domain,
          _project: p
        });
      });
    });
    // 최신순 (id가 timestamp이므로 그걸로 우선 정렬)
    recs.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return recs;
  }, [projects]);

  // 진입 시점 lastSeenId 기록 (이후 등록되는 항목 = NEW)
  if (lastSeenIdRef.current === null) {
    lastSeenIdRef.current = allRecords.length > 0 ? (Number(allRecords[0].id) || 0) : 0;
  }
  const newSinceVisit = useMemo(() => allRecords.filter(r => (Number(r.id) || 0) > lastSeenIdRef.current).length, [allRecords]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return allRecords.filter(r => {
      const cat = r.category || AS_DEFAULT_CATEGORY;
      if (filterCategory !== '전체' && cat !== filterCategory) return false;
      if (filterType !== '전체' && r.type !== filterType) return false;
      if (filterStatus !== '전체' && r.status !== filterStatus) return false;
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterPhase === 'open' && r.status === '완료') return false;
      if (filterPhase === 'done' && r.status !== '완료') return false;
      if (filterPhase === 'urgent' && !(r.priority === '긴급' && r.status !== '완료')) return false;
      if (kw) {
        const fields = [r.projectName, r.customer, r.engineer, r.description, r.resolution, r.manager, r.contact, r.serial, r.part, r.visit];
        if (!fields.some(v => v && String(v).toLowerCase().includes(kw))) return false;
      }
      return true;
    });
  }, [allRecords, filterType, filterStatus, filterProject, filterCategory, filterPhase, search]);

  const stats = useMemo(() => ({
    total: allRecords.length,
    hw: allRecords.filter(r => (r.category || AS_DEFAULT_CATEGORY) === 'HW').length,
    sw: allRecords.filter(r => r.category === 'SW').length,
    open: allRecords.filter(r => r.status !== '완료').length,
    completed: allRecords.filter(r => r.status === '완료').length,
    urgent: allRecords.filter(r => r.priority === '긴급' && r.status !== '완료').length,
  }), [allRecords]);

  // 프로젝트 목록 (AS 레코드가 있는 프로젝트만)
  const projectOptions = useMemo(() => {
    const ids = new Set(allRecords.map(r => r.projectId));
    return (projects || []).filter(p => ids.has(p.id));
  }, [allRecords, projects]);

  const handleExport = () => {
    exportToExcel('AS_통합내역', [{
      name: 'AS 내역',
      rows: filtered.map(r => ({
        date: r.date, projectName: r.projectName, customer: r.customer, site: r.site,
        category: r.category || AS_DEFAULT_CATEGORY,
        type: r.type, status: r.status, priority: r.priority || '보통',
        engineer: r.engineer, manager: r.manager || '', contact: r.contact || '', serial: r.serial || '',
        reqDate: r.reqDate || '', visit: r.visit || '',
        part: r.part || '', cost: r.cost || '',
        description: r.description, resolution: r.resolution || '-',
        comments: Array.isArray(r.comments) ? r.comments.length : 0,
        completedAt: r.status === '완료' && r.report ? r.report.completedAt || '' : '',
        reportFile: r.status === '완료' && r.report ? (r.report.naReason ? 'N/A' : r.report.fileName || '-') : '-'
      })),
      columns: [
        { header: '일자', key: 'date' }, { header: '프로젝트', key: 'projectName' }, { header: '고객사', key: 'customer' },
        { header: '사이트', key: 'site' }, { header: '분류', key: 'category' }, { header: 'AS 유형', key: 'type' },
        { header: '상태', key: 'status' }, { header: '중요도', key: 'priority' }, { header: '담당 엔지니어', key: 'engineer' },
        { header: '고객사 담당자', key: 'manager' }, { header: '연락처', key: 'contact' }, { header: '시리얼', key: 'serial' },
        { header: '희망일', key: 'reqDate' }, { header: '방문필요사항', key: 'visit' },
        { header: '사용 부품', key: 'part' }, { header: '금액', key: 'cost' },
        { header: '증상/요청', key: 'description' }, { header: '조치 내용', key: 'resolution' },
        { header: '코멘트 수', key: 'comments' }, { header: '완료일', key: 'completedAt' }, { header: '보고서', key: 'reportFile' }
      ]
    }]);
  };

  const typeColor = (type, category) => {
    switch (type) {
      case '긴급출동': return 'bg-red-100 text-red-700 border-red-200';
      case '정기점검': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '부품교체': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '보증수리': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case '불량수리': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return category === 'SW' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  const statusColor = (status) => {
    switch (status) {
      case '완료': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '출동': case '조치': return 'bg-blue-50 text-blue-700 border-blue-200';
      case '분석': case '개발': return 'bg-violet-50 text-violet-700 border-violet-200';
      case '적용': case '검증': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };
  const catBadge = (cat) => cat === 'SW' ? 'bg-cyan-600 text-white' : 'bg-indigo-600 text-white';

  const recordKey = (r) => `${r.projectId}-${r.id}`;

  const submitReply = (r) => {
    const key = recordKey(r);
    const txt = (replyText[key] || '').trim();
    if (!txt || !onAddASComment) return;
    onAddASComment(r.projectId, r.id, txt);
    setReplyText({ ...replyText, [key]: '' });
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <LifeBuoy className="mr-2 text-purple-500" size={24} />
            {t('AS 통합 관리', 'AS Management')}
            {newSinceVisit > 0 && (
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white inline-flex items-center" title={t('진입 후 새로 접수된 건', 'New since you opened')}>
                NEW {newSinceVisit}
              </span>
            )}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{t('전체 프로젝트의 AS(애프터서비스) 내역을 한 곳에서 관리합니다.', 'Manage after-sales service records across all projects.')}</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role !== 'CUSTOMER' && onAddAS && (
            <button onClick={() => setCreateModal({ projectId: '', category: 'HW', type: AS_HW_TYPES[0], engineer: currentUser.name || '', description: '', resolution: '', priority: '보통', manager: '', contact: '', serial: '', part: '', cost: '', reqDate: '', visit: '', files: [], uploading: false, error: '' })} className="flex items-center bg-purple-600 text-white border border-purple-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm">
              <Plus size={16} className="mr-1.5" /> {t('새 AS 접수', 'New AS')}
            </button>
          )}
          <button onClick={handleExport} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm">
            <Download size={16} className="mr-2" /> {t('AS 내역 Excel', 'AS Excel')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title={t('전체 AS', 'Total')} value={stats.total} icon={<LifeBuoy size={22} className="text-purple-500" />} />
        <StatCard title={t('HW (현장)', 'HW')} value={stats.hw} icon={<Wrench size={22} className="text-indigo-500" />} color={stats.hw > 0 ? 'border-indigo-200 bg-indigo-50' : ''} />
        <StatCard title={t('SW (원격)', 'SW')} value={stats.sw} icon={<Code size={22} className="text-cyan-500" />} color={stats.sw > 0 ? 'border-cyan-200 bg-cyan-50' : ''} />
        <StatCard title={t('처리 중', 'Open')} value={stats.open} icon={<Clock size={22} className="text-amber-500" />} color={stats.open > 0 ? 'border-amber-200 bg-amber-50' : ''} />
        <StatCard title={t('완료', 'Done')} value={stats.completed} icon={<CheckCircle size={22} className="text-emerald-500" />} />
        <StatCard title={t('미완료 긴급', 'Urgent Open')} value={stats.urgent} icon={<AlertTriangle size={22} className="text-red-500" />} color={stats.urgent > 0 ? 'border-red-200 bg-red-50' : ''} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 space-y-3">
          {/* 1행: 검색 + 분류 토글 + 프로젝트/유형/상세상태 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]">
              <Search size={16} className="text-slate-400 mr-2" />
              <input className="bg-transparent outline-none text-sm w-full" placeholder={t('프로젝트/고객사/엔지니어/증상/시리얼/담당자/부품 검색', 'Search projects, customers, engineers, symptoms, serial, manager, parts')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* 분류 토글 — HW/SW/전체 */}
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              {['전체', 'HW', 'SW'].map(c => {
                const active = filterCategory === c;
                const activeCls = c === 'HW' ? 'bg-indigo-600 text-white' : c === 'SW' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-white';
                return (
                  <button key={c} type="button" onClick={() => setFilterCategory(c)} className={`text-xs font-bold px-3 py-1.5 transition-colors ${active ? activeCls : 'text-slate-500 hover:bg-slate-50'}`}>{c}</button>
                );
              })}
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
              <Filter size={14} className="text-slate-400 mr-1" />
              <select className="text-sm bg-transparent outline-none" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                <option value="all">{t('전체 프로젝트', 'All Projects')}</option>
                {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
              <select className="text-sm bg-transparent outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                {AS_TYPES.map(ty => <option key={ty} value={ty}>{ty === '전체' ? '전체 유형' : ty}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
              <select className="text-sm bg-transparent outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                {AS_STATUS_ALL.map(s => <option key={s} value={s}>{s === '전체' ? '전체 상태' : s}</option>)}
              </select>
            </div>
          </div>

          {/* 2행: 상태 단계 칩 (V3 처리중/완료 컨셉) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1">{t('단계', 'Phase')}</span>
            <button type="button" onClick={() => setFilterPhase('all')} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${filterPhase === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')} {stats.total}</button>
            <button type="button" onClick={() => setFilterPhase('open')} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors inline-flex items-center ${filterPhase === 'open' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}><Clock size={10} className="mr-1" />{t('처리중', 'Open')} {stats.open}</button>
            <button type="button" onClick={() => setFilterPhase('done')} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors inline-flex items-center ${filterPhase === 'done' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}><CheckCircle size={10} className="mr-1" />{t('완료', 'Done')} {stats.completed}</button>
            <button type="button" onClick={() => setFilterPhase('urgent')} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors inline-flex items-center ${filterPhase === 'urgent' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}><AlertTriangle size={10} className="mr-1" />{t('미완료 긴급', 'Urgent Open')} {stats.urgent}</button>
            <span className="ml-auto text-[11px] text-slate-400">{t(`총 ${filtered.length}건 표시`, `${filtered.length} shown`)}</span>
          </div>
        </div>

        {/* 리스트 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <LifeBuoy size={32} className="mx-auto mb-3 text-slate-300" />
            {allRecords.length === 0 ? t('등록된 AS 내역이 없습니다.', 'No AS records.') : t('필터 조건에 해당하는 AS가 없습니다.', 'No AS matching the filter.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
            {filtered.map(r => {
              const cat = r.category || AS_DEFAULT_CATEGORY;
              const statuses = getASStatusesByCategory(cat);
              const isHW = cat === 'HW';
              const key = recordKey(r);
              const comments = Array.isArray(r.comments) ? r.comments : [];
              const isExpanded = !!expanded[key];
              const isNewSinceVisit = (Number(r.id) || 0) > lastSeenIdRef.current;
              const files = Array.isArray(r.files) ? r.files : [];
              return (
              <div key={key} className={`bg-white rounded-xl border shadow-sm hover:shadow-md p-4 transition-all ${r.priority === '긴급' && r.status !== '완료' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                      {isNewSinceVisit && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500 text-white">NEW</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${catBadge(cat)} inline-flex items-center`}>
                        {isHW ? <Wrench size={9} className="mr-1" /> : <HardDrive size={9} className="mr-1" />}{cat}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor(r.type, cat)}`}>{r.type}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor(r.status)}`}>{r.status}</span>
                      {r.priority === '긴급' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 inline-flex items-center"><AlertTriangle size={9} className="mr-0.5" />{t('긴급', 'Urgent')}</span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-1 flex items-center"><Calendar size={10} className="mr-1" />{r.date}</span>
                    </div>
                    <button onClick={() => onProjectClick && onProjectClick(r.projectId, 'as')} className="text-base font-bold text-slate-800 hover:text-purple-600 transition-colors flex items-center group">
                      <span className="truncate">{r.projectName}</span><ExternalLink size={12} className="ml-1 shrink-0 opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center"><Building size={11} className="mr-1" />{r.customer}</span>
                      {r.site && <span>· {r.site}</span>}
                      <span className="flex items-center"><User size={11} className="mr-1" />{r.engineer}</span>
                    </div>

                    {/* V3 메타 칩 — 인라인 편집 모드 / 표시 모드 분기 */}
                    {editingKey === key ? (
                      <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg ring-2 ring-amber-100">
                        <div className="text-[11px] font-bold text-amber-800 mb-2 flex items-center"><Edit size={12} className="mr-1" />{t('정보 수정 — 증상/조치/파일까지 모두 수정', 'Edit — symptoms / resolution / files')}</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('중요도', 'Priority')}</label>
                            <select className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.priority || '보통'} onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value })}>
                              <option value="보통">{t('보통', 'Normal')}</option>
                              <option value="긴급">{t('긴급', 'Urgent')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('고객사 담당자', 'Manager')}</label>
                            <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.manager || ''} onChange={(e) => setEditDraft({ ...editDraft, manager: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('연락처', 'Contact')}</label>
                            <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.contact || ''} onChange={(e) => setEditDraft({ ...editDraft, contact: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('시리얼', 'Serial')}</label>
                            <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono" value={editDraft.serial || ''} onChange={(e) => setEditDraft({ ...editDraft, serial: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('희망일', 'Desired')}</label>
                            <input type="date" max="9999-12-31" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.reqDate || ''} onChange={(e) => setEditDraft({ ...editDraft, reqDate: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('방문 필요사항', 'Visit')}</label>
                            <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.visit || ''} onChange={(e) => setEditDraft({ ...editDraft, visit: e.target.value })} />
                          </div>
                          {isHW && (
                            <>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('사용 부품', 'Parts')}</label>
                                <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.part || ''} onChange={(e) => setEditDraft({ ...editDraft, part: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('금액', 'Cost')}</label>
                                <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editDraft.cost || ''} onChange={(e) => setEditDraft({ ...editDraft, cost: e.target.value })} />
                              </div>
                            </>
                          )}
                        </div>

                        {/* 증상/조치 textarea — Ctrl+V 이미지 paste 지원 */}
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{isHW ? t('증상', 'Symptoms') : t('증상 / 요청', 'Symptoms / Request')}</label>
                            <textarea
                              rows="4"
                              className="w-full text-xs p-2 border border-slate-300 rounded"
                              value={editDraft.description || ''}
                              onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                              onPaste={(e) => {
                                const items = e.clipboardData && e.clipboardData.items;
                                if (!items) return;
                                const imgs = [];
                                for (let i = 0; i < items.length; i++) {
                                  const it = items[i];
                                  if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
                                    const blob = it.getAsFile();
                                    if (blob) {
                                      const ext = (it.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                                      imgs.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: it.type }));
                                    }
                                  }
                                }
                                if (imgs.length > 0) { e.preventDefault(); setEditDraft({ ...editDraft, newFiles: [...(editDraft.newFiles || []), ...imgs] }); }
                              }}
                              placeholder={t('Ctrl+V로 캡처 첨부', 'Ctrl+V to paste image')}
                            ></textarea>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{isHW ? t('조치 내용', 'Resolution') : t('분석 / 조치', 'Analysis / Resolution')}</label>
                            <textarea rows="4" className="w-full text-xs p-2 border border-slate-300 rounded" value={editDraft.resolution || ''} onChange={(e) => setEditDraft({ ...editDraft, resolution: e.target.value })}></textarea>
                          </div>
                        </div>

                        {/* 기존 첨부 — 제거 가능 */}
                        {(editDraft.keepFiles || []).length > 0 && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('기존 첨부 — 제거하려면 ×', 'Existing files — × to remove')}</label>
                            <div className="space-y-1">
                              {(editDraft.keepFiles || []).map((f, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1.5">
                                  <Paperclip size={11} className="text-slate-500 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-800 flex-1 truncate">{f.fileName}</span>
                                  <button type="button" onClick={() => setEditDraft({ ...editDraft, keepFiles: (editDraft.keepFiles || []).filter((_, i) => i !== fIdx) })} className="text-slate-400 hover:text-red-600 p-0.5" title={t('제거', 'Remove')}><X size={11} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 새 첨부 추가 */}
                        {(editDraft.newFiles || []).length > 0 && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-amber-700 mb-1">{t('새로 추가될 파일', 'Files to add')}</label>
                            <div className="space-y-1">
                              {(editDraft.newFiles || []).map((f, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-1.5">
                                  <Paperclip size={11} className="text-amber-600 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-800 flex-1 truncate">{f.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                                  <button type="button" onClick={() => setEditDraft({ ...editDraft, newFiles: (editDraft.newFiles || []).filter((_, i) => i !== fIdx) })} className="text-slate-400 hover:text-red-600 p-0.5"><X size={11} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <label className="block mt-2 border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/40 rounded p-2 text-center cursor-pointer transition-colors">
                          <input type="file" multiple accept="image/*,.pdf,.txt,.log,.json,.zip,.xlsx,.xls,.docx,.doc,.pptx,.ppt" className="hidden" disabled={!driveConfigured} onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setEditDraft({ ...editDraft, newFiles: [...(editDraft.newFiles || []), ...fs] }); e.target.value = ''; }} />
                          <Upload size={14} className="mx-auto mb-0.5 text-amber-600" />
                          <div className="text-[11px] font-bold text-amber-800">{driveConfigured ? t('파일 추가 (클릭 또는 Ctrl+V)', 'Add files (click or Ctrl+V)') : t('Drive 미연동', 'Drive not configured')}</div>
                        </label>

                        {editDraft.saving && (
                          <div className="mt-2 text-[11px] font-bold text-purple-700 flex items-center"><Loader size={11} className="animate-spin mr-1" />{t('저장 중...', 'Saving...')}</div>
                        )}
                        {editDraft.error && (
                          <div className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5 flex items-center"><AlertTriangle size={11} className="mr-1" />{editDraft.error}</div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" disabled={editDraft.saving} onClick={async () => {
                            setEditDraft({ ...editDraft, saving: true, error: '' });
                            try {
                              // 새 파일 업로드 → 메타 생성
                              const newMetas = [];
                              const newFiles = editDraft.newFiles || [];
                              for (let i = 0; i < newFiles.length; i++) {
                                const meta = await onUploadAttachment(r.projectId, newFiles[i], null, 'AS');
                                if (!meta) {
                                  setEditDraft(prev => ({ ...prev, saving: false, error: t('파일 업로드 실패', 'Upload failed') }));
                                  return;
                                }
                                newMetas.push({ fileId: meta.fileId, fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size, viewUrl: meta.viewUrl, downloadUrl: meta.downloadUrl });
                              }
                              const finalFiles = [...(editDraft.keepFiles || []), ...newMetas];
                              onUpdateAS(r.projectId, r.id, {
                                priority: editDraft.priority,
                                manager: editDraft.manager, contact: editDraft.contact, serial: editDraft.serial,
                                reqDate: editDraft.reqDate, visit: editDraft.visit,
                                part: editDraft.part, cost: editDraft.cost,
                                description: editDraft.description || '',
                                resolution: editDraft.resolution || '',
                                files: finalFiles
                              });
                              setEditingKey(null);
                              setEditDraft({});
                            } catch (e) {
                              setEditDraft(prev => ({ ...prev, saving: false, error: e?.message || t('저장 실패', 'Save failed') }));
                            }
                          }} className="px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white inline-flex items-center">
                            <CheckCircle size={11} className="mr-1" />{t('저장', 'Save')}
                          </button>
                          <button type="button" disabled={editDraft.saving} onClick={() => { setEditingKey(null); setEditDraft({}); }} className="px-3 py-1.5 text-[11px] font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* V3 메타 칩 — 담당자/연락처/시리얼/희망일/방문/부품/금액 — 값 있을 때만 */}
                        {(r.manager || r.contact || r.serial || r.reqDate || r.visit || r.part || r.cost) ? (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                            {r.manager && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><User size={10} className="mr-1" />{r.manager}</span>}
                            {r.contact && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><Phone size={10} className="mr-1" />{r.contact}</span>}
                            {r.serial && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold font-mono"><HardDrive size={10} className="mr-1" />{r.serial}</span>}
                            {r.reqDate && <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold"><CalendarDays size={10} className="mr-1" />{r.reqDate}</span>}
                            {r.visit && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><MapPin size={10} className="mr-1" />{r.visit}</span>}
                            {r.part && <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold"><Package size={10} className="mr-1" />{r.part}</span>}
                            {r.cost && <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">₩ {r.cost}</span>}
                            {currentUser.role !== 'CUSTOMER' && r.status !== '완료' && (
                              <button type="button" onClick={() => { setEditingKey(key); setEditDraft({ priority: r.priority || '보통', manager: r.manager || '', contact: r.contact || '', serial: r.serial || '', reqDate: r.reqDate || '', visit: r.visit || '', part: r.part || '', cost: r.cost || '', description: r.description || '', resolution: r.resolution || '', keepFiles: [...(r.files || [])], newFiles: [], saving: false, error: '' }); }} className="inline-flex items-center px-2 py-0.5 rounded text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold">
                                <Edit size={10} className="mr-1" />{t('정보 수정', 'Edit')}
                              </button>
                            )}
                          </div>
                        ) : (
                          currentUser.role !== 'CUSTOMER' && r.status !== '완료' && (
                            <div className="mt-2">
                              <button type="button" onClick={() => { setEditingKey(key); setEditDraft({ priority: r.priority || '보통', manager: '', contact: '', serial: '', reqDate: '', visit: '', part: '', cost: '' }); }} className="text-[11px] inline-flex items-center px-2 py-0.5 rounded text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold">
                                <Edit size={10} className="mr-1" />{t('정보 수정 (담당자/연락처/시리얼/희망일 등)', 'Edit info')}
                              </button>
                            </div>
                          )
                        )}
                      </>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                        <div className="text-[10px] font-bold text-slate-500 mb-1">{t('증상 / 요청', 'Symptoms / Request')}</div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{r.description}</p>
                      </div>
                      <div className={`rounded-lg p-2.5 border ${r.resolution ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-[10px] font-bold mb-1 ${r.resolution ? 'text-emerald-600' : 'text-slate-500'}`}>{t('조치 내용', 'Resolution')}</div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{r.resolution || t('(미작성)', '(Not filled)')}</p>
                      </div>
                    </div>

                    {/* 파일 첨부 표시 — 간결한 칩 */}
                    {files.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {files.slice(0, 4).map((f, fIdx) => (
                          <a key={fIdx} href={f.viewUrl || f.downloadUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-bold transition-colors ${isHW ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`} title={f.fileName}>
                            <Paperclip size={10} /><span className="max-w-[160px] truncate">{f.fileName}</span>
                          </a>
                        ))}
                        {files.length > 4 && <span className="text-[10px] text-slate-500 font-bold">+{files.length - 4}</span>}
                      </div>
                    )}

                    {/* 완료 보고서 */}
                    {r.status === '완료' && r.report && (
                      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-[11px]">
                        <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 font-bold">{t('완료 보고서:', 'Report:')}</span>
                        {r.report.naReason ? (
                          <span className="text-emerald-800">{t('N/A', 'N/A')}{r.report.naReason !== 'N/A' && ` — ${r.report.naReason}`}</span>
                        ) : (
                          <>
                            <span className="text-emerald-900 font-bold truncate flex-1">{r.report.fileName}</span>
                            {r.report.viewUrl && <a href={r.report.viewUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded hover:bg-emerald-100"><ExternalLink size={11} /></a>}
                            {r.report.downloadUrl && <a href={r.report.downloadUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded hover:bg-emerald-100"><Download size={11} /></a>}
                          </>
                        )}
                        {r.report.completedAt && <span className="ml-auto text-emerald-600 text-[10px]">{r.report.completedAt}</span>}
                      </div>
                    )}

                    {/* 메일 송부 버튼 — AS 보고서 */}
                    {currentUser.role !== 'CUSTOMER' && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setEmailTarget({ project: r._project, as: r })}
                          className="text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 inline-flex items-center transition-colors"
                          title={t('이 AS 보고서를 메일로 송부', 'Send this AS report by email')}
                        >
                          <Mail size={10} className="mr-1" />{t('메일 송부', 'Send Email')}
                        </button>
                      </div>
                    )}

                    {/* 코멘트 펼침 토글 + 답글 */}
                    {(comments.length > 0 || (currentUser.role !== 'CUSTOMER' && r.status !== '완료')) && (
                      <div className="mt-3">
                        {comments.length > 0 && (
                          <button type="button" onClick={() => setExpanded({ ...expanded, [key]: !isExpanded })} className="inline-flex items-center text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors mb-1.5">
                            <MessageSquare size={11} className="mr-1" />
                            {t(`처리 이력 ${comments.length}건`, `${comments.length} comment${comments.length > 1 ? 's' : ''}`)}
                            <span className="ml-1 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        )}
                        {isExpanded && comments.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {comments.map(c => (
                              <div key={c.id} className="border-l-2 border-purple-300 bg-purple-50 rounded-r-md px-2 py-1.5">
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5"><strong className="text-slate-700">{c.author}</strong><span>·</span><span>{c.time}</span></div>
                                <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {currentUser.role !== 'CUSTOMER' && r.status !== '완료' && onAddASComment && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={replyText[key] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [key]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') submitReply(r); }}
                              placeholder={t('처리 내용 답글 (Enter)', 'Reply (Enter)')}
                              className="flex-1 text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => submitReply(r)}
                              disabled={!(replyText[key] || '').trim()}
                              className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-[11px] font-bold rounded inline-flex items-center"
                            >
                              <Send size={10} className="mr-1" />{t('답글', 'Reply')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* 우측 상태 컨트롤 (원복) */}
                  {currentUser.role !== 'CUSTOMER' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {statuses.map(s => (
                        <button key={s} onClick={() => {
                          if (s === '완료' && r.status !== '완료' && onCompleteAS) {
                            setCompleteModal({ projectId: r.projectId, asId: r.id, file: null, isNA: false, uploading: false });
                            return;
                          }
                          onUpdateAS(r.projectId, r.id, { status: s });
                        }} className={`text-[10px] px-3 py-1 rounded font-bold border transition-colors ${r.status === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                      ))}
                      {r.status === '완료' && onRevertCompleteAS && (currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => setRevertPrompt({ projectId: r.projectId, asId: r.id, reason: '' })} className="mt-1 text-[10px] px-2 py-1 rounded font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors inline-flex items-center justify-center">
                          <ShieldOff size={10} className="mr-1" />{t('완료 취소', 'Revert')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 완료 처리 모달 */}
      {completeModal && (() => {
        const m = completeModal;
        const close = () => setCompleteModal(null);
        const submit = async () => {
          if (!m.isNA && !m.file) return;
          setCompleteModal({ ...m, uploading: true });
          try {
            await onCompleteAS(m.projectId, m.asId, { isNA: m.isNA, file: m.file, onProgress: () => {} });
            setCompleteModal(null);
          } catch (e) {
            setCompleteModal({ ...m, uploading: false });
          }
        };
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={close}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[440px] max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-purple-700 flex items-center"><CheckCircle size={16} className="mr-2" />{t('완료 처리 — 보고서 첨부', 'Complete — Attach Report')}</h3>
                <button onClick={close} disabled={m.uploading} className="text-slate-400 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-xs text-slate-600 leading-relaxed">{t('완료 처리 시 보고서(작업 결과서 / 점검 보고서 / 패치 노트 등)를 첨부하거나 N/A를 명시해야 합니다.', 'Attach a report or mark N/A.')}</div>
                <input
                  type="file"
                  disabled={m.isNA || m.uploading}
                  onChange={(e) => setCompleteModal({ ...m, file: e.target.files && e.target.files[0] ? e.target.files[0] : null })}
                  className="block w-full text-xs p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-600 file:text-white file:font-bold file:text-[11px] disabled:opacity-50"
                />
                {m.file && !m.isNA && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 truncate"><Paperclip size={11} className="inline mr-1 text-purple-600" />{m.file.name}</div>
                )}
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                  <input type="checkbox" checked={m.isNA} onChange={(e) => setCompleteModal({ ...m, isNA: e.target.checked, file: e.target.checked ? null : m.file })} className="accent-red-600" disabled={m.uploading} />
                  {t('보고서 제출 N/A (불필요)', 'N/A — No report needed')}
                </label>
                {m.uploading && (
                  <div className="text-xs font-bold text-purple-700 flex items-center"><Loader size={12} className="animate-spin mr-1.5" />{t('업로드 중...', 'Uploading...')}</div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={close} disabled={m.uploading} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
                <button type="button" onClick={submit} disabled={m.uploading || (!m.isNA && !m.file)} className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center disabled:bg-slate-300"><CheckCircle size={12} className="mr-1" />{t('완료 확정', 'Confirm')}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 통합 페이지에서 직접 신규 AS 접수 */}
      {createModal && (() => {
        const m = createModal;
        const close = () => setCreateModal(null);
        const isHW = m.category === 'HW';
        const themeBtn = isHW ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-cyan-600 hover:bg-cyan-700';
        const submit = async () => {
          if (!m.projectId) { setCreateModal({ ...m, error: t('프로젝트를 선택하세요.', 'Select a project.') }); return; }
          if (!m.description.trim() || !m.engineer.trim()) { setCreateModal({ ...m, error: t('증상과 담당자를 입력하세요.', 'Symptoms and engineer required.') }); return; }
          if (m.files.length > 0 && !driveConfigured) { setCreateModal({ ...m, error: t('Drive 미연동 — 파일 첨부 불가', 'Drive not configured.') }); return; }
          setCreateModal({ ...m, uploading: true, error: '' });
          try {
            await onAddAS(m.projectId, { category: m.category, type: m.type, engineer: m.engineer, description: m.description, resolution: m.resolution, priority: m.priority, manager: m.manager, contact: m.contact, serial: m.serial, part: m.part, cost: m.cost, reqDate: m.reqDate, visit: m.visit, files: m.files, onProgress: () => {} });
            close();
          } catch (e) {
            setCreateModal({ ...m, uploading: false, error: e?.message || t('접수 실패', 'Save failed') });
          }
        };
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={close}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-black text-purple-700 flex items-center"><Plus size={18} className="mr-2" />{t('새 AS 접수 (통합 페이지)', 'New AS (Integrated)')}</h3>
                <button onClick={close} disabled={m.uploading} className="text-slate-400 hover:text-slate-700 disabled:opacity-50"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {/* 프로젝트 선택 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('프로젝트 *', 'Project *')}</label>
                  <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.projectId} onChange={(e) => setCreateModal({ ...m, projectId: e.target.value })}>
                    <option value="">{t('— 선택하세요 —', '— Select —')}</option>
                    {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.customer})</option>)}
                  </select>
                </div>
                {/* 분류 + 유형 + 중요도 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('분류', 'Category')}</label>
                    <div className="flex bg-slate-100 rounded p-0.5 border border-slate-200">
                      <button type="button" onClick={() => setCreateModal({ ...m, category: 'HW', type: AS_HW_TYPES[0] })} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors ${isHW ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>HW</button>
                      <button type="button" onClick={() => setCreateModal({ ...m, category: 'SW', type: AS_SW_TYPES[0] })} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors ${!isHW ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>SW</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('유형', 'Type')}</label>
                    <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.type} onChange={(e) => setCreateModal({ ...m, type: e.target.value })}>
                      {getASTypesByCategory(m.category).map(ty => <option key={ty} value={ty}>{ty}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('중요도', 'Priority')}</label>
                    <select className={`w-full text-sm p-2 border rounded-lg font-bold ${m.priority === '긴급' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`} value={m.priority} onChange={(e) => setCreateModal({ ...m, priority: e.target.value })}>
                      <option value="보통">{t('보통', 'Normal')}</option>
                      <option value="긴급">{t('긴급', 'Urgent')}</option>
                    </select>
                  </div>
                </div>
                {/* 담당 + 고객사 담당자 + 연락처 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{isHW ? t('담당 엔지니어 *', 'Engineer *') : t('담당자 *', 'Owner *')}</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.engineer} onChange={(e) => setCreateModal({ ...m, engineer: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('고객사 담당자', 'Customer Manager')}</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.manager} onChange={(e) => setCreateModal({ ...m, manager: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('연락처', 'Contact')}</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.contact} onChange={(e) => setCreateModal({ ...m, contact: e.target.value })} placeholder="010-0000-0000" />
                  </div>
                </div>
                {/* 시리얼 + 희망일 + 방문 (HW only for 희망일/방문) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('장비 시리얼', 'Serial')}</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg font-mono" value={m.serial} onChange={(e) => setCreateModal({ ...m, serial: e.target.value })} placeholder={t('예: SN-12345', 'e.g. SN-12345')} />
                  </div>
                  {isHW && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('희망 처리일정', 'Desired Date')}</label>
                        <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.reqDate} onChange={(e) => setCreateModal({ ...m, reqDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('방문 필요사항', 'Visit Req.')}</label>
                        <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.visit} onChange={(e) => setCreateModal({ ...m, visit: e.target.value })} placeholder={t('보안/출입증 등', 'Safety/Pass')} />
                      </div>
                    </>
                  )}
                </div>
                {/* 증상 (Ctrl+V 지원) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('증상 / 요청 내용 * (이미지 Ctrl+V 지원)', 'Symptoms / Request * (Ctrl+V for image)')}</label>
                  <textarea
                    rows="4"
                    className="w-full text-sm p-2 border border-slate-300 rounded-lg"
                    value={m.description}
                    onChange={(e) => setCreateModal({ ...m, description: e.target.value })}
                    onPaste={(e) => {
                      const items = e.clipboardData && e.clipboardData.items;
                      if (!items) return;
                      const imgs = [];
                      for (let i = 0; i < items.length; i++) {
                        const it = items[i];
                        if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
                          const blob = it.getAsFile();
                          if (blob) {
                            const ext = (it.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                            imgs.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: it.type }));
                          }
                        }
                      }
                      if (imgs.length > 0) { e.preventDefault(); setCreateModal({ ...m, files: [...m.files, ...imgs] }); }
                    }}
                    placeholder={t('증상 설명. 캡처는 Ctrl+V', 'Describe symptoms. Ctrl+V to paste image.')}
                  ></textarea>
                </div>
                {/* 조치 (선택) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isHW ? t('조치 내용 (선택)', 'Resolution (Optional)') : t('분석 / 조치 (선택)', 'Analysis / Resolution')}</label>
                  <textarea rows="3" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.resolution} onChange={(e) => setCreateModal({ ...m, resolution: e.target.value })}></textarea>
                </div>
                {/* HW만 부품/금액 */}
                {isHW && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('사용 부품 (선택)', 'Parts')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.part} onChange={(e) => setCreateModal({ ...m, part: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('금액 (선택)', 'Cost')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.cost} onChange={(e) => setCreateModal({ ...m, cost: e.target.value })} />
                    </div>
                  </div>
                )}
                {/* 첨부 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('첨부 파일 (선택, 다중)', 'Attachments (optional)')}</label>
                  {m.files.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {m.files.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-1.5">
                          <Paperclip size={11} className="text-purple-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 flex-1 truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                          <button type="button" onClick={() => setCreateModal({ ...m, files: m.files.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-red-600 p-0.5"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="block border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50/40 rounded-lg p-3 text-center cursor-pointer transition-colors">
                    <input type="file" multiple accept="image/*,.pdf,.txt,.log,.json,.zip,.xlsx,.xls,.docx,.doc,.pptx,.ppt" className="hidden" disabled={!driveConfigured} onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setCreateModal({ ...m, files: [...m.files, ...fs] }); e.target.value = ''; }} />
                    <Upload size={16} className="mx-auto mb-1 text-purple-500" />
                    <div className="text-xs font-bold text-slate-600">{driveConfigured ? t('클릭하여 파일 첨부', 'Click to attach') : t('Drive 미연동 — 첨부 불가', 'Drive not configured')}</div>
                  </label>
                </div>
                {m.error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2 flex items-center"><AlertTriangle size={11} className="mr-1.5" />{m.error}</div>
                )}
                {m.uploading && (
                  <div className="text-xs font-bold text-purple-700 flex items-center"><Loader size={11} className="animate-spin mr-1.5" />{t('접수 중...', 'Saving...')}</div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={close} disabled={m.uploading} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
                <button type="button" onClick={submit} disabled={m.uploading} className={`px-4 py-1.5 text-xs font-bold rounded text-white inline-flex items-center disabled:bg-slate-300 ${themeBtn}`}><Plus size={11} className="mr-1" />{t('접수 등록', 'Submit')}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 완료 취소 사유 입력 모달 */}
      {revertPrompt && (() => {
        const r = revertPrompt;
        const close = () => setRevertPrompt(null);
        const submit = () => {
          if (!r.reason.trim()) return;
          onRevertCompleteAS(r.projectId, r.asId, r.reason);
          setRevertPrompt(null);
        };
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={close}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[420px] max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-red-700 flex items-center"><ShieldOff size={16} className="mr-2" />{t('완료 취소 — 사유 입력', 'Revert — Reason')}</h3>
                <button onClick={close} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-xs text-slate-600">{t('완료 상태를 직전 단계로 되돌립니다. 사유는 처리 이력에 기록됩니다.', 'Revert to previous step. Reason will be logged.')}</div>
                <textarea rows="3" autoFocus value={r.reason} onChange={(e) => setRevertPrompt({ ...r, reason: e.target.value })} placeholder={t('예: 고객 추가 확인 필요 / 재발 발견', 'e.g. Customer requested re-check / regression')} className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500"></textarea>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={close} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50">{t('취소', 'Cancel')}</button>
                <button type="button" onClick={submit} disabled={!r.reason.trim()} className="px-3 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-700 text-white inline-flex items-center disabled:bg-slate-300"><ShieldOff size={12} className="mr-1" />{t('취소 확정', 'Confirm')}</button>
              </div>
            </div>
          </div>
        );
      })()}
      {emailTarget && (
        <SendReportEmailModal
          kind="as_report"
          project={emailTarget.project}
          as={emailTarget.as}
          defaultTo={[]}
          defaultCc={[]}
          author={currentUser?.name || ''}
          authorEmail={currentUser?.email || ''}
          mailGasUrl={mailGasUrl}
          onClose={() => setEmailTarget(null)}
          onSent={() => { setEmailTarget(null); }}
          t={t}
        />
      )}
    </div>
  );
});

export default ASManagementView;
