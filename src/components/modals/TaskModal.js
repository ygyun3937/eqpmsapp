import React, { useState, memo } from 'react';
import { X, ListTodo, CheckSquare, AlertTriangle, CheckCircle, User, Edit, Trash, PenTool, Info, ShieldCheck, FileText, ImageIcon, History, GitCommit as TimelineIcon, Package, Wrench, HardDrive, MessageSquare, Send, LifeBuoy, Plus, ShieldOff, Sparkles, Paperclip, Upload, Download, ExternalLink, Loader, FolderOpen, CalendarDays, Star, Calendar, Clock } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import { calcAct as calcSetupProgress, calcPhaseProgress, calcOverallProgress } from '../../utils/calc';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import SetupPipelineStepper from '../common/SetupPipelineStepper';
import SignaturePad from '../common/SignaturePad';
import { generatePDF } from '../../utils/export';
import { downloadICS, openGoogleCalendar } from '../../utils/calendar';

const TaskModal = memo(function TaskModal({ project, projectIssues, getStatusColor, onClose, onToggleTask, onAddTask, onEditTaskName, onDeleteTask, onUpdateDelayReason, onUpdateTaskDates, onUpdateChecklistItem, onLoadDefaultChecklist, onAddChecklistItem, onDeleteChecklistItem, onUpdatePhase, onEditPhases, onEditSetupTasks, onSetCurrentSetupTask, onSignOff, onCancelSignOff, onAddExtraTask, onUpdateExtraTask, onDeleteExtraTask, onAddNote, onDeleteNote, onAddCustomerRequest, onUpdateCustomerRequestStatus, onAddCustomerResponse, onDeleteCustomerRequest, onAddAS, onUpdateAS, onDeleteAS, onUploadAttachment, onDeleteAttachment, onDeleteProject, driveConfigured, calcAct, currentUser, t, initialTab }) {
  const [activeModalTab, setActiveModalTab] = useState(initialTab || 'tasks');
  const [scheduleSubTab, setScheduleSubTab] = useState('phase');
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachDragOver, setAttachDragOver] = useState(false);
  const [attachProgress, setAttachProgress] = useState(0);
  const [attachError, setAttachError] = useState('');
  const [attachCategory, setAttachCategory] = useState('명세서');
  const [attachGroupFilter, setAttachGroupFilter] = useState('all');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteSummary, setNewNoteSummary] = useState('');
  const [newNoteFiles, setNewNoteFiles] = useState([]);
  const [noteUploadIdx, setNoteUploadIdx] = useState(0);
  const [newNoteMode, setNewNoteMode] = useState('quick'); // 'quick' | 'detail'
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [newNoteMeetingDate, setNewNoteMeetingDate] = useState('');
  const [newNoteAttendees, setNewNoteAttendees] = useState('');
  const [newNoteDecisions, setNewNoteDecisions] = useState('');
  const [newNoteActions, setNewNoteActions] = useState('');
  const [noteDragOver, setNoteDragOver] = useState(false);
  const [noteUploading, setNoteUploading] = useState(false);
  const [noteUploadProgress, setNoteUploadProgress] = useState(0);
  const [noteError, setNoteError] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState('일반');
  const [newChecklistTask, setNewChecklistTask] = useState('');
  const [newRequestForm, setNewRequestForm] = useState({
    requester: currentUser.role === 'CUSTOMER' ? currentUser.name : '',
    content: '',
    urgency: 'Medium'
  });
  const [responseText, setResponseText] = useState({});
  // 처리결과 입력 폼: { id: requestId, status: '반영 완료'|'반려', text: '' }
  const [resolvingRequest, setResolvingRequest] = useState(null);
  const [newASForm, setNewASForm] = useState({ type: '정기점검', engineer: '', description: '', resolution: '' });
  const [historyFilter, setHistoryFilter] = useState('all');
  const [newExtraForm, setNewExtraForm] = useState({ name: '', requester: '', type: '기능 추가', startDate: '', endDate: '', note: '' });
  const [confirmCancelSignOff, setConfirmCancelSignOff] = useState(false);

  if (!project) return null;

  const actualProgress = calcOverallProgress(project);
  const phasePct = calcPhaseProgress(project);
  const setupPct = calcSetupProgress(project.tasks);
  const hasPhases = Array.isArray(project.phases) && project.phases.length > 1;
  const hasTasks = Array.isArray(project.tasks) && project.tasks.length > 0;
  const checklistCount = project.checklist ? project.checklist.length : 0;
  const checklistCompleted = project.checklist ? project.checklist.filter(c => c.status === 'OK').length : 0;
  const isReadyToSign = checklistCount > 0 && checklistCompleted === checklistCount;
  // ADMIN은 Buy-off 후에도 검수표 수정 가능
  const isLockedForChecklist = project.signOff?.signed && currentUser.role !== 'ADMIN';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-blue-50 flex-shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-blue-800 truncate">{project.name}</h2>
              <p className="text-xs text-blue-600 mt-1">{t('상세 관리', 'Details')}</p>
            </div>
            <button onClick={onClose} className="text-blue-400 hover:text-blue-600 p-2 shrink-0"><X size={20} /></button>
          </div>
          {/* 프로젝트 단위 유틸 액션: 캘린더 등록 / 삭제 */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <button onClick={() => downloadICS(project)} className="inline-flex items-center text-[11px] font-bold text-slate-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200 transition-colors" title={t('MS Outlook 캘린더 등록 (.ics 다운로드)', 'Add to MS Outlook')}>
              <CalendarDays size={11} className="mr-1" />MS Outlook
            </button>
            <button onClick={() => openGoogleCalendar(project)} className="inline-flex items-center text-[11px] font-bold text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2 py-1 rounded border border-slate-200 transition-colors" title={t('Google 캘린더에서 일정 만들기', 'Open in Google Calendar')}>
              <CalendarDays size={11} className="mr-1" />Google Calendar
            </button>
            {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && onDeleteProject && (
              <button onClick={() => onDeleteProject(project)} className="ml-auto inline-flex items-center text-[11px] font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-700 transition-colors" title={t('프로젝트 삭제', 'Delete Project')}>
                <Trash size={11} className="mr-1" />{t('프로젝트 삭제', 'Delete')}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-9 border-b border-slate-200 bg-white shrink-0">
          <button onClick={() => setActiveModalTab('tasks')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ListTodo size={16} className="mb-0.5" /><span>{t('일정', 'Schedule')}</span></button>
          <button onClick={() => setActiveModalTab('checklist')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'checklist' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><CheckSquare size={16} className="mb-0.5" /><span>{t('검수표', 'Checklist')} ({checklistCompleted}/{checklistCount})</span></button>
          <button onClick={() => setActiveModalTab('extras')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'extras' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Sparkles size={16} className="mb-0.5" /><span>{t('추가 대응', 'Extras')} ({(project.extraTasks || []).length})</span></button>
          <button onClick={() => setActiveModalTab('issues')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'issues' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} className="mb-0.5" /><span>{t('이슈', 'Issues')} ({projectIssues.length})</span></button>
          <button onClick={() => setActiveModalTab('history')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'history' ? 'border-slate-600 text-slate-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><History size={16} className="mb-0.5" /><span>{t('이력', 'History')} ({(project.activityLog || []).length})</span></button>
          <button onClick={() => setActiveModalTab('notes')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'notes' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileText size={16} className="mb-0.5" /><span>{t('회의록', 'Meetings')} ({(project.notes || []).length})</span></button>
          <button onClick={() => setActiveModalTab('attachments')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'attachments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Paperclip size={16} className="mb-0.5" /><span>{t('참고 자료', 'Files')} ({(project.attachments || []).length})</span></button>
          <button onClick={() => setActiveModalTab('requests')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'requests' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><MessageSquare size={16} className="mb-0.5" /><span>{t('고객요청', 'Requests')} ({(project.customerRequests || []).length})</span></button>
          <button onClick={() => setActiveModalTab('as')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'as' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><LifeBuoy size={16} className="mb-0.5" /><span>{t('AS 관리', 'AS')} ({(project.asRecords || []).length})</span></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 scroll-smooth bg-slate-50">
          {activeModalTab === 'tasks' && (() => {
            const phaseList = (project.phases && project.phases.length > 0)
              ? project.phases
              : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name, startDate: '', endDate: '', isMilestone: false }));
            const currentIdx = project.phaseIndex || 0;
            return (
            <div className="space-y-4">
              {/* 공통: 진척도 */}
              <div className="flex justify-between items-end gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-bold text-slate-700">{t('현재 실적 진척도', 'Actual Progress')}</div>
                  {(hasPhases || hasTasks) && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {hasPhases && <span>{t('단계', 'Phase')} <strong className="text-indigo-700">{phasePct}%</strong></span>}
                      {hasPhases && hasTasks && <span className="mx-1.5 text-slate-300">·</span>}
                      {hasTasks && <span>{t('셋업', 'Setup')} <strong className="text-blue-700">{setupPct}%</strong></span>}
                      {hasPhases && hasTasks && <span className="ml-1 text-slate-400">→ {t('평균', 'avg')}</span>}
                    </div>
                  )}
                </div>
                <span className="text-3xl font-black text-blue-600 leading-none">{actualProgress}%</span>
              </div>

              {/* 서브탭 토글 */}
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm">
                <button onClick={() => setScheduleSubTab('phase')} className={`flex-1 text-xs md:text-sm font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${scheduleSubTab === 'phase' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <TimelineIcon size={14} />{t('프로젝트 단계별 일정', 'Phase Schedule')}
                </button>
                <button onClick={() => setScheduleSubTab('setup')} className={`flex-1 text-xs md:text-sm font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${scheduleSubTab === 'setup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <ListTodo size={14} />{t('셋업 일정', 'Setup Tasks')} ({(project.tasks || []).length})
                </button>
              </div>

              {scheduleSubTab === 'phase' && (() => {
                return (
                  <div className="space-y-3">
                    {/* 단계별 헤더 박스 — 현재 단계 + Pipeline + [단계 편집] 모달 진입 */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="text-sm font-bold text-slate-700 flex items-center">
                          <span className="text-slate-500 mr-2">{t('현재 업무 단계', 'Current Phase')}</span>
                          <span className="text-indigo-700 bg-white px-3 py-1.5 border border-indigo-300 rounded-lg text-base font-black shadow-sm">{phaseList[currentIdx]?.name || PROJECT_PHASES[currentIdx]}</span>
                        </div>
                        {currentUser.role !== 'CUSTOMER' && (
                          <button onClick={() => onEditPhases(project.id)} className="inline-flex items-center text-sm font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
                            <Edit size={16} className="mr-2" />{t('단계 편집', 'Edit Phases')}
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto pb-2 scroll-smooth bg-white rounded-lg p-3 border border-indigo-100">
                        <ProjectPipelineStepper phases={project.phases} currentPhase={currentIdx} onUpdatePhase={onUpdatePhase} projectId={project.id} role={currentUser.role} onEditPhases={onEditPhases} />
                      </div>
                    </div>

                    {/* 단계별 일정 표 */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-700">{t('단계별 일정', 'Phase Schedule')}</span>
                        <span className="text-xs text-slate-500">{t('일정·이름·마일스톤 변경은 [단계 편집]에서 진행하면 활동 이력에 자동 기록됩니다.', 'Edit via [Edit Phases] — changes are auto-logged.')}</span>
                      </div>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-12">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">{t('단계명', 'Name')}</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">{t('시작일', 'Start')}</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">{t('종료일', 'End')}</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase w-28">{t('마일스톤', 'Milestone')}</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase w-24">{t('상태', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {phaseList.map((p, idx) => {
                            const isCurrent = idx === currentIdx;
                            const isPast = idx < currentIdx;
                            return (
                              <tr key={p.id || idx} className={`${isCurrent ? 'bg-indigo-50/40' : ''} hover:bg-slate-50/60`}>
                                <td className="px-4 py-3 text-slate-400 font-mono text-sm">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm font-bold ${isCurrent ? 'text-indigo-700' : isPast ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-700 font-mono text-sm">{p.startDate || <span className="text-slate-300">—</span>}</td>
                                <td className="px-4 py-3 text-slate-700 font-mono text-sm">{p.endDate || <span className="text-slate-300">—</span>}</td>
                                <td className="px-4 py-3 text-center">
                                  {p.isMilestone
                                    ? <span className="inline-flex items-center text-rose-600" title={t('마일스톤', 'Milestone')}><Star size={16} className="fill-rose-500 text-rose-500 drop-shadow-sm" /></span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isCurrent
                                    ? <span className="text-xs font-bold px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">{t('진행중', 'Now')}</span>
                                    : isPast
                                      ? <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">{t('완료', 'Done')}</span>
                                      : <span className="text-xs font-bold px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200">{t('예정', 'Plan')}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {scheduleSubTab === 'setup' && (() => {
                const tasks = project.tasks || [];
                const canEdit = currentUser.role !== 'CUSTOMER';
                const todayStr = new Date().toISOString().slice(0, 10);
                const computeStatus = (tk) => {
                  if (tk.isCompleted) return 'done';
                  if (!tk.startDate && !tk.endDate) return 'plan';
                  if (tk.endDate && tk.endDate < todayStr) return 'overdue';
                  if (tk.startDate && tk.startDate <= todayStr && (!tk.endDate || todayStr <= tk.endDate)) return 'now';
                  return 'plan';
                };
                const statusChip = (s) => {
                  switch (s) {
                    case 'done': return { label: t('완료', 'Done'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                    case 'now': return { label: t('진행중', 'Now'), cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
                    case 'overdue': return { label: t('지연', 'Late'), cls: 'bg-red-50 text-red-700 border-red-200' };
                    default: return { label: t('예정', 'Plan'), cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                  }
                };
                return (
                  <div className="space-y-3">
                    {/* 셋업 헤더 박스 — 단계별 박스와 동일 구성. 데이터만 셋업 작업 기준 */}
                    {(() => {
                      const firstIncompleteIdx = tasks.findIndex(tk => !tk.isCompleted);
                      const currentSetupIdx = firstIncompleteIdx < 0 ? Math.max(0, tasks.length - 1) : firstIncompleteIdx;
                      const currentSetupTask = tasks[currentSetupIdx];
                      const allDone = tasks.length > 0 && firstIncompleteIdx < 0;
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="text-sm font-bold text-slate-700 flex items-center">
                              <span className="text-slate-500 mr-2">{t('현재 셋업 작업', 'Current Setup Task')}</span>
                              {tasks.length === 0 ? (
                                <span className="text-slate-400 bg-white px-3 py-1.5 border border-slate-200 rounded-lg text-sm italic">{t('작업 없음', 'No tasks')}</span>
                              ) : allDone ? (
                                <span className="text-emerald-700 bg-white px-3 py-1.5 border border-emerald-300 rounded-lg text-base font-black shadow-sm inline-flex items-center">
                                  <CheckCircle size={14} className="mr-1.5" />{t('전체 완료', 'All done')}
                                </span>
                              ) : (
                                <span className="text-blue-700 bg-white px-3 py-1.5 border border-blue-300 rounded-lg text-base font-black shadow-sm">{currentSetupTask?.name || '-'}</span>
                              )}
                            </div>
                            {canEdit && (
                              <button onClick={() => onEditSetupTasks && onEditSetupTasks(project.id)} className="inline-flex items-center text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all">
                                <Edit size={16} className="mr-2" />{t('셋업 일정 편집', 'Edit Setup Tasks')}
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto pb-2 scroll-smooth bg-white rounded-lg p-3 border border-blue-100">
                            <SetupPipelineStepper tasks={tasks} onSetCurrentSetupTask={onSetCurrentSetupTask} projectId={project.id} role={currentUser.role} onEditSetupTasks={onEditSetupTasks} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* 셋업 일정 표 — 읽기 전용 (편집은 모달에서) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-700">{t('셋업 일정', 'Setup Tasks')}</span>
                        <span className="text-xs text-slate-500">{t('수정/추가/삭제는 [셋업 일정 편집]에서 진행하면 활동 이력에 자동 기록됩니다.', 'Edit via [Edit Setup Tasks] — changes are auto-logged.')}</span>
                      </div>
                      {tasks.length === 0 ? (
                        <div className="text-center py-10 text-sm text-slate-400">
                          {t('등록된 셋업 일정이 없습니다. [셋업 일정 편집]을 눌러 추가하세요.', 'No setup tasks yet. Click [Edit Setup Tasks] to add.')}
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-12">#</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">{t('작업명', 'Name')}</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-36">{t('시작일', 'Start')}</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-36">{t('종료일', 'End')}</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase w-28">{t('마일스톤', 'Milestone')}</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase w-24">{t('상태', 'Status')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {tasks.map((task, index) => {
                              const status = computeStatus(task);
                              const chip = statusChip(status);
                              return (
                                <tr key={task.id} className={`${task.isCompleted ? 'bg-slate-50/60' : ''} hover:bg-slate-50/60`}>
                                  <td className="px-4 py-3 text-slate-400 font-mono text-sm">{index + 1}</td>
                                  <td className="px-4 py-3">
                                    <div className={`text-sm font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.name}</div>
                                    {task.delayReason && <p className="mt-1 text-xs text-slate-500">{t('메모:', 'Note:')} {task.delayReason}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 font-mono text-sm">{task.startDate || <span className="text-slate-300">—</span>}</td>
                                  <td className="px-4 py-3 text-slate-700 font-mono text-sm">{task.endDate || <span className="text-slate-300">—</span>}</td>
                                  <td className="px-4 py-3 text-center">
                                    {task.isMilestone
                                      ? <Star size={16} className="fill-rose-500 text-rose-500 mx-auto drop-shadow-sm" />
                                      : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${chip.cls}`}>{chip.label}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            );
          })()}
          {activeModalTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-indigo-100 text-indigo-800 p-3 rounded-lg text-xs md:text-sm font-bold border border-indigo-200 mb-4 shadow-sm flex items-center justify-between"><span className="flex items-center"><Info size={16} className="mr-1.5" /> {t('현장 셋업 완료 전 필수 점검 항목입니다.', 'Mandatory checklist before sign-off.')}</span><span>{t('진행률', 'Progress')}: {Math.round((checklistCompleted/checklistCount)*100 || 0)}%</span></div>
              {(!project.checklist || project.checklist.length === 0) && (<div className="text-center py-8 bg-white rounded-xl border border-slate-200 shadow-sm"><p className="text-slate-500 text-sm mb-3">{t('등록된 검수 항목이 없습니다.', 'No checklist items.')}</p>
                {currentUser.role !== 'CUSTOMER' && <button onClick={() => onLoadDefaultChecklist(project.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('기본 검수표 불러오기', 'Load Default Checklist')}</button>}
              </div>)}
              <div className="space-y-3">
                {project.checklist && project.checklist.map(item => (
                  <div key={item.id} className={`bg-white p-3 rounded-xl border shadow-sm ${item.status === 'OK' ? 'border-emerald-200 bg-emerald-50/30' : item.status === 'NG' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">{item.category}</span>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-bold text-slate-800">{item.task}</p>
                          {!isLockedForChecklist && currentUser.role !== 'CUSTOMER' && (
                            <button onClick={() => onDeleteChecklistItem(project.id, item.id)} className="ml-2 inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors shrink-0" title={t('삭제', 'Delete')}>
                              <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1 shrink-0 mt-2 md:mt-0">
                        <button disabled={isLockedForChecklist || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'Pending')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'Pending' ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>{t('대기', 'Wait')}</button>
                        <button disabled={isLockedForChecklist || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'OK')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400 shadow-sm' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'} disabled:opacity-50`}>OK</button>
                        <button disabled={isLockedForChecklist || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'NG')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'NG' ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400 shadow-sm' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'} disabled:opacity-50`}>NG</button>
                      </div>
                    </div>
                    {item.status !== 'OK' && !isLockedForChecklist && currentUser.role !== 'CUSTOMER' && (<input type="text" placeholder={t("점검 결과 특이사항 입력...", "Result note...")} className="mt-2 w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-indigo-400" value={item.note || ''} onChange={(e) => onUpdateChecklistItem(project.id, item.id, item.status, e.target.value)} />)}
                    {item.note && (<p className="mt-1.5 text-xs text-slate-500 bg-slate-100 p-1.5 rounded flex items-center"><PenTool size={12} className="mr-1" /> {item.note}</p>)}
                  </div>
                ))}
              </div>
              {!isLockedForChecklist && currentUser.role !== 'CUSTOMER' && (
                <div className="mt-4 flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <select className="w-24 text-xs md:text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500" value={newChecklistCategory} onChange={(e) => setNewChecklistCategory(e.target.value)}>
                    <option value="일반">일반</option><option value="기구/반입">기구</option><option value="유틸리티">유틸</option><option value="소프트웨어">S/W</option><option value="공정/통신">공정</option>
                  </select>
                  <input type="text" placeholder={t("항목 직접 입력...", "New item...")} className="flex-1 text-xs md:text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 min-w-0" value={newChecklistTask} onChange={(e) => setNewChecklistTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAddChecklistItem(project.id, newChecklistCategory, newChecklistTask); setNewChecklistTask(''); } }} />
                  <button onClick={() => { onAddChecklistItem(project.id, newChecklistCategory, newChecklistTask); setNewChecklistTask(''); }} className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap border border-indigo-200 shadow-sm">{t('추가', 'Add')}</button>
                </div>
              )}
              {project.signOff?.signed ? (
                <div className="mt-6 border-t-2 border-emerald-200 pt-5 animate-[fadeIn_0.3s_ease-in-out]">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                    <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-bold text-emerald-800 mb-1">{t('고객사 검수 및 최종 승인 완료', 'Buy-off Completed & Signed')}</h4>
                    <p className="text-xs text-emerald-600 mb-3">{t('검수자:', 'By:')} <strong>{project.signOff.customerName}</strong> | {t('승인일자:', 'Date:')} {project.signOff.date}</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block mb-4"><img src={project.signOff.signatureData} alt="전자서명" className="h-16 object-contain" /></div>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <button onClick={() => generatePDF(project, projectIssues)} className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"><FileText size={16} className="mr-2"/> {t('최종 완료 보고서 (PDF) 인쇄/저장', 'Print/Save Buy-off Report (PDF)')}</button>
                      {currentUser.role === 'ADMIN' && (
                        <button onClick={() => setConfirmCancelSignOff(true)} className="inline-flex items-center px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 text-sm font-bold rounded-lg transition-colors">
                          <ShieldOff size={16} className="mr-2" /> {t('사인 취소', 'Cancel Sign-off')}
                        </button>
                      )}
                    </div>
                  </div>
                  {currentUser.role === 'ADMIN' && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-start">
                      <ShieldCheck size={16} className="text-rose-500 mr-2 mt-0.5 shrink-0" />
                      <p className="text-xs text-rose-700"><strong>{t('관리자 모드:', 'Admin mode:')}</strong> {t('Buy-off 완료 후에도 검수 항목을 수정하거나 사인을 취소할 수 있습니다. 변경 시 활동 이력에 기록됩니다.', 'You can edit checklist or cancel sign-off after Buy-off. Changes are logged.')}</p>
                    </div>
                  )}
                  {/* 사인 취소 확인 다이얼로그 */}
                  {confirmCancelSignOff && (
                    <div className="mt-3 bg-rose-50 border-2 border-rose-300 p-4 rounded-lg">
                      <p className="text-sm font-bold text-rose-800 mb-1">{t('정말 검수 사인을 취소하시겠습니까?', 'Cancel sign-off?')}</p>
                      <p className="text-xs text-rose-700 mb-3">{t('서명 데이터가 삭제되고, 프로젝트 단계가 "현장 셋업"으로 되돌아갑니다. 이 작업은 활동 이력에 기록됩니다.', 'Signature is removed and phase rolls back to "현장 셋업". This action is logged.')}</p>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setConfirmCancelSignOff(false)} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">{t('취소', 'Back')}</button>
                        <button onClick={() => { onCancelSignOff && onCancelSignOff(project.id); setConfirmCancelSignOff(false); }} className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg">{t('확정 — 사인 취소', 'Confirm — Cancel')}</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isReadyToSign && (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') ? (
                <SignaturePad onSign={(name, data) => onSignOff(project.id, name, data)} t={t} />
              ) : (
                <div className="mt-6 border-t-2 border-slate-200 pt-5 text-center p-4 bg-slate-100 rounded-xl"><p className="text-sm font-bold text-slate-500 flex items-center justify-center"><ShieldCheck size={16} className="mr-1.5 text-slate-400" />{currentUser.role === 'CUSTOMER' ? t('모든 검수 항목이 확인(OK)된 후 서명할 수 있습니다.', 'Sign-off available after all items are OK.') : t('고객사 계정으로 접속 시 전자 서명이 가능합니다.', 'Sign-off is available via Customer account.')}</p></div>
              )}
            </div>
          )}
          {activeModalTab === 'issues' && (
            <div className="space-y-4">
              {projectIssues.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('발생한 이슈가 없습니다.', 'No issues recorded.')}</div>
              ) : (
                <div className="space-y-3">
                  {projectIssues.map(issue => (
                    <div key={issue.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
                      {issue.photo && issue.photo !== 'null' && issue.photo.startsWith('data:') && <div className="w-12 h-12 bg-slate-200 rounded-lg mr-3 shrink-0 overflow-hidden"><img src={issue.photo} className="w-full h-full object-cover" alt="이슈" /></div>}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400">{issue.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(issue.status)}`}>{issue.status}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800 truncate">{issue.title}</span>
                        <div className="text-xs text-slate-500 mt-1 flex justify-between"><span className="flex items-center"><User size={10} className="mr-1"/>{issue.author}</span><span>{issue.date}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeModalTab === 'history' && (
            <div className="space-y-3">
              {/* 그룹 필터 */}
              {(project.activityLog || []).length > 0 && (() => {
                const HISTORY_GROUPS = [
                  { key: 'all', label: t('전체', 'All'), types: null },
                  { key: 'project', label: t('프로젝트', 'Project'), types: ['PROJECT_CREATE', 'PROJECT_EDIT', 'PHASE_CHANGE', 'PHASE_DEFINE', 'MANAGER_CHANGE', 'VERSION_CHANGE', 'VERSION_DELETE', 'SIGN_OFF', 'SIGN_CANCEL', 'TRIP_ADD', 'TRIP_DELETE'] },
                  { key: 'task', label: t('셋업 일정', 'Setup'), types: ['TASK_ADD', 'TASK_COMPLETE', 'TASK_DELETE', 'TASK_DATES', 'TASK_RENAME', 'TASK_MILESTONE', 'SETUP_PROGRESS', 'SETUP_DEFINE'] },
                  { key: 'extra', label: t('추가 대응', 'Extras'), types: ['EXTRA_ADD', 'EXTRA_UPDATE', 'EXTRA_DELETE'] },
                  { key: 'checklist', label: t('검수', 'Checklist'), types: ['CHECKLIST_CHANGE'] },
                  { key: 'issue', label: t('이슈', 'Issues'), types: ['ISSUE_ADD'] },
                  { key: 'request', label: t('고객요청', 'Requests'), types: ['REQUEST_ADD', 'REQUEST_STATUS'] },
                  { key: 'as', label: t('AS', 'AS'), types: ['AS_ADD', 'AS_UPDATE'] },
                  { key: 'note', label: t('회의록', 'Meetings'), types: ['NOTE_ADD'] },
                  { key: 'part', label: t('자재', 'Parts'), types: ['PART_ADD'] },
                ];
                const counts = {};
                (project.activityLog || []).forEach(log => {
                  HISTORY_GROUPS.forEach(g => {
                    if (g.key === 'all') return;
                    if (g.types.includes(log.type)) counts[g.key] = (counts[g.key] || 0) + 1;
                  });
                });
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-wrap gap-1">
                    {HISTORY_GROUPS.map(g => {
                      const count = g.key === 'all' ? (project.activityLog || []).length : (counts[g.key] || 0);
                      if (g.key !== 'all' && count === 0) return null;
                      const active = historyFilter === g.key;
                      return (
                        <button key={g.key} onClick={() => setHistoryFilter(g.key)} className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-colors ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                          {g.label} <span className={`ml-1 px-1 rounded ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {(!project.activityLog || project.activityLog.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('활동 이력이 없습니다.', 'No activity history.')}</div>
              ) : (() => {
                const HISTORY_GROUPS = {
                  project: ['PROJECT_CREATE', 'PROJECT_EDIT', 'PHASE_CHANGE', 'PHASE_DEFINE', 'MANAGER_CHANGE', 'VERSION_CHANGE', 'VERSION_DELETE', 'SIGN_OFF', 'SIGN_CANCEL', 'TRIP_ADD', 'TRIP_DELETE'],
                  task: ['TASK_ADD', 'TASK_COMPLETE', 'TASK_DELETE', 'TASK_DATES', 'TASK_RENAME', 'TASK_MILESTONE', 'SETUP_PROGRESS', 'SETUP_DEFINE'],
                  extra: ['EXTRA_ADD', 'EXTRA_UPDATE', 'EXTRA_DELETE'],
                  checklist: ['CHECKLIST_CHANGE'],
                  issue: ['ISSUE_ADD'],
                  request: ['REQUEST_ADD', 'REQUEST_STATUS'],
                  as: ['AS_ADD', 'AS_UPDATE'],
                  note: ['NOTE_ADD'],
                  part: ['PART_ADD']
                };
                const filtered = historyFilter === 'all'
                  ? project.activityLog
                  : project.activityLog.filter(log => (HISTORY_GROUPS[historyFilter] || []).includes(log.type));
                if (filtered.length === 0) {
                  return <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('해당 그룹의 이력이 없습니다.', 'No history in this group.')}</div>;
                }
                return (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                  <div className="space-y-3">
                    {[...filtered].reverse().map((log, i) => {
                      const typeConfig = {
                        PROJECT_CREATE: { icon: <TimelineIcon size={14}/>, color: 'bg-blue-100 text-blue-600 border-blue-200', label: t('프로젝트 생성', 'Created') },
                        PHASE_CHANGE: { icon: <TimelineIcon size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('단계 변경', 'Phase') },
                        PHASE_DEFINE: { icon: <TimelineIcon size={14}/>, color: 'bg-purple-100 text-purple-700 border-purple-200', label: t('단계 정의', 'Phase Def') },
                        MANAGER_CHANGE: { icon: <User size={14}/>, color: 'bg-orange-100 text-orange-600 border-orange-200', label: t('담당자 변경', 'Manager') },
                        TASK_COMPLETE: { icon: <CheckCircle size={14}/>, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', label: t('태스크 완료', 'Task Done') },
                        TASK_ADD: { icon: <ListTodo size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: t('태스크 추가', 'Task Add') },
                        TASK_DELETE: { icon: <Trash size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('태스크 삭제', 'Task Del') },
                        TASK_DATES: { icon: <CalendarDays size={14}/>, color: 'bg-blue-100 text-blue-700 border-blue-200', label: t('일정 변경', 'Date Change') },
                        TASK_RENAME: { icon: <Edit size={14}/>, color: 'bg-slate-100 text-slate-700 border-slate-200', label: t('이름 변경', 'Rename') },
                        TASK_MILESTONE: { icon: <Star size={14}/>, color: 'bg-rose-100 text-rose-700 border-rose-200', label: t('마일스톤', 'Milestone') },
                        SETUP_PROGRESS: { icon: <ListTodo size={14}/>, color: 'bg-blue-100 text-blue-700 border-blue-200', label: t('셋업 진행', 'Setup Progress') },
                        SETUP_DEFINE: { icon: <ListTodo size={14}/>, color: 'bg-blue-100 text-blue-700 border-blue-200', label: t('셋업 편집', 'Setup Edit') },
                        ISSUE_ADD: { icon: <AlertTriangle size={14}/>, color: 'bg-red-100 text-red-600 border-red-200', label: t('이슈 등록', 'Issue') },
                        PART_ADD: { icon: <Package size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('자재 청구', 'Part') },
                        CHECKLIST_CHANGE: { icon: <CheckSquare size={14}/>, color: 'bg-indigo-100 text-indigo-600 border-indigo-200', label: t('체크리스트', 'Checklist') },
                        VERSION_CHANGE: { icon: <HardDrive size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: t('버전 등록', 'Version') },
                        VERSION_DELETE: { icon: <HardDrive size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('버전 삭제', 'Version Del') },
                        SIGN_OFF: { icon: <ShieldCheck size={14}/>, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: t('Buy-off 서명', 'Sign-off') },
                        NOTE_ADD: { icon: <FileText size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('회의록', 'Meeting') },
                        REQUEST_ADD: { icon: <MessageSquare size={14}/>, color: 'bg-cyan-100 text-cyan-600 border-cyan-200', label: t('고객 요청', 'Request') },
                        REQUEST_STATUS: { icon: <MessageSquare size={14}/>, color: 'bg-cyan-100 text-cyan-600 border-cyan-200', label: t('요청 처리', 'Req Status') },
                        AS_ADD: { icon: <LifeBuoy size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('AS 등록', 'AS') },
                        AS_UPDATE: { icon: <LifeBuoy size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('AS 처리', 'AS Update') },
                        SIGN_CANCEL: { icon: <ShieldOff size={14}/>, color: 'bg-rose-100 text-rose-600 border-rose-200', label: t('사인 취소', 'Sign Cancel') },
                        TRIP_ADD: { icon: <Info size={14}/>, color: 'bg-blue-100 text-blue-600 border-blue-200', label: t('출장 등록', 'Trip Add') },
                        TRIP_DELETE: { icon: <Info size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('출장 삭제', 'Trip Del') },
                        EXTRA_ADD: { icon: <Sparkles size={14}/>, color: 'bg-pink-100 text-pink-600 border-pink-200', label: t('추가 대응 등록', 'Extra Add') },
                        EXTRA_UPDATE: { icon: <Sparkles size={14}/>, color: 'bg-pink-100 text-pink-600 border-pink-200', label: t('추가 대응 변경', 'Extra Update') },
                        EXTRA_DELETE: { icon: <Sparkles size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('추가 대응 삭제', 'Extra Delete') },
                      };
                      const cfg = typeConfig[log.type] || { icon: <Info size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: log.type };
                      // 이력 → 해당 탭으로 점프
                      const HISTORY_TAB_MAP = {
                        PROJECT_CREATE: 'tasks', PROJECT_EDIT: 'tasks',
                        PHASE_CHANGE: 'tasks', PHASE_DEFINE: 'tasks', MANAGER_CHANGE: 'tasks',
                        TASK_ADD: 'tasks', TASK_COMPLETE: 'tasks', TASK_DELETE: 'tasks',
                        TASK_DATES: 'tasks', TASK_RENAME: 'tasks', TASK_MILESTONE: 'tasks',
                        SETUP_PROGRESS: 'tasks', SETUP_DEFINE: 'tasks',
                        EXTRA_ADD: 'extras', EXTRA_UPDATE: 'extras', EXTRA_DELETE: 'extras',
                        CHECKLIST_CHANGE: 'checklist',
                        ISSUE_ADD: 'issues',
                        REQUEST_ADD: 'requests', REQUEST_STATUS: 'requests',
                        AS_ADD: 'as', AS_UPDATE: 'as',
                        NOTE_ADD: 'notes',
                        VERSION_CHANGE: 'tasks', VERSION_DELETE: 'tasks',
                        SIGN_OFF: 'tasks', SIGN_CANCEL: 'tasks',
                        TRIP_ADD: 'tasks', TRIP_DELETE: 'tasks',
                        // PART_ADD: 자재는 별도 페이지 — 점프 불가
                      };
                      const targetTab = HISTORY_TAB_MAP[log.type];
                      const clickable = !!targetTab;
                      const Wrapper = clickable ? 'button' : 'div';
                      const wrapperProps = clickable
                        ? {
                            type: 'button',
                            onClick: () => setActiveModalTab(targetTab),
                            className: 'w-full text-left bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer',
                            title: t('해당 탭으로 이동', 'Jump to this tab')
                          }
                        : { className: 'bg-white p-3 rounded-xl border border-slate-200 shadow-sm' };
                      return (
                        <div key={i} className="relative pl-10">
                          <div className={`absolute left-2 top-3 w-5 h-5 rounded-full border flex items-center justify-center z-10 ${cfg.color}`}>{cfg.icon}</div>
                          <Wrapper {...wrapperProps}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">{log.date}</span>
                                {clickable && <ExternalLink size={11} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                              </div>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{log.detail}</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center"><User size={10} className="mr-1"/>{log.user}</p>
                          </Wrapper>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>
          )}
          {activeModalTab === 'notes' && (() => {
            const fmtSize = (b) => {
              if (!b && b !== 0) return '';
              if (b < 1024) return b + ' B';
              if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
              return (b / 1024 / 1024).toFixed(2) + ' MB';
            };
            const handleSubmitNote = async () => {
              if (!newNoteText.trim() && newNoteFiles.length === 0) return;
              setNoteError('');
              if (newNoteFiles.length > 0 && !driveConfigured) {
                setNoteError(t('Drive 연동이 설정되지 않아 파일을 업로드할 수 없습니다.', 'Drive not configured — cannot upload file.'));
                return;
              }
              setNoteUploading(true);
              try {
                await onAddNote(project.id, newNoteText.trim(), {
                  summary: newNoteSummary.trim(),
                  meetingDate: newNoteMeetingDate || '',
                  attendees: newNoteAttendees.trim(),
                  decisions: newNoteDecisions.trim(),
                  actions: newNoteActions.trim(),
                  files: newNoteFiles,
                  onProgress: ({ percent, index }) => {
                    setNoteUploadProgress(percent || 0);
                    if (typeof index === 'number') setNoteUploadIdx(index);
                  }
                });
                setNewNoteText(''); setNewNoteSummary(''); setNewNoteFiles([]); setNoteUploadProgress(0); setNoteUploadIdx(0);
                setNewNoteMeetingDate(''); setNewNoteAttendees(''); setNewNoteDecisions(''); setNewNoteActions('');
                setNoteFormOpen(false); // 등록 후 폼 자동 접힘
              } catch (e) {
                setNoteError((e && e.message) || String(e));
              }
              setNoteUploading(false);
            };
            return (
              <div className="space-y-4">
                {/* 등록 영역 — 평소엔 접혀 있고 버튼 클릭 시 펼침 */}
                {currentUser.role !== 'CUSTOMER' && !noteFormOpen && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteFormOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <Plus size={16} />{t('새 회의록 작성', 'New Meeting Note')}
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:block">
                      {t('빠른 / 상세 모드 모두 지원 · 다중 파일', 'Quick/Detail modes · multi-file')}
                    </span>
                  </div>
                )}

                {currentUser.role !== 'CUSTOMER' && noteFormOpen && (
                  <div className="bg-white p-4 rounded-xl border-2 border-amber-300 shadow-md space-y-3 ring-2 ring-amber-100">
                    {/* 폼 헤더 (제목 + 닫기) */}
                    <div className="flex items-center justify-between -mt-1 mb-1 pb-2 border-b border-amber-200">
                      <span className="text-sm font-black text-amber-800 flex items-center"><FileText size={14} className="mr-1.5" />{t('새 회의록 작성', 'New Meeting Note')}</span>
                      <button
                        type="button"
                        onClick={() => setNoteFormOpen(false)}
                        disabled={noteUploading}
                        className="text-slate-400 hover:text-slate-700 p-1 disabled:opacity-50"
                        title={t('접기', 'Collapse')}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="bg-amber-50 text-amber-800 p-2 rounded-lg text-[11px] font-medium border border-amber-200 flex items-start">
                      <Info size={12} className="mr-1.5 shrink-0 mt-0.5" />
                      <div>
                        {t('파일은 ', 'Files go to ')}
                        <code className="bg-white px-1 rounded text-[10px]">[프로젝트]/회의록</code>
                        {t(' 폴더에 저장됩니다.', ' folder.')}
                      </div>
                    </div>
                    {/* 모드 토글 — 빠른 / 상세 */}
                    <div className="flex items-center gap-2 -mb-1">
                      <span className="text-[11px] font-bold text-slate-500">{t('등록 모드', 'Mode')}</span>
                      <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setNewNoteMode('quick')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${newNoteMode === 'quick' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('빠른', 'Quick')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewNoteMode('detail')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${newNoteMode === 'detail' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('상세', 'Detail')}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {newNoteMode === 'quick' ? t('본문 + 첨부만', 'Body + files only') : t('회의 일시 / 참석자 / 결정 / 액션 포함', 'Includes date / attendees / decisions / actions')}
                      </span>
                    </div>

                    {/* 상세 모드 — 회의 일시 + 참석자 */}
                    {newNoteMode === 'detail' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-800 mb-1 flex items-center"><Calendar size={11} className="mr-1" />{t('회의 일시', 'Meeting Date')}</label>
                          <input
                            type="datetime-local"
                            className="w-full text-sm p-2 border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                            value={newNoteMeetingDate}
                            onChange={(e) => setNewNoteMeetingDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-amber-800 mb-1 flex items-center"><User size={11} className="mr-1" />{t('참석자', 'Attendees')}</label>
                          <input
                            type="text"
                            className="w-full text-sm p-2 border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                            value={newNoteAttendees}
                            onChange={(e) => setNewNoteAttendees(e.target.value)}
                            placeholder={t('홍길동, 김철수, 이영희 (쉼표로 구분)', 'Comma-separated names')}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('논의 내용 (본문)', 'Discussion (Body)')}</label>
                      <textarea rows="4" className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-amber-500" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder={t(newNoteMode === 'detail' ? '주요 논의 내용을 입력하세요. (안건·진행 상황·이슈 등)' : '회의 내용을 자유롭게 입력하세요.', newNoteMode === 'detail' ? 'Discussion details (topics, progress, issues)' : 'Meeting notes')}></textarea>
                    </div>

                    {/* 상세 모드 — 결정사항 + 액션 아이템 */}
                    {newNoteMode === 'detail' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center"><CheckSquare size={11} className="mr-1 text-emerald-600" />{t('결정사항', 'Decisions')}</label>
                          <textarea rows="2" className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-amber-500" value={newNoteDecisions} onChange={(e) => setNewNoteDecisions(e.target.value)} placeholder={t('회의에서 합의된 결정사항 (한 줄에 하나씩)', 'Decisions made (one per line)')}></textarea>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center"><ListTodo size={11} className="mr-1 text-blue-600" />{t('액션 아이템 (후속 조치)', 'Action Items')}</label>
                          <textarea rows="2" className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-amber-500" value={newNoteActions} onChange={(e) => setNewNoteActions(e.target.value)} placeholder={t('담당자/일정/할 일 (한 줄에 하나씩)', 'Action items with owner/due (one per line)')}></textarea>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('한줄 요약 (대시보드 노출, 선택)', 'One-line Summary (shown on dashboard, optional)')}</label>
                      <textarea rows="2" className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-amber-500" value={newNoteSummary} onChange={(e) => setNewNoteSummary(e.target.value)} placeholder={t('대시보드 카드에 보일 한 줄 요약', 'Short summary visible on the dashboard card')}></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('첨부 파일 (선택, 다중 첨부 가능)', 'Attached Files (optional, multiple)')}</label>
                      {newNoteFiles.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {newNoteFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <Paperclip size={14} className="text-amber-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{f.name}</div>
                                <div className="text-[10px] text-slate-500">{fmtSize(f.size)}</div>
                              </div>
                              <button type="button" onClick={() => setNewNoteFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600 p-1" title={t('제거', 'Remove')}><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label
                        onDragOver={(e) => { if (!driveConfigured) return; e.preventDefault(); setNoteDragOver(true); }}
                        onDragLeave={() => setNoteDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setNoteDragOver(false);
                          if (!driveConfigured) return;
                          const fs = Array.from(e.dataTransfer.files || []);
                          if (fs.length) setNewNoteFiles(prev => [...prev, ...fs]);
                        }}
                        className={`block border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${!driveConfigured ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60' : noteDragOver ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-amber-50/40'}`}
                      >
                        <input type="file" multiple className="hidden" disabled={!driveConfigured} onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setNewNoteFiles(prev => [...prev, ...fs]); e.target.value = ''; }} />
                        <Upload size={18} className="mx-auto mb-1 text-amber-500" />
                        <div className="text-xs font-bold text-slate-600">{driveConfigured ? t(newNoteFiles.length > 0 ? '파일 추가 (드래그 또는 클릭)' : '파일을 드래그하거나 클릭하여 첨부 (다중 가능)', newNoteFiles.length > 0 ? 'Add more files' : 'Drag or click to attach files (multiple)') : t('Drive 미연동 — 첨부 불가', 'Drive not configured')}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{t('파일당 최대 18MB · 본문/요약 없이 파일만 등록도 가능', 'Up to 18MB per file · file-only allowed')}</div>
                      </label>
                    </div>
                    {noteError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-2 flex items-center">
                        <AlertTriangle size={12} className="mr-1.5 shrink-0" />{noteError}
                      </div>
                    )}
                    {noteUploading && (
                      <div className="text-xs text-amber-700 font-bold flex items-center">
                        <Loader size={12} className="animate-spin mr-1.5" />
                        {t('등록 중...', 'Saving...')}
                        {newNoteFiles.length > 0 && ` ${noteUploadIdx + 1}/${newNoteFiles.length} · ${noteUploadProgress}%`}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button onClick={handleSubmitNote} disabled={noteUploading || (!newNoteText.trim() && newNoteFiles.length === 0)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center"><FileText size={14} className="mr-1.5" />{t('회의록 등록', 'Add Meeting')}</button>
                    </div>
                  </div>
                )}

                {(!project.notes || project.notes.length === 0) ? (
                  <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 회의록이 없습니다.', 'No meeting notes yet.')}</div>
                ) : (() => {
                  // 날짜순 desc 정렬 (note.id = timestamp)
                  const sorted = [...project.notes].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
                  const today = new Date();
                  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                  const DAY = 86400000;
                  return (
                    <div className="relative">
                      {/* 좌측 세로 타임라인 라인 */}
                      <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-amber-200"></div>
                      <div className="space-y-3">
                        {sorted.map((note) => {
                          // 날짜 strip 계산 — 이력 탭과 동일 패턴
                          const ts = Number(note.id) || 0;
                          const d = ts > 0 ? new Date(ts) : null;
                          const valid = d && !isNaN(d);
                          const d0 = valid ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;
                          const diff = d0 !== null ? Math.floor((today0 - d0) / DAY) : null;
                          const dow = valid ? ['일','월','화','수','목','금','토'][d.getDay()] : '';
                          const mm = valid ? d.getMonth() + 1 : '';
                          const dd = valid ? d.getDate() : '';
                          const hh = valid ? String(d.getHours()).padStart(2,'0') : '';
                          const mi = valid ? String(d.getMinutes()).padStart(2,'0') : '';
                          let rel = '';
                          if (diff === 0) rel = t('오늘', 'Today');
                          else if (diff === 1) rel = t('어제', 'Yesterday');
                          else if (diff > 1 && diff < 7) rel = t(`${diff}일 전`, `${diff}d ago`);
                          else if (diff >= 7 && diff < 30) rel = t(`${Math.floor(diff/7)}주 전`, `${Math.floor(diff/7)}w ago`);
                          else if (diff >= 30 && diff < 365) rel = t(`${Math.floor(diff/30)}개월 전`, `${Math.floor(diff/30)}mo ago`);
                          else if (diff >= 365) rel = t(`${Math.floor(diff/365)}년 전`, `${Math.floor(diff/365)}y ago`);
                          // 날짜 strip 색상 — 신선도
                          const stripCls = diff === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : diff <= 1 ? 'bg-amber-300 text-amber-900 border-amber-400'
                            : diff < 7 ? 'bg-amber-200 text-amber-800 border-amber-300'
                            : diff < 30 ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300';
                          const files = Array.isArray(note.files) ? note.files : (note.file ? [note.file] : []);
                          return (
                            <div key={note.id} className="relative pl-[68px]">
                              {/* 좌측 날짜 노드 (캘린더 스타일, z-10으로 라인 위에) */}
                              <div className={`absolute left-0 top-1 w-14 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center py-1.5 z-10 ${stripCls}`} title={valid ? `${mm}/${dd} ${hh}:${mi}` : note.date}>
                                <div className="text-[9px] font-black leading-none">{valid ? `${mm}월` : '-'}</div>
                                <div className="text-xl font-black leading-none mt-0.5 tabular-nums">{valid ? dd : '-'}</div>
                                <div className="text-[8px] font-medium leading-none mt-0.5 opacity-70">{valid ? `${dow}요일` : ''}</div>
                              </div>
                              {/* 우측 본문 카드 */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">{note.author.charAt(0)}</div>
                                    <span className="text-sm font-bold text-slate-800">{note.author}</span>
                                    {valid && (
                                      <span className="text-[10px] text-slate-500 flex items-center"><Clock size={10} className="mr-0.5" />{hh}:{mi}{rel && <span className="ml-1.5 text-slate-400 font-medium">· {rel}</span>}</span>
                                    )}
                                    {!valid && note.date && <span className="text-[10px] text-slate-400">{note.date}</span>}
                                  </div>
                                  {(currentUser.role === 'ADMIN' || currentUser.name === note.author) && (
                                    <button onClick={() => onDeleteNote(project.id, note.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                      <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                                    </button>
                                  )}
                                </div>
                                {/* 상세 모드 메타: 회의 일시 + 참석자 */}
                                {(note.meetingDate || note.attendees) && (
                                  <div className="mb-2 flex items-center gap-2 flex-wrap text-[11px]">
                                    {note.meetingDate && (
                                      <span className="inline-flex items-center bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                                        <Calendar size={10} className="mr-1" />{note.meetingDate.replace('T', ' ').slice(0, 16)}
                                      </span>
                                    )}
                                    {note.attendees && (
                                      <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold">
                                        <User size={10} className="mr-1" />
                                        <span className="truncate max-w-[400px]">{note.attendees}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                                {note.summary && (
                                  <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                    <div className="text-[10px] font-bold text-amber-700 mb-1">{t('요약', 'Summary')}</div>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.summary}</p>
                                  </div>
                                )}
                                {note.text && <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.text}</p>}
                                {/* 결정사항 */}
                                {note.decisions && (
                                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                                    <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center"><CheckSquare size={11} className="mr-1" />{t('결정사항', 'Decisions')}</div>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.decisions}</p>
                                  </div>
                                )}
                                {/* 액션 아이템 */}
                                {note.actions && (
                                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                                    <div className="text-[10px] font-bold text-blue-700 mb-1 flex items-center"><ListTodo size={11} className="mr-1" />{t('액션 아이템', 'Action Items')}</div>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.actions}</p>
                                  </div>
                                )}
                                {files.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    {files.map((f, fIdx) => (
                                      <div key={fIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                          <Paperclip size={13} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-bold text-slate-800 truncate" title={f.fileName}>{f.fileName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{fmtSize(f.size)}</div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {f.viewUrl && (
                                            <a href={f.viewUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors" title={t('Drive에서 열기', 'Open in Drive')}><ExternalLink size={13} /></a>
                                          )}
                                          {f.downloadUrl && (
                                            <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors" title={t('다운로드', 'Download')}><Download size={13} /></a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {activeModalTab === 'attachments' && (() => {
            const attachments = [...(project.attachments || [])]
              .filter(a => (a.category || '기타') !== '회의록') // 회의록은 회의록 탭에서 별도 관리
              .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
            const canEdit = currentUser.role !== 'CUSTOMER';
            const ATTACH_CATEGORIES = ['명세서', '도면', '기타'];
            const visible = attachGroupFilter === 'all' ? attachments : attachments.filter(a => (a.category || '기타') === attachGroupFilter);
            const counts = ATTACH_CATEGORIES.reduce((acc, k) => { acc[k] = attachments.filter(a => (a.category || '기타') === k).length; return acc; }, {});
            const catBadge = (cat) => {
              switch (cat) {
                case '명세서': return 'bg-blue-100 text-blue-700 border-blue-200';
                case '도면': return 'bg-amber-100 text-amber-700 border-amber-200';
                default: return 'bg-slate-100 text-slate-700 border-slate-200';
              }
            };
            const fmtSize = (b) => {
              if (!b && b !== 0) return '';
              if (b < 1024) return b + ' B';
              if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
              return (b / 1024 / 1024).toFixed(2) + ' MB';
            };
            const handleFiles = async (files) => {
              if (!files || files.length === 0 || !onUploadAttachment) return;
              setAttachError('');
              setAttachUploading(true);
              for (const f of files) {
                try {
                  await onUploadAttachment(project.id, f, ({ percent }) => setAttachProgress(percent || 0), attachCategory);
                } catch (e) {
                  setAttachError((e && e.message) || String(e));
                }
              }
              setAttachUploading(false);
              setAttachProgress(0);
            };
            return (
              <div className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs font-medium border border-emerald-200 flex items-start">
                  <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
                  <div>
                    {t('명세서·도면·PDF 등 참고자료를 업로드합니다. ', 'Upload spec sheets, drawings, PDFs. ')}
                    <strong className="text-emerald-900">{t('회의록은 [회의록] 탭에서 별도로 관리하세요.', 'Meeting minutes go in the [Meetings] tab.')}</strong>
                    <br />
                    <span className="text-[11px] text-emerald-700">
                      {t('Drive 저장 위치: ', 'Drive path: ')}
                      <code className="bg-white px-1 rounded text-[11px]">[루트]/[고객사]/[프로젝트]/[카테고리]</code>
                    </span>
                  </div>
                </div>

                {!driveConfigured ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 flex items-start">
                    <AlertTriangle size={16} className="mr-2 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>{t('Drive 연동이 설정되지 않았습니다.', 'Drive not configured.')}</strong>
                      <p className="mt-1 text-xs">{t('관리자가 [시스템 설정 → Google Drive 연동]에서 루트 폴더를 등록해야 업로드가 가능합니다.', 'Admin must set the root folder in [System Settings → Google Drive Integration].')}</p>
                    </div>
                  </div>
                ) : canEdit ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600">{t('업로드 카테고리:', 'Category:')}</span>
                      {ATTACH_CATEGORIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAttachCategory(c)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${attachCategory === c ? `${catBadge(c)} ring-2 ring-offset-1 ring-emerald-300` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <label
                      onDragOver={(e) => { e.preventDefault(); setAttachDragOver(true); }}
                      onDragLeave={() => setAttachDragOver(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setAttachDragOver(false);
                        await handleFiles(Array.from(e.dataTransfer.files || []));
                      }}
                      className={`block border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${attachDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'} ${attachUploading ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        disabled={attachUploading}
                        onChange={async (e) => { await handleFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
                      />
                      {attachUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader size={28} className="text-emerald-500 animate-spin mb-2" />
                          <div className="text-sm font-bold text-emerald-700">{t('업로드 중...', 'Uploading...')} {attachProgress}%</div>
                          <div className="w-48 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                            <div className="h-1.5 bg-emerald-500 transition-all" style={{ width: `${attachProgress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload size={28} className="text-emerald-500 mb-2" />
                          <div className="text-sm font-bold text-slate-700">{t('파일을 드래그하거나 클릭하여 업로드', 'Drag files here or click to upload')}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{t('업로드 카테고리: ', 'Will be uploaded as: ')}<span className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${catBadge(attachCategory)}`}>{attachCategory}</span></div>
                        </div>
                      )}
                    </label>
                  </div>
                ) : null}

                {attachError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-2.5 flex items-center">
                    <AlertTriangle size={14} className="mr-1.5 shrink-0" />{attachError}
                  </div>
                )}

                {attachments.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    {t('등록된 참고자료가 없습니다.', 'No attachments yet.')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {attachments[0] && attachments[0].folderUrl && (
                        <a
                          href={attachments[0].folderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <FolderOpen size={12} className="mr-1.5" /> {t('Drive 프로젝트 폴더', 'Open project folder')} <ExternalLink size={11} className="ml-1.5" />
                        </a>
                      )}
                      <span className="ml-1 text-[11px] text-slate-400">|</span>
                      <button onClick={() => setAttachGroupFilter('all')} className={`text-[11px] px-2 py-1 rounded-lg font-bold border transition-colors ${attachGroupFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')} <span className={`ml-0.5 px-1 rounded ${attachGroupFilter === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>{attachments.length}</span></button>
                      {ATTACH_CATEGORIES.map(c => (
                        counts[c] > 0 && (
                          <button key={c} onClick={() => setAttachGroupFilter(c)} className={`text-[11px] px-2 py-1 rounded-lg font-bold border transition-colors ${attachGroupFilter === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            {c} <span className={`ml-0.5 px-1 rounded ${attachGroupFilter === c ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[c]}</span>
                          </button>
                        )
                      ))}
                    </div>
                    {visible.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('해당 카테고리의 파일이 없습니다.', 'No files in this category.')}</div>
                    ) : visible.map(a => {
                      const cat = a.category || '기타';
                      return (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:border-emerald-300 transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                            <Paperclip size={16} className="text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5" title={a.fileName}>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${catBadge(cat)}`}>{cat}</span>
                              <span className="truncate">{a.fileName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-mono">{fmtSize(a.size)}</span>
                              <span>·</span>
                              <span className="flex items-center"><User size={10} className="mr-0.5" />{a.uploadedBy}</span>
                              <span>·</span>
                              <span>{a.uploadedAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {a.viewUrl && (
                              <a href={a.viewUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors" title={t('Drive에서 열기', 'Open in Drive')}>
                                <ExternalLink size={14} />
                              </a>
                            )}
                            {a.downloadUrl && (
                              <a href={a.downloadUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors" title={t('다운로드', 'Download')}>
                                <Download size={14} />
                              </a>
                            )}
                            {canEdit && onDeleteAttachment && (
                              <button onClick={() => { if (window.confirm(t('이 참고자료를 삭제할까요? Drive 휴지통으로 이동합니다.', 'Delete this attachment? File will be moved to Drive trash.'))) onDeleteAttachment(project.id, a.id); }} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {activeModalTab === 'requests' && (
            <div className="space-y-4">
              <div className="bg-cyan-50 text-cyan-800 p-3 rounded-lg text-xs font-medium border border-cyan-200 flex items-center">
                <Info size={14} className="mr-1.5 shrink-0" />
                {t('고객 요청사항을 체계적으로 관리합니다. 접수 → 검토 → 반영 완료/반려 단계로 추적됩니다.', 'Track customer requests: Received → Reviewing → Completed/Rejected')}
              </div>

              {/* 새 요청 등록 폼 (CUSTOMER 포함 모든 권한) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('요청자', 'Requester')}{currentUser.role === 'CUSTOMER' && currentUser.customer ? ` (${currentUser.customer})` : ''}</label>
                    <input type="text" disabled={currentUser.role === 'CUSTOMER'} className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-600" value={newRequestForm.requester} onChange={(e) => setNewRequestForm({...newRequestForm, requester: e.target.value})} placeholder={t('예: 홍길동 책임', 'Name')} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('긴급도', 'Urgency')}</label>
                    <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newRequestForm.urgency} onChange={(e) => setNewRequestForm({...newRequestForm, urgency: e.target.value})}>
                      <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('요청 내용', 'Content')}</label>
                  <textarea rows="2" className="w-full text-sm p-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-cyan-500" value={newRequestForm.content} onChange={(e) => setNewRequestForm({...newRequestForm, content: e.target.value})} placeholder={currentUser.role === 'CUSTOMER' ? t('필요한 사항을 입력하세요', 'Describe what you need') : t('고객이 요청한 내용을 입력하세요', 'Request content')}></textarea>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { if (newRequestForm.content.trim() && newRequestForm.requester.trim()) { onAddCustomerRequest(project.id, newRequestForm); setNewRequestForm({ requester: currentUser.role === 'CUSTOMER' ? currentUser.name : '', content: '', urgency: 'Medium' }); } }} disabled={!newRequestForm.content.trim() || !newRequestForm.requester.trim()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center"><MessageSquare size={14} className="mr-1.5" />{t('요청 등록', 'Submit')}</button>
                </div>
              </div>

              {/* 요청 목록 */}
              {(!project.customerRequests || project.customerRequests.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 고객 요청사항이 없습니다.', 'No customer requests.')}</div>
              ) : (
                <div className="space-y-3">
                  {[...project.customerRequests].reverse().map(req => {
                    const statusColor = req.status === '반영 완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : req.status === '검토중' ? 'bg-blue-50 text-blue-700 border-blue-200' : req.status === '반려' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                    const urgencyColor = req.urgency === 'High' ? 'bg-red-100 text-red-700' : req.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return (
                      <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        {/* 헤더 */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${urgencyColor}`}>{req.urgency}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{req.status}</span>
                            <span className="text-xs font-bold text-slate-700 ml-1"><User size={10} className="inline mr-0.5" />{req.requester}</span>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[10px] text-slate-400">{req.date}</span>
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                              <button onClick={() => onDeleteCustomerRequest(project.id, req.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 요청 내용 */}
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">{req.content}</p>

                        {/* 상태 변경 버튼 (내부 직원 전용) */}
                        {currentUser.role !== 'CUSTOMER' && (
                          <>
                            <div className="flex space-x-1 mb-2 flex-wrap gap-y-1">
                              {['접수', '검토중', '반영 완료', '반려'].map(s => {
                                const needsResolution = (s === '반영 완료' || s === '반려');
                                return (
                                  <button key={s} onClick={() => {
                                    if (needsResolution) {
                                      setResolvingRequest({ id: req.id, status: s, text: req.resolution || '' });
                                    } else {
                                      onUpdateCustomerRequestStatus(project.id, req.id, s);
                                    }
                                  }} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ${req.status === s ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                                );
                              })}
                            </div>

                            {/* 처리 결과 입력 폼 */}
                            {resolvingRequest && resolvingRequest.id === req.id && (
                              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2.5 mb-2 space-y-2">
                                <p className="text-[11px] font-bold text-cyan-800">
                                  {resolvingRequest.status === '반영 완료'
                                    ? t('처리 결과 입력 (예: 메일로 회신 완료, 차기 패치 반영, 전화 안내 완료)', 'Resolution note (e.g., Email sent, Patch in next release)')
                                    : t('반려 사유 입력 (예: 범위 초과, 보류 사항)', 'Rejection reason (e.g., out of scope)')}
                                </p>
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full text-xs p-2 border border-cyan-300 rounded bg-white focus:outline-none focus:border-cyan-600"
                                  value={resolvingRequest.text}
                                  onChange={(e) => setResolvingRequest({ ...resolvingRequest, text: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && resolvingRequest.text.trim()) {
                                      onUpdateCustomerRequestStatus(project.id, req.id, resolvingRequest.status, resolvingRequest.text.trim());
                                      setResolvingRequest(null);
                                    } else if (e.key === 'Escape') {
                                      setResolvingRequest(null);
                                    }
                                  }}
                                  placeholder={t('처리 방법 / 사유를 입력하세요', 'Enter resolution / reason')}
                                />
                                <div className="flex justify-end space-x-1.5">
                                  <button onClick={() => setResolvingRequest(null)} className="text-[10px] px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">{t('취소', 'Cancel')}</button>
                                  <button
                                    disabled={!resolvingRequest.text.trim()}
                                    onClick={() => {
                                      onUpdateCustomerRequestStatus(project.id, req.id, resolvingRequest.status, resolvingRequest.text.trim());
                                      setResolvingRequest(null);
                                    }}
                                    className="text-[10px] px-2.5 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-300 font-bold"
                                  >{t('확정', 'Confirm')}</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* 처리 결과 표시 (반영 완료 / 반려 시) */}
                        {req.resolution && (req.status === '반영 완료' || req.status === '반려') && (
                          <div className={`mt-2 p-2.5 rounded-lg border text-xs ${req.status === '반영 완료' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-start">
                              <CheckCircle size={12} className={`mr-1.5 mt-0.5 shrink-0 ${req.status === '반영 완료' ? 'text-emerald-600' : 'text-slate-500'}`} />
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold mb-0.5 ${req.status === '반영 완료' ? 'text-emerald-800' : 'text-slate-700'}`}>{t('처리 결과', 'Resolution')}</div>
                                <p className={`whitespace-pre-wrap leading-relaxed ${req.status === '반영 완료' ? 'text-emerald-900' : 'text-slate-700'}`}>{req.resolution}</p>
                                {(req.resolvedBy || req.resolvedAt) && (
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {req.resolvedBy && <span className="mr-2">{t('처리자', 'By')}: {req.resolvedBy}</span>}
                                    {req.resolvedAt && <span>{req.resolvedAt}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 응답 내역 */}
                        {req.responses && req.responses.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100">
                            {req.responses.map((res, i) => (
                              <div key={i} className="flex items-start bg-blue-50 p-2 rounded text-xs border border-blue-100">
                                <Send size={10} className="text-blue-500 mr-1.5 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                    <span className="font-bold">{res.author}</span>
                                    <span>{res.date}</span>
                                  </div>
                                  <p className="text-slate-700 whitespace-pre-wrap">{res.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 응답 입력 (CUSTOMER 포함) */}
                        <div className="flex gap-2 mt-2">
                          <input type="text" placeholder={currentUser.role === 'CUSTOMER' ? t('답변/추가 코멘트 입력...', 'Reply / comment...') : t('고객에게 답변 입력...', 'Response to customer...')} className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500" value={responseText[req.id] || ''} onChange={(e) => setResponseText({...responseText, [req.id]: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter' && responseText[req.id]?.trim()) { onAddCustomerResponse(project.id, req.id, responseText[req.id].trim()); setResponseText({...responseText, [req.id]: ''}); } }} />
                          <button onClick={() => { if (responseText[req.id]?.trim()) { onAddCustomerResponse(project.id, req.id, responseText[req.id].trim()); setResponseText({...responseText, [req.id]: ''}); } }} disabled={!responseText[req.id]?.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors"><Send size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeModalTab === 'as' && (
            <div className="space-y-4">
              <div className="bg-purple-50 text-purple-800 p-3 rounded-lg text-xs font-medium border border-purple-200 flex items-center">
                <Info size={14} className="mr-1.5 shrink-0" />
                {project.status === '완료'
                  ? t('Buy-off 완료 후 AS(애프터서비스) 내역을 관리합니다.', 'After-sales service records.')
                  : t('※ AS 관리는 Buy-off 완료 후 본격 활용됩니다. 현재 설치 중 AS도 등록 가능합니다.', 'AS management activates after Buy-off.')}
              </div>

              {/* AS 등록 폼 */}
              {currentUser.role !== 'CUSTOMER' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('AS 유형', 'Type')}</label>
                      <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.type} onChange={(e) => setNewASForm({...newASForm, type: e.target.value})}>
                        <option value="정기점검">{t('정기점검', 'Regular')}</option>
                        <option value="긴급출동">{t('긴급출동', 'Emergency')}</option>
                        <option value="부품교체">{t('부품교체', 'Part Replace')}</option>
                        <option value="불량수리">{t('불량수리', 'Defect Fix')}</option>
                        <option value="보증수리">{t('보증수리', 'Warranty')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('담당 엔지니어', 'Engineer')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.engineer} onChange={(e) => setNewASForm({...newASForm, engineer: e.target.value})} placeholder={t('이름 입력', 'Name')} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('증상 / 요청 내용', 'Symptoms / Request')}</label>
                    <textarea rows="2" className="w-full text-sm p-2 border border-slate-300 rounded-lg resize-none" value={newASForm.description} onChange={(e) => setNewASForm({...newASForm, description: e.target.value})} placeholder={t('고객이 신고한 증상', 'Reported symptoms')}></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('조치 내용 (선택)', 'Resolution (Optional)')}</label>
                    <textarea rows="2" className="w-full text-sm p-2 border border-slate-300 rounded-lg resize-none" value={newASForm.resolution} onChange={(e) => setNewASForm({...newASForm, resolution: e.target.value})} placeholder={t('출동 후 작성', 'Fill after visit')}></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => { if (newASForm.description.trim() && newASForm.engineer.trim()) { onAddAS(project.id, newASForm); setNewASForm({ type: '정기점검', engineer: '', description: '', resolution: '' }); } }} disabled={!newASForm.description.trim() || !newASForm.engineer.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center"><LifeBuoy size={14} className="mr-1.5" />{t('AS 등록', 'Add AS')}</button>
                  </div>
                </div>
              )}

              {/* AS 목록 */}
              {(!project.asRecords || project.asRecords.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 AS 내역이 없습니다.', 'No AS records.')}</div>
              ) : (
                <div className="space-y-3">
                  {[...project.asRecords].reverse().map(as => {
                    const statusColor = as.status === '완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : as.status === '출동' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                    const typeColor = as.type === '긴급출동' ? 'bg-red-100 text-red-700' : as.type === '정기점검' ? 'bg-blue-100 text-blue-700' : as.type === '부품교체' ? 'bg-amber-100 text-amber-700' : as.type === '보증수리' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700';
                    return (
                      <div key={as.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeColor}`}>{as.type}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{as.status}</span>
                            <span className="text-xs font-bold text-slate-700 ml-1"><User size={10} className="inline mr-0.5" />{as.engineer}</span>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[10px] text-slate-400">{as.date}</span>
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                              <button onClick={() => onDeleteAS(project.id, as.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-500 mb-1">{t('증상', 'Symptoms')}</div>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{as.description}</p>
                          </div>
                          {as.resolution && (
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                              <div className="text-[10px] font-bold text-emerald-600 mb-1">{t('조치 내용', 'Resolution')}</div>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{as.resolution}</p>
                            </div>
                          )}
                        </div>

                        {currentUser.role !== 'CUSTOMER' && (
                          <div className="flex space-x-1 mt-3">
                            {['접수', '출동', '완료'].map(s => (
                              <button key={s} onClick={() => onUpdateAS(project.id, as.id, { status: s })} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ${as.status === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeModalTab === 'extras' && (
            <div className="space-y-4">
              <div className="bg-pink-50 text-pink-800 p-3 rounded-lg text-xs font-medium border border-pink-200 flex items-start">
                <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
                <span>{t('검수 완료 후 고객사 요청에 의한 추가 개발/기능 추가 작업을 별도로 관리합니다. 셋업 일정과 분리되어, 워런티 단계에서 진행되는 변경 사항을 추적합니다.', 'Track post-Buy-off enhancements and customer-requested development separately from setup tasks.')}</span>
              </div>

              {/* 등록 폼 */}
              {currentUser.role !== 'CUSTOMER' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('작업 유형', 'Type')}</label>
                      <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.type} onChange={(e) => setNewExtraForm({...newExtraForm, type: e.target.value})}>
                        <option value="기능 추가">{t('기능 추가', 'Feature')}</option>
                        <option value="기능 개선">{t('기능 개선', 'Improvement')}</option>
                        <option value="버그 수정">{t('버그 수정', 'Bugfix')}</option>
                        <option value="UI 변경">{t('UI 변경', 'UI Change')}</option>
                        <option value="공정 튜닝">{t('공정 튜닝', 'Process Tuning')}</option>
                        <option value="기타">{t('기타', 'Other')}</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('요청자 / 부서', 'Requester / Dept')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.requester} onChange={(e) => setNewExtraForm({...newExtraForm, requester: e.target.value})} placeholder={t('예: A전자 공정팀 박과장', 'e.g. A전자 - 박과장')} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('작업 내용', 'Task Description')}</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.name} onChange={(e) => setNewExtraForm({...newExtraForm, name: e.target.value})} placeholder={t('예: HMI에 OEE 실시간 그래프 추가', 'e.g. Add real-time OEE chart to HMI')} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('시작 예정일', 'Start')}</label>
                      <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.startDate} onChange={(e) => setNewExtraForm({...newExtraForm, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('종료 예정일', 'End')}</label>
                      <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.endDate} onChange={(e) => setNewExtraForm({...newExtraForm, endDate: e.target.value})} />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => {
                        if (newExtraForm.name.trim()) {
                          onAddExtraTask(project.id, { ...newExtraForm, name: newExtraForm.name.trim(), requester: newExtraForm.requester.trim(), note: newExtraForm.note.trim() });
                          setNewExtraForm({ name: '', requester: '', type: '기능 추가', startDate: '', endDate: '', note: '' });
                        }
                      }} disabled={!newExtraForm.name.trim()} className="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center"><Plus size={14} className="mr-1" />{t('등록', 'Add')}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 목록 */}
              {(!project.extraTasks || project.extraTasks.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
                  {t('등록된 추가 대응 작업이 없습니다.', 'No extra tasks recorded.')}
                </div>
              ) : (
                <div className="space-y-3">
                  {[...project.extraTasks].reverse().map(task => {
                    const typeColor = task.type === '기능 추가' ? 'bg-pink-100 text-pink-700 border-pink-200'
                      : task.type === '기능 개선' ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : task.type === '버그 수정' ? 'bg-red-100 text-red-700 border-red-200'
                          : task.type === 'UI 변경' ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : task.type === '공정 튜닝' ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200';
                    const statusColor = task.status === '완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : task.status === '진행중' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : task.status === '검토중' ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : task.status === '반려' ? 'bg-slate-50 text-slate-500 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200';
                    return (
                      <div key={task.id} className={`bg-white p-3 rounded-xl border shadow-sm ${task.status === '완료' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{task.type}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{task.status}</span>
                          </div>
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                            <button onClick={() => onDeleteExtraTask(project.id, task.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors shrink-0" title={t('삭제', 'Delete')}>
                              <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                            </button>
                          )}
                        </div>
                        <p className={`text-sm font-bold ${task.status === '완료' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.name}</p>
                        <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {task.requester && <span><User size={9} className="inline mr-0.5" />{task.requester}</span>}
                          {(task.startDate || task.endDate) && <span>{task.startDate || '?'} ~ {task.endDate || '?'}</span>}
                          {task.createdBy && <span>등록: {task.createdBy} · {task.createdAt}</span>}
                        </div>

                        {/* 메모 입력 (진행 중 / 작업자 외에는 read-only) */}
                        {currentUser.role !== 'CUSTOMER' && (
                          <input
                            type="text"
                            placeholder={t('메모 / 진행 상황', 'Note / progress')}
                            className="mt-2 w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:bg-white focus:border-pink-400"
                            value={task.note || ''}
                            onChange={(e) => onUpdateExtraTask(project.id, task.id, { note: e.target.value })}
                          />
                        )}
                        {task.note && currentUser.role === 'CUSTOMER' && (
                          <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded">{task.note}</p>
                        )}

                        {/* 상태 변경 */}
                        {currentUser.role !== 'CUSTOMER' && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {['대기', '검토중', '진행중', '완료', '반려'].map(s => (
                              <button key={s} onClick={() => onUpdateExtraTask(project.id, task.id, { status: s })} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ${task.status === s ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-100 flex justify-end bg-white flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
    </div>
  );
});

export default TaskModal;
