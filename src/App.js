import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Kanban, AlertTriangle, Wrench, Database, Users,
  GitCommit, Search, Globe, Smartphone, Monitor, LogOut,
  Building, Camera, CheckSquare, Package, LayoutDashboard as Home
} from 'lucide-react';

// Constants & Initial Data
import {
  TODAY, DOMAIN_TASKS, DOMAIN_CHECKLIST
} from './constants';

// Utils
import { getStatusColor } from './utils/status';
import { calcExp, calcAct } from './utils/calc';
import { loadFromGoogleDB, saveToGoogleDB, notifyWebhook } from './utils/api';

// Common Components
import NavItem from './components/common/NavItem';

// Lazy-loaded Views
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const ProjectListView = lazy(() => import('./components/views/ProjectListView'));
const IssueListView = lazy(() => import('./components/views/IssueListView'));
const PartsListView = lazy(() => import('./components/views/PartsListView'));
const SiteListView = lazy(() => import('./components/views/SiteListView'));
const ResourceListView = lazy(() => import('./components/views/ResourceListView'));
const VersionHistoryView = lazy(() => import('./components/views/VersionHistoryView'));
const LoginScreen = lazy(() => import('./components/views/LoginScreen'));

// Lazy-loaded Modals
const ProjectModal = lazy(() => import('./components/modals/ProjectModal'));
const IssueModal = lazy(() => import('./components/modals/IssueModal'));
const PartModal = lazy(() => import('./components/modals/PartModal'));
const SiteModal = lazy(() => import('./components/modals/SiteModal'));
const TaskModal = lazy(() => import('./components/modals/TaskModal'));
const IssueDetailModal = lazy(() => import('./components/modals/IssueDetailModal'));
const VersionModal = lazy(() => import('./components/modals/VersionModal'));
const ReleaseModal = lazy(() => import('./components/modals/ReleaseModal'));
const EngineerModal = lazy(() => import('./components/modals/EngineerModal'));
const DailyReportModal = lazy(() => import('./components/modals/DailyReportModal'));
const MobileIssueModal = lazy(() => import('./components/modals/MobileIssueModal'));
const MobilePartModal = lazy(() => import('./components/modals/MobilePartModal'));
const DeleteConfirmModal = lazy(() => import('./components/modals/DeleteConfirmModal'));

const Loading = () => <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading...</div>;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [lang, setLang] = useState('ko');
  const t = useCallback((ko, en) => lang === 'ko' ? ko : en, [lang]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(false);

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isIssueDetailModalOpen, setIsIssueDetailModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionEditProject, setVersionEditProject] = useState(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [isEngineerModalOpen, setIsEngineerModalOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  // Delete confirm states
  const [engineerToDelete, setEngineerToDelete] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [issueToDelete, setIssueToDelete] = useState(null);
  const [releaseToDelete, setReleaseToDelete] = useState(null);
  const [partToDelete, setPartToDelete] = useState(null);
  const [siteToDelete, setSiteToDelete] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Data states (Google Sheets에서 불러옴)
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [releases, setReleases] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [parts, setParts] = useState([]);
  const [sites, setSites] = useState([]);

  // 앱 시작 시 Google Sheets에서 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await loadFromGoogleDB();
      if (data) {
        setProjects(data.projects || []);
        setIssues(data.issues || []);
        setReleases(data.releases || []);
        setEngineers(data.engineers || []);
        setParts(data.parts || []);
        setSites(data.sites || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Login guard
  if (!currentUser) return (
    <Suspense fallback={<Loading />}>
      <LoginScreen onLogin={setCurrentUser} lang={lang} setLang={setLang} t={t} />
    </Suspense>
  );

  // Helpers
  const handleLogout = () => { setCurrentUser(null); setActiveTab('dashboard'); };
  const generateUniqueId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

  // === 헬퍼: state 변경 후 전체 배열을 GAS에 덮어쓰기 ===
  const syncProjects = (updated) => { setProjects(updated); saveToGoogleDB('UPDATE_PROJECTS', updated); };
  const syncIssues = (updated) => { setIssues(updated); saveToGoogleDB('UPDATE_ISSUES', updated); };
  const syncReleases = (updated) => { setReleases(updated); saveToGoogleDB('UPDATE_RELEASES', updated); };
  const syncEngineers = (updated) => { setEngineers(updated); saveToGoogleDB('UPDATE_ENGINEERS', updated); };
  const syncParts = (updated) => { setParts(updated); saveToGoogleDB('UPDATE_PARTS', updated); };
  const syncSites = (updated) => { setSites(updated); saveToGoogleDB('UPDATE_SITES', updated); };

  // === CRUD Handlers ===

  const handleAddProject = (newProject) => {
    const domainTasks = DOMAIN_TASKS[newProject.domain] || DOMAIN_TASKS['반도체'];
    const domainChecklist = DOMAIN_CHECKLIST[newProject.domain] || DOMAIN_CHECKLIST['반도체'];
    const tasks = JSON.parse(JSON.stringify(domainTasks));
    const checklist = domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx }));
    const newData = { ...newProject, id: generateUniqueId('PRJ'), tasks, checklist, signOff: null };
    syncProjects([newData, ...projects]);
    setIsProjectModalOpen(false);
    showToast('프로젝트가 추가되었습니다.');
  };

  const handleUpdatePhase = (projectId, newPhaseIndex) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, phaseIndex: newPhaseIndex, status: newPhaseIndex === 6 ? '완료' : '진행중' } : p));
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    syncProjects(projects.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null);
    showToast('프로젝트가 삭제되었습니다.');
  };

  const toggleTaskCompletion = (projectId, taskId) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) } : p));
  };

  const handleAddTask = (projectId, taskName) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, { id: Date.now(), name: taskName, isCompleted: false, delayReason: '' }] } : p));
  };

  const handleEditTaskName = (projectId, taskId, newName) => {
    if (!newName.trim()) return;
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, name: newName.trim() } : t) } : p));
  };

  const handleDeleteTask = (projectId, taskId) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
  };

  const handleUpdateDelayReason = (projectId, taskId, reason) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, delayReason: reason } : t) } : p));
  };

  const handleUpdateChecklistItem = (projectId, itemId, newStatus, newNote) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, status: newStatus, note: newNote !== undefined ? newNote : c.note } : c) } : p));
  };

  const handleLoadDefaultChecklist = (projectId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const domainChecklist = DOMAIN_CHECKLIST[p.domain] || DOMAIN_CHECKLIST['반도체'];
      return { ...p, checklist: domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx })) };
    }));
    showToast('기본 검수표가 불러와졌습니다.');
  };

  const handleAddChecklistItem = (projectId, category, taskName) => {
    if (!taskName.trim()) return;
    syncProjects(projects.map(p => p.id === projectId ? { ...p, checklist: [...(p.checklist || []), { id: Date.now(), category: category || '일반', task: taskName.trim(), status: 'Pending', note: '' }] } : p));
  };

  const handleDeleteChecklistItem = (projectId, itemId) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, checklist: (p.checklist || []).filter(c => c.id !== itemId) } : p));
  };

  const handleSignOff = (projectId, customerName, signatureData) => {
    const todayStr = new Date().toISOString().split('T')[0];
    syncProjects(projects.map(p => p.id === projectId ? { ...p, status: '완료', phaseIndex: 6, signOff: { signed: true, customerName, signatureData, date: todayStr } } : p));
    showToast('최종 검수 및 서명이 완료되었습니다!');
  };

  const handleAddIssue = (newIssue) => {
    const selectedProject = projects.find(p => p.id === newIssue.projectId);
    const issueWithDetails = { ...newIssue, id: generateUniqueId('ISS'), projectName: selectedProject ? selectedProject.name : '알 수 없는 프로젝트', date: TODAY.toISOString().split('T')[0], status: '이슈 확인', comments: [] };
    syncIssues([issueWithDetails, ...issues]);
    setIsIssueModalOpen(false);
    const targetEmail = newIssue.alertEmail ? newIssue.alertEmail : '기본 담당자(default@company.com)';
    notifyWebhook(`신규 이슈 등록: [${issueWithDetails.projectName}] ${issueWithDetails.title} (수신자: ${targetEmail})`, 'ISSUE');
    showToast(`이슈 등록 완료. [${targetEmail}]로 알림이 전송되었습니다.`);
  };

  const handleAddComment = (issueId, text) => {
    const commentData = { id: Date.now(), author: currentUser.name, text, date: new Date().toLocaleString() };
    syncIssues(issues.map(issue => issue.id === issueId ? { ...issue, comments: [...(issue.comments || []), commentData] } : issue));
  };

  const handleUpdateIssueStatus = (issueId, newStatus) => {
    syncIssues(issues.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
  };

  const handleDeleteIssue = () => {
    if (!issueToDelete) return;
    syncIssues(issues.filter(i => i.id !== issueToDelete.id));
    setIssueToDelete(null);
    showToast(t('이슈가 삭제되었습니다.', 'Issue deleted.'));
  };

  const handleAddPart = (newPart) => {
    const selectedProject = projects.find(p => p.id === newPart.projectId);
    const partWithDetails = { ...newPart, id: generateUniqueId('PRT'), projectName: selectedProject ? selectedProject.name : t('알 수 없는 프로젝트', 'Unknown Project'), date: TODAY.toISOString().split('T')[0], status: '청구' };
    syncParts([partWithDetails, ...parts]);
    setIsPartModalOpen(false);
    showToast(t('자재 청구가 접수되었습니다.', 'Part request submitted.'));
  };

  const handleDeletePart = () => {
    if (!partToDelete) return;
    syncParts(parts.filter(p => p.id !== partToDelete.id));
    setPartToDelete(null);
    showToast(t('자재 청구 내역이 삭제되었습니다.', 'Part request deleted.'));
  };

  const handleUpdatePartStatus = (partId, newStatus) => {
    syncParts(parts.map(p => p.id === partId ? { ...p, status: newStatus } : p));
  };

  const handleAddSite = (newSite) => {
    const newSiteData = selectedSite ? { ...newSite, id: selectedSite.id, date: selectedSite.date } : { ...newSite, id: generateUniqueId('SIT'), date: TODAY.toISOString().split('T')[0] };
    syncSites(selectedSite ? sites.map(s => s.id === selectedSite.id ? newSiteData : s) : [newSiteData, ...sites]);
    setIsSiteModalOpen(false);
    showToast(t('사이트가 업데이트되었습니다.', 'Site updated.'));
  };

  const handleDeleteSite = () => {
    if (!siteToDelete) return;
    syncSites(sites.filter(s => s.id !== siteToDelete.id));
    setSiteToDelete(null);
    showToast(t('사이트 환경 정보가 삭제되었습니다.', 'Site info deleted.'));
  };

  const handleAddRelease = (newRelease) => {
    const releaseData = { ...newRelease, id: generateUniqueId('REL'), date: TODAY.toISOString().split('T')[0] };
    syncReleases([releaseData, ...releases]);
    setIsReleaseModalOpen(false);
    showToast(t('릴리즈 정보가 등록되었습니다.', 'Release registered.'));
  };

  const handleDeleteRelease = () => {
    if (!releaseToDelete) return;
    syncReleases(releases.filter(r => r.id !== releaseToDelete.id));
    setReleaseToDelete(null);
    showToast(t('버전 이력이 삭제되었습니다.', 'Release deleted.'));
  };

  const handleAddEngineer = (engineerData) => {
    const engData = selectedEngineer ? { ...engineerData, id: selectedEngineer.id } : { ...engineerData, id: generateUniqueId('ENG') };
    syncEngineers(selectedEngineer ? engineers.map(e => e.id === selectedEngineer.id ? engData : e) : [engData, ...engineers]);
    setIsEngineerModalOpen(false);
    showToast(t('엔지니어 정보가 업데이트되었습니다.', 'Engineer updated.'));
  };

  const handleDeleteEngineer = () => {
    if (!engineerToDelete) return;
    syncEngineers(engineers.filter(e => e.id !== engineerToDelete.id));
    setEngineerToDelete(null);
    showToast(t('엔지니어 정보가 삭제되었습니다.', 'Engineer deleted.'));
  };

  const handleUpdateVersion = (projectId, hwVersion, swVersion, fwVersion) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, hwVersion, swVersion, fwVersion } : p));
    setIsVersionModalOpen(false);
    showToast(t('버전이 업데이트되었습니다.', 'Version updated.'));
  };

  const handleAddDailyReport = (reportData) => {
    setIsDailyReportOpen(false);
    showToast(t('일일 보고서가 제출되었습니다.', 'Daily report submitted.'));
    saveToGoogleDB('ADD_DAILY_REPORT', reportData);
  };

  // Toast renderer
  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[300] flex items-center animate-[fadeIn_0.3s_ease-in-out] w-max font-bold text-sm">
        {toastMessage}
      </div>
    );
  };

  // Shared modal props
  const taskModalProps = {
    project: projects.find(p => p.id === selectedProjectId),
    projectIssues: issues.filter(i => i.projectId === selectedProjectId),
    getStatusColor, onClose: () => setIsTaskModalOpen(false),
    onToggleTask: toggleTaskCompletion, onAddTask: handleAddTask,
    onEditTaskName: handleEditTaskName, onDeleteTask: handleDeleteTask,
    onUpdateDelayReason: handleUpdateDelayReason,
    onUpdateChecklistItem: handleUpdateChecklistItem,
    onLoadDefaultChecklist: handleLoadDefaultChecklist,
    onAddChecklistItem: handleAddChecklistItem,
    onDeleteChecklistItem: handleDeleteChecklistItem,
    onUpdatePhase: handleUpdatePhase, onSignOff: handleSignOff,
    calcAct, currentUser, t
  };

  // === MOBILE MODE ===
  if (isMobileMode) {
    return (
      <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 animate-[fadeIn_0.3s_ease-in-out]">
        {renderToast()}
        <div className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">E</div><div><h1 className="font-bold text-sm leading-tight">EQ-PMS</h1><p className="text-[10px] text-blue-300">{t('모바일 모드', 'Mobile Mode')}</p></div></div>
          <button onClick={() => setIsMobileMode(false)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full border border-slate-600 transition-colors shadow-sm flex items-center"><Monitor size={14} className="mr-1" /> PC화면</button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth p-4 pb-24 space-y-4">
          <Suspense fallback={<Loading />}>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setIsIssueModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Camera size={24} className="mb-2" /><span className="font-bold text-sm">{t('이슈 등록', 'Add Issue')}</span></button>
                  <button onClick={() => setIsDailyReportOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><CheckSquare size={24} className="mb-2" /><span className="font-bold text-sm">{t('일일 보고', 'Daily Report')}</span></button>
                  <button onClick={() => setIsPartModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Package size={24} className="mb-2" /><span className="font-bold text-sm">{t('자재 청구', 'Part Request')}</span></button>
                  <button onClick={() => setActiveTab('sites')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Database size={24} className="mb-2" /><span className="font-bold text-sm">{t('���경 정보', 'Site Info')}</span></button>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-500 mb-3 ml-1">{t('나의 배정 현장 요약', 'My Assigned Projects')}</h2>
                  <div className="space-y-3">
                    {projects.filter(p => p.status !== '��료').slice(0, 3).map(prj => (
                      <div key={prj.id} onClick={() => { setActiveTab('projects'); setSelectedProjectId(prj.id); }} className="bg-white p-4 rounded-xl shadow-sm border active:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(prj.status)}`}>{prj.status}</span><span className="text-[10px] text-slate-400 flex items-center"><Building size={12} className="mr-1" />{prj.customer}</span></div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{prj.name}</h3>
                        <div className="flex justify-between items-center text-xs mt-3"><span className="font-medium text-slate-500">{t('셋업 진척도', 'Progress')}</span><span className="font-bold text-blue-600">{calcAct(prj.tasks)}%</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${calcAct(prj.tasks)}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
            {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
            {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
          </Suspense>
        </div>

        <div className="bg-white border-t border-slate-200 flex justify-around p-2.5 fixed bottom-0 w-full z-20 pb-safe shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('홈', 'Home')}</span></button>
          <button onClick={() => setActiveTab('projects')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'projects' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Kanban size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('프로젝트', 'Projects')}</span></button>
          <button onClick={() => setActiveTab('issues')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'issues' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><AlertTriangle size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('이슈', 'Issues')}</span></button>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={() => setActiveTab('sites')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'sites' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Database size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('��프라', 'Sites')}</span></button>
          )}
        </div>

        <Suspense fallback={null}>
          {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
          {isIssueModalOpen && <MobileIssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
          {isPartModalOpen && <MobilePartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
          {isDailyReportOpen && <DailyReportModal projects={projects} onClose={() => setIsDailyReportOpen(false)} onSubmit={handleAddDailyReport} t={t} />}
          {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
          {isTaskModalOpen && <TaskModal {...taskModalProps} />}
          {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} getStatusColor={getStatusColor} t={t} />}
          {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
        </Suspense>
      </div>
    );
  }

  // === PC DESKTOP MODE ===
  return (
    <div className="flex flex-col h-screen font-sans relative animate-[fadeIn_0.3s_ease-in-out] bg-slate-50">
      {renderToast()}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0"><div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3"><span className="text-white font-bold text-lg">E</span></div><span className="text-white font-bold text-lg tracking-wider">EQ-PMS</span></div>
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            <NavItem icon={<LayoutDashboard size={20} />} label={t('대시보드', 'Dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Kanban size={20} />} label={t('프로젝트 관리', 'Projects')} active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            <NavItem icon={<AlertTriangle size={20} />} label={t('이슈/펀치 관리', 'Issues')} active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} />
            {currentUser.role !== 'CUSTOMER' && (
              <>
                <NavItem icon={<Wrench size={20} />} label={t('자재/스페어 파트', 'Parts')} active={activeTab === 'parts'} onClick={() => setActiveTab('parts')} />
                <NavItem icon={<Database size={20} />} label={t('사이트/유틸 마스터', 'Site Master')} active={activeTab === 'sites'} onClick={() => setActiveTab('sites')} />
                <NavItem icon={<Users size={20} />} label={t('인력/리소스 관리', 'Resources')} active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} />
                <NavItem icon={<GitCommit size={20} />} label={t('버전 릴리즈 관리', 'Releases')} active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} />
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
            <div className="flex items-center text-slate-500 bg-slate-100 px-4 py-2 rounded-lg w-96"><Search size={18} className="mr-2" /><input type="text" placeholder={t("검색...", "Search...")} className="bg-transparent border-none outline-none w-full text-sm" /></div>
            <div className="flex items-center space-x-4">
              <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center shadow-sm hover:bg-slate-200"><Globe size={14} className="mr-1.5" /> {lang === 'ko' ? 'EN' : 'KO'}</button>
              <button onClick={() => setIsMobileMode(true)} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm"><Smartphone size={16} className="mr-2" /> {t('모바일 현장 모드', 'Mobile Mode')}</button>
              <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 ml-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{currentUser.name.charAt(0)}</div>
                <div className="text-sm pr-2"><p className="font-semibold text-slate-700">{currentUser.name}</p><p className="text-[10px] text-slate-400">{currentUser.role}</p></div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1"><LogOut size={18}/></button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-8">
            <Suspense fallback={<Loading />}>
              {activeTab === 'dashboard' && <DashboardView projects={projects} issues={issues} engineers={engineers} getStatusColor={getStatusColor} calcExp={calcExp} calcAct={calcAct} t={t} />}
              {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
              {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
              {activeTab === 'parts' && <PartsListView parts={parts} getStatusColor={getStatusColor} onUpdateStatus={handleUpdatePartStatus} onDeletePart={(part) => setPartToDelete(part)} onAddClick={() => setIsPartModalOpen(true)} currentUser={currentUser} t={t} />}
              {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
              {activeTab === 'resources' && <ResourceListView engineers={engineers} projects={projects} getStatusColor={getStatusColor} TODAY={TODAY} onAddClick={() => { setSelectedEngineer(null); setIsEngineerModalOpen(true); }} onEditClick={(eng) => { setSelectedEngineer(eng); setIsEngineerModalOpen(true); }} onDeleteClick={(eng) => setEngineerToDelete(eng)} currentUser={currentUser} t={t} />}
              {activeTab === 'versions' && <VersionHistoryView releases={releases} onAddClick={() => setIsReleaseModalOpen(true)} onDeleteRelease={(release) => setReleaseToDelete(release)} currentUser={currentUser} t={t} />}
            </Suspense>
          </div>

          <Suspense fallback={null}>
            {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
            {isIssueModalOpen && <IssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
            {isPartModalOpen && <PartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
            {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
            {isTaskModalOpen && <TaskModal {...taskModalProps} />}
            {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} getStatusColor={getStatusColor} t={t} />}
            {isVersionModalOpen && <VersionModal project={versionEditProject} onClose={() => setIsVersionModalOpen(false)} onSubmit={handleUpdateVersion} t={t} />}
            {isReleaseModalOpen && <ReleaseModal onClose={() => setIsReleaseModalOpen(false)} onSubmit={handleAddRelease} t={t} />}
            {isEngineerModalOpen && <EngineerModal engineer={selectedEngineer} onClose={() => setIsEngineerModalOpen(false)} onSubmit={handleAddEngineer} t={t} />}

            {projectToDelete && <DeleteConfirmModal type="project" item={projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} t={t} />}
            {issueToDelete && <DeleteConfirmModal type="issue" item={issueToDelete} onClose={() => setIssueToDelete(null)} onConfirm={handleDeleteIssue} t={t} />}
            {releaseToDelete && <DeleteConfirmModal type="release" item={releaseToDelete} onClose={() => setReleaseToDelete(null)} onConfirm={handleDeleteRelease} t={t} />}
            {engineerToDelete && <DeleteConfirmModal type="engineer" item={engineerToDelete} onClose={() => setEngineerToDelete(null)} onConfirm={handleDeleteEngineer} t={t} />}
            {partToDelete && <DeleteConfirmModal type="part" item={partToDelete} onClose={() => setPartToDelete(null)} onConfirm={handleDeletePart} t={t} />}
            {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
