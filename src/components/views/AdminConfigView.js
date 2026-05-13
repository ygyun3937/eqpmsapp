import React, { useState, memo, lazy, Suspense } from 'react';
import { UserCog, Settings as SettingsIcon, Mail, Activity } from 'lucide-react';

const UserManagementView = lazy(() => import('./UserManagementView'));
const SystemSettingsView = lazy(() => import('./SystemSettingsView'));
const AdminMailLogView = lazy(() => import('./AdminMailLogView'));
const AdminChangeLogView = lazy(() => import('./AdminChangeLogView'));

// 관리자 페이지 — 사용자 관리 / 시스템 설정 / 메일 발송 이력 / 시스템 활동 이력을 한 페이지 안에 4탭으로 통합
const AdminConfigView = memo(function AdminConfigView({
  // 사용자 관리 props
  users, projects, settings, currentUser,
  onAddUser, onEditUser, onDeleteUser, onResetPassword, onToggleActive, onToggleWeeklyReport, onToggleTeamLead,
  // 시스템 설정 props
  onSaveSettings,
  // 공통
  t, defaultTab = 'users'
}) {
  const [tab, setTab] = useState(defaultTab);
  const tabBtn = (key, icon, label, color) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${tab === key ? `border-${color}-600 text-${color}-600` : 'border-transparent text-slate-500 hover:text-slate-800'}`}
    >
      {icon}<span className="ml-1.5">{label}</span>
    </button>
  );
  return (
    // 부모 메인 컨테이너가 overflow-auto + p-8 이라 wrapper는 일반 div로 두기.
    // 탭이 페이지 타이틀 역할이라 sub view 안의 H1은 모두 제거됨.
    <div>
      <div className="mb-6 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto">
        {tabBtn('users',    <UserCog size={16} />,     t('사용자 관리', 'Users'),        'blue')}
        {tabBtn('settings', <SettingsIcon size={16} />, t('시스템 설정', 'Settings'),     'slate')}
        {tabBtn('mail',     <Mail size={16} />,         t('메일 발송 이력', 'Mail Log'),   'indigo')}
        {tabBtn('change',   <Activity size={16} />,     t('시스템 활동 이력', 'Activity'), 'purple')}
      </div>
      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">{t('불러오는 중…', 'Loading…')}</div>}>
        {tab === 'users' && (
          <UserManagementView
            users={users}
            projects={projects}
            currentUser={currentUser}
            settings={settings}
            onAdd={onAddUser}
            onEdit={onEditUser}
            onDelete={onDeleteUser}
            onResetPassword={onResetPassword}
            onToggleActive={onToggleActive}
            onToggleWeeklyReport={onToggleWeeklyReport}
            onToggleTeamLead={onToggleTeamLead}
            t={t}
          />
        )}
        {tab === 'settings' && (
          <SystemSettingsView settings={settings} onSave={onSaveSettings} currentUser={currentUser} t={t} />
        )}
        {tab === 'mail' && <AdminMailLogView currentUser={currentUser} t={t} />}
        {tab === 'change' && <AdminChangeLogView currentUser={currentUser} t={t} />}
      </Suspense>
    </div>
  );
});

export default AdminConfigView;
