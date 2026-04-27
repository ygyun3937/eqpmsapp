import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';
import { hashPassword, matchPasswordCompat } from '../../utils/auth';

const PasswordChangeModal = memo(function PasswordChangeModal({ user, forced, onClose, onSubmit, t }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (!oldPw) { setError(t('현재 비밀번호를 입력하세요.', 'Enter current password.')); return; }
      const ok = await matchPasswordCompat(oldPw, user.pw);
      if (!ok) { setError(t('현재 비밀번호가 올바르지 않습니다.', 'Current password is incorrect.')); return; }
      if (!newPw || newPw.length < 4) { setError(t('새 비밀번호는 4자 이상이어야 합니다.', 'New password must be 4+ chars.')); return; }
      if (newPw !== newPw2) { setError(t('비밀번호 확인이 일치하지 않습니다.', 'Passwords do not match.')); return; }
      if (newPw === oldPw) { setError(t('이전과 다른 비밀번호를 사용하세요.', 'Use a different password.')); return; }
      const hashed = await hashPassword(newPw);
      onSubmit(hashed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalWrapper
      title={forced ? t('비밀번호 변경 (필수)', 'Change Password (Required)') : t('비밀번호 변경', 'Change Password')}
      color="indigo"
      onClose={forced ? undefined : onClose}
      onSubmit={handleSubmit}
      submitText={busy ? t('처리 중...', 'Saving...') : t('비밀번호 변경', 'Update Password')}
      t={t}
    >
      {forced && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
          {t('보안을 위해 새 비밀번호로 변경해야 계속 사용할 수 있습니다.', 'You must change your password to continue.')}
        </div>
      )}
      <div>
        <label className="block text-sm font-bold mb-1">{t('현재 비밀번호', 'Current Password')}</label>
        <input type="password" autoComplete="current-password" required className="w-full p-2.5 border rounded-lg" value={oldPw} onChange={e => setOldPw(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('새 비밀번호', 'New Password')}</label>
        <input type="password" autoComplete="new-password" required className="w-full p-2.5 border rounded-lg" value={newPw} onChange={e => setNewPw(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('새 비밀번호 확인', 'Confirm New Password')}</label>
        <input type="password" autoComplete="new-password" required className="w-full p-2.5 border rounded-lg" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
      </div>
      {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
    </ModalWrapper>
  );
});

export default PasswordChangeModal;
