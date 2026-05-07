import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { Plus, Filter, AlignJustify, CalendarDays, Clock, User, HardDrive, Monitor, Cpu, Edit, ListTodo, Trash, Download, History, ChevronDown, ChevronUp, Plane, Users, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { PROJECT_PHASES, BATTERY_DOMAINS, DOMAIN_VERSION_CATEGORIES, DEFAULT_VERSION_CATEGORIES } from '../../constants';
import { fmtYMD } from '../../utils/calc';

const safeDate = (v) => {
  const ymd = fmtYMD(v);
  if (!ymd) return null;
  const d = new Date(ymd);
  return isNaN(d.getTime()) ? null : d;
};
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import ProjectIssueBadge from '../common/ProjectIssueBadge';
import ProjectNotesBadge from '../common/ProjectNotesBadge';
import { exportToExcel, exportSectionedExcel } from '../../utils/export';

const ProjectListView = memo(function ProjectListView({ projects, issues, engineers, getStatusColor, onAddClick, onManageTasks, onEditVersion, onChangeManager, onManageTeam, onViewPhaseGantt, onEditProject, onDeleteProject, onUpdatePhase, onEditPhases, onIssueClick, calcExp, calcAct, currentUser, t }) {
  const [viewMode, setViewMode] = useState('list');
  const [filterManager, setFilterManager] = useState('all');
  const [openIssueDropdownId, setOpenIssueDropdownId] = useState(null);
  const [openNotesDropdownId, setOpenNotesDropdownId] = useState(null);
  const [expandedGanttId, setExpandedGanttId] = useState(null);
  const [expandedGanttTab, setExpandedGanttTab] = useState('phase');
  const [ganttViewTab, setGanttViewTab] = useState('phase');
  const [ganttZoom, setGanttZoom] = useState(1); // 1=기본, 0.5x~4x
  const [ganttFilterIds, setGanttFilterIds] = useState(null); // null=전체, [id...]=선택된 ID들
  const [ganttFilterOpen, setGanttFilterOpen] = useState(false);
  const [ganttFilterSearch, setGanttFilterSearch] = useState('');
  const ganttScrollRef = useRef(null);
  const ganttInitialScrolled = useRef(false);
  const inlineGanttScrollRef = useRef(null);
  const [inlineGanttZoom, setInlineGanttZoom] = useState(1);

  const managers = ['all', ...new Set(projects.map(p => p.manager).filter(Boolean))];

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (currentUser.role === 'CUSTOMER') {
      const allowed = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
      result = result.filter(p => allowed.includes(p.id));
    }
    if (filterManager !== 'all') result = result.filter(p => p.manager === filterManager);
    return result;
  }, [projects, filterManager, currentUser]);

  const ganttRange = useMemo(() => {
    const starts = [];
    const ends = [];
    filteredProjects.forEach(p => {
      const ps = safeDate(p.startDate); if (ps) starts.push(ps.getTime());
      const pd = safeDate(p.dueDate); if (pd) ends.push(pd.getTime());
      (p.tasks || []).forEach(tk => {
        const ts = safeDate(tk.startDate); if (ts) starts.push(ts.getTime());
        const te = safeDate(tk.endDate); if (te) ends.push(te.getTime());
      });
      (p.trips || []).forEach(tr => {
        const ts = safeDate(tr.departureDate); if (ts) starts.push(ts.getTime());
        const te = safeDate(tr.returnDate); if (te) ends.push(te.getTime());
      });
    });
    if (starts.length === 0 || ends.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: today, totalDays: 1 };
    }
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    minDate.setDate(minDate.getDate() - 15);
    maxDate.setDate(maxDate.getDate() + 15);
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    return { minDate, maxDate, totalDays };
  }, [filteredProjects]);

  // 간트 뷰가 활성화되면 초기 스크롤을 today - 1개월 위치로 이동
  useEffect(() => {
    if (viewMode !== 'gantt') { ganttInitialScrolled.current = false; return; }
    const id = setTimeout(() => {
      const node = ganttScrollRef.current;
      if (!node) return;
      const inner = node.firstElementChild;
      if (!inner) return;
      const innerWidth = inner.scrollWidth;
      const minD = ganttRange.minDate;
      const fullD = ganttRange.totalDays;
      if (!fullD || fullD <= 0) return;
      const today = new Date();
      const todayPct = ((today - minD) / (1000 * 60 * 60 * 24) / fullD);
      const oneMonthPct = 30 / fullD;
      const targetPct = Math.max(0, todayPct - oneMonthPct);
      node.scrollLeft = targetPct * innerWidth;
      ganttInitialScrolled.current = true;
    }, 80);
    return () => clearTimeout(id);
  }, [viewMode, ganttZoom, ganttViewTab, ganttRange.minDate, ganttRange.totalDays]);

  // 휠 줌 — 차트 영역 위에서 휠 굴리면 줌 (Shift+휠 = 가로 스크롤 직접 처리)
  useEffect(() => {
    if (viewMode !== 'gantt') return;
    const node = ganttScrollRef.current;
    if (!node) return;
    const handler = (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        node.scrollLeft += (e.deltaY || e.deltaX);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setGanttZoom(z => Math.max(0.5, Math.min(4, +((z + delta).toFixed(2)))));
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => node.removeEventListener('wheel', handler);
  }, [viewMode]);

  // 인라인 간트 휠 줌 + Shift+휠 가로 스크롤 + 초기 스크롤
  useEffect(() => {
    if (!expandedGanttId) return;
    const node = inlineGanttScrollRef.current;
    if (!node) return;
    const handler = (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        node.scrollLeft += (e.deltaY || e.deltaX);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setInlineGanttZoom(z => Math.max(0.5, Math.min(4, +((z + delta).toFixed(2)))));
    };
    node.addEventListener('wheel', handler, { passive: false });
    // 초기 스크롤 to today - 1month
    const id = setTimeout(() => {
      if (!inlineGanttScrollRef.current) return;
      const n = inlineGanttScrollRef.current;
      const inner = n.firstElementChild;
      if (!inner) return;
      const prj = projects.find(p => p.id === expandedGanttId);
      if (!prj) return;
      const ps = prj.startDate ? new Date(prj.startDate) : null;
      const pd = prj.dueDate ? new Date(prj.dueDate) : null;
      if (!ps || !pd || isNaN(ps.getTime()) || isNaN(pd.getTime())) return;
      const allStarts = [ps];
      const allEnds = [pd];
      (prj.tasks || []).forEach(tk => { const s = tk.startDate ? new Date(tk.startDate) : null; const e = tk.endDate ? new Date(tk.endDate) : null; if (s && !isNaN(s.getTime())) allStarts.push(s); if (e && !isNaN(e.getTime())) allEnds.push(e); });
      const minTime = Math.min(...allStarts.map(d => d.getTime()));
      const maxTime = Math.max(...allEnds.map(d => d.getTime()));
      const gMin = new Date(minTime); gMin.setDate(1);
      const gMax = new Date(maxTime); gMax.setMonth(gMax.getMonth() + 1, 0);
      const fullD = (gMax - gMin) / (1000 * 60 * 60 * 24);
      if (fullD <= 0) return;
      const today = new Date();
      const todayPctVal = ((today - gMin) / (1000 * 60 * 60 * 24) / fullD);
      const oneMonth = 30 / fullD;
      const tgt = Math.max(0, todayPctVal - oneMonth);
      n.scrollLeft = tgt * inner.scrollWidth;
    }, 80);
    return () => { clearTimeout(id); node.removeEventListener('wheel', handler); };
  }, [expandedGanttId, inlineGanttZoom, expandedGanttTab, projects]);

  // 간단 리스트 Excel (1 시트)
  const handleExportList = () => {
    const exportData = filteredProjects.map(p => ({
      id: p.id, domain: p.domain, name: p.name, customer: p.customer, site: p.site,
      startDate: p.startDate, dueDate: p.dueDate, manager: p.manager, status: p.status,
      phase: PROJECT_PHASES[typeof p.phaseIndex === 'number' ? p.phaseIndex : 0] || '',
      expected: calcExp(p.startDate, p.dueDate) + '%', actual: calcAct(p.tasks) + '%'
    }));
    exportToExcel('프로젝트_리스트', [{
      name: '프로젝트 리스트',
      rows: exportData,
      columns: [
        { header: 'ID', key: 'id' }, { header: '도메인', key: 'domain' }, { header: '프로젝트명', key: 'name' },
        { header: '고객사', key: 'customer' }, { header: '사이트', key: 'site' }, { header: '담당자', key: 'manager' },
        { header: '시작일', key: 'startDate' }, { header: '납기일', key: 'dueDate' }, { header: '상태', key: 'status' },
        { header: '현재 단계', key: 'phase' }, { header: '계획', key: 'expected' }, { header: '실적', key: 'actual' }
      ]
    }]);
  };

  // 프로젝트별 상세 Excel (프로젝트별 시트 분리)
  const handleExportDetail = () => {
    const sheets = [];

    // 첫 번째 시트: 전체 개요
    sheets.push({
      name: '0.전체 개요',
      sections: [{
        title: '전체 프로젝트 현황',
        rows: filteredProjects.map(p => ({
          id: p.id, domain: p.domain, name: p.name, customer: p.customer, site: p.site,
          startDate: p.startDate, dueDate: p.dueDate, manager: p.manager, status: p.status,
          phase: PROJECT_PHASES[typeof p.phaseIndex === 'number' ? p.phaseIndex : 0] || '',
          expected: calcExp(p.startDate, p.dueDate) + '%', actual: calcAct(p.tasks) + '%'
        })),
        columns: [
          { header: 'ID', key: 'id' }, { header: '도메인', key: 'domain' }, { header: '프로젝트명', key: 'name' },
          { header: '고객사', key: 'customer' }, { header: '사이트', key: 'site' }, { header: '담당자', key: 'manager' },
          { header: '시작일', key: 'startDate' }, { header: '납기일', key: 'dueDate' }, { header: '상태', key: 'status' },
          { header: '단계', key: 'phase' }, { header: '계획', key: 'expected' }, { header: '실적', key: 'actual' }
        ]
      }]
    });

    // 프로젝트별 시트 (각 프로젝트가 하나의 시트)
    filteredProjects.forEach((p, idx) => {
      const prjIssues = issues.filter(i => i.projectId === p.id);
      const sheetName = `${idx + 1}.${p.name}`;

      const sections = [];

      // 기본 정보
      sections.push({
        title: '기본 정보',
        rows: [
          { field: '프로젝트 ID', value: p.id },
          { field: '프로젝트명', value: p.name },
          { field: '도메인', value: p.domain },
          { field: '고객사', value: p.customer },
          { field: '사이트', value: p.site },
          { field: '시작일', value: p.startDate },
          { field: '납기일', value: p.dueDate },
          { field: '상태', value: p.status },
          { field: '현재 단계', value: PROJECT_PHASES[typeof p.phaseIndex === 'number' ? p.phaseIndex : 0] || '' },
          { field: '담당자', value: p.manager || '-' },
          { field: '계획 진행률', value: calcExp(p.startDate, p.dueDate) + '%' },
          { field: '실적 진행률', value: calcAct(p.tasks) + '%' },
          { field: 'HW 버전', value: p.hwVersion || '-' },
          { field: 'SW 버전', value: p.swVersion || '-' },
          { field: 'FW 버전', value: p.fwVersion || '-' },
          { field: 'Notion 링크', value: p.notionLink || '-' }
        ],
        columns: [{ header: '항목', key: 'field' }, { header: '값', key: 'value' }]
      });

      // 세부 일정
      sections.push({
        title: `세부 일정 (${(p.tasks || []).length}건)`,
        rows: (p.tasks || []).map((task, i) => ({
          step: `Step ${i + 1}`, name: task.name,
          startDate: task.startDate || '-', endDate: task.endDate || '-',
          status: task.isCompleted ? '완료' : '진행중',
          delayReason: task.delayReason || '-'
        })),
        columns: [
          { header: '순서', key: 'step' }, { header: '업무명', key: 'name' },
          { header: '시작일', key: 'startDate' }, { header: '종료일', key: 'endDate' },
          { header: '상태', key: 'status' }, { header: '메모/지연사유', key: 'delayReason' }
        ]
      });

      // 버전 이력
      sections.push({
        title: `버전 이력 (${(p.versions || []).length}건)`,
        rows: (p.versions || []).slice().sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).map(v => ({
          category: v.category, version: v.version,
          releaseDate: v.releaseDate || '-', author: v.author || '-', note: v.note || '-'
        })),
        columns: [
          { header: '카테고리', key: 'category' }, { header: '버전', key: 'version' },
          { header: '배포일', key: 'releaseDate' }, { header: '등록자', key: 'author' }, { header: '변경 내용', key: 'note' }
        ]
      });

      // 출장 일정
      sections.push({
        title: `출장 일정 (${(p.trips || []).length}건)`,
        rows: (p.trips || []).map(tr => ({
          engineerName: tr.engineerName || '-',
          departureDate: tr.departureDate || '-', returnDate: tr.returnDate || '-',
          note: tr.note || '-', createdBy: tr.createdBy || '-', createdAt: tr.createdAt || '-'
        })),
        columns: [
          { header: '엔지니어', key: 'engineerName' },
          { header: '출발일', key: 'departureDate' }, { header: '복귀일', key: 'returnDate' },
          { header: '메모', key: 'note' }, { header: '등록자', key: 'createdBy' }, { header: '등록일', key: 'createdAt' }
        ]
      });

      // 추가 대응 작업 (검수 후)
      sections.push({
        title: `추가 대응 작업 (${(p.extraTasks || []).length}건)`,
        rows: (p.extraTasks || []).map(et => ({
          type: et.type, name: et.name, requester: et.requester || '-',
          status: et.status, startDate: et.startDate || '-', endDate: et.endDate || '-',
          note: et.note || '-', createdBy: et.createdBy || '-', createdAt: et.createdAt || '-'
        })),
        columns: [
          { header: '유형', key: 'type' }, { header: '작업 내용', key: 'name' }, { header: '요청자', key: 'requester' },
          { header: '상태', key: 'status' }, { header: '시작일', key: 'startDate' }, { header: '종료일', key: 'endDate' },
          { header: '메모', key: 'note' }, { header: '등록자', key: 'createdBy' }, { header: '등록일', key: 'createdAt' }
        ]
      });

      // 체크리스트
      sections.push({
        title: `디지털 검수표 (${(p.checklist || []).length}건)`,
        rows: (p.checklist || []).map(c => ({ category: c.category, task: c.task, status: c.status, note: c.note || '-' })),
        columns: [{ header: '카테고리', key: 'category' }, { header: '점검 항목', key: 'task' }, { header: '결과', key: 'status' }, { header: '비고', key: 'note' }]
      });

      // 연관 이슈
      sections.push({
        title: `연관 이슈 (${prjIssues.length}건)`,
        rows: prjIssues.map(i => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, author: i.author, date: i.date, comments: (i.comments || []).length })),
        columns: [{ header: 'ID', key: 'id' }, { header: '제목', key: 'title' }, { header: '심각도', key: 'severity' }, { header: '상태', key: 'status' }, { header: '작성자', key: 'author' }, { header: '일자', key: 'date' }, { header: '코멘트', key: 'comments' }]
      });

      // 공유 노트
      sections.push({
        title: `공유 노트 (${(p.notes || []).length}건)`,
        rows: (p.notes || []).map(n => ({ author: n.author, date: n.date, text: n.text })),
        columns: [{ header: '작성자', key: 'author' }, { header: '일시', key: 'date' }, { header: '내용', key: 'text' }]
      });

      // 고객 요청사항
      sections.push({
        title: `고객 요청사항 (${(p.customerRequests || []).length}건)`,
        rows: (p.customerRequests || []).map(r => ({
          requester: r.requester, urgency: r.urgency, status: r.status, content: r.content,
          date: r.date, responses: (r.responses || []).map(res => `[${res.author}] ${res.text}`).join(' / ')
        })),
        columns: [{ header: '요청자', key: 'requester' }, { header: '긴급도', key: 'urgency' }, { header: '상태', key: 'status' }, { header: '요청 내용', key: 'content' }, { header: '일자', key: 'date' }, { header: '응답 이력', key: 'responses' }]
      });

      // AS 내역
      sections.push({
        title: `AS 내역 (${(p.asRecords || []).length}건)`,
        rows: (p.asRecords || []).map(a => ({ type: a.type, engineer: a.engineer, status: a.status, description: a.description, resolution: a.resolution, date: a.date })),
        columns: [{ header: '유형', key: 'type' }, { header: '담당 엔지니어', key: 'engineer' }, { header: '상태', key: 'status' }, { header: '증상', key: 'description' }, { header: '조치', key: 'resolution' }, { header: '일자', key: 'date' }]
      });

      // 담당자 변경 이력
      sections.push({
        title: `담당자 변경 이력 (${(p.managerHistory || []).length}건)`,
        rows: (p.managerHistory || []).map(h => ({ from: h.from, to: h.to, reason: h.reason || '-', changedBy: h.changedBy, date: h.date })),
        columns: [{ header: '이전 담당자', key: 'from' }, { header: '새 담당자', key: 'to' }, { header: '사유', key: 'reason' }, { header: '변경자', key: 'changedBy' }, { header: '일자', key: 'date' }]
      });

      // 활동 이력
      sections.push({
        title: `활동 이력 (${(p.activityLog || []).length}건)`,
        rows: (p.activityLog || []).map(log => ({ date: log.date, user: log.user, type: log.type, detail: log.detail })),
        columns: [{ header: '일시', key: 'date' }, { header: '작성자', key: 'user' }, { header: '유형', key: 'type' }, { header: '상세', key: 'detail' }]
      });

      sheets.push({ name: sheetName, sections });
    });

    exportSectionedExcel('프로젝트_상세_전체', sheets);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold">{t('프로젝트 관리', 'Projects')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExportList} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm" title={t('간단 리스트 Excel', 'Simple list Excel')}><Download size={16} className="mr-1.5" /> {t('리스트 (Excel)', 'List (Excel)')}</button>
          <button onClick={handleExportDetail} className="flex items-center bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors shadow-sm" title={t('프로젝트별 시트 분리 Excel', 'Per-project sheets')}><Download size={16} className="mr-1.5" /> {t('상세 (Excel)', 'Detail (Excel)')}</button>
          {currentUser.role !== 'CUSTOMER' && (
            <div className="flex items-center bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400 mr-2" />
              <select className="text-sm border-none outline-none bg-transparent text-slate-700 font-medium cursor-pointer" value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
                <option value="all">{t('전체 담당자', 'All Managers')}</option>
                {managers.filter(m => m !== 'all').map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
          )}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><AlignJustify size={16} className="mr-1.5" /> {t('리스트', 'List')}</button>
            <button onClick={() => setViewMode('gantt')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><CalendarDays size={16} className="mr-1.5" /> {t('간트차트', 'Gantt')}</button>
          </div>
          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
            <button onClick={onAddClick} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><Plus size={16} className="mr-1" /> {t('새 프로젝트', 'New Project')}</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="divide-y divide-slate-200" style={{ minWidth: '1200px', width: '100%' }}>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[250px]">{t('프로젝트명 / 진행 단계', 'Project / Phase')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[150px]">{t('고객사/사이트', 'Client/Site')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[120px]">{t('담당자', 'Manager')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[150px]">{t('버전 (HW/SW/FW)', 'Versions')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[200px]">{t('진척도 (계획 / 실적)', 'Progress')}</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase min-w-[80px]">{t('단계 간트', 'Gantt')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[140px]">{t('관리', 'Manage')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-10 text-slate-400">{t('프로젝트가 없습니다.', 'No projects found.')}</td></tr>
                ) : filteredProjects.map((prj) => {
                  const expected = calcExp(prj.startDate, prj.dueDate);
                  const actual = calcAct(prj.tasks);
                  const isDelayed = actual < expected;
                  const projectIssues = issues.filter(i => i.projectId === prj.id && i.status !== '조치 완료');

                  return (
                  <React.Fragment key={prj.id}>
                  <tr className="hover:bg-slate-50 group align-middle">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                      <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} t={t} />
                      <ProjectNotesBadge prjId={prj.id} notes={prj.notes} openId={openNotesDropdownId} setOpenId={setOpenNotesDropdownId} onJump={() => onManageTasks && onManageTasks(prj.id)} t={t} />
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center flex-wrap gap-y-1">
                      {prj.name}
                      <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">{prj.domain}</span>
                      {(() => {
                        const valid = (v) => v != null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'null' && String(v).trim().toLowerCase() !== 'undefined';
                        if (!BATTERY_DOMAINS.includes(prj.domain)) return null;
                        if (!valid(prj.voltage) && !valid(prj.current) && !valid(prj.spec)) return null;
                        return (
                          <span className="ml-1 inline-flex items-center gap-1">
                            {valid(prj.voltage) && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200" title={t('전압', 'Voltage')}>{prj.voltage}</span>}
                            {valid(prj.current) && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200" title={t('전류', 'Current')}>{prj.current}</span>}
                            {valid(prj.spec) && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200" title={t('사양', 'Spec')}>{prj.spec}</span>}
                          </span>
                        );
                      })()}
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onEditProject(prj)} className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition-colors" title={t('프로젝트 정보 수정', 'Edit Project')}>
                          <Edit size={10} className="mr-0.5" />{t('수정', 'Edit')}
                        </button>
                      )}
                    </div>
                    {Array.isArray(prj.equipments) && prj.equipments.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold mr-0.5">{t('장비', 'Eq.')}</span>
                        {prj.equipments.slice(0, 4).map(eq => (
                          <span key={eq.id} className="inline-flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200 font-mono" title={eq.name ? `${eq.code} — ${eq.name}${eq.note ? ` (${eq.note})` : ''}` : eq.code}>
                            {eq.code}
                          </span>
                        ))}
                        {prj.equipments.length > 4 && (
                          <span className="text-[10px] text-slate-500 font-bold">+{prj.equipments.length - 4}</span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 flex items-center mt-1"><Clock size={12} className="mr-1" /> {fmtYMD(prj.startDate) || <span className="italic text-amber-600">미정</span>} ~ {fmtYMD(prj.dueDate) || <span className="italic text-amber-600">미정</span>}</div>
                    <ProjectPipelineStepper phases={prj.phases} currentPhase={prj.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={prj.id} role={currentUser.role} onEditPhases={onEditPhases} />
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {(() => {
                      const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'PM';
                      const handleClick = () => { if (canEdit) onEditProject(prj); };
                      return (
                        <button
                          type="button"
                          onClick={handleClick}
                          disabled={!canEdit}
                          className={`text-left p-1.5 -m-1.5 rounded transition-colors ${canEdit ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}`}
                          title={canEdit ? t('클릭하여 고객사/사이트/일정 수정', 'Click to edit') : ''}
                        >
                          <div className="text-sm text-slate-900 flex items-center">
                            {prj.customer}
                            {canEdit && <Edit size={10} className="ml-1.5 text-slate-300" />}
                          </div>
                          <div className="text-xs text-slate-500">{prj.site}</div>
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {(() => {
                      const extras = (engineers || []).filter(e => Array.isArray(e.assignedProjectIds) && e.assignedProjectIds.includes(prj.id) && e.name !== prj.manager);
                      const tripCount = (prj.trips || []).length;
                      const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'PM';
                      const handleClick = () => { if (canEdit && onManageTeam) onManageTeam(prj); };
                      return (
                        <button
                          type="button"
                          onClick={handleClick}
                          disabled={!canEdit}
                          className={`text-left w-full p-2 -m-2 rounded-lg transition-colors ${canEdit ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`}
                          title={canEdit ? t('클릭하여 담당자/추가 인력/출장 일정 관리', 'Click to manage team & trips') : ''}
                        >
                          <div className="text-sm text-slate-700 flex items-center font-bold">
                            <User size={14} className="mr-1.5 text-slate-400" />{prj.manager || t('미지정', 'Unassigned')}
                            {canEdit && <Edit size={10} className="ml-1.5 text-slate-300" />}
                          </div>
                          {extras.length > 0 && (
                            <div className="mt-1 flex items-center text-[10px] text-slate-500" title={extras.map(e => e.name).join(', ')}>
                              <Users size={10} className="mr-1" />{t('추가 인력', 'Team')} {extras.length}{t('명', '')}
                            </div>
                          )}
                          {tripCount > 0 && (
                            <div className="mt-1 flex items-center text-[10px] text-purple-600 font-bold"><Plane size={10} className="mr-1" />{t('출장', 'Trips')} {tripCount}{t('건', '')}</div>
                          )}
                          {prj.managerHistory?.length > 0 && (
                            <div className="mt-1 flex items-center text-[10px] text-slate-400"><History size={10} className="mr-1" />{t('변경', 'Changed')} {prj.managerHistory.length}{t('회', 'x')}</div>
                          )}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {(() => {
                      const versions = prj.versions || [];
                      // 카테고리별 최신
                      const latest = {};
                      versions.forEach(v => {
                        if (!latest[v.category]) latest[v.category] = v;
                        else {
                          const a = new Date(latest[v.category].releaseDate || 0);
                          const b = new Date(v.releaseDate || 0);
                          if (b > a || (b.getTime() === a.getTime() && v.id > latest[v.category].id)) latest[v.category] = v;
                        }
                      });
                      // 도메인 추천 카테고리 순서로 정렬 (인덱스 통일)
                      const recommended = DOMAIN_VERSION_CATEGORIES[prj.domain] || DEFAULT_VERSION_CATEGORIES;
                      const rank = new Map();
                      recommended.forEach((c, i) => rank.set(c, i));
                      const cats = Object.keys(latest).sort((a, b) => {
                        const ra = rank.has(a) ? rank.get(a) : 999;
                        const rb = rank.has(b) ? rank.get(b) : 999;
                        if (ra !== rb) return ra - rb;
                        return a.localeCompare(b);
                      });
                      const canEdit = currentUser.role !== 'CUSTOMER';
                      return (
                        <button
                          type="button"
                          onClick={() => canEdit && onEditVersion(prj)}
                          disabled={!canEdit}
                          className={`text-left p-1.5 -m-1.5 rounded-lg transition-colors w-full ${canEdit ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}`}
                          title={canEdit ? t('클릭하여 버전 관리', 'Click to manage versions') : ''}
                        >
                          {cats.length === 0 ? (
                            <div className="text-xs text-slate-400 flex items-center">
                              <HardDrive size={14} className="mr-1.5" />
                              {t('버전 미등록', 'No versions')}
                              {canEdit && <Edit size={10} className="ml-1.5 text-slate-300" />}
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {cats.map(cat => {
                                const v = latest[cat];
                                const Icon = cat === 'HW' ? HardDrive : cat === 'SW' ? Monitor : Cpu;
                                const colorCls = cat === 'HW' ? 'text-amber-500'
                                  : cat === 'SW' ? 'text-blue-500'
                                  : cat.includes('충방전기') ? 'text-purple-500'
                                  : cat.includes('인터페이스') ? 'text-pink-500'
                                  : 'text-emerald-500';
                                return (
                                  <div key={cat} className="flex items-center text-xs">
                                    <Icon size={13} className={`mr-1.5 shrink-0 ${colorCls}`} />
                                    <span className="font-medium text-slate-700 mr-1">{cat}:</span>
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px] truncate">{v.version}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap min-w-[150px]">
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t('계획', 'Exp')}: {expected}%</span>
                        <span className={`font-bold ${isDelayed && prj.status !== '완료' ? 'text-red-600' : 'text-blue-600'}`}>{t('실적', 'Act')}: {actual}%</span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2.5">
                        <div className="absolute top-0 left-0 h-2.5 bg-slate-300 opacity-50 rounded-full" style={{ width: `${expected}%` }}></div>
                        <div className={`absolute top-0 left-0 h-2.5 rounded-full ${prj.status === '완료' ? 'bg-emerald-500' : (isDelayed ? 'bg-red-500' : 'bg-blue-600')}`} style={{ width: `${actual}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap text-center">
                    <button onClick={() => setExpandedGanttId(expandedGanttId === prj.id ? null : prj.id)} className={`inline-flex items-center text-xs px-3 py-2 rounded-lg border font-bold transition-colors shadow-sm ${expandedGanttId === prj.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'}`}>
                      <CalendarDays size={14} className="mr-1" />
                      {expandedGanttId === prj.id ? t('접기', 'Close') : t('보기', 'View')}
                      {expandedGanttId === prj.id ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                    </button>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap align-middle text-center">
                    <button onClick={() => onManageTasks(prj.id)} className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                      <ListTodo size={14} className="mr-1.5"/>{currentUser.role === 'CUSTOMER' ? t('상세 보기', 'View') : t('관리하기', 'Manage')}
                    </button>
                  </td>
                </tr>
                {expandedGanttId === prj.id && (
                  <tr className="bg-slate-50">
                    <td colSpan="7" className="px-6 py-5">
                      {(() => {
                        const pStartDate = safeDate(prj.startDate);
                        const pDueDate = safeDate(prj.dueDate);
                        if (!pStartDate || !pDueDate) {
                          return (
                            <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 text-center">
                              <div className="text-3xl mb-2">📅</div>
                              <p className="text-sm font-bold text-amber-700">{t('프로젝트 일정이 미정입니다.', 'Project schedule is TBD.')}</p>
                              <p className="text-xs text-slate-500 mt-1">{t('시작일/납기일을 입력하면 단계별 간트가 표시됩니다.', 'Set start/due dates to see the phase Gantt chart.')}</p>
                            </div>
                          );
                        }
                        const totalDays = (pDueDate - pStartDate) / (1000 * 60 * 60 * 24);
                        const currentPhaseIdx = typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0;
                        const phaseCount = PROJECT_PHASES.length;
                        const daysPerPhase = totalDays / phaseCount;
                        const phaseColors = ['bg-slate-400', 'bg-blue-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-amber-400', 'bg-purple-400', 'bg-emerald-400'];

                        // 차트 범위 — 프로젝트 일정 + 모든 셋업 작업 일정 + 모든 출장 일정 포함하도록 확장 (빈 영역 방지)
                        const allStarts = [pStartDate];
                        const allEnds = [pDueDate];
                        (prj.tasks || []).forEach(tk => {
                          const s = safeDate(tk.startDate);
                          const e = safeDate(tk.endDate);
                          if (s) allStarts.push(s);
                          if (e) allEnds.push(e);
                        });
                        (prj.trips || []).forEach(tr => {
                          const s = safeDate(tr.departureDate);
                          const e = safeDate(tr.returnDate);
                          if (s) allStarts.push(s);
                          if (e) allEnds.push(e);
                        });
                        const minTime = Math.min(...allStarts.map(d => d.getTime()));
                        const maxTime = Math.max(...allEnds.map(d => d.getTime()));
                        const gMinDate = new Date(minTime); gMinDate.setDate(1);
                        const gMaxDate = new Date(maxTime); gMaxDate.setMonth(gMaxDate.getMonth() + 1, 0);
                        const fullDays = (gMaxDate - gMinDate) / (1000 * 60 * 60 * 24);

                        // 월별 + 일별 눈금 (주 단위) — 0~100% 구간을 빠짐없이 채움
                        const months = [];
                        const days = [];
                        const cursor = new Date(gMinDate);
                        while (cursor <= gMaxDate) {
                          const pos = ((cursor - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100;
                          months.push({ label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`, pos });
                          cursor.setMonth(cursor.getMonth() + 1);
                        }
                        // 일 눈금: 전체 기간에 따라 간격 조정
                        const dayStep = fullDays > 180 ? 14 : fullDays > 90 ? 7 : fullDays > 30 ? 3 : 1;
                        const dCursor = new Date(gMinDate);
                        while (dCursor <= gMaxDate) {
                          const pos = ((dCursor - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100;
                          days.push({ label: String(dCursor.getDate()).padStart(2, '0'), pos });
                          dCursor.setDate(dCursor.getDate() + dayStep);
                        }
                        // 마지막 라벨이 100%에 못 미치면 gMaxDate 라벨을 100%에 추가 (우측 빈 공간 방지)
                        if (!days.length || days[days.length - 1].pos < 99) {
                          days.push({ label: String(gMaxDate.getDate()).padStart(2, '0'), pos: 100 });
                        }

                        const today = new Date();
                        const todayPercent = Math.max(0, Math.min(100, ((today - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100));

                        // 경과/잔여 일자 계산
                        const elapsedDays = Math.max(0, Math.floor((today - pStartDate) / (1000 * 60 * 60 * 24)));
                        const remainingDays = Math.max(0, Math.floor((pDueDate - today) / (1000 * 60 * 60 * 24)));
                        const totalDaysInt = Math.floor(totalDays);

                        const setupTasks = (prj.tasks || []).map((tk, ix) => {
                          const s = safeDate(tk.startDate);
                          const e = safeDate(tk.endDate);
                          return { name: tk.name || `Step ${ix + 1}`, start: s, end: e, isCompleted: !!tk.isCompleted, hasSchedule: !!(s && e), isMilestone: !!tk.isMilestone };
                        });
                        const setupWithSchedule = setupTasks.filter(t => t.hasSchedule).length;

                        return (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">{t('간트 차트', 'Gantt Chart')}</h3>
                                <p className="text-xs text-slate-500">{prj.name}  ·  {fmtYMD(prj.startDate) || '미정'} ~ {fmtYMD(prj.dueDate) || '미정'}  ({t('총', 'Total')} {totalDaysInt}{t('일', 'd')})</p>
                              </div>
                              <div className="flex space-x-2 text-xs">
                                <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded">
                                  <span className="text-slate-500">{t('경과', 'Elapsed')}</span> <strong className="text-blue-700 ml-1">{elapsedDays}{t('일', 'd')}</strong>
                                </div>
                                <div className="px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded">
                                  <span className="text-slate-500">{t('잔여', 'Remaining')}</span> <strong className="text-orange-700 ml-1">{remainingDays}{t('일', 'd')}</strong>
                                </div>
                              </div>
                            </div>

                            {/* 탭 — 단계별 / 셋업 + 줌 컨트롤 */}
                            <div className="flex border-b border-slate-200 mb-4 items-center">
                              <button
                                onClick={() => setExpandedGanttTab('phase')}
                                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${expandedGanttTab === 'phase' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                              >
                                {t('단계별', 'Phases')} <span className="text-[10px] text-slate-400 font-medium ml-0.5">({phaseCount})</span>
                              </button>
                              <button
                                onClick={() => setExpandedGanttTab('setup')}
                                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${expandedGanttTab === 'setup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                              >
                                {t('셋업 일정', 'Setup Tasks')} <span className="text-[10px] text-slate-400 font-medium ml-0.5">({setupWithSchedule}/{setupTasks.length})</span>
                              </button>
                              <div className="ml-auto flex items-center gap-1.5 pb-1">
                                <span className="text-[10px] text-slate-400 mr-1 hidden md:inline">{t('휠 = 줌 / Shift+휠 = 가로 이동', 'Wheel = zoom / Shift+wheel = scroll')}</span>
                                <button onClick={() => setInlineGanttZoom(Math.max(0.5, +(inlineGanttZoom - 0.25).toFixed(2)))} disabled={inlineGanttZoom <= 0.5} className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('축소', 'Zoom out')}>
                                  <ZoomOut size={14} />
                                </button>
                                <span className="text-xs font-bold text-slate-700 px-2 py-1 min-w-[3rem] text-center bg-white border border-slate-200 rounded-md shadow-sm">{Math.round(inlineGanttZoom * 100)}%</span>
                                <button onClick={() => setInlineGanttZoom(Math.min(4, +(inlineGanttZoom + 0.25).toFixed(2)))} disabled={inlineGanttZoom >= 4} className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('확대', 'Zoom in')}>
                                  <ZoomIn size={14} />
                                </button>
                                <button onClick={() => { setTimeout(() => { const n = inlineGanttScrollRef.current; if (!n) return; const inner = n.firstElementChild; if (!inner) return; const today = new Date(); const todayPctVal = ((today - gMinDate) / (1000 * 60 * 60 * 24) / fullDays); const oneMonth = 30 / fullDays; const tgt = Math.max(0, todayPctVal - oneMonth); n.scrollLeft = tgt * inner.scrollWidth; }, 30); }} className="inline-flex items-center px-2.5 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-sm transition-colors ml-1" title={t('오늘로 이동', 'Jump to today')}>
                                  <Maximize2 size={12} className="mr-1" />{t('오늘', 'Today')}
                                </button>
                              </div>
                            </div>

                            {(() => {
                              // 좌측 행 데이터 + 우측 바 데이터를 같은 인덱스로 동기화
                              const ROW_H = 'h-12';
                              const HEADER_H = 'h-14'; // pt-6(오늘 라벨 자리) + 헤더
                              // 차트 최소 너비 — 부모가 더 넓으면 부모 폭으로 늘어남(w-full)
                              // days 배열은 위에서 이미 0~100% 채움
                              const daysFilled = days;

                              // 출장 데이터 (현재 프로젝트 trips) — 상단 별도 행으로 표시
                              const tripRows = (prj.trips || [])
                                .map(tr => {
                                  const s = safeDate(tr.departureDate);
                                  const e = safeDate(tr.returnDate);
                                  if (!s || !e) return null;
                                  return {
                                    kind: 'trip',
                                    name: `${tr.engineerName || '담당자'} ${t('출장', 'Trip')}`,
                                    start: s, end: e, hasSch: true,
                                    leftPercent: ((s - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100,
                                    widthPercent: ((e - s) / (1000 * 60 * 60 * 24) / fullDays) * 100,
                                    barBg: 'bg-indigo-400'
                                  };
                                })
                                .filter(Boolean);

                              const phaseRows = PROJECT_PHASES.map((phase, idx) => {
                                const def = (prj.phases || [])[idx];
                                const isMilestone = !!(def && def.isMilestone);
                                const phaseStart = new Date(pStartDate.getTime() + daysPerPhase * idx * 24 * 60 * 60 * 1000);
                                const phaseEnd = new Date(pStartDate.getTime() + daysPerPhase * (idx + 1) * 24 * 60 * 60 * 1000);
                                const isPast = idx < currentPhaseIdx;
                                const isCurrent = idx === currentPhaseIdx;
                                return {
                                  kind: 'phase', name: phase, start: phaseStart, end: phaseEnd,
                                  isPast, isCurrent, hasSch: true, isMilestone,
                                  leftPercent: ((phaseStart - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100,
                                  widthPercent: ((phaseEnd - phaseStart) / (1000 * 60 * 60 * 24) / fullDays) * 100,
                                  barBg: isPast ? 'bg-emerald-300' : isCurrent ? 'bg-teal-500' : 'bg-slate-200'
                                };
                              });

                              // 셋업 작업별 색 회전 팔레트 (작업끼리 시각 구분)
                              const SETUP_PALETTE = ['bg-blue-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400', 'bg-cyan-400', 'bg-orange-400', 'bg-teal-400', 'bg-pink-400'];
                              const setupRows = setupTasks.map((tk, ix) => ({
                                kind: 'setup', name: tk.name, start: tk.start, end: tk.end,
                                isCompleted: tk.isCompleted, hasSch: tk.hasSchedule,
                                isMilestone: !!tk.isMilestone,
                                leftPercent: tk.hasSchedule ? ((tk.start - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100 : 0,
                                widthPercent: tk.hasSchedule ? ((tk.end - tk.start) / (1000 * 60 * 60 * 24) / fullDays) * 100 : 0,
                                barBg: tk.isCompleted ? 'bg-emerald-300' : SETUP_PALETTE[ix % SETUP_PALETTE.length]
                              }));

                              const rows = [...tripRows, ...(expandedGanttTab === 'phase' ? phaseRows : setupRows)];

                              if (expandedGanttTab === 'setup' && setupTasks.length === 0) {
                                return <div className="text-center py-8 text-sm text-slate-400 italic">{t('셋업 일정이 없습니다.', 'No setup tasks.')}</div>;
                              }
                              if (expandedGanttTab === 'setup' && setupWithSchedule === 0) {
                                return <div className="text-center py-8 text-sm text-amber-600">{t('등록된 셋업 항목에 시작일/종료일이 없습니다. 프로젝트 상세에서 일정을 입력하세요.', 'No setup tasks have schedules. Set start/end dates in project details.')}</div>;
                              }

                              return (
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                                  {/* 좌측 고정 칸 — 이름/날짜, 가로 스크롤과 무관 */}
                                  <div className="w-64 shrink-0 bg-white border-r border-slate-200">
                                    <div className={`${HEADER_H} bg-slate-50 px-3 flex items-end pb-1 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase`}>
                                      {expandedGanttTab === 'phase' ? t('단계 / 일정', 'Phase / Date') : t('작업 / 일정', 'Task / Date')}
                                    </div>
                                    {rows.map((r, idx) => (
                                      <div key={idx} className={`${ROW_H} px-2 flex items-center border-b border-slate-100 last:border-b-0 ${r.kind === 'trip' ? 'bg-indigo-50/60' : ''}`}>
                                        <span className="w-5 h-5 flex items-center justify-center mr-2 shrink-0">
                                          {r.kind === 'trip' ? (
                                            <Plane size={13} className="text-indigo-500" />
                                          ) : r.isMilestone ? (
                                            <span className="text-rose-500 text-base leading-none">◆</span>
                                          ) : r.kind === 'phase' ? (
                                            r.isPast ? <span className="text-emerald-500 text-sm font-bold">✓</span>
                                            : r.isCurrent ? <span className="text-teal-600 text-sm">▶</span>
                                            : <span className="w-3 h-3 rounded-full border-2 border-slate-300 inline-block"></span>
                                          ) : (
                                            r.isCompleted ? <span className="text-emerald-500 text-sm font-bold">✓</span>
                                            : r.hasSch ? <span className="w-3 h-3 rounded-full border-2 border-blue-400 inline-block"></span>
                                            : <span className="w-3 h-3 rounded-full border-2 border-slate-200 inline-block"></span>
                                          )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className={`text-sm font-semibold truncate ${
                                            r.kind === 'trip' ? 'text-indigo-700'
                                            : r.isMilestone ? 'text-rose-700'
                                            : r.kind === 'phase'
                                              ? (r.isPast ? 'text-slate-400' : r.isCurrent ? 'text-slate-800' : 'text-slate-500')
                                              : (r.isCompleted ? 'text-slate-400 line-through' : r.hasSch ? 'text-slate-800' : 'text-slate-400')
                                          }`} title={r.name}>
                                            {r.name}
                                            {r.isMilestone && <span className="ml-1 text-[9px] bg-rose-50 text-rose-700 px-1 py-0.5 rounded font-bold border border-rose-200">SOP</span>}
                                          </div>
                                          {r.hasSch ? (
                                            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{fmtYMD(r.start)} ~ {fmtYMD(r.end)}</div>
                                          ) : (
                                            <div className="text-[10px] text-amber-600 font-bold mt-0.5">{t('일정 미정', 'No schedule')}</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* 우측 차트 영역 — 퍼센트 기반 너비 (zoom = % 배수) + 휠 줌 */}
                                  <div className="flex-1 overflow-x-auto min-w-0" ref={inlineGanttScrollRef}>
                                    <div className="relative" style={{ width: `${100 * inlineGanttZoom}%`, minWidth: '100%' }}>
                                      {/* 월/일 헤더 (sticky-top) — 위쪽 pt-6 영역에 오늘 라벨이 별도로 표시됨 */}
                                      <div className={`sticky top-0 z-30 bg-slate-50 border-b border-slate-200 ${HEADER_H} relative pt-6`}>
                                        <div className="relative h-5">
                                          {months.map((m, i) => {
                                            const next = months[i + 1];
                                            const widthPct = next ? next.pos - m.pos : 100 - m.pos;
                                            return (
                                              <div key={i} className="absolute h-full" style={{ left: `${m.pos}%`, width: `${widthPct}%` }}>
                                                <div className="sticky left-0 inline-block whitespace-nowrap text-xs font-bold text-slate-700 border-l-2 border-slate-300 pl-1 bg-slate-50">{m.label}</div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <div className="relative h-5">
                                          {daysFilled.map((d, i) => (
                                            <div key={i} className="absolute text-[9px] text-slate-400 border-l border-slate-200 pl-0.5" style={{ left: `${d.pos}%`, transform: d.pos >= 99 ? 'translateX(-100%)' : 'none' }}>{d.label}</div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* 오늘 라벨 — 헤더 pt-6 공간 안쪽에 위치(잘림 방지), 점선은 헤더~막대 끝까지 */}
                                      <div className="absolute z-40 pointer-events-none" style={{ left: `${todayPercent}%`, top: 0, bottom: 0 }}>
                                        <div className="absolute top-0.5 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-red-600 leading-tight">
                                          ▼ {t('오늘', 'Today')}
                                        </div>
                                        <div className="absolute top-7 bottom-0 left-0 border-l-2 border-dashed border-red-500 -translate-x-1/2"></div>
                                      </div>

                                      {/* 막대 행들 */}
                                      {rows.map((r, idx) => (
                                        <div key={idx} className={`${ROW_H} relative border-b border-slate-100 last:border-b-0 ${r.kind === 'trip' ? 'bg-indigo-50/40' : ''}`}>
                                          {months.map((m, i) => (
                                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                                          ))}
                                          {r.hasSch && (
                                            <div className="absolute inset-y-0 flex items-center" style={{ left: 0, right: 0 }}>
                                              {!r.isMilestone && (
                                                <>
                                                  <div className={`absolute h-5 rounded-sm ${r.barBg} ${r.kind === 'trip' ? 'ring-1 ring-indigo-500' : ''}`} style={{ left: `${r.leftPercent}%`, width: `${Math.max(r.widthPercent, 1)}%` }} title={r.name}></div>
                                                  {r.kind === 'setup' && (
                                                    <span className="absolute text-[10px] font-bold text-slate-700 whitespace-nowrap pointer-events-none" style={{ left: `calc(${r.leftPercent + Math.max(r.widthPercent, 1)}% + 0.5rem)` }}>{r.name}</span>
                                                  )}
                                                  {r.kind === 'trip' && (
                                                    <span className="absolute text-[10px] font-bold text-indigo-700 whitespace-nowrap pointer-events-none" style={{ left: `calc(${r.leftPercent + Math.max(r.widthPercent, 1)}% + 0.5rem)` }}>
                                                      {fmtYMD(r.start).slice(5).replace('-','/')} ~ {fmtYMD(r.end).slice(5).replace('-','/')}
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                              {/* 마일스톤 — 종료일 위치에 다이아몬드 + 라벨 */}
                                              {r.isMilestone && (
                                                <div className="absolute" style={{ left: `${r.leftPercent + r.widthPercent}%`, transform: 'translateX(-50%)' }}>
                                                  <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-rose-700 font-bold whitespace-nowrap mb-0.5">{fmtYMD(r.end).slice(5).replace('-', '/')} (SOP)</span>
                                                    <span className="text-rose-500 text-xl leading-none drop-shadow">◆</span>
                                                  </div>
                                                </div>
                                              )}
                                              {r.isCurrent && !r.isMilestone && (
                                                <span className="absolute text-xs text-teal-700 font-bold" style={{ left: `calc(${r.leftPercent + r.widthPercent}% + 0.5rem)` }}>{t('진행중', 'Active')}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 범례 */}
                            <div className="flex items-center mt-6 pt-4 border-t border-slate-100 space-x-6 text-xs text-slate-500 flex-wrap gap-y-1">
                              {expandedGanttTab === 'phase' ? (
                                <>
                                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-emerald-300 mr-2"></span>{t('완료된 단계', 'Completed')}</div>
                                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-teal-500 mr-2"></span>{t('현재 단계', 'Current')}</div>
                                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-slate-200 mr-2"></span>{t('예정 단계', 'Planned')}</div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-emerald-300 mr-2"></span>{t('완료된 작업', 'Completed task')}</div>
                                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-blue-400 mr-2"></span>{t('진행 예정', 'Planned task')}</div>
                                  <div className="flex items-center"><span className="text-amber-600 font-bold">●</span><span className="ml-1">{t('일정 미정 항목은 막대 표시 안 됨', 'Tasks without schedule are not drawn')}</span></div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                )}
                </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        ) : (() => {
          // 간트차트 탭 — 인라인 간트와 동일 스타일 적용
          const PROJECT_BAR_COLORS = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400', 'bg-pink-400'];
          // 동적 Tailwind 클래스 회피 위해 명시적 매핑
          const COLOR_HEADER = {
            'bg-blue-400': { bg: 'bg-blue-50', border: 'border-blue-300', stripe: 'bg-blue-400' },
            'bg-emerald-400': { bg: 'bg-emerald-50', border: 'border-emerald-300', stripe: 'bg-emerald-400' },
            'bg-amber-400': { bg: 'bg-amber-50', border: 'border-amber-300', stripe: 'bg-amber-400' },
            'bg-purple-400': { bg: 'bg-purple-50', border: 'border-purple-300', stripe: 'bg-purple-400' },
            'bg-rose-400': { bg: 'bg-rose-50', border: 'border-rose-300', stripe: 'bg-rose-400' },
            'bg-cyan-400': { bg: 'bg-cyan-50', border: 'border-cyan-300', stripe: 'bg-cyan-400' },
            'bg-indigo-400': { bg: 'bg-indigo-50', border: 'border-indigo-300', stripe: 'bg-indigo-400' },
            'bg-orange-400': { bg: 'bg-orange-50', border: 'border-orange-300', stripe: 'bg-orange-400' },
            'bg-teal-400': { bg: 'bg-teal-50', border: 'border-teal-300', stripe: 'bg-teal-400' },
            'bg-pink-400': { bg: 'bg-pink-50', border: 'border-pink-300', stripe: 'bg-pink-400' }
          };
          const minD = ganttRange.minDate;
          const maxD = ganttRange.maxDate;
          const fullD = ganttRange.totalDays;
          const todayD = new Date();
          const todayPct = Math.max(0, Math.min(100, ((todayD - minD) / (1000 * 60 * 60 * 24) / fullD) * 100));

          // 월별 / 일별 라벨 생성
          const monthsArr = [];
          const cur = new Date(minD); cur.setDate(1);
          while (cur <= maxD) {
            const pos = ((cur - minD) / (1000 * 60 * 60 * 24) / fullD) * 100;
            if (pos >= 0 && pos <= 100) monthsArr.push({ label: `${cur.getFullYear()}.${String(cur.getMonth() + 1).padStart(2, '0')}`, pos });
            cur.setMonth(cur.getMonth() + 1);
          }
          const dayStep = fullD > 180 ? 14 : fullD > 90 ? 7 : fullD > 30 ? 3 : 1;
          const daysArr = [];
          const dC = new Date(minD);
          while (dC <= maxD) {
            const pos = ((dC - minD) / (1000 * 60 * 60 * 24) / fullD) * 100;
            daysArr.push({ label: String(dC.getDate()).padStart(2, '0'), pos });
            dC.setDate(dC.getDate() + dayStep);
          }
          if (!daysArr.length || daysArr[daysArr.length - 1].pos < 99) {
            daysArr.push({ label: String(maxD.getDate()).padStart(2, '0'), pos: 100 });
          }

          // 프로젝트 다중 선택 필터 — null이면 전체, 배열이면 그 ID만
          const ganttFiltered = ganttFilterIds === null
            ? filteredProjects
            : filteredProjects.filter(p => ganttFilterIds.includes(p.id));
          const filterKw = ganttFilterSearch.trim().toLowerCase();
          const filterableProjects = filterKw
            ? filteredProjects.filter(p => [p.name, p.customer, p.site, p.manager].filter(Boolean).some(v => String(v).toLowerCase().includes(filterKw)))
            : filteredProjects;

          // 셋업 탭 — 필터된 프로젝트의 셋업 작업을 프로젝트별 그룹으로 표시
          const setupGroups = ganttFiltered.map((prj, pidx) => {
            const projColor = PROJECT_BAR_COLORS[pidx % PROJECT_BAR_COLORS.length];
            const tasks = (prj.tasks || [])
              .map(tk => {
                const ts = safeDate(tk.startDate);
                const te = safeDate(tk.endDate);
                if (!ts || !te) return null;
                return {
                  taskName: tk.name,
                  start: ts, end: te,
                  isCompleted: !!tk.isCompleted, isMilestone: !!tk.isMilestone,
                  leftPercent: ((ts - minD) / (1000 * 60 * 60 * 24) / fullD) * 100,
                  widthPercent: ((te - ts) / (1000 * 60 * 60 * 24) / fullD) * 100
                };
              })
              .filter(Boolean);
            return {
              projectName: prj.name, projectId: prj.id, color: projColor, tasks,
              manager: prj.manager,
              phase: PROJECT_PHASES[typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0] || '',
              progress: calcAct(prj.tasks),
              customer: prj.customer
            };
          }).filter(g => g.tasks.length > 0);
          const totalSetupCount = setupGroups.reduce((acc, g) => acc + g.tasks.length, 0);
          const selectedCount = ganttFilterIds === null ? filteredProjects.length : ganttFilterIds.length;
          return (
          <div className="p-6">
            {/* 프로젝트 필터 (다중 선택) */}
            <div className="mb-3 relative">
              <button
                type="button"
                onClick={() => setGanttFilterOpen(!ganttFilterOpen)}
                className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg text-sm font-medium text-slate-700 shadow-sm"
              >
                <Filter size={14} className="mr-1.5 text-slate-500" />
                {t('프로젝트 필터', 'Project Filter')}
                <span className="ml-2 text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{selectedCount}/{filteredProjects.length}</span>
                <ChevronDown size={14} className="ml-1 text-slate-500" />
              </button>
              {ganttFilterIds !== null && ganttFilterIds.length < filteredProjects.length && (
                <button
                  type="button"
                  onClick={() => setGanttFilterIds(null)}
                  className="ml-2 inline-flex items-center px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded"
                >
                  {t('전체 보기로 초기화', 'Show all')}
                </button>
              )}
              {ganttFilterOpen && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder={t('프로젝트 검색...', 'Search projects...')}
                      className="flex-1 text-xs p-1.5 border border-slate-200 rounded bg-white outline-none focus:border-indigo-400"
                      value={ganttFilterSearch}
                      onChange={e => setGanttFilterSearch(e.target.value)}
                    />
                  </div>
                  <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-2 bg-white text-[11px]">
                    <button type="button" onClick={() => setGanttFilterIds(null)} className="font-bold text-indigo-600 hover:text-indigo-800">{t('전체 선택', 'Select all')}</button>
                    <span className="text-slate-300">·</span>
                    <button type="button" onClick={() => setGanttFilterIds([])} className="font-bold text-slate-500 hover:text-slate-700">{t('전체 해제', 'Clear all')}</button>
                    <span className="ml-auto text-slate-400">{selectedCount}{t('개 선택', ' selected')}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filterableProjects.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">{t('검색 결과가 없습니다', 'No matches')}</div>
                    ) : filterableProjects.map((p, pidx) => {
                      const projColor = PROJECT_BAR_COLORS[filteredProjects.indexOf(p) % PROJECT_BAR_COLORS.length];
                      const isChecked = ganttFilterIds === null || ganttFilterIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={isChecked}
                            onChange={() => {
                              if (ganttFilterIds === null) {
                                // 전체 → 이 항목 빼고 나머지
                                setGanttFilterIds(filteredProjects.map(x => x.id).filter(id => id !== p.id));
                              } else if (isChecked) {
                                setGanttFilterIds(ganttFilterIds.filter(id => id !== p.id));
                              } else {
                                setGanttFilterIds([...ganttFilterIds, p.id]);
                              }
                            }}
                          />
                          <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${projColor}`}></span>
                          <span className="font-bold text-slate-800 truncate flex-1">{p.name}</span>
                          <span className="text-slate-400 ml-2 truncate max-w-[6rem]">{p.customer}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button type="button" onClick={() => { setGanttFilterOpen(false); setGanttFilterSearch(''); }} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded">{t('완료', 'Done')}</button>
                  </div>
                </div>
              )}
            </div>

            {/* 단계별 / 셋업 탭 + 줌 컨트롤 */}
            <div className="flex border-b border-slate-200 mb-4 items-center">
              <button onClick={() => setGanttViewTab('phase')} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${ganttViewTab === 'phase' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {t('단계별', 'Phases')} <span className="text-[10px] text-slate-400 font-medium ml-0.5">({ganttFiltered.length})</span>
              </button>
              <button onClick={() => setGanttViewTab('setup')} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${ganttViewTab === 'setup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {t('셋업 일정', 'Setup Tasks')} <span className="text-[10px] text-slate-400 font-medium ml-0.5">({totalSetupCount})</span>
              </button>
              {/* 줌 컨트롤 */}
              <div className="ml-auto flex items-center gap-1.5 pb-1">
                <span className="text-[10px] text-slate-400 mr-1 hidden md:inline">{t('휠 = 줌 / Shift+휠 = 가로 이동', 'Wheel = zoom / Shift+wheel = scroll')}</span>
                <button onClick={() => setGanttZoom(Math.max(0.5, +(ganttZoom - 0.25).toFixed(2)))} disabled={ganttZoom <= 0.5} className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('축소', 'Zoom out')}>
                  <ZoomOut size={14} />
                </button>
                <span className="text-xs font-bold text-slate-700 px-2 py-1 min-w-[3rem] text-center bg-white border border-slate-200 rounded-md shadow-sm">{Math.round(ganttZoom * 100)}%</span>
                <button onClick={() => setGanttZoom(Math.min(4, +(ganttZoom + 0.25).toFixed(2)))} disabled={ganttZoom >= 4} className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('확대', 'Zoom in')}>
                  <ZoomIn size={14} />
                </button>
                <button onClick={() => { ganttInitialScrolled.current = false; setGanttZoom(z => z); /* trigger effect */ setTimeout(() => { const node = ganttScrollRef.current; if (!node) return; const inner = node.firstElementChild; if (!inner) return; const fullD = ganttRange.totalDays; const minD = ganttRange.minDate; const today = new Date(); const todayPct = ((today - minD) / (1000 * 60 * 60 * 24) / fullD); const oneMonthPct = 30 / fullD; const targetPct = Math.max(0, todayPct - oneMonthPct); node.scrollLeft = targetPct * inner.scrollWidth; }, 30); }} className="inline-flex items-center px-2.5 h-7 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-sm transition-colors ml-1" title={t('오늘로 이동', 'Jump to today')}>
                  <Maximize2 size={12} className="mr-1" />{t('오늘', 'Today')}
                </button>
              </div>
            </div>

            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              {/* 좌측 고정 칸 */}
              <div className="w-72 shrink-0 bg-white border-r border-slate-200">
                <div className="h-14 bg-slate-50 px-3 flex items-end pb-1 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">{ganttViewTab === 'phase' ? t('프로젝트 / 담당자', 'Project / Manager') : t('프로젝트 / 작업', 'Project / Task')}</div>
                {ganttViewTab === 'phase' ? (
                  ganttFiltered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">{ganttFilterIds !== null && ganttFilterIds.length === 0 ? t('필터에서 선택된 프로젝트가 없습니다.', 'No projects selected in filter.') : t('표시할 프로젝트가 없습니다.', 'No projects to display.')}</div>
                  ) : ganttFiltered.map((prj, pidx) => {
                    const projectIssues = issues.filter(i => i.projectId === prj.id && i.status !== '조치 완료');
                    const actual = calcAct(prj.tasks);
                    const projColor = PROJECT_BAR_COLORS[pidx % PROJECT_BAR_COLORS.length];
                    return (
                      <div key={prj.id} className="h-14 px-3 flex flex-col justify-center border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/30 cursor-pointer" onClick={() => onManageTasks && onManageTasks(prj.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${projColor}`}></span>
                            <div className="text-sm font-bold text-slate-800 truncate" title={prj.name}>{prj.name}</div>
                          </div>
                          <span className="text-xs text-blue-600 font-bold ml-2 shrink-0">{actual}%</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">{PROJECT_PHASES[prj.phaseIndex || 0]}</span>
                          <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} isGanttView={true} t={t} />
                          <ProjectNotesBadge prjId={prj.id} notes={prj.notes} openId={openNotesDropdownId} setOpenId={setOpenNotesDropdownId} onJump={() => onManageTasks && onManageTasks(prj.id)} isGanttView={true} t={t} />
                          <span className="text-[10px] text-slate-500 ml-auto truncate">{prj.manager || t('미지정', 'Unassigned')}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  setupGroups.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">{t('일정이 등록된 셋업 작업이 없습니다.', 'No setup tasks with schedules.')}</div>
                  ) : setupGroups.map((g, gidx) => {
                    const meta = COLOR_HEADER[g.color] || { bg: 'bg-slate-100', border: 'border-slate-300', stripe: 'bg-slate-400' };
                    return (
                    <React.Fragment key={g.projectId}>
                      {/* 프로젝트 헤더 — 그룹 구분 (프로젝트명 + 단계 + 담당자 + 진행률) */}
                      <div className={`h-14 pl-4 pr-3 flex flex-col justify-center ${meta.bg} border-b-2 ${meta.border} ${gidx > 0 ? 'border-t-4 border-t-slate-200' : ''} relative cursor-pointer hover:brightness-95`} onClick={() => onManageTasks && onManageTasks(g.projectId)}>
                        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${g.color}`}></span>
                        <div className="flex items-center min-w-0">
                          <span className={`w-3 h-3 rounded-full mr-2 shrink-0 ${g.color}`}></span>
                          <span className="text-xs font-extrabold text-slate-800 truncate" title={g.projectName}>{g.projectName}</span>
                          <span className="ml-auto flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-blue-600 font-bold">{g.progress}%</span>
                            <span className={`text-[10px] text-white font-bold px-1.5 py-0.5 rounded ${g.color}`}>{g.tasks.length}{t('건', '')}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <span className="text-[10px] text-indigo-700 bg-white/70 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{g.phase}</span>
                          <span className="text-[10px] text-slate-600 truncate">
                            <span className="font-bold">{t('담당:', 'PM:')}</span> {g.manager || t('미지정', 'Unassigned')}
                          </span>
                        </div>
                      </div>
                      {g.tasks.map((r, idx) => (
                        <div key={idx} className={`h-14 pl-4 pr-3 flex flex-col justify-center border-b border-slate-100 hover:bg-indigo-50/30 cursor-pointer relative`} onClick={() => onManageTasks && onManageTasks(g.projectId)}>
                          <span className={`absolute left-0 top-0 bottom-0 w-1 ${g.color} opacity-60`}></span>
                          <div className="flex items-center min-w-0">
                            {r.isMilestone ? <span className="text-rose-500 text-base leading-none mr-1.5">◆</span>
                              : r.isCompleted ? <span className="text-emerald-500 text-sm font-bold mr-1.5">✓</span>
                              : <span className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${g.color}`}></span>}
                            <div className={`text-sm font-bold truncate ${r.isMilestone ? 'text-rose-700' : r.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`} title={r.taskName}>{r.taskName}</div>
                            {r.isMilestone && <span className="ml-1 text-[9px] bg-rose-50 text-rose-700 px-1 py-0.5 rounded font-bold border border-rose-200 shrink-0">SOP</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{fmtYMD(r.start)} ~ {fmtYMD(r.end)}</div>
                        </div>
                      ))}
                    </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* 우측 차트 영역 (휠 줌은 useEffect에서 native passive:false로 등록) */}
              <div className="flex-1 overflow-x-auto min-w-0" ref={ganttScrollRef}>
                <div className="relative" style={{ width: `${Math.max(800, Math.round(fullD * 10 * ganttZoom))}px`, minWidth: '100%' }}>
                  {/* 월/일 헤더 (sticky) */}
                  <div className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 h-14 pt-6">
                    <div className="relative h-5">
                      {monthsArr.map((m, i) => {
                        const next = monthsArr[i + 1];
                        const widthPct = next ? next.pos - m.pos : 100 - m.pos;
                        return (
                          <div key={i} className="absolute h-full" style={{ left: `${m.pos}%`, width: `${widthPct}%` }}>
                            <div className="sticky left-0 inline-block whitespace-nowrap text-xs font-bold text-slate-700 border-l-2 border-slate-300 pl-1 bg-slate-50">{m.label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="relative h-5">
                      {daysArr.map((d, i) => (
                        <div key={i} className="absolute text-[9px] text-slate-400 border-l border-slate-200 pl-0.5" style={{ left: `${d.pos}%`, transform: d.pos >= 99 ? 'translateX(-100%)' : 'none' }}>{d.label}</div>
                      ))}
                    </div>
                  </div>

                  {/* 오늘 라벨 */}
                  <div className="absolute z-40 pointer-events-none" style={{ left: `${todayPct}%`, top: 0, bottom: 0 }}>
                    <div className="absolute top-0.5 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-red-600 leading-tight">
                      ▼ {t('오늘', 'Today')}
                    </div>
                    <div className="absolute top-7 bottom-0 left-0 border-l-2 border-dashed border-red-500 -translate-x-1/2"></div>
                  </div>

                  {/* 막대 행들 — 단계별 또는 셋업에 따라 다르게 */}
                  {ganttViewTab === 'phase' ? (
                    ganttFiltered.map((prj, pidx) => {
                      const pStart = safeDate(prj.startDate);
                      const pDue = safeDate(prj.dueDate);
                      const hasValidRange = !!(pStart && pDue);
                      const leftPercent = hasValidRange ? ((pStart - minD) / (1000 * 60 * 60 * 24) / fullD) * 100 : 0;
                      const widthPercent = hasValidRange ? ((pDue - pStart) / (1000 * 60 * 60 * 24) / fullD) * 100 : 0;
                      const projectColor = PROJECT_BAR_COLORS[pidx % PROJECT_BAR_COLORS.length];
                      const phaseColors = ['bg-slate-400', 'bg-blue-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-amber-400', 'bg-purple-400', 'bg-pink-400', 'bg-emerald-400'];
                      const currentPhase = typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0;
                      const totalPhases = PROJECT_PHASES.length;
                      return (
                        <div key={prj.id} className="h-14 relative border-b border-slate-100 last:border-b-0">
                          {monthsArr.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                          ))}
                          {!hasValidRange ? (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 italic bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{t('일정 미정', 'Schedule TBD')}</div>
                          ) : (
                            <div className={`absolute h-8 rounded-md overflow-hidden border-2 shadow-sm hover:shadow-md hover:brightness-110 transition-all cursor-pointer flex ${projectColor.replace('bg-', 'border-')}`} style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 1)}%`, top: '50%', transform: 'translateY(-50%)' }} onClick={() => onManageTasks(prj.id)} title={`${fmtYMD(prj.startDate)} ~ ${fmtYMD(prj.dueDate)} | ${PROJECT_PHASES[currentPhase]}`}>
                              {PROJECT_PHASES.map((phase, idx) => {
                                const isPast = idx < currentPhase;
                                const isCurrent = idx === currentPhase;
                                return (
                                  <div key={idx} className={`h-full relative ${isPast ? phaseColors[idx % phaseColors.length] : isCurrent ? phaseColors[idx % phaseColors.length] + ' opacity-70' : 'bg-slate-50'} ${idx < totalPhases - 1 ? 'border-r border-white/60' : ''}`} style={{ width: `${100 / totalPhases}%` }} title={phase}>
                                    <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold whitespace-nowrap overflow-hidden ${isPast || isCurrent ? 'text-white' : 'text-slate-400'}`}>{phase.length > 4 ? phase.substring(0, 3) : phase}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    setupGroups.map((g, gidx) => {
                      const meta = COLOR_HEADER[g.color] || { bg: 'bg-slate-100', border: 'border-slate-300', stripe: 'bg-slate-400' };
                      return (
                      <React.Fragment key={g.projectId}>
                        <div className={`h-14 relative ${meta.bg} border-b-2 ${meta.border} ${gidx > 0 ? 'border-t-4 border-t-slate-200' : ''}`}>
                          {monthsArr.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200" style={{ left: `${m.pos}%` }}></div>
                          ))}
                        </div>
                        {g.tasks.map((r, idx) => (
                          <div key={idx} className="h-14 relative border-b border-slate-100">
                            {monthsArr.map((m, i) => (
                              <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                            ))}
                            {r.isMilestone ? (
                              <div className="absolute" style={{ left: `${r.leftPercent + r.widthPercent}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-rose-700 font-bold whitespace-nowrap mb-0.5">{fmtYMD(r.end).slice(5).replace('-', '/')} (SOP)</span>
                                  <span className="text-rose-500 text-xl leading-none drop-shadow">◆</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={`absolute h-6 rounded-sm ${r.isCompleted ? 'bg-emerald-300' : g.color} shadow-sm hover:shadow-md hover:brightness-110 transition-all cursor-pointer`} style={{ left: `${r.leftPercent}%`, width: `${Math.max(r.widthPercent, 1)}%`, top: '50%', transform: 'translateY(-50%)' }} onClick={() => onManageTasks(g.projectId)} title={r.taskName}></div>
                                <span className="absolute text-[10px] font-bold text-slate-700 whitespace-nowrap pointer-events-none" style={{ left: `calc(${r.leftPercent + Math.max(r.widthPercent, 1)}% + 0.5rem)`, top: '50%', transform: 'translateY(-50%)' }}>{r.taskName}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
});

export default ProjectListView;
