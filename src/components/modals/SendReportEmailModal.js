import React, { useState, useMemo, memo } from 'react';
import { X, Send, Loader, Mail, Eye, EyeOff, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { callGoogleAction, callMailAction } from '../../utils/api';
import { buildTripRequestEmail, buildTripReportEmail, buildASReportEmail } from '../../utils/reportEmailTemplates';

// 이메일 형식 검증 — 단순한 RFC 부분 매칭 (서버 검증과 별도)
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());

const SendReportEmailModal = memo(function SendReportEmailModal({
  kind,           // 'trip_request' | 'trip_report' | 'as_report'
  project,
  trip,           // 출장 객체 (kind=trip_*)
  as,             // AS 객체 (kind=as_report)
  defaultTo,      // ['email1', ...]
  defaultCc,
  author,         // 작성자 이름
  authorEmail,    // 작성자 이메일 (reply-to)
  mailGasUrl,     // 설정에서 받은 메일 GAS URL — 있으면 본인 계정 발송
  onClose,
  onSent,         // (result) => void
  t
}) {
  const useSendAsUser = !!(mailGasUrl && String(mailGasUrl).trim());
  const [toList, setToList] = useState(defaultTo || []);
  const [ccList, setCcList] = useState(defaultCc || []);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [additionalComment, setAdditionalComment] = useState('');
  // 출장 보고용 추가 필드
  const [achievements, setAchievements] = useState('');
  const [issues, setIssues] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const { subject, htmlBody, plainFallback, attachmentName, title } = useMemo(() => {
    if (kind === 'trip_request') {
      const built = buildTripRequestEmail({ project, trip, author, additionalComment });
      return { ...built, title: t('출장 신청서 메일 송부', 'Send Trip Request Email') };
    }
    if (kind === 'trip_report') {
      const built = buildTripReportEmail({ project, trip, author, achievements, issues, nextSteps, additionalComment });
      return { ...built, title: t('출장 보고서 메일 송부', 'Send Trip Report Email') };
    }
    if (kind === 'as_report') {
      const built = buildASReportEmail({ project, as, author, additionalComment });
      return { ...built, title: t('AS 보고서 메일 송부', 'Send AS Report Email') };
    }
    return { subject: '', htmlBody: '', plainFallback: '', attachmentName: '', title: '' };
  }, [kind, project, trip, as, author, additionalComment, achievements, issues, nextSteps, t]);

  const addRecipient = (target, input, setInput, list, setList) => {
    const candidates = (input || '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const next = [...list];
    for (const c of candidates) {
      if (!isValidEmail(c)) continue;
      if (next.includes(c)) continue;
      next.push(c);
    }
    setList(next);
    setInput('');
  };
  const removeRecipient = (list, setList, email) => setList(list.filter(e => e !== email));

  const handleSend = async () => {
    if (toList.length === 0) { setError(t('수신인을 1명 이상 추가하세요.', 'At least one recipient required.')); return; }
    setError('');
    setSending(true);
    const payload = {
      kind,
      to: toList,
      cc: ccList,
      replyTo: authorEmail || '',
      senderName: author ? `${author} (MAK-PMS)` : 'MAK-PMS',
      subject, htmlBody, plainFallback,
      attachmentName: attachmentName || '',
      attachHtml: true,
      projectId: project?.id || '',
      projectName: project?.name || '',
      author: author || ''
    };
    try {
      const result = await callMailAction(payload, mailGasUrl);
      if (result && result.ok) {
        if (onSent) onSent(result);
        onClose();
      } else {
        setError((result && result.message) || t('발송 실패', 'Send failed'));
      }
    } catch (err) {
      setError(err.message || t('발송 실패', 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  const renderRecipientPicker = (label, list, setList, input, setInput, suggestionList) => (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-[28px]">
        {list.length === 0 ? <span className="text-[11px] text-slate-400 italic">{t('비어있음', 'None')}</span> : list.map(e => (
          <span key={e} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">
            {e}
            <button type="button" onClick={() => removeRecipient(list, setList, e)} className="ml-1 text-indigo-500 hover:text-red-500"><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient(label, input, setInput, list, setList); }
          }}
          placeholder={t('이메일 입력 후 Enter (쉼표 구분 가능)', 'Email + Enter (comma OK)')}
          className="flex-1 text-xs p-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500"
        />
        <button type="button" onClick={() => addRecipient(label, input, setInput, list, setList)} disabled={!input.trim()} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded inline-flex items-center">
          <Plus size={11} className="mr-0.5" />{t('추가', 'Add')}
        </button>
      </div>
      {Array.isArray(suggestionList) && suggestionList.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestionList.filter(s => isValidEmail(s) && !list.includes(s)).slice(0, 6).map(s => (
            <button key={s} type="button" onClick={() => setList([...list, s])} className="text-[10px] text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-5 py-4 flex justify-between items-center shrink-0 bg-indigo-50 border-b border-indigo-100">
          <h2 className="text-lg font-bold flex items-center text-indigo-900">
            <Mail size={18} className="mr-2 text-indigo-600" />
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {useSendAsUser ? (
            <div className="bg-emerald-50 text-emerald-800 text-xs rounded-lg p-3 border border-emerald-200 flex items-start">
              <CheckCircle size={13} className="mr-1.5 mt-0.5 shrink-0" />
              <div>
                <strong>{t('본인 계정으로 발송', 'Sent from your own account')}:</strong> {t('현재 브라우저에 로그인된 Google 계정으로 발송되며, 본인 Gmail "보낸편지함"에도 저장됩니다.', 'Sent using your current Google session. Will appear in your Gmail Sent folder.')}
                <div className="text-[11px] mt-1 text-emerald-700">
                  {t('첫 발송 시 Google 권한 동의 화면이 1회 뜰 수 있습니다. "허용"을 누르면 이후부터 자동 발송됩니다.', 'On first send, a Google OAuth consent screen may appear once. Click "Allow" and all later sends are automatic.')}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-800 text-xs rounded-lg p-3 border border-amber-200 flex items-start">
              <AlertTriangle size={13} className="mr-1.5 mt-0.5 shrink-0" />
              <div>
                <strong>{t('발신자 안내', 'Sender info')}:</strong> {t('GAS 시스템 계정으로 발송됩니다. 보낸이 표시: ', 'Sent from system account. Display name: ')}
                <code className="bg-white px-1 rounded">{author ? `${author} (MAK-PMS)` : 'MAK-PMS'}</code>.
                {authorEmail && <> {t('답장은 ', 'Replies go to ')}<code className="bg-white px-1 rounded">{authorEmail}</code>{t('로 전달됩니다.', '.')}</>}
                <div className="text-[11px] mt-1 text-amber-700">
                  {t('본인 계정으로 발송하려면 시스템 설정에서 "메일 발송 GAS URL"을 등록하세요.', 'To send from your own account, configure "Mail GAS URL" in System Settings.')}
                </div>
              </div>
            </div>
          )}

          {renderRecipientPicker(t('수신 (To)', 'To'), toList, setToList, toInput, setToInput, defaultTo)}
          {renderRecipientPicker(t('참조 (CC)', 'CC (optional)'), ccList, setCcList, ccInput, setCcInput, defaultCc)}

          {/* 출장 보고용 필드 */}
          {kind === 'trip_report' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('주요 수행 내용 / 성과', 'Achievements')}</label>
                <textarea rows="3" value={achievements} onChange={(e) => setAchievements(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" placeholder={t('예: Phase 4 셋업 90% 완료, Glass 이송 안정성 확보', 'e.g. Phase 4 90% done')} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('발견 이슈 / 미해결 사항', 'Issues')}</label>
                <textarea rows="3" value={issues} onChange={(e) => setIssues(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('후속 조치 계획', 'Next steps')}</label>
                <textarea rows="2" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('추가 코멘트 (선택)', 'Additional comment (optional)')}</label>
            <textarea rows="2" value={additionalComment} onChange={(e) => setAdditionalComment(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" />
          </div>

          {/* 미리보기 토글 */}
          <div>
            <button type="button" onClick={() => setPreviewOpen(v => !v)} className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center">
              {previewOpen ? <EyeOff size={11} className="mr-1" /> : <Eye size={11} className="mr-1" />}
              {previewOpen ? t('미리보기 닫기', 'Hide preview') : t('미리보기 열기', 'Show preview')}
            </button>
            <div className="text-[11px] text-slate-500 mt-1">
              <strong>{t('제목', 'Subject')}:</strong> <span className="font-mono">{subject}</span>
            </div>
            {previewOpen && (
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                <iframe
                  title="preview"
                  srcDoc={htmlBody}
                  className="w-full h-[420px] bg-white border-0"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-lg flex items-start">
              <AlertTriangle size={13} className="mr-1.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {toList.length > 0 && (
              <span><CheckCircle size={11} className="inline mr-1 text-emerald-600" />{toList.length}{t('명 수신', ' to')}{ccList.length > 0 ? `, ${ccList.length}${t('명 참조', ' cc')}` : ''}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">
              {t('취소', 'Cancel')}
            </button>
            <button
              onClick={handleSend}
              disabled={toList.length === 0 || sending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg inline-flex items-center transition-colors"
            >
              {sending ? <Loader size={12} className="animate-spin mr-1.5" /> : <Send size={12} className="mr-1.5" />}
              {t('메일 발송', 'Send Email')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SendReportEmailModal;
