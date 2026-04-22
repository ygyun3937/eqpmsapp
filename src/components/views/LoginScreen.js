import React, { useState, memo } from 'react';
import { Globe } from 'lucide-react';
import { MOCK_USERS } from '../../constants';

const LoginScreen = memo(function LoginScreen({ onLogin, lang, setLang, t }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.id === id && u.pw === pw);
    if (user) onLogin(user);
    else setError(t('아이디 또는 비밀번호가 올바르지 않습니다.', 'Invalid ID or Password.'));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="flex items-center text-white bg-slate-800 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors">
          <Globe size={14} className="mr-1.5"/> {lang === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-blue-500/30">E</div>
        </div>
        <h1 className="text-2xl font-black text-center text-slate-800 mb-2">EQ-PMS</h1>
        <p className="text-center text-slate-500 text-sm mb-8">{t('장비 프로젝트 셋업 관리 시스템', 'Equipment Project Management System')}</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ID</label>
            <input type="text" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={id} onChange={e => setId(e.target.value)} placeholder="admin / pm / eng / client" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
            <input type="password" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={pw} onChange={e => setPw(e.target.value)} placeholder="1234" required />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-blue-700 transition-transform active:scale-[0.98] mt-2">{t('로그인', 'Sign In')}</button>
        </form>
        <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 mb-2">{t('테스트 계정 안내', 'Test Accounts')}</p>
          <ul className="text-[10px] space-y-1 text-slate-600">
            <li><strong className="text-slate-800">admin / 1234</strong> : {t('본사 관리자 (전체 권한)', 'Admin (Full Access)')}</li>
            <li><strong className="text-slate-800">pm / 1234</strong> : {t('현장 PM (프로젝트 관리)', 'Project Manager')}</li>
            <li><strong className="text-slate-800">eng / 1234</strong> : {t('엔지니어 (업무 확인/이슈 등록)', 'Setup Engineer')}</li>
            <li><strong className="text-slate-800">client / 1234</strong> : {t('고객사 (A전자 열람/서명 전용)', 'Client (Read/Sign only)')}</li>
          </ul>
        </div>
      </div>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 z-0"></div>
    </div>
  );
});

export default LoginScreen;
