import React, { useState, memo } from 'react';
import { Package, Plus, X } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';
import { PART_TYPES, DEFAULT_CHECKLISTS, PART_PIPELINE_PHASES } from '../../constants';

const deepCloneChecklists = (type) =>
  Object.fromEntries(
    Object.entries(DEFAULT_CHECKLISTS[type]).map(([k, v]) => [k, [...v]])
  );

const PartPipelineModal = memo(function PartPipelineModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    projectId: projects[0]?.id || '',
    partName: '',
    partNumber: '',
    quantity: 1,
    urgency: 'Medium',
    type: '구매형',
    author: '',
  });

  const [checklists, setChecklists] = useState(() => deepCloneChecklists('구매형'));
  const [newItem, setNewItem] = useState({ stage: 'QC', text: '' });

  const handleTypeChange = (type) => {
    setData(d => ({ ...d, type }));
    setChecklists(deepCloneChecklists(type));
  };

  const addChecklistItem = () => {
    if (!newItem.text.trim()) return;
    setChecklists(c => ({
      ...c,
      [newItem.stage]: [...(c[newItem.stage] || []), newItem.text.trim()],
    }));
    setNewItem(n => ({ ...n, text: '' }));
  };

  const removeChecklistItem = (stage, idx) => {
    setChecklists(c => ({ ...c, [stage]: c[stage].filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.projectId) return;
    onSubmit({ ...data, pipelineConfig: { checklists } });
  };

  return (
    <ModalWrapper
      title={t('파트 등록', 'Register Part')}
      icon={<Package size={18} />}
      color="amber"
      maxWidth="max-w-5xl"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t('QR 포함 등록', 'Register with QR')}
    >
      <div className="grid grid-cols-2 gap-6">
        {/* 좌측: 기본 정보 */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('기본 정보', 'Basic Info')}</p>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')} *</label>
            <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e => setData(d => ({ ...d, projectId: e.target.value }))}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('파트명', 'Part Name')} *</label>
              <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.partName} onChange={e => setData(d => ({ ...d, partName: e.target.value }))} placeholder="ex) BMS 컨트롤 보드" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('수량', 'Qty')} *</label>
              <input required type="number" min="1" className="w-full p-2.5 border rounded-lg text-sm text-blue-600 font-bold" value={data.quantity} onChange={e => setData(d => ({ ...d, quantity: parseInt(e.target.value, 10) || 1 }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('도면번호 (P/N)', 'Part Number')}</label>
            <input className="w-full p-2.5 border rounded-lg text-sm font-mono" value={data.partNumber} onChange={e => setData(d => ({ ...d, partNumber: e.target.value }))} placeholder="ex) MAK-BMS-2024-A01" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('긴급도', 'Urgency')}</label>
              <select className="w-full p-2.5 border rounded-lg text-sm" value={data.urgency} onChange={e => setData(d => ({ ...d, urgency: e.target.value }))}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('자재 타입', 'Type')}</label>
              <select className="w-full p-2.5 border rounded-lg text-sm" value={data.type} onChange={e => handleTypeChange(e.target.value)}>
                {PART_TYPES.map(tp => <option key={tp}>{tp}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('등록자', 'Author')} *</label>
            <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e => setData(d => ({ ...d, author: e.target.value }))} />
          </div>
        </div>

        {/* 우측: 단계별 체크리스트 정의 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('단계별 체크리스트', 'Stage Checklists')}</p>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">🔒 QC 게이트</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {PART_PIPELINE_PHASES.map(stage => (
              <div key={stage} className={`rounded-lg border p-2.5 ${stage === 'QC' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-bold mb-1.5 ${stage === 'QC' ? 'text-amber-700' : 'text-slate-600'}`}>{stage}</p>
                {(checklists[stage] || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-0.5">
                    <span>• {item}</span>
                    <button type="button" onClick={() => removeChecklistItem(stage, idx)} className="text-slate-300 hover:text-red-400 ml-2"><X size={12} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <select className="text-xs border rounded-lg px-2 py-1.5" value={newItem.stage} onChange={e => setNewItem(n => ({ ...n, stage: e.target.value }))}>
              {PART_PIPELINE_PHASES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              className="flex-1 text-xs border rounded-lg px-2 py-1.5"
              placeholder={t('항목 추가...', 'Add item...')}
              value={newItem.text}
              onChange={e => setNewItem(n => ({ ...n, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
            />
            <button type="button" onClick={addChecklistItem} className="bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1.5 border">
              <Plus size={14} />
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            {t('QC 체크리스트는 모든 항목 완료 후에만 제조 단계로 넘어갑니다.', 'QC checklist must be fully completed to proceed to manufacturing.')}
          </p>
        </div>
      </div>
    </ModalWrapper>
  );
});

export default PartPipelineModal;
