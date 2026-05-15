import React, { useState, memo } from 'react';
import { X, ListTodo, CheckSquare, AlertTriangle, CheckCircle, User, Edit, Trash, PenTool, Info, ShieldCheck, FileText, ImageIcon, History, GitCommit as TimelineIcon, Package, Wrench, HardDrive, MessageSquare, Send, LifeBuoy, Plus, ShieldOff, Sparkles, Paperclip, Upload, Download, ExternalLink, Loader, FolderOpen, CalendarDays, Star, Calendar, Clock, StickyNote, Building2, Database, Mail, Smartphone, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import InfoPopover from '../common/InfoPopover';
import { PROJECT_PHASES, AS_HW_TYPES, AS_SW_TYPES, AS_DEFAULT_CATEGORY, getASTypesByCategory, getASStatusesByCategory, formatDomain } from '../../constants';
import { calcAct as calcSetupProgress, calcPhaseProgress, calcOverallProgress } from '../../utils/calc';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import SetupPipelineStepper from '../common/SetupPipelineStepper';
import SignaturePad from '../common/SignaturePad';
import { generatePDF } from '../../utils/export';
import { downloadICS, openGoogleCalendar } from '../../utils/calendar';
import ExtraTaskImportModal from './ExtraTaskImportModal';

const TaskModal = memo(function TaskModal({ project, allProjects, projectIssues, getStatusColor, onClose, onToggleTask, onAddTask, onEditTaskName, onDeleteTask, onUpdateDelayReason, onUpdateTaskDates, onUpdateChecklistItem, onLoadDefaultChecklist, onAddChecklistItem, onDeleteChecklistItem, onUpdatePhase, onEditPhases, onEditSetupTasks, onSetCurrentSetupTask, onSignOff, onCancelSignOff, onAddExtraTask, onUpdateExtraTask, onDeleteExtraTask, onAddExtraTaskComment, onImportExtraTasks, onAddNote, onDeleteNote, onEditNote, onAddCustomerRequest, onUpdateCustomerRequestStatus, onAddCustomerResponse, onDeleteCustomerRequest, onAddAS, onUpdateAS, onDeleteAS, onAddASComment, onCompleteAS, onRevertCompleteAS, onUploadAttachment, onDeleteAttachment, onDeleteProject, driveConfigured, calcAct, currentUser, t, initialTab, engineers, onShowEngineer, customers, onOpenCustomer }) {
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
  const [newNoteMode, setNewNoteMode] = useState('quick'); // 'quick' | 'detail' — 회의록일 때만 유효
  const [newNoteKind, setNewNoteKind] = useState('meeting'); // 'meeting' | 'note'
  const [noteListFilter, setNoteListFilter] = useState('all'); // 'all' | 'meeting' | 'note'
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteDraft, setEditNoteDraft] = useState({});
  const [newNoteExtraProjectIds, setNewNoteExtraProjectIds] = useState([]); // 다른 프로젝트에 동시 등록할 ID
  const [showProjectShareDropdown, setShowProjectShareDropdown] = useState(false);
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
  const [newASForm, setNewASForm] = useState({ category: 'HW', type: '정기점검', engineer: '', description: '', resolution: '', priority: '보통', manager: '', contact: '', serial: '', part: '', cost: '', reqDate: '', visit: '' });
  const [asFormOpen, setAsFormOpen] = useState(false);
  const [newASFiles, setNewASFiles] = useState([]);
  const [asDragOver, setAsDragOver] = useState(false);
  const [asUploading, setAsUploading] = useState(false);
  const [asUploadIdx, setAsUploadIdx] = useState(0);
  const [asUploadProgress, setAsUploadProgress] = useState(0);
  const [asError, setAsError] = useState('');
  const [asListFilter, setAsListFilter] = useState('all'); // 'all' | 'HW' | 'SW'
  const [asStatusFilter, setAsStatusFilter] = useState('all'); // 'all' | 'open' | 'done'
  const [asReplyText, setAsReplyText] = useState({}); // asId → text
  const [extraReplyText, setExtraReplyText] = useState({}); // extraTaskId → text
  const [extraImportOpen, setExtraImportOpen] = useState(false);
  const [extraFilterStatus, setExtraFilterStatus] = useState('all');
  const [extraFilterType, setExtraFilterType] = useState('all');
  const [extraSearch, setExtraSearch] = useState('');
  const [asCompleteModal, setAsCompleteModal] = useState(null); // { asId, file, isNA, uploading }
  const [asRevertPrompt, setAsRevertPrompt] = useState(null); // { asId, reason }
  const [historyFilter, setHistoryFilter] = useState('all');
  const [newExtraForm, setNewExtraForm] = useState({ name: '', requester: '', type: '기능 추가', startDate: '', endDate: '', note: '' });
  const [confirmCancelSignOff, setConfirmCancelSignOff] = useState(false);
  const [endUserPopoverOpen, setEndUserPopoverOpen] = useState(false);
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const cleanText = (v) => {
    if (v == null) return '';
    const s = String(v).trim();
    if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
    return s;
  };

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
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-blue-800 truncate">{project.name}</h2>
              </div>
              {/* 프로젝트 핵심 메타 — 제목 아래 한 줄 */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-blue-700 flex-wrap">
                {(() => {
                  // 역할별 칩 렌더링 — 엔드유저 / 설비업체
                  const renderRoleChip = (roleKey, label, color, popoverOpen, setPopoverOpen) => {
                    const id = roleKey === 'endUser' ? (project.endUserId || project.customerId) : project.vendorId;
                    const name = roleKey === 'endUser' ? (project.endUser || project.customer) : project.vendor;
                    const cust = Array.isArray(customers)
                      ? (customers.find(c => c.id === id) || (name ? customers.find(c => (c.name || '').trim() && (c.name || '').trim() === (name || '').trim()) : null))
                      : null;
                    if (!cust) {
                      return (
                        <span key={roleKey} className="inline-flex items-center bg-white/60 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title={label}>
                          <Building2 size={10} className={`mr-1 ${color}`} />
                          <span className="text-[9px] text-slate-400 mr-1">{label}</span>
                          {name || <span className="italic text-slate-400">미지정</span>}
                        </span>
                      );
                    }
                    const contactCount = Array.isArray(cust.contacts) ? cust.contacts.length : 0;
                    return (
                      <div key={roleKey} className="relative">
                        <button type="button" onClick={() => setPopoverOpen(v => !v)} className="inline-flex items-center bg-white/60 hover:bg-indigo-100 border border-blue-200 hover:border-indigo-300 px-1.5 py-0.5 rounded font-bold transition-colors" title={`${label} ${t('정보 보기 (담당자 포함)', '(View — contacts included)')}`}>
                          <Building2 size={10} className={`mr-1 ${color}`} />
                          <span className="text-[9px] text-slate-400 mr-1">{label}</span>
                          {cust.name}
                          {contactCount > 0 && <span className="ml-1 bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0 rounded text-[9px]">{t('담당자', 'Contacts')} {contactCount}</span>}
                        </button>
                        <InfoPopover open={popoverOpen} onClose={() => setPopoverOpen(false)} align="left" width="w-[420px]">
                          <div className="p-3">
                            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Building2 size={16} /></div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-800 truncate">{cust.name} <span className="text-[10px] text-slate-400 font-normal">· {label}</span></div>
                                <div className="text-[10px] text-slate-500">{cleanText(cust.domain)}{cleanText(cust.phone) ? ` · ${cleanText(cust.phone)}` : ''}</div>
                              </div>
                            </div>
                            {cleanText(cust.address) && <div className="text-[11px] text-slate-600 mb-1.5 flex items-start"><MapPin size={10} className="mr-1 mt-0.5 text-slate-400 shrink-0" /><span>{cleanText(cust.address)}</span></div>}
                            {Array.isArray(cust.contacts) && cust.contacts.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('담당자', 'Contacts')} ({cust.contacts.length})</div>
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                  {cust.contacts.slice(0, 5).map(ct => {
                                    const title = cleanText(ct.title);
                                    const dept = cleanText(ct.dept);
                                    const email = cleanText(ct.email);
                                    const mobile = cleanText(ct.mobile);
                                    const officePhone = cleanText(ct.officePhone);
                                    return (
                                      <div key={ct.id} className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                          <span className="text-xs font-bold text-slate-800">{ct.name}</span>
                                          {title && <span className="text-[10px] text-slate-500">{title}</span>}
                                          {dept && <span className="text-[10px] text-slate-400">· {dept}</span>}
                                        </div>
                                        {(email || mobile || officePhone) && (
                                          <div className="text-[10px] text-slate-600 mt-1 flex flex-col gap-0.5">
                                            {email && <span className="inline-flex items-center"><Mail size={9} className="mr-1 text-slate-400 shrink-0" />{email}</span>}
                                            {mobile && <span className="inline-flex items-center"><Smartphone size={9} className="mr-1 text-slate-400 shrink-0" />{mobile}</span>}
                                            {officePhone && <span className="inline-flex items-center"><Phone size={9} className="mr-1 text-slate-400 shrink-0" />{officePhone}</span>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {cust.contacts.length > 5 && <div className="text-[10px] text-slate-400 text-center">+{cust.contacts.length - 5} {t('명 더', 'more')}</div>}
                                </div>
                              </div>
                            )}
                            {cleanText(cust.note) && <div className="text-[10px] text-slate-500 italic line-clamp-2 mb-2">{cleanText(cust.note)}</div>}
                            {onOpenCustomer && (
                              <button type="button" onClick={() => { setPopoverOpen(false); onOpenCustomer(cust); }} className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded inline-flex items-center justify-center">
                                {t('고객사 상세 열기', 'Open Customer')} <ArrowUpRight size={11} className="ml-1" />
                              </button>
                            )}
                          </div>
                        </InfoPopover>
                      </div>
                    );
                  };
                  return [
                    renderRoleChip('endUser', t('엔드유저', 'End User'), 'text-indigo-500', endUserPopoverOpen, setEndUserPopoverOpen),
                    renderRoleChip('vendor', t('설비업체', 'Vendor'), 'text-purple-500', vendorPopoverOpen, setVendorPopoverOpen)
                  ].filter(Boolean);
                })()}
                <span className="inline-flex items-center bg-white/60 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title={t('사이트', 'Site')}>
                  <Database size={10} className="mr-1 text-emerald-500" />
                  {project.site || <span className="italic text-slate-400">미지정</span>}
                </span>
                {(() => {
                  const mgrEng = onShowEngineer && Array.isArray(engineers) ? engineers.find(e => e.name === project.manager) : null;
                  if (mgrEng) {
                    return (
                      <button type="button" onClick={() => onShowEngineer(mgrEng.id)} className="inline-flex items-center bg-white/60 hover:bg-indigo-100 border border-blue-200 hover:border-indigo-300 px-1.5 py-0.5 rounded font-bold transition-colors" title={t('담당자 정보 보기', 'View Engineer')}>
                        <User size={10} className="mr-1 text-blue-500" />
                        {project.manager}
                        <span className="ml-1 text-[9px] text-indigo-600">↗</span>
                      </button>
                    );
                  }
                  return (
                    <span className="inline-flex items-center bg-white/60 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title={t('담당자(PM)', 'PM')}>
                      <User size={10} className="mr-1 text-blue-500" />
                      {project.manager || <span className="italic text-slate-400">미지정</span>}
                    </span>
                  );
                })()}
                {project.domain && (
                  <span className="inline-flex items-center bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold" title={t('산업군', 'Domain')}>
                    {formatDomain(project.domain, project.subDomain)}
                  </span>
                )}
              </div>
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
          <button onClick={() => setActiveModalTab('notes')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'notes' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileText size={16} className="mb-0.5" /><span>{t('회의록/노트', 'Notes')} ({(project.notes || []).length})</span></button>
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
                  kind: newNoteKind,
                  summary: newNoteSummary.trim(),
                  meetingDate: newNoteKind === 'meeting' ? (newNoteMeetingDate || '') : '',
                  attendees: newNoteKind === 'meeting' ? newNoteAttendees.trim() : '',
                  decisions: newNoteKind === 'meeting' ? newNoteDecisions.trim() : '',
                  actions: newNoteKind === 'meeting' ? newNoteActions.trim() : '',
                  files: newNoteFiles,
                  additionalProjectIds: newNoteExtraProjectIds,
                  onProgress: ({ percent, index }) => {
                    setNoteUploadProgress(percent || 0);
                    if (typeof index === 'number') setNoteUploadIdx(index);
                  }
                });
                setNewNoteText(''); setNewNoteSummary(''); setNewNoteFiles([]); setNoteUploadProgress(0); setNoteUploadIdx(0);
                setNewNoteMeetingDate(''); setNewNoteAttendees(''); setNewNoteDecisions(''); setNewNoteActions('');
                setNewNoteExtraProjectIds([]); setShowProjectShareDropdown(false);
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
                      onClick={() => { setNewNoteKind('meeting'); setNoteFormOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <FileText size={16} />{t('새 회의록 작성', 'New Meeting')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewNoteKind('note'); setNoteFormOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <StickyNote size={16} />{t('새 노트 작성', 'New Note')}
                    </button>
                  </div>
                )}

                {currentUser.role !== 'CUSTOMER' && noteFormOpen && (() => {
                  const isMeeting = newNoteKind === 'meeting';
                  const kindColor = isMeeting ? 'amber' : 'slate';
                  return (
                  <div className={`bg-white p-4 rounded-xl border-2 ${isMeeting ? 'border-amber-300 ring-amber-100' : 'border-slate-400 ring-slate-100'} shadow-md space-y-3 ring-2`}>
                    {/* 폼 헤더 (종류 토글 + 닫기) */}
                    <div className={`flex items-center justify-between -mt-1 mb-1 pb-2 border-b ${isMeeting ? 'border-amber-200' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        {isMeeting ? <FileText size={14} className="text-amber-700" /> : <StickyNote size={14} className="text-slate-700" />}
                        <span className={`text-sm font-black ${isMeeting ? 'text-amber-800' : 'text-slate-800'}`}>
                          {isMeeting ? t('새 회의록 작성', 'New Meeting') : t('새 노트 작성', 'New Note')}
                        </span>
                        {/* 종류 전환 토글 */}
                        <div className="ml-2 flex bg-slate-100 rounded p-0.5 border border-slate-200">
                          <button type="button" onClick={() => setNewNoteKind('meeting')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${isMeeting ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('회의록', 'Meeting')}</button>
                          <button type="button" onClick={() => setNewNoteKind('note')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${!isMeeting ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('노트', 'Note')}</button>
                        </div>
                      </div>
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

                    <div className={`p-2 rounded-lg text-[11px] font-medium border flex items-start ${isMeeting ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      <Info size={12} className="mr-1.5 shrink-0 mt-0.5" />
                      <div>
                        {isMeeting
                          ? <>{t('회의록은 회의 일시·참석자·결정·액션을 함께 기록할 수 있습니다.', 'Meetings include date / attendees / decisions / actions.')}</>
                          : <>{t('노트는 본문 + 첨부만 — 회의가 아닌 중요 정보·결정 메모를 자유롭게 남기세요.', 'Notes: body + files only — for non-meeting info / decisions.')}</>}
                      </div>
                    </div>

                    {/* 모드 토글 — 회의록일 때만 표시 (빠른 / 상세) */}
                    {isMeeting && (
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
                    )}

                    {/* 상세 모드 — 회의 일시 + 참석자 (회의록 + 상세 모드일 때만) */}
                    {isMeeting && newNoteMode === 'detail' && (
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
                      <label className="block text-xs font-bold text-slate-600 mb-1">{isMeeting ? t('논의 내용 (본문)', 'Discussion (Body)') : t('노트 본문', 'Note Body')}</label>
                      <textarea rows="4" className={`w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none ${isMeeting ? 'focus:border-amber-500' : 'focus:border-slate-500'}`} value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder={isMeeting ? t(newNoteMode === 'detail' ? '주요 논의 내용을 입력하세요. (안건·진행 상황·이슈 등)' : '회의 내용을 자유롭게 입력하세요.', newNoteMode === 'detail' ? 'Discussion details (topics, progress, issues)' : 'Meeting notes') : t('회의가 아닌 중요 정보·결정·메모 (예: 고객사 전결권자 변경, 시방서 해석 차이 등)', 'Non-meeting key info / decisions / memos')}></textarea>
                    </div>

                    {/* 상세 모드 — 결정사항 + 액션 아이템 (회의록 + 상세 모드일 때만) */}
                    {isMeeting && newNoteMode === 'detail' && (
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

                    {/* 다중 프로젝트 동시 등록 — 같은 노트를 여러 프로젝트에 broadcast */}
                    {Array.isArray(allProjects) && allProjects.length > 1 && (
                      <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-indigo-800 flex items-center"><FolderOpen size={11} className="mr-1" />{t('다른 프로젝트에도 동시 등록 (선택)', 'Also register to other projects (optional)')}</label>
                          {newNoteExtraProjectIds.length > 0 && (
                            <button type="button" onClick={() => setNewNoteExtraProjectIds([])} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold">{t('전체 해제', 'Clear')}</button>
                          )}
                        </div>
                        <div className="text-[10px] text-indigo-700 mb-2">{t('선택한 프로젝트마다 동일 본문/첨부가 별도 사본으로 등록되고, 첨부는 각 프로젝트 Drive 폴더에 따로 업로드됩니다.', 'Same content/files copied as independent records — files re-uploaded into each project\'s Drive folder.')}</div>
                        {newNoteExtraProjectIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {newNoteExtraProjectIds.map(extraId => {
                              const extra = allProjects.find(p => p.id === extraId);
                              if (!extra) return null;
                              return (
                                <span key={extraId} className="inline-flex items-center bg-white border border-indigo-300 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded">
                                  {extra.name}
                                  <button type="button" onClick={() => setNewNoteExtraProjectIds(prev => prev.filter(id => id !== extraId))} className="ml-1 text-indigo-400 hover:text-indigo-700"><X size={10} /></button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="relative">
                          <button type="button" onClick={() => setShowProjectShareDropdown(v => !v)} className="w-full text-left text-[11px] px-2 py-1.5 bg-white border border-indigo-300 rounded text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                            <span>{newNoteExtraProjectIds.length > 0 ? t(`+ 더 추가 (현재 ${newNoteExtraProjectIds.length}개 선택)`, `+ Add more (${newNoteExtraProjectIds.length} selected)`) : t('+ 프로젝트 선택', '+ Select projects')}</span>
                            <span className="text-[10px]">{showProjectShareDropdown ? '▲' : '▼'}</span>
                          </button>
                          {showProjectShareDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowProjectShareDropdown(false)} />
                              <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-indigo-300 rounded shadow-xl max-h-64 overflow-y-auto">
                                {allProjects.filter(p => p.id !== project.id).map(p => {
                                  const checked = newNoteExtraProjectIds.includes(p.id);
                                  return (
                                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0">
                                      <input type="checkbox" checked={checked} onChange={(e) => {
                                        if (e.target.checked) setNewNoteExtraProjectIds(prev => [...prev, p.id]);
                                        else setNewNoteExtraProjectIds(prev => prev.filter(id => id !== p.id));
                                      }} className="accent-indigo-600" />
                                      <span className="text-[11px] font-bold text-slate-800 flex-1">{p.name}</span>
                                      <span className="text-[10px] text-slate-500">{p.customer}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
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
                      <button onClick={handleSubmitNote} disabled={noteUploading || (!newNoteText.trim() && newNoteFiles.length === 0)} className={`px-4 py-2 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center ${isMeeting ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-600 hover:bg-slate-700'}`}>
                        {isMeeting ? <FileText size={14} className="mr-1.5" /> : <StickyNote size={14} className="mr-1.5" />}
                        {isMeeting ? t('회의록 등록', 'Add Meeting') : t('노트 등록', 'Add Note')}
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {/* 리스트 필터 칩 — 회의록 / 노트 */}
                {project.notes && project.notes.length > 0 && (() => {
                  const cnt = { all: project.notes.length, meeting: 0, note: 0 };
                  project.notes.forEach(n => { const k = n.kind === 'note' ? 'note' : 'meeting'; cnt[k] += 1; });
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">{t('필터', 'Filter')}</span>
                      <button type="button" onClick={() => setNoteListFilter('all')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${noteListFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')} {cnt.all}</button>
                      <button type="button" onClick={() => setNoteListFilter('meeting')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${noteListFilter === 'meeting' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}><FileText size={10} className="mr-1" />{t('회의록', 'Meeting')} {cnt.meeting}</button>
                      <button type="button" onClick={() => setNoteListFilter('note')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${noteListFilter === 'note' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}><StickyNote size={10} className="mr-1" />{t('노트', 'Note')} {cnt.note}</button>
                    </div>
                  );
                })()}

                {(!project.notes || project.notes.length === 0) ? (
                  <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 회의록/노트가 없습니다.', 'No meeting notes / notes yet.')}</div>
                ) : (() => {
                  // 필터 적용 + 날짜순 desc 정렬 (note.id = timestamp)
                  const filteredNotes = project.notes.filter(n => {
                    if (noteListFilter === 'all') return true;
                    const k = n.kind === 'note' ? 'note' : 'meeting';
                    return k === noteListFilter;
                  });
                  if (filteredNotes.length === 0) {
                    return <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{noteListFilter === 'meeting' ? t('등록된 회의록이 없습니다.', 'No meetings yet.') : t('등록된 노트가 없습니다.', 'No notes yet.')}</div>;
                  }
                  const sorted = [...filteredNotes].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
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
                              <div className={`bg-white p-4 rounded-xl border shadow-sm ${note.kind === 'note' ? 'border-slate-300' : 'border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${note.kind === 'note' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-600'}`}>{note.author.charAt(0)}</div>
                                    <span className="text-sm font-bold text-slate-800">{note.author}</span>
                                    {/* 종류 뱃지 */}
                                    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${note.kind === 'note' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      {note.kind === 'note' ? <><StickyNote size={9} className="mr-1" />{t('노트', 'Note')}</> : <><FileText size={9} className="mr-1" />{t('회의록', 'Meeting')}</>}
                                    </span>
                                    {valid && (
                                      <span className="text-[10px] text-slate-500 flex items-center"><Clock size={10} className="mr-0.5" />{hh}:{mi}{rel && <span className="ml-1.5 text-slate-400 font-medium">· {rel}</span>}</span>
                                    )}
                                    {!valid && note.date && <span className="text-[10px] text-slate-400">{note.date}</span>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {note.editedAt && <span className="text-[9px] text-slate-400 italic" title={`${t('수정됨', 'Edited')}: ${note.editedAt}`}>{t('수정됨', '(edited)')}</span>}
                                    {(currentUser.role === 'ADMIN' || currentUser.name === note.author) && editingNoteId !== note.id && onEditNote && (
                                      <button onClick={() => { setEditingNoteId(note.id); setEditNoteDraft({ kind: note.kind || 'meeting', summary: note.summary || '', text: note.text || '', meetingDate: note.meetingDate || '', attendees: note.attendees || '', decisions: note.decisions || '', actions: note.actions || '', keepFiles: [...files], newFiles: [], saving: false, error: '' }); }} className="inline-flex items-center px-1.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 transition-colors" title={t('수정', 'Edit')}>
                                        <Edit size={11} className="mr-0.5" />{t('수정', 'Edit')}
                                      </button>
                                    )}
                                    {(currentUser.role === 'ADMIN' || currentUser.name === note.author) && editingNoteId !== note.id && (
                                      <button onClick={() => {
                                        const fileCount = (Array.isArray(note.files) ? note.files.length : (note.file ? 1 : 0));
                                        const kindLabel = note.kind === 'note' ? t('노트', 'this note') : t('회의록', 'this meeting');
                                        const msg = fileCount > 0
                                          ? t(`${kindLabel}을(를) 삭제할까요?\n첨부 파일 ${fileCount}건도 Drive 휴지통으로 이동됩니다.`, `Delete ${kindLabel}?\n${fileCount} attachment(s) will be moved to Drive trash.`)
                                          : t(`${kindLabel}을(를) 삭제할까요?`, `Delete ${kindLabel}?`);
                                        if (window.confirm(msg)) onDeleteNote(project.id, note.id);
                                      }} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                        <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {editingNoteId === note.id ? (
                                  /* 인라인 편집 모드 — 모든 필드 + 첨부 추가/삭제 */
                                  <div className="p-3 bg-amber-50/60 border-2 border-amber-300 rounded-lg ring-2 ring-amber-100 space-y-2">
                                    <div className="text-[11px] font-bold text-amber-800 flex items-center"><Edit size={11} className="mr-1" />{editNoteDraft.kind === 'note' ? t('노트 수정', 'Edit Note') : t('회의록 수정', 'Edit Meeting')}</div>
                                    {/* 종류 토글 */}
                                    <div className="flex bg-slate-100 rounded p-0.5 border border-slate-200 w-fit">
                                      <button type="button" onClick={() => setEditNoteDraft({ ...editNoteDraft, kind: 'meeting' })} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${editNoteDraft.kind !== 'note' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('회의록', 'Meeting')}</button>
                                      <button type="button" onClick={() => setEditNoteDraft({ ...editNoteDraft, kind: 'note' })} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${editNoteDraft.kind === 'note' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('노트', 'Note')}</button>
                                    </div>
                                    {/* 회의록일 때만 회의 일시 + 참석자 */}
                                    {editNoteDraft.kind !== 'note' && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('회의 일시', 'Meeting Date')}</label>
                                          <input type="datetime-local" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editNoteDraft.meetingDate || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, meetingDate: e.target.value })} />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('참석자', 'Attendees')}</label>
                                          <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editNoteDraft.attendees || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, attendees: e.target.value })} />
                                        </div>
                                      </div>
                                    )}
                                    {/* 본문 */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{editNoteDraft.kind === 'note' ? t('노트 본문', 'Note Body') : t('논의 내용', 'Discussion')}</label>
                                      <textarea rows="4" className="w-full text-xs p-2 border border-slate-300 rounded" value={editNoteDraft.text || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, text: e.target.value })}></textarea>
                                    </div>
                                    {/* 요약 */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">{t('한줄 요약 (선택)', 'Summary (Optional)')}</label>
                                      <textarea rows="2" className="w-full text-xs p-2 border border-slate-300 rounded" value={editNoteDraft.summary || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, summary: e.target.value })}></textarea>
                                    </div>
                                    {/* 회의록일 때만 결정사항 + 액션 */}
                                    {editNoteDraft.kind !== 'note' && (
                                      <>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5"><CheckSquare size={9} className="inline mr-1 text-emerald-600" />{t('결정사항', 'Decisions')}</label>
                                          <textarea rows="2" className="w-full text-xs p-2 border border-slate-300 rounded" value={editNoteDraft.decisions || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, decisions: e.target.value })}></textarea>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5"><ListTodo size={9} className="inline mr-1 text-blue-600" />{t('액션 아이템', 'Action Items')}</label>
                                          <textarea rows="2" className="w-full text-xs p-2 border border-slate-300 rounded" value={editNoteDraft.actions || ''} onChange={(e) => setEditNoteDraft({ ...editNoteDraft, actions: e.target.value })}></textarea>
                                        </div>
                                      </>
                                    )}
                                    {/* 기존 파일 — 제거 가능 */}
                                    {(editNoteDraft.keepFiles || []).length > 0 && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('기존 첨부 — 제거하려면 ×', 'Existing — × to remove')}</label>
                                        <div className="space-y-1">
                                          {editNoteDraft.keepFiles.map((f, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1.5">
                                              <Paperclip size={11} className="text-slate-500 shrink-0" />
                                              <span className="text-[11px] font-bold text-slate-800 flex-1 truncate">{f.fileName}</span>
                                              <button type="button" onClick={() => setEditNoteDraft({ ...editNoteDraft, keepFiles: editNoteDraft.keepFiles.filter((_, i) => i !== fIdx) })} className="text-slate-400 hover:text-red-600 p-0.5"><X size={11} /></button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* 새 파일 */}
                                    {(editNoteDraft.newFiles || []).length > 0 && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-amber-700 mb-1">{t('새로 추가될 파일', 'Files to add')}</label>
                                        <div className="space-y-1">
                                          {editNoteDraft.newFiles.map((f, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-1.5">
                                              <Paperclip size={11} className="text-amber-600 shrink-0" />
                                              <span className="text-[11px] font-bold text-slate-800 flex-1 truncate">{f.name}</span>
                                              <span className="text-[10px] text-slate-500 font-mono">{fmtSize(f.size)}</span>
                                              <button type="button" onClick={() => setEditNoteDraft({ ...editNoteDraft, newFiles: editNoteDraft.newFiles.filter((_, i) => i !== fIdx) })} className="text-slate-400 hover:text-red-600 p-0.5"><X size={11} /></button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <label className="block border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/40 rounded p-2 text-center cursor-pointer transition-colors">
                                      <input type="file" multiple className="hidden" disabled={!driveConfigured} onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setEditNoteDraft({ ...editNoteDraft, newFiles: [...(editNoteDraft.newFiles || []), ...fs] }); e.target.value = ''; }} />
                                      <Upload size={14} className="mx-auto mb-0.5 text-amber-600" />
                                      <div className="text-[11px] font-bold text-amber-800">{driveConfigured ? t('파일 추가 (클릭)', 'Add files (click)') : t('Drive 미연동', 'Drive not configured')}</div>
                                    </label>
                                    {editNoteDraft.saving && <div className="text-[11px] font-bold text-amber-700 flex items-center"><Loader size={11} className="animate-spin mr-1" />{t('저장 중...', 'Saving...')}</div>}
                                    {editNoteDraft.error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5 flex items-center"><AlertTriangle size={11} className="mr-1" />{editNoteDraft.error}</div>}
                                    <div className="flex items-center gap-2">
                                      <button type="button" disabled={editNoteDraft.saving} onClick={async () => {
                                        setEditNoteDraft({ ...editNoteDraft, saving: true, error: '' });
                                        try {
                                          await onEditNote(project.id, note.id, {
                                            kind: editNoteDraft.kind,
                                            summary: editNoteDraft.summary,
                                            text: editNoteDraft.text,
                                            meetingDate: editNoteDraft.meetingDate,
                                            attendees: editNoteDraft.attendees,
                                            decisions: editNoteDraft.decisions,
                                            actions: editNoteDraft.actions,
                                            files: editNoteDraft.keepFiles,
                                            newFiles: editNoteDraft.newFiles
                                          });
                                          setEditingNoteId(null);
                                          setEditNoteDraft({});
                                        } catch (e) {
                                          setEditNoteDraft(prev => ({ ...prev, saving: false, error: e?.message || t('저장 실패', 'Save failed') }));
                                        }
                                      }} className="px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white inline-flex items-center"><CheckCircle size={11} className="mr-1" />{t('저장', 'Save')}</button>
                                      <button type="button" disabled={editNoteDraft.saving} onClick={() => { setEditingNoteId(null); setEditNoteDraft({}); }} className="px-3 py-1.5 text-[11px] font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
                                    </div>
                                  </div>
                                ) : (
                                  /* 읽기 모드 */
                                  <>
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
                                    {note.decisions && (
                                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                                        <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center"><CheckSquare size={11} className="mr-1" />{t('결정사항', 'Decisions')}</div>
                                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.decisions}</p>
                                      </div>
                                    )}
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
                                  </>
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
          {activeModalTab === 'as' && (() => {
            const fmtSize = (b) => {
              if (!b && b !== 0) return '';
              if (b < 1024) return b + ' B';
              if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
              return (b / 1024 / 1024).toFixed(2) + ' MB';
            };
            const handleSubmitAS = async () => {
              if (!newASForm.description.trim() || !newASForm.engineer.trim()) return;
              setAsError('');
              if (newASFiles.length > 0 && !driveConfigured) {
                setAsError(t('Drive 연동이 설정되지 않아 파일을 업로드할 수 없습니다.', 'Drive not configured — cannot upload file.'));
                return;
              }
              setAsUploading(true);
              try {
                await onAddAS(project.id, {
                  ...newASForm,
                  files: newASFiles,
                  onProgress: ({ percent, index }) => {
                    setAsUploadProgress(percent || 0);
                    if (typeof index === 'number') setAsUploadIdx(index);
                  }
                });
                const keepCat = newASForm.category;
                setNewASForm({ category: keepCat, type: keepCat === 'SW' ? AS_SW_TYPES[0] : AS_HW_TYPES[0], engineer: '', description: '', resolution: '', priority: '보통', manager: '', contact: '', serial: '', part: '', cost: '', reqDate: '', visit: '' });
                setNewASFiles([]); setAsUploadProgress(0); setAsUploadIdx(0);
                setAsFormOpen(false); // 등록 후 자동 접힘
              } catch (e) {
                setAsError(e?.message || t('등록 실패', 'Save failed'));
              } finally {
                setAsUploading(false);
              }
            };
            // 카테고리별/상태별 카운트 (목록 필터 칩용)
            const recs = project.asRecords || [];
            const asCnt = { all: recs.length, HW: 0, SW: 0, open: 0, done: 0 };
            recs.forEach(r => {
              const c = r.category || AS_DEFAULT_CATEGORY;
              asCnt[c] += 1;
              if (r.status === '완료') asCnt.done += 1; else asCnt.open += 1;
            });
            return (
            <div className="space-y-4">
              <div className="bg-purple-50 text-purple-800 p-3 rounded-lg text-xs font-medium border border-purple-200 flex items-center">
                <Info size={14} className="mr-1.5 shrink-0" />
                {project.status === '완료'
                  ? t('Buy-off 완료 후 AS(애프터서비스) 내역을 관리합니다.', 'After-sales service records.')
                  : t('※ AS 관리는 Buy-off 완료 후 본격 활용됩니다. 현재 설치 중 AS도 등록 가능합니다.', 'AS management activates after Buy-off.')}
              </div>

              {/* 등록 영역 — 평소엔 접혀 있고 작성 버튼 클릭 시 펼침 (회의록과 동일 패턴) */}
              {currentUser.role !== 'CUSTOMER' && !asFormOpen && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewASForm({ ...newASForm, category: 'HW', type: AS_HW_TYPES[0] }); setAsFormOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <Wrench size={16} />{t('새 HW AS 작성', 'New HW AS')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewASForm({ ...newASForm, category: 'SW', type: AS_SW_TYPES[0] }); setAsFormOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <HardDrive size={16} />{t('새 SW AS 작성', 'New SW AS')}
                  </button>
                </div>
              )}

              {/* 펼침 폼 */}
              {currentUser.role !== 'CUSTOMER' && asFormOpen && (() => {
                const isHW = newASForm.category === 'HW';
                const themeBorder = isHW ? 'border-indigo-300 ring-indigo-100' : 'border-cyan-300 ring-cyan-100';
                const themeDivider = isHW ? 'border-indigo-200' : 'border-cyan-200';
                const themeText = isHW ? 'text-indigo-800' : 'text-cyan-800';
                const themeIconColor = isHW ? 'text-indigo-700' : 'text-cyan-700';
                const themeBtn = isHW ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-cyan-600 hover:bg-cyan-700';
                const themeBg = isHW ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-cyan-50 text-cyan-800 border-cyan-200';
                const themeDrop = isHW ? 'hover:border-indigo-400 hover:bg-indigo-50/40' : 'hover:border-cyan-400 hover:bg-cyan-50/40';
                const themeDropActive = isHW ? 'border-indigo-500 bg-indigo-50' : 'border-cyan-500 bg-cyan-50';
                const themeChipBg = isHW ? 'bg-indigo-50 border-indigo-200' : 'bg-cyan-50 border-cyan-200';
                const fileLimitGuide = isHW
                  ? t('현장 조치 사진 / 보고서 / 부품 사진 등', 'Field photos / report / parts photos')
                  : t('에러 스크린샷 / 로그 파일 / 패치 스니펫 등', 'Error screenshots / log files / patch snippets');
                return (
                <div className={`bg-white p-4 rounded-xl border-2 ${themeBorder} shadow-md space-y-3 ring-2`}>
                  {/* 헤더 (분류 토글 + 닫기) */}
                  <div className={`flex items-center justify-between -mt-1 mb-1 pb-2 border-b ${themeDivider}`}>
                    <div className="flex items-center gap-2">
                      {isHW ? <Wrench size={14} className={themeIconColor} /> : <HardDrive size={14} className={themeIconColor} />}
                      <span className={`text-sm font-black ${themeText}`}>
                        {isHW ? t('새 HW AS 작성', 'New HW AS') : t('새 SW AS 작성', 'New SW AS')}
                      </span>
                      {/* 분류 전환 토글 */}
                      <div className="ml-2 flex bg-slate-100 rounded p-0.5 border border-slate-200">
                        <button type="button" onClick={() => setNewASForm({ ...newASForm, category: 'HW', type: AS_HW_TYPES[0] })} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${isHW ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>HW</button>
                        <button type="button" onClick={() => setNewASForm({ ...newASForm, category: 'SW', type: AS_SW_TYPES[0] })} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${!isHW ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>SW</button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAsFormOpen(false)}
                      disabled={asUploading}
                      className="text-slate-400 hover:text-slate-700 p-1 disabled:opacity-50"
                      title={t('접기', 'Collapse')}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={`p-2 rounded-lg text-[11px] font-medium border flex items-start ${themeBg}`}>
                    <Info size={12} className="mr-1.5 shrink-0 mt-0.5" />
                    <div>
                      {isHW
                        ? <>{t('HW AS는 접수 → 출동 → 조치 → 완료의 4단계 흐름입니다. 현장 조치 사진을 함께 첨부하세요.', 'HW: 접수→출동→조치→완료. Attach on-site photos.')}</>
                        : <>{t('SW AS는 접수 → 분석 → 개발 → 적용 → 검증 → 완료의 6단계 흐름입니다. 에러 화면·로그·패치 코드를 함께 첨부하세요.', 'SW: 접수→분석→개발→적용→검증→완료. Attach screenshots / logs / patch.')}</>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('AS 유형', 'Type')}</label>
                      <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.type} onChange={(e) => setNewASForm({...newASForm, type: e.target.value})}>
                        {getASTypesByCategory(newASForm.category).map(ty => (
                          <option key={ty} value={ty}>{ty}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{isHW ? t('담당 엔지니어', 'Engineer') : t('담당자', 'Owner')}</label>
                      {Array.isArray(engineers) && engineers.filter(e => e.active !== false).length > 0 ? (
                        <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.engineer} onChange={(e) => setNewASForm({...newASForm, engineer: e.target.value})}>
                          <option value="">{t('-- 선택 --', '-- Select --')}</option>
                          {engineers.filter(e => e.active !== false).map(e => (
                            <option key={e.id} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.engineer} onChange={(e) => setNewASForm({...newASForm, engineer: e.target.value})} placeholder={t('이름 입력', 'Name')} />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('중요도', 'Priority')}</label>
                      <select className={`w-full text-sm p-2 border rounded-lg font-bold ${newASForm.priority === '긴급' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 text-slate-700'}`} value={newASForm.priority} onChange={(e) => setNewASForm({...newASForm, priority: e.target.value})}>
                        <option value="보통">{t('보통 (일반)', 'Normal')}</option>
                        <option value="긴급">{t('상 (긴급)', 'Urgent')}</option>
                      </select>
                    </div>
                  </div>

                  {/* V3 풍부 필드 — 고객사 담당자·연락처·시리얼 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('고객사 담당자', 'Customer Manager')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.manager} onChange={(e) => setNewASForm({...newASForm, manager: e.target.value})} placeholder={t('성함 (선택)', 'Name (optional)')} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('연락처', 'Contact')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.contact} onChange={(e) => setNewASForm({...newASForm, contact: e.target.value})} placeholder="010-0000-0000" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('장비 시리얼', 'Serial')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.serial} onChange={(e) => setNewASForm({...newASForm, serial: e.target.value})} placeholder={t('예: SN-12345', 'e.g. SN-12345')} />
                    </div>
                  </div>

                  {/* V3 풍부 필드 — 희망 처리일정 + 방문 필요사항 (HW만 노출) */}
                  {isHW && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{t('희망 처리일정', 'Desired Date')}</label>
                        <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.reqDate} onChange={(e) => setNewASForm({...newASForm, reqDate: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">{t('방문 시 필요사항', 'Visit Requirements')}</label>
                        <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.visit} onChange={(e) => setNewASForm({...newASForm, visit: e.target.value})} placeholder={t('보안 절차 / 안전화·헬멧 / 출입증 등', 'Safety / Access requirements')} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{isHW ? t('증상 / 요청 내용 (이미지는 Ctrl+V로 붙여넣기)', 'Symptoms / Request (Ctrl+V to paste image)') : t('증상 / 요청 내용 (재현 절차·로그 등 — Ctrl+V로 캡처 첨부)', 'Symptoms / Request (Ctrl+V to paste screenshot)')}</label>
                    <textarea rows="5" className="w-full text-sm p-3 border border-slate-300 rounded-lg" value={newASForm.description} onChange={(e) => setNewASForm({...newASForm, description: e.target.value})} onPaste={(e) => {
                      // 이미지 paste 캡처 → 자동으로 첨부 파일 목록에 추가
                      const items = e.clipboardData && e.clipboardData.items;
                      if (!items) return;
                      const imgs = [];
                      for (let i = 0; i < items.length; i++) {
                        const it = items[i];
                        if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
                          const blob = it.getAsFile();
                          if (blob) {
                            const ext = (it.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                            const renamed = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: it.type });
                            imgs.push(renamed);
                          }
                        }
                      }
                      if (imgs.length > 0) {
                        e.preventDefault();
                        setNewASFiles(prev => [...prev, ...imgs]);
                      }
                    }} placeholder={isHW ? t('고객이 신고한 증상 (이미지 캡처는 Ctrl+V)', 'Reported symptoms (Ctrl+V to paste image)') : t('재현 절차 / 발생 빈도 / 영향 범위 / 로그 위치 등 (캡처 Ctrl+V)', 'Repro steps, frequency, scope, log refs (Ctrl+V image)')}></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{isHW ? t('조치 내용 (선택)', 'Resolution (Optional)') : t('분석 / 조치 내용 (선택)', 'Analysis / Resolution (Optional)')}</label>
                    <textarea rows="4" className="w-full text-sm p-3 border border-slate-300 rounded-lg" value={newASForm.resolution} onChange={(e) => setNewASForm({...newASForm, resolution: e.target.value})} placeholder={isHW ? t('출동 후 작성', 'Fill after visit') : t('원인 분석 결과 / 패치 버전 / 적용 결과 등', 'Root cause, patch version, applied result')}></textarea>
                  </div>

                  {/* V3 풍부 필드 — HW일 때만 부품/금액 노출 (SW는 의미 없음) */}
                  {isHW && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{t('사용 부품 (선택)', 'Parts Used (Optional)')}</label>
                        <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.part} onChange={(e) => setNewASForm({...newASForm, part: e.target.value})} placeholder={t('예: O-Ring V-50, 모터 드라이버', 'e.g. O-Ring, motor driver')} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{t('금액 (선택)', 'Cost (Optional)')}</label>
                        <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newASForm.cost} onChange={(e) => setNewASForm({...newASForm, cost: e.target.value})} placeholder={t('예: 50,000원 / 무상', 'e.g. ₩50,000 / Free')} />
                      </div>
                    </div>
                  )}

                  {/* 첨부 파일 — 회의록과 동일 UX */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t('첨부 파일 (선택, 다중 첨부 가능)', 'Attached Files (optional, multiple)')}</label>
                    {newASFiles.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {newASFiles.map((f, idx) => (
                          <div key={idx} className={`flex items-center gap-2 border rounded-lg p-2 ${themeChipBg}`}>
                            <Paperclip size={14} className={`${themeIconColor} shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{f.name}</div>
                              <div className="text-[10px] text-slate-500">{fmtSize(f.size)}</div>
                            </div>
                            <button type="button" onClick={() => setNewASFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600 p-1" title={t('제거', 'Remove')}><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label
                      onDragOver={(e) => { if (!driveConfigured) return; e.preventDefault(); setAsDragOver(true); }}
                      onDragLeave={() => setAsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setAsDragOver(false);
                        if (!driveConfigured) return;
                        const fs = Array.from(e.dataTransfer.files || []);
                        if (fs.length) setNewASFiles(prev => [...prev, ...fs]);
                      }}
                      className={`block border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${!driveConfigured ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60' : asDragOver ? themeDropActive : `border-slate-300 bg-white ${themeDrop}`}`}
                    >
                      <input type="file" multiple accept="image/*,.pdf,.txt,.log,.json,.zip,.xlsx,.xls,.docx,.doc,.pptx,.ppt" className="hidden" disabled={!driveConfigured} onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setNewASFiles(prev => [...prev, ...fs]); e.target.value = ''; }} />
                      <Upload size={18} className={`mx-auto mb-1 ${themeIconColor}`} />
                      <div className="text-xs font-bold text-slate-600">{driveConfigured ? t(newASFiles.length > 0 ? '파일 추가 (드래그 또는 클릭)' : '파일을 드래그하거나 클릭하여 첨부 (다중 가능)', newASFiles.length > 0 ? 'Add more files' : 'Drag or click to attach files (multiple)') : t('Drive 미연동 — 첨부 불가', 'Drive not configured')}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{fileLimitGuide}{t(' · 파일당 최대 18MB', ' · Up to 18MB per file')}</div>
                    </label>
                  </div>

                  {asError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-2 flex items-center">
                      <AlertTriangle size={12} className="mr-1.5 shrink-0" />{asError}
                    </div>
                  )}
                  {asUploading && (
                    <div className={`text-xs font-bold flex items-center ${themeText}`}>
                      <Loader size={12} className="animate-spin mr-1.5" />
                      {t('등록 중...', 'Saving...')}
                      {newASFiles.length > 0 && ` ${asUploadIdx + 1}/${newASFiles.length} · ${asUploadProgress}%`}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={handleSubmitAS} disabled={asUploading || !newASForm.description.trim() || !newASForm.engineer.trim()} className={`px-4 py-2 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center ${themeBtn}`}>
                      <LifeBuoy size={14} className="mr-1.5" />
                      {isHW ? t('HW AS 등록', 'Add HW AS') : t('SW AS 등록', 'Add SW AS')}
                    </button>
                  </div>
                </div>
                );
              })()}

              {/* 리스트 필터 칩 — 분류(HW/SW) + 상태(처리중/완료) */}
              {recs.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">{t('분류', 'Type')}</span>
                    <button type="button" onClick={() => setAsListFilter('all')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${asListFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')} {asCnt.all}</button>
                    <button type="button" onClick={() => setAsListFilter('HW')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${asListFilter === 'HW' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}><Wrench size={10} className="mr-1" />HW {asCnt.HW}</button>
                    <button type="button" onClick={() => setAsListFilter('SW')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${asListFilter === 'SW' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}><HardDrive size={10} className="mr-1" />SW {asCnt.SW}</button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">{t('상태', 'Status')}</span>
                    <button type="button" onClick={() => setAsStatusFilter('all')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${asStatusFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')}</button>
                    <button type="button" onClick={() => setAsStatusFilter('open')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${asStatusFilter === 'open' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}><Clock size={10} className="mr-1" />{t('처리중', 'Open')} {asCnt.open}</button>
                    <button type="button" onClick={() => setAsStatusFilter('done')} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${asStatusFilter === 'done' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}><CheckCircle size={10} className="mr-1" />{t('완료', 'Done')} {asCnt.done}</button>
                  </div>
                </div>
              )}

              {/* AS 목록 — 타임라인 브랜치 (회의록과 동일 패턴) */}
              {(!recs || recs.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 AS 내역이 없습니다.', 'No AS records.')}</div>
              ) : (() => {
                const filteredRecs = recs.filter(r => {
                  const c = r.category || AS_DEFAULT_CATEGORY;
                  if (asListFilter !== 'all' && c !== asListFilter) return false;
                  if (asStatusFilter === 'open' && r.status === '완료') return false;
                  if (asStatusFilter === 'done' && r.status !== '완료') return false;
                  return true;
                });
                if (filteredRecs.length === 0) {
                  return <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('필터 조건에 맞는 AS가 없습니다.', 'No AS matching the filter.')}</div>;
                }
                const sorted = [...filteredRecs].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
                const today = new Date();
                const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                const DAY = 86400000;
                return (
                  <div className="relative">
                    {/* 좌측 세로 타임라인 라인 — 보라(AS 테마) */}
                    <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-purple-200"></div>
                    <div className="space-y-3">
                      {sorted.map((as) => {
                        const cat = as.category || AS_DEFAULT_CATEGORY;
                        const isHW = cat === 'HW';
                        const ts = Number(as.id) || 0;
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
                        // 날짜 노드 색상 — 카테고리 + 신선도
                        const stripCls = isHW
                          ? (diff === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : diff <= 1 ? 'bg-indigo-300 text-indigo-900 border-indigo-400'
                            : diff < 7 ? 'bg-indigo-200 text-indigo-800 border-indigo-300'
                            : diff < 30 ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300')
                          : (diff === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : diff <= 1 ? 'bg-cyan-300 text-cyan-900 border-cyan-400'
                            : diff < 7 ? 'bg-cyan-200 text-cyan-800 border-cyan-300'
                            : diff < 30 ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300');
                        const statusColor = as.status === '완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (cat === 'SW' && (as.status === '검증' || as.status === '적용')) ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : as.status === '출동' || as.status === '조치' ? 'bg-blue-50 text-blue-700 border-blue-200' : as.status === '분석' || as.status === '개발' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                        const typeColor = as.type === '긴급출동' ? 'bg-red-100 text-red-700' : as.type === '정기점검' ? 'bg-blue-100 text-blue-700' : as.type === '부품교체' ? 'bg-amber-100 text-amber-700' : as.type === '보증수리' ? 'bg-indigo-100 text-indigo-700' : cat === 'SW' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-700';
                        const catBadgeCls = cat === 'SW' ? 'bg-cyan-600 text-white' : 'bg-indigo-600 text-white';
                        const cardBorder = isHW ? 'border-indigo-100' : 'border-cyan-100';
                        const avatarBg = isHW ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700';
                        const statuses = getASStatusesByCategory(cat);
                        const files = Array.isArray(as.files) ? as.files : [];
                        return (
                          <div key={as.id} className="relative pl-[68px]">
                            {/* 좌측 날짜 노드 (캘린더 스타일) */}
                            <div className={`absolute left-0 top-1 w-14 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center py-1.5 z-10 ${stripCls}`} title={valid ? `${mm}/${dd} ${hh}:${mi}` : as.date}>
                              <div className="text-[9px] font-black leading-none">{valid ? `${mm}월` : '-'}</div>
                              <div className="text-xl font-black leading-none mt-0.5 tabular-nums">{valid ? dd : '-'}</div>
                              <div className="text-[8px] font-medium leading-none mt-0.5 opacity-70">{valid ? `${dow}요일` : ''}</div>
                            </div>
                            {/* 우측 본문 카드 */}
                            <div className={`bg-white p-4 rounded-xl border shadow-sm ${cardBorder} ${as.priority === '긴급' && as.status !== '완료' ? 'ring-2 ring-red-200' : ''}`}>
                              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg}`}>{(as.engineer || '?').charAt(0)}</div>
                                  <span className="text-sm font-bold text-slate-800">{as.engineer}</span>
                                  <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${catBadgeCls}`}>
                                    {isHW ? <Wrench size={9} className="mr-1" /> : <HardDrive size={9} className="mr-1" />}{cat}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{as.type}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>{as.status}</span>
                                  {as.priority === '긴급' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 inline-flex items-center"><AlertTriangle size={9} className="mr-0.5" />{t('긴급', 'Urgent')}</span>
                                  )}
                                  {valid && (
                                    <span className="text-[10px] text-slate-500 flex items-center"><Clock size={10} className="mr-0.5" />{hh}:{mi}{rel && <span className="ml-1.5 text-slate-400 font-medium">· {rel}</span>}</span>
                                  )}
                                </div>
                                {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                                  <button onClick={() => {
                                    const fileCount = (Array.isArray(as.files) ? as.files.length : 0);
                                    const hasReport = as.status === '완료' && as.report && !as.report.naReason;
                                    const extra = fileCount > 0 || hasReport ? `\n${t('첨부', 'Attachments')}: ${fileCount + (hasReport ? 1 : 0)}${t('건', '')}` : '';
                                    if (window.confirm(t(`이 AS(${as.type})를 삭제할까요?\n처리 이력·코멘트·첨부가 모두 사라집니다.${extra}`, `Delete this AS (${as.type})?\nAll comments and attachments will be removed.${extra}`))) {
                                      onDeleteAS(project.id, as.id);
                                    }
                                  }} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors shrink-0" title={t('삭제', 'Delete')}>
                                    <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                                  </button>
                                )}
                              </div>

                              {/* V3 메타 정보 — 담당자/연락처/시리얼/희망일/방문/부품/금액 — 값 있을 때만 인라인 칩으로 */}
                              {(as.manager || as.contact || as.serial || as.reqDate || as.visit || as.part || as.cost) && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-2 text-[11px]">
                                  {as.manager && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><User size={10} className="mr-1" />{as.manager}</span>}
                                  {as.contact && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><Phone size={10} className="mr-1" />{as.contact}</span>}
                                  {as.serial && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold font-mono"><HardDrive size={10} className="mr-1" />{as.serial}</span>}
                                  {as.reqDate && <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold"><CalendarDays size={10} className="mr-1" />{as.reqDate}</span>}
                                  {as.visit && <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold"><MapPin size={10} className="mr-1" />{as.visit}</span>}
                                  {as.part && <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold"><Package size={10} className="mr-1" />{as.part}</span>}
                                  {as.cost && <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">₩ {as.cost}</span>}
                                </div>
                              )}

                              <div className="space-y-2">
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className="text-[10px] font-bold text-slate-500 mb-1">{isHW ? t('증상', 'Symptoms') : t('증상 / 요청', 'Symptoms / Request')}</div>
                                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{as.description}</p>
                                </div>
                                {as.resolution && (
                                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="text-[10px] font-bold text-emerald-600 mb-1">{isHW ? t('조치 내용', 'Resolution') : t('분석 / 조치', 'Analysis / Resolution')}</div>
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{as.resolution}</p>
                                  </div>
                                )}
                              </div>

                              {/* 첨부 파일 */}
                              {files.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  {files.map((f, fIdx) => (
                                    <div key={fIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                      <div className={`w-8 h-8 rounded-lg ${isHW ? 'bg-indigo-50 border-indigo-200' : 'bg-cyan-50 border-cyan-200'} border flex items-center justify-center shrink-0`}>
                                        <Paperclip size={13} className={isHW ? 'text-indigo-600' : 'text-cyan-600'} />
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

                              {/* 완료 보고서 — 완료된 AS만 노출 */}
                              {as.status === '완료' && as.report && (
                                <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                  <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center"><CheckCircle size={11} className="mr-1" />{t('완료 보고서', 'Completion Report')} {as.report.completedAt && <span className="ml-2 text-emerald-600 font-medium">· {as.report.completedAt}</span>}</div>
                                  {as.report.naReason ? (
                                    <div className="text-xs text-emerald-800 font-medium">{t('보고서 제출 N/A', 'No report (N/A)')}{as.report.naReason !== 'N/A' && ` — ${as.report.naReason}`}</div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Paperclip size={12} className="text-emerald-600 shrink-0" />
                                      <span className="text-xs font-bold text-emerald-900 truncate flex-1">{as.report.fileName}</span>
                                      {as.report.viewUrl && <a href={as.report.viewUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-100" title={t('Drive에서 열기', 'Open in Drive')}><ExternalLink size={12} /></a>}
                                      {as.report.downloadUrl && <a href={as.report.downloadUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-100" title={t('다운로드', 'Download')}><Download size={12} /></a>}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 처리 코멘트 (답글) */}
                              {Array.isArray(as.comments) && as.comments.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  <div className="text-[10px] font-bold text-slate-500 flex items-center"><MessageSquare size={10} className="mr-1" />{t('처리 이력', 'Comments')} ({as.comments.length})</div>
                                  {as.comments.map(c => (
                                    <div key={c.id} className="border-l-2 border-purple-300 bg-purple-50 rounded-r-md px-2 py-1.5">
                                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5"><strong className="text-slate-700">{c.author}</strong><span>·</span><span>{c.time}</span></div>
                                      <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{c.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 답글 입력 — 처리 중일 때 */}
                              {currentUser.role !== 'CUSTOMER' && as.status !== '완료' && onAddASComment && (
                                <div className="mt-3 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={asReplyText[as.id] || ''}
                                    onChange={(e) => setAsReplyText({ ...asReplyText, [as.id]: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const txt = asReplyText[as.id];
                                        if (txt && txt.trim()) {
                                          onAddASComment(project.id, as.id, txt);
                                          setAsReplyText({ ...asReplyText, [as.id]: '' });
                                        }
                                      }
                                    }}
                                    placeholder={t('처리 내용 답글 (Enter로 등록)', 'Reply (Enter)')}
                                    className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const txt = asReplyText[as.id];
                                      if (txt && txt.trim()) {
                                        onAddASComment(project.id, as.id, txt);
                                        setAsReplyText({ ...asReplyText, [as.id]: '' });
                                      }
                                    }}
                                    disabled={!(asReplyText[as.id] || '').trim()}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center"
                                  >
                                    <Send size={11} className="mr-1" />{t('답글', 'Reply')}
                                  </button>
                                </div>
                              )}

                              {currentUser.role !== 'CUSTOMER' && (
                                <div className="flex flex-wrap gap-1 mt-3 items-center">
                                  {statuses.map(s => (
                                    <button key={s} onClick={() => {
                                      // 완료로 가는 건 보고서 모달 거치도록 가로채기
                                      if (s === '완료' && as.status !== '완료' && onCompleteAS) {
                                        setAsCompleteModal({ asId: as.id, file: null, isNA: false, uploading: false });
                                        return;
                                      }
                                      onUpdateAS(project.id, as.id, { status: s });
                                    }} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ${as.status === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                                  ))}
                                  {/* 완료 취소 (사유 입력) — 완료 상태일 때만 */}
                                  {as.status === '완료' && onRevertCompleteAS && (currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                                    <button onClick={() => setAsRevertPrompt({ asId: as.id, reason: '' })} className="ml-auto text-[10px] px-2 py-1 rounded font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors inline-flex items-center">
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
                  </div>
                );
              })()}

              {/* 완료 처리 모달 — 보고서 첨부 필수 또는 N/A */}
              {asCompleteModal && (() => {
                const m = asCompleteModal;
                const closeModal = () => setAsCompleteModal(null);
                const submit = async () => {
                  if (!m.isNA && !m.file) return;
                  setAsCompleteModal({ ...m, uploading: true });
                  try {
                    await onCompleteAS(project.id, m.asId, { isNA: m.isNA, file: m.file, onProgress: () => {} });
                    setAsCompleteModal(null);
                  } catch (e) {
                    setAsCompleteModal({ ...m, uploading: false });
                  }
                };
                return (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[440px] max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-sm font-black text-purple-700 flex items-center"><CheckCircle size={16} className="mr-2" />{t('완료 처리 — 보고서 첨부', 'Complete — Attach Report')}</h3>
                        <button onClick={closeModal} disabled={m.uploading} className="text-slate-400 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-xs text-slate-600 leading-relaxed">{t('완료 처리 시 보고서(작업 결과서 / 점검 보고서 / 패치 노트 등)를 첨부하거나 N/A를 명시해야 합니다.', 'Attach a report or mark N/A.')}</div>
                        <input
                          type="file"
                          disabled={m.isNA || m.uploading}
                          onChange={(e) => setAsCompleteModal({ ...m, file: e.target.files && e.target.files[0] ? e.target.files[0] : null })}
                          className="block w-full text-xs p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-600 file:text-white file:font-bold file:text-[11px] disabled:opacity-50"
                        />
                        {m.file && !m.isNA && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 truncate">
                            <Paperclip size={11} className="inline mr-1 text-purple-600" />{m.file.name}
                          </div>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                          <input type="checkbox" checked={m.isNA} onChange={(e) => setAsCompleteModal({ ...m, isNA: e.target.checked, file: e.target.checked ? null : m.file })} className="accent-red-600" disabled={m.uploading} />
                          {t('보고서 제출 N/A (불필요)', 'N/A — No report needed')}
                        </label>
                        {m.uploading && (
                          <div className="text-xs font-bold text-purple-700 flex items-center"><Loader size={12} className="animate-spin mr-1.5" />{t('업로드 중...', 'Uploading...')}</div>
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                        <button type="button" onClick={closeModal} disabled={m.uploading} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('취소', 'Cancel')}</button>
                        <button type="button" onClick={submit} disabled={m.uploading || (!m.isNA && !m.file)} className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center disabled:bg-slate-300"><CheckCircle size={12} className="mr-1" />{t('완료 확정', 'Confirm')}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 완료 취소 사유 입력 모달 */}
              {asRevertPrompt && (() => {
                const r = asRevertPrompt;
                const close = () => setAsRevertPrompt(null);
                const submit = () => {
                  if (!r.reason.trim()) return;
                  onRevertCompleteAS(project.id, r.asId, r.reason);
                  setAsRevertPrompt(null);
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
                        <textarea rows="3" autoFocus value={r.reason} onChange={(e) => setAsRevertPrompt({ ...r, reason: e.target.value })} placeholder={t('예: 고객 추가 확인 필요 / 재발 발견', 'e.g. Customer requested re-check / regression')} className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500"></textarea>
                      </div>
                      <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                        <button type="button" onClick={close} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-50">{t('취소', 'Cancel')}</button>
                        <button type="button" onClick={submit} disabled={!r.reason.trim()} className="px-3 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-700 text-white inline-flex items-center disabled:bg-slate-300"><ShieldOff size={12} className="mr-1" />{t('취소 확정', 'Confirm')}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            );
          })()}
          {activeModalTab === 'extras' && (
            <div className="space-y-4">
              <div className="bg-pink-50 text-pink-800 p-3 rounded-lg text-xs font-medium border border-pink-200 flex items-start justify-between gap-3">
                <div className="flex items-start flex-1">
                  <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
                  <span>{t('검수 완료 후 고객사 요청에 의한 추가 개발/기능 추가 작업을 별도로 관리합니다. 셋업 일정과 분리되어, 워런티 단계에서 진행되는 변경 사항을 추적합니다.', 'Track post-Buy-off enhancements and customer-requested development separately from setup tasks.')}</span>
                </div>
                {currentUser.role !== 'CUSTOMER' && onImportExtraTasks && (
                  <button
                    type="button"
                    onClick={() => setExtraImportOpen(true)}
                    className="shrink-0 px-3 py-1.5 bg-white hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-md border border-pink-300 inline-flex items-center transition-colors"
                    title={t('Excel 파일 또는 시트 붙여넣기로 일괄 등록', 'Bulk import via Excel or paste')}
                  >
                    <Upload size={11} className="mr-1" />{t('파일로 일괄 등록', 'Import')}
                  </button>
                )}
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
                      <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.startDate} onChange={(e) => setNewExtraForm({...newExtraForm, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('종료 예정일', 'End')}</label>
                      <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={newExtraForm.endDate} onChange={(e) => setNewExtraForm({...newExtraForm, endDate: e.target.value})} />
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

              {/* 필터 + 검색 — 추가 대응이 1건 이상일 때만 표시 */}
              {(project.extraTasks || []).length > 0 && (() => {
                const all = project.extraTasks || [];
                const statusCounts = all.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
                const types = Array.from(new Set(all.map(t => t.type).filter(Boolean)));
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('필터', 'Filter')}</span>
                    {/* 상태 칩 */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { v: 'all', label: t('전체', 'All'), count: all.length },
                        { v: '대기', label: t('대기', 'Pending'), count: statusCounts['대기'] || 0 },
                        { v: '검토중', label: t('검토중', 'Review'), count: statusCounts['검토중'] || 0 },
                        { v: '진행중', label: t('진행중', 'In Progress'), count: statusCounts['진행중'] || 0 },
                        { v: '완료', label: t('완료', 'Done'), count: statusCounts['완료'] || 0 },
                        { v: '반려', label: t('반려', 'Returned'), count: statusCounts['반려'] || 0 },
                      ].map(f => (
                        <button
                          key={f.v}
                          onClick={() => setExtraFilterStatus(f.v)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${extraFilterStatus === f.v ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'}`}
                        >
                          {f.label} <span className="ml-0.5 opacity-70">{f.count}</span>
                        </button>
                      ))}
                    </div>
                    {/* 유형 필터 */}
                    {types.length > 1 && (
                      <select
                        value={extraFilterType}
                        onChange={(e) => setExtraFilterType(e.target.value)}
                        className="text-[11px] p-1 border border-slate-200 rounded-md focus:outline-none focus:border-pink-500"
                      >
                        <option value="all">{t('모든 유형', 'All Types')}</option>
                        {types.map(ty => <option key={ty} value={ty}>{ty}</option>)}
                      </select>
                    )}
                    {/* 검색 */}
                    <div className="flex items-center gap-1 flex-1 min-w-[120px] max-w-[300px] ml-auto">
                      <input
                        type="text"
                        value={extraSearch}
                        onChange={(e) => setExtraSearch(e.target.value)}
                        placeholder={t('작업명/요청자/메모 검색', 'Search')}
                        className="flex-1 text-[11px] p-1 border border-slate-200 rounded-md focus:outline-none focus:border-pink-500"
                      />
                      {(extraFilterStatus !== 'all' || extraFilterType !== 'all' || extraSearch) && (
                        <button
                          onClick={() => { setExtraFilterStatus('all'); setExtraFilterType('all'); setExtraSearch(''); }}
                          className="text-[10px] text-slate-500 hover:text-pink-700 font-bold"
                          title={t('필터 초기화', 'Reset filter')}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 목록 — 회의록/노트와 동일한 브랜치(타임라인) 스타일 */}
              {(!project.extraTasks || project.extraTasks.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
                  {t('등록된 추가 대응 작업이 없습니다.', 'No extra tasks recorded.')}
                </div>
              ) : (() => {
                const kw = extraSearch.trim().toLowerCase();
                // 정렬 기준 일치 — 캘린더 타일에 표시되는 날짜와 동일 (import면 startDate, 아니면 task.id 타임스탬프)
                const sortKey = (task) => {
                  const imported = typeof task.createdBy === 'string' && task.createdBy.startsWith('import:');
                  if (imported && task.startDate) {
                    const t = new Date(task.startDate).getTime();
                    if (!isNaN(t)) return t;
                  }
                  return Number(task.id) || 0;
                };
                const filtered = [...project.extraTasks]
                  .sort((a, b) => sortKey(b) - sortKey(a))
                  .filter(t => {
                    if (extraFilterStatus !== 'all' && t.status !== extraFilterStatus) return false;
                    if (extraFilterType !== 'all' && t.type !== extraFilterType) return false;
                    if (kw) {
                      const hay = [t.name, t.requester, t.note, t.type, t.status].filter(Boolean).join(' ').toLowerCase();
                      if (!hay.includes(kw)) return false;
                    }
                    return true;
                  });
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
                      <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
                      {t('필터에 해당하는 작업이 없습니다.', 'No tasks match the filter.')}
                    </div>
                  );
                }
                const today = new Date();
                const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                const DAY = 86400000;
                return (
                <div className="relative">
                  {/* 좌측 세로 타임라인 라인 */}
                  <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-pink-200"></div>
                  <div className="space-y-3">
                  {filtered.map(task => {
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
                    // 좌측 날짜 타일 — 일괄등록(import)건은 startDate 기준, 그 외는 task.id(=등록시각 timestamp) 기준
                    const isImported = typeof task.createdBy === 'string' && task.createdBy.startsWith('import:');
                    let d = null;
                    if (isImported && task.startDate) {
                      const parsed = new Date(task.startDate);
                      if (!isNaN(parsed)) d = parsed;
                    }
                    if (!d) {
                      const ts = Number(task.id) || 0;
                      if (ts > 0) d = new Date(ts);
                    }
                    const valid = d && !isNaN(d);
                    const d0 = valid ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;
                    const diff = d0 !== null ? Math.floor((today0 - d0) / DAY) : null;
                    const dow = valid ? ['일','월','화','수','목','금','토'][d.getDay()] : '';
                    const mm = valid ? d.getMonth() + 1 : '';
                    const dd = valid ? d.getDate() : '';
                    let rel = '';
                    if (diff === 0) rel = t('오늘', 'Today');
                    else if (diff === 1) rel = t('어제', 'Yesterday');
                    else if (diff > 1 && diff < 7) rel = t(`${diff}일 전`, `${diff}d ago`);
                    else if (diff >= 7 && diff < 30) rel = t(`${Math.floor(diff/7)}주 전`, `${Math.floor(diff/7)}w ago`);
                    else if (diff >= 30 && diff < 365) rel = t(`${Math.floor(diff/30)}개월 전`, `${Math.floor(diff/30)}mo ago`);
                    else if (diff >= 365) rel = t(`${Math.floor(diff/365)}년 전`, `${Math.floor(diff/365)}y ago`);
                    // 신선도 — pink 톤
                    const stripCls = diff === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                      : diff <= 1 ? 'bg-pink-400 text-white border-pink-500'
                      : diff < 7 ? 'bg-pink-300 text-pink-900 border-pink-400'
                      : diff < 30 ? 'bg-pink-200 text-pink-800 border-pink-300'
                      : 'bg-slate-200 text-slate-700 border-slate-300';
                    return (
                      <div key={task.id} className="relative pl-[68px]">
                        {/* 좌측 캘린더 타일 노드 — import 건은 시작일 기준, 그 외는 등록일 기준 */}
                        <div className={`absolute left-0 top-1 w-14 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center py-1.5 z-10 ${stripCls}`} title={valid ? `${mm}/${dd} ${isImported ? '시작일(일괄등록)' : '등록일'}` : ''}>
                          <div className="text-[9px] font-black leading-none">{valid ? `${mm}월` : '-'}</div>
                          <div className="text-xl font-black leading-none mt-0.5 tabular-nums">{valid ? dd : '-'}</div>
                          <div className="text-[8px] font-medium leading-none mt-0.5 opacity-70">{valid ? `${dow}요일` : ''}</div>
                        </div>
                      <div className={`bg-white p-3 rounded-xl border shadow-sm ${task.status === '완료' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{task.type}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{task.status}</span>
                            {rel && <span className="text-[10px] text-slate-400 font-medium">· {rel}</span>}
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

                        {/* 초기 요약 메모 (등록 시 작성된 한 줄 설명) — 읽기 전용 표시 */}
                        {task.note && (
                          <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded whitespace-pre-wrap">{task.note}</p>
                        )}

                        {/* 댓글 스레드 — AS와 동일 패턴 */}
                        {Array.isArray(task.comments) && task.comments.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 flex items-center"><MessageSquare size={10} className="mr-1" />{t('진행 이력', 'Comments')} ({task.comments.length})</div>
                            {task.comments.map(c => (
                              <div key={c.id} className="border-l-2 border-pink-300 bg-pink-50 rounded-r-md px-2 py-1.5">
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5"><strong className="text-slate-700">{c.author}</strong><span>·</span><span>{c.time}</span></div>
                                <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 댓글 입력 */}
                        {currentUser.role !== 'CUSTOMER' && onAddExtraTaskComment && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={extraReplyText[task.id] || ''}
                              onChange={(e) => setExtraReplyText({ ...extraReplyText, [task.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const txt = extraReplyText[task.id];
                                  if (txt && txt.trim()) {
                                    onAddExtraTaskComment(project.id, task.id, txt);
                                    setExtraReplyText({ ...extraReplyText, [task.id]: '' });
                                  }
                                }
                              }}
                              placeholder={t('진행 상황 / 답글 (Enter로 등록)', 'Progress / reply (Enter)')}
                              className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-pink-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const txt = extraReplyText[task.id];
                                if (txt && txt.trim()) {
                                  onAddExtraTaskComment(project.id, task.id, txt);
                                  setExtraReplyText({ ...extraReplyText, [task.id]: '' });
                                }
                              }}
                              disabled={!(extraReplyText[task.id] || '').trim()}
                              className="px-3 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center"
                            >
                              <Send size={11} className="mr-1" />{t('답글', 'Reply')}
                            </button>
                          </div>
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
                      </div>
                    );
                  })}
                  </div>
                </div>
                );
              })()}
            </div>
          )}
        </div>
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-100 flex justify-end bg-white flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
      {extraImportOpen && (
        <ExtraTaskImportModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setExtraImportOpen(false)}
          onSubmit={onImportExtraTasks}
          t={t}
        />
      )}
    </div>
  );
});

export default TaskModal;
