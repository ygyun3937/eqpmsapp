import React, { useState, memo, lazy, Suspense } from 'react';
import { Mail, Activity } from 'lucide-react';

const AdminMailLogView = lazy(() => import('./AdminMailLogView'));
const AdminChangeLogView = lazy(() => import('./AdminChangeLogView'));

// 메일 발송 이력 + 시스템 활동 이력을 한 페이지 안에 탭으로 통합
const AdminLogsView = memo(function AdminLogsView({ currentUser, t, defaultTab = 'mail' }) {
  const [tab, setTab] = useState(defaultTab);
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-200 bg-white px-4 md:px-6 flex items-center gap-1 sticky top-0 z-10 shrink-0">
        <button
          onClick={() => setTab('mail')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${tab === 'mail' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Mail size={16} className="mr-1.5" />{t('메일 발송 이력', 'Mail History')}
        </button>
        <button
          onClick={() => setTab('change')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${tab === 'change' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Activity size={16} className="mr-1.5" />{t('시스템 활동 이력', 'System Activity')}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">{t('불러오는 중…', 'Loading…')}</div>}>
          {tab === 'mail' && <AdminMailLogView currentUser={currentUser} t={t} />}
          {tab === 'change' && <AdminChangeLogView currentUser={currentUser} t={t} />}
        </Suspense>
      </div>
    </div>
  );
});

export default AdminLogsView;
