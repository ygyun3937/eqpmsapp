import React, { useState, memo } from 'react';
import { Settings as SettingsIcon, FolderOpen, CheckCircle, AlertTriangle, Loader, Save, ExternalLink, Info, ClipboardList, Layers, Plus, X, Mail } from 'lucide-react';
import { callGoogleAction } from '../../utils/api';
import { PARENT_DOMAINS, SUB_DOMAIN_PRESETS } from '../../constants';

const SystemSettingsView = memo(function SystemSettingsView({ settings, onSave, currentUser, t }) {
  // settings.subDomains: { '2차전지': ['EOL', 'ESS', '사이클러'], ... }
  // 초기값은 settings 값 또는 PRESET
  const initialSubs = (() => {
    const out = {};
    PARENT_DOMAINS.forEach(d => {
      const fromSettings = settings?.subDomains && Array.isArray(settings.subDomains[d]) ? settings.subDomains[d] : null;
      out[d] = fromSettings || [...(SUB_DOMAIN_PRESETS[d] || [])];
    });
    return out;
  })();
  const [form, setForm] = useState({
    driveRootFolderId: settings?.driveRootFolderId || '',
    weeklyReportEnabled: settings?.weeklyReportEnabled === true,
    subDomains: initialSubs,
    mailGasUrl: settings?.mailGasUrl || '',
  });
  const [newSubInput, setNewSubInput] = useState({}); // { '2차전지': 'ESS' } — 임시 입력값
  const addSubDomain = (parent) => {
    const v = (newSubInput[parent] || '').trim();
    if (!v) return;
    if ((form.subDomains[parent] || []).includes(v)) {
      setNewSubInput({ ...newSubInput, [parent]: '' });
      return;
    }
    setForm({ ...form, subDomains: { ...form.subDomains, [parent]: [...(form.subDomains[parent] || []), v] } });
    setNewSubInput({ ...newSubInput, [parent]: '' });
  };
  const removeSubDomain = (parent, sub) => {
    setForm({ ...form, subDomains: { ...form.subDomains, [parent]: (form.subDomains[parent] || []).filter(s => s !== sub) } });
  };
  const [verifyState, setVerifyState] = useState({ loading: false, ok: null, message: '', folderName: '', folderUrl: '' });
  const [saveState, setSaveState] = useState({ loading: false, message: '' });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
        {t('관리자만 접근할 수 있는 페이지입니다.', 'Admin only.')}
      </div>
    );
  }

  const handleVerify = async () => {
    if (!form.driveRootFolderId.trim()) {
      setVerifyState({ loading: false, ok: false, message: t('폴더 ID 또는 URL을 입력하세요.', 'Enter folder ID or URL.'), folderName: '', folderUrl: '' });
      return;
    }
    setVerifyState({ loading: true, ok: null, message: '', folderName: '', folderUrl: '' });
    const result = await callGoogleAction('VERIFY_DRIVE_FOLDER', { folderId: form.driveRootFolderId.trim() });
    if (result && result.ok) {
      setVerifyState({
        loading: false, ok: true,
        message: t('폴더 접근 성공', 'Folder access OK'),
        folderName: result.folderName || '',
        folderUrl: result.folderUrl || ''
      });
    } else {
      setVerifyState({
        loading: false, ok: false,
        message: (result && result.message) || t('폴더 접근 실패. ID/URL을 확인하고 GAS 권한을 점검하세요.', 'Folder access failed. Check ID/URL and GAS permissions.'),
        folderName: '', folderUrl: ''
      });
    }
  };

  const handleSave = async () => {
    setSaveState({ loading: true, message: '' });
    try {
      await onSave({ ...settings, ...form });
      setSaveState({ loading: false, message: t('저장되었습니다.', 'Saved.') });
      setTimeout(() => setSaveState({ loading: false, message: '' }), 2500);
    } catch (e) {
      setSaveState({ loading: false, message: t('저장 실패: ', 'Save failed: ') + e.message });
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out] max-w-4xl">
      {/* 페이지 제목은 상위 탭 헤더 → 부제목만 유지. */}
      <p className="text-sm text-slate-500">{t('Drive 연동, 알림 등 시스템 전역 설정을 관리합니다. 관리자만 접근 가능합니다.', 'System-wide settings (Drive integration, notifications). Admin only.')}</p>

      {/* Drive 연동 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center"><FolderOpen size={18} className="mr-2 text-emerald-500" />{t('Google Drive 연동', 'Google Drive Integration')}</h2>
        <p className="text-xs text-slate-500 mb-4">{t('프로젝트별 참고자료(명세서·도면·회의록 등)를 자동 업로드할 루트 폴더를 지정합니다.', 'Configure the root Drive folder for project attachments (specs, drawings, meeting notes, etc.).')}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4 flex items-start">
          <Info size={14} className="mr-2 shrink-0 mt-0.5" />
          <div>
            <strong>{t('폴더 구조 안내', 'Folder Structure')}:</strong> {t('업로드 시 자동으로', 'Files will be auto-organized as')}{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">[루트] / [고객사] / [프로젝트명-PRJxxxxxx] / [카테고리] / 파일</code> {t('형태로 구성됩니다.', '')}
            <br />
            <span className="text-[11px] text-blue-700 mt-1 block">
              {t('카테고리: 명세서 / 도면 / 회의록 / 기타. 루트 폴더 URL 또는 ID를 그대로 붙여넣으세요.', 'Categories: 명세서 (Specs) / 도면 (Drawings) / 회의록 (Meetings) / 기타 (Etc). Paste folder URL or ID.')}
            </span>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('Drive 루트 폴더 (URL 또는 ID)', 'Drive Root Folder (URL or ID)')}</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={form.driveRootFolderId}
            onChange={(e) => { setForm({ ...form, driveRootFolderId: e.target.value }); setVerifyState({ loading: false, ok: null, message: '', folderName: '', folderUrl: '' }); }}
            placeholder="https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv... 또는 ID"
            className="flex-1 p-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleVerify}
            disabled={verifyState.loading || !form.driveRootFolderId.trim()}
            className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center"
          >
            {verifyState.loading ? <Loader size={14} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />}
            {t('연결 테스트', 'Test')}
          </button>
        </div>

        {verifyState.ok === true && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm flex items-start mb-3">
            <CheckCircle size={16} className="text-emerald-600 mr-2 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-emerald-800">{verifyState.message}</div>
              <div className="text-xs text-emerald-700 mt-1">
                <strong>{t('폴더명', 'Folder')}:</strong> {verifyState.folderName}
                {verifyState.folderUrl && (
                  <a href={verifyState.folderUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-emerald-700 hover:text-emerald-900 underline">
                    {t('Drive에서 열기', 'Open in Drive')} <ExternalLink size={11} className="ml-0.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {verifyState.ok === false && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-start mb-3">
            <AlertTriangle size={16} className="text-red-600 mr-2 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-800">{verifyState.message}</div>
              <div className="text-xs text-red-700 mt-1">{t('GAS Web App을 이 백엔드 코드로 재배포했는지, 폴더 공유에 GAS 실행 계정이 추가됐는지 확인하세요.', 'Make sure you redeployed the GAS Web App with this backend, and the GAS execution account has access to the folder.')}</div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            {settings?.driveRootFolderId
              ? <>{t('현재 저장된 ID', 'Current saved ID')}: <code className="bg-slate-100 px-1 rounded">{settings.driveRootFolderId.slice(0, 30)}{settings.driveRootFolderId.length > 30 ? '...' : ''}</code></>
              : t('아직 저장된 설정 없음', 'No saved setting yet.')}
          </span>
        </div>
      </div>

      {/* 주간 업무 보고 — 기능 활성화 토글 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
          <ClipboardList size={18} className="mr-2 text-indigo-500" />
          {t('주간 업무 보고 기능', 'Weekly Reports')}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {t('전사 주간 업무 보고 기능을 활성화/비활성화합니다. 활성화 후, 사용자 관리에서 사용자별로 권한을 부여하세요.',
             'Enable/disable the weekly report feature globally. After enabling, grant per-user permission in User Management.')}
        </p>
        <label className="flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.weeklyReportEnabled}
            onChange={(e) => setForm({ ...form, weeklyReportEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-slate-200 peer-checked:bg-indigo-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-indigo-300">
            <div className={`absolute top-0.5 left-0.5 bg-white border border-slate-300 rounded-full h-5 w-5 transition-transform ${form.weeklyReportEnabled ? 'translate-x-5' : ''}`}></div>
          </div>
          <span className="ml-3 text-sm font-bold text-slate-700">
            {form.weeklyReportEnabled ? t('활성화', 'Enabled') : t('비활성화', 'Disabled')}
          </span>
        </label>
        <div className="mt-3 bg-amber-50 text-amber-800 text-[11px] rounded p-2 flex items-start border border-amber-200">
          <Info size={12} className="mr-1.5 mt-0.5 shrink-0" />
          <div>
            {t('비활성화 시 사이드바에서 메뉴가 숨겨지고 페이지 접근도 차단됩니다.', 'When disabled, the menu hides and the page is blocked.')}
            {' '}
            {t('팀장(사용자 관리에서 지정)은 같은 부서(dept) 사용자만 조회/승인할 수 있고, ADMIN은 전체를 볼 수 있습니다.', 'Team Leads (set in User Management) see only same-dept users; ADMIN sees all.')}
          </div>
        </div>
      </div>

      {/* 메일 발송 — 본인 계정 발송용 GAS URL (선택) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
          <Mail size={18} className="mr-2 text-blue-500" />
          {t('메일 발송 — 본인 계정 발송 (선택)', 'Email — Send-as-User (Optional)')}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {t('현재 권장: 이 칸을 비워두고 시스템 계정으로 발송 (답장 reply-to는 작성자 본인 메일로 자동 설정됨). 본인 Gmail 발송은 브라우저 CORS 제한으로 정식 운영 불가 — Service Account 방식 도입 시 활성화 예정.',
             'Recommended: leave empty and use system account (reply-to is auto-set to author). Send-as-User is blocked by browser CORS — to be enabled via Service Account in a future phase.')}
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 mb-3 flex items-start">
          <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
          <div>
            <strong>{t('★ 현재 운영 방식: A — 시스템 계정 발송', '★ Current operation: A — System account')}</strong>
            <div className="mt-1 space-y-0.5">
              <div>· {t('이 칸 비워두면 → 메인 GAS로 발송 → 메인 GAS 소유자(시스템) 계정에서 메일 발송', 'Empty → main GAS → mail goes from main GAS owner (system) account')}</div>
              <div>· {t('받는 이 시점에서 보이는 보낸이: "김철수 (MAK-PMS)" 형태, 답장은 작성자 본인 메일로 자동 라우팅', 'Recipient sees: "Author (MAK-PMS)", reply auto-routed to the author\'s real address')}</div>
              <div>· {t('일반 사용자 액션 없음. 배포 없음. CORS 문제 없음.', 'No user action. No deployment. No CORS issue.')}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 mb-3 flex items-start">
          <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
          <div>
            <strong>{t('이 칸은 왜 있나 — 추후 옵션(보류)', 'Why this field exists — future option (on hold)')}:</strong>
            <div className="mt-1 space-y-0.5">
              <div>· {t('"호출자 권한 실행" GAS 별도 배포 URL을 넣으면 본인 Gmail 발송을 시도하지만,', 'You could paste a separately deployed "Execute as user" GAS URL for send-as-user, but…')}</div>
              <div>· {t('현재 브라우저 fetch가 도메인 제한 GAS endpoint를 호출하지 못함 (CORS + 401)', 'Browser fetch cannot reach a domain-restricted GAS endpoint (CORS + 401)')}</div>
              <div>· {t('정식 운영하려면 Workspace 관리자가 Service Account + Domain-Wide Delegation 설정 필요 (추후 검토)', 'Requires Workspace admin to set up Service Account + Domain-Wide Delegation (future)')}</div>
              <div>· {t('현재로선 비워두는 것을 권장 — 답장 reply-to만 잘 가면 실용상 차이 미미', 'For now keep it empty — with reply-to set correctly, practical difference is minimal')}</div>
            </div>
          </div>
        </div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('메일 발송 GAS URL', 'Mail GAS URL')}</label>
        <input
          type="text"
          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
          value={form.mailGasUrl}
          onChange={(e) => setForm({ ...form, mailGasUrl: e.target.value })}
          placeholder="https://script.google.com/macros/s/.../exec  (비어 두면 시스템 계정 발송)"
        />
        <p className="text-[11px] text-slate-500 mt-1">{t('빈 값이면 모든 메일이 시스템(GAS 배포자) 계정으로 발송됩니다.', 'If empty, all mails are sent from the system (GAS owner) account.')}</p>
      </div>

      {/* 도메인 관리 (대분류 / 중분류) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
          <Layers size={18} className="mr-2 text-purple-500" />
          {t('도메인 관리 (대분류 / 중분류)', 'Domain Hierarchy')}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {t('프로젝트 산업군 대분류와 중분류를 관리합니다. 대분류는 시스템 기본값으로 고정되며, 중분류는 자유롭게 추가/삭제할 수 있습니다. 신규 중분류는 대분류의 기본 시드(태스크/체크리스트)를 상속받습니다.',
             'Manage parent and sub categories for project domains. Parents are fixed; sub-domains can be added/removed freely. New sub-domains inherit the parent\'s seed templates.')}
        </p>
        <div className="space-y-4">
          {PARENT_DOMAINS.map(parent => {
            const subs = form.subDomains[parent] || [];
            return (
              <div key={parent} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-800 text-sm flex items-center">
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded mr-2">{t('대분류', 'Parent')}</span>
                    {parent}
                  </div>
                  <span className="text-[10px] text-slate-400">{subs.length}{t('개 중분류', ' subs')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {subs.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">{t('등록된 중분류 없음', 'No sub-domains')}</span>
                  ) : subs.map(s => (
                    <span key={s} className="inline-flex items-center bg-white text-slate-700 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                      {s}
                      <button type="button" onClick={() => removeSubDomain(parent, s)} className="ml-1 text-slate-400 hover:text-red-500" title={t('제거', 'Remove')}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    className="flex-1 text-xs p-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-purple-500"
                    placeholder={t(`예: ${(SUB_DOMAIN_PRESETS[parent] || [])[0] || '신규 중분류'}`, `e.g. ${(SUB_DOMAIN_PRESETS[parent] || [])[0] || 'New sub'}`)}
                    value={newSubInput[parent] || ''}
                    onChange={e => setNewSubInput({ ...newSubInput, [parent]: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubDomain(parent); } }}
                  />
                  <button
                    type="button"
                    onClick={() => addSubDomain(parent)}
                    disabled={!(newSubInput[parent] || '').trim()}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-md inline-flex items-center"
                  >
                    <Plus size={11} className="mr-0.5" />{t('추가', 'Add')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 bg-purple-50 text-purple-800 text-[11px] rounded p-2 flex items-start border border-purple-200">
          <Info size={12} className="mr-1.5 mt-0.5 shrink-0" />
          <div>
            {t('이미 등록된 프로젝트에서 사용 중인 중분류를 제거해도 프로젝트 데이터는 그대로 유지됩니다 (드롭다운 추천에서만 제외).',
               'Removing a sub-domain in use does NOT affect existing projects — only removes from the suggestion list.')}
          </div>
        </div>
      </div>

      {/* 글로벌 저장 바 — 모든 설정 한 번에 저장 */}
      <div className="sticky bottom-0 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-center gap-3 mt-2">
        <div className="flex-1 text-xs text-slate-500">
          <Info size={12} className="inline mr-1" />
          {t('Drive 연동 + 주간 업무 보고 등 위 설정을 한 번에 저장합니다.', 'Saves all settings above (Drive integration, Weekly Reports, etc.) at once.')}
        </div>
        {saveState.message && (
          <span className={`text-xs font-bold ${saveState.message.includes('실패') || saveState.message.includes('failed') ? 'text-red-600' : 'text-emerald-600'}`}>
            {saveState.message}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saveState.loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center shadow-sm"
        >
          {saveState.loading ? <Loader size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
          {t('전체 설정 저장', 'Save All Settings')}
        </button>
      </div>

    </div>
  );
});

export default SystemSettingsView;
