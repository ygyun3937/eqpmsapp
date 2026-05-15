import React, { useState, useMemo, memo } from 'react';
import { Plus, Filter, Trash, Download, QrCode, ChevronRight, Lock, Package, AlertTriangle } from 'lucide-react';
import { PART_PHASES, PART_PIPELINE_PHASES } from '../../constants';
import { exportToExcel } from '../../utils/export';
import { getNextStage, getStageCompletion, isPipelineComplete } from '../../utils/partPipeline';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// ===== 파이프라인 탭 =====
const PipelineTab = memo(function PipelineTab({
  pipelineParts, partEvents, getStatusColor,
  onAddPipelinePart, onOpenStageModal, onOpenQRLabel, onDeletePipelinePart, currentUser, t,
}) {
  const [filterStage, setFilterStage] = useState('all');

  const filtered = useMemo(() =>
    filterStage === 'all' ? pipelineParts : pipelineParts.filter(p => p.currentStage === filterStage),
    [pipelineParts, filterStage]
  );

  const completionMap = useMemo(() => {
    const map = {};
    for (const part of pipelineParts) {
      map[part.id] = {
        completedStages: getStageCompletion(part.id, partEvents),
        isComplete: isPipelineComplete(part.id, partEvents),
        hasQCFail: partEvents.some(e => e.partId === part.id && e.stage === 'QC' && e.status === '불합격'),
      };
    }
    return map;
  }, [pipelineParts, partEvents]);

  const getStepClass = (part, step) => {
    const completedStages = completionMap[part.id]?.completedStages || [];
    const currentIdx = PART_PIPELINE_PHASES.indexOf(part.currentStage);
    const stepIdx = PART_PIPELINE_PHASES.indexOf(step);
    if (step === part.currentStage) return 'bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400';
    if (completedStages.includes(step) || stepIdx < currentIdx) return 'bg-indigo-500 text-white border-indigo-600';
    if (step === 'QC') return 'bg-amber-50 text-amber-500 border-amber-200';
    return 'bg-slate-100 text-slate-400 border-slate-200';
  };

  const isQCBlocked = (part, step) => {
    const stepIdx = PART_PIPELINE_PHASES.indexOf(step);
    if (stepIdx <= 2) return false;
    return !partEvents.some(e => e.partId === part.id && e.stage === 'QC' && e.status === '합격');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={15} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
              <option value="all">{t('전체 단계', 'All Stages')}</option>
              {PART_PIPELINE_PHASES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddPipelinePart} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus size={16} className="mr-1.5" /> {t('파트 등록', 'Register Part')}
          </button>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-slate-500 bg-white rounded-xl px-4 py-2 border border-slate-200">
        <span className="font-bold">{t('범례', 'Legend')}:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> {t('완료', 'Done')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-400 inline-block" /> {t('현재', 'Current')}</span>
        <span className="flex items-center gap-1"><Lock size={11} className="text-amber-500" /> {t('QC 게이트', 'QC Gate')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> {t('불합격', 'Rejected')}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트', 'Project')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('수량/긴급도', 'Qty/Urgency')}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{t('파이프라인 단계', 'Pipeline')}</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">{t('등록된 파트가 없습니다.', 'No parts registered.')}</td></tr>
            ) : filtered.map(part => {
              const { isComplete, hasQCFail } = completionMap[part.id] || {};
              const nextStage = getNextStage(part.currentStage);
              return (
                <tr key={part.id} className={`hover:bg-slate-50 transition-colors align-middle ${isComplete ? 'bg-green-50/30' : ''} ${hasQCFail ? 'bg-red-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                        <Package size={20} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{part.partName}</p>
                        <p className="text-xs font-mono text-slate-500">{part.partNumber || '—'}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${part.type === '설계외주형' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{part.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700">{part.projectName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{part.author} · {fmtDate(part.date)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-blue-600">{part.quantity} EA</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PIPELINE_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <div className="relative">
                            <button
                              disabled={step !== part.currentStage || !nextStage || currentUser.role === 'CUSTOMER'}
                              onClick={() => step === part.currentStage && nextStage && onOpenStageModal(part, nextStage)}
                              className={`text-[10px] px-2 py-1 rounded border transition-colors ${getStepClass(part, step)} ${step === part.currentStage && nextStage ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : 'cursor-default'} ${isQCBlocked(part, step) ? 'opacity-40' : ''}`}
                            >
                              {step === 'QC' && <Lock size={9} className="inline mr-0.5 text-amber-500" />}
                              {step}
                            </button>
                          </div>
                          {idx < PART_PIPELINE_PHASES.length - 1 && <ChevronRight size={11} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                      {hasQCFail && <span className="ml-2 text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle size={10} /> QC 불합격</span>}
                      {isComplete && <span className="ml-2 text-[10px] text-green-600 font-bold">✓ 완료</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onOpenQRLabel(part)} className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors" title={t('QR 라벨', 'QR Label')}>
                        <QrCode size={14} />
                      </button>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onDeletePipelinePart(part)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ===== 스페어파트 탭 (기존 유지) =====
const SparePartsTab = memo(function SparePartsTab({ parts, getStatusColor, onUpdateStatus, onDeletePart, onAddClick, currentUser, t }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const filtered = useMemo(() => filterStatus === 'all' ? parts : parts.filter(p => p.status === filterStatus), [parts, filterStatus]);

  const handleExport = () => {
    exportToExcel('자재_리스트', [{
      name: '자재 리스트',
      rows: filtered.map(p => ({ id: p.id, projectName: p.projectName, partName: p.partName, partNumber: p.partNumber, quantity: p.quantity, urgency: p.urgency, status: p.status, author: p.author, date: p.date })),
      columns: [
        { header: 'ID', key: 'id' }, { header: '프로젝트', key: 'projectName' }, { header: '파트명', key: 'partName' },
        { header: 'P/N', key: 'partNumber' }, { header: '수량', key: 'quantity' }, { header: '긴급도', key: 'urgency' },
        { header: '상태', key: 'status' }, { header: '청구자', key: 'author' }, { header: '일자', key: 'date' },
      ],
    }]);
  };

  const getStepClass = (currentStatus, step) => {
    const statusIndex = PART_PHASES.indexOf(currentStatus);
    const stepIndex = PART_PHASES.indexOf(step);
    if (stepIndex < statusIndex) return 'bg-indigo-500 text-white border-indigo-600';
    if (stepIndex === statusIndex) return 'bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400';
    return 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
            <Download size={15} className="mr-1.5" /> Excel
          </button>
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={15} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{t('전체', 'All')}</option>
              {PART_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddClick} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus size={16} className="mr-1.5" /> {t('자재 청구', 'Request Part')}
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트 / 청구자', 'Project / Author')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('수량 및 중요도', 'Qty / Urgency')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('처리 단계', 'Status Phase')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filtered.length === 0
              ? <tr><td colSpan={5} className="text-center py-10 text-slate-400">{t('내역이 없습니다.', 'No parts.')}</td></tr>
              : filtered.map(part => (
                <tr key={part.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">{part.partName}</div>
                    <div className="text-xs text-slate-500 font-mono">P/N: {part.partNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{part.projectName}</div>
                    <div className="text-xs text-slate-500">{part.author} ({fmtDate(part.date)})</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-blue-600">{part.quantity} EA</span>
                    <div className="mt-1"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <button disabled={currentUser.role === 'ENGINEER'} onClick={() => onUpdateStatus(part.id, step)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${getStepClass(part.status, step)}`}>{step}</button>
                          {idx < PART_PHASES.length - 1 && <ChevronRight size={11} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                      <button onClick={() => onDeletePart(part)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        <Trash size={13} className="mr-1" />{t('삭제', 'Delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ===== 메인 뷰 =====
const PartsListView = memo(function PartsListView({
  parts, pipelineParts = [], partEvents = [],
  getStatusColor, onUpdateStatus, onDeletePart, onAddClick,
  onAddPipelinePart, onOpenStageModal, onOpenQRLabel, onDeletePipelinePart,
  currentUser, t,
}) {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('자재 및 스페어파트 관리', 'Parts Management')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('설계→구매→QC→제조→납품 파이프라인 + 스페어파트 청구', 'Pipeline & Spare Parts')}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('pipeline')} className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          📦 {t('파이프라인 관리', 'Pipeline')}
          {pipelineParts.length > 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{pipelineParts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('spare')} className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'spare' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          🔧 {t('스페어파트 청구', 'Spare Parts')}
          {parts.length > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{parts.length}</span>}
        </button>
      </div>

      {activeTab === 'pipeline'
        ? <PipelineTab pipelineParts={pipelineParts} partEvents={partEvents} getStatusColor={getStatusColor} onAddPipelinePart={onAddPipelinePart} onOpenStageModal={onOpenStageModal} onOpenQRLabel={onOpenQRLabel} onDeletePipelinePart={onDeletePipelinePart} currentUser={currentUser} t={t} />
        : <SparePartsTab parts={parts} getStatusColor={getStatusColor} onUpdateStatus={onUpdateStatus} onDeletePart={onDeletePart} onAddClick={onAddClick} currentUser={currentUser} t={t} />
      }
    </div>
  );
});

export default PartsListView;
