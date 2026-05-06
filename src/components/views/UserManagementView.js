import React, { memo, useState, useMemo } from 'react';
import { Plus, Edit, Trash, KeyRound, ShieldCheck, ShieldOff, UserPlus, Search } from 'lucide-react';
import { ROLE_OPTIONS } from '../../constants';

const roleLabel = (role) => {
  const r = ROLE_OPTIONS.find(x => x.value === role);
  return r ? r.label : role;
};

const roleBadge = (role) => {
  switch (role) {
    case 'ADMIN': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'PM': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'ENGINEER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'CUSTOMER': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const UserManagementView = memo(function UserManagementView({ users, projects, currentUser, onAdd, onEdit, onResetPassword, onToggleActive, onDelete, t }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return (users || []).filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (!kw) return true;
      return [u.id, u.name, u.dept, u.customer].filter(Boolean).some(v => String(v).toLowerCase().includes(kw));
    });
  }, [users, filterRole, search]);

  const projectNameMap = useMemo(() => {
    const m = {};
    (projects || []).forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('사용자 관리', 'User Management')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('계정 발급, 권한 부여, 비밀번호 관리', 'Account provisioning, role & password management')}</p>
        </div>
        <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors">
          <UserPlus className="mr-2" size={16} /> {t('사용자 추가', 'Add User')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {ROLE_OPTIONS.map(r => {
          const cnt = (users || []).filter(u => u.role === r.value).length;
          return (
            <div key={r.value} className={`p-4 rounded-xl border ${roleBadge(r.value)}`}>
              <p className="text-xs font-bold opacity-80">{r.label}</p>
              <p className="text-2xl font-black mt-1">{cnt}</p>
            </div>
          );
        })}
        <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
          <p className="text-xs font-bold text-slate-600 opacity-80">{t('비활성화', 'Disabled')}</p>
          <p className="text-2xl font-black mt-1 text-slate-700">{(users || []).filter(u => u.active === false).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg flex-1 min-w-[200px]">
            <Search size={16} className="text-slate-400 mr-2" />
            <input className="bg-transparent outline-none text-sm w-full" placeholder={t('아이디/이름/부서/고객사 검색', 'Search ID/Name/Dept/Customer')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="text-sm p-2 border rounded-lg bg-white" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">{t('전체 권한', 'All Roles')}</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('아이디', 'ID')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('이름 / 부서', 'Name / Dept')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('권한', 'Role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('고객사 / 접근 프로젝트', 'Customer / Projects')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('상태', 'Status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('마지막 로그인', 'Last Login')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('관리', 'Manage')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map(u => {
                const isSelf = currentUser && currentUser.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">{u.id}</div>
                      {isSelf && <div className="text-[10px] font-bold text-blue-600">{t('현재 로그인', 'You')}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.dept || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'CUSTOMER' ? (
                        <div>
                          <div className="text-xs font-bold text-slate-700">{u.customer || '-'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {(u.assignedProjectIds || []).length === 0
                              ? t('할당된 프로젝트 없음', 'No assigned projects')
                              : (u.assignedProjectIds || []).map(id => projectNameMap[id] || id).join(', ')}
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.active === false
                        ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-600">{t('비활성', 'Disabled')}</span>
                        : <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{t('활성', 'Active')}</span>}
                      {u.mustChangePassword && (
                        <div className="text-[10px] text-amber-600 font-bold mt-1">{t('PW 변경 필요', 'Must change PW')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button title={t('편집', 'Edit')} onClick={() => onEdit(u)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors">
                          <Edit size={12} className="mr-1" />{t('편집', 'Edit')}
                        </button>
                        <button title={t('비밀번호 초기화', 'Reset Password')} onClick={() => onResetPassword(u)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 transition-colors">
                          <KeyRound size={12} className="mr-1" />{t('PW', 'PW')}
                        </button>
                        <button title={u.active === false ? t('활성화', 'Activate') : t('비활성화', 'Deactivate')} onClick={() => onToggleActive(u)} disabled={isSelf} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          {u.active === false ? <ShieldCheck size={12} className="mr-1" /> : <ShieldOff size={12} className="mr-1" />}
                          {u.active === false ? t('활성', 'On') : t('정지', 'Off')}
                        </button>
                        <button title={t('삭제', 'Delete')} onClick={() => onDelete(u)} disabled={isSelf} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash size={12} className="mr-1" />{t('삭제', 'Delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-400">{t('표시할 사용자가 없습니다.', 'No users to show.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default UserManagementView;
