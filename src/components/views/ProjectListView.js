import React, { useState, useMemo, memo } from 'react';
import { Plus, Filter, AlignJustify, CalendarDays, Clock, User, HardDrive, Monitor, Cpu, Edit, ListTodo, Trash, Download, Link as LinkIcon, History, ChevronDown, ChevronUp, Plane, Users } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import ProjectIssueBadge from '../common/ProjectIssueBadge';
import ProjectNotesBadge from '../common/ProjectNotesBadge';
import { downloadICS, openGoogleCalendar } from '../../utils/calendar';
import { exportToExcel, exportSectionedExcel } from '../../utils/export';

const ProjectListView = memo(function ProjectListView({ projects, issues, engineers, getStatusColor, onAddClick, onManageTasks, onEditVersion, onChangeManager, onManageTeam, onViewPhaseGantt, onEditProject, onDeleteProject, onUpdatePhase, onEditPhases, onIssueClick, calcExp, calcAct, currentUser, t }) {
  const [viewMode, setViewMode] = useState('list');
  const [filterManager, setFilterManager] = useState('all');
  const [openIssueDropdownId, setOpenIssueDropdownId] = useState(null);
  const [openNotesDropdownId, setOpenNotesDropdownId] = useState(null);
  const [expandedGanttId, setExpandedGanttId] = useState(null);

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
    if (filteredProjects.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const minDate = new Date(Math.min(...filteredProjects.map(p => new Date(p.startDate))));
    const maxDate = new Date(Math.max(...filteredProjects.map(p => new Date(p.dueDate))));
    minDate.setDate(minDate.getDate() - 15);
    maxDate.setDate(maxDate.getDate() + 15);
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    return { minDate, maxDate, totalDays };
  }, [filteredProjects]);

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase min-w-[180px]">{t('일정관리', 'Manage')}</th>
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
                  <tr className="hover:bg-slate-50 group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                      <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} t={t} />
                      <ProjectNotesBadge prjId={prj.id} notes={prj.notes} openId={openNotesDropdownId} setOpenId={setOpenNotesDropdownId} onJump={() => onManageTasks && onManageTasks(prj.id)} t={t} />
                      {prj.notionLink && (
                        <a href={prj.notionLink} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 transition-colors flex items-center shadow-sm" title="Notion" onClick={e => e.stopPropagation()}>
                          <LinkIcon size={10} className="mr-1 text-slate-400" /> Notion
                        </a>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center">
                      {prj.name}
                      <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">{prj.domain}</span>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onEditProject(prj)} className="ml-2 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100" title={t('프로젝트 정보 수정', 'Edit Project')}><Edit size={12} /></button>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center mt-1"><Clock size={12} className="mr-1" /> {prj.startDate} ~ {prj.dueDate}</div>
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
                      const cats = Object.keys(latest);
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
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 text-right">
                    <div className="flex justify-end items-center space-x-1.5">
                      <button onClick={() => downloadICS(prj)} className="flex items-center text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-1.5 rounded-md border border-slate-200 transition-colors shadow-sm" title={t('MS Outlook 캘린더 등록 (.ics)', 'Add to MS Outlook')}><CalendarDays size={14} className="md:mr-1"/> <span className="hidden md:inline text-xs font-bold">MS</span></button>
                      <button onClick={() => openGoogleCalendar(prj)} className="flex items-center text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-1.5 rounded-md border border-slate-200 transition-colors shadow-sm" title={t('Google 캘린더 바로 열기', 'Open in Google Calendar')}><CalendarDays size={14} className="md:mr-1"/> <span className="hidden md:inline text-xs font-bold">Google</span></button>
                      <button onClick={() => onManageTasks(prj.id)} className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 transition-colors shadow-sm"><ListTodo size={14} className="mr-1"/> {currentUser.role === 'CUSTOMER' ? t('상세 보기', 'View') : t('관리', 'Manage')}</button>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onDeleteProject(prj)} className="flex items-center text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1.5 rounded-md border border-transparent hover:border-red-100 transition-colors" title={t('프로젝트 삭제', 'Delete Project')}><Trash size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedGanttId === prj.id && (
                  <tr className="bg-slate-50">
                    <td colSpan="7" className="px-6 py-5">
                      {(() => {
                        const pStartDate = new Date(prj.startDate);
                        const pDueDate = new Date(prj.dueDate);
                        const totalDays = (pDueDate - pStartDate) / (1000 * 60 * 60 * 24);
                        const currentPhaseIdx = typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0;
                        const phaseCount = PROJECT_PHASES.length;
                        const daysPerPhase = totalDays / phaseCount;
                        const phaseColors = ['bg-slate-400', 'bg-blue-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-amber-400', 'bg-purple-400', 'bg-emerald-400'];

                        const gMinDate = new Date(pStartDate); gMinDate.setDate(1);
                        const gMaxDate = new Date(pDueDate); gMaxDate.setMonth(gMaxDate.getMonth() + 1, 0);
                        const fullDays = (gMaxDate - gMinDate) / (1000 * 60 * 60 * 24);

                        // 월별 + 일별 눈금 (주 단위)
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

                        const today = new Date();
                        const todayPercent = Math.max(0, Math.min(100, ((today - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100));

                        // 경과/잔여 일자 계산
                        const elapsedDays = Math.max(0, Math.floor((today - pStartDate) / (1000 * 60 * 60 * 24)));
                        const remainingDays = Math.max(0, Math.floor((pDueDate - today) / (1000 * 60 * 60 * 24)));
                        const totalDaysInt = Math.floor(totalDays);

                        return (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">{t('단계별 간트 차트', 'Phase Gantt Chart')}</h3>
                                <p className="text-xs text-slate-500">{prj.name}  ·  {prj.startDate} ~ {prj.dueDate}  ({t('총', 'Total')} {totalDaysInt}{t('일', 'd')})</p>
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

                            {/* 월 헤더 + 일 눈금 */}
                            <div className="flex">
                              <div className="w-52 shrink-0"></div>
                              <div className="flex-1 relative">
                                {/* 월 행 */}
                                <div className="relative h-5">
                                  {months.map((m, i) => (
                                    <div key={i} className="absolute text-xs font-bold text-slate-700 border-l-2 border-slate-300 pl-1" style={{ left: `${m.pos}%` }}>{m.label}</div>
                                  ))}
                                </div>
                                {/* 일 행 */}
                                <div className="relative h-4 border-b border-slate-200">
                                  {days.map((d, i) => (
                                    <div key={i} className="absolute text-[9px] text-slate-400 border-l border-slate-200 pl-0.5" style={{ left: `${d.pos}%` }}>{d.label}</div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 단계별 바 */}
                            <div className="space-y-3 mt-2 relative">
                              {/* 오늘선 */}
                              <div className="absolute w-px bg-orange-400 z-10" style={{ left: `calc(13rem + (100% - 13rem) * ${todayPercent} / 100)`, top: '-0.5rem', bottom: '-0.5rem' }}>
                                <div className="absolute -top-3 -translate-x-1/2 text-orange-500 text-xs font-bold">{t('오늘', 'Today')}</div>
                              </div>

                              {PROJECT_PHASES.map((phase, idx) => {
                                const phaseStart = new Date(pStartDate.getTime() + daysPerPhase * idx * 24 * 60 * 60 * 1000);
                                const phaseEnd = new Date(pStartDate.getTime() + daysPerPhase * (idx + 1) * 24 * 60 * 60 * 1000);
                                const leftPercent = ((phaseStart - gMinDate) / (1000 * 60 * 60 * 24) / fullDays) * 100;
                                const widthPercent = ((phaseEnd - phaseStart) / (1000 * 60 * 60 * 24) / fullDays) * 100;
                                const isPast = idx < currentPhaseIdx;
                                const isCurrent = idx === currentPhaseIdx;

                                // 색상: 완료=sage green, 현재=teal, 예정=light gray
                                const barBg = isPast ? 'bg-emerald-300' : isCurrent ? 'bg-teal-500' : 'bg-slate-200';

                                return (
                                  <div key={idx} className="flex items-center h-7">
                                    {/* 왼쪽: 아이콘 + 단계명 + 날짜 */}
                                    <div className="w-52 shrink-0 pr-3 flex items-center">
                                      <span className="w-5 h-5 flex items-center justify-center mr-2 shrink-0">
                                        {isPast ? (
                                          <span className="text-emerald-500 text-sm font-bold">✓</span>
                                        ) : isCurrent ? (
                                          <span className="text-teal-600 text-sm">▶</span>
                                        ) : (
                                          <span className="w-3 h-3 rounded-full border-2 border-slate-300 inline-block"></span>
                                        )}
                                      </span>
                                      <span className={`text-sm font-semibold truncate ${isPast ? 'text-slate-400' : isCurrent ? 'text-slate-800' : 'text-slate-500'}`}>{phase}</span>
                                      <span className="text-xs text-slate-400 ml-3 shrink-0 whitespace-nowrap">{phaseStart.toISOString().split('T')[0].slice(5)} ~ {phaseEnd.toISOString().split('T')[0].slice(5)}</span>
                                    </div>

                                    {/* 오른쪽: 바 */}
                                    <div className="flex-1 relative h-full flex items-center">
                                      <div
                                        className={`absolute h-5 rounded-sm ${barBg}`}
                                        style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 1)}%` }}
                                      ></div>
                                      {isCurrent && (
                                        <span className="absolute text-xs text-teal-700 font-bold" style={{ left: `calc(${leftPercent + widthPercent}% + 0.5rem)` }}>{t('진행중', 'Active')}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* 범례 */}
                            <div className="flex items-center mt-6 pt-4 border-t border-slate-100 space-x-6 text-xs text-slate-500">
                              <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-emerald-300 mr-2"></span>{t('완료된 단계', 'Completed')}</div>
                              <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-teal-500 mr-2"></span>{t('현재 단계', 'Current')}</div>
                              <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-slate-200 mr-2"></span>{t('예정 단계', 'Planned')}</div>
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
        ) : (
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="flex border-b border-slate-200 pb-2 mb-4 relative h-6">
                <div className="absolute left-0 text-xs font-bold text-slate-400">{ganttRange.minDate.toISOString().split('T')[0]}</div>
                <div className="absolute right-0 text-xs font-bold text-slate-400">{ganttRange.maxDate.toISOString().split('T')[0]}</div>
                <div className="absolute left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 bg-white px-2">{t('프로젝트 일정 타임라인', 'Project Timeline')}</div>
              </div>
              <div className="space-y-4">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">{t('표시할 프로젝트가 없습니다.', 'No projects to display.')}</div>
                ) : (
                  filteredProjects.map((prj) => {
                    const pStart = new Date(prj.startDate);
                    const pDue = new Date(prj.dueDate);
                    const leftPercent = ((pStart - ganttRange.minDate) / (1000 * 60 * 60 * 24) / ganttRange.totalDays) * 100;
                    const widthPercent = ((pDue - pStart) / (1000 * 60 * 60 * 24) / ganttRange.totalDays) * 100;
                    const actual = calcAct(prj.tasks);
                    const projectIssues = issues.filter(i => i.projectId === prj.id && i.status !== '조치 완료');

                    return (
                      <div key={prj.id} className="relative h-14 flex items-center group">
                        <div className="w-1/4 pr-4 border-r border-slate-200 flex flex-col justify-center relative">
                          <div className="flex justify-between items-start pr-2">
                            <div className="text-sm font-bold text-slate-800 truncate flex-1" title={prj.name}>{prj.name}</div>
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                              <button onClick={(e) => { e.stopPropagation(); onDeleteProject(prj); }} className="text-slate-300 hover:text-red-500 transition-colors ml-2"><Trash size={14} /></button>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <div className="text-[10px] text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded font-bold">{PROJECT_PHASES[prj.phaseIndex || 0]} {t('단계', '')}</div>
                            <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} isGanttView={true} t={t} />
                            <ProjectNotesBadge prjId={prj.id} notes={prj.notes} openId={openNotesDropdownId} setOpenId={setOpenNotesDropdownId} onJump={() => onManageTasks && onManageTasks(prj.id)} isGanttView={true} t={t} />
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between mt-1 pr-2">
                            <span>{prj.manager || t('미지정', 'Unassigned')}</span>
                            <span className="text-blue-600 font-bold">{actual}%</span>
                          </div>
                        </div>
                        <div className="w-3/4 relative h-full flex items-center mx-4">
                          <div className="absolute w-full h-px bg-slate-200"></div>
                          <div className="absolute h-8 bg-slate-50 border border-slate-300 rounded-md overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }} onClick={() => onManageTasks(prj.id)}>
                            {(() => {
                              const phaseColors = ['bg-slate-300','bg-blue-300','bg-cyan-300','bg-indigo-300','bg-amber-300','bg-purple-300','bg-emerald-300'];
                              const currentPhase = typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0;
                              const totalPhases = PROJECT_PHASES.length;
                              return PROJECT_PHASES.map((phase, idx) => {
                                const isPast = idx < currentPhase;
                                const isCurrent = idx === currentPhase;
                                return (
                                  <div key={idx} className={`h-full relative ${isPast ? phaseColors[idx] : isCurrent ? phaseColors[idx] + ' opacity-70' : 'bg-slate-100'} ${idx < totalPhases - 1 ? 'border-r border-white/50' : ''}`} style={{ width: `${100 / totalPhases}%` }} title={phase}>
                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-slate-700 whitespace-nowrap overflow-hidden">{phase.length > 3 ? phase.substring(0, 3) : phase}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg -top-3 z-10 pointer-events-none whitespace-nowrap shadow-lg" style={{ left: `${leftPercent}%` }}>{prj.startDate} ~ {prj.dueDate}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ProjectListView;
