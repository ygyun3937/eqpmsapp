import React, { useState, memo } from 'react';
import { X, ListTodo, CheckSquare, AlertTriangle, CheckCircle, User, Edit, Trash, PenTool, Info, ShieldCheck, FileText, ImageIcon, History, GitCommit as TimelineIcon, Package, Wrench, HardDrive, MessageSquare, Send, LifeBuoy, Plus, ShieldOff, Sparkles, Paperclip, Upload, Download, ExternalLink, Loader, FolderOpen } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import SignaturePad from '../common/SignaturePad';
import { generatePDF } from '../../utils/export';

const TaskModal = memo(function TaskModal({ project, projectIssues, getStatusColor, onClose, onToggleTask, onAddTask, onEditTaskName, onDeleteTask, onUpdateDelayReason, onUpdateTaskDates, onUpdateChecklistItem, onLoadDefaultChecklist, onAddChecklistItem, onDeleteChecklistItem, onUpdatePhase, onEditPhases, onSignOff, onCancelSignOff, onAddExtraTask, onUpdateExtraTask, onDeleteExtraTask, onAddNote, onDeleteNote, onAddCustomerRequest, onUpdateCustomerRequestStatus, onAddCustomerResponse, onDeleteCustomerRequest, onAddAS, onUpdateAS, onDeleteAS, onUploadAttachment, onDeleteAttachment, driveConfigured, calcAct, currentUser, t, initialTab }) {
  const [activeModalTab, setActiveModalTab] = useState(initialTab || 'tasks');
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachDragOver, setAttachDragOver] = useState(false);
  const [attachProgress, setAttachProgress] = useState(0);
  const [attachError, setAttachError] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
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

  const actualProgress = calcAct(project.tasks);
  const checklistCount = project.checklist ? project.checklist.length : 0;
  const checklistCompleted = project.checklist ? project.checklist.filter(c => c.status === 'OK').length : 0;
  const isReadyToSign = checklistCount > 0 && checklistCompleted === checklistCount;
  // ADMIN은 Buy-off 후에도 검수표 수정 가능
  const isLockedForChecklist = project.signOff?.signed && currentUser.role !== 'ADMIN';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-blue-50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-blue-800 truncate">{project.name}</h2>
            <p className="text-xs text-blue-600 mt-1">{t('상세 관리', 'Details')}</p>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-blue-600 p-2 shrink-0"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-9 border-b border-slate-200 bg-white shrink-0">
          <button onClick={() => setActiveModalTab('tasks')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ListTodo size={16} className="mb-0.5" /><span>{t('셋업 일정', 'Setup Tasks')}</span></button>
          <button onClick={() => setActiveModalTab('checklist')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'checklist' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><CheckSquare size={16} className="mb-0.5" /><span>{t('검수표', 'Checklist')} ({checklistCompleted}/{checklistCount})</span></button>
          <button onClick={() => setActiveModalTab('extras')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'extras' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Sparkles size={16} className="mb-0.5" /><span>{t('추가 대응', 'Extras')} ({(project.extraTasks || []).length})</span></button>
          <button onClick={() => setActiveModalTab('issues')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'issues' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} className="mb-0.5" /><span>{t('이슈', 'Issues')} ({projectIssues.length})</span></button>
          <button onClick={() => setActiveModalTab('history')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'history' ? 'border-slate-600 text-slate-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><History size={16} className="mb-0.5" /><span>{t('이력', 'History')} ({(project.activityLog || []).length})</span></button>
          <button onClick={() => setActiveModalTab('notes')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'notes' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileText size={16} className="mb-0.5" /><span>{t('노트', 'Notes')} ({(project.notes || []).length})</span></button>
          <button onClick={() => setActiveModalTab('attachments')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'attachments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Paperclip size={16} className="mb-0.5" /><span>{t('참고 자료', 'Files')} ({(project.attachments || []).length})</span></button>
          <button onClick={() => setActiveModalTab('requests')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'requests' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><MessageSquare size={16} className="mb-0.5" /><span>{t('고객요청', 'Requests')} ({(project.customerRequests || []).length})</span></button>
          <button onClick={() => setActiveModalTab('as')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'as' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><LifeBuoy size={16} className="mb-0.5" /><span>{t('AS 관리', 'AS')} ({(project.asRecords || []).length})</span></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 scroll-smooth bg-slate-50">
          {activeModalTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">{t('현재 실적 진척도', 'Actual Progress')}</span><span className="text-2xl font-black text-blue-600">{actualProgress}%</span></div>
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-xs font-bold text-slate-500 mb-2 flex items-center">{t('현재 업무 단계:', 'Current Phase:')} <span className="ml-1 text-indigo-600 bg-white px-1.5 py-0.5 border border-indigo-200 rounded">{PROJECT_PHASES[project.phaseIndex || 0]}</span></span>
                <div className="overflow-x-auto pb-1 scroll-smooth"><ProjectPipelineStepper phases={project.phases} currentPhase={project.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={project.id} role={currentUser.role} onEditPhases={onEditPhases} /></div>
              </div>
              <div className="space-y-3">
                {project.tasks.map((task, index) => (
                  <div key={task.id} className={`flex items-start p-3 rounded-lg border shadow-sm ${task.isCompleted ? 'bg-slate-100 border-slate-200' : 'bg-white border-blue-100 hover:border-blue-300'} transition-colors ${currentUser.role !== 'CUSTOMER' ? 'cursor-pointer' : ''} group`} onClick={() => { if(currentUser.role !== 'CUSTOMER') onToggleTask(project.id, task.id)}}>
                    <div className="mr-3 md:mr-4 flex-shrink-0 mt-0.5">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.isCompleted ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                        {task.isCompleted && <CheckCircle size={16} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center space-x-2 mb-1" onClick={(e) => e.stopPropagation()}>
                          <input type="text" value={editingTaskName} onChange={(e) => setEditingTaskName(e.target.value)} className="flex-1 text-xs md:text-sm p-1.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { onEditTaskName(project.id, task.id, editingTaskName); setEditingTaskId(null); } else if (e.key === 'Escape') setEditingTaskId(null); }} />
                          <button onClick={() => { onEditTaskName(project.id, task.id, editingTaskName); setEditingTaskId(null); }} className="text-[10px] md:text-xs bg-blue-600 text-white px-2 py-1.5 rounded font-bold shrink-0">{t('저장','Save')}</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <p className={`text-xs md:text-sm font-bold pr-2 ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>Step {index + 1}. {task.name}</p>
                          {currentUser.role !== 'CUSTOMER' && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!task.isCompleted && (
                                <button onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskName(task.name); }} className="inline-flex items-center px-1.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors" title={t('수정', 'Edit')}>
                                  <Edit size={11} className="mr-0.5"/>{t('수정', 'Edit')}
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(project.id, task.id); }} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                                <Trash size={11} className="mr-0.5"/>{t('삭제', 'Delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* 시작일 / 종료일 */}
                      {currentUser.role !== 'CUSTOMER' && (
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{t('시작일', 'Start')}</label>
                            <input type="date" className="w-full text-[10px] md:text-xs p-1 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-blue-400 focus:bg-white" value={task.startDate || ''} onChange={(e) => onUpdateTaskDates(project.id, task.id, { startDate: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{t('종료일', 'End')}</label>
                            <input type="date" className="w-full text-[10px] md:text-xs p-1 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-blue-400 focus:bg-white" value={task.endDate || ''} onChange={(e) => onUpdateTaskDates(project.id, task.id, { endDate: e.target.value })} />
                          </div>
                        </div>
                      )}
                      {currentUser.role === 'CUSTOMER' && (task.startDate || task.endDate) && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {task.startDate || '?'} ~ {task.endDate || '?'}
                        </div>
                      )}

                      {!task.isCompleted && currentUser.role !== 'CUSTOMER' && <input type="text" placeholder={t("지연 사유 등 메모 (선택)", "Delay Reason/Notes (Optional)")} className="mt-2 w-full text-[10px] md:text-xs p-1.5 border border-slate-200 rounded bg-slate-50 text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" value={task.delayReason || ''} onChange={(e) => onUpdateDelayReason(project.id, task.id, e.target.value)} onClick={(e) => e.stopPropagation()} />}
                      {task.delayReason && <p className="mt-1 text-[10px] md:text-xs text-slate-400">{t('메모:', 'Note:')} {task.delayReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {currentUser.role !== 'CUSTOMER' && (
                <div className="mt-4 flex gap-2 items-center">
                  <input type="text" placeholder={t("새로운 업무 입력...", "New task...")} className="flex-1 text-xs md:text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTaskName.trim()) { onAddTask(project.id, newTaskName.trim()); setNewTaskName(''); } }} />
                  <button onClick={() => { if(newTaskName.trim()) { onAddTask(project.id, newTaskName.trim()); setNewTaskName(''); } }} className="px-3 md:px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm">{t('추가', 'Add')}</button>
                </div>
              )}
            </div>
          )}
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
                  { key: 'task', label: t('셋업 일정', 'Setup'), types: ['TASK_ADD', 'TASK_COMPLETE', 'TASK_DELETE'] },
                  { key: 'extra', label: t('추가 대응', 'Extras'), types: ['EXTRA_ADD', 'EXTRA_UPDATE', 'EXTRA_DELETE'] },
                  { key: 'checklist', label: t('검수', 'Checklist'), types: ['CHECKLIST_CHANGE'] },
                  { key: 'issue', label: t('이슈', 'Issues'), types: ['ISSUE_ADD'] },
                  { key: 'request', label: t('고객요청', 'Requests'), types: ['REQUEST_ADD', 'REQUEST_STATUS'] },
                  { key: 'as', label: t('AS', 'AS'), types: ['AS_ADD', 'AS_UPDATE'] },
                  { key: 'note', label: t('노트', 'Notes'), types: ['NOTE_ADD'] },
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
                  task: ['TASK_ADD', 'TASK_COMPLETE', 'TASK_DELETE'],
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
                        ISSUE_ADD: { icon: <AlertTriangle size={14}/>, color: 'bg-red-100 text-red-600 border-red-200', label: t('이슈 등록', 'Issue') },
                        PART_ADD: { icon: <Package size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('자재 청구', 'Part') },
                        CHECKLIST_CHANGE: { icon: <CheckSquare size={14}/>, color: 'bg-indigo-100 text-indigo-600 border-indigo-200', label: t('체크리스트', 'Checklist') },
                        VERSION_CHANGE: { icon: <HardDrive size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: t('버전 등록', 'Version') },
                        VERSION_DELETE: { icon: <HardDrive size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('버전 삭제', 'Version Del') },
                        SIGN_OFF: { icon: <ShieldCheck size={14}/>, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: t('Buy-off 서명', 'Sign-off') },
                        NOTE_ADD: { icon: <FileText size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('공유 노트', 'Note') },
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
                      return (
                        <div key={i} className="relative pl-10">
                          <div className={`absolute left-2 top-3 w-5 h-5 rounded-full border flex items-center justify-center z-10 ${cfg.color}`}>{cfg.icon}</div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-[10px] text-slate-400">{log.date}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{log.detail}</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center"><User size={10} className="mr-1"/>{log.user}</p>
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
          {activeModalTab === 'notes' && (
            <div className="space-y-4">
              {currentUser.role !== 'CUSTOMER' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <textarea rows="3" className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-amber-500" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder={t('공유할 내용을 입력하세요...\n예: 고객사 담당자 요청으로 설치 위치 변경', 'Enter notes to share...')}></textarea>
                  <div className="flex justify-end mt-2">
                    <button onClick={() => { if (newNoteText.trim()) { onAddNote(project.id, newNoteText.trim()); setNewNoteText(''); } }} disabled={!newNoteText.trim()} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center"><FileText size={14} className="mr-1.5" />{t('노트 등록', 'Add Note')}</button>
                  </div>
                </div>
              )}
              {(!project.notes || project.notes.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('등록된 공유 노트가 없습니다.', 'No notes yet.')}</div>
              ) : (
                <div className="space-y-3">
                  {[...project.notes].reverse().map((note) => (
                    <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold mr-2">{note.author.charAt(0)}</div>
                          <div>
                            <span className="text-sm font-bold text-slate-800">{note.author}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{note.date}</span>
                          </div>
                        </div>
                        {(currentUser.role === 'ADMIN' || currentUser.name === note.author) && (
                          <button onClick={() => onDeleteNote(project.id, note.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                            <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed ml-9">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeModalTab === 'attachments' && (() => {
            const attachments = [...(project.attachments || [])].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
            const canEdit = currentUser.role !== 'CUSTOMER';
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
                  await onUploadAttachment(project.id, f, ({ percent }) => setAttachProgress(percent || 0));
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
                    {t('회의록·PDF·도면 등 참고자료를 Google Drive에 업로드합니다. 파일은 ', 'Upload reference files (meeting notes, PDFs, drawings) to Google Drive. Stored under ')}
                    <code className="bg-white px-1 rounded text-[11px]">[루트]/[고객사]/[프로젝트]</code>
                    {t(' 폴더에 자동 저장됩니다.', '.')}
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
                        <div className="text-[11px] text-slate-500 mt-1">{t('최대 18MB · PDF/이미지/문서 등 모든 형식 지원', 'Up to 18MB · all file types')}</div>
                      </div>
                    )}
                  </label>
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
                    {attachments[0] && attachments[0].folderUrl && (
                      <a
                        href={attachments[0].folderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors mb-1"
                      >
                        <FolderOpen size={12} className="mr-1.5" /> {t('Drive 프로젝트 폴더 열기', 'Open Drive folder')} <ExternalLink size={11} className="ml-1.5" />
                      </a>
                    )}
                    {attachments.map(a => (
                      <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:border-emerald-300 transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Paperclip size={16} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate" title={a.fileName}>{a.fileName}</div>
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
                    ))}
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
