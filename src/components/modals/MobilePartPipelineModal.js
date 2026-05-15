import React, { useState, useRef, memo } from 'react';
import { Camera, CheckSquare, X, AlertTriangle, ChevronRight, Paperclip, File, FileText } from 'lucide-react';
import { PART_PIPELINE_PHASES } from '../../constants';

const fmtSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const isImage = (file) => file.type.startsWith('image/');

const MobilePartPipelineModal = memo(function MobilePartPipelineModal({ part, nextStage, onClose, onAdvance, onReject, onUploadFile, t }) {
  const currentStage = part.currentStage;
  const isQC = currentStage === 'QC';
  const checklists = part.pipelineConfig?.checklists?.[currentStage] || [];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);
  const docRef = useRef(null);

  const allChecked = checklists.length === 0 || checklists.every(item => checked[item]);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const handleAdvance = async () => {
    let attachments = [];
    if (onUploadFile && pendingFiles.length > 0) {
      setUploading(true);
      for (const file of pendingFiles) {
        const att = await onUploadFile(file);
        if (att) attachments.push(att);
      }
      setUploading(false);
    }
    onAdvance(part.id, nextStage, {
      checklistResults: checked,
      notes,
      photoUrls: '',
      status: isQC ? '합격' : '완료',
      attachments,
    });
  };

  const handleReject = () => {
    if (!notes.trim()) { alert(t('반려 사유를 입력해주세요.', 'Enter rejection reason.')); return; }
    onReject(part.id, currentStage, notes);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* 상단 헤더 */}
      <div className="bg-indigo-600 text-white px-4 pt-10 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75">MAK-PMS · {currentStage} 단계</p>
          <p className="font-bold text-lg">{part.partName}</p>
          <p className="text-xs opacity-75 font-mono mt-0.5">{part.id}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><X size={20} /></button>
      </div>

      {/* 단계 브레드크럼 */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1 overflow-x-auto">
          {PART_PIPELINE_PHASES.map((s, i) => (
            <React.Fragment key={s}>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-bold flex-shrink-0 ${
                s === currentStage
                  ? 'bg-indigo-100 text-indigo-700'
                  : PART_PIPELINE_PHASES.indexOf(s) < PART_PIPELINE_PHASES.indexOf(currentStage)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-400'
              }`}>{s}</span>
              {i < PART_PIPELINE_PHASES.length - 1 && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* 체크리스트 */}
        {checklists.length > 0 && (
          <div className={`rounded-2xl border-2 p-4 space-y-3 ${isQC ? 'border-amber-300 bg-amber-50' : 'border-indigo-200 bg-indigo-50'}`}>
            <div className="flex justify-between items-center">
              <p className="font-bold text-slate-800">{t(`${currentStage} 체크리스트`, `${currentStage} Checklist`)}</p>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${allChecked ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {completedCount}/{checklists.length}
              </span>
            </div>
            {checklists.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setChecked(c => ({ ...c, [item]: !c[item] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${checked[item] ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked[item] ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                  {checked[item] && <CheckSquare size={14} className="text-white" />}
                </div>
                <span className={`text-sm font-medium ${checked[item] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item}</span>
              </button>
            ))}
          </div>
        )}

        {/* 파일 첨부 */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">{t('첨부 파일 (선택)', 'Attachments (optional)')}</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center text-slate-400 hover:bg-slate-50 active:bg-slate-100">
              <Camera size={22} className="mb-1" />
              <span className="text-xs font-bold">{t('사진 촬영', 'Take Photo')}</span>
            </button>
            <button type="button" onClick={() => docRef.current?.click()}
              className="flex-1 py-3 rounded-xl border-2 border-dashed border-indigo-200 flex flex-col items-center text-indigo-400 hover:bg-indigo-50 active:bg-indigo-100">
              <FileText size={22} className="mb-1" />
              <span className="text-xs font-bold">{t('서류 첨부', 'Attach Doc')}</span>
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileAdd} />
          <input ref={docRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.zip,image/*" className="hidden" onChange={handleFileAdd} />

          {pendingFiles.length > 0 && (
            <div className="space-y-2 mt-2">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  {isImage(file)
                    ? <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" />
                    : <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100"><File size={18} className="text-indigo-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{fmtSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(idx)} className="p-1 text-slate-400 hover:text-red-500"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('메모', 'Notes')}</label>
          <textarea
            className="w-full p-3 border-2 rounded-xl text-sm resize-none"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('특이사항 또는 반려 사유...', 'Notes or rejection reason...')}
          />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-4 pb-8 pt-4 space-y-3 border-t border-slate-100 bg-white">
        {isQC && !allChecked && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {t('모든 항목 체크 후 합격 처리 가능합니다.', 'Check all items to pass QC.')}
          </p>
        )}
        {pendingFiles.length > 0 && !uploading && (
          <p className="text-xs text-indigo-600 flex items-center gap-1">
            <Paperclip size={12} /> {t(`${pendingFiles.length}개 파일 업로드 후 진행됩니다.`, `${pendingFiles.length} file(s) will be uploaded.`)}
          </p>
        )}
        <button
          type="button"
          onClick={handleAdvance}
          disabled={(isQC && !allChecked) || uploading}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading
            ? t('업로드 중...', 'Uploading...')
            : isQC
              ? t('✅ QC 합격 처리', '✅ QC Pass')
              : t(`✅ ${nextStage} 단계로 완료`, `✅ Complete → ${nextStage}`)
          }
        </button>
        {isQC && (
          <button type="button" onClick={handleReject} disabled={uploading}
            className="w-full py-4 rounded-2xl border-2 border-red-300 text-red-600 font-bold text-base hover:bg-red-50 transition-colors disabled:opacity-40">
            ❌ {t('QC 불합격 — 반려', 'QC Failed — Reject')}
          </button>
        )}
      </div>
    </div>
  );
});

export default MobilePartPipelineModal;
