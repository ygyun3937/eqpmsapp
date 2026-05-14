import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Kanban, AlertTriangle, Wrench, Database, Users,
  GitCommit, Search, Globe, Smartphone, Monitor, LogOut,
  Building, Building2, Camera, CheckSquare, Package, LayoutDashboard as Home,
  KeyRound, UserCog, LifeBuoy, HelpCircle, ChevronsLeft, ChevronsRight,
  Settings as SettingsIcon, ClipboardList, Mail as MailIcon, Activity as ActivityIcon
} from 'lucide-react';

// Constants & Initial Data
import {
  TODAY, DOMAIN_TASKS, DOMAIN_CHECKLIST, PROJECT_PHASES,
  PHASE_COMPLETED_INDEX, PHASE_WARRANTY_INDEX,
  SEED_ADMIN, SEED_TEST_USERS, TEST_MODE, GAS_URL,
  getTasksForDomain, getChecklistForDomain, migrateLegacyDomain
} from './constants';

// Utils
import { getStatusColor } from './utils/status';
import { getNextStage, canAdvanceStage, createStageRecord } from './utils/partPipeline';
import { calcExp, calcAct } from './utils/calc';
import { loadFromGoogleDB, saveToGoogleDB, saveProjectDelta, notifyWebhook, callGoogleAction, fileToBase64, subscribeSaveState, subscribeSaveError, getPendingSaveCount } from './utils/api';
import { saveSnapshot, loadSnapshot, saveLastKnownGood, compareWithRemote, saveDeletedItemSnapshot, subscribeStorageWarning } from './utils/localBackup';
import { hashPassword } from './utils/auth';
import { nowStored } from './utils/dateUtils';

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
const WeeklyReportView = lazy(() => import('./components/views/WeeklyReportView'));
const CustomerListView = lazy(() => import('./components/views/CustomerListView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const SystemSettingsView = lazy(() => import('./components/views/SystemSettingsView'));
const AdminMailLogView = lazy(() => import('./components/views/AdminMailLogView'));
const AdminChangeLogView = lazy(() => import('./components/views/AdminChangeLogView'));
const AdminLogsView = lazy(() => import('./components/views/AdminLogsView'));
const AdminConfigView = lazy(() => import('./components/views/AdminConfigView'));
const MasterDataView = lazy(() => import('./components/views/MasterDataView'));
const LoginScreen = lazy(() => import('./components/views/LoginScreen'));

// Lazy-loaded Modals
const ProjectModal = lazy(() => import('./components/modals/ProjectModal'));
const IssueModal = lazy(() => import('./components/modals/IssueModal'));
const PartModal = lazy(() => import('./components/modals/PartModal'));
const SiteModal = lazy(() => import('./components/modals/SiteModal'));
const CustomerModal = lazy(() => import('./components/modals/CustomerModal'));
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
const PartPipelineModal = lazy(() => import('./components/modals/PartPipelineModal'));
const QRLabelModal = lazy(() => import('./components/modals/QRLabelModal'));
const PartStageModal = lazy(() => import('./components/modals/PartStageModal'));
const MobilePartPipelineModal = lazy(() => import('./components/modals/MobilePartPipelineModal'));
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
  const [isPipelinePartModalOpen, setIsPipelinePartModalOpen] = useState(false);
  const [isQRLabelModalOpen, setIsQRLabelModalOpen] = useState(false);
  const [qrLabelTarget, setQrLabelTarget] = useState(null);
  const [isPartStageModalOpen, setIsPartStageModalOpen] = useState(false);
  const [partStageTarget, setPartStageTarget] = useState(null);
  const [pipelinePartToDelete, setPipelinePartToDelete] = useState(null);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerEditTarget, setCustomerEditTarget] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
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

  // 데이터 보호 (Track A3) — 부팅 시 로컬 백업이 원격보다 많으면 사용자에게 안내
  const [restoreCandidates, setRestoreCandidates] = useState(null);

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
  const [pipelineParts, setPipelineParts] = useState([]);
  const [partEvents, setPartEvents] = useState([]);
  const [sites, setSites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ driveRootFolderId: '' });
  const [weeklyReports, setWeeklyReports] = useState([]);

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
        // 데이터 보호 — 부팅 시 로컬 스냅샷 비교 (Track A3)
        // 원격(GAS)에 있어야 할 항목이 사라졌다면(예: 다른 사용자가 동일 시간대에 덮어쓰기) 경고
        try {
          const localProjects = loadSnapshot('projects');
          if (Array.isArray(localProjects) && localProjects.length > 0) {
            const cmp = compareWithRemote(localProjects, data.projects || [], 'id');
            if (cmp.comparable && cmp.missingInRemote.length > 0) {
              const names = cmp.missingInRemote.slice(0, 3).map(p => p.name || p.id).join(', ');
              const more = cmp.missingInRemote.length > 3 ? ` 외 ${cmp.missingInRemote.length - 3}건` : '';
              console.warn('[MAK-PMS 데이터 보호] 로컬엔 있는데 원격에 없는 프로젝트', cmp.missingInRemote.length, '건:', names);
              setRestoreCandidates({ projects: cmp.missingInRemote, summary: `로컬 백업에 있지만 서버에는 없는 프로젝트 ${cmp.missingInRemote.length}건 (${names}${more})` });
            }
          }
          // last_known_good 갱신 — 사용자가 정상적으로 본 상태
          saveLastKnownGood('projects', data.projects || []);
        } catch (e) { console.warn('[localBackup] 비교 실패', e.message); }
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
          // 도메인 계층화 마이그레이션 (대분류/중분류 분리)
          //  · 기존 단일 domain ('2차전지 EOL' 등) → domain='2차전지', subDomain='EOL'
          //  · 이미 분리된 경우 (subDomain 존재) skip
          if (typeof sp.subDomain === 'undefined') {
            const m = migrateLegacyDomain(sp.domain || '');
            sp.domain = m.domain;
            sp.subDomain = m.subDomain;
          }
          return sp;
        });
        // 고객사 로드 + 정규화 (contacts 배열 보장) + contact id 중복 자동 정리
        // 과거 Date.now() 단독 id 충돌로 같은 id의 contact가 여러 개 존재할 수 있었음.
        // 같은 id를 가진 contact는 saveEdit/removeContact가 모두에 영향 미쳐
        // "한쪽 수정/추가하면 다른 쪽이 해제되는" 증상의 원인이 됨.
        let contactDedupCount = 0;
        const rawCustomers = (data.customers || []).map(c => {
          const seen = new Set();
          const contacts = ensureArr(c.contacts).map(ct => {
            const baseSite = { ...ct, siteIds: ensureArr(ct.siteIds) };
            if (!ct.id || seen.has(ct.id)) {
              contactDedupCount += 1;
              const newId = `CT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
              seen.add(newId);
              return { ...baseSite, id: newId };
            }
            seen.add(ct.id);
            return baseSite;
          });
          return { ...c, contacts };
        });
        if (contactDedupCount > 0) {
          console.warn(`[MAK-PMS] 담당자 id 중복 ${contactDedupCount}건 자동 정리됨. 저장 시 GAS에도 반영됩니다.`);
        }

        // 중복 id 자동 감지 및 정리 — 한 번에 등록 시 generateUniqueId 충돌로 같은 id를 받았던 customer들
        const idSeen = new Map(); // id → 첫 번째 customer
        const idRemap = new Map(); // oldId → newId (중복인 경우)
        const fixedCustomers = rawCustomers.map((c, idx) => {
          const id = c.id;
          if (!id) {
            const newId = `CST-fix${idx}-${Math.random().toString(36).slice(2, 7)}`;
            return { ...c, id: newId };
          }
          if (!idSeen.has(id)) {
            idSeen.set(id, c);
            return c;
          }
          // 중복 — 새 id 부여
          const newId = `CST-fix${idx}-${Math.random().toString(36).slice(2, 7)}`;
          idRemap.set(`${id}__${idx}`, { from: id, to: newId, name: c.name });
          return { ...c, id: newId };
        });
        const hadDuplicates = idRemap.size > 0;
        if (hadDuplicates) {
          console.warn('[MAK-PMS] 고객사 id 중복 ' + idRemap.size + '건 자동 정리. 잘못 매핑된 프로젝트·사이트의 customerId는 비워서 텍스트 매칭으로 fallback.');
        }
        setCustomers(fixedCustomers);
        if (hadDuplicates || contactDedupCount > 0) {
          saveToGoogleDB('UPDATE_CUSTOMERS', fixedCustomers);
        }

        // 자동 매칭: projects.customer 텍스트 → customerId (대소문자 무시, trim)
        // 중복 id가 있던 경우 → 잘못 매핑된 customerId 모두 비우고 텍스트 기준으로 재매칭
        const nameToId = new Map();
        fixedCustomers.forEach(c => {
          const k = String(c.name || '').trim().toLowerCase();
          if (k) nameToId.set(k, c.id);
        });
        // 중복 발견 시 다 비웠다가 재매칭이 안전. 발견 없으면 기존 customerId 보존.
        const duplicatedIds = new Set();
        if (hadDuplicates) {
          Array.from(idRemap.values()).forEach(r => duplicatedIds.add(r.from));
          // 살아남은(첫 번째) customer의 id도 동일 — 그 id도 신뢰 못 함
        }
        const autoMatch = (item) => {
          // 중복 id로 잘못 매핑됐을 가능성 있으면 비우고 재매칭
          if (hadDuplicates && item.customerId && duplicatedIds.has(item.customerId)) {
            const k = String(item.customer || '').trim().toLowerCase();
            const id = k ? nameToId.get(k) : null;
            return id ? { ...item, customerId: id } : { ...item, customerId: '' };
          }
          if (item.customerId) return item;
          const k = String(item.customer || '').trim().toLowerCase();
          const id = k ? nameToId.get(k) : null;
          return id ? { ...item, customerId: id } : item;
        };
        // 프로젝트 한정: 엔드유저(endUserId) / 설비업체(vendorId) 두 역할로 분리.
        // 마이그레이션 — 기존 customerId/customer는 엔드유저로 복사. vendor 필드는 기본 빈값.
        const projectRoleMatch = (item) => {
          const out = { ...item };
          // 엔드유저: 기존 endUserId 없으면 customerId/customer로부터 채움
          if (!out.endUserId) {
            if (out.customerId) {
              out.endUserId = out.customerId;
            } else {
              const k = String(out.customer || '').trim().toLowerCase();
              const id = k ? nameToId.get(k) : null;
              if (id) out.endUserId = id;
            }
          }
          // endUser 이름은 매칭된 customer에서 채움 (없으면 기존 customer 텍스트 유지)
          if (out.endUserId && !out.endUser) {
            const c = fixedCustomers.find(x => x.id === out.endUserId);
            if (c) out.endUser = c.name;
          }
          // 호환을 위해 customerId/customer는 endUser 기준으로 유지
          out.customerId = out.endUserId || '';
          if (out.endUser) out.customer = out.endUser;
          // 설비업체: 매칭된 vendorId가 있으면 이름 채움
          if (!out.vendorId) out.vendorId = '';
          if (out.vendorId && !out.vendor) {
            const c = fixedCustomers.find(x => x.id === out.vendorId);
            if (c) out.vendor = c.name;
          }
          if (!out.vendor) out.vendor = '';
          return out;
        };
        const projectsAfter = migratedProjects.map(p => projectRoleMatch(autoMatch(p)));
        setProjects(projectsAfter);
        if (hadDuplicates) {
          saveToGoogleDB('UPDATE_PROJECTS', projectsAfter);
        }
        // 이슈 comments 정규화
        // (아래 setIssues 호출 직전에 처리)
        setIssues((data.issues || []).map(i => ({ ...i, comments: ensureArr(i.comments) })));
        setReleases(data.releases || []);
        setWeeklyReports(Array.isArray(data.weeklyReports) ? data.weeklyReports : []);
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
        if (Array.isArray(data.pipelineParts)) setPipelineParts(data.pipelineParts);
        if (Array.isArray(data.partEvents)) setPartEvents(data.partEvents);
        // 사이트 customSpecs 배열 정규화 (GAS에서 빈셀/문자열로 와도 안전) + customerId 자동 매칭
        const normalizedSites = (data.sites || []).map(s => autoMatch({
          ...s,
          customSpecs: ensureArr(s.customSpecs)
        }));
        setSites(normalizedSites);
        if (hadDuplicates) {
          saveToGoogleDB('UPDATE_SITES', normalizedSites);
        }
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

  // === 디바운스 GAS 저장 (연속 클릭 시 마지막 상태만 1회 저장) ===
  // 빠른 연속 attach/detach 호출 시 GAS에 비동기 요청이 동시 발사되어 도착 순서가
  // 뒤바뀌면 이전 변경이 덮어써져 사라지는 경합 문제 방지.
  // (Hook은 조건부 return 위에 있어야 함 — Rules of Hooks)
  const debouncedSaveRefs = useRef({});
  const [savingCount, setSavingCount] = useState(0);
  useEffect(() => subscribeSaveState(setSavingCount), []);

  // 저장 3회 재시도 실패 시 사용자에게 토스트 알림 (silent failure 방지)
  useEffect(() => subscribeSaveError(info => {
    const msg = info && info.message ? info.message : '저장 실패';
    setToastMessage(`⚠️ ${msg}`);
    setTimeout(() => setToastMessage(''), 6000);
  }), []);

  // localStorage 용량 80% 초과 시 1회 토스트 알림
  useEffect(() => subscribeStorageWarning(info => {
    setToastMessage(`⚠️ ${info.message}`);
    setTimeout(() => setToastMessage(''), 8000);
  }), []);

  // 저장 진행 중에 새로고침/탭 닫기 시 브라우저 경고 prompt
  // (실제 데이터는 sendBeacon으로 flush되지만, 사용자가 의도치 않게 떠나는 것 방지)
  useEffect(() => {
    const handler = (e) => {
      // pending save가 있거나 debounced 큐에 대기 중인 게 있으면 경고
      const refs = debouncedSaveRefs.current;
      const debouncedPending = Object.values(refs).some(r => r && r.pending !== null);
      if (getPendingSaveCount() > 0 || debouncedPending) {
        e.preventDefault();
        e.returnValue = '저장 중인 변경 사항이 있습니다. 잠시 후 다시 시도하세요.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // 페이지 떠나기 직전 — 대기 중인 debounced 저장을 즉시 sendBeacon으로 발사
  // (api.js의 unload 핸들러는 _pendingPayloads만 처리하므로, debounce 대기 중인 건 별도 처리 필요)
  // Rules of Hooks — early return 위에 위치해야 함
  useEffect(() => {
    const flushDebounced = () => {
      const refs = debouncedSaveRefs.current;
      Object.keys(refs).forEach(k => {
        const r = refs[k];
        if (r && r.pending !== null && r.action) {
          try {
            const blob = new Blob([JSON.stringify({ action: r.action, data: r.pending })], { type: 'application/json' });
            navigator.sendBeacon && navigator.sendBeacon(GAS_URL, blob);
          } catch (_) {}
          if (r.timer) clearTimeout(r.timer);
          r.timer = null;
          r.pending = null;
        }
      });
    };
    window.addEventListener('beforeunload', flushDebounced);
    window.addEventListener('pagehide', flushDebounced);
    return () => {
      window.removeEventListener('beforeunload', flushDebounced);
      window.removeEventListener('pagehide', flushDebounced);
    };
  }, []);

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
    // 현재 보고 있는 탭은 유지 — 모달은 어느 탭 위에서도 뜨고, 닫았을 때 사용자가 원래 페이지에 남도록
    setSelectedProjectId(projectId);
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
  // 충돌 방지: ms + 4자 랜덤 — 같은 밀리초 안에 여러 번 호출돼도 unique 보장
  const generateUniqueId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };
  const addLog = (project, type, detail) => ({
    ...project,
    activityLog: [...(project.activityLog || []), { date: nowStored(), user: currentUser.name, type, detail }]
  });

  // === 헬퍼: state 변경 후 전체 배열을 GAS에 덮어쓰기 ===
  // 모든 sync 함수는 saveSnapshot으로 localStorage에 자동 백업 (데이터 보호 1단계 - Track A)
  const syncProjects = (updated) => { setProjects(updated); saveSnapshot('projects', updated); saveToGoogleDB('UPDATE_PROJECTS', updated); };

  // === Delta 저장 (성능 개선) ===
  const syncProject = (projectId, transformer) => {
    setProjects(prev => {
      const found = prev.find(p => p.id === projectId);
      if (!found) return prev;
      const updated = typeof transformer === 'function' ? transformer(found) : transformer;
      const next = prev.map(p => p.id === projectId ? updated : p);
      saveSnapshot('projects', next);
      scheduleSave(`project:${projectId}`, 'UPDATE_PROJECT_BY_ID', { projectId, project: updated }, 1500);
      return next;
    });
  };
  // 프로젝트 삭제 — 행 삭제만 전송 (전체 배열 안 보냄) + 삭제 직전 단독 스냅샷
  const syncProjectDelete = (projectId) => {
    setProjects(prev => {
      const target = prev.find(p => p.id === projectId);
      if (target) saveDeletedItemSnapshot('projects', target);
      const next = prev.filter(p => p.id !== projectId);
      saveSnapshot('projects', next);
      return next;
    });
    saveProjectDelta(projectId, null);
  };
  const syncIssues = (updated) => { setIssues(updated); saveSnapshot('issues', updated); saveToGoogleDB('UPDATE_ISSUES', updated); };
  const syncReleases = (updated) => { setReleases(updated); saveSnapshot('releases', updated); saveToGoogleDB('UPDATE_RELEASES', updated); };
  const syncEngineers = (updated) => { setEngineers(updated); saveSnapshot('engineers', updated); saveToGoogleDB('UPDATE_ENGINEERS', updated); };
  const syncParts = (updated) => { setParts(updated); saveSnapshot('parts', updated); saveToGoogleDB('UPDATE_PARTS', updated); };
  const syncSites = (updated) => { setSites(updated); saveSnapshot('sites', updated); saveToGoogleDB('UPDATE_SITES', updated); };
  const syncCustomers = (updated) => { setCustomers(updated); saveSnapshot('customers', updated); saveToGoogleDB('UPDATE_CUSTOMERS', updated); };
  const syncWeeklyReports = (updated) => { setWeeklyReports(updated); saveSnapshot('weeklyReports', updated); saveToGoogleDB('UPDATE_WEEKLY_REPORTS', updated); };

  const scheduleSave = (key, action, data, delay = 400) => {
    const refs = debouncedSaveRefs.current;
    if (!refs[key]) refs[key] = { timer: null, pending: null, action: null };
    refs[key].pending = data;
    refs[key].action = action;
    if (refs[key].timer) clearTimeout(refs[key].timer);
    refs[key].timer = setTimeout(() => {
      const toSave = refs[key].pending;
      refs[key].timer = null;
      refs[key].pending = null;
      saveToGoogleDB(action, toSave);
    }, delay);
  };

  // 주간 보고서 upsert (user + weekStart 기준 매칭)
  const upsertWeeklyReport = (report) => {
    const key = (r) => `${r.user}__${r.weekStart}`;
    const k = key(report);
    const existing = weeklyReports.findIndex(r => key(r) === k);
    const next = existing >= 0
      ? weeklyReports.map((r, i) => i === existing ? { ...r, ...report } : r)
      : [...weeklyReports, report];
    syncWeeklyReports(next);
    showToast(t(`주간 보고서 저장됨 (${report.status === 'submitted' ? '제출' : report.status === 'approved' ? '승인' : report.status === 'returned' ? '반려' : '초안'})`, `Weekly report saved (${report.status})`));
  };
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

  const handleToggleUserWeeklyReport = (user) => {
    const updated = users.map(u => u.id === user.id ? { ...u, weeklyReportEnabled: !u.weeklyReportEnabled } : u);
    syncUsers(updated);
    showToast(t(`주간 보고 권한이 ${user.weeklyReportEnabled ? '비활성화' : '활성화'}되었습니다.`, `Weekly report permission ${user.weeklyReportEnabled ? 'disabled' : 'enabled'}.`));
  };

  const handleToggleUserTeamLead = (user) => {
    const updated = users.map(u => u.id === user.id ? { ...u, isTeamLead: !u.isTeamLead } : u);
    syncUsers(updated);
    showToast(t(`${user.name} ${user.isTeamLead ? '팀장 해제됨' : '팀장으로 지정됨'}`, `${user.name} ${user.isTeamLead ? 'unset as team lead' : 'set as team lead'}`));
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
    const domainTasks = getTasksForDomain(newProject.domain, newProject.subDomain);
    const domainChecklist = getChecklistForDomain(newProject.domain, newProject.subDomain);
    const tasks = JSON.parse(JSON.stringify(domainTasks.length ? domainTasks : DOMAIN_TASKS['반도체']));
    const baseChecklist = domainChecklist.length ? domainChecklist : DOMAIN_CHECKLIST['반도체'];
    const checklist = baseChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx }));
    const newData = addLog({
      ...newProject,
      id: generateUniqueId('PRJ'),
      tasks, checklist,
      signOff: null,
      activityLog: [], managerHistory: [],
      trips: [], extraTasks: [], asRecords: [], customerRequests: [], notes: [], attachments: []
    }, 'PROJECT_CREATE', `프로젝트 생성: ${newProject.name}`);
    // 신규 프로젝트 — state 즉시 반영 + delta append (UPDATE_PROJECT_BY_ID는 해당 id가 없으면 append)
    setProjects(prev => [newData, ...prev]);
    saveProjectDelta(newData.id, newData);
    setIsProjectModalOpen(false);
    showToast('프로젝트가 추가되었습니다.');
  };

  const handleUpdatePhase = (projectId, newPhaseIndex) => {
    syncProject(projectId, p => {
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      const targetIdx = Math.max(0, Math.min(newPhaseIndex, phases.length - 1));
      const fromIdx = typeof p.phaseIndex === 'number' ? p.phaseIndex : 0;
      const fromName = (phases[fromIdx] || phases[0]).name;
      const toName = phases[targetIdx].name;
      const isLast = targetIdx === phases.length - 1;
      const newStatus = isLast ? '완료' : '진행중';
      return addLog({ ...p, phases, phaseIndex: targetIdx, currentPhaseId: phases[targetIdx].id, status: newStatus }, 'PHASE_CHANGE', `${fromName} → ${toName}`);
    });
  };

  // 셋업 파이프라인 클릭 — 클릭한 task를 "현재(미완료)"로, 이전은 모두 완료, 이후는 모두 미완료
  const handleSetCurrentSetupTask = (projectId, taskId) => {
    syncProject(projectId, p => {
      const list = p.tasks || [];
      const idx = list.findIndex(tk => tk.id === taskId);
      if (idx < 0) return p;
      const target = list[idx];
      const newTasks = list.map((tk, i) => ({ ...tk, isCompleted: i < idx }));
      return addLog({ ...p, tasks: newTasks }, 'SETUP_PROGRESS', `현재 셋업 작업: ${target.name}`);
    });
  };

  // 셋업 작업 일괄 편집 (이름·일정·마일스톤·완료·순서·추가·삭제 한번에)
  const handleSetProjectTasks = (projectId, nextTasks) => {
    syncProject(projectId, p => {
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
    });
  };

  // 프로젝트 단계 정의 자체 편집 (이름 변경/추가/삭제/순서)
  const handleSetProjectPhases = (projectId, nextPhases) => {
    syncProject(projectId, p => {
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
    });
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    // 데이터 보호 (Track A4) — 삭제 직전 GAS에도 Drive 임시 백업 폴더로 복사
    // 실패해도 localStorage 단독 스냅샷(syncProjectDelete 내부)으로 30일 복원 가능
    const target = projectToDelete;
    callGoogleAction('BACKUP_PROJECT', { project: target, user: currentUser ? currentUser.name : '' })
      .catch(e => console.warn('[backup] GAS 백업 실패 (localStorage 스냅샷은 남음)', e));
    syncProjectDelete(target.id);
    setProjectToDelete(null);
    showToast(t(`프로젝트 [${target.name}]이(가) 삭제됐습니다. Drive 백업 + 로컬 스냅샷으로 30일간 복원 가능.`, `[${target.name}] deleted. Recoverable for 30 days via Drive backup + local snapshot.`));
  };

  const toggleTaskCompletion = (projectId, taskId) => {
    syncProject(projectId, p => {
      const task = p.tasks.find(t => t.id === taskId);
      if (!task) return p;
      const updated = { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) };
      return !task.isCompleted ? addLog(updated, 'TASK_COMPLETE', `태스크 완료: ${task.name}`) : updated;
    });
  };

  const handleAddTask = (projectId, taskName) => {
    syncProject(projectId, p => addLog({ ...p, tasks: [...p.tasks, { id: Date.now(), name: taskName, isCompleted: false, delayReason: '' }] }, 'TASK_ADD', `태스크 추가: ${taskName}`));
  };

  const handleEditTaskName = (projectId, taskId, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    syncProject(projectId, p => {
      const task = (p.tasks || []).find(tk => tk.id === taskId);
      if (!task || task.name === trimmed) return p;
      const updated = { ...p, tasks: p.tasks.map(tk => tk.id === taskId ? { ...tk, name: trimmed } : tk) };
      return addLog(updated, 'TASK_RENAME', `태스크 이름 변경: ${task.name} → ${trimmed}`);
    });
  };

  const handleDeleteTask = (projectId, taskId) => {
    syncProject(projectId, p => {
      const task = p.tasks.find(t => t.id === taskId);
      return addLog({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) }, 'TASK_DELETE', `태스크 삭제: ${task?.name || ''}`);
    });
  };

  const handleUpdateDelayReason = (projectId, taskId, reason) => {
    syncProject(projectId, p => ({ ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, delayReason: reason } : t) }));
  };

  const handleUpdateTaskDates = (projectId, taskId, changes) => {
    syncProject(projectId, p => {
      const task = (p.tasks || []).find(tk => tk.id === taskId);
      if (!task) return p;
      const updated = { ...p, tasks: p.tasks.map(tk => tk.id === taskId ? { ...tk, ...changes } : tk) };
      const parts = [];
      if ('startDate' in changes && (changes.startDate || '') !== (task.startDate || '')) {
        parts.push(`시작 ${task.startDate || '미정'} → ${changes.startDate || '미정'}`);
      }
      if ('endDate' in changes && (changes.endDate || '') !== (task.endDate || '')) {
        parts.push(`종료 ${task.endDate || '미정'} → ${changes.endDate || '미정'}`);
      }
      if ('isMilestone' in changes && Object.keys(changes).length === 1) {
        if (!!changes.isMilestone === !!task.isMilestone) return updated;
        return addLog(updated, 'TASK_MILESTONE', `마일스톤 ${changes.isMilestone ? 'ON' : 'OFF'}: ${task.name}`);
      }
      if ('isMilestone' in changes && !!changes.isMilestone !== !!task.isMilestone) {
        parts.push(`마일스톤 ${changes.isMilestone ? 'ON' : 'OFF'}`);
      }
      if (parts.length === 0) return updated;
      return addLog(updated, 'TASK_DATES', `일정 변경 [${task.name}] · ${parts.join(' · ')}`);
    });
  };

  const handleUpdateChecklistItem = (projectId, itemId, newStatus, newNote) => {
    syncProject(projectId, p => {
      const item = p.checklist.find(c => c.id === itemId);
      const updated = { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, status: newStatus, note: newNote !== undefined ? newNote : c.note } : c) };
      if (item && item.status !== newStatus) return addLog(updated, 'CHECKLIST_CHANGE', `${item.task}: ${item.status} → ${newStatus}`);
      return updated;
    });
  };

  const handleLoadDefaultChecklist = (projectId) => {
    syncProject(projectId, p => {
      const domainChecklist = getChecklistForDomain(p.domain, p.subDomain);
      const base = domainChecklist.length ? domainChecklist : DOMAIN_CHECKLIST['반도체'];
      return addLog({ ...p, checklist: base.map((item, idx) => ({ ...item, id: Date.now() + idx })) }, 'CHECKLIST_CHANGE', '기본 검수표 로드');
    });
    showToast('기본 검수표가 불러와졌습니다.');
  };

  const handleAddChecklistItem = (projectId, category, taskName) => {
    if (!taskName.trim()) return;
    syncProject(projectId, p => ({ ...p, checklist: [...(p.checklist || []), { id: Date.now(), category: category || '일반', task: taskName.trim(), status: 'Pending', note: '' }] }));
  };

  const handleDeleteChecklistItem = (projectId, itemId) => {
    syncProject(projectId, p => ({ ...p, checklist: (p.checklist || []).filter(c => c.id !== itemId) }));
  };

  const handleSignOff = (projectId, customerName, signatureData) => {
    const todayStr = new Date().toISOString().split('T')[0];
    syncProject(projectId, p => {
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      const warrantyIdx = Math.max(0, phases.length - 2);
      return addLog({ ...p, status: '진행중', phaseIndex: warrantyIdx, currentPhaseId: phases[warrantyIdx]?.id, signOff: { signed: true, customerName, signatureData, date: todayStr } }, 'SIGN_OFF', `고객 서명 완료: ${customerName} (${phases[warrantyIdx]?.name || ''} 단계 진입)`);
    });
    showToast('최종 검수 서명 완료. 워런티 단계로 진입했습니다.');
  };

  // 사인 취소 (ADMIN 전용)
  const handleCancelSignOff = (projectId) => {
    syncProject(projectId, p => {
      const prev = p.signOff;
      const phases = (p.phases && p.phases.length > 0) ? p.phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
      const warrantyIdx = Math.max(0, phases.length - 2);
      const rollbackIdx = (typeof p.phaseIndex === 'number' && p.phaseIndex >= warrantyIdx) ? Math.max(0, warrantyIdx - 1) : p.phaseIndex;
      return addLog({ ...p, signOff: null, status: '진행중', phaseIndex: rollbackIdx, currentPhaseId: phases[rollbackIdx]?.id }, 'SIGN_CANCEL', `검수 사인 취소 (이전 검수자: ${prev?.customerName || '-'})`);
    });
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
      createdAt: nowStored(),
      createdBy: currentUser.name
    };
    syncProject(projectId, p => addLog({ ...p, extraTasks: [...(p.extraTasks || []), task] }, 'EXTRA_ADD', `추가 작업 등록: ${task.name} (${task.type})`));
  };

  const handleUpdateExtraTask = (projectId, taskId, updates) => {
    syncProject(projectId, p => {
      const updated = { ...p, extraTasks: (p.extraTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t) };
      if (updates.status) {
        const task = (p.extraTasks || []).find(t => t.id === taskId);
        return addLog(updated, 'EXTRA_UPDATE', `추가 작업 상태: ${task?.name || ''} → ${updates.status}`);
      }
      return updated;
    });
  };

  // 추가대응 파일 임포트 (Excel/붙여넣기) — 검증 통과한 행만 일괄 등록
  const handleImportExtraTasks = (projectId, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const baseTs = Date.now();
    const newTasks = rows.map((r, i) => ({
      id: baseTs + i,
      name: r.name,
      requester: r.requester || '',
      type: r.type || '기타',
      status: r.status || '대기',
      startDate: r.startDate || '',
      endDate: r.endDate || '',
      note: r.note || '',
      createdAt: nowStored(),
      createdBy: `import:${currentUser.name}`,
      comments: []
    }));
    syncProject(projectId, p => addLog(
      { ...p, extraTasks: [...(p.extraTasks || []), ...newTasks] },
      'EXTRA_ADD',
      `추가 작업 일괄 등록 (${newTasks.length}건): ${newTasks.slice(0, 3).map(t => t.name).join(', ')}${newTasks.length > 3 ? ' 등' : ''}`
    ));
    showToast(`추가 대응 ${newTasks.length}건 등록됨`);
  };

  // 추가대응 댓글 추가 (AS 댓글 패턴과 동일)
  const handleAddExtraTaskComment = (projectId, taskId, text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    syncProject(projectId, p => {
      const comment = { id: Date.now(), author: currentUser.name, text: trimmed, time: nowStored() };
      return { ...p, extraTasks: (p.extraTasks || []).map(et => et.id === taskId ? { ...et, comments: [...(et.comments || []), comment] } : et) };
    });
  };

  const handleDeleteExtraTask = (projectId, taskId) => {
    syncProject(projectId, p => {
      const task = (p.extraTasks || []).find(t => t.id === taskId);
      return addLog({ ...p, extraTasks: (p.extraTasks || []).filter(t => t.id !== taskId) }, 'EXTRA_DELETE', `추가 작업 삭제: ${task?.name || ''}`);
    });
  };

  const handleAddIssue = (newIssue) => {
    const selectedProject = projects.find(p => p.id === newIssue.projectId);
    const issueWithDetails = { ...newIssue, id: generateUniqueId('ISS'), projectName: selectedProject ? selectedProject.name : '알 수 없는 프로젝트', date: TODAY.toISOString().split('T')[0], status: '이슈 확인', comments: [] };
    syncIssues([issueWithDetails, ...issues]);
    syncProject(newIssue.projectId, p => addLog(p, 'ISSUE_ADD', `이슈 등록: ${issueWithDetails.title} (${newIssue.severity})`));
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
    const commentData = { id: Date.now(), author: currentUser.name, text, date: nowStored() };
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
      syncProject(issue.projectId, p => addLog(p, 'ISSUE_UPDATE', changeSummary));
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
    syncProject(newPart.projectId, p => addLog(p, 'PART_ADD', `자재 청구: ${newPart.partName} ${newPart.quantity}EA (${newPart.urgency})`));
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

  const syncPipelineParts = (updated) => {
    setPipelineParts(updated);
    saveToGoogleDB('UPDATE_PIPELINE_PARTS', updated);
  };

  const syncPartEvents = (updated) => {
    setPartEvents(updated);
    saveToGoogleDB('UPDATE_PART_EVENTS', updated);
  };

  const handleAddPipelinePart = (newPart) => {
    const selectedProject = projects.find(p => p.id === newPart.projectId);
    const part = {
      ...newPart,
      id: generateUniqueId('PLT'),
      projectName: selectedProject ? selectedProject.name : t('알 수 없는 프로젝트', 'Unknown Project'),
      currentStage: '설계',
      date: TODAY.toISOString().split('T')[0],
    };
    const updatedParts = [part, ...pipelineParts];
    syncPipelineParts(updatedParts);
    const startEvent = createStageRecord(part.id, '설계', currentUser?.name || currentUser?.id || 'system', {}, '진행중');
    syncPartEvents([startEvent, ...partEvents]);
    setIsPipelinePartModalOpen(false);
    showToast(t('파트가 등록되었습니다.', 'Part registered.'));
  };

  const handleAdvancePipelineStage = (partId, nextStage, stageData) => {
    const { checklistResults = {}, notes = '', photoUrls = '', status = '완료' } = stageData;
    const part = pipelineParts.find(p => p.id === partId);
    if (!part) return;
    if (!canAdvanceStage(part.currentStage, nextStage, partEvents, partId)) {
      showToast(t('QC 합격 기록이 없으면 제조 단계로 진입할 수 없습니다.', 'QC must pass before manufacturing.'));
      return;
    }
    const event = createStageRecord(partId, part.currentStage, currentUser?.name || currentUser?.id || 'system', checklistResults, status, notes, photoUrls);
    syncPartEvents([event, ...partEvents]);
    syncPipelineParts(pipelineParts.map(p => p.id === partId ? { ...p, currentStage: nextStage } : p));
    setIsPartStageModalOpen(false);
    setPartStageTarget(null);
    showToast(t(`${nextStage} 단계로 이동했습니다.`, `Moved to ${nextStage}.`));
  };

  const handleRejectPipelineStage = (partId, fromStage, notes) => {
    const prevStageMap = { QC: '구매', 제조: 'QC', 납품: '제조' };
    const prevStage = prevStageMap[fromStage] || fromStage;
    const event = createStageRecord(partId, fromStage, currentUser?.name || currentUser?.id || 'system', {}, '불합격', notes);
    syncPartEvents([event, ...partEvents]);
    syncPipelineParts(pipelineParts.map(p => p.id === partId ? { ...p, currentStage: prevStage } : p));
    setIsPartStageModalOpen(false);
    setPartStageTarget(null);
    showToast(t(`${fromStage} 불합격 — ${prevStage} 단계로 반려됐습니다.`, `${fromStage} failed — returned to ${prevStage}.`));
  };

  const handleDeletePipelinePart = () => {
    if (!pipelinePartToDelete) return;
    syncPipelineParts(pipelineParts.filter(p => p.id !== pipelinePartToDelete.id));
    syncPartEvents(partEvents.filter(e => e.partId !== pipelinePartToDelete.id));
    setPipelinePartToDelete(null);
    showToast(t('파트가 삭제되었습니다.', 'Part deleted.'));
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

  // === 고객사 핸들러 ===
  const handleSubmitCustomer = (payload) => {
    const stamp = new Date().toISOString();
    if (customerEditTarget) {
      const updated = customers.map(c => c.id === customerEditTarget.id ? { ...c, ...payload, id: customerEditTarget.id, updatedAt: stamp } : c);
      syncCustomers(updated);
      // 이름이 변경됐다면 기존 텍스트 매칭 재시도 (이름이 바뀌면 기존 customerId는 그대로 유지)
      showToast(t('고객사 정보가 수정되었습니다.', 'Customer updated.'));
    } else {
      const newCustomer = { ...payload, id: generateUniqueId('CST'), createdAt: stamp };
      const nextCustomers = [newCustomer, ...customers];
      syncCustomers(nextCustomers);
      // 신규 등록 시 같은 이름의 미연결 프로젝트·사이트 자동 매칭
      const k = String(payload.name || '').trim().toLowerCase();
      if (k) {
        const matchP = projects.filter(p => !p.customerId && String(p.customer || '').trim().toLowerCase() === k);
        const matchS = sites.filter(s => !s.customerId && String(s.customer || '').trim().toLowerCase() === k);
        if (matchP.length > 0) {
          syncProjects(projects.map(p => (!p.customerId && String(p.customer || '').trim().toLowerCase() === k) ? { ...p, customerId: newCustomer.id } : p));
        }
        if (matchS.length > 0) {
          syncSites(sites.map(s => (!s.customerId && String(s.customer || '').trim().toLowerCase() === k) ? { ...s, customerId: newCustomer.id } : s));
        }
        const linked = matchP.length + matchS.length;
        showToast(t(
          linked > 0 ? `고객사가 등록되었고 ${linked}건이 자동 연결됐습니다.` : '고객사가 등록되었습니다.',
          linked > 0 ? `Customer added; ${linked} items auto-linked.` : 'Customer added.'
        ));
      } else {
        showToast(t('고객사가 등록되었습니다.', 'Customer added.'));
      }
    }
    setIsCustomerModalOpen(false);
    setCustomerEditTarget(null);
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    const id = customerToDelete.id;
    syncCustomers(customers.filter(c => c.id !== id));
    // 연결되어 있던 프로젝트·사이트는 customerId만 해제 (텍스트는 보존)
    const detachedP = projects.some(p => p.customerId === id);
    const detachedS = sites.some(s => s.customerId === id);
    if (detachedP) syncProjects(projects.map(p => p.customerId === id ? { ...p, customerId: '' } : p));
    if (detachedS) syncSites(sites.map(s => s.customerId === id ? { ...s, customerId: '' } : s));
    setCustomerToDelete(null);
    showToast(t('고객사가 삭제되었습니다. (연결됐던 프로젝트·사이트는 텍스트 정보로 유지)', 'Customer deleted; linked items kept as text.'));
  };

  // 고객사 모달에서 → 기존 사이트/프로젝트를 이 고객사로 연결 (customer 텍스트도 같이 갱신)
  // 1) 함수형 setState: closure 안 stale state로 인한 누락 방지
  // 2) 디바운스 GAS 저장: 연속 attach/detach 시 비동기 POST 도착 순서 경합으로
  //    이전 변경이 덮어써져 사라지는 문제 방지 (마지막 상태 1회만 GAS 반영)
  const handleAttachSiteToCustomer = (siteId, customerId) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    setSites(prev => {
      const next = prev.map(s => s.id === siteId ? { ...s, customerId: cust.id, customer: cust.name } : s);
      scheduleSave('sites', 'UPDATE_SITES', next);
      return next;
    });
    showToast(t(`사이트가 "${cust.name}"에 연결됐습니다.`, `Site linked to "${cust.name}".`));
  };
  // role: 'endUser' (엔드유저) | 'vendor' (설비업체)
  // 한 프로젝트가 두 역할 모두 가질 수 있음 (예: 엔드유저=SK하이닉스, 설비업체=ASML)
  const handleAttachProjectToCustomer = (projectId, customerId, role = 'endUser') => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== projectId) return p;
        if (role === 'vendor') {
          return { ...p, vendorId: cust.id, vendor: cust.name };
        }
        // endUser: 호환을 위해 customerId/customer도 동기 갱신
        return { ...p, endUserId: cust.id, endUser: cust.name, customerId: cust.id, customer: cust.name };
      });
      scheduleSave('projects', 'UPDATE_PROJECTS', next);
      return next;
    });
    const roleLabel = role === 'vendor' ? t('설비업체', 'Vendor') : t('엔드유저', 'End User');
    showToast(t(`프로젝트가 "${cust.name}" ${roleLabel}로 연결됐습니다.`, `Project linked to "${cust.name}" as ${roleLabel}.`));
  };

  // 개별 프로젝트·사이트 연결 해제 — customerId + customer 텍스트 둘 다 비움
  // (텍스트만 남기면 자동 매칭이 다시 customerId를 채워서 "해제가 안 된 것"처럼 보임)
  const handleDetachProjectFromCustomer = (projectId, role = 'endUser') => {
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== projectId) return p;
        if (role === 'vendor') {
          return { ...p, vendorId: '', vendor: '' };
        }
        return { ...p, endUserId: '', endUser: '', customerId: '', customer: '' };
      });
      scheduleSave('projects', 'UPDATE_PROJECTS', next);
      return next;
    });
    const roleLabel = role === 'vendor' ? t('설비업체', 'Vendor') : t('엔드유저', 'End User');
    showToast(t(`프로젝트 ${roleLabel} 연결이 해제됐습니다.`, `Project ${roleLabel} unlinked.`));
  };
  const handleDetachSiteFromCustomer = (siteId) => {
    setSites(prev => {
      const next = prev.map(s => s.id === siteId ? { ...s, customerId: '', customer: '' } : s);
      scheduleSave('sites', 'UPDATE_SITES', next);
      return next;
    });
    showToast(t('사이트 연결이 해제됐습니다. (고객사명도 비워짐)', 'Site unlinked (customer cleared).'));
  };

  // 자동 발견된 고객사들을 한 번에 등록
  const handleQuickRegisterCustomers = (unregisteredList) => {
    if (!Array.isArray(unregisteredList) || unregisteredList.length === 0) return;
    const stamp = new Date().toISOString();
    const newOnes = unregisteredList.map(u => ({
      id: generateUniqueId('CST'),
      name: u.name,
      domain: u.domain || '',
      phone: '', address: '', note: '',
      contacts: [],
      createdAt: stamp
    }));
    const nextCustomers = [...newOnes, ...customers];
    syncCustomers(nextCustomers);
    // 매칭 다시 적용
    const nameToId = new Map();
    nextCustomers.forEach(c => {
      const k = String(c.name || '').trim().toLowerCase();
      if (k) nameToId.set(k, c.id);
    });
    syncProjects(projects.map(p => {
      if (p.customerId) return p;
      const id = nameToId.get(String(p.customer || '').trim().toLowerCase());
      return id ? { ...p, customerId: id } : p;
    }));
    syncSites(sites.map(s => {
      if (s.customerId) return s;
      const id = nameToId.get(String(s.customer || '').trim().toLowerCase());
      return id ? { ...s, customerId: id } : s;
    }));
    showToast(t(`${newOnes.length}개 고객사가 등록되고 자동 연결됐습니다.`, `${newOnes.length} customers added and auto-linked.`));
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
    syncProject(projectId, p => {
      const fromManager = p.manager || '미지정';
      const historyEntry = { from: fromManager, to: newManager, date: todayStr, reason, changedBy: currentUser.name };
      return addLog({ ...p, manager: newManager, managerHistory: [...(p.managerHistory || []), historyEntry] }, 'MANAGER_CHANGE', `${fromManager} → ${newManager}${reason ? ' (' + reason + ')' : ''}`);
    });
    setIsManagerModalOpen(false);
    showToast(t('담당자가 변경되었습니다.', 'Manager changed.'));
  };

  // === 고객 요청사항 핸들러 ===
  const handleAddCustomerRequest = (projectId, data) => {
    const request = { id: Date.now(), requester: data.requester, content: data.content, urgency: data.urgency, status: '접수', date: nowStored(), responses: [] };
    syncProject(projectId, p => addLog({ ...p, customerRequests: [...(p.customerRequests || []), request] }, 'REQUEST_ADD', `고객 요청: ${data.requester} - ${data.content.substring(0, 30)}${data.content.length > 30 ? '...' : ''}`));
  };

  const handleUpdateCustomerRequestStatus = (projectId, requestId, newStatus, resolution) => {
    const todayStr = nowStored();
    syncProject(projectId, p => {
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
    });
  };

  const handleAddCustomerResponse = (projectId, requestId, text) => {
    const response = { author: currentUser.name, text, date: nowStored() };
    syncProject(projectId, p => ({
      ...p,
      customerRequests: (p.customerRequests || []).map(r => r.id === requestId ? { ...r, responses: [...(r.responses || []), response] } : r)
    }));
  };

  const handleDeleteCustomerRequest = (projectId, requestId) => {
    syncProject(projectId, p => ({ ...p, customerRequests: (p.customerRequests || []).filter(r => r.id !== requestId) }));
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
    const mainId = payload.engineerId;
    const companions = Array.isArray(payload.companions)
      ? payload.companions
          .filter(c => c && c.id && c.id !== mainId)
          .map(c => ({ id: c.id, name: c.name || (engineers.find(e => e.id === c.id) || {}).name || '' }))
      : [];
    const trip = {
      id: Date.now(),
      engineerId: mainId,
      engineerName: (engineers.find(e => e.id === mainId) || {}).name || '',
      companions,
      departureDate: payload.departureDate,
      returnDate: payload.returnDate,
      note: payload.note || '',
      createdAt: nowStored(),
      createdBy: currentUser.name
    };
    const companionLabel = companions.length > 0 ? ` + ${companions.map(c => c.name).filter(Boolean).join(', ')}` : '';
    syncProject(projectId, p => addLog({ ...p, trips: [...(p.trips || []), trip] }, 'TRIP_ADD', `출장 등록: ${trip.engineerName}${companionLabel} (${trip.departureDate}~${trip.returnDate})`));
  };

  const handleUpdateTrip = (projectId, tripId, updates, changeSummary) => {
    syncProject(projectId, p => {
      const next = { ...p, trips: (p.trips || []).map(tr => tr.id === tripId ? { ...tr, ...updates } : tr) };
      return changeSummary ? addLog(next, 'TRIP_UPDATE', changeSummary) : next;
    });
  };

  const handleDeleteTrip = (projectId, tripId) => {
    syncProject(projectId, p => {
      const trip = (p.trips || []).find(tr => tr.id === tripId);
      return addLog({ ...p, trips: (p.trips || []).filter(tr => tr.id !== tripId) }, 'TRIP_DELETE', `출장 삭제: ${trip?.engineerName || ''} (${trip?.departureDate || ''}~${trip?.returnDate || ''})`);
    });
  };

  // === AS 핸들러 ===
  const handleAddAS = async (projectId, data) => {
    const category = data.category === 'SW' ? 'SW' : 'HW';
    // 파일 첨부 (선택, 다중) — 회의록과 동일 패턴, Drive 카테고리 'AS'로 분류
    const filesIn = Array.isArray(data.files) ? data.files : [];
    const onProgress = data.onProgress;
    const filesMeta = [];
    for (let i = 0; i < filesIn.length; i++) {
      const meta = await handleUploadAttachment(
        projectId,
        filesIn[i],
        (p) => onProgress && onProgress({ percent: p && p.percent, index: i }),
        'AS'
      );
      if (!meta) return; // 한 개라도 실패하면 중단 (이미 올라간 건 Drive에 남음 — 레코드 미생성)
      filesMeta.push({
        fileId: meta.fileId, fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size,
        viewUrl: meta.viewUrl, downloadUrl: meta.downloadUrl
      });
    }
    const coEngineers = Array.isArray(data.coEngineers)
      ? data.coEngineers
          .filter(c => c && c.id && c.id !== data.engineer && c.name !== data.engineer)
          .map(c => ({ id: c.id, name: c.name || '' }))
      : [];
    const record = {
      id: Date.now(),
      category, type: data.type, engineer: data.engineer,
      coEngineers,
      description: data.description, resolution: data.resolution || '',
      // V3 흡수 — 풍부 필드 (모두 선택 입력)
      priority: data.priority === '긴급' ? '긴급' : '보통',
      manager: data.manager || '',
      contact: data.contact || '',
      serial: data.serial || '',
      part: data.part || '',
      cost: data.cost || '',
      reqDate: data.reqDate || '', // 희망 처리일정
      visit: data.visit || '',     // 방문 시 필요사항
      // 처리 코멘트(답글) 누적
      comments: [],
      // 완료 시 보고서 메타 (보고서 첨부 또는 N/A)
      report: null,
      status: '접수',
      date: nowStored(),
      files: filesMeta
    };
    syncProject(projectId, p => addLog({ ...p, asRecords: [...(p.asRecords || []), record] }, 'AS_ADD', `AS 등록 [${category}] (${data.type})${record.priority === '긴급' ? ' [긴급]' : ''}: ${data.description.substring(0, 30)}${data.description.length > 30 ? '...' : ''}`));
  };

  // 답글/처리 코멘트 추가 — 작성자/시각/내용
  const handleAddASComment = (projectId, asId, text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    syncProject(projectId, p => {
      const comment = { id: Date.now(), author: currentUser.name, text: trimmed, time: nowStored() };
      return { ...p, asRecords: (p.asRecords || []).map(a => a.id === asId ? { ...a, comments: [...(a.comments || []), comment] } : a) };
    });
  };

  // 완료 처리 (보고서 첨부 필수 또는 N/A 명시) — Drive 업로드 후 메타 저장
  const handleCompleteAS = async (projectId, asId, opts) => {
    const isNA = !!(opts && opts.isNA);
    const file = opts && opts.file;
    let reportMeta = null;
    if (!isNA && file) {
      reportMeta = await handleUploadAttachment(projectId, file, opts.onProgress, 'AS');
      if (!reportMeta) return;
      reportMeta = { fileId: reportMeta.fileId, fileName: reportMeta.fileName, mimeType: reportMeta.mimeType, size: reportMeta.size, viewUrl: reportMeta.viewUrl, downloadUrl: reportMeta.downloadUrl };
    }
    syncProject(projectId, p => {
      const asRec = (p.asRecords || []).find(a => a.id === asId);
      const updated = { ...p, asRecords: (p.asRecords || []).map(a => a.id === asId ? { ...a, status: '완료', report: isNA ? { naReason: (opts && opts.naReason) || 'N/A', completedAt: nowStored() } : { ...reportMeta, completedAt: nowStored() } } : a) };
      return addLog(updated, 'AS_UPDATE', `AS 완료: ${asRec?.type || ''}${isNA ? ' (보고서 N/A)' : reportMeta ? ` (보고서: ${reportMeta.fileName})` : ''}`);
    });
  };

  // 완료 취소 (사유 입력 필수) — 상태를 직전 단계로 되돌리고 코멘트에 사유 기록
  const handleRevertCompleteAS = (projectId, asId, reason) => {
    const r = (reason || '').trim();
    if (!r) return;
    syncProject(projectId, p => {
      const asRec = (p.asRecords || []).find(a => a.id === asId);
      if (!asRec) return p;
      const prevStatus = (asRec.category || 'HW') === 'SW' ? '검증' : '조치';
      const comment = { id: Date.now(), author: currentUser.name, text: `[완료 취소] ${r}`, time: nowStored() };
      const updated = { ...p, asRecords: (p.asRecords || []).map(a => a.id === asId ? { ...a, status: prevStatus, comments: [...(a.comments || []), comment] } : a) };
      return addLog(updated, 'AS_UPDATE', `AS 완료 취소: ${asRec.type} → ${prevStatus} (사유: ${r.substring(0, 40)})`);
    });
  };

  const handleUpdateAS = (projectId, asId, updates) => {
    syncProject(projectId, p => {
      const updated = { ...p, asRecords: (p.asRecords || []).map(a => a.id === asId ? { ...a, ...updates } : a) };
      if (updates.status) {
        const as = p.asRecords.find(a => a.id === asId);
        return addLog(updated, 'AS_UPDATE', `AS 상태: ${as?.type || ''} → ${updates.status}`);
      }
      return updated;
    });
  };

  const handleDeleteAS = (projectId, asId) => {
    syncProject(projectId, p => ({ ...p, asRecords: (p.asRecords || []).filter(a => a.id !== asId) }));
  };

  const handleEditProject = (projectId, data) => {
    // ADMIN 가드 — 산업군 변경은 ADMIN만. 사전 검사 후 syncProject 호출.
    const target = projects.find(p => p.id === projectId);
    if (target && data.domain !== undefined && target.domain !== data.domain && currentUser.role !== 'ADMIN') {
      showToast(t('산업군은 관리자만 수정할 수 있습니다.', 'Domain can only be changed by admin.'));
      return;
    }
    syncProject(projectId, p => {
      const changes = [];
      const fmtDate = (v) => v || '미정';
      if (data.domain !== undefined && p.domain !== data.domain) {
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
    });
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
    syncProject(projectId, p => addLog({ ...p, versions: [...(p.versions || []), entry] }, 'VERSION_CHANGE', `[${entry.category}] ${entry.version}${entry.note ? ` — ${entry.note}` : ''}`));
  };
  // 초기 이력 일괄 등록 — 시스템 도입 전 기존 버전 이력을 한 번에 등록
  const handleAddVersionsBulk = (projectId, entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const baseTs = Date.now();
    const newOnes = entries.map((e, i) => ({
      id: baseTs + i,
      category: e.category,
      version: e.version,
      releaseDate: e.releaseDate || '',
      note: e.note || '(초기 이력 일괄 등록)',
      author: `${currentUser.name} (initial import)`
    }));
    syncProject(projectId, p => addLog(
      { ...p, versions: [...(p.versions || []), ...newOnes] },
      'VERSION_CHANGE',
      `초기 버전 이력 일괄 등록 (${newOnes.length}건)`
    ));
    showToast(`버전 이력 ${newOnes.length}건 등록됨`);
  };

  const handleUpdateVersion = (projectId, versionId, updates) => {
    syncProject(projectId, p => ({ ...p, versions: (p.versions || []).map(v => v.id === versionId ? { ...v, ...updates } : v) }));
  };
  const handleDeleteVersion = (projectId, versionId) => {
    syncProject(projectId, p => {
      const v = (p.versions || []).find(x => x.id === versionId);
      return addLog({ ...p, versions: (p.versions || []).filter(x => x.id !== versionId) }, 'VERSION_DELETE', `[${v?.category || ''}] ${v?.version || ''} 삭제`);
    });
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
      uploadedAt: nowStored()
    };
    // 회의록/노트/AS 카테고리는 별도 흐름이 부르므로 attachments에 넣지 않고 그대로 반환
    if (cat === '회의록' || cat === '노트' || cat === 'AS') {
      if (onProgress) onProgress({ stage: 'done', percent: 100 });
      return attachment;
    }
    // 여러 파일 연속 업로드 시 stale closure 방지 — syncProject가 prev 기반으로 처리
    syncProject(projectId, p => addLog({ ...p, attachments: [...(p.attachments || []), attachment] }, 'ATTACH_ADD', `${cat} 업로드: ${attachment.fileName}`));
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
    syncProject(projectId, p => addLog({ ...p, attachments: (p.attachments || []).filter(a => a.id !== attachmentId) }, 'ATTACH_DELETE', `참고자료 삭제: ${target.fileName}`));
    showToast(t('참고자료가 삭제되었습니다.', 'Attachment deleted.'));
  };

  // 회의록 / 노트 등록: text(본문) + kind('meeting'|'note') + summary(선택) + meetingDate/attendees/decisions/actions(회의록 상세 모드 선택) + files[] (선택, 다중)
  const handleAddNote = async (projectId, text, opts) => {
    const kind = (opts && opts.kind === 'note') ? 'note' : 'meeting';
    const summary = (opts && opts.summary) || '';
    const meetingDate = (kind === 'meeting' && opts && opts.meetingDate) || '';
    const attendees = (kind === 'meeting' && opts && opts.attendees) || '';
    const decisions = (kind === 'meeting' && opts && opts.decisions) || '';
    const actions = (kind === 'meeting' && opts && opts.actions) || '';
    // 백워드 호환: 단일 file 또는 다중 files 모두 수용
    const filesIn = (opts && Array.isArray(opts.files)) ? opts.files
      : (opts && opts.file) ? [opts.file] : [];
    const onProgress = opts && opts.onProgress;
    const filesMeta = [];
    const driveCategory = kind === 'note' ? '노트' : '회의록';
    for (let i = 0; i < filesIn.length; i++) {
      const meta = await handleUploadAttachment(
        projectId,
        filesIn[i],
        (p) => onProgress && onProgress({ percent: p && p.percent, index: i }),
        driveCategory
      );
      if (!meta) return; // 한 개라도 실패하면 중단 (이미 올라간 건 Drive에 남음 — 노트는 미생성)
      filesMeta.push({
        fileId: meta.fileId,
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        size: meta.size,
        viewUrl: meta.viewUrl,
        downloadUrl: meta.downloadUrl,
        folderUrl: meta.categoryFolderUrl || meta.folderUrl
      });
    }
    const note = {
      id: Date.now(),
      author: currentUser.name,
      kind,
      text,
      summary,
      meetingDate,
      attendees,
      decisions,
      actions,
      files: filesMeta,
      date: nowStored()
    };
    const firstName = filesMeta[0] && filesMeta[0].fileName;
    const kindLabel = kind === 'note' ? '노트' : '회의록';
    const headline = text ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : (firstName ? `${firstName}${filesMeta.length > 1 ? ` 외 ${filesMeta.length - 1}건` : ''}` : kindLabel);

    // 추가 프로젝트에도 동일 노트 등록 — 각 프로젝트의 Drive 폴더에 파일 별도 업로드해서 깔끔하게 독립 보관
    const extraIds = Array.isArray(opts && opts.additionalProjectIds) ? opts.additionalProjectIds.filter(id => id && id !== projectId) : [];
    const extraNotes = {}; // projectId → note
    for (const extraId of extraIds) {
      const extraFilesMeta = [];
      // 같은 File 객체를 다른 프로젝트 폴더에 재업로드 (독립적인 Drive 사본)
      for (let i = 0; i < filesIn.length; i++) {
        const meta = await handleUploadAttachment(extraId, filesIn[i], null, driveCategory);
        if (!meta) { /* 실패 시 그 프로젝트만 스킵하고 진행 */ continue; }
        extraFilesMeta.push({
          fileId: meta.fileId, fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size,
          viewUrl: meta.viewUrl, downloadUrl: meta.downloadUrl, folderUrl: meta.categoryFolderUrl || meta.folderUrl
        });
      }
      extraNotes[extraId] = {
        id: Date.now() + Math.floor(Math.random() * 1000) + extraIds.indexOf(extraId) + 1,
        author: currentUser.name,
        kind, text, summary, meetingDate, attendees, decisions, actions,
        files: extraFilesMeta,
        date: nowStored(),
        broadcastFrom: projectId  // 원본 프로젝트 표시 (참고용)
      };
    }

    // 원본 프로젝트 — delta 저장 (단건)
    syncProject(projectId, p => addLog({ ...p, notes: [...(p.notes || []), note] }, 'NOTE_ADD', `${kindLabel}: ${headline}${extraIds.length > 0 ? ` (+ ${extraIds.length}개 프로젝트에 동시 등록)` : ''}`));
    // 공유 대상 프로젝트들 — 각각 delta 저장 (병렬 N건이지만 행 단위 저장이라 전체 배열 덮어쓰기보다 가벼움)
    Object.keys(extraNotes).forEach(extraId => {
      syncProject(extraId, p => addLog({ ...p, notes: [...(p.notes || []), extraNotes[extraId]] }, 'NOTE_ADD', `${kindLabel} (공유): ${headline}`));
    });
  };

  // 회의록/노트 수정 — 메타·본문·첨부(제거+신규 추가) 일괄
  // updates: { kind, summary, text, meetingDate, attendees, decisions, actions, files (남길 기존 파일 메타 배열), newFiles (업로드할 File 객체 배열) }
  const handleEditNote = async (projectId, noteId, updates) => {
    const project = projects.find(p => p.id === projectId);
    const target = project && (project.notes || []).find(n => n.id === noteId);
    if (!target) return;
    // 새 파일 업로드 → 메타 (수정 후 kind 기준으로 폴더 분기)
    const kindFinal = updates.kind === 'note' ? 'note' : (updates.kind || target.kind || 'meeting');
    const editDriveCategory = kindFinal === 'note' ? '노트' : '회의록';
    const newFilesIn = Array.isArray(updates.newFiles) ? updates.newFiles : [];
    const newMetas = [];
    for (let i = 0; i < newFilesIn.length; i++) {
      const meta = await handleUploadAttachment(projectId, newFilesIn[i], null, editDriveCategory);
      if (!meta) return; // 업로드 실패 시 중단
      newMetas.push({
        fileId: meta.fileId, fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size,
        viewUrl: meta.viewUrl, downloadUrl: meta.downloadUrl, folderUrl: meta.categoryFolderUrl || meta.folderUrl
      });
    }
    // 제거된 기존 파일 — Drive에서도 휴지통으로 (안전; 실패해도 메타만 갱신)
    const keptFiles = Array.isArray(updates.files) ? updates.files : (Array.isArray(target.files) ? target.files : []);
    const removed = (target.files || []).filter(of => !keptFiles.some(kf => kf.fileId === of.fileId));
    for (const f of removed) {
      if (f && f.fileId) await callGoogleAction('DELETE_FILE', { fileId: f.fileId });
    }
    const finalFiles = [...keptFiles, ...newMetas];
    const kind = kindFinal;
    syncProject(projectId, p => {
      const updated = { ...p, notes: (p.notes || []).map(n => n.id !== noteId ? n : {
        ...n, kind,
        summary: updates.summary !== undefined ? updates.summary : n.summary,
        text: updates.text !== undefined ? updates.text : n.text,
        meetingDate: kind === 'meeting' ? (updates.meetingDate !== undefined ? updates.meetingDate : n.meetingDate) : '',
        attendees: kind === 'meeting' ? (updates.attendees !== undefined ? updates.attendees : n.attendees) : '',
        decisions: kind === 'meeting' ? (updates.decisions !== undefined ? updates.decisions : n.decisions) : '',
        actions: kind === 'meeting' ? (updates.actions !== undefined ? updates.actions : n.actions) : '',
        files: finalFiles,
        editedAt: nowStored()
      }) };
      const headline = (updates.text || target.text || '').substring(0, 30);
      return addLog(updated, 'NOTE_ADD', `${kind === 'note' ? '노트' : '회의록'} 수정: ${headline}${(updates.text || target.text || '').length > 30 ? '...' : ''}`);
    });
  };

  const handleDeleteNote = async (projectId, noteId) => {
    const project = projects.find(p => p.id === projectId);
    const target = project && (project.notes || []).find(n => n.id === noteId);
    // 첨부 파일들 Drive 휴지통으로 (실패해도 메타 삭제는 진행) — files[] 우선, 백워드 호환 file 단일도
    if (target) {
      const files = Array.isArray(target.files) ? target.files : (target.file ? [target.file] : []);
      for (const f of files) {
        if (f && f.fileId) {
          await callGoogleAction('DELETE_FILE', { fileId: f.fileId });
        }
      }
    }
    syncProject(projectId, p => ({ ...p, notes: (p.notes || []).filter(n => n.id !== noteId) }));
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

  // 동기화 중 전체 화면 차단 모달 — savingCount > 0 + 800ms 이상 지연 시 자동 표시
  // 빠른 save는 모달 없이 통과, 진짜 오래 걸릴 때만 차단.
  // 새로고침 경고는 beforeunload에서 별도 처리.
  // 데이터 보호 — 부팅 시 로컬 백업과 원격 불일치 안내 배너 (Track A3)
  const renderRestoreBanner = () => {
    if (!restoreCandidates || !restoreCandidates.projects || restoreCandidates.projects.length === 0) return null;
    return (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[350] max-w-2xl w-[92%] bg-amber-50 border-2 border-amber-300 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3">
        <svg className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1 text-xs">
          <div className="font-bold text-amber-900 mb-1">{t('복원 가능한 변경이 발견됐습니다', 'Recoverable changes detected')}</div>
          <div className="text-amber-800 leading-relaxed">{restoreCandidates.summary}</div>
          <div className="mt-1 text-amber-700/80">
            {t('다른 사용자가 덮어썼거나 일시적 동기화 오류일 수 있습니다. 콘솔(F12)에서 항목 확인 후 필요하면 재등록하세요.', 'May be overwritten by another user or transient sync error. Check console (F12) for details.')}
          </div>
        </div>
        <button onClick={() => setRestoreCandidates(null)} className="text-amber-700 hover:text-amber-900 shrink-0 text-lg font-bold leading-none" title={t('닫기', 'Dismiss')}>×</button>
      </div>
    );
  };

  // 비차단형 코너 인디케이터 — 저장 작업이 1건이라도 진행 중이면 우측 하단에 작게 표시.
  // 사용자는 계속 다른 작업 가능. 진짜 위험(새로고침/탭 이동)은 beforeunload 경고가 막아줌.
  const renderSyncingOverlay = () => {
    if (savingCount === 0) return null;
    return (
      <div className="fixed bottom-4 right-4 z-[400] bg-slate-800/95 text-white rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 text-xs font-bold pointer-events-none">
        <svg className="animate-spin h-3.5 w-3.5 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{t(`저장 중 ${savingCount}건`, `Saving ${savingCount}`)}</span>
      </div>
    );
  };

  // Shared modal props
  const taskModalProps = {
    project: projects.find(p => p.id === selectedProjectId),
    allProjects: projects,
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
    onAddExtraTask: handleAddExtraTask, onUpdateExtraTask: handleUpdateExtraTask, onDeleteExtraTask: handleDeleteExtraTask, onAddExtraTaskComment: handleAddExtraTaskComment, onImportExtraTasks: handleImportExtraTasks,
    onAddNote: handleAddNote, onDeleteNote: handleDeleteNote, onEditNote: handleEditNote,
    onAddCustomerRequest: handleAddCustomerRequest,
    onUpdateCustomerRequestStatus: handleUpdateCustomerRequestStatus,
    onAddCustomerResponse: handleAddCustomerResponse,
    onDeleteCustomerRequest: handleDeleteCustomerRequest,
    onAddAS: handleAddAS,
    onUpdateAS: handleUpdateAS,
    onDeleteAS: handleDeleteAS,
    onAddASComment: handleAddASComment,
    onCompleteAS: handleCompleteAS,
    onRevertCompleteAS: handleRevertCompleteAS,
    onUploadAttachment: handleUploadAttachment,
    onDeleteAttachment: handleDeleteAttachment,
    onDeleteProject: (prj) => { setIsTaskModalOpen(false); setProjectToDelete(prj); },
    driveConfigured: !!settings.driveRootFolderId,
    calcAct, currentUser, t,
    initialTab: taskModalInitialTab,
    engineers,
    onShowEngineer: (eid) => { setActivityEngineerId(eid); setIsActivityModalOpen(true); },
    customers,
    onOpenCustomer: (c) => { setCustomerEditTarget(c); setIsCustomerModalOpen(true); }
  };

  // === MOBILE MODE ===
  if (isMobileMode) {
    return (
      <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 animate-[fadeIn_0.3s_ease-in-out]">
        {renderToast()}
        {renderRestoreBanner()}
        {renderSyncingOverlay()}
        <div className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">M</div><div><h1 className="font-bold text-sm leading-tight">MAK-PMS</h1><p className="text-[10px] text-blue-300">{t('모바일 모드', 'Mobile Mode')}</p></div></div>
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
            {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} engineers={engineers} customers={customers} sites={sites} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onChangeManager={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onManageTeam={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onViewPhaseGantt={(prj) => { setPhaseGanttProject(prj); setIsPhaseGanttOpen(true); }} onEditProject={(prj) => { setProjectEditTarget(prj); setIsProjectEditOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onEditPhases={(prjId) => { setPhaseEditProjectId(prjId); setIsPhaseEditOpen(true); }} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onOpenCustomer={(c) => { setCustomerEditTarget(c); setIsCustomerModalOpen(true); }} onShowEngineer={(eid) => { setActivityEngineerId(eid); setIsActivityModalOpen(true); }} onJumpTo={(tab) => setActiveTab(tab)} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
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
          {isProjectModalOpen && <ProjectModal engineers={engineers} customers={customers} subDomainsBySettings={settings.subDomains} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
          {isIssueModalOpen && <MobileIssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
          {isPartModalOpen && <MobilePartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
          {isDailyReportOpen && <DailyReportModal projects={projects} onClose={() => setIsDailyReportOpen(false)} onSubmit={handleAddDailyReport} t={t} />}
          {isSiteModalOpen && <SiteModal site={selectedSite} customers={customers} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
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
      {renderRestoreBanner()}
      {renderSyncingOverlay()}
      <div className="flex flex-1 overflow-hidden">
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-200`}>
          <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : 'px-6'}`}>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0"><span className="text-white font-bold text-lg">M</span></div>
            {!sidebarCollapsed && <span className="text-white font-bold text-lg tracking-wider ml-3 truncate">MAK-PMS</span>}
          </div>
          <nav className={`flex-1 py-4 ${sidebarCollapsed ? 'px-2' : 'px-4'} space-y-1.5 overflow-y-auto`}>
            <NavItem icon={<LayoutDashboard size={20} />} label={t('대시보드', 'Dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={sidebarCollapsed} />
            <NavItem icon={<Kanban size={20} />} label={t('프로젝트 관리', 'Projects')} active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} collapsed={sidebarCollapsed} />
            <NavItem icon={<AlertTriangle size={20} />} label={t('이슈/펀치 관리', 'Issues')} active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} collapsed={sidebarCollapsed} />
            {currentUser.role !== 'CUSTOMER' && (
              <>
                <NavItem icon={<Wrench size={20} />} label={t('자재/스페어 파트', 'Parts')} active={activeTab === 'parts'} onClick={() => setActiveTab('parts')} collapsed={sidebarCollapsed} />
                {/* 고객사·사이트 — 고객사 + 사이트/유틸 통합 (탭) */}
                <NavItem icon={<Building2 size={20} />} label={t('고객사·사이트', 'Customers·Sites')} active={activeTab === 'master_data'} onClick={() => setActiveTab('master_data')} collapsed={sidebarCollapsed} />
                <NavItem icon={<Users size={20} />} label={t('인력/리소스 관리', 'Resources')} active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} collapsed={sidebarCollapsed} />
                <NavItem icon={<LifeBuoy size={20} />} label={t('AS 통합 관리', 'AS Management')} active={activeTab === 'as'} onClick={() => setActiveTab('as')} collapsed={sidebarCollapsed} />
                {settings.weeklyReportEnabled && (currentUser.role === 'ADMIN' || currentUser.weeklyReportEnabled) && (
                  <NavItem icon={<ClipboardList size={20} />} label={t('주간 업무 보고', 'Weekly Reports')} active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')} collapsed={sidebarCollapsed} />
                )}
                <NavItem icon={<GitCommit size={20} />} label={t('버전 릴리즈 관리', 'Releases')} active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} collapsed={sidebarCollapsed} />
              </>
            )}
            {currentUser.role === 'ADMIN' && (
              <>
                {/* 관리자 페이지 — 사용자 관리/시스템 설정/메일 이력/활동 이력 4탭 통합 */}
                <NavItem icon={<SettingsIcon size={20} />} label={t('관리자 페이지', 'Admin Page')} active={activeTab === 'admin_page'} onClick={() => setActiveTab('admin_page')} collapsed={sidebarCollapsed} />
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
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-3 md:px-8 z-10 shadow-sm shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {savingCount > 0 ? null : (
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-1 rounded-full border border-emerald-200 shadow-sm" title={t('모든 변경이 서버에 저장됨 — 새로고침해도 안전', 'All changes saved — safe to reload')}>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  {t('저장됨', 'Saved')}
                </span>
              )}
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
              {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} engineers={engineers} customers={customers} sites={sites} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onChangeManager={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onManageTeam={(prj) => { setTeamEditProjectId(prj.id); setIsTeamModalOpen(true); }} onViewPhaseGantt={(prj) => { setPhaseGanttProject(prj); setIsPhaseGanttOpen(true); }} onEditProject={(prj) => { setProjectEditTarget(prj); setIsProjectEditOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onEditPhases={(prjId) => { setPhaseEditProjectId(prjId); setIsPhaseEditOpen(true); }} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onOpenCustomer={(c) => { setCustomerEditTarget(c); setIsCustomerModalOpen(true); }} onShowEngineer={(eid) => { setActivityEngineerId(eid); setIsActivityModalOpen(true); }} onJumpTo={(tab) => setActiveTab(tab)} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
              {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
              {activeTab === 'parts' && (
                <PartsListView
                  parts={parts}
                  pipelineParts={pipelineParts}
                  partEvents={partEvents}
                  getStatusColor={getStatusColor}
                  onUpdateStatus={handleUpdatePartStatus}
                  onDeletePart={(part) => setPartToDelete(part)}
                  onAddClick={() => setIsPartModalOpen(true)}
                  onAddPipelinePart={() => setIsPipelinePartModalOpen(true)}
                  onOpenStageModal={(part, nextStage) => { setPartStageTarget({ part, nextStage }); setIsPartStageModalOpen(true); }}
                  onOpenQRLabel={(part) => { setQrLabelTarget(part); setIsQRLabelModalOpen(true); }}
                  onDeletePipelinePart={(part) => setPipelinePartToDelete(part)}
                  currentUser={currentUser}
                  t={t}
                />
              )}
              {/* 마스터 데이터 — 고객사 + 사이트 통합 탭. legacy 'sites'/'customers' 진입 시 defaultTab 분기. */}
              {(activeTab === 'master_data' || activeTab === 'sites' || activeTab === 'customers') && currentUser.role !== 'CUSTOMER' && (
                <MasterDataView
                  customers={customers}
                  sites={sites}
                  projects={projects}
                  onCustomerAdd={() => { setCustomerEditTarget(null); setIsCustomerModalOpen(true); }}
                  onCustomerEdit={(c) => { setCustomerEditTarget(c); setIsCustomerModalOpen(true); }}
                  onCustomerDelete={(c) => setCustomerToDelete(c)}
                  onQuickRegister={handleQuickRegisterCustomers}
                  onSiteAdd={() => { setSelectedSite(null); setIsSiteModalOpen(true); }}
                  onSiteEdit={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }}
                  onSiteDelete={(site) => setSiteToDelete(site)}
                  currentUser={currentUser}
                  defaultTab={activeTab === 'sites' ? 'sites' : 'customers'}
                  t={t}
                />
              )}
              {activeTab === 'resources' && <ResourceListView engineers={engineers} projects={projects} issues={issues} getStatusColor={getStatusColor} TODAY={TODAY} onAddClick={() => { setSelectedEngineer(null); setIsEngineerModalOpen(true); }} onEditClick={(eng) => { setSelectedEngineer(eng); setIsEngineerModalOpen(true); }} onManageCertificates={(eng) => { setCertEngineerId(eng.id); setIsCertModalOpen(true); }} onShowActivity={(eng) => { setActivityEngineerId(eng.id); setIsActivityModalOpen(true); }} onDeleteClick={(eng) => setEngineerToDelete(eng)} currentUser={currentUser} t={t} />}
              {activeTab === 'as' && currentUser.role !== 'CUSTOMER' && (
                <ASManagementView projects={projects} users={users} customers={customers} onProjectClick={openProjectDetail} onUpdateAS={handleUpdateAS} onAddAS={handleAddAS} onAddASComment={handleAddASComment} onCompleteAS={handleCompleteAS} onRevertCompleteAS={handleRevertCompleteAS} onUploadAttachment={handleUploadAttachment} driveConfigured={!!settings.driveRootFolderId} mailGasUrl={settings.mailGasUrl} currentUser={currentUser} t={t} />
              )}
              {activeTab === 'weekly' && currentUser.role !== 'CUSTOMER' && (
                (settings.weeklyReportEnabled && (currentUser.role === 'ADMIN' || currentUser.weeklyReportEnabled)) ? (
                  <WeeklyReportView
                    projects={projects} issues={issues} engineers={engineers}
                    users={users}
                    weeklyReports={weeklyReports} currentUser={currentUser}
                    onSaveReport={upsertWeeklyReport}
                    onSubmitReport={upsertWeeklyReport}
                    onApproveReport={upsertWeeklyReport}
                    onReturnReport={upsertWeeklyReport}
                    t={t}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
                    {!settings.weeklyReportEnabled
                      ? t('주간 업무 보고 기능이 비활성화되어 있습니다. 시스템 설정 → 주간 업무 보고에서 활성화하세요.', 'Weekly Reports is disabled. Enable in System Settings.')
                      : t('주간 업무 보고 권한이 없습니다. 관리자에게 요청하세요.', 'You do not have permission for Weekly Reports. Contact ADMIN.')}
                  </div>
                )
              )}
              {activeTab === 'versions' && <VersionHistoryView projects={projects} releases={releases} onAddClick={() => setIsReleaseModalOpen(true)} onDeleteRelease={(release) => setReleaseToDelete(release)} currentUser={currentUser} t={t} />}
              {/* 관리자 페이지 — 4탭 통합 (사용자 관리 / 시스템 설정 / 메일 이력 / 활동 이력)
                  legacy 라우팅(users / settings / mail_log / change_log / admin_config / admin_logs)도 호환 */}
              {(activeTab === 'admin_page' || activeTab === 'admin_config' || activeTab === 'admin_logs' || activeTab === 'settings' || activeTab === 'users' || activeTab === 'mail_log' || activeTab === 'change_log') && currentUser.role === 'ADMIN' && (
                <AdminConfigView
                  users={users}
                  projects={projects}
                  currentUser={currentUser}
                  settings={settings}
                  onAddUser={() => { setUserEditTarget(null); setIsUserModalOpen(true); }}
                  onEditUser={(u) => { setUserEditTarget(u); setIsUserModalOpen(true); }}
                  onResetPassword={handleResetUserPassword}
                  onToggleActive={handleToggleUserActive}
                  onToggleWeeklyReport={handleToggleUserWeeklyReport}
                  onToggleTeamLead={handleToggleUserTeamLead}
                  onDeleteUser={(u) => setUserToDelete(u)}
                  onSaveSettings={syncSettings}
                  defaultTab={activeTab === 'settings' ? 'settings' : activeTab === 'mail_log' || activeTab === 'admin_logs' ? 'mail' : activeTab === 'change_log' ? 'change' : 'users'}
                  t={t}
                />
              )}
            </Suspense>
          </div>

          <Suspense fallback={null}>
            {isProjectModalOpen && <ProjectModal engineers={engineers} customers={customers} subDomainsBySettings={settings.subDomains} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
            {isIssueModalOpen && <IssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
            {isPartModalOpen && <PartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
            {isPipelinePartModalOpen && (
              <PartPipelineModal
                projects={projects}
                onClose={() => setIsPipelinePartModalOpen(false)}
                onSubmit={handleAddPipelinePart}
                t={t}
              />
            )}
            {isQRLabelModalOpen && qrLabelTarget && (
              <QRLabelModal
                part={qrLabelTarget}
                onClose={() => { setIsQRLabelModalOpen(false); setQrLabelTarget(null); }}
                t={t}
              />
            )}
            {isPartStageModalOpen && partStageTarget && (
              isMobileMode
                ? <MobilePartPipelineModal
                    part={partStageTarget.part}
                    nextStage={partStageTarget.nextStage}
                    partEvents={partEvents}
                    onClose={() => { setIsPartStageModalOpen(false); setPartStageTarget(null); }}
                    onAdvance={handleAdvancePipelineStage}
                    onReject={handleRejectPipelineStage}
                    t={t}
                  />
                : <PartStageModal
                    part={partStageTarget.part}
                    nextStage={partStageTarget.nextStage}
                    partEvents={partEvents}
                    onClose={() => { setIsPartStageModalOpen(false); setPartStageTarget(null); }}
                    onAdvance={handleAdvancePipelineStage}
                    onReject={handleRejectPipelineStage}
                    t={t}
                  />
            )}
            {pipelinePartToDelete && (
              <DeleteConfirmModal
                type="part"
                item={pipelinePartToDelete}
                onClose={() => setPipelinePartToDelete(null)}
                onConfirm={handleDeletePipelinePart}
                t={t}
              />
            )}
            {isSiteModalOpen && <SiteModal site={selectedSite} customers={customers} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
            {isCustomerModalOpen && (
              <CustomerModal
                customer={customerEditTarget}
                sites={sites}
                projects={projects}
                onClose={() => { setIsCustomerModalOpen(false); setCustomerEditTarget(null); }}
                onSubmit={handleSubmitCustomer}
                onDetachProject={handleDetachProjectFromCustomer}
                onDetachSite={handleDetachSiteFromCustomer}
                onAttachSite={handleAttachSiteToCustomer}
                onAttachProject={handleAttachProjectToCustomer}
                t={t}
              />
            )}
            {isTaskModalOpen && <TaskModal {...taskModalProps} />}
            {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} engineers={engineers} currentUser={currentUser} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} onUpdateIssue={handleUpdateIssue} getStatusColor={getStatusColor} t={t} />}
            {isVersionModalOpen && versionEditProject && (() => {
              const liveProject = projects.find(p => p.id === versionEditProject.id);
              if (!liveProject) return null;
              return <VersionModal project={liveProject} onClose={() => setIsVersionModalOpen(false)} onAdd={handleAddVersion} onAddBulk={handleAddVersionsBulk} onUpdate={handleUpdateVersion} onDelete={handleDeleteVersion} t={t} />;
            })()}
            {isPhaseGanttOpen && <PhaseGanttModal project={phaseGanttProject} onClose={() => setIsPhaseGanttOpen(false)} t={t} />}
            {isProjectEditOpen && <ProjectEditModal project={projectEditTarget} engineers={engineers} customers={customers} currentUser={currentUser} subDomainsBySettings={settings.subDomains} onClose={() => setIsProjectEditOpen(false)} onSubmit={handleEditProject} t={t} />}
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
              return <ProjectTeamModal project={liveProject} engineers={engineers} users={users} customers={customers} currentUser={currentUser} mailGasUrl={settings.mailGasUrl} onClose={() => { setIsTeamModalOpen(false); setTeamEditProjectId(null); }} onChangeManager={handleChangeManager} onToggleAssignment={handleToggleEngineerAssignment} onAddTrip={handleAddTrip} onUpdateTrip={handleUpdateTrip} onDeleteTrip={handleDeleteTrip} t={t} />;
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
            {customerToDelete && <DeleteConfirmModal type="customer" item={customerToDelete} onClose={() => setCustomerToDelete(null)} onConfirm={handleDeleteCustomer} t={t} />}
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
