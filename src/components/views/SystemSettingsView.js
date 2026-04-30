import React, { useState, memo } from 'react';
import { Settings as SettingsIcon, FolderOpen, CheckCircle, AlertTriangle, Loader, Save, ExternalLink, Info } from 'lucide-react';
import { callGoogleAction } from '../../utils/api';

const SystemSettingsView = memo(function SystemSettingsView({ settings, onSave, currentUser, t }) {
  const [form, setForm] = useState({ driveRootFolderId: settings?.driveRootFolderId || '' });
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center"><SettingsIcon size={22} className="mr-2 text-indigo-500" />{t('시스템 설정', 'System Settings')}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t('Drive 연동, 알림 등 시스템 전역 설정을 관리합니다. 관리자만 접근 가능합니다.', 'System-wide settings (Drive integration, notifications). Admin only.')}</p>
      </div>

      {/* Drive 연동 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center"><FolderOpen size={18} className="mr-2 text-emerald-500" />{t('Google Drive 연동', 'Google Drive Integration')}</h2>
        <p className="text-xs text-slate-500 mb-4">{t('프로젝트별 참고자료(회의록·PDF·도면 등)를 자동 업로드할 루트 폴더를 지정합니다.', 'Configure the root Drive folder for project attachments (meeting notes, PDFs, drawings, etc.).')}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4 flex items-start">
          <Info size={14} className="mr-2 shrink-0 mt-0.5" />
          <div>
            <strong>{t('폴더 구조 안내', 'Folder Structure')}:</strong> {t('업로드 시 자동으로', 'Files will be auto-organized as')}{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">[루트] / [고객사] / [프로젝트명-PRJxxxxxx] / 파일</code> {t('형태로 구성됩니다.', '')}
            <br />
            <span className="text-[11px] text-blue-700 mt-1 block">
              {t('루트 폴더 URL 또는 ID를 그대로 붙여넣으세요. (예: https://drive.google.com/drive/folders/xxxxxxxx)', 'Paste folder URL or ID. (e.g. https://drive.google.com/drive/folders/xxxxxxxx)')}
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

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            {settings?.driveRootFolderId
              ? <>{t('현재 저장된 ID', 'Current saved ID')}: <code className="bg-slate-100 px-1 rounded">{settings.driveRootFolderId.slice(0, 30)}{settings.driveRootFolderId.length > 30 ? '...' : ''}</code></>
              : t('아직 저장된 설정 없음', 'No saved setting yet.')}
          </span>
          <div className="flex items-center gap-3">
            {saveState.message && <span className={`text-xs font-bold ${saveState.message.includes('실패') || saveState.message.includes('failed') ? 'text-red-600' : 'text-emerald-600'}`}>{saveState.message}</span>}
            <button
              onClick={handleSave}
              disabled={saveState.loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm px-5 py-2 rounded-lg transition-colors flex items-center shadow-sm"
            >
              {saveState.loading ? <Loader size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
              {t('설정 저장', 'Save Settings')}
            </button>
          </div>
        </div>
      </div>

      {/* GAS 배포 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center"><AlertTriangle size={14} className="mr-1.5" />{t('첫 사용 전 GAS 백엔드 업데이트가 필요합니다', 'GAS backend update required for first use')}</h3>
        <ol className="text-xs text-amber-900 space-y-1 list-decimal list-inside leading-relaxed">
          <li>{t('Google Sheets → 확장 프로그램 → Apps Script 열기', 'Google Sheets → Extensions → Apps Script')}</li>
          <li>{t('docs/gas-backend.gs 의 최신 코드를 복사하여 붙여넣기', 'Copy & paste the latest docs/gas-backend.gs')}</li>
          <li>{t('상단 [배포] → [배포 관리] → 기존 배포 편집 → 새 버전 발행', 'Deploy → Manage deployments → Edit existing → New version')}</li>
          <li>{t('Drive 권한 승인 (최초 1회)', 'Approve Drive permissions (first time only)')}</li>
          <li>{t('이 페이지로 돌아와 폴더 ID 등록 + 연결 테스트', 'Return here, register folder ID, run Test')}</li>
        </ol>
      </div>
    </div>
  );
});

export default SystemSettingsView;
