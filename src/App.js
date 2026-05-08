import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Kanban, AlertTriangle, Wrench, Database, Users,
  GitCommit, Search, Globe, Smartphone, Monitor, LogOut,
  Building, Camera, CheckSquare, Package, LayoutDashboard as Home,
  KeyRound, UserCog, LifeBuoy, HelpCircle, ChevronsLeft, ChevronsRight,
  Settings as SettingsIcon
} from 'lucide-react';

// Constants & Initial Data
import {
  TODAY, DOMAIN_TASKS, DOMAIN_CHECKLIST, PROJECT_PHASES,
  PHASE_COMPLETED_INDEX, PHASE_WARRANTY_INDEX,
  SEED_ADMIN, SEED_TEST_USERS, TEST_MODE
} from './constants';

// Utils
import { getStatusColor } from './utils/status';
import { calcExp, calcAct } from './utils/calc';
import { loadFromGoogleDB, saveToGoogleDB, notifyWebhook, callGoogleAction, fileToBase64 } from './utils/api';
import { hashPassword } from './utils/auth';

// Common Components
import NavItem from './components/common/NavItem';
import NotificationBell from './components/common/NotificationBell';

// Lazy-loaded Views
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const ProjectListView = lazy(() => import('./components/views/ProjectListView'));
const IssueListView = lazy(() => import('./components/views/IssueListView'));
const PartsListView = lazy(() => import('./components/views/PartsListView'));
const SiteListView = lazy(() => import('./components/views/SiteListView'));
const ResourceListView = lazy(() => import('./components/views/ResourceListView'));
const VersionHistoryView = lazy(() => import('./components/views/VersionHistoryView'));
const ASManagementView = lazy(() => import('./components/views/ASManagementView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const SystemSettingsView = lazy(() => import('./components/views/SystemSettingsView'));
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
const EngineerCertificatesModal = lazy(() => import('./components/modals/EngineerCertificatesModal'));
const EngineerActivityModal = lazy(() => import('./components/modals/EngineerActivityModal'));
const DailyReportModal = lazy(() => import('./components/modals/DailyReportModal'));
const MobileIssueModal = lazy(() => import('./components/modals/MobileIssueModal'));
const MobilePartModal = lazy(() => import('./components/modals/MobilePartModal'));
const DeleteConfirmModal = lazy(() => import('./components/modals/DeleteConfirmModal'));
// ManagerChangeModal/TripScheduleModal은 ProjectTeamModal로 통합
const PhaseGanttModal = lazy(() => import('./components/modals/PhaseGanttModal'));
const ProjectEditModal = lazy(() => import('./components/modals/ProjectEditModal'));
const ProjectTeamModal = lazy(() => import('./components/modals/ProjectTeamModal'));
const PhaseEditModal = lazy(() => import('./components/modals/PhaseEditModal'));
const SetupTaskEditModal = lazy(() => import('./components/modals/SetupTaskEditModal'));
const UserModal = lazy(() => import('./components/modals/UserModal'));
const PasswordChangeModal = lazy(() => import('./components/modals/PasswordChangeModal'));
const HelpModal = lazy(() => import('./components/modals/HelpModal'));

const Loading = () => <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading...</div>;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [lang, setLang] = useState('ko');
  const t = useCallback((ko, en) => lang === 'ko' ? ko : en, [lang]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(() => window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('eq_pms_sidebar_collapsed') === '1'; } catch (_) { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('eq_pms_sidebar_collapsed', sidebarCollapsed ? '1' : '0'); } catch (_) {}
  }, [sidebarCollapsed]);

  // 화면 크기 변경 시 자동 모드 전환
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsMobileMode(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일 모드는 dashboard/projects/issues/sites 만 지원 — 다른 탭이면 dashboard로 자동 폴백
  const MOBILE_TABS = ['dashboard', 'projects', 'issues', 'sites'];
  useEffect(() => {
    if (isMobileMode && !MOBILE_TABS.includes(activeTab)) {
      setActiveTab('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileMode]);

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
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certEngineerId, setCertEngineerId] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityEngineerId, setActivityEngineerId] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [managerEditProject, setManagerEditProject] = useState(null);
  const [isPhaseGanttOpen, setIsPhaseGanttOpen] = useState(false);
  const [phaseGanttProject, setPhaseGanttProject] = useState(null);
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [projectEditTarget, setProjectEditTarget] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamEditProjectId, setTeamEditProjectId] = useState(null);
  const [isPhaseEditOpen, setIsPhaseEditOpen] = useState(false);
  const [phaseEditProjectId, setPhaseEditProjectId] = useState(null);
  const [isSetupEditOpen, setIsSetupEditOpen] = useState(false);
  const [setupEditProjectId, setSetupEditProjectId] = useState(null);
  const [taskModalInitialTab, setTaskModalInitialTab] = useState(null);

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
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ driveRootFolderId: '' });

  // User management modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditTarget, setUserEditTarget] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 알림 마지막 본 시각 (사용자별 localStorage)
  const notifKey = currentUser ? `eq_pms_notif_lastSeen_${currentUser.id}` : null;
  const [notifLastSeen, setNotifLastSeen] = useState(0);
  useEffect(() => {
    if (!notifKey) return;
    try {
      const v = Number(localStorage.getItem(notifKey)) || 0;
      setNotifLastSeen(v);
    } catch (_) { setNotifLastSeen(0); }
  }, [notifKey]);
  const handleMarkAllRead = () => {
    const now = Date.now();
    setNotifLastSeen(now);
    try { if (notifKey) localStorage.setItem(notifKey, String(now)); } catch (_) {}
  };

  // 알림 피드: 프로젝트별 nested 항목들 + 이슈를 통합하여 시간 역순 정렬
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const isCustomer = currentUser.role === 'CUSTOMER';
    const allowedIds = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
    const isProjectVisible = (pid) => !isCustomer || allowedIds.includes(pid);
    const items = [];
    (projects || []).forEach(p => {
      if (!isProjectVisible(p.id)) return;
      (p.notes || []).forEach(n => items.push({
        id: `note-${p.id}-${n.id}`,
        ts: Number(n.id) || 0,
        type: 'NOTE', projectId: p.id, projectName: p.name,
        author: n.author, title: '공유 노트',
        detail: n.text || '', date: n.date || ''
      }));
      (p.customerRequests || []).forEach(r => items.push({
        id: `req-${p.id}-${r.id}`,
        ts: Number(r.id) || 0,
        type: 'REQUEST', projectId: p.id, projectName: p.name,
        author: r.requester, title: `고객 요청 (${r.urgency || '-'})`,
        detail: r.content || '', date: r.date || '',
        requestId: r.id
      }));
      (p.asRecords || []).forEach(a => items.push({
        id: `as-${p.id}-${a.id}`,
        ts: Number(a.id) || 0,
        type: 'AS', projectId: p.id, projectName: p.name,
        author: a.engineer, title: `AS (${a.type || '-'})`,
        detail: a.description || '', date: a.date || '',
        asId: a.id
      }));
      (p.versions || []).forEach(v => items.push({
        id: `ver-${p.id}-${v.id}`,
        ts: Number(v.id) || 0,
        type: 'VERSION', projectId: p.id, projectName: p.name,
        author: v.author, title: `[${v.category || ''}] ${v.version || ''}`,
        detail: v.note || '', date: v.releaseDate || ''
      }));
      (p.trips || []).forEach(tr => items.push({
        id: `trip-${p.id}-${tr.id}`,
        ts: Number(tr.id) || 0,
        type: 'TRIP', projectId: p.id, projectName: p.name,
        author: tr.createdBy, title: `출장: ${tr.engineerName || ''}`,
        detail: `${tr.departureDate || ''} ~ ${tr.returnDate || ''}${tr.note ? ` · ${tr.note}` : ''}`,
        date: tr.createdAt || ''
      }));
      (p.extraTasks || []).forEach(et => items.push({
        id: `ext-${p.id}-${et.id}`,
        ts: Number(et.id) || 0,
        type: 'EXTRA', projectId: p.id, projectName: p.name,
        author: et.createdBy || et.requester, title: `추가 작업 (${et.type || '-'})`,
        detail: et.name || '', date: et.createdAt || ''
      }));
      (p.attachments || []).forEach(a => items.push({
        id: `att-${p.id}-${a.id}`,
        ts: Number(a.id) || 0,
        type: 'ATTACHMENT', projectId: p.id, projectName: p.name,
        author: a.uploadedBy, title: `참고자료: ${a.fileName || ''}`,
        detail: a.uploadedAt || '', date: a.uploadedAt || ''
      }));
    });
    // 이슈
    const visibleIssues = isCustomer
      ? (issues || []).filter(i => allowedIds.includes(i.projectId))
      : (issues || []);
    visibleIssues.forEach(i => {
      const ts = i.date ? new Date(i.date).getTime() : 0;
      items.push({
        id: `iss-${i.id}`,
        ts: isNaN(ts) ? 0 : ts,
        type: 'ISSUE', projectId: i.projectId, projectName: i.projectName,
        author: i.author, title: `이슈 (${i.severity || '-'})`,
        detail: i.title || '', date: i.date || '',
        issue: i
      });
    });
    items.sort((a, b) => b.ts - a.ts);
    return items.slice(0, 50);
  }, [projects, issues, currentUser]);

  // 앱 시작 시 Google Sheets에서 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await loadFromGoogleDB();
      if (data) {
        // GAS에서 빈 셀/문자열로 와도 forEach 가능하도록 배열 필드 정규화
        const ensureArr = (v) => {
          if (Array.isArray(v)) return v;
          if (typeof v === 'string' && v.trim().startsWith('[')) {
            try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch (_) {}
          }
          return [];
        };
        const PROJECT_ARRAYS = ['tasks', 'checklist', 'activityLog', 'managerHistory', 'trips', 'extraTasks', 'asRecords', 'customerRequests', 'notes', 'versions', 'phases', 'attachments', 'equipments'];
        const sanitizeProject = (p) => {
          const next = { ...p };
          PROJECT_ARRAYS.forEach(f => { next[f] = ensureArr(next[f]); });
          return next;
        };
        // 마이그레이션 + 배열 정규화
        const migratedProjects = (data.projects || []).map(p => {
          const sp = sanitizeProject(p);
          // phase 마이그레이션
          if (sp.status === '완료' && (typeof sp.phaseIndex !== 'number' || sp.phaseIndex === 6)) {
            sp.phaseIndex = PHASE_COMPLETED_INDEX;
          }
          // 버전 마이그레이션: 기존 hw/sw/fwVersion 단일 필드 → versions 배열
          if (sp.versions.length === 0) {
            const seeds = [];
            if (p.hwVersion) seeds.push({ id: Date.now() + Math.random(), category: 'HW', version: p.hwVersion, releaseDate: '', note: '(마이그레이션)', author: '' });
            if (p.swVersion) seeds.push({ id: Date.now() + Math.random() + 1, category: 'SW', version: p.swVersion, releaseDate: '', note: '(마이그레이션)', author: '' });
            if (p.fwVersion) seeds.push({ id: Date.now() + Math.random() + 2, category: 'FW', version: p.fwVersion, releaseDate: '', note: '(마이그레이션)', author: '' });
            sp.versions = seeds;
          }
          // phases 마이그레이션: phaseIndex (숫자) → phases 배열 + currentPhaseId
          if (sp.phases.length === 0) {
            sp.phases = PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
          }
          // currentPhaseId가 없으면 phaseIndex 기준으로 매핑
          if (!sp.currentPhaseId) {
            const idx = typeof sp.phaseIndex === 'number' ? sp.phaseIndex : 0;
            sp.currentPhaseId = (sp.phases[idx] || sp.phases[0]).id;
          }
          return sp;
        });
        setProjects(migratedProjects);
        // 이슈 comments 정규화
        // (아래 setIssues 호출 직전에 처리)
        setIssues((data.issues || []).map(i => ({ ...i, comments: ensureArr(i.comments) })));
        setReleases(data.releases || []);
        // 엔지니어 자격 데이터 마이그레이션 (단일 필드 → 배열) + 배열 정규화
        const ENG_ARRAYS = ['badges', 'safetyTrainings', 'visas', 'assignedProjectIds'];
        const migratedEngineers = (data.engineers || []).map(e => {
          const next = { ...e };
          ENG_ARRAYS.forEach(f => { next[f] = ensureArr(next[f]); });
          // 빈 배열일 때만 단일 필드 → 배열 마이그레이션
          if (next.badges.length === 0 && e.accessExpiry) {
            next.badges = [{ id: Date.now() + Math.random(), issuer: '출입증', expiry: e.accessExpiry, note: '' }];
          }
          if (next.safetyTrainings.length === 0 && e.safetyExpiry) {
            next.safetyTrainings = [{ id: Date.now() + Math.random(), issuer: '기본 안전교육', expiry: e.safetyExpiry, note: '' }];
          }
          if (next.visas.length === 0 && (e.visaType || e.visaExpiry || (e.visaStatus && e.visaStatus !== '미해당'))) {
            next.visas = [{
              id: Date.now() + Math.random(),
              country: '',
              type: e.visaType || '',
              status: e.visaStatus || '미해당',
              expiry: e.visaExpiry || '',
              note: ''
            }];
          }
          return next;
        });
        setEngineers(migratedEngineers);
        setParts(data.parts || []);
        // 사이트 customSpecs 배열 정규화 (GAS에서 빈셀/문자열로 와도 안전)
        const normalizedSites = (data.sites || []).map(s => ({
          ...s,
          customSpecs: ensureArr(s.customSpecs)
        }));
        setSites(normalizedSites);
        // 시스템 설정 로드 (Settings 시트가 비어있으면 기본값)
        if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          setSettings({ driveRootFolderId: '', ...data.settings });
        }
        const loadedUsers = Array.isArray(data.users) ? data.users : [];
        if (loadedUsers.length === 0) {
          // 시드: TEST_MODE면 4개 권한별 계정, 아니면 관리자 1명
          const nowIso = new Date().toISOString();
          const seed = TEST_MODE
            ? SEED_TEST_USERS.map(u => ({ ...u, createdAt: nowIso }))
            : [{ ...SEED_ADMIN, createdAt: nowIso }];
          setUsers(seed);
          saveToGoogleDB('UPDATE_USERS', seed);
        } else {
          setUsers(loadedUsers);
        }
      } else {
        // GAS 미연결 / 로드 실패 시에도 시드 계정으로 진입은 가능하게
        const nowIso = new Date().toISOString();
        setUsers(TEST_MODE
          ? SEED_TEST_USERS.map(u => ({ ...u, createdAt: nowIso }))
          : [{ ...SEED_ADMIN, createdAt: nowIso }]);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Login guard
  const handleLoginSuccess = (user) => {
    const stamped = { ...user, lastLoginAt: new Date().toISOString() };
    setCurrentUser(stamped);
    const updatedList = users.map(u => u.id === stamped.id ? { ...u, lastLoginAt: stamped.lastLoginAt } : u);
    setUsers(updatedList);
    saveToGoogleDB('UPDATE_USERS', updatedList);
    if (user.mustChangePassword) {
      setForcePasswordChange(true);
      setIsPasswordModalOpen(true);
    }
  };

  if (!currentUser) return (
    <Suspense fallback={<Loading />}>
      <LoginScreen users={users} onLogin={handleLoginSuccess} lang={lang} setLang={setLang} t={t} />
    </Suspense>
  );

  // Helpers
  const handleLogout = () => { setCurrentUser(null); setActiveTab('dashboard'); };
  // 프로젝트 클릭 → 프로젝트 관리 탭으로 이동 + 상세 모달 오픈
  // tab 인자를 주면 해당 모달 탭으로 직접 진입 (예: 'notes', 'as', 'requests')
  const openProjectDetail = (projectId, tab = null) => {
    setSelectedProjectId(projectId);
    setActiveTab('projects');
    setTaskModalInitialTab(tab);
    setIsTaskModalOpen(true);
  };

  // 알림 클릭 시 점프 — 이슈는 IssueDetailModal, 그 외는 프로젝트 상세 모달의 적절한 탭
  const NOTIF_TAB_MAP = {
    NOTE: 'notes',
    ATTACHMENT: 'attachments',
    REQUEST: 'requests',
    AS: 'as',
    EXTRA: 'extras',
    VERSION: null,
    TRIP: null
  };
  const handleNotificationJump = (n) => {
    if (!n) return;
    if (n.type === 'ISSUE' && n.issue) {
      setSelectedIssue(n.issue);
      setIsIssueDetailModalOpen(true);
      return;
    }
    if (n.projectId) {
      const tab = NOTIF_TAB_MAP[n.type] || null;
      openProjectDetail(n.projectId, tab);
    }
  };
  const generateUniqueId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };
  const addLog = (project, type, detail) => ({
    ...project,
    activityLog: [...(project.activityLog || []), { date: new Date().toLocaleString(), user: currentUser.name, type, detail }]
  });

  // === 헬퍼: state 변경 후 전체 배열을 GAS에 덮어쓰기 ===
  const syncProjects = (updated) => { setProjects(updated); saveToGoogleDB('UPDATE_PROJECTS', updated); };
  const syncIssues = (updated) => { setIssues(updated); saveToGoogleDB('UPDATE_ISSUES', updated); };
  const syncReleases = (updated) => { setReleases(updated); saveToGoogleDB('UPDATE_RELEASES', updated); };
  const syncEngineers = (updated) => { setEngineers(updated); saveToGoogleDB('UPDATE_ENGINEERS', updated); };
  const syncParts = (updated) => { setParts(updated); saveToGoogleDB('UPDATE_PARTS', updated); };
  const syncSites = (updated) => { setSites(updated); saveToGoogleDB('UPDATE_SITES', updated); };
  const syncUsers = (updated) => { setUsers(updated); saveToGoogleDB('UPDATE_USERS', updated); };
  const syncSettings = async (updated) => {
    setSettings(updated);
    await saveToGoogleDB('UPDATE_SETTINGS', updated);
  };

  // === 사용자 관리 핸들러 ===
  const handleSubmitUser = (payload, isEdit) => {
    if (isEdit) {
      const updated = users.map(u => u.id === payload.id ? { ...u, ...payload } : u);
      syncUsers(updated);
      // 본인 계정 수정 시 currentUser 동기화
      if (currentUser && currentUser.id === payload.id) {
        setCurrentUser({ ...currentUser, ...payload });
      }
      showToast(t('사용자 정보가 수정되었습니다.', 'User updated.'));
    } else {
      syncUsers([...users, { ...payload, createdAt: payload.createdAt || new Date().toISOString() }]);
      showToast(t('사용자가 추가되었습니다.', 'User added.'));
    }
    setIsUserModalOpen(false);
    setUserEditTarget(null);
  };

  const handleResetUserPassword = async (user) => {
    const tempPw = 'temp' + Math.floor(1000 + Math.random() * 9000);
    const hashed = await hashPassword(tempPw);
    const updated = users.map(u => u.id === user.id ? { ...u, pw: hashed, mustChangePassword: true } : u);
    syncUsers(updated);
    showToast(t(`${user.id}의 임시 비밀번호: ${tempPw} (사용자에게 전달 후 변경 안내)`, `Temp password for ${user.id}: ${tempPw}`));
  };

  const handleToggleUserActive = (user) => {
    const updated = users.map(u => u.id === user.id ? { ...u, active: u.active === false } : u);
    syncUsers(updated);
    showToast(t('계정 상태가 변경되었습니다.', 'Account status changed.'));
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    if (currentUser && currentUser.id === userToDelete.id) { setUserToDelete(null); return; }
    syncUsers(users.filter(u => u.id !== userToDelete.id));
    setUserToDelete(null);
    showToast(t('사용자가 삭제되었습니다.', 'User deleted.'));
  };

  const handleChangeMyPassword = (newHashedPw) => {
    const updatedUser = { ...currentUser, pw: newHashedPw, mustChangePassword: false };
    setCurrentUser(updatedUser);
    syncUsers(users.map(u => u.id === currentUser.id ? { ...u, pw: newHashedPw, mustChangePassword: false } : u));
    setIsPasswordModalOpen(false);
    setForcePasswordChange(false);
    showToast(t('비밀번호가 변경되었습니다.', 'Password updated.'));
  };

  // === CRUD Handlers ===

  const handleAddProject = (newProject) => {
    const domainTasks = DOMAIN_TASKS[newProject.domain] || DOMAIN_TASKS['반도체'];
    const domainChecklist = DOMAIN_CHECKLIST[newProject.domain] || DOMAIN_CHECKLIST['반도체'];
    const tasks = JSON.parse(JSON.stringify(domainTasks));
    const checklist = domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx }));
    const newData = addLog({
      ...newProject,
      id: generateUniqueId('PRJ'),
      tasks, checklist,
      signOff: null,
      activityLog: [], managerHistory: [],
      trips: [], extraTasks: [], asRecords: [], customerRequests: [], notes: [], attachments: []
    }, 'PROJECT_CREATE', `프로젝트 생성: ${newProject.name}`);
    syncProjects([newData, ...projects]);
    setIsProjectModalOpen(false);
    showToast('프로젝트가 추가되었습니다.');
  };

  const handleUpdatePhase = (projectId, newPhaseIndex) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      const targetIdx = Math.max(0, Math.min(newPhaseIndex, phases.length - 1));
      const fromIdx = typeof p.phaseIndex === 'number' ? p.phaseIndex : 0;
      const fromName = (phases[fromIdx] || phases[0]).name;
      const toName = phases[targetIdx].name;
      // 진짜 완료 = 마지막 단계
      const isLast = targetIdx === phases.length - 1;
      const newStatus = isLast ? '완료' : '진행중';
      return addLog({ ...p, phases, phaseIndex: targetIdx, currentPhaseId: phases[targetIdx].id, status: newStatus }, 'PHASE_CHANGE', `${fromName} → ${toName}`);
    }));
  };

  // 셋업 파이프라인 클릭 — 클릭한 task를 "현재(미완료)"로, 이전은 모두 완료, 이후는 모두 미완료
  const handleSetCurrentSetupTask = (projectId, taskId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const list = p.tasks || [];
      const idx = list.findIndex(tk => tk.id === taskId);
      if (idx < 0) return p;
      const target = list[idx];
      const newTasks = list.map((tk, i) => ({ ...tk, isCompleted: i < idx }));
      return addLog({ ...p, tasks: newTasks }, 'SETUP_PROGRESS', `현재 셋업 작업: ${target.name}`);
    }));
  };

  // 셋업 작업 일괄 편집 (이름·일정·마일스톤·완료·순서·추가·삭제 한번에)
  const handleSetProjectTasks = (projectId, nextTasks) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const prev = p.tasks || [];
      const prevIds = new Set(prev.map(t => t.id));
      const nextIds = new Set(nextTasks.map(t => t.id));
      const added = nextTasks.filter(t => !prevIds.has(t.id)).length;
      const removed = prev.filter(t => !nextIds.has(t.id)).length;
      const modified = nextTasks.filter(t => {
        const old = prev.find(o => o.id === t.id);
        if (!old) return false;
        return old.name !== t.name || (old.startDate || '') !== (t.startDate || '') || (old.endDate || '') !== (t.endDate || '') || !!old.isMilestone !== !!t.isMilestone || !!old.isCompleted !== !!t.isCompleted;
      }).length;
      const summary = `셋업 일정 편집: 추가 ${added} · 수정 ${modified} · 삭제 ${removed}`;
      return addLog({ ...p, tasks: nextTasks }, 'SETUP_DEFINE', summary);
    }));
  };

  // 프로젝트 단계 정의 자체 편집 (이름 변경/추가/삭제/순서)
  const handleSetProjectPhases = (projectId, nextPhases) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      // currentPhaseId가 없어진 경우 안전 처리
      let curIdx = nextPhases.findIndex(ph => ph.id === p.currentPhaseId);
      if (curIdx < 0) curIdx = Math.min(p.phaseIndex || 0, nextPhases.length - 1);
      const isLast = curIdx === nextPhases.length - 1;
      return addLog({
        ...p,
        phases: nextPhases,
        phaseIndex: curIdx,
        currentPhaseId: nextPhases[curIdx]?.id || null,
        status: isLast ? '완료' : (p.status === '완료' ? '진행중' : p.status)
      }, 'PHASE_DEFINE', `단계 정의 변경: ${nextPhases.map(x => x.name).join(' → ')}`);
    }));
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    syncProjects(projects.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null);
    showToast('프로젝트가 삭제되었습니다.');
  };

  const toggleTaskCompletion = (projectId, taskId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const task = p.tasks.find(t => t.id === taskId);
      if (!task) return p;
      const updated = { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) };
      return !task.isCompleted ? addLog(updated, 'TASK_COMPLETE', `태스크 완료: ${task.name}`) : updated;
    }));
  };

  const handleAddTask = (projectId, taskName) => {
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, tasks: [...p.tasks, { id: Date.now(), name: taskName, isCompleted: false, delayReason: '' }] }, 'TASK_ADD', `태스크 추가: ${taskName}`)));
  };

  const handleEditTaskName = (projectId, taskId, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const task = (p.tasks || []).find(tk => tk.id === taskId);
      if (!task || task.name === trimmed) return p;
      const updated = { ...p, tasks: p.tasks.map(tk => tk.id === taskId ? { ...tk, name: trimmed } : tk) };
      return addLog(updated, 'TASK_RENAME', `태스크 이름 변경: ${task.name} → ${trimmed}`);
    }));
  };

  const handleDeleteTask = (projectId, taskId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const task = p.tasks.find(t => t.id === taskId);
      return addLog({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) }, 'TASK_DELETE', `태스크 삭제: ${task?.name || ''}`);
    }));
  };

  const handleUpdateDelayReason = (projectId, taskId, reason) => {
    syncProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, delayReason: reason } : t) } : p));
  };

  const handleUpdateTaskDates = (projectId, taskId, changes) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const task = (p.tasks || []).find(tk => tk.id === taskId);
      if (!task) return p;
      const updated = { ...p, tasks: p.tasks.map(tk => tk.id === taskId ? { ...tk, ...changes } : tk) };
      // 변경 항목만 추출
      const parts = [];
      if ('startDate' in changes && (changes.startDate || '') !== (task.startDate || '')) {
        parts.push(`시작 ${task.startDate || '미정'} → ${changes.startDate || '미정'}`);
      }
      if ('endDate' in changes && (changes.endDate || '') !== (task.endDate || '')) {
        parts.push(`종료 ${task.endDate || '미정'} → ${changes.endDate || '미정'}`);
      }
      // 마일스톤 토글만 들어온 단일 변경은 별도 타입으로 분리해 가독성 ↑
      if ('isMilestone' in changes && Object.keys(changes).length === 1) {
        if (!!changes.isMilestone === !!task.isMilestone) return updated;
        return addLog(updated, 'TASK_MILESTONE', `마일스톤 ${changes.isMilestone ? 'ON' : 'OFF'}: ${task.name}`);
      }
      if ('isMilestone' in changes && !!changes.isMilestone !== !!task.isMilestone) {
        parts.push(`마일스톤 ${changes.isMilestone ? 'ON' : 'OFF'}`);
      }
      if (parts.length === 0) return updated;
      return addLog(updated, 'TASK_DATES', `일정 변경 [${task.name}] · ${parts.join(' · ')}`);
    }));
  };

  const handleUpdateChecklistItem = (projectId, itemId, newStatus, newNote) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const item = p.checklist.find(c => c.id === itemId);
      const updated = { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, status: newStatus, note: newNote !== undefined ? newNote : c.note } : c) };
      if (item && item.status !== newStatus) return addLog(updated, 'CHECKLIST_CHANGE', `${item.task}: ${item.status} → ${newStatus}`);
      return updated;
    }));
  };

  const handleLoadDefaultChecklist = (projectId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const domainChecklist = DOMAIN_CHECKLIST[p.domain] || DOMAIN_CHECKLIST['반도체'];
      return addLog({ ...p, checklist: domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx })) }, 'CHECKLIST_CHANGE', '기본 검수표 로드');
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
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      // 워런티 단계 = 마지막 직전 (없으면 마지막 -1, 그래도 없으면 마지막)
      const warrantyIdx = Math.max(0, phases.length - 2);
      return addLog({ ...p, status: '진행중', phaseIndex: warrantyIdx, currentPhaseId: phases[warrantyIdx]?.id, signOff: { signed: true, customerName, signatureData, date: todayStr } }, 'SIGN_OFF', `고객 서명 완료: ${customerName} (${phases[warrantyIdx]?.name || ''} 단계 진입)`);
    }));
    showToast('최종 검수 서명 완료. 워런티 단계로 진입했습니다.');
  };

  // 사인 취소 (ADMIN 전용)
  const handleCancelSignOff = (projectId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const prev = p.signOff;
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      // 워런티/완료 단계였다면 그 직전(현장 셋업)으로 복귀, 그 외엔 유지
      const warrantyIdx = Math.max(0, phases.length - 2);
      const rollbackIdx = (typeof p.phaseIndex === 'number' && p.phaseIndex >= warrantyIdx) ? Math.max(0, warrantyIdx - 1) : p.phaseIndex;
      return addLog({ ...p, signOff: null, status: '진행중', phaseIndex: rollbackIdx, currentPhaseId: phases[rollbackIdx]?.id }, 'SIGN_CANCEL', `검수 사인 취소 (이전 검수자: ${prev?.customerName || '-'})`);
    }));
    showToast('검수 사인이 취소되었습니다.');
  };

  // === 추가 대응 작업 (검수 후 고객 요청 기반) 핸들러 ===
  const handleAddExtraTask = (projectId, payload) => {
    const task = {
      id: Date.now(),
      name: payload.name,
      requester: payload.requester || '',
      type: payload.type || '기능 추가',
      status: '대기',
      startDate: payload.startDate || '',
      endDate: payload.endDate || '',
      note: payload.note || '',
      createdAt: new Date().toLocaleString(),
      createdBy: currentUser.name
    };
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, extraTasks: [...(p.extraTasks || []), task] }, 'EXTRA_ADD', `추가 작업 등록: ${task.name} (${task.type})`)));
  };

  const handleUpdateExtraTask = (projectId, taskId, updates) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const updated = { ...p, extraTasks: (p.extraTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t) };
      if (updates.status) {
        const task = (p.extraTasks || []).find(t => t.id === taskId);
        return addLog(updated, 'EXTRA_UPDATE', `추가 작업 상태: ${task?.name || ''} → ${updates.status}`);
      }
      return updated;
    }));
  };

  const handleDeleteExtraTask = (projectId, taskId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const task = (p.extraTasks || []).find(t => t.id === taskId);
      return addLog({ ...p, extraTasks: (p.extraTasks || []).filter(t => t.id !== taskId) }, 'EXTRA_DELETE', `추가 작업 삭제: ${task?.name || ''}`);
    }));
  };

  const handleAddIssue = (newIssue) => {
    const selectedProject = projects.find(p => p.id === newIssue.projectId);
    const issueWithDetails = { ...newIssue, id: generateUniqueId('ISS'), projectName: selectedProject ? selectedProject.name : '알 수 없는 프로젝트', date: TODAY.toISOString().split('T')[0], status: '이슈 확인', comments: [] };
    syncIssues([issueWithDetails, ...issues]);
    syncProjects(projects.map(p => p.id !== newIssue.projectId ? p : addLog(p, 'ISSUE_ADD', `이슈 등록: ${issueWithDetails.title} (${newIssue.severity})`)));
    setIsIssueModalOpen(false);
    const targetEmail = newIssue.alertEmail ? newIssue.alertEmail : '기본 담당자(default@company.com)';
    // 이메일 제목용 구조화된 데이터 전송
    notifyWebhook(
      `신규 이슈 등록\n프로젝트: ${issueWithDetails.projectName}\n이슈: ${issueWithDetails.title}\n중요도: ${newIssue.severity}\n작성자: ${newIssue.author}\n수신자: ${targetEmail}`,
      'ISSUE',
      { projectName: issueWithDetails.projectName, issueTitle: issueWithDetails.title, severity: newIssue.severity, targetEmail }
    );
    showToast(`이슈 등록 완료. [${targetEmail}]로 알림이 전송되었습니다.`);
  };

  const handleAddComment = (issueId, text) => {
    const commentData = { id: Date.now(), author: currentUser.name, text, date: new Date().toLocaleString() };
    syncIssues(issues.map(issue => issue.id === issueId ? { ...issue, comments: [...(issue.comments || []), commentData] } : issue));
  };

  const handleUpdateIssueStatus = (issueId, newStatus) => {
    syncIssues(issues.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
  };

  // ADMIN 전용: 이슈 제목/담당자(작성자) 수정 + 이력 기록
  const handleUpdateIssue = (issueId, updates, changeSummary) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      showToast(t('관리자만 수정할 수 있습니다.', 'Admin only.'));
      return;
    }
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;
    syncIssues(issues.map(i => i.id === issueId ? { ...i, ...updates } : i));
    if (changeSummary && issue.projectId) {
      syncProjects(projects.map(p => p.id !== issue.projectId ? p : addLog(p, 'ISSUE_UPDATE', changeSummary)));
    }
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
    syncProjects(projects.map(p => p.id !== newPart.projectId ? p : addLog(p, 'PART_ADD', `자재 청구: ${newPart.partName} ${newPart.quantity}EA (${newPart.urgency})`)));
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

  const handleChangeManager = (projectId, newManager, reason) => {
    if (!newManager) return;
    const todayStr = new Date().toISOString().split('T')[0];
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const fromManager = p.manager || '미지정';
      const historyEntry = { from: fromManager, to: newManager, date: todayStr, reason, changedBy: currentUser.name };
      return addLog({ ...p, manager: newManager, managerHistory: [...(p.managerHistory || []), historyEntry] }, 'MANAGER_CHANGE', `${fromManager} → ${newManager}${reason ? ' (' + reason + ')' : ''}`);
    }));
    setIsManagerModalOpen(false);
    showToast(t('담당자가 변경되었습니다.', 'Manager changed.'));
  };

  // === 고객 요청사항 핸들러 ===
  const handleAddCustomerRequest = (projectId, data) => {
    const request = { id: Date.now(), requester: data.requester, content: data.content, urgency: data.urgency, status: '접수', date: new Date().toLocaleString(), responses: [] };
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, customerRequests: [...(p.customerRequests || []), request] }, 'REQUEST_ADD', `고객 요청: ${data.requester} - ${data.content.substring(0, 30)}${data.content.length > 30 ? '...' : ''}`)));
  };

  const handleUpdateCustomerRequestStatus = (projectId, requestId, newStatus, resolution) => {
    const todayStr = new Date().toLocaleString();
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const updated = {
        ...p,
        customerRequests: (p.customerRequests || []).map(r => {
          if (r.id !== requestId) return r;
          const next = { ...r, status: newStatus };
          if (typeof resolution === 'string') {
            next.resolution = resolution;
            next.resolvedBy = currentUser.name;
            next.resolvedAt = todayStr;
          }
          return next;
        })
      };
      const req = p.customerRequests.find(r => r.id === requestId);
      const detail = resolution
        ? `고객 요청 상태: ${req?.content.substring(0, 20) || ''} → ${newStatus} (처리: ${resolution})`
        : `고객 요청 상태: ${req?.content.substring(0, 20) || ''} → ${newStatus}`;
      return addLog(updated, 'REQUEST_STATUS', detail);
    }));
  };

  const handleAddCustomerResponse = (projectId, requestId, text) => {
    const response = { author: currentUser.name, text, date: new Date().toLocaleString() };
    syncProjects(projects.map(p => p.id !== projectId ? p : {
      ...p,
      customerRequests: (p.customerRequests || []).map(r => r.id === requestId ? { ...r, responses: [...(r.responses || []), response] } : r)
    }));
  };

  const handleDeleteCustomerRequest = (projectId, requestId) => {
    syncProjects(projects.map(p => p.id !== projectId ? p : { ...p, customerRequests: (p.customerRequests || []).filter(r => r.id !== requestId) }));
  };

  // === 엔지니어 자격(출입증/안전교육/비자) 핸들러 ===
  // category: 'badges' | 'safetyTrainings' | 'visas'
  const handleAddCertificate = (engineerId, category, payload) => {
    syncEngineers(engineers.map(e => {
      if (e.id !== engineerId) return e;
      const list = Array.isArray(e[category]) ? e[category] : [];
      const item = { id: Date.now(), ...payload };
      return { ...e, [category]: [...list, item] };
    }));
  };
  const handleUpdateCertificate = (engineerId, category, itemId, updates) => {
    syncEngineers(engineers.map(e => {
      if (e.id !== engineerId) return e;
      const list = Array.isArray(e[category]) ? e[category] : [];
      return { ...e, [category]: list.map(it => it.id === itemId ? { ...it, ...updates } : it) };
    }));
  };
  const handleDeleteCertificate = (engineerId, category, itemId) => {
    syncEngineers(engineers.map(e => {
      if (e.id !== engineerId) return e;
      const list = Array.isArray(e[category]) ? e[category] : [];
      return { ...e, [category]: list.filter(it => it.id !== itemId) };
    }));
  };

  // === 엔지니어 ↔ 프로젝트 배정 토글 ===
  const handleToggleEngineerAssignment = (engineerId, projectId) => {
    syncEngineers(engineers.map(e => {
      if (e.id !== engineerId) return e;
      const ids = Array.isArray(e.assignedProjectIds) ? e.assignedProjectIds : [];
      const next = ids.includes(projectId) ? ids.filter(x => x !== projectId) : [...ids, projectId];
      return { ...e, assignedProjectIds: next };
    }));
  };

  // === 출장 일정 핸들러 ===
  const handleAddTrip = (projectId, payload) => {
    const trip = {
      id: Date.now(),
      engineerId: payload.engineerId,
      engineerName: (engineers.find(e => e.id === payload.engineerId) || {}).name || '',
      departureDate: payload.departureDate,
      returnDate: payload.returnDate,
      note: payload.note || '',
      createdAt: new Date().toLocaleString(),
      createdBy: currentUser.name
    };
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, trips: [...(p.trips || []), trip] }, 'TRIP_ADD', `출장 등록: ${trip.engineerName} (${trip.departureDate}~${trip.returnDate})`)));
  };

  const handleUpdateTrip = (projectId, tripId, updates, changeSummary) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const next = { ...p, trips: (p.trips || []).map(tr => tr.id === tripId ? { ...tr, ...updates } : tr) };
      return changeSummary ? addLog(next, 'TRIP_UPDATE', changeSummary) : next;
    }));
  };

  const handleDeleteTrip = (projectId, tripId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const trip = (p.trips || []).find(tr => tr.id === tripId);
      return addLog({ ...p, trips: (p.trips || []).filter(tr => tr.id !== tripId) }, 'TRIP_DELETE', `출장 삭제: ${trip?.engineerName || ''} (${trip?.departureDate || ''}~${trip?.returnDate || ''})`);
    }));
  };

  // === AS 핸들러 ===
  const handleAddAS = (projectId, data) => {
    const record = { id: Date.now(), type: data.type, engineer: data.engineer, description: data.description, resolution: data.resolution || '', status: '접수', date: new Date().toLocaleString() };
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, asRecords: [...(p.asRecords || []), record] }, 'AS_ADD', `AS 등록 (${data.type}): ${data.description.substring(0, 30)}${data.description.length > 30 ? '...' : ''}`)));
  };

  const handleUpdateAS = (projectId, asId, updates) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const updated = { ...p, asRecords: (p.asRecords || []).map(a => a.id === asId ? { ...a, ...updates } : a) };
      if (updates.status) {
        const as = p.asRecords.find(a => a.id === asId);
        return addLog(updated, 'AS_UPDATE', `AS 상태: ${as?.type || ''} → ${updates.status}`);
      }
      return updated;
    }));
  };

  const handleDeleteAS = (projectId, asId) => {
    syncProjects(projects.map(p => p.id !== projectId ? p : { ...p, asRecords: (p.asRecords || []).filter(a => a.id !== asId) }));
  };

  const handleEditProject = (projectId, data) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const changes = [];
      const fmtDate = (v) => v || '미정';
      if (data.domain !== undefined && p.domain !== data.domain) {
        if (currentUser.role !== 'ADMIN') {
          showToast(t('산업군은 관리자만 수정할 수 있습니다.', 'Domain can only be changed by admin.'));
          return p;
        }
        changes.push(`산업군: ${p.domain} → ${data.domain}`);
      }
      if (p.name !== data.name) changes.push(`이름: ${p.name} → ${data.name}`);
      if (p.customer !== data.customer) changes.push(`고객사: ${p.customer} → ${data.customer}`);
      if (p.site !== data.site) changes.push(`사이트: ${p.site} → ${data.site}`);
      if (p.startDate !== data.startDate) changes.push(`시작일: ${fmtDate(p.startDate)} → ${fmtDate(data.startDate)}`);
      if (p.dueDate !== data.dueDate) changes.push(`납기일: ${fmtDate(p.dueDate)} → ${fmtDate(data.dueDate)}`);
      if (data.voltage !== undefined && (p.voltage || '') !== (data.voltage || '')) changes.push(`전압: ${p.voltage || '-'} → ${data.voltage || '-'}`);
      if (data.current !== undefined && (p.current || '') !== (data.current || '')) changes.push(`전류: ${p.current || '-'} → ${data.current || '-'}`);
      if (data.spec !== undefined && (p.spec || '') !== (data.spec || '')) changes.push(`사양: ${p.spec || '-'} → ${data.spec || '-'}`);
      if (data.equipments !== undefined) {
        const before = Array.isArray(p.equipments) ? p.equipments : [];
        const after = Array.isArray(data.equipments) ? data.equipments : [];
        if (before.length !== after.length) {
          changes.push(`장비: ${before.length}대 → ${after.length}대`);
        } else {
          const sig = (a) => a.map(x => `${x.code}|${x.name || ''}|${x.note || ''}`).join(',');
          if (sig(before) !== sig(after)) changes.push(`장비 코드 수정 (${after.length}대)`);
        }
      }
      const updated = { ...p, ...data };
      return changes.length > 0 ? addLog(updated, 'PROJECT_EDIT', `프로젝트 수정: ${changes.join(', ')}`) : updated;
    }));
    setIsProjectEditOpen(false);
    showToast(t('프로젝트 정보가 수정되었습니다.', 'Project updated.'));
  };

  // === 새 다중 버전 핸들러 ===
  const handleAddVersion = (projectId, payload) => {
    const entry = {
      id: Date.now(),
      category: payload.category,
      version: payload.version,
      releaseDate: payload.releaseDate || new Date().toISOString().split('T')[0],
      note: payload.note || '',
      author: currentUser.name
    };
    syncProjects(projects.map(p => p.id !== projectId ? p : addLog({ ...p, versions: [...(p.versions || []), entry] }, 'VERSION_CHANGE', `[${entry.category}] ${entry.version}${entry.note ? ` — ${entry.note}` : ''}`)));
  };
  const handleUpdateVersion = (projectId, versionId, updates) => {
    syncProjects(projects.map(p => p.id !== projectId ? p : { ...p, versions: (p.versions || []).map(v => v.id === versionId ? { ...v, ...updates } : v) }));
  };
  const handleDeleteVersion = (projectId, versionId) => {
    syncProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const v = (p.versions || []).find(x => x.id === versionId);
      return addLog({ ...p, versions: (p.versions || []).filter(x => x.id !== versionId) }, 'VERSION_DELETE', `[${v?.category || ''}] ${v?.version || ''} 삭제`);
    }));
  };

  // === 참고자료(첨부) — Google Drive 업로드 ===
  // GAS 6MB 요청 한도 → 단일 파일 18MB 정도까지가 안전 (base64로 33% 부풀어짐)
  const ATTACHMENT_MAX_BYTES = 18 * 1024 * 1024;
  // category: '명세서' | '도면' | '기타' (기본 '기타'). 회의록은 handleAddNoteWithFile에서 '회의록'으로 호출.
  const handleUploadAttachment = async (projectId, file, onProgress, category) => {
    if (!settings.driveRootFolderId) {
      showToast(t('Drive 루트 폴더가 설정되지 않았습니다. 시스템 설정에서 등록하세요.', 'Drive root folder not configured. Please set it in System Settings.'));
      return null;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      showToast(t(`파일이 너무 큽니다 (최대 ${Math.floor(ATTACHMENT_MAX_BYTES/1024/1024)}MB). 큰 파일은 Drive에 직접 업로드 후 링크를 사용하세요.`, `File too large (max ${Math.floor(ATTACHMENT_MAX_BYTES/1024/1024)}MB).`));
      return null;
    }
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;
    const cat = category || '기타';
    if (onProgress) onProgress({ stage: 'encoding', percent: 10 });
    const base64 = await fileToBase64(file);
    if (onProgress) onProgress({ stage: 'uploading', percent: 50 });
    const result = await callGoogleAction('UPLOAD_FILE', {
      projectId, customer: project.customer, projectName: project.name,
      fileName: file.name, mimeType: file.type || 'application/octet-stream',
      base64, category: cat
    });
    if (!result || result.status !== 'success' || !result.file) {
      showToast(t('업로드 실패: ', 'Upload failed: ') + (result?.message || ''));
      if (onProgress) onProgress({ stage: 'error', percent: 0 });
      return null;
    }
    const f = result.file;
    const attachment = {
      id: Date.now(),
      fileId: f.fileId,
      fileName: f.fileName,
      mimeType: f.mimeType,
      size: f.size,
      viewUrl: f.viewUrl,
      downloadUrl: f.downloadUrl,
      folderUrl: f.folderUrl,
      categoryFolderUrl: f.categoryFolderUrl,
      category: f.category || cat,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toLocaleString()
    };
    // 회의록 카테고리는 별도 흐름이 부르므로 attachments에 넣지 않고 그대로 반환
    if (cat === '회의록') {
      if (onProgress) onProgress({ stage: 'done', percent: 100 });
      return attachment;
    }
    // 여러 파일 연속 업로드 시 stale closure 방지 — 함수형 setState로 최신 상태 읽기
    setProjects(prev => {
      const next = prev.map(p => p.id !== projectId ? p : addLog({ ...p, attachments: [...(p.attachments || []), attachment] }, 'ATTACH_ADD', `${cat} 업로드: ${attachment.fileName}`));
      saveToGoogleDB('UPDATE_PROJECTS', next);
      return next;
    });
    if (onProgress) onProgress({ stage: 'done', percent: 100 });
    showToast(t('업로드 완료', 'Upload complete'));
    return attachment;
  };

  const handleDeleteAttachment = async (projectId, attachmentId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const target = (project.attachments || []).find(a => a.id === attachmentId);
    if (!target) return;
    // Drive 휴지통으로 이동 (실패해도 메타데이터는 삭제)
    if (target.fileId) {
      await callGoogleAction('DELETE_FILE', { fileId: target.fileId });
    }
    setProjects(prev => {
      const next = prev.map(p => p.id !== projectId ? p : addLog({ ...p, attachments: (p.attachments || []).filter(a => a.id !== attachmentId) }, 'ATTACH_DELETE', `참고자료 삭제: ${target.fileName}`));
      saveToGoogleDB('UPDATE_PROJECTS', next);
      return next;
    });
    showToast(t('참고자료가 삭제되었습니다.', 'Attachment deleted.'));
  };

  // 회의록 등록: text(본문) + summary(선택) + file(선택, Drive 업로드 후 메타데이터 첨부)
  const handleAddNote = async (projectId, text, opts) => {
    const summary = (opts && opts.summary) || '';
    const file = opts && opts.file;
    let fileMeta = null;
    if (file) {
      // 회의록 카테고리로 Drive 업로드 (목록에는 노출하지 않고 노트에 첨부)
      fileMeta = await handleUploadAttachment(projectId, file, opts.onProgress, '회의록');
      if (!fileMeta) return; // 업로드 실패 시 중단
    }
    const note = {
      id: Date.now(),
      author: currentUser.name,
      text,
      summary,
      file: fileMeta ? {
        fileId: fileMeta.fileId,
        fileName: fileMeta.fileName,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        viewUrl: fileMeta.viewUrl,
        downloadUrl: fileMeta.downloadUrl,
        folderUrl: fileMeta.categoryFolderUrl || fileMeta.folderUrl
      } : null,
      date: new Date().toLocaleString()
    };
    const headline = text ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : (fileMeta ? fileMeta.fileName : '회의록');
    setProjects(prev => {
      const next = prev.map(p => p.id !== projectId ? p : addLog({ ...p, notes: [...(p.notes || []), note] }, 'NOTE_ADD', `회의록: ${headline}`));
      saveToGoogleDB('UPDATE_PROJECTS', next);
      return next;
    });
  };

  const handleDeleteNote = async (projectId, noteId) => {
    const project = projects.find(p => p.id === projectId);
    const target = project && (project.notes || []).find(n => n.id === noteId);
    // 첨부 파일 있으면 Drive 휴지통으로 (실패해도 메타 삭제는 진행)
    if (target && target.file && target.file.fileId) {
      await callGoogleAction('DELETE_FILE', { fileId: target.file.fileId });
    }
    setProjects(prev => {
      const next = prev.map(p => p.id !== projectId ? p : { ...p, notes: (p.notes || []).filter(n => n.id !== noteId) });
      saveToGoogleDB('UPDATE_PROJECTS', next);
      return next;
    });
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
    onUpdateTaskDates: handleUpdateTaskDates,
    onUpdateChecklistItem: handleUpdateChecklistItem,
    onLoadDefaultChecklist: handleLoadDefaultChecklist,
    onAddChecklistItem: handleAddChecklistItem,
    onDeleteChecklistItem: handleDeleteChecklistItem,
    onUpdatePhase: handleUpdatePhase,
    onEditPhases: (prjId) => { setPhaseEditProjectId(prjId); setIsPhaseEditOpen(true); },
    onEditSetupTasks: (prjId) => { setSetupEditProjectId(prjId); setIsSetupEditOpen(true); },
    onSetCurrentSetupTask: handleSetCurrentSetupTask,
    onSignOff: handleSignOff,
    onCancelSignOff: handleCancelSignOff,
    onAddExtraTask: handleAddExtraTask, onUpdateExtraTask: handleUpdateExtraTask, onDeleteExtraTask: handleDeleteExtraTask,
    onAddNote: handleAddNote, onDeleteNote: handleDeleteNote,
    onAddCustomerRequest: handleAddCustomerRequest,
    onUpdateCustomerRequestStatus: handleUpdateCustomerRequestStatus,
    onAddCustomerResponse: handleAddCustomerResponse,
    onDeleteCustomerRequest: handleDeleteCustomerRequest,
    onAddAS: handleAddAS,
    onUpdateAS: handleUpdateAS,
    onDeleteAS: handleDeleteAS,
    onUploadAttachment: handleUploadAttachment,
    onDeleteAttachment: handleDeleteAttachment,
    onDeleteProject: (prj) => { setIsTaskModalOpen(false); setProjectToDelete(prj); },
    driveConfigured: !!settings.driveRootFolderId,
    calcAct, currentUser, t,
    initialTab: taskModalInitialTab
  };

  // === MOBILE MODE ===
  if (isMobileMode) {
    return (
      <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 animate-[fadeIn_0.3s_ease-in-out]">
        {renderToast()}
        <div className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">E</div><div><h1 className="font-bold text-sm leading-tight">EQ-PMS</h1><p className="text-[10px] text-blue-300">{t('모바일 모드', 'Mobile Mode')}</p></div></div>
          <div className="flex items-center gap-1.5">
            <NotificationBell notifications={notifications} lastSeen={notifLastSeen} onMarkAllRead={handleMarkAllRead} onJump={handleNotificationJump} t={t} />
            <button onClick={() => setIsHelpOpen(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-full border border-indigo-700 transition-colors shadow-sm flex items-center" title="도움말"><HelpCircle size={14} /></button>
            <button onClick={() => setIsMobileMode(false)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full border border-slate-600 transition-colors shadow-sm flex items-center"><Monitor size={14} className="mr-1" /> PC화면</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth p-4 pb-24 space-y-4">
          <Suspense fallback={<Loading />}>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setIsIssueModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Camera size={24} className="mb-2" /><span className="font-bold text-sm">{t('이슈 등록', 'Add Issue')}</span></button>
                  <button onClick={() => setIsDailyReportOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><CheckSquare size={24} className="mb-2" /><span className="font-bold text-sm">{t('일일 보고', 'Daily Report')}</span></button>
                  <button onClick={() => setIsPartModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Package size={24} className="mb-2" /><span className="font-bold text-sm">{t('자재 청구', 'Part Request')}</span></button>
                  <button onClick={() => setActiveTab('sites')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Database size={24} className="mb-2" /><span className="font-bold text-sm">{t('환경 정보', 'Site Info')}</span></button>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-500 mb-3 ml-1">{t('나의 배정 현장 요약', 'My Assigned Projects')}</h2>
                  <div className="space-y-3">
                    {(() => {
                      const visible = projects.filter(p => {
                        if (currentUser.role === 'CUSTOMER') {
                          const allowed = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
                          if (!allowed.includes(p.id)) return false;
                        }
                        return p.status !== '완료';
                      });
                      if (isLoading) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
                            {t('데이터 불러오는 중...', 'Loading...')}
                          </div>
                        );
                      }
                      if (visible.length === 0) {
                        return (
                          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center">
                            <Building size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm font-bold text-slate-500 mb-1">{t('배정된 진행중 프로젝트가 없습니다', 'No active assignments')}</p>
                            <p className="text-xs text-slate-400">{t('아래 빠른 입력 버튼으로 이슈/자재/일일 보고를 등록할 수 있습니다.', 'Use the quick buttons above to log issues/parts/reports.')}</p>
                          </div>
                        );
                      }
                      return visible.slice(0, 3).map(prj => (
                        <div key={prj.id} onClick={() => { setActiveTab('projects'); setSelectedProjectId(prj.id); }} className="bg-white p-4 rounded-xl shadow-sm border active:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(prj.status)}`}>{prj.status}</span><span className="text-[10px] text-slate-400 flex items-center"><Building size={12} className="mr-1" />{prj.customer}</span></div>
                          <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{prj.name}</h3>
                          <div className="flex justify-between items-center text-xs mt-3"><span className="font-medium text-slate-500">{t('셋업 진척도', 'Progress')}</span><span className="font-bold text-blue-600">{calcAct(prj.tasks)}%</span></div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${calcAct(prj.tasks)}%` }}></div></div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} engineers={engineers} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onChangeManager={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onManageTeam={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onViewPhaseGantt={(prj) => { setPhaseGanttProject(prj); setIsPhaseGanttOpen(true); }} onEditProject={(prj) => { setProjectEditTarget(prj); setIsProjectEditOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onEditPhases={(prjId) => { setPhaseEditProjectId(prjId); setIsPhaseEditOpen(true); }} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
            {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
            {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
          </Suspense>
        </div>

        <div className="bg-white border-t border-slate-200 flex justify-around p-2.5 fixed bottom-0 w-full z-20 pb-safe shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('홈', 'Home')}</span></button>
          <button onClick={() => setActiveTab('projects')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'projects' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Kanban size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('프로젝트', 'Projects')}</span></button>
          <button onClick={() => setActiveTab('issues')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'issues' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><AlertTriangle size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('이슈', 'Issues')}</span></button>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={() => setActiveTab('sites')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'sites' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Database size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('인프라', 'Sites')}</span></button>
          )}
        </div>

        <Suspense fallback={null}>
          {isProjectModalOpen && <ProjectModal engineers={engineers} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
          {isIssueModalOpen && <MobileIssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
          {isPartModalOpen && <MobilePartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
          {isDailyReportOpen && <DailyReportModal projects={projects} onClose={() => setIsDailyReportOpen(false)} onSubmit={handleAddDailyReport} t={t} />}
          {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
          {isTaskModalOpen && <TaskModal {...taskModalProps} />}
          {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} engineers={engineers} currentUser={currentUser} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} onUpdateIssue={handleUpdateIssue} getStatusColor={getStatusColor} t={t} />}
          {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
          {isPasswordModalOpen && (
            <PasswordChangeModal user={currentUser} forced={forcePasswordChange} onClose={() => { if (!forcePasswordChange) setIsPasswordModalOpen(false); }} onSubmit={handleChangeMyPassword} t={t} />
          )}
          {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} t={t} />}
        </Suspense>
      </div>
    );
  }

  // === PC DESKTOP MODE ===
  return (
    <div className="flex flex-col h-screen font-sans relative animate-[fadeIn_0.3s_ease-in-out] bg-slate-50">
      {renderToast()}
      <div className="flex flex-1 overflow-hidden">
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-200`}>
          <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : 'px-6'}`}>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0"><span className="text-white font-bold text-lg">E</span></div>
            {!sidebarCollapsed && <span className="text-white font-bold text-lg tracking-wider ml-3 truncate">EQ-PMS</span>}
          </div>
          <nav className={`flex-1 py-4 ${sidebarCollapsed ? 'px-2' : 'px-4'} space-y-1.5 overflow-y-auto`}>
            <NavItem icon={<LayoutDashboard size={20} />} label={t('대시보드', 'Dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={sidebarCollapsed} />
            <NavItem icon={<Kanban size={20} />} label={t('프로젝트 관리', 'Projects')} active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} collapsed={sidebarCollapsed} />
            <NavItem icon={<AlertTriangle size={20} />} label={t('이슈/펀치 관리', 'Issues')} active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} collapsed={sidebarCollapsed} />
            {currentUser.role !== 'CUSTOMER' && (
              <>
                <NavItem icon={<Wrench size={20} />} label={t('자재/스페어 파트', 'Parts')} active={activeTab === 'parts'} onClick={() => setActiveTab('parts')} collapsed={sidebarCollapsed} />
                <NavItem icon={<Database size={20} />} label={t('사이트/유틸 마스터', 'Site Master')} active={activeTab === 'sites'} onClick={() => setActiveTab('sites')} collapsed={sidebarCollapsed} />
                <NavItem icon={<Users size={20} />} label={t('인력/리소스 관리', 'Resources')} active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} collapsed={sidebarCollapsed} />
                <NavItem icon={<LifeBuoy size={20} />} label={t('AS 통합 관리', 'AS Management')} active={activeTab === 'as'} onClick={() => setActiveTab('as')} collapsed={sidebarCollapsed} />
                <NavItem icon={<GitCommit size={20} />} label={t('버전 릴리즈 관리', 'Releases')} active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} collapsed={sidebarCollapsed} />
              </>
            )}
            {currentUser.role === 'ADMIN' && (
              <>
                <NavItem icon={<UserCog size={20} />} label={t('사용자 관리', 'User Management')} active={activeTab === 'users'} onClick={() => setActiveTab('users')} collapsed={sidebarCollapsed} />
                <NavItem icon={<SettingsIcon size={20} />} label={t('시스템 설정', 'System Settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={sidebarCollapsed} />
              </>
            )}
          </nav>
          {/* 펼치기/접기 토글 */}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="mx-2 mb-3 mt-1 px-2 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center text-xs font-bold border-t border-slate-800 pt-3"
            title={sidebarCollapsed ? t('메뉴 펼치기', 'Expand menu') : t('메뉴 접기', 'Collapse menu')}
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : (<><ChevronsLeft size={16} className="mr-1.5" />{t('메뉴 접기', 'Collapse')}</>)}
          </button>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
            <div className="flex items-center text-slate-500 bg-slate-100 px-4 py-2 rounded-lg w-96"><Search size={18} className="mr-2" /><input type="text" placeholder={t("검색...", "Search...")} className="bg-transparent border-none outline-none w-full text-sm" /></div>
            <div className="flex items-center space-x-4">
              <NotificationBell notifications={notifications} lastSeen={notifLastSeen} onMarkAllRead={handleMarkAllRead} onJump={handleNotificationJump} t={t} />
              <button onClick={() => setIsHelpOpen(true)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center shadow-sm border border-indigo-200" title={t('사용자 가이드', 'User Guide')}><HelpCircle size={14} className="mr-1.5" /> {t('도움말', 'Help')}</button>
              <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center shadow-sm hover:bg-slate-200"><Globe size={14} className="mr-1.5" /> {lang === 'ko' ? 'EN' : 'KO'}</button>
              <button onClick={() => { setActiveTab('dashboard'); setIsMobileMode(true); }} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm"><Smartphone size={16} className="mr-2" /> {t('모바일 현장 모드', 'Mobile Mode')}</button>
              <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 ml-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{currentUser.name.charAt(0)}</div>
                <div className="text-sm pr-2"><p className="font-semibold text-slate-700">{currentUser.name}</p><p className="text-[10px] text-slate-400">{currentUser.role}</p></div>
                <button onClick={() => { setForcePasswordChange(false); setIsPasswordModalOpen(true); }} title={t('비밀번호 변경', 'Change Password')} className="text-slate-400 hover:text-indigo-600 p-1"><KeyRound size={18}/></button>
                <button onClick={handleLogout} title={t('로그아웃', 'Logout')} className="text-slate-400 hover:text-red-500 p-1"><LogOut size={18}/></button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-8">
            <Suspense fallback={<Loading />}>
              {activeTab === 'dashboard' && <DashboardView projects={projects} issues={issues} engineers={engineers} getStatusColor={getStatusColor} calcExp={calcExp} calcAct={calcAct} onProjectClick={openProjectDetail} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} currentUser={currentUser} t={t} />}
              {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} engineers={engineers} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onChangeManager={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onManageTeam={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onViewPhaseGantt={(prj) => { setPhaseGanttProject(prj); setIsPhaseGanttOpen(true); }} onEditProject={(prj) => { setProjectEditTarget(prj); setIsProjectEditOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onEditPhases={(prjId) => { setPhaseEditProjectId(prjId); setIsPhaseEditOpen(true); }} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
              {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
              {activeTab === 'parts' && <PartsListView parts={parts} getStatusColor={getStatusColor} onUpdateStatus={handleUpdatePartStatus} onDeletePart={(part) => setPartToDelete(part)} onAddClick={() => setIsPartModalOpen(true)} currentUser={currentUser} t={t} />}
              {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
              {activeTab === 'resources' && <ResourceListView engineers={engineers} projects={projects} issues={issues} getStatusColor={getStatusColor} TODAY={TODAY} onAddClick={() => { setSelectedEngineer(null); setIsEngineerModalOpen(true); }} onEditClick={(eng) => { setSelectedEngineer(eng); setIsEngineerModalOpen(true); }} onManageCertificates={(eng) => { setCertEngineerId(eng.id); setIsCertModalOpen(true); }} onShowActivity={(eng) => { setActivityEngineerId(eng.id); setIsActivityModalOpen(true); }} onDeleteClick={(eng) => setEngineerToDelete(eng)} currentUser={currentUser} t={t} />}
              {activeTab === 'as' && currentUser.role !== 'CUSTOMER' && (
                <ASManagementView projects={projects} onProjectClick={openProjectDetail} onUpdateAS={handleUpdateAS} currentUser={currentUser} t={t} />
              )}
              {activeTab === 'versions' && <VersionHistoryView projects={projects} releases={releases} onAddClick={() => setIsReleaseModalOpen(true)} onDeleteRelease={(release) => setReleaseToDelete(release)} currentUser={currentUser} t={t} />}
              {activeTab === 'settings' && currentUser.role === 'ADMIN' && (
                <SystemSettingsView settings={settings} onSave={syncSettings} currentUser={currentUser} t={t} />
              )}
              {activeTab === 'users' && currentUser.role === 'ADMIN' && (
                <UserManagementView
                  users={users}
                  projects={projects}
                  currentUser={currentUser}
                  onAdd={() => { setUserEditTarget(null); setIsUserModalOpen(true); }}
                  onEdit={(u) => { setUserEditTarget(u); setIsUserModalOpen(true); }}
                  onResetPassword={handleResetUserPassword}
                  onToggleActive={handleToggleUserActive}
                  onDelete={(u) => setUserToDelete(u)}
                  t={t}
                />
              )}
            </Suspense>
          </div>

          <Suspense fallback={null}>
            {isProjectModalOpen && <ProjectModal engineers={engineers} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
            {isIssueModalOpen && <IssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
            {isPartModalOpen && <PartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
            {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
            {isTaskModalOpen && <TaskModal {...taskModalProps} />}
            {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} engineers={engineers} currentUser={currentUser} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} onUpdateIssue={handleUpdateIssue} getStatusColor={getStatusColor} t={t} />}
            {isVersionModalOpen && versionEditProject && (() => {
              const liveProject = projects.find(p => p.id === versionEditProject.id);
              if (!liveProject) return null;
              return <VersionModal project={liveProject} onClose={() => setIsVersionModalOpen(false)} onAdd={handleAddVersion} onUpdate={handleUpdateVersion} onDelete={handleDeleteVersion} t={t} />;
            })()}
            {isPhaseGanttOpen && <PhaseGanttModal project={phaseGanttProject} onClose={() => setIsPhaseGanttOpen(false)} t={t} />}
            {isProjectEditOpen && <ProjectEditModal project={projectEditTarget} engineers={engineers} currentUser={currentUser} onClose={() => setIsProjectEditOpen(false)} onSubmit={handleEditProject} t={t} />}
            {isPhaseEditOpen && phaseEditProjectId && (() => {
              const lp = projects.find(p => p.id === phaseEditProjectId);
              if (!lp) return null;
              return <PhaseEditModal project={lp} onClose={() => { setIsPhaseEditOpen(false); setPhaseEditProjectId(null); }} onSubmit={handleSetProjectPhases} t={t} />;
            })()}
            {isSetupEditOpen && setupEditProjectId && (() => {
              const lp = projects.find(p => p.id === setupEditProjectId);
              if (!lp) return null;
              return <SetupTaskEditModal project={lp} onClose={() => { setIsSetupEditOpen(false); setSetupEditProjectId(null); }} onSubmit={handleSetProjectTasks} t={t} />;
            })()}
            {isTeamModalOpen && teamEditProjectId && (() => {
              const liveProject = projects.find(p => p.id === teamEditProjectId);
              if (!liveProject) return null;
              return <ProjectTeamModal project={liveProject} engineers={engineers} currentUser={currentUser} onClose={() => { setIsTeamModalOpen(false); setTeamEditProjectId(null); }} onChangeManager={handleChangeManager} onToggleAssignment={handleToggleEngineerAssignment} onAddTrip={handleAddTrip} onUpdateTrip={handleUpdateTrip} onDeleteTrip={handleDeleteTrip} t={t} />;
            })()}
            {isReleaseModalOpen && <ReleaseModal onClose={() => setIsReleaseModalOpen(false)} onSubmit={handleAddRelease} t={t} />}
            {isEngineerModalOpen && <EngineerModal engineer={selectedEngineer} projects={projects} onClose={() => setIsEngineerModalOpen(false)} onSubmit={handleAddEngineer} t={t} />}
            {isCertModalOpen && certEngineerId && (() => {
              const eng = engineers.find(e => e.id === certEngineerId);
              if (!eng) return null;
              return <EngineerCertificatesModal engineer={eng} projects={projects} onClose={() => { setIsCertModalOpen(false); setCertEngineerId(null); }} onAdd={handleAddCertificate} onUpdate={handleUpdateCertificate} onDelete={handleDeleteCertificate} t={t} />;
            })()}
            {isActivityModalOpen && activityEngineerId && (() => {
              const eng = engineers.find(e => e.id === activityEngineerId);
              if (!eng) return null;
              return <EngineerActivityModal engineer={eng} projects={projects} issues={issues} onClose={() => { setIsActivityModalOpen(false); setActivityEngineerId(null); }} t={t} />;
            })()}

            {projectToDelete && <DeleteConfirmModal type="project" item={projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} t={t} />}
            {issueToDelete && <DeleteConfirmModal type="issue" item={issueToDelete} onClose={() => setIssueToDelete(null)} onConfirm={handleDeleteIssue} t={t} />}
            {releaseToDelete && <DeleteConfirmModal type="release" item={releaseToDelete} onClose={() => setReleaseToDelete(null)} onConfirm={handleDeleteRelease} t={t} />}
            {engineerToDelete && <DeleteConfirmModal type="engineer" item={engineerToDelete} onClose={() => setEngineerToDelete(null)} onConfirm={handleDeleteEngineer} t={t} />}
            {partToDelete && <DeleteConfirmModal type="part" item={partToDelete} onClose={() => setPartToDelete(null)} onConfirm={handleDeletePart} t={t} />}
            {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
            {userToDelete && <DeleteConfirmModal type="user" item={userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDeleteUser} t={t} />}

            {isUserModalOpen && currentUser.role === 'ADMIN' && (
              <UserModal user={userEditTarget} users={users} projects={projects} onClose={() => { setIsUserModalOpen(false); setUserEditTarget(null); }} onSubmit={handleSubmitUser} t={t} />
            )}
            {isPasswordModalOpen && (
              <PasswordChangeModal user={currentUser} forced={forcePasswordChange} onClose={() => { if (!forcePasswordChange) setIsPasswordModalOpen(false); }} onSubmit={handleChangeMyPassword} t={t} />
            )}
            {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} t={t} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
