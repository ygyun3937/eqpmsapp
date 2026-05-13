import React, { useState, memo } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Download, Clipboard, Loader, Send } from 'lucide-react';
import { parseImportSource, downloadImportTemplate } from '../../utils/importExcel';

const ExtraTaskImportModal = memo(function ExtraTaskImportModal({ projectId, projectName, onClose, onSubmit, t }) {
  const [mode, setMode] = useState('file'); // 'file' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null); // { rows, errors, totalRead }
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setParsing(true);
    try {
      const result = await parseImportSource({ file });
      setParseResult(result);
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
      const result = await parseImportSource({ pasteText });
      setParseResult(result);
    } catch (err) {
      setParseResult({ rows: [], errors: [{ rowIdx: -1, message: err.message || '파싱 실패' }], totalRead: 0 });
    } finally {
      setParsing(false);
    }
  };

  const validRows = (parseResult?.rows || []).filter(r => r._errors.length === 0);
  const errorRows = (parseResult?.rows || []).filter(r => r._errors.length > 0);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(projectId, validRows);
      onClose();
    } catch (err) {
      alert((err && err.message) || '등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-pink-50 border-b border-pink-100">
          <div>
            <h2 className="text-lg font-bold flex items-center text-pink-900">
              <Upload size={18} className="mr-2 text-pink-600" />
              {t('추가 대응 — 파일로 일괄 등록', 'Bulk Import — Extra Tasks')}
            </h2>
            <p className="text-xs text-pink-700 mt-0.5">{projectName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 모드 토글 */}
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            <button onClick={() => setMode('file')} className={`px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center transition-colors ${mode === 'file' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <FileText size={12} className="mr-1" />{t('파일 업로드 (.xlsx / .csv)', 'File Upload')}
            </button>
            <button onClick={() => setMode('paste')} className={`px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center transition-colors ${mode === 'paste' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Clipboard size={12} className="mr-1" />{t('Excel/시트 붙여넣기', 'Paste from Sheet')}
            </button>
            <button onClick={downloadImportTemplate} className="ml-auto px-3 py-1.5 text-xs font-bold rounded-md inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <Download size={12} className="mr-1" />{t('템플릿 다운로드', 'Download Template')}
            </button>
          </div>

          {/* 입력 영역 */}
          {mode === 'file' && (
            <div>
              <label className="block">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-50 file:text-pink-700 file:font-bold hover:file:bg-pink-100" />
              </label>
              <p className="text-[10px] text-slate-400 mt-1">{t('첫 번째 시트 사용. 컬럼: name(필수), type, requester, startDate, endDate, status, note', 'First sheet used. Required: name. Optional: type/requester/startDate/endDate/status/note')}</p>
            </div>
          )}

          {mode === 'paste' && (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t(`Excel/Google Sheets에서 복사한 데이터를 여기에 붙여넣으세요. 첫 줄은 헤더.\n\n예:\n작업명\t유형\t요청자\t시작일\t종료일\t상태\t메모\n캘리브레이션 추가\t기능 추가\tLGES 김선임\t2026-01-15\t2026-02-20\t진행중\t1차 협의 완료`, 'Paste from Excel/Sheets. First row = header')}
                rows={8}
                className="w-full text-xs p-3 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim() || parsing}
                className="mt-2 px-4 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg inline-flex items-center"
              >
                {parsing ? <Loader size={11} className="animate-spin mr-1" /> : <FileText size={11} className="mr-1" />}
                {t('미리보기 생성', 'Preview')}
              </button>
            </div>
          )}

          {parsing && (
            <div className="text-center py-6 text-slate-500">
              <Loader size={20} className="animate-spin mx-auto mb-2" />
              {t('파싱 중...', 'Parsing...')}
            </div>
          )}

          {/* 파싱 결과 */}
          {parseResult && !parsing && (
            <div>
              {/* 상단 요약 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold">{t('총 행 수', 'Total Rows')}</div>
                  <div className="text-lg font-bold text-slate-800">{parseResult.totalRead}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-emerald-600 font-bold">{t('등록 가능', 'Valid')}</div>
                  <div className="text-lg font-bold text-emerald-700">{validRows.length}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-red-600 font-bold">{t('오류', 'Errors')}</div>
                  <div className="text-lg font-bold text-red-700">{errorRows.length}</div>
                </div>
              </div>

              {/* 전체 오류 */}
              {parseResult.errors && parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-800">
                  <AlertTriangle size={12} className="inline mr-1" />
                  {parseResult.errors.map((e, i) => <div key={i}>{e.message}</div>)}
                </div>
              )}

              {/* 미리보기 테이블 */}
              {parseResult.rows && parseResult.rows.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    {t('미리보기', 'Preview')} — {t('오류 있는 행은 등록에서 자동 제외됩니다', 'Rows with errors are excluded')}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">#</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('작업명', 'Name')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('유형', 'Type')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('요청자', 'Req')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('기간', 'Range')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('상태', 'Status')}</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-600">{t('비고', 'Note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.rows.map((row) => {
                          const isError = row._errors.length > 0;
                          const isWarn = row._warnings.length > 0;
                          return (
                            <tr key={row._rowIndex} className={`border-t border-slate-100 ${isError ? 'bg-red-50' : isWarn ? 'bg-amber-50' : ''}`}>
                              <td className="px-2 py-1.5 text-slate-400 font-mono">{row._rowIndex}</td>
                              <td className="px-2 py-1.5 font-bold text-slate-800">{row.name || <span className="text-red-500 italic">{t('누락', 'missing')}</span>}</td>
                              <td className="px-2 py-1.5"><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">{row.type}</span></td>
                              <td className="px-2 py-1.5 text-slate-600">{row.requester || '-'}</td>
                              <td className="px-2 py-1.5 text-[10px] text-slate-500">{row.startDate || '?'} ~ {row.endDate || '?'}</td>
                              <td className="px-2 py-1.5"><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">{row.status}</span></td>
                              <td className="px-2 py-1.5 text-slate-600 truncate max-w-[200px]" title={row.note}>{row.note || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* 행별 오류/경고 */}
                  {(errorRows.length > 0 || parseResult.rows.some(r => r._warnings.length > 0)) && (
                    <div className="border-t border-slate-200 bg-slate-50 p-2 text-[10px] space-y-1 max-h-32 overflow-y-auto">
                      {parseResult.rows.filter(r => r._errors.length > 0 || r._warnings.length > 0).map(r => (
                        <div key={r._rowIndex} className="flex items-start gap-1.5">
                          <span className="font-mono text-slate-400">#{r._rowIndex}</span>
                          {r._errors.map((e, i) => <span key={`e${i}`} className="text-red-700 font-bold">❌ {e}</span>)}
                          {r._warnings.map((w, i) => <span key={`w${i}`} className="text-amber-700">⚠ {w}</span>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {validRows.length > 0 && (
              <span className="inline-flex items-center text-emerald-700 font-bold">
                <CheckCircle size={11} className="mr-1" />{t(`${validRows.length}건 등록 가능`, `${validRows.length} ready`)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">
              {t('취소', 'Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={validRows.length === 0 || submitting}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg inline-flex items-center transition-colors"
            >
              {submitting ? <Loader size={12} className="animate-spin mr-1.5" /> : <Send size={12} className="mr-1.5" />}
              {t(`${validRows.length}건 등록`, `Import ${validRows.length}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExtraTaskImportModal;
