import React, { useState, memo } from 'react';
import { Edit, Zap, AlertTriangle, HardDrive, Plus, Trash, Check, X } from 'lucide-react';
import { DOMAINS, BATTERY_DOMAINS } from '../../constants';
import { fmtYMD } from '../../utils/calc';
import ModalWrapper from '../common/ModalWrapper';

const cleanText = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  return s;
};

const ensureArr = (v) => (Array.isArray(v) ? v : []);

const ProjectEditModal = memo(function ProjectEditModal({ project, engineers, currentUser, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    domain: project?.domain || '반도체',
    name: project?.name || '',
    customer: project?.customer || '',
    site: project?.site || '',
    startDate: fmtYMD(project?.startDate),
    dueDate: fmtYMD(project?.dueDate),
    startTBD: !fmtYMD(project?.startDate),
    dueTBD: !fmtYMD(project?.dueDate),
    manager: project?.manager || '',
    notionLink: project?.notionLink || '',
    voltage: cleanText(project?.voltage),
    current: cleanText(project?.current),
    spec: cleanText(project?.spec),
    equipments: ensureArr(project?.equipments)
  });

  const [newEq, setNewEq] = useState({ code: '', name: '', note: '' });
  const [editingEqId, setEditingEqId] = useState(null);
  const [editEqForm, setEditEqForm] = useState({ code: '', name: '', note: '' });

  const addEquipment = () => {
    if (!newEq.code.trim()) return;
    setData({
      ...data,
      equipments: [...data.equipments, { id: Date.now(), code: newEq.code.trim(), name: newEq.name.trim(), note: newEq.note.trim() }]
    });
    setNewEq({ code: '', name: '', note: '' });
  };
  const removeEquipment = (id) => {
    setData({ ...data, equipments: data.equipments.filter(e => e.id !== id) });
  };
  const startEqEdit = (e) => {
    setEditingEqId(e.id);
    setEditEqForm({ code: e.code || '', name: e.name || '', note: e.note || '' });
  };
  const cancelEqEdit = () => setEditingEqId(null);
  const saveEqEdit = () => {
    if (!editEqForm.code.trim()) return;
    setData({
      ...data,
      equipments: data.equipments.map(e => e.id === editingEqId
        ? { ...e, code: editEqForm.code.trim(), name: editEqForm.name.trim(), note: editEqForm.note.trim() }
        : e
      )
    });
    setEditingEqId(null);
  };

  if (!project) return null;
  const list = engineers || [];
  const hasCurrentInList = list.some(e => e.name === data.manager);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isBattery = BATTERY_DOMAINS.includes(data.domain);
  const domainChanged = data.domain !== project.domain;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...data,
      startDate: data.startTBD ? '' : data.startDate,
      dueDate: data.dueTBD ? '' : data.dueDate
    };
    delete payload.startTBD;
    delete payload.dueTBD;
    onSubmit(project.id, payload);
  };

  return (
    <ModalWrapper
      title={t('프로젝트 정보 수정', 'Edit Project')}
      icon={<Edit size={18} />}
      color="indigo"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t('저장', 'Save')}
      t={t}
    >
      {/* 산업군 — ADMIN만 수정 가능 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
          <span>{t('산업군', 'Domain')}</span>
          {!isAdmin && <span className="text-[10px] text-slate-400 font-normal">{t('관리자만 수정 가능', 'Admin only')}</span>}
        </label>
        {isAdmin ? (
          <select className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50 text-indigo-700 font-bold" value={data.domain} onChange={e => setData({...data, domain: e.target.value})}>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input disabled className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 text-slate-500 font-bold" value={data.domain} />
        )}
        {domainChanged && (
          <div className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start">
            <AlertTriangle size={12} className="mr-1 mt-0.5 shrink-0" />
            <span>{t('산업군 변경 시 도메인별 추천 카테고리(검수표/버전 등)가 달라질 수 있습니다. 기존 데이터는 유지됩니다.', 'Domain change updates suggested categories. Existing data is preserved.')}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('프로젝트명', 'Project Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('고객사', 'Customer')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e => setData({...data, customer: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('사이트', 'Site')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.site} onChange={e => setData({...data, site: e.target.value})} />
        </div>
      </div>

      {/* 2차전지 추가 스펙 */}
      {isBattery && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-purple-800 flex items-center"><Zap size={12} className="mr-1" />{t('2차전지 장비 스펙', 'Battery Equipment Specs')}</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('전압', 'Voltage')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.voltage} onChange={e=>setData({...data, voltage:e.target.value})} placeholder={t('예: 5V / 60V / 1000V', 'e.g. 5V')} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('전류', 'Current')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.current} onChange={e=>setData({...data, current:e.target.value})} placeholder={t('예: 100A / 300A', 'e.g. 100A')} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('사양', 'Spec')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.spec} onChange={e=>setData({...data, spec:e.target.value})} placeholder={t('예: 256ch, 파우치셀', 'e.g. 256ch')} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('시작일', 'Start Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.startTBD} onChange={e => setData({...data, startTBD: e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.startTBD} disabled={data.startTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.startTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.startTBD ? '' : data.startDate} onChange={e => setData({...data, startDate: e.target.value})} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('납기일', 'Due Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.dueTBD} onChange={e => setData({...data, dueTBD: e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.dueTBD} disabled={data.dueTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.dueTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.dueTBD ? '' : data.dueDate} onChange={e => setData({...data, dueDate: e.target.value})} />
        </div>
      </div>
      {/* 장비 코드 — 자유 추가/수정/삭제 */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center mb-2">
          <HardDrive size={16} className="text-blue-500 mr-2" />
          <h3 className="text-sm font-bold text-slate-800">{t('장비 코드', 'Equipment Codes')}</h3>
          <span className="ml-2 text-[11px] text-slate-400">{t('프로젝트에 포함된 장비 코드/모델/일련번호 등을 등록', 'Codes, models, serials of equipment in this project')}</span>
          {data.equipments.length > 0 && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">{data.equipments.length}{t('대', '')}</span>
          )}
        </div>

        {data.equipments.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {data.equipments.map(e => (
              <div key={e.id} className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                {editingEqId === e.id ? (
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input value={editEqForm.code} onChange={ev => setEditEqForm({...editEqForm, code: ev.target.value})} className="col-span-3 p-2 border rounded text-xs" placeholder={t('장비 코드', 'Code')} />
                    <input value={editEqForm.name} onChange={ev => setEditEqForm({...editEqForm, name: ev.target.value})} className="col-span-3 p-2 border rounded text-xs" placeholder={t('장비명 (선택)', 'Name (optional)')} />
                    <input value={editEqForm.note} onChange={ev => setEditEqForm({...editEqForm, note: ev.target.value})} className="col-span-4 p-2 border rounded text-xs" placeholder={t('비고 (선택)', 'Note (optional)')} />
                    <div className="col-span-2 flex gap-1">
                      <button type="button" onClick={saveEqEdit} className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded p-1.5 flex items-center justify-center" title={t('저장', 'Save')}><Check size={14} /></button>
                      <button type="button" onClick={cancelEqEdit} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded p-1.5 flex items-center justify-center" title={t('취소', 'Cancel')}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded shrink-0 font-mono">{e.code}</span>
                    {e.name && <span className="text-sm font-bold text-slate-800 break-all">{e.name}</span>}
                    {e.note && <span className="text-xs text-slate-500 ml-1 italic">— {e.note}</span>}
                    <div className="ml-auto flex gap-1 shrink-0">
                      <button type="button" onClick={() => startEqEdit(e)} className="inline-flex items-center px-1.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors" title={t('수정', 'Edit')}>
                        <Edit size={11} className="mr-0.5" />{t('수정', 'Edit')}
                      </button>
                      <button type="button" onClick={() => removeEquipment(e.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                        <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="grid grid-cols-12 gap-2 items-start">
            <input
              value={newEq.code}
              onChange={e => setNewEq({...newEq, code: e.target.value})}
              placeholder={t('장비 코드 (예: EQ-2026-001)', 'Code (e.g. EQ-2026-001)')}
              className="col-span-3 p-2 border rounded text-xs bg-white font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquipment(); } }}
            />
            <input
              value={newEq.name}
              onChange={e => setNewEq({...newEq, name: e.target.value})}
              placeholder={t('장비명 (선택)', 'Name (optional)')}
              className="col-span-3 p-2 border rounded text-xs bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquipment(); } }}
            />
            <input
              value={newEq.note}
              onChange={e => setNewEq({...newEq, note: e.target.value})}
              placeholder={t('비고 (선택)', 'Note (optional)')}
              className="col-span-4 p-2 border rounded text-xs bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquipment(); } }}
            />
            <button
              type="button"
              onClick={addEquipment}
              disabled={!newEq.code.trim()}
              className="col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded p-2 flex items-center justify-center"
            >
              <Plus size={14} className="mr-1" /> {t('추가', 'Add')}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            {t('장비 코드만 입력해도 추가 가능. Enter로 빠르게 등록.', 'Code alone is enough. Press Enter to add.')}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('담당자(PM)', 'Manager')}</label>
        {list.length === 0 ? (
          <input className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e => setData({...data, manager: e.target.value})} placeholder={t('등록된 인력이 없어 직접 입력', 'No engineers — type name')} />
        ) : (
          <select className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e => setData({...data, manager: e.target.value})}>
            <option value="">{t('-- 미지정 --', '-- Unassigned --')}</option>
            {!hasCurrentInList && data.manager && (
              <option value={data.manager}>{data.manager} {t('(레거시)', '(Legacy)')}</option>
            )}
            {list.map(eng => (
              <option key={eng.id} value={eng.name}>
                {eng.name}{eng.dept ? ` · ${eng.dept}` : ''}{eng.role ? ` · ${eng.role}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </ModalWrapper>
  );
});

export default ProjectEditModal;
