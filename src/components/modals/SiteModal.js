import React, { useState, memo } from 'react';
import { Database, Plus, Trash, Cable, Edit, Check, X } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

// 도메인별 추천 라벨 (사용자가 골라쓰면 편하게)
const SUGGESTED_SPECS = [
  '케이블 두께(SQ)', '케이블 길이(m)', '케이블 종류', '단상/3상',
  '접지', '배선 방식', '차단기 용량', '배기 덕트',
  '바닥 하중(kg/m²)', '천장 높이(mm)', 'EMO 위치', '통신/Ethernet'
];

const ensureArr = (v) => (Array.isArray(v) ? v : []);

const SiteModal = memo(function SiteModal({ site, customers, prefill, onClose, onSubmit, t }) {
  const isEdit = !!(site && site.id);
  const [data, setData] = useState(() => {
    if (isEdit) {
      return { customerId: '', ...site, customSpecs: ensureArr(site.customSpecs) };
    }
    const base = { customer: prefill?.customer || '', customerId: prefill?.customerId || '', fab: '', line: '', power: '', pcw: '', gas: '', limit: '', note: '' };
    return { ...base, customSpecs: [] };
  });
  const customerList = customers || [];

  const [newSpec, setNewSpec] = useState({ label: '', value: '', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ label: '', value: '', note: '' });

  const addSpec = () => {
    if (!newSpec.label.trim() || !newSpec.value.trim()) return;
    setData({
      ...data,
      customSpecs: [...data.customSpecs, { id: Date.now(), label: newSpec.label.trim(), value: newSpec.value.trim(), note: newSpec.note.trim() }]
    });
    setNewSpec({ label: '', value: '', note: '' });
  };

  const removeSpec = (id) => {
    setData({ ...data, customSpecs: data.customSpecs.filter(s => s.id !== id) });
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ label: s.label, value: s.value, note: s.note || '' });
  };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = () => {
    if (!editForm.label.trim() || !editForm.value.trim()) return;
    setData({
      ...data,
      customSpecs: data.customSpecs.map(s => s.id === editingId
        ? { ...s, label: editForm.label.trim(), value: editForm.value.trim(), note: editForm.note.trim() }
        : s
      )
    });
    setEditingId(null);
  };

  return (
    <ModalWrapper title={isEdit ? t('사이트 수정', 'Edit Site') : t('새 사이트 등록', 'New Site')} icon={<Database size={20}/>} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={isEdit ? t('수정하기', 'Update') : t('등록하기', 'Submit')}>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>{t('고객사', 'Customer')}</span>
            {!data.customerId && data.customer && customerList.length > 0 && (
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{t('미연결', 'Unlinked')}</span>
            )}
          </label>
          {customerList.length > 0 ? (
            <>
              <select
                className="w-full p-2.5 border rounded-lg text-sm bg-white"
                value={data.customerId || '__manual__'}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__manual__') {
                    setData({ ...data, customerId: '' });
                  } else {
                    const c = customerList.find(x => x.id === v);
                    setData({ ...data, customerId: v, customer: c?.name || data.customer });
                  }
                }}
              >
                <option value="__manual__">{t('-- 직접 입력 --', '-- Type manually --')}</option>
                {customerList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.domain ? ` · ${c.domain}` : ''}</option>
                ))}
              </select>
              {!data.customerId && (
                <input required className="w-full p-2 mt-1.5 border rounded-lg text-sm" placeholder={t('고객사명 직접 입력', 'Enter customer name')} value={data.customer} onChange={e=>setData({...data, customer:e.target.value})} />
              )}
            </>
          ) : (
            <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e=>setData({...data, customer:e.target.value})} />
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('공장/라인', 'Fab/Line')}</label>
          <div className="flex gap-2">
            <input required placeholder="Fab" className="w-1/2 p-2.5 border rounded-lg text-sm" value={data.fab} onChange={e=>setData({...data, fab:e.target.value})} />
            <input required placeholder="Line" className="w-1/2 p-2.5 border rounded-lg text-sm" value={data.line} onChange={e=>setData({...data, line:e.target.value})} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Power</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" placeholder={t('예: 380V 3상 60A', 'e.g. 380V 3-phase 60A')} value={data.power} onChange={e=>setData({...data, power:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('특이사항', 'Notes')}</label>
        <textarea rows="3" className="w-full p-2.5 border rounded-lg text-sm resize-none" placeholder={t('반입 제약/하중 제한, 통신 환경, 기타 주의사항 등', 'Restrictions, weight limits, comms, other notes...')} value={data.note} onChange={e=>setData({...data, note:e.target.value})}></textarea>
      </div>

      {/* 커스텀 스펙 — 케이블 두께/길이 등 도메인별 추가 항목 */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center mb-2">
          <Cable size={16} className="text-purple-500 mr-2" />
          <h3 className="text-sm font-bold text-slate-800">{t('추가 스펙', 'Additional Specs')}</h3>
          <span className="ml-2 text-[11px] text-slate-400">{t('케이블 두께/길이/단상·3상 등 도메인별 항목을 자유롭게 추가', 'Cable thickness/length, phase, etc.')}</span>
          {data.customSpecs.length > 0 && (
            <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-200">{data.customSpecs.length}{t('건', '')}</span>
          )}
        </div>

        {/* 등록된 스펙 목록 */}
        {data.customSpecs.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {data.customSpecs.map(s => (
              <div key={s.id} className="bg-purple-50 border border-purple-100 rounded-lg p-2.5">
                {editingId === s.id ? (
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input value={editForm.label} onChange={e=>setEditForm({...editForm, label:e.target.value})} className="col-span-3 p-2 border rounded text-xs" placeholder={t('항목', 'Label')} />
                    <input value={editForm.value} onChange={e=>setEditForm({...editForm, value:e.target.value})} className="col-span-3 p-2 border rounded text-xs" placeholder={t('값', 'Value')} />
                    <input value={editForm.note} onChange={e=>setEditForm({...editForm, note:e.target.value})} className="col-span-4 p-2 border rounded text-xs" placeholder={t('비고 (선택)', 'Note (optional)')} />
                    <div className="col-span-2 flex gap-1">
                      <button type="button" onClick={saveEdit} className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded p-1.5 flex items-center justify-center" title={t('저장', 'Save')}><Check size={14} /></button>
                      <button type="button" onClick={cancelEdit} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded p-1.5 flex items-center justify-center" title={t('취소', 'Cancel')}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded shrink-0">{s.label}</span>
                    <span className="text-sm font-bold text-slate-800 break-all">{s.value}</span>
                    {s.note && <span className="text-xs text-slate-500 ml-1 italic">— {s.note}</span>}
                    <div className="ml-auto flex gap-1 shrink-0">
                      <button type="button" onClick={() => startEdit(s)} className="inline-flex items-center px-1.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200 transition-colors" title={t('수정', 'Edit')}>
                        <Edit size={11} className="mr-0.5" />{t('수정', 'Edit')}
                      </button>
                      <button type="button" onClick={() => removeSpec(s.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                        <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 새 스펙 입력 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="grid grid-cols-12 gap-2 items-start">
            <input
              list="spec-label-suggestions"
              value={newSpec.label}
              onChange={e => setNewSpec({...newSpec, label: e.target.value})}
              placeholder={t('항목명 (예: 케이블 두께)', 'Label (e.g. Cable thickness)')}
              className="col-span-3 p-2 border rounded text-xs bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpec(); } }}
            />
            <datalist id="spec-label-suggestions">
              {SUGGESTED_SPECS.map(s => <option key={s} value={s} />)}
            </datalist>
            <input
              value={newSpec.value}
              onChange={e => setNewSpec({...newSpec, value: e.target.value})}
              placeholder={t('값 (예: 16SQ)', 'Value (e.g. 16SQ)')}
              className="col-span-3 p-2 border rounded text-xs bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpec(); } }}
            />
            <input
              value={newSpec.note}
              onChange={e => setNewSpec({...newSpec, note: e.target.value})}
              placeholder={t('비고 (선택)', 'Note (optional)')}
              className="col-span-4 p-2 border rounded text-xs bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpec(); } }}
            />
            <button
              type="button"
              onClick={addSpec}
              disabled={!newSpec.label.trim() || !newSpec.value.trim()}
              className="col-span-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded p-2 flex items-center justify-center"
            >
              <Plus size={14} className="mr-1" /> {t('추가', 'Add')}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            {t('항목/값 입력 후 Enter로 빠르게 추가. 충방전기는 케이블 두께·길이·단상/3상 등을 추가하세요.', 'Press Enter to add quickly. Charger: add cable thickness/length, phase, etc.')}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
});

export default SiteModal;
