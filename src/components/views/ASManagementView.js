import React, { useState, useMemo, useRef, memo } from 'react';
import { LifeBuoy, Filter, User, Calendar, CalendarDays, Building, Wrench, AlertTriangle, CheckCircle, Clock, Download, Search, ExternalLink, Code, MessageSquare, Send, Paperclip, X, ShieldOff, Phone, HardDrive, Package, Loader, Edit, MapPin, Plus, Upload, Mail } from 'lucide-react';
import StatCard from '../common/StatCard';
import SendReportEmailModal from '../modals/SendReportEmailModal';
import { exportToExcel } from '../../utils/export';
import { parseASWorkbook, mapLegacyASRows, findProjectIdByCode, collectLegacyIds } from '../../utils/asImport';
import { AS_HW_TYPES, AS_SW_TYPES, AS_HW_STATUSES, AS_SW_STATUSES, AS_DEFAULT_CATEGORY, getASStatusesByCategory, getASTypesByCategory, getASResolutionTypesByCategory, AS_BILLING_OPTIONS } from '../../constants';

const AS_TYPES = ['전체', ...AS_HW_TYPES, ...AS_SW_TYPES];
// HW/SW 통합 상태: 중복 제거 + 표시 순서 보존
const AS_STATUS_ALL = Array.from(new Set(['전체', ...AS_HW_STATUSES, ...AS_SW_STATUSES]));

// 완료된 건은 완료연도, 그 외 접수연도(YYYY) 기준
const asRecordYear = (r) => {
  const s = (r && r.report && r.report.completedAt) || (r && r.date) || '';
  const mt = String(s).match(/(\d{4})/);
  return mt ? mt[1] : '';
};

const ASManagementView = memo(function ASManagementView({ projects, engineers, users, customers, onProjectClick, onUpdateAS, onAddAS, onAddASComment, onCompleteAS, onRevertCompleteAS, onUploadAttachment, onArchiveASYear, onUnarchiveASYear, onImportAS, onRelinkAS, onCreateProjectFromAS, onRequestEditProject, driveConfigured, mailGasUrl, currentUser, t }) {
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
  const [filterYear, setFilterYear] = useState(''); // '' = 현재 진행중(미마감), 'YYYY' = 해당 연도 마감 보관분
  const [searchAll, setSearchAll] = useState(false); // 통합검색 — 연도/마감 무시 전체 검색
  const [importModal, setImportModal] = useState(null); // { stage, fileName, items, counts, error, busy }
  const [relinkModal, setRelinkModal] = useState(null); // { record } — 이관 AS 프로젝트 연결
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

  // 마감된 연도 목록 (내림차순)
  const archivedYears = useMemo(() => {
    const ys = new Set();
    allRecords.forEach(r => { if (r.archivedYear) ys.add(String(r.archivedYear)); });
    return Array.from(ys).sort((a, b) => Number(b) - Number(a));
  }, [allRecords]);

  // 마감 가능한 연도 후보 (완료 + 미마감 레코드의 연도)
  const closableYears = useMemo(() => {
    const ys = new Set();
    allRecords.forEach(r => { if (r.status === '완료' && !r.archivedYear) { const y = asRecordYear(r); if (y) ys.add(y); } });
    return Array.from(ys).sort((a, b) => Number(b) - Number(a));
  }, [allRecords]);

  // 마감 모드 안내: 보관 연도 조회 중인지
  const isArchiveView = filterYear !== '' && !searchAll;

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return allRecords.filter(r => {
      // 연도/마감 스코프: 통합검색이면 무시, 아니면 (기본=미마감만 / 연도선택=해당 마감분만)
      if (!searchAll) {
        if (filterYear === '') { if (r.archivedYear) return false; }
        else if (String(r.archivedYear || '') !== filterYear) return false;
      }
      const cat = r.category || AS_DEFAULT_CATEGORY;
      if (filterCategory !== '전체' && cat !== filterCategory) return false;
      if (filterType !== '전체' && r.type !== filterType) return false;
      if (filterStatus !== '전체' && r.status !== filterStatus) return false;
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterPhase === 'open' && r.status === '완료') return false;
      if (filterPhase === 'done' && r.status !== '완료') return false;
      if (filterPhase === 'urgent' && !(r.priority === '긴급' && r.status !== '완료')) return false;
      if (kw) {
        const fields = [r.projectName, r.customer, r.engineer, r.description, r.resolution, r.manager, r.contact, r.serial, r.part, r.visit, r.legacyCode];
        if (!fields.some(v => v && String(v).toLowerCase().includes(kw))) return false;
      }
      return true;
    });
  }, [allRecords, filterType, filterStatus, filterProject, filterCategory, filterPhase, search, filterYear, searchAll]);

  // 통계/스코프 기준 레코드 — 연도/마감 스코프만 반영 (유형·상태·검색 필터는 제외)
  const scopedRecords = useMemo(() => {
    if (searchAll) return allRecords;
    if (filterYear === '') return allRecords.filter(r => !r.archivedYear);
    return allRecords.filter(r => String(r.archivedYear || '') === filterYear);
  }, [allRecords, filterYear, searchAll]);

  const stats = useMemo(() => ({
    total: scopedRecords.length,
    hw: scopedRecords.filter(r => (r.category || AS_DEFAULT_CATEGORY) === 'HW').length,
    sw: scopedRecords.filter(r => r.category === 'SW').length,
    open: scopedRecords.filter(r => r.status !== '완료').length,
    completed: scopedRecords.filter(r => r.status === '완료').length,
    urgent: scopedRecords.filter(r => r.priority === '긴급' && r.status !== '완료').length,
  }), [scopedRecords]);

  // 유무상 / 처리유형 분포 (완료 건 기준, 스코프 내) — 차트 없이 표로
  const billingStats = useMemo(() => {
    const done = scopedRecords.filter(r => r.status === '완료');
    const paid = done.filter(r => /유상/.test(r.billing || '')).length;
    const free = done.filter(r => /무상/.test(r.billing || '')).length;
    return { paid, free, unset: done.length - paid - free };
  }, [scopedRecords]);

  // 프로젝트 목록 (AS 레코드가 있는 프로젝트만)
  const projectOptions = useMemo(() => {
    const ids = new Set(allRecords.map(r => r.projectId));
    return (projects || []).filter(p => ids.has(p.id));
  }, [allRecords, projects]);

  const handleExport = () => {
    exportToExcel('AS_통합내역', [{
      name: 'AS 내역',
      rows: filtered.map(r => ({
        date: r.date, legacyCode: r.legacyCode || '', projectName: r.projectName, customer: r.customer, site: r.site,
        category: r.category || AS_DEFAULT_CATEGORY,
        type: r.type, status: r.status, priority: r.priority || '보통',
        engineer: r.engineer, manager: r.manager || '', contact: r.contact || '', serial: r.serial || '',
        reqDate: r.reqDate || '', visit: r.visit || '',
        part: r.part || '', cost: r.cost || '',
        asType: r.asType || '', billing: r.billing || '',
        description: r.description, resolution: r.resolution || '-',
        comments: Array.isArray(r.comments) ? r.comments.length : 0,
        completedAt: r.status === '완료' && r.report ? r.report.completedAt || '' : '',
        reportFile: r.status === '완료' && r.report ? (r.report.naReason ? 'N/A' : r.report.fileName || '-') : '-'
      })),
      columns: [
        { header: '일자', key: 'date' }, { header: '원본코드', key: 'legacyCode' }, { header: '프로젝트', key: 'projectName' }, { header: '고객사', key: 'customer' },
        { header: '사이트', key: 'site' }, { header: '분류', key: 'category' }, { header: 'AS 유형', key: 'type' },
        { header: '상태', key: 'status' }, { header: '중요도', key: 'priority' }, { header: '담당 엔지니어', key: 'engineer' },
        { header: '고객사 담당자', key: 'manager' }, { header: '연락처', key: 'contact' }, { header: '시리얼', key: 'serial' },
        { header: '희망일', key: 'reqDate' }, { header: '방문필요사항', key: 'visit' },
        { header: '사용 부품', key: 'part' }, { header: '금액', key: 'cost' },
        { header: '처리유형', key: 'asType' }, { header: '비용청구', key: 'billing' },
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

  // 기존 AS 통합관리 엑셀/CSV 파싱 → 미리보기
  const handleImportFile = async (file) => {
    if (!file) return;
    setImportModal({ stage: 'pick', fileName: file.name, busy: true, error: '' });
    try {
      const buf = await file.arrayBuffer();
      const { rows, sheetName } = parseASWorkbook(buf);
      const { items, skipped } = mapLegacyASRows(rows);
      const existing = collectLegacyIds(projects);
      let matched = 0, dup = 0, noCode = 0;
      const newCodes = new Set();
      items.forEach(it => {
        if (it.legacyId && existing.has(String(it.legacyId))) { dup += 1; return; }
        if (findProjectIdByCode(it.code, projects)) { matched += 1; return; }
        if (it.code) newCodes.add(it.code); else noCode += 1;
      });
      if (items.length === 0) {
        setImportModal({ stage: 'error', fileName: file.name, busy: false, error: t('유효한 AS 행을 찾지 못했습니다. (AS_Data 시트/컬럼 확인)', 'No valid AS rows found.') });
        return;
      }
      const net = items.length - dup;
      setImportModal({
        stage: 'preview', fileName: file.name, sheetName, items, busy: false, error: '',
        counts: { total: items.length, matched, newProjects: newCodes.size + (noCode > 0 ? 1 : 0), codes: Array.from(newCodes).sort(), noCode, dup, skipped, net }
      });
    } catch (e) {
      setImportModal({ stage: 'error', fileName: file.name, busy: false, error: (e && e.message) || t('파일 파싱 실패', 'Parse failed') });
    }
  };

  const confirmImport = () => {
    const m = importModal;
    if (!m || !m.items || !onImportAS) return;
    setImportModal({ ...m, busy: true });
    try { onImportAS(m.items); } finally { setImportModal(null); }
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
          {/* 연도 조회 — '' 현재 진행중(미마감) / 마감 연도 보관분 */}
          <select
            value={searchAll ? '' : filterYear}
            disabled={searchAll}
            onChange={e => setFilterYear(e.target.value)}
            className="text-sm font-bold bg-white border border-violet-300 text-violet-700 rounded-lg px-2 py-2 outline-none disabled:opacity-50"
            title={t('연도별 마감 보관분 조회', 'View archived year')}
          >
            <option value="">{t('현재 진행중 (미마감)', 'Active (current)')}</option>
            {archivedYears.map(y => <option key={y} value={y}>{t(`${y}년 마감 보관`, `${y} archived`)}</option>)}
          </select>
          {currentUser.role === 'ADMIN' && !searchAll && (
            isArchiveView ? (
              <button onClick={() => { if (window.confirm(t(`${filterYear}년 마감을 취소하시겠습니까?\n해당 연도 AS가 다시 현재 목록으로 돌아옵니다.`, `Unarchive ${filterYear}?`))) { onUnarchiveASYear && onUnarchiveASYear(filterYear); setFilterYear(''); } }} className="flex items-center bg-amber-50 text-amber-700 border border-amber-300 px-3 py-2 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors shadow-sm">
                {t('마감 취소', 'Unarchive')}
              </button>
            ) : (
              <button onClick={() => { const y = window.prompt(t('연간 마감할 연도를 입력하세요 (YYYY).\n해당 연도 완료 AS가 보관 처리됩니다.', 'Year to archive (YYYY):'), String(new Date().getFullYear())); if (y && /^\d{4}$/.test(y.trim()) && window.confirm(t(`${y.trim()}년 완료 AS를 연간 마감하시겠습니까?\n(되돌릴 수 있습니다)`, `Archive completed AS for ${y.trim()}?`))) onArchiveASYear && onArchiveASYear(y.trim()); }} className="flex items-center bg-violet-50 text-violet-700 border border-violet-300 px-3 py-2 rounded-lg text-sm font-bold hover:bg-violet-100 transition-colors shadow-sm" title={closableYears.length ? t(`마감 가능: ${closableYears.join(', ')}`, '') : t('마감 가능한 완료 AS 없음', '')}>
                {t('연간 마감', 'Archive Year')}
              </button>
            )
          )}
          {currentUser.role !== 'CUSTOMER' && onAddAS && (
            <button onClick={() => setCreateModal({ projectId: '', category: 'HW', type: AS_HW_TYPES[0], engineer: currentUser.name || '', coEngineerIds: [], description: '', resolution: '', priority: '보통', manager: '', contact: '', serial: '', part: '', cost: '', reqDate: '', visit: '', files: [], uploading: false, error: '' })} className="flex items-center bg-purple-600 text-white border border-purple-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm">
              <Plus size={16} className="mr-1.5" /> {t('새 AS 접수', 'New AS')}
            </button>
          )}
          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && onImportAS && (
            <button onClick={() => setImportModal({ stage: 'pick', error: '', busy: false })} className="flex items-center bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors shadow-sm" title={t('기존 AS 통합관리(V4.1) 엑셀/CSV 데이터 이관', 'Import legacy AS data')}>
              <Upload size={16} className="mr-2" /> {t('AS 데이터 가져오기', 'Import AS')}
            </button>
          )}
          <button onClick={handleExport} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm">
            <Download size={16} className="mr-2" /> {t('AS 내역 Excel', 'AS Excel')}
          </button>
        </div>
      </div>

      {(isArchiveView || searchAll) && (
        <div className={`px-4 py-2 rounded-lg text-xs font-bold border ${searchAll ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
          {searchAll
            ? t('🔍 통합검색 모드 — 모든 연도·마감 데이터를 검색 중입니다.', 'Global search — all years.')
            : t(`🔒 ${filterYear}년 마감 보관 데이터 (열람 전용 — 수정·완료는 현재 진행중에서)`, `Archived ${filterYear} (read-only)`)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title={t('전체 AS', 'Total')} value={stats.total} icon={<LifeBuoy size={22} className="text-purple-500" />} />
        <StatCard title={t('HW (현장)', 'HW')} value={stats.hw} icon={<Wrench size={22} className="text-indigo-500" />} color={stats.hw > 0 ? 'border-indigo-200 bg-indigo-50' : ''} />
        <StatCard title={t('SW (원격)', 'SW')} value={stats.sw} icon={<Code size={22} className="text-cyan-500" />} color={stats.sw > 0 ? 'border-cyan-200 bg-cyan-50' : ''} />
        <StatCard title={t('처리 중', 'Open')} value={stats.open} icon={<Clock size={22} className="text-amber-500" />} color={stats.open > 0 ? 'border-amber-200 bg-amber-50' : ''} />
        <StatCard title={t('완료', 'Done')} value={stats.completed} icon={<CheckCircle size={22} className="text-emerald-500" />} />
        <StatCard title={t('미완료 긴급', 'Urgent Open')} value={stats.urgent} icon={<AlertTriangle size={22} className="text-red-500" />} color={stats.urgent > 0 ? 'border-red-200 bg-red-50' : ''} />
      </div>

      {stats.completed > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">{t('완료 건 비용 청구:', 'Billing of completed:')}</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">{t('무상', 'Free')} {billingStats.free}</span>
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">{t('유상', 'Paid')} {billingStats.paid}</span>
          {billingStats.unset > 0 && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold">{t('분류전', 'Unset')} {billingStats.unset}</span>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 space-y-3">
          {/* 1행: 검색 + 분류 토글 + 프로젝트/유형/상세상태 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]">
              <Search size={16} className="text-slate-400 mr-2" />
              <input className="bg-transparent outline-none text-sm w-full" placeholder={t('프로젝트/고객사/엔지니어/증상/시리얼/담당자/부품 검색', 'Search projects, customers, engineers, symptoms, serial, manager, parts')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => setSearchAll(v => !v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${searchAll ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
              title={t('연도·마감 무시하고 전체 데이터에서 검색', 'Search across all years/archives')}
            >
              {searchAll ? t('통합검색 ON', 'Global ON') : t('통합검색', 'Global')}
            </button>
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
                      {r.legacyCode && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center" title={t('기존 AS 통합관리에서 이관된 건 — 원본 프로젝트 코드', 'Imported — original project code')}>
                          <Upload size={9} className="mr-0.5" />{r.legacyCode}
                        </span>
                      )}
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
                      {Array.isArray(r.coEngineers) && r.coEngineers.length > 0 && (
                        <span className="text-slate-500">+ {t('공동', 'Co')}: <span className="font-bold">{r.coEngineers.map(c => c.name).filter(Boolean).join(', ')}</span></span>
                      )}
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

                    {/* 처리유형 / 비용청구 (완료 시 분류) */}
                    {r.status === '완료' && (r.asType || r.billing) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {r.asType && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">{r.asType}</span>}
                        {r.billing && <span className={`px-2 py-0.5 rounded-full border ${/유상/.test(r.billing) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{r.billing}</span>}
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

                    {/* 메일 송부 버튼 — AS 보고서 (수신·참조 직접 지정 → HTML 양식 메일 발송) */}
                    {currentUser.role !== 'CUSTOMER' && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setEmailTarget({ project: r._project, as: r })}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center shadow-sm transition-colors"
                          title={t('이 AS 보고서를 이메일로 발송 — 수신/참조를 직접 지정하고 미리보기 후 발송합니다.', 'Email this AS report — pick recipients, preview, then send.')}
                        >
                          <Mail size={11} className="mr-1.5" />{t('AS 보고서 메일 발송', 'Send AS Report Email')}
                        </button>
                        {r._imported && (currentUser.role === 'ADMIN' || currentUser.role === 'PM') && onRelinkAS && (
                          <button
                            type="button"
                            onClick={() => setRelinkModal({ record: r })}
                            className="ml-2 text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 inline-flex items-center shadow-sm transition-colors"
                            title={t('이관된 AS를 올바른 프로젝트로 연결하거나 신규 프로젝트 생성', 'Relink imported AS to a project')}
                          >
                            <ExternalLink size={11} className="mr-1.5" />{t('프로젝트 연결', 'Relink Project')}
                          </button>
                        )}
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
                        {currentUser.role !== 'CUSTOMER' && r.status !== '완료' && !isArchiveView && onAddASComment && (
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

                  {/* 우측 상태 컨트롤 (원복) — 마감 보관 조회 시 읽기전용 */}
                  {currentUser.role !== 'CUSTOMER' && !isArchiveView && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {statuses.map(s => (
                        <button key={s} onClick={() => {
                          if (s === '완료' && r.status !== '완료' && onCompleteAS) {
                            const cat = r.category || AS_DEFAULT_CATEGORY;
                            setCompleteModal({ projectId: r.projectId, asId: r.id, category: cat, file: null, isNA: false, uploading: false, asType: getASResolutionTypesByCategory(cat)[0], billing: AS_BILLING_OPTIONS[0] });
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
            await onCompleteAS(m.projectId, m.asId, { isNA: m.isNA, file: m.file, asType: m.asType, billing: m.billing, onProgress: () => {} });
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('처리 유형', 'Resolution Type')}</label>
                    <select value={m.asType} disabled={m.uploading} onChange={(e) => setCompleteModal({ ...m, asType: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:opacity-50">
                      {getASResolutionTypesByCategory(m.category).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('비용 청구', 'Billing')}</label>
                    <select value={m.billing} disabled={m.uploading} onChange={(e) => setCompleteModal({ ...m, billing: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:opacity-50">
                      {AS_BILLING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
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

      {/* AS 데이터 가져오기(이관) 모달 */}
      {importModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => !importModal.busy && setImportModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[520px] max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-blue-700 flex items-center"><Upload size={16} className="mr-2" />{t('AS 데이터 가져오기 (이관)', 'Import Legacy AS')}</h3>
              <button onClick={() => !importModal.busy && setImportModal(null)} disabled={importModal.busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {(importModal.stage === 'pick' || importModal.stage === 'error') && (
                <>
                  <div className="text-xs text-slate-600 leading-relaxed">{t('기존 AS 통합관리(V4.1)에서 내보낸 엑셀(.xlsx) 또는 CSV 파일을 선택하세요. 적용 전 미리보기로 건수를 확인합니다.', 'Pick the exported .xlsx/.csv. Preview before applying.')}</div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={importModal.busy}
                    onChange={(e) => handleImportFile(e.target.files && e.target.files[0])}
                    className="block w-full text-xs p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white file:font-bold file:text-[11px] disabled:opacity-50"
                  />
                  {importModal.busy && <div className="text-xs font-bold text-blue-700 flex items-center"><Loader size={12} className="animate-spin mr-1.5" />{t('분석 중...', 'Parsing...')}</div>}
                  {importModal.stage === 'error' && importModal.error && (
                    <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded p-2">{importModal.error}</div>
                  )}
                </>
              )}
              {importModal.stage === 'preview' && importModal.counts && (
                <>
                  <div className="text-[11px] text-slate-500">{t('파일', 'File')}: <span className="font-bold text-slate-700">{importModal.fileName}</span>{importModal.sheetName ? ` · ${importModal.sheetName}` : ''}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200"><div className="text-[10px] font-bold text-blue-600">{t('이관 대상', 'To import')}</div><div className="text-xl font-black text-blue-700">{importModal.counts.net}</div></div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"><div className="text-[10px] font-bold text-slate-500">{t('기존 프로젝트 매칭', 'Matched')}</div><div className="text-xl font-black text-slate-700">{importModal.counts.matched}</div></div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200"><div className="text-[10px] font-bold text-emerald-600">{t('신규 프로젝트 생성', 'New projects')}</div><div className="text-xl font-black text-emerald-700">{importModal.counts.newProjects}</div></div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"><div className="text-[10px] font-bold text-slate-500">{t('중복 스킵 / 삭제행', 'Dup / deleted')}</div><div className="text-sm font-black text-slate-600 pt-1.5">{importModal.counts.dup} / {importModal.counts.skipped}</div></div>
                  </div>
                  {importModal.counts.codes && importModal.counts.codes.length > 0 && (
                    <div className="text-[11px] leading-relaxed bg-emerald-50 border border-emerald-200 rounded p-2 max-h-24 overflow-y-auto">
                      <span className="font-bold text-emerald-700">{t('생성될 프로젝트(코드):', 'New projects (codes):')}</span> <span className="font-mono text-emerald-800">{importModal.counts.codes.join(', ')}</span>{importModal.counts.noCode > 0 && <span className="text-amber-700"> {t(`+ 코드없음 ${importModal.counts.noCode}건(1개)`, '')}</span>}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded p-2">{t("기존 장비 코드와 일치하면 그 프로젝트에, 아니면 코드별로 프로젝트를 새로 생성해 해당 코드 AS를 넣습니다(코드=장비 코드로 등록 → 재이관 자동 매칭). 동일 원본은 다시 가져와도 중복되지 않습니다.", "Matched by equipment code, else one new project per code. Idempotent re-import.")}</div>
                  {importModal.busy && <div className="text-xs font-bold text-blue-700 flex items-center"><Loader size={12} className="animate-spin mr-1.5" />{t('이관 중...', 'Importing...')}</div>}
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setImportModal(null)} disabled={importModal.busy} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
              {importModal.stage === 'preview' && (
                <button type="button" onClick={confirmImport} disabled={importModal.busy || !(importModal.counts && importModal.counts.net > 0)} className="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center disabled:bg-slate-300"><Upload size={12} className="mr-1" />{t(`${importModal.counts ? importModal.counts.net : 0}건 이관 적용`, 'Apply')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이관 AS 프로젝트 연결/해소 모달 */}
      {relinkModal && (() => {
        const rec = relinkModal.record;
        const code = String(rec.legacyCode || '').trim();
        const group = code
          ? allRecords.filter(x => x.projectId === rec.projectId && String(x.legacyCode || '').trim() === code)
          : [rec];
        const groupIds = group.map(x => x.id);
        const suggestedId = findProjectIdByCode(code, projects);
        const candidates = (projects || []).filter(p => p.id !== rec.projectId);
        const targetId = relinkModal.targetId
          || (suggestedId && suggestedId !== rec.projectId ? suggestedId : (candidates[0] ? candidates[0].id : ''));
        const close = () => setRelinkModal(null);
        const upd = (patch) => setRelinkModal({ ...relinkModal, ...patch });
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={close}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[520px] max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-blue-700 flex items-center"><ExternalLink size={16} className="mr-2" />{t('이관 AS 프로젝트 연결', 'Relink Imported AS')}</h3>
                <button onClick={close} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2.5 leading-relaxed">
                  {t('원본 코드', 'Code')}: <span className="font-mono font-bold text-blue-700">{code || t('(없음)', '(none)')}</span>
                  {' · '}{t('대상', 'Records')}: <strong>{groupIds.length}{t('건', '')}</strong>
                  {' · '}{t('현재', 'In')}: <strong>{rec.projectName}</strong>
                  {code && suggestedId && suggestedId !== rec.projectId && (
                    <div className="mt-1 text-emerald-700 font-bold">{t('장비 코드 일치 프로젝트 자동 추천됨', 'Matched by equipment code')}</div>
                  )}
                </div>

                {/* ① 기존 프로젝트 연결 */}
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-xs font-black text-slate-700 mb-2">① {t('기존 프로젝트에 연결', 'Link to existing project')}</div>
                  <div className="flex gap-2">
                    <select value={targetId} onChange={(e) => upd({ targetId: e.target.value })} className="flex-1 text-xs p-2 border border-slate-300 rounded-lg bg-white">
                      {candidates.length === 0 && <option value="">{t('연결 가능한 프로젝트 없음', 'No projects')}</option>}
                      {candidates.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === suggestedId ? ' ★' : ''}</option>)}
                    </select>
                    <button type="button" disabled={!targetId} onClick={() => { onRelinkAS && onRelinkAS(rec.projectId, groupIds, targetId); close(); }} className="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300">{t('연결', 'Link')}</button>
                  </div>
                </div>

                {/* ② 이 코드로 새 프로젝트 생성 */}
                {onCreateProjectFromAS && (
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-black text-slate-700 mb-2">② {t('이 코드로 새 프로젝트 생성', 'Create new project')}</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={relinkModal.newName != null ? relinkModal.newName : ''} onChange={(e) => upd({ newName: e.target.value })} placeholder={t(`프로젝트명 (기본: ${rec.customer || code})`, 'Project name')} className="text-xs p-2 border border-slate-300 rounded-lg" />
                      <input value={relinkModal.newCustomer != null ? relinkModal.newCustomer : (rec.customer || '')} onChange={(e) => upd({ newCustomer: e.target.value })} placeholder={t('고객사', 'Customer')} className="text-xs p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">{t('장비 코드에 원본 코드가 등록되어 향후 이관이 자동 매칭됩니다.', 'Code is registered as equipment code for future auto-match.')}</div>
                    <button type="button" onClick={() => { onCreateProjectFromAS({ fromProjectId: rec.projectId, legacyCode: code, name: relinkModal.newName, customer: relinkModal.newCustomer != null ? relinkModal.newCustomer : rec.customer }); close(); }} className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white">{t(`새 프로젝트 생성 + ${groupIds.length}건 이동`, 'Create + move')}</button>
                  </div>
                )}

                {/* ③ 현재(버킷) 프로젝트 정보 수정 */}
                {onRequestEditProject && (
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-black text-slate-700 mb-2">③ {t("현재 프로젝트('AS 이관') 이름/정보 수정", 'Edit current project info')}</div>
                    <div className="text-[11px] text-slate-500 mb-2">{t('새 프로젝트를 만들지 않고 이 프로젝트 자체를 실제 프로젝트로 바꿉니다(이름·고객사·장비 코드 등).', 'Repurpose this project instead of creating a new one.')}</div>
                    <button type="button" onClick={() => { onRequestEditProject(rec.projectId); close(); }} className="px-3 py-1.5 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white">{t('프로젝트 정보 수정 열기', 'Open project edit')}</button>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
                <button type="button" onClick={close} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50">{t('닫기', 'Close')}</button>
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
            const coEngineers = (m.coEngineerIds || [])
              .map(id => {
                const u = (users || []).find(x => x.id === id);
                return u ? { id: u.id, name: u.name } : null;
              })
              .filter(Boolean)
              .filter(c => c.name !== m.engineer);
            await onAddAS(m.projectId, { category: m.category, type: m.type, engineer: m.engineer, coEngineers, description: m.description, resolution: m.resolution, priority: m.priority, manager: m.manager, contact: m.contact, serial: m.serial, part: m.part, cost: m.cost, reqDate: m.reqDate, visit: m.visit, files: m.files, onProgress: () => {} });
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
                    {Array.isArray(engineers) && engineers.filter(e => e.active !== false).length > 0 ? (
                      <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.engineer} onChange={(e) => setCreateModal({ ...m, engineer: e.target.value })}>
                        <option value="">{t('-- 선택 --', '-- Select --')}</option>
                        {engineers.filter(e => e.active !== false).map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={m.engineer} onChange={(e) => setCreateModal({ ...m, engineer: e.target.value })} />
                    )}
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
                {/* 공동 처리자 (다중 선택, 선택) */}
                {(() => {
                  const candidateUsers = (users || []).filter(u => u.role !== 'CUSTOMER' && u.active !== false && u.name !== m.engineer);
                  if (candidateUsers.length === 0) return null;
                  const toggleCo = (id) => {
                    const set = new Set(m.coEngineerIds || []);
                    if (set.has(id)) set.delete(id); else set.add(id);
                    setCreateModal({ ...m, coEngineerIds: Array.from(set) });
                  };
                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('공동 처리자 (선택, 다중)', 'Co-handlers (optional, multi)')}
                        {(m.coEngineerIds || []).length > 0 && <span className="ml-1 text-[10px] text-purple-600 font-normal">· {m.coEngineerIds.length}{t('명 선택', ' selected')}</span>}
                      </label>
                      <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-28 overflow-y-auto grid grid-cols-3 gap-1">
                        {candidateUsers.map(u => (
                          <label key={u.id} className="flex items-center text-[11px] text-slate-700 cursor-pointer hover:bg-white p-1 rounded">
                            <input type="checkbox" className="mr-1.5" checked={(m.coEngineerIds || []).includes(u.id)} onChange={() => toggleCo(u.id)} />
                            <span className="truncate">{u.name}{u.dept ? ` · ${u.dept}` : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
          users={users}
          customers={customers}
          onClose={() => setEmailTarget(null)}
          onSent={() => { setEmailTarget(null); }}
          t={t}
        />
      )}
    </div>
  );
});

export default ASManagementView;
