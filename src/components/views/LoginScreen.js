import React, { useState, memo } from 'react';
import { Globe } from 'lucide-react';
import { matchPasswordCompat } from '../../utils/auth';
import { TEST_MODE } from '../../constants';

const LoginScreen = memo(function LoginScreen({ users, onLogin, lang, setLang, t }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const list = Array.isArray(users) ? users : [];
      const user = list.find(u => u && u.id === id.trim());
      if (!user) {
        setError(t('아이디 또는 비밀번호가 올바르지 않습니다.', 'Invalid ID or Password.'));
        return;
      }
      if (user.active === false) {
        setError(t('비활성화된 계정입니다. 관리자에게 문의하세요.', 'Account is disabled. Contact admin.'));
        return;
      }
      const ok = await matchPasswordCompat(pw, user.pw);
      if (!ok) {
        setError(t('아이디 또는 비밀번호가 올바르지 않습니다.', 'Invalid ID or Password.'));
        return;
      }
      onLogin(user);
    } finally {
      setBusy(false);
    }
  };

  const seedHint = (Array.isArray(users) && users.length === 0);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 z-20">
        <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="flex items-center text-white bg-slate-800 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors">
          <Globe size={14} className="mr-1.5"/> {lang === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-blue-500/30">M</div>
        </div>
        <h1 className="text-2xl font-black text-center text-slate-800 mb-2">MAK-PMS</h1>
        <p className="text-center text-slate-500 text-sm mb-8">{t('장비 프로젝트 셋업 관리 시스템', 'Equipment Project Management System')}</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ID</label>
            <input type="text" autoComplete="username" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={id} onChange={e => setId(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
            <input type="password" autoComplete="current-password" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={pw} onChange={e => setPw(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-blue-700 transition-transform active:scale-[0.98] mt-2 disabled:opacity-60">{busy ? t('확인 중...', 'Signing in...') : t('로그인', 'Sign In')}</button>
        </form>
        {TEST_MODE ? (
          <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-2 flex items-center">
              <span className="bg-amber-200 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded mr-2">TEST</span>
              {t('테스트 계정 안내 (사내 검증용)', 'Test Accounts (Internal QA)')}
            </p>
            <ul className="text-[10px] space-y-1 text-slate-600">
              <li><strong className="text-slate-800">admin / 1234</strong> : {t('본사 관리자 (전체 권한)', 'Admin (Full Access)')}</li>
              <li><strong className="text-slate-800">pm / 1234</strong> : {t('현장 PM (프로젝트 관리)', 'Project Manager')}</li>
              <li><strong className="text-slate-800">eng / 1234</strong> : {t('엔지니어 (업무 확인/이슈 등록)', 'Setup Engineer')}</li>
              <li><strong className="text-slate-800">client / 1234</strong> : {t('고객사 (A전자 할당 프로젝트만)', 'Client (Assigned projects only)')}</li>
            </ul>
          </div>
        ) : seedHint ? (
          <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-200">
            <p className="text-xs font-bold text-amber-800 mb-1">{t('초기 관리자 계정', 'Initial Admin Account')}</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {t('아이디 admin / 비밀번호 admin1234 로 로그인 후 즉시 비밀번호를 변경하고 사용자 관리에서 계정을 추가하세요.',
                 'Sign in with admin / admin1234, then change the password and add users from User Management.')}
            </p>
          </div>
        ) : null}
        {!TEST_MODE && (
          <div className="mt-6 text-center text-[11px] text-slate-400">
            {t('계정 발급은 관리자에게 문의하세요.', 'Contact admin to get an account.')}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 tracking-wide">
          Developed by YYG
        </div>
      </div>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 z-0"></div>
    </div>
  );
});

export default LoginScreen;
