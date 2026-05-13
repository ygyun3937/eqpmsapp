import React, { useState, memo, useMemo } from 'react';
import { GitCommit, Plus, Trash, Calendar, User, Info, History, X, Edit, Check, Upload } from 'lucide-react';
import { DOMAIN_VERSION_CATEGORIES, DEFAULT_VERSION_CATEGORIES, formatDomain, getVersionCategoriesForDomain } from '../../constants';
import InitialVersionsModal from './InitialVersionsModal';

const VersionModal = memo(function VersionModal({ project, onClose, onAdd, onAddBulk, onUpdate, onDelete, t }) {
  const [form, setForm] = useState({ category: '', version: '', releaseDate: '', note: '' });
  const [filterCategory, setFilterCategory] = useState('전체');
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ category: '', version: '', releaseDate: '', note: '' });
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const versions = useMemo(() => {
    if (!project) return [];
    const list = (project.versions || []).slice();
    list.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0) || (b.id - a.id));
    return list;
  }, [project]);

  const suggestedCategories = useMemo(() => {
    if (!project) return [];
    const recommended = getVersionCategoriesForDomain(project.domain, project.subDomain);
    const used = new Set(versions.map(v => v.category).filter(Boolean));
    return Array.from(new Set([...recommended, ...used]));
  }, [project, versions]);

  const latestByCategory = useMemo(() => {
    const map = {};
    versions.forEach(v => {
      if (!map[v.category]) map[v.category] = v;
      else {
        const a = new Date(map[v.category].releaseDate || 0);
        const b = new Date(v.releaseDate || 0);
        if (b > a || (b.getTime() === a.getTime() && v.id > map[v.category].id)) map[v.category] = v;
      }
    });
    return map;
  }, [versions]);

  // 카테고리 인덱스 통일: 도메인 추천 카테고리 순서 → 그 외는 알파벳순
  const orderedCategoryEntries = useMemo(() => {
    if (!project) return [];
    const recommended = getVersionCategoriesForDomain(project.domain, project.subDomain);
    const rank = new Map();
    recommended.forEach((c, i) => rank.set(c, i));
    return Object.entries(latestByCategory).sort(([a], [b]) => {
      const ra = rank.has(a) ? rank.get(a) : 999;
      const rb = rank.has(b) ? rank.get(b) : 999;
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [latestByCategory, project]);

  if (!project) return null;

  const filteredVersions = filterCategory === '전체' ? versions : versions.filter(v => v.category === filterCategory);
  const allCategories = ['전체', ...Array.from(new Set([...suggestedCategories, ...versions.map(v => v.category).filter(Boolean)]))];

  const handleAdd = () => {
    setError('');
    if (!form.category.trim()) { setError(t('카테고리를 선택하거나 입력하세요.', 'Select category.')); return; }
    if (!form.version.trim()) { setError(t('버전을 입력하세요.', 'Enter version.')); return; }
    if (!form.note.trim()) { setError(t('변경 내용(이력)을 입력하세요. 추적을 위해 필수 항목입니다.', 'Change note is required for traceability.')); return; }
    onAdd(project.id, { ...form, category: form.category.trim(), version: form.version.trim(), note: form.note.trim() });
    // 폼 리셋 — 카테고리는 유지(연속 등록 편의)
    setForm({ category: form.category, version: '', releaseDate: '', note: '' });
  };

  const handleEnterAdd = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditForm({ category: v.category, version: v.version, releaseDate: v.releaseDate || '', note: v.note || '' });
  };
  const cancelEdit = () => { setEditId(null); setEditForm({ category: '', version: '', releaseDate: '', note: '' }); };
  const saveEdit = () => {
    if (!editForm.category.trim() || !editForm.version.trim()) return;
    onUpdate(project.id, editId, { ...editForm });
    cancelEdit();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-indigo-50">
          <h2 className="text-lg font-bold flex items-center text-indigo-900">
            <GitCommit size={20} className="mr-2 text-indigo-600" />
            {t('버전 관리', 'Version Management')}
          </h2>
          <div className="flex items-center gap-2">
            {onAddBulk && (
              <button
                type="button"
                onClick={() => setBulkImportOpen(true)}
                className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-[11px] font-bold rounded-md border border-purple-300 inline-flex items-center transition-colors"
                title={t('시스템 도입 전 버전 이력을 한 번에 등록', 'Bulk import legacy versions')}
              >
                <Upload size={11} className="mr-1" />{t('초기 이력 일괄 등록', 'Bulk Import')}
              </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 프로젝트 정보 */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">{t('프로젝트', 'Project')}</p>
            <p className="text-sm font-bold text-slate-800">{project.name}</p>
            <p className="text-[11px] text-slate-500">{formatDomain(project.domain, project.subDomain)}{project.customer ? ` · ${project.customer}` : ''}</p>
          </div>

          {/* 카테고리별 최신 버전 — 도메인 추천 순서로 통일 */}
          {orderedCategoryEntries.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                <GitCommit size={12} className="mr-1" />{t('카테고리별 최신 버전', 'Latest by Category')}
                <span className="ml-2 text-[10px] font-normal text-slate-400">{t('(도메인 표준 순서)', '(domain order)')}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {orderedCategoryEntries.map(([cat, v]) => (
                  <div key={cat} className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                    <div className="text-[10px] font-bold text-indigo-600">{cat}</div>
                    <div className="text-sm font-bold text-slate-800 font-mono">{v.version}</div>
                    {v.releaseDate && <div className="text-[10px] text-slate-500">{v.releaseDate}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 버전 등록 폼 — 한 줄에 컴팩트하게 */}
          <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-700 flex items-center"><Plus size={14} className="mr-1" />{t('새 버전 등록', 'Add New Version')}</h3>
              <span className="text-[10px] text-slate-400">{t('카테고리/버전 칸에서 Enter, 노트 칸에서 Ctrl+Enter로 빠른 추가', 'Enter (or Ctrl+Enter in note) to add')}</span>
            </div>

            {/* 1행: 카테고리 + 버전 + 배포일 */}
            <div className="grid grid-cols-12 gap-3">
              {/* 카테고리 */}
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('카테고리', 'Category')} <span className="text-red-500">*</span></label>
                <input list="version-categories" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" value={form.category} onChange={e => setForm({...form, category: e.target.value})} onKeyDown={handleEnterAdd} placeholder={t('예: HW, SW, 충방전기 FW', 'e.g. HW/SW/FW')} />
                <datalist id="version-categories">
                  {suggestedCategories.map(c => <option key={c} value={c} />)}
                </datalist>
                {/* 추천 카테고리 칩 */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {suggestedCategories.slice(0, 6).map(c => (
                    <button key={c} type="button" onClick={() => setForm({...form, category: c})} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${form.category === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 버전 */}
              <div className="col-span-7 md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('버전', 'Version')} <span className="text-red-500">*</span></label>
                <input className="w-full text-sm p-2.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" value={form.version} onChange={e => setForm({...form, version: e.target.value})} onKeyDown={handleEnterAdd} placeholder="v1.0.0" />
              </div>

              {/* 배포일 */}
              <div className="col-span-5 md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('배포일', 'Date')}</label>
                <input type="date" max="9999-12-31" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" value={form.releaseDate} onChange={e => setForm({...form, releaseDate: e.target.value})} onKeyDown={handleEnterAdd} />
              </div>
            </div>

            {/* 2행: 변경 내용 (필수, 전체 폭) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('변경 내용 / 이력 노트', 'Change Notes')} <span className="text-red-500">*</span>
                <span className="ml-1 text-[10px] font-normal text-slate-500">{t('(추적을 위해 필수)', '(required)')}</span>
              </label>
              <textarea rows="2" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 resize-none" value={form.note} onChange={e => setForm({...form, note: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdd(); } }} placeholder={t('예: SECS/GEM 통신 안정화, 알람 리셋 버그 수정 / Ctrl+Enter로 빠른 추가', 'e.g. release notes (Ctrl+Enter to add)')} />
            </div>

            {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>}

            {/* 3행: 추가 버튼 (우측 정렬, 폼 하단) */}
            <div className="flex justify-end items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 mr-auto">{t('* 필수 항목', '* Required')}</span>
              <button
                type="button"
                onClick={() => setForm({ category: '', version: '', releaseDate: '', note: '' })}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-lg transition-colors"
              >
                {t('초기화', 'Clear')}
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                <Plus size={14} className="mr-1" />{t('버전 추가', 'Add Version')}
              </button>
            </div>
          </div>

          {/* 이력 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700 flex items-center"><History size={14} className="mr-1.5" />{t('버전 이력', 'History')} ({filteredVersions.length})</p>
              {allCategories.length > 1 && (
                <select className="text-xs p-1.5 border border-slate-200 rounded bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            {filteredVersions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                <Info size={16} className="inline mr-1" />
                {t('등록된 버전 이력이 없습니다. 위에서 첫 버전을 등록해 주세요.', 'No versions yet. Add the first one above.')}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredVersions.map(v => (
                  <div key={v.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                    {editId === v.id ? (
                      // 인라인 편집 모드
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <input className="col-span-4 text-sm p-2 border border-indigo-300 rounded" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} placeholder="카테고리" />
                          <input className="col-span-4 text-sm p-2 border border-indigo-300 rounded font-mono" value={editForm.version} onChange={e => setEditForm({...editForm, version: e.target.value})} placeholder="버전" />
                          <input type="date" max="9999-12-31" className="col-span-4 text-sm p-2 border border-indigo-300 rounded" value={editForm.releaseDate} onChange={e => setEditForm({...editForm, releaseDate: e.target.value})} />
                        </div>
                        <input className="w-full text-sm p-2 border border-indigo-300 rounded" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} placeholder="노트" />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={cancelEdit} className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded font-bold">{t('취소', 'Cancel')}</button>
                          <button type="button" onClick={saveEdit} className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded font-bold inline-flex items-center"><Check size={11} className="mr-1" />{t('저장', 'Save')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center text-sm font-bold text-slate-800 flex-wrap gap-1.5">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{v.category}</span>
                            <span className="font-mono">{v.version}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                            {v.releaseDate && <span className="flex items-center"><Calendar size={10} className="mr-0.5" />{v.releaseDate}</span>}
                            {v.author && <span className="flex items-center"><User size={10} className="mr-0.5" />{v.author}</span>}
                          </div>
                          {v.note && <div className="text-[12px] text-slate-700 italic mt-2 bg-slate-50 p-2 rounded border border-slate-100">{v.note}</div>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button type="button" onClick={() => startEdit(v)} className="inline-flex items-center px-1.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition-colors" title={t('수정', 'Edit')}>
                            <Edit size={11} className="mr-0.5" />{t('수정', 'Edit')}
                          </button>
                          <button type="button" onClick={() => onDelete(project.id, v.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                            <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
            {t('닫기', 'Close')}
          </button>
        </div>
      </div>
      {bulkImportOpen && (
        <InitialVersionsModal
          project={project}
          onClose={() => setBulkImportOpen(false)}
          onSubmit={(projectId, entries) => { if (onAddBulk) onAddBulk(projectId, entries); }}
          t={t}
        />
      )}
    </div>
  );
});

export default VersionModal;
