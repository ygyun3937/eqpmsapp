import React, { useState, memo } from 'react';
import { CheckSquare, AlertTriangle } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const PartStageModal = memo(function PartStageModal({ part, nextStage, onClose, onAdvance, onReject, t }) {
  const currentStage = part.currentStage;
  const isQC = currentStage === 'QC';
  const checklists = part.pipelineConfig?.checklists?.[currentStage] || [];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');

  const allChecked = checklists.length === 0 || checklists.every(item => checked[item]);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const toggleItem = (item) => setChecked(c => ({ ...c, [item]: !c[item] }));

  const handleAdvance = (e) => {
    e.preventDefault();
    onAdvance(part.id, nextStage, {
      checklistResults: checked,
      notes,
      status: isQC ? '합격' : '완료',
    });
  };

  const handleReject = () => {
    if (!notes.trim()) { alert(t('반려 사유를 입력해주세요.', 'Please enter rejection reason.')); return; }
    onReject(part.id, currentStage, notes);
  };

  return (
    <ModalWrapper
      title={`${currentStage} → ${nextStage}`}
      icon={<CheckSquare size={18} />}
      color={isQC ? 'amber' : 'indigo'}
      onClose={onClose}
      onSubmit={handleAdvance}
      submitText={t(`${nextStage} 단계로 이동`, `Move to ${nextStage}`)}
      submitDisabled={isQC && !allChecked}
      t={t}
    >
      {/* 파트 요약 */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
        <p className="font-bold text-slate-800">{part.partName}</p>
        <p className="text-xs text-slate-500 font-mono">{part.id} · {part.projectName}</p>
      </div>

      {/* 체크리스트 */}
      {checklists.length > 0 && (
        <div className={`rounded-xl border p-4 space-y-2 ${isQC ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-bold ${isQC ? 'text-amber-800' : 'text-slate-700'}`}>
              {isQC ? t('🔒 QC 체크리스트', '🔒 QC Checklist') : t(`${currentStage} 체크리스트`, `${currentStage} Checklist`)}
            </p>
            <span className="text-xs font-bold text-slate-500">{completedCount} / {checklists.length}</span>
          </div>
          {checklists.map((item) => (
            <label key={item} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={() => toggleItem(item)}
                className="w-5 h-5 rounded accent-indigo-600"
              />
              <span className={`text-sm ${checked[item] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item}</span>
            </label>
          ))}
          {isQC && !allChecked && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
              <AlertTriangle size={12} /> {t('모든 항목 완료 후 다음 단계로 이동 가능합니다.', 'All items must be checked to proceed.')}
            </p>
          )}
        </div>
      )}

      {/* 메모 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Notes (optional)')}</label>
        <textarea
          className="w-full p-2.5 border rounded-lg text-sm resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('특이사항 또는 반려 사유 입력...', 'Enter notes or rejection reason...')}
        />
      </div>

      {/* 반려 버튼 (QC 단계에서만) */}
      {isQC && (
        <button
          type="button"
          onClick={handleReject}
          className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
        >
          ❌ {t('QC 불합격 — 구매 단계로 반려', 'QC Failed — Return to Purchase')}
        </button>
      )}
    </ModalWrapper>
  );
});

export default PartStageModal;
