import React, { useState, useMemo, memo } from 'react';
import { Plus, Filter, AlignJustify, CalendarDays, Clock, User, HardDrive, Monitor, Cpu, Edit, ListTodo, Trash, Download, Link as LinkIcon, History, ChevronDown, ChevronUp } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import ProjectIssueBadge from '../common/ProjectIssueBadge';
import { downloadICS, openGoogleCalendar } from '../../utils/calendar';
import { exportToCSV } from '../../utils/export';

const ProjectListView = memo(function ProjectListView({ projects, issues, getStatusColor, onAddClick, onManageTasks, onEditVersion, onChangeManager, onViewPhaseGantt, onDeleteProject, onUpdatePhase, onIssueClick, calcExp, calcAct, currentUser, t }) {
  const [viewMode, setViewMode] = useState('list');
  const [filterManager, setFilterManager] = useState('all');
  const [openIssueDropdownId, setOpenIssueDropdownId] = useState(null);
  const [expandedGanttId, setExpandedGanttId] = useState(null);

  const managers = ['all', ...new Set(projects.map(p => p.manager).filter(Boolean))];

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (currentUser.role === 'CUSTOMER') result = result.filter(p => p.customer === currentUser.customer);
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

  const handleExportProjects = () => {
    const exportData = filteredProjects.map(p => ({ id: p.id, domain: p.domain, name: p.name, customer: p.customer, site: p.site, startDate: p.startDate, dueDate: p.dueDate, manager: p.manager, status: p.status, progress: `${calcAct(p.tasks)}%` }));
    exportToCSV(exportData, '프로젝트_리스트', [
      { header: '프로젝트 ID', key: 'id' }, { header: '산업군', key: 'domain' }, { header: '프로젝트명', key: 'name' }, { header: '고객사', key: 'customer' }, { header: '사이트', key: 'site' }, { header: '담당자', key: 'manager' }, { header: '시작일', key: 'startDate' }, { header: '납기일', key: 'dueDate' }, { header: '상태', key: 'status' }, { header: '현재 진척도', key: 'progress' }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold">{t('프로젝트 관리', 'Projects')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExportProjects} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm"><Download size={16} className="mr-1.5" /> CSV</button>
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
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
                      {prj.notionLink && (
                        <a href={prj.notionLink} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 transition-colors flex items-center shadow-sm" title="Notion" onClick={e => e.stopPropagation()}>
                          <LinkIcon size={10} className="mr-1 text-slate-400" /> Notion
                        </a>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center">
                      {prj.name}
                      <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">{prj.domain}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center mt-1"><Clock size={12} className="mr-1" /> {prj.startDate} ~ {prj.dueDate}</div>
                    <ProjectPipelineStepper currentPhase={prj.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={prj.id} role={currentUser.role} />
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap"><div className="text-sm text-slate-900">{prj.customer}</div><div className="text-xs text-slate-500">{prj.site}</div></td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-slate-700 flex items-center"><User size={14} className="mr-1.5 text-slate-400" />{prj.manager || t('미지정', 'Unassigned')}</div>
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                      <button onClick={() => onChangeManager(prj)} className="mt-1 flex items-center text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100"><Edit size={10} className="mr-1" /> {t('담당자 변경', 'Change')}</button>
                    )}
                    {prj.managerHistory?.length > 0 && (
                      <div className="mt-1 flex items-center text-[10px] text-slate-400"><History size={10} className="mr-1" />{t('변경', 'Changed')} {prj.managerHistory.length}{t('회', 'x')}</div>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center"><HardDrive size={14} className="mr-1.5 text-amber-500" /> <span className="font-medium">HW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.hwVersion || '-'}</span></div>
                      <div className="flex items-center"><Monitor size={14} className="mr-1.5 text-blue-500" /> <span className="font-medium">SW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.swVersion || '-'}</span></div>
                      <div className="flex items-center"><Cpu size={14} className="mr-1.5 text-emerald-500" /> <span className="font-medium">FW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.fwVersion || '-'}</span></div>
                    </div>
                    {currentUser.role !== 'CUSTOMER' && (
                      <button onClick={() => onEditVersion(prj)} className="mt-2 flex items-center text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100"><Edit size={10} className="mr-1" /> {t('버전 변경', 'Edit Version')}</button>
                    )}
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
