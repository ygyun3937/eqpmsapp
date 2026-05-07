import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';
import { ROLE_OPTIONS } from '../../constants';
import { hashPassword } from '../../utils/auth';

const UserModal = memo(function UserModal({ user, users, projects, onClose, onSubmit, t }) {
  const isEdit = !!user;
  const [data, setData] = useState(user ? {
    id: user.id || '',
    name: user.name || '',
    role: user.role || 'ENGINEER',
    dept: user.dept || '',
    position: user.position || '',
    customer: user.customer || '',
    assignedProjectIds: Array.isArray(user.assignedProjectIds) ? user.assignedProjectIds : [],
    active: user.active !== false,
    mustChangePassword: !!user.mustChangePassword
  } : {
    id: '', name: '', role: 'ENGINEER', dept: '', position: '', customer: '',
    assignedProjectIds: [], active: true, mustChangePassword: true
  });
  const POSITION_OPTIONS = ['', '사원', '주임', '대리', '과장', '차장', '부장', '이사', '상무', '전무', '대표'];
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');

  const toggleProject = (id) => {
    setData(prev => prev.assignedProjectIds.includes(id)
      ? { ...prev, assignedProjectIds: prev.assignedProjectIds.filter(x => x !== id) }
      : { ...prev, assignedProjectIds: [...prev.assignedProjectIds, id] }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const id = data.id.trim();
    if (!id) { setError(t('아이디를 입력하세요.', 'Enter an ID.')); return; }
    if (!/^[a-zA-Z0-9_.-]{2,32}$/.test(id)) {
      setError(t('아이디는 영문/숫자/._- 만 사용 가능 (2~32자)', 'ID must be 2-32 chars: a-z, 0-9, ._-'));
      return;
    }
    if (!isEdit && (users || []).some(u => u.id === id)) {
      setError(t('이미 사용 중인 아이디입니다.', 'ID already exists.'));
      return;
    }
    if (!data.name.trim()) { setError(t('이름을 입력하세요.', 'Enter a name.')); return; }

    if (!isEdit) {
      if (!pw || pw.length < 4) { setError(t('비밀번호는 4자 이상이어야 합니다.', 'Password must be 4+ chars.')); return; }
      if (pw !== pw2) { setError(t('비밀번호 확인이 일치하지 않습니다.', 'Passwords do not match.')); return; }
    } else if (pw) {
      if (pw.length < 4) { setError(t('비밀번호는 4자 이상이어야 합니다.', 'Password must be 4+ chars.')); return; }
      if (pw !== pw2) { setError(t('비밀번호 확인이 일치하지 않습니다.', 'Passwords do not match.')); return; }
    }

    if (data.role === 'CUSTOMER' && !data.customer.trim()) {
      setError(t('고객사명을 입력하세요.', 'Enter the customer company name.')); return;
    }

    const payload = { ...data, id };
    if (pw) {
      payload.pw = await hashPassword(pw);
      payload.mustChangePassword = false;
    } else if (!isEdit) {
      payload.pw = await hashPassword('changeme');
      payload.mustChangePassword = true;
    } else {
      payload.pw = user.pw;
    }
    if (!isEdit) payload.createdAt = new Date().toISOString();

    onSubmit(payload, isEdit);
  };

  const projectsForCustomer = (data.role === 'CUSTOMER' && data.customer)
    ? (projects || []).filter(p => p.customer === data.customer)
    : (projects || []);

  return (
    <ModalWrapper title={isEdit ? t('사용자 정보 수정', 'Edit User') : t('새 사용자 추가', 'Add User')} color="indigo" onClose={onClose} onSubmit={handleSubmit} submitText={t('저장하기', 'Save')} t={t}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">{t('아이디', 'ID')}</label>
          <input disabled={isEdit} required className="w-full p-2.5 border rounded-lg disabled:bg-slate-100" value={data.id} onChange={e => setData({ ...data, id: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('이름', 'Name')}</label>
          <input required className="w-full p-2.5 border rounded-lg" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">{t('권한', 'Role')}</label>
          <select className="w-full p-2.5 border rounded-lg" value={data.role} onChange={e => setData({ ...data, role: e.target.value })}>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('부서', 'Dept')}</label>
          <input className="w-full p-2.5 border rounded-lg" value={data.dept} onChange={e => setData({ ...data, dept: e.target.value })} placeholder={t('예: AX 혁신실', 'e.g. R&D')} />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('직급', 'Position')}</label>
          <input
            list="position-options"
            className="w-full p-2.5 border rounded-lg"
            value={data.position}
            onChange={e => setData({ ...data, position: e.target.value })}
            placeholder={t('예: 과장', 'e.g. Manager')}
          />
          <datalist id="position-options">
            {POSITION_OPTIONS.filter(Boolean).map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
      </div>

      {data.role === 'CUSTOMER' && (
        <>
          <div>
            <label className="block text-sm font-bold mb-1">{t('고객사명', 'Customer Company')}</label>
            <input required className="w-full p-2.5 border rounded-lg" value={data.customer} onChange={e => setData({ ...data, customer: e.target.value })} placeholder="예: A전자" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">{t('접근 가능 프로젝트', 'Accessible Projects')}</label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50 space-y-1">
              {projectsForCustomer.length === 0 && (
                <p className="text-xs text-slate-400">{t('해당 고객사에 등록된 프로젝트가 없습니다.', 'No projects for this customer.')}</p>
              )}
              {projectsForCustomer.map(p => (
                <label key={p.id} className="flex items-center text-xs text-slate-700 cursor-pointer hover:bg-white p-1.5 rounded">
                  <input type="checkbox" className="mr-2" checked={data.assignedProjectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                  <span className="font-bold mr-2">{p.id}</span>
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t('선택하지 않으면 모든 프로젝트가 비공개됩니다.', 'Unselected = no project access.')}</p>
          </div>
        </>
      )}

      <div className="border-t pt-3">
        <p className="text-xs font-bold text-slate-500 mb-2">
          {isEdit ? t('비밀번호 (변경할 때만 입력)', 'Password (fill only to change)') : t('초기 비밀번호', 'Initial Password')}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <input type="password" autoComplete="new-password" className="w-full p-2.5 border rounded-lg" placeholder={t('비밀번호', 'Password')} value={pw} onChange={e => setPw(e.target.value)} />
          <input type="password" autoComplete="new-password" className="w-full p-2.5 border rounded-lg" placeholder={t('비밀번호 확인', 'Confirm')} value={pw2} onChange={e => setPw2(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" checked={data.active} onChange={e => setData({ ...data, active: e.target.checked })} />
          {t('계정 활성화', 'Active')}
        </label>
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" checked={data.mustChangePassword} onChange={e => setData({ ...data, mustChangePassword: e.target.checked })} />
          {t('첫 로그인 시 비밀번호 변경 요구', 'Require password change on next login')}
        </label>
      </div>

      {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
    </ModalWrapper>
  );
});

export default UserModal;
