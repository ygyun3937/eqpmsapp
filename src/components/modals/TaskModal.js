import React, { useState, memo } from 'react';
import { X, ListTodo, CheckSquare, AlertTriangle, CheckCircle, User, Edit, Trash, PenTool, Info, ShieldCheck, FileText, ImageIcon, History, GitCommit as TimelineIcon, Package, Wrench, HardDrive, MessageSquare, Send, LifeBuoy } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import ProjectPipelineStepper from '../common/ProjectPipelineStepper';
import SignaturePad from '../common/SignaturePad';
import { generatePDF } from '../../utils/export';

const TaskModal = memo(function TaskModal({ project, projectIssues, getStatusColor, onClose, onToggleTask, onAddTask, onEditTaskName, onDeleteTask, onUpdateDelayReason, onUpdateChecklistItem, onLoadDefaultChecklist, onAddChecklistItem, onDeleteChecklistItem, onUpdatePhase, onSignOff, onAddNote, onDeleteNote, onAddCustomerRequest, onUpdateCustomerRequestStatus, onAddCustomerResponse, onDeleteCustomerRequest, onAddAS, onUpdateAS, onDeleteAS, calcAct, currentUser, t }) {
  const [activeModalTab, setActiveModalTab] = useState('tasks');
  const [newTaskName, setNewTaskName] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState('일반');
  const [newChecklistTask, setNewChecklistTask] = useState('');
  const [newRequestForm, setNewRequestForm] = useState({ requester: '', content: '', urgency: 'Medium' });
  const [responseText, setResponseText] = useState({});
  const [newASForm, setNewASForm] = useState({ type: '정기점검', engineer: '', description: '', resolution: '' });

  if (!project) return null;

  const actualProgress = calcAct(project.tasks);
  const checklistCount = project.checklist ? project.checklist.length : 0;
  const checklistCompleted = project.checklist ? project.checklist.filter(c => c.status === 'OK').length : 0;
  const isReadyToSign = checklistCount > 0 && checklistCompleted === checklistCount;

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
        <div className="grid grid-cols-7 border-b border-slate-200 bg-white shrink-0">
          <button onClick={() => setActiveModalTab('tasks')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ListTodo size={16} className="mb-0.5" /><span>{t('세부 일정', 'Tasks')}</span></button>
          <button onClick={() => setActiveModalTab('checklist')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'checklist' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><CheckSquare size={16} className="mb-0.5" /><span>{t('검수표', 'Checklist')} ({checklistCompleted}/{checklistCount})</span></button>
          <button onClick={() => setActiveModalTab('issues')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'issues' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} className="mb-0.5" /><span>{t('이슈', 'Issues')} ({projectIssues.length})</span></button>
          <button onClick={() => setActiveModalTab('history')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'history' ? 'border-slate-600 text-slate-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><History size={16} className="mb-0.5" /><span>{t('이력', 'History')} ({(project.activityLog || []).length})</span></button>
          <button onClick={() => setActiveModalTab('notes')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'notes' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileText size={16} className="mb-0.5" /><span>{t('노트', 'Notes')} ({(project.notes || []).length})</span></button>
          <button onClick={() => setActiveModalTab('requests')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'requests' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><MessageSquare size={16} className="mb-0.5" /><span>{t('고객요청', 'Requests')} ({(project.customerRequests || []).length})</span></button>
          <button onClick={() => setActiveModalTab('as')} className={`px-2 py-2 text-xs font-bold border-b-2 transition-colors flex flex-col items-center justify-center ${activeModalTab === 'as' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><LifeBuoy size={16} className="mb-0.5" /><span>{t('AS 관리', 'AS')} ({(project.asRecords || []).length})</span></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 scroll-smooth bg-slate-50">
          {activeModalTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">{t('현재 실적 진척도', 'Actual Progress')}</span><span className="text-2xl font-black text-blue-600">{actualProgress}%</span></div>
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-xs font-bold text-slate-500 mb-2 flex items-center">{t('현재 업무 단계:', 'Current Phase:')} <span className="ml-1 text-indigo-600 bg-white px-1.5 py-0.5 border border-indigo-200 rounded">{PROJECT_PHASES[project.phaseIndex || 0]}</span></span>
                <div className="overflow-x-auto pb-1 scroll-smooth"><ProjectPipelineStepper currentPhase={project.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={project.id} role={currentUser.role} /></div>
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
                            <div className="opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                              {!task.isCompleted && <button onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskName(task.name); }} className="text-slate-400 hover:text-blue-500 transition-colors p-1.5"><Edit size={14}/></button>}
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(project.id, task.id); }} className="text-slate-400 hover:text-red-500 transition-colors p-1.5"><Trash size={14}/></button>
                            </div>
                          )}
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
                          {!project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (<button onClick={() => onDeleteChecklistItem(project.id, item.id)} className="text-slate-300 hover:text-red-500 p-1 ml-2 transition-colors shrink-0"><Trash size={14} /></button>)}
                        </div>
                      </div>
                      <div className="flex space-x-1 shrink-0 mt-2 md:mt-0">
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'Pending')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'Pending' ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>{t('대기', 'Wait')}</button>
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'OK')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400 shadow-sm' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'} disabled:opacity-50`}>OK</button>
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'NG')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'NG' ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400 shadow-sm' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'} disabled:opacity-50`}>NG</button>
                      </div>
                    </div>
                    {item.status !== 'OK' && !project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (<input type="text" placeholder={t("점검 결과 특이사항 입력...", "Result note...")} className="mt-2 w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-indigo-400" value={item.note || ''} onChange={(e) => onUpdateChecklistItem(project.id, item.id, item.status, e.target.value)} />)}
                    {item.note && (<p className="mt-1.5 text-xs text-slate-500 bg-slate-100 p-1.5 rounded flex items-center"><PenTool size={12} className="mr-1" /> {item.note}</p>)}
                  </div>
                ))}
              </div>
              {!project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (
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
                    <div><button onClick={() => generatePDF(project, projectIssues)} className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"><FileText size={16} className="mr-2"/> {t('최종 완료 보고서 (PDF) 인쇄/저장', 'Print/Save Buy-off Report (PDF)')}</button></div>
                  </div>
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
            <div className="space-y-1">
              {(!project.activityLog || project.activityLog.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('활동 이력이 없습니다.', 'No activity history.')}</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                  <div className="space-y-3">
                    {[...project.activityLog].reverse().map((log, i) => {
                      const typeConfig = {
                        PROJECT_CREATE: { icon: <TimelineIcon size={14}/>, color: 'bg-blue-100 text-blue-600 border-blue-200', label: t('프로젝트 생성', 'Created') },
                        PHASE_CHANGE: { icon: <TimelineIcon size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('단계 변경', 'Phase') },
                        MANAGER_CHANGE: { icon: <User size={14}/>, color: 'bg-orange-100 text-orange-600 border-orange-200', label: t('담당자 변경', 'Manager') },
                        TASK_COMPLETE: { icon: <CheckCircle size={14}/>, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', label: t('태스크 완료', 'Task Done') },
                        TASK_ADD: { icon: <ListTodo size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: t('태스크 추가', 'Task Add') },
                        TASK_DELETE: { icon: <Trash size={14}/>, color: 'bg-slate-100 text-slate-500 border-slate-200', label: t('태스크 삭제', 'Task Del') },
                        ISSUE_ADD: { icon: <AlertTriangle size={14}/>, color: 'bg-red-100 text-red-600 border-red-200', label: t('이슈 등록', 'Issue') },
                        PART_ADD: { icon: <Package size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('자재 청구', 'Part') },
                        CHECKLIST_CHANGE: { icon: <CheckSquare size={14}/>, color: 'bg-indigo-100 text-indigo-600 border-indigo-200', label: t('체크리스트', 'Checklist') },
                        VERSION_CHANGE: { icon: <HardDrive size={14}/>, color: 'bg-slate-100 text-slate-600 border-slate-200', label: t('버전 변경', 'Version') },
                        SIGN_OFF: { icon: <ShieldCheck size={14}/>, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: t('Buy-off 서명', 'Sign-off') },
                        NOTE_ADD: { icon: <FileText size={14}/>, color: 'bg-amber-100 text-amber-600 border-amber-200', label: t('공유 노트', 'Note') },
                        REQUEST_ADD: { icon: <MessageSquare size={14}/>, color: 'bg-cyan-100 text-cyan-600 border-cyan-200', label: t('고객 요청', 'Request') },
                        REQUEST_STATUS: { icon: <MessageSquare size={14}/>, color: 'bg-cyan-100 text-cyan-600 border-cyan-200', label: t('요청 처리', 'Req Status') },
                        AS_ADD: { icon: <LifeBuoy size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('AS 등록', 'AS') },
                        AS_UPDATE: { icon: <LifeBuoy size={14}/>, color: 'bg-purple-100 text-purple-600 border-purple-200', label: t('AS 처리', 'AS Update') },
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
              )}
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
                          <button onClick={() => onDeleteNote(project.id, note.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash size={14} /></button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed ml-9">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeModalTab === 'requests' && (
            <div className="space-y-4">
              <div className="bg-cyan-50 text-cyan-800 p-3 rounded-lg text-xs font-medium border border-cyan-200 flex items-center">
                <Info size={14} className="mr-1.5 shrink-0" />
                {t('고객 요청사항을 체계적으로 관리합니다. 접수 → 검토 → 반영 완료/반려 단계로 추적됩니다.', 'Track customer requests: Received → Reviewing → Completed/Rejected')}
              </div>

              {/* 새 요청 등록 폼 */}
              {currentUser.role !== 'CUSTOMER' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('요청자 (고객사)', 'Requester')}</label>
                      <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500" value={newRequestForm.requester} onChange={(e) => setNewRequestForm({...newRequestForm, requester: e.target.value})} placeholder={t('예: 홍길동 책임', 'Name')} />
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
                    <textarea rows="2" className="w-full text-sm p-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-cyan-500" value={newRequestForm.content} onChange={(e) => setNewRequestForm({...newRequestForm, content: e.target.value})} placeholder={t('고객이 요청한 내용을 입력하세요', 'Request content')}></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => { if (newRequestForm.content.trim() && newRequestForm.requester.trim()) { onAddCustomerRequest(project.id, newRequestForm); setNewRequestForm({ requester: '', content: '', urgency: 'Medium' }); } }} disabled={!newRequestForm.content.trim() || !newRequestForm.requester.trim()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors flex items-center"><MessageSquare size={14} className="mr-1.5" />{t('요청 등록', 'Submit')}</button>
                  </div>
                </div>
              )}

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
                              <button onClick={() => onDeleteCustomerRequest(project.id, req.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash size={12} /></button>
                            )}
                          </div>
                        </div>

                        {/* 요청 내용 */}
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">{req.content}</p>

                        {/* 상태 변경 버튼 */}
                        {currentUser.role !== 'CUSTOMER' && (
                          <div className="flex space-x-1 mb-2">
                            {['접수', '검토중', '반영 완료', '반려'].map(s => (
                              <button key={s} onClick={() => onUpdateCustomerRequestStatus(project.id, req.id, s)} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ${req.status === s ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                            ))}
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

                        {/* 응답 입력 */}
                        {currentUser.role !== 'CUSTOMER' && (
                          <div className="flex gap-2 mt-2">
                            <input type="text" placeholder={t('고객에게 답변 입력...', 'Response to customer...')} className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500" value={responseText[req.id] || ''} onChange={(e) => setResponseText({...responseText, [req.id]: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter' && responseText[req.id]?.trim()) { onAddCustomerResponse(project.id, req.id, responseText[req.id].trim()); setResponseText({...responseText, [req.id]: ''}); } }} />
                            <button onClick={() => { if (responseText[req.id]?.trim()) { onAddCustomerResponse(project.id, req.id, responseText[req.id].trim()); setResponseText({...responseText, [req.id]: ''}); } }} disabled={!responseText[req.id]?.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors"><Send size={12} /></button>
                          </div>
                        )}
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
                              <button onClick={() => onDeleteAS(project.id, as.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash size={12} /></button>
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
        </div>
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-100 flex justify-end bg-white flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
    </div>
  );
});

export default TaskModal;
