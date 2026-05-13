import React, { useState, memo, lazy, Suspense } from 'react';
import { Building2, Database } from 'lucide-react';

const CustomerListView = lazy(() => import('./CustomerListView'));
const SiteListView = lazy(() => import('./SiteListView'));

// 고객사 관리 + 사이트/유틸 마스터 를 한 페이지 안에 탭으로 통합
const MasterDataView = memo(function MasterDataView({
  // 고객사
  customers, sites, projects,
  onCustomerAdd, onCustomerEdit, onCustomerDelete, onQuickRegister,
  // 사이트
  onSiteAdd, onSiteEdit, onSiteDelete,
  // 공통
  currentUser, t, defaultTab = 'customers'
}) {
  const [tab, setTab] = useState(defaultTab);
  return (
    // 부모 메인 컨테이너가 overflow-auto + p-8 이라 wrapper는 일반 div로 두기.
    // 탭이 페이지 타이틀 역할이라 sub view 안의 H1은 모두 제거됨.
    <div>
      <div className="mb-6 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setTab('customers')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${tab === 'customers' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Building2 size={16} className="mr-1.5" />{t('고객사', 'Customers')}
        </button>
        <button
          onClick={() => setTab('sites')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${tab === 'sites' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Database size={16} className="mr-1.5" />{t('사이트/유틸 마스터', 'Site Master')}
        </button>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">{t('불러오는 중…', 'Loading…')}</div>}>
        {tab === 'customers' && (
          <CustomerListView
            customers={customers}
            sites={sites}
            projects={projects}
            onAddClick={onCustomerAdd}
            onEditClick={onCustomerEdit}
            onDeleteClick={onCustomerDelete}
            onQuickRegister={onQuickRegister}
            currentUser={currentUser}
            t={t}
          />
        )}
        {tab === 'sites' && (
          <SiteListView
            sites={sites}
            customers={customers}
            onAddClick={onSiteAdd}
            onEditClick={onSiteEdit}
            onDeleteClick={onSiteDelete}
            currentUser={currentUser}
            t={t}
          />
        )}
      </Suspense>
    </div>
  );
});

export default MasterDataView;
