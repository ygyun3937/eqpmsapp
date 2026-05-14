import React, { useState, useRef, memo } from 'react';
import { Camera, CheckSquare, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { PART_PIPELINE_PHASES } from '../../constants';

const MobilePartPipelineModal = memo(function MobilePartPipelineModal({ part, nextStage, onClose, onAdvance, onReject, t }) {
  const currentStage = part.currentStage;
  const isQC = currentStage === 'QC';
  const checklists = part.pipelineConfig?.checklists?.[currentStage] || [];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  const allChecked = checklists.length === 0 || checklists.every(item => checked[item]);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdvance = () => {
    onAdvance(part.id, nextStage, {
      checklistResults: checked,
      notes,
      photoUrls: photoPreview || '',
      status: isQC ? '합격' : '완료',
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
          <p className="text-xs opacity-75">MAK-PMS QC</p>
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
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-bold ${
                s === currentStage
                  ? 'bg-indigo-100 text-indigo-700'
                  : PART_PIPELINE_PHASES.indexOf(s) < PART_PIPELINE_PHASES.indexOf(currentStage)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {s === currentStage ? `← ${t('현재', 'Current')}` : s}
              </span>
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

        {/* 사진 촬영 */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">{t('검사 사진 (선택)', 'Photo (optional)')}</p>
          {photoPreview
            ? (
              <div className="relative">
                <img src={photoPreview} alt="preview" className="w-full rounded-xl border" />
                <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button>
              </div>
            )
            : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-6 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center text-slate-400">
                <Camera size={28} className="mb-1" />
                <span className="text-sm font-bold">{t('사진 촬영', 'Take Photo')}</span>
              </button>
            )
          }
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
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
        <button
          type="button"
          onClick={handleAdvance}
          disabled={isQC && !allChecked}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✅ {isQC ? t('QC 합격 처리', 'QC Pass') : t(`${nextStage} 단계로 완료`, `Complete → ${nextStage}`)}
        </button>
        {isQC && (
          <button type="button" onClick={handleReject} className="w-full py-4 rounded-2xl border-2 border-red-300 text-red-600 font-bold text-base hover:bg-red-50 transition-colors">
            ❌ {t('QC 불합격 — 반려', 'QC Failed — Reject')}
          </button>
        )}
      </div>
    </div>
  );
});

export default MobilePartPipelineModal;
