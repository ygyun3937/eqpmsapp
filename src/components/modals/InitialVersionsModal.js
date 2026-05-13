import React, { useState, memo } from 'react';
import { X, History, Plus, Trash, Save, AlertTriangle, Info, Upload, FileText, Clipboard, Download, Loader, CheckCircle, Send } from 'lucide-react';
import { getVersionCategoriesForDomain } from '../../constants';
import { parseVersionImportSource, downloadVersionImportTemplate } from '../../utils/importExcel';

const newRow = () => ({ key: Math.random().toString(36).slice(2, 8), category: '', version: '', releaseDate: '', note: '' });

const InitialVersionsModal = memo(function InitialVersionsModal({ project, onClose, onSubmit, t }) {
  const recommended = getVersionCategoriesForDomain(project?.domain, project?.subDomain);
  const [mode, setMode] = useState('manual'); // 'manual' | 'file' | 'paste'
  // 수기 입력 모드
  const [rows, setRows] = useState(() => {
    if (recommended.length > 0) return recommended.map(cat => ({ ...newRow(), category: cat }));
    return [newRow(), newRow(), newRow()];
  });
  // 파일/붙여넣기 모드
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!project) return null;

  const updateRow = (key, patch) => setRows(rows.map(r => r.key === key ? { ...r, ...patch } : r));
  const addRow = () => setRows([...rows, newRow()]);
  const removeRow = (key) => setRows(rows.length > 1 ? rows.filter(r => r.key !== key) : rows);

  const manualValid = rows.filter(r => r.category.trim() && r.version.trim());
  const manualErrors = rows.filter(r => (r.category.trim() && !r.version.trim()) || (!r.category.trim() && r.version.trim()));

  const fileValid = (parseResult?.rows || []).filter(r => r._errors.length === 0);
  const fileErrors = (parseResult?.rows || []).filter(r => r._errors.length > 0);

  const handleFile = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setParsing(true);
    try {
      const r = await parseVersionImportSource({ file });
      setParseResult(r);
    } catch (err) {
      setParseResult({ rows: [], errors: [{ rowIdx: -1, message: err.message || '파일 읽기 실패' }], totalRead: 0 });
    } finally {
      setParsing(false);
    }
  };
  const handleParsePaste = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const r = await parseVersionImportSource({ pasteText });
      setParseResult(r);
    } catch (err) {
      setParseResult({ rows: [], errors: [{ rowIdx: -1, message: err.message || '파싱 실패' }], totalRead: 0 });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let payload = [];
    if (mode === 'manual') {
      payload = manualValid.map(r => ({
        category: r.category.trim(),
        version: r.version.trim(),
        releaseDate: r.releaseDate || '',
        note: r.note.trim() || ''
      }));
    } else {
      payload = fileValid.map(r => ({
        category: r.category,
        version: r.version,
        releaseDate: r.releaseDate || '',
        note: r.note || ''
      }));
    }
    if (payload.length === 0) { setSubmitting(false); return; }
    await onSubmit(project.id, payload);
    setSubmitting(false);
    onClose();
  };

  const validCount = mode === 'manual' ? manualValid.length : fileValid.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-5 py-4 flex justify-between items-center shrink-0 bg-purple-50 border-b border-purple-100">
          <div>
            <h2 className="text-lg font-bold flex items-center text-purple-900">
              <History size={18} className="mr-2 text-purple-600" />
              {t('초기 버전 이력 일괄 등록', 'Initial Version History — Bulk Import')}
            </h2>
            <p className="text-xs text-purple-700 mt-0.5">{project.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {/* 모드 토글 */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            <button onClick={() => setMode('manual')} className={`px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center transition-colors ${mode === 'manual' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Plus size={12} className="mr-1" />{t('수기 입력', 'Manual')}
            </button>
            <button onClick={() => setMode('file')} className={`px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center transition-colors ${mode === 'file' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <FileText size={12} className="mr-1" />{t('파일 업로드 (.xlsx)', 'File Upload')}
            </button>
            <button onClick={() => setMode('paste')} className={`px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center transition-colors ${mode === 'paste' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Clipboard size={12} className="mr-1" />{t('Excel/시트 붙여넣기', 'Paste')}
            </button>
            {mode !== 'manual' && (
              <button onClick={downloadVersionImportTemplate} className="ml-auto px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                <Download size={12} className="mr-1" />{t('템플릿 다운로드', 'Download Template')}
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start">
            <Info size={13} className="mr-1.5 mt-0.5 shrink-0" />
            <div>
              <strong>{t('언제 사용?', 'When to use?')}</strong> {t('MAK-PMS 도입 전부터 누적된 HW/SW/FW 버전 이력을 한 번에 등록. 이후 신규 버전이 연속적으로 누적됩니다.', 'Bulk-import legacy version history; subsequent versions chain naturally.')}
              <div className="mt-1 text-[11px]">
                · {t('수기: 도메인 추천 카테고리가 미리 채워짐. 행 추가/삭제 자유', 'Manual: domain-recommended categories pre-filled.')}<br/>
                · {t('파일/붙여넣기: 템플릿(category/version/releaseDate/note) 또는 직접 시트 복사 → 붙여넣기', 'File/Paste: use template (category/version/releaseDate/note) or paste from sheet.')}
              </div>
            </div>
          </div>

          {/* 수기 모드 */}
          {mode === 'manual' && (
            <>
              <div className="grid grid-cols-[1.2fr_1fr_0.9fr_2fr_auto] gap-2 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div>{t('카테고리', 'Category')}</div>
                <div>{t('버전', 'Version')}</div>
                <div>{t('출시일', 'Release Date')}</div>
                <div>{t('변경 노트 (선택)', 'Notes (optional)')}</div>
                <div></div>
              </div>
              <div className="space-y-1.5">
                {rows.map(r => (
                  <div key={r.key} className="grid grid-cols-[1.2fr_1fr_0.9fr_2fr_auto] gap-2 items-center">
                    <input list="version-cat-list" className="text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:border-purple-500" value={r.category} onChange={e => updateRow(r.key, { category: e.target.value })} placeholder={t('예: HW / SW / FW', 'e.g. HW/SW/FW')} />
                    <input type="text" className="text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:border-purple-500 font-mono" value={r.version} onChange={e => updateRow(r.key, { version: e.target.value })} placeholder="v1.0.0" />
                    <input type="date" max="9999-12-31" className="text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:border-purple-500" value={r.releaseDate} onChange={e => updateRow(r.key, { releaseDate: e.target.value })} />
                    <input type="text" className="text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:border-purple-500" value={r.note} onChange={e => updateRow(r.key, { note: e.target.value })} placeholder={t('주요 변경사항 (선택)', 'Key changes')} />
                    <button type="button" onClick={() => removeRow(r.key)} disabled={rows.length === 1} className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-2"><Trash size={14} /></button>
                  </div>
                ))}
              </div>
              <datalist id="version-cat-list">{recommended.map(c => <option key={c} value={c} />)}</datalist>
              <button type="button" onClick={addRow} className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center px-2 py-1 rounded border border-dashed border-purple-300 hover:bg-purple-50">
                <Plus size={12} className="mr-1" />{t('행 추가', 'Add row')}
              </button>
              {manualErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start">
                  <AlertTriangle size={13} className="mr-1.5 mt-0.5 shrink-0" />
                  {t(`${manualErrors.length}개 행이 카테고리/버전 중 하나만 채워져 있어 등록되지 않습니다.`, `${manualErrors.length} row(s) incomplete — will be skipped.`)}
                </div>
              )}
            </>
          )}

          {/* 파일 모드 */}
          {mode === 'file' && (
            <div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700 file:font-bold hover:file:bg-purple-100" />
              <p className="text-[10px] text-slate-400 mt-1">{t('첫 시트 사용. 필수 컬럼: category(카테고리), version(버전). 선택: releaseDate, note', 'Required: category, version. Optional: releaseDate, note')}</p>
            </div>
          )}

          {/* 붙여넣기 모드 */}
          {mode === 'paste' && (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t(`Excel/Sheets에서 복사해서 붙여넣기. 첫 줄은 헤더.\n\n예:\ncategory\tversion\treleaseDate\tnote\nHW\tRev.A\t2025-06-01\t초도\nSW\tv1.0.0\t2025-06-01\t초도 릴리즈`, 'Paste from sheet. First row = header.')}
                rows={6}
                className="w-full text-xs p-3 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-purple-500"
              />
              <button onClick={handleParsePaste} disabled={!pasteText.trim() || parsing} className="mt-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg inline-flex items-center">
                {parsing ? <Loader size={11} className="animate-spin mr-1" /> : <FileText size={11} className="mr-1" />}
                {t('미리보기', 'Preview')}
              </button>
            </div>
          )}

          {/* 파일/붙여넣기 결과 미리보기 */}
          {(mode === 'file' || mode === 'paste') && parsing && (
            <div className="text-center py-6 text-slate-500">
              <Loader size={20} className="animate-spin mx-auto mb-2" />{t('파싱 중...', 'Parsing...')}
            </div>
          )}
          {(mode === 'file' || mode === 'paste') && parseResult && !parsing && (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold">{t('총 행', 'Total')}</div>
                  <div className="text-lg font-bold text-slate-800">{parseResult.totalRead}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-emerald-600 font-bold">{t('등록 가능', 'Valid')}</div>
                  <div className="text-lg font-bold text-emerald-700">{fileValid.length}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-red-600 font-bold">{t('오류', 'Errors')}</div>
                  <div className="text-lg font-bold text-red-700">{fileErrors.length}</div>
                </div>
              </div>
              {parseResult.errors && parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-800">
                  <AlertTriangle size={12} className="inline mr-1" />
                  {parseResult.errors.map((e, i) => <div key={i}>{e.message}</div>)}
                </div>
              )}
              {parseResult.rows.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">#</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('카테고리', 'Cat')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('버전', 'Version')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('출시일', 'Date')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('노트', 'Note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.rows.map(row => {
                          const isErr = row._errors.length > 0;
                          return (
                            <tr key={row._rowIndex} className={`border-t border-slate-100 ${isErr ? 'bg-red-50' : ''}`}>
                              <td className="px-2 py-1.5 text-slate-400 font-mono">{row._rowIndex}</td>
                              <td className="px-2 py-1.5 font-bold text-slate-800">{row.category || <span className="text-red-500 italic">{t('누락', 'missing')}</span>}</td>
                              <td className="px-2 py-1.5 font-mono">{row.version || <span className="text-red-500 italic">{t('누락', 'missing')}</span>}</td>
                              <td className="px-2 py-1.5 text-slate-600">{row.releaseDate || '-'}</td>
                              <td className="px-2 py-1.5 text-slate-600 truncate max-w-[200px]" title={row.note}>{row.note || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-600">
            {validCount > 0 && (
              <span className="font-bold text-emerald-700 inline-flex items-center"><CheckCircle size={11} className="mr-1" />{validCount}{t('건 등록 예정', ' to import')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">
              {t('취소', 'Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg inline-flex items-center"
            >
              {submitting ? <Loader size={12} className="animate-spin mr-1.5" /> : <Save size={12} className="mr-1.5" />}
              {t(`${validCount}건 일괄 등록`, `Import ${validCount}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InitialVersionsModal;
