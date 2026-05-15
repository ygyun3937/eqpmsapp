import React, { useEffect, useState, useRef, memo } from 'react';
import { QrCode, Printer, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { generateQRDataUrl } from '../../utils/qr';
import { PART_PIPELINE_PHASES } from '../../constants';

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const TYPE_BTNS = [
  { key: 'qr', label: 'QR 코드' },
  { key: 'barcode', label: '바코드 (Code128)' },
  { key: 'text', label: '텍스트만' },
];

const QRLabelModal = memo(function QRLabelModal({ part, onClose, t }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [labelType, setLabelType] = useState('qr');
  const barcodeSvgRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    generateQRDataUrl(part.id)
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [part.id]);

  useEffect(() => {
    if (labelType === 'barcode' && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, part.id, {
          format: 'CODE128',
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 11,
          margin: 4,
        });
      } catch (e) { /* ignore invalid barcode value */ }
    }
  }, [labelType, part.id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(t('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.', 'Popup blocked. Please allow popups in your browser settings.'));
      return;
    }

    let mediaHtml = '';
    if (labelType === 'qr') {
      mediaHtml = qrDataUrl
        ? `<img src="${escapeHtml(qrDataUrl)}" style="width:140px;height:140px" />`
        : '<div style="width:140px;height:140px;background:#eee;display:flex;align-items:center;justify-content:center">QR</div>';
    } else if (labelType === 'barcode') {
      mediaHtml = barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : '';
    } else {
      mediaHtml = `<div style="width:140px;border:1px solid #ccc;padding:12px 8px;text-align:center;font-size:12px;font-family:monospace;word-break:break-all">${escapeHtml(part.id)}</div>`;
    }

    const typeLabel = TYPE_BTNS.find(b => b.key === labelType)?.label || '';

    printWindow.document.write(`
      <html><head><title>${escapeHtml(typeLabel)} 라벨 — ${escapeHtml(part.partName)}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .label { border: 2px solid #333; padding: 16px; width: 420px; }
        .header { background: #4f46e5; color: white; padding: 8px 12px; margin: -16px -16px 12px; }
        .row { display: flex; gap: 16px; align-items: flex-start; }
        .media { display: flex; flex-direction: column; align-items: center; }
        .checklist { font-size: 12px; }
        .checklist li { margin: 2px 0; list-style: none; }
        .checklist li::before { content: '☐ '; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="label">
        <div class="header">
          <div style="font-size:11px;opacity:0.8">MAK-PMS · 자재 라벨 (${escapeHtml(typeLabel)}) | ${escapeHtml(part.projectName)}</div>
          <div style="font-size:18px;font-weight:bold;margin-top:2px">${escapeHtml(part.partName)}</div>
        </div>
        <div class="row">
          <div class="media">
            ${mediaHtml}
            <div style="font-size:10px;text-align:center;margin-top:4px;font-family:monospace">${escapeHtml(part.id)}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;margin-bottom:8px">
              <div><b>P/N:</b> ${escapeHtml(part.partNumber) || '—'}</div>
              <div><b>수량:</b> ${escapeHtml(part.quantity)} EA</div>
              <div><b>긴급도:</b> ${escapeHtml(part.urgency)}</div>
              <div><b>타입:</b> ${escapeHtml(part.type) || '—'}</div>
              <div><b>등록일:</b> ${escapeHtml(part.date)}</div>
            </div>
            <div style="background:#fef3c7;border:1px solid #f59e0b;padding:6px;border-radius:4px">
              <div style="font-size:11px;font-weight:bold;margin-bottom:4px">🔒 QC 체크리스트</div>
              <ul class="checklist">
                ${(part.pipelineConfig?.checklists?.QC || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:10px;color:#666;border-top:1px solid #eee;padding-top:8px">
          현재 단계: ${PART_PIPELINE_PHASES.map(s => s === part.currentStage ? `<b style="color:#4f46e5">${escapeHtml(s)}</b>` : escapeHtml(s)).join(' → ')}
        </div>
      </div>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-indigo-600" />
            <span className="font-bold text-slate-800">{t('라벨 미리보기', 'Label Preview')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              <Printer size={15} /> {t('인쇄', 'Print')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={18} /></button>
          </div>
        </div>

        {/* 라벨 타입 선택 */}
        <div className="px-6 pt-4 flex gap-2">
          {TYPE_BTNS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setLabelType(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                labelType === key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 라벨 미리보기 */}
        <div className="p-6 flex justify-center">
          <div className="border-2 border-slate-300 rounded-xl overflow-hidden w-[460px] shadow-md">
            <div className="bg-indigo-600 text-white px-4 py-3">
              <p className="text-xs opacity-75">{part.projectName} · {part.id}</p>
              <p className="text-lg font-bold mt-0.5">{part.partName}</p>
            </div>
            <div className="p-4 flex gap-4">
              <div className="flex flex-col items-center">
                {labelType === 'qr' && (
                  <>
                    {qrDataUrl
                      ? <img src={qrDataUrl} alt="QR" className="w-32 h-32 border border-slate-200 rounded" />
                      : <div className="w-32 h-32 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">생성 중...</div>
                    }
                    <p className="text-[9px] font-mono text-slate-400 mt-1">{part.id}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t('스캔하여 열기', 'Scan to open')}</p>
                  </>
                )}
                {labelType === 'barcode' && (
                  <>
                    <svg ref={barcodeSvgRef} className="max-w-[160px]" />
                    <p className="text-[9px] font-mono text-slate-400 mt-1">{part.id}</p>
                  </>
                )}
                {labelType === 'text' && (
                  <div className="w-32 h-20 border border-slate-300 rounded flex flex-col items-center justify-center gap-1 bg-slate-50 px-2">
                    <p className="text-[10px] font-mono text-slate-700 text-center break-all">{part.id}</p>
                    <p className="text-[9px] text-slate-400">텍스트 라벨</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-slate-500">P/N</span><p className="font-mono font-bold">{part.partNumber || '—'}</p></div>
                  <div><span className="text-slate-500">수량</span><p className="text-blue-600 font-bold">{part.quantity} EA</p></div>
                  <div><span className="text-slate-500">긴급도</span><p className={`font-bold ${part.urgency === 'High' ? 'text-red-600' : part.urgency === 'Medium' ? 'text-amber-600' : 'text-green-600'}`}>{part.urgency}</p></div>
                  <div><span className="text-slate-500">타입</span><p className="font-medium">{part.type || '—'}</p></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-amber-700 mb-1">🔒 QC 체크리스트</p>
                  {(part.pipelineConfig?.checklists?.QC || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-[11px] text-slate-600">
                      <span className="text-slate-300">☐</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {PART_PIPELINE_PHASES.map((s, i) => (
                  <React.Fragment key={s}>
                    <span className={s === part.currentStage ? 'text-indigo-600 font-bold' : ''}>{s}</span>
                    {i < PART_PIPELINE_PHASES.length - 1 && <span>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QRLabelModal;
