import React, { memo, useState, useEffect, useRef } from 'react';
import { PenTool } from 'lucide-react';

const SignaturePad = memo(function SignaturePad({ onSign, t }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = () => {
    if (!name.trim()) { alert(t('검수자 이름을 입력해 주세요.', 'Please enter the inspector name.')); return; }
    const signatureData = canvasRef.current.toDataURL('image/png');
    onSign(name.trim(), signatureData);
  };

  return (
    <div className="mt-6 border-t-2 border-indigo-200 pt-5">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
        <PenTool size={24} className="text-indigo-500 mx-auto mb-2" />
        <h4 className="font-bold text-indigo-800 mb-1">{t('고객사 최종 검수 서명', 'Customer Sign-off')}</h4>
        <p className="text-xs text-indigo-600 mb-4">{t('모든 항목이 확인되었습니다. 아래에 서명하여 최종 승인해 주세요.', 'All items confirmed. Please sign below to approve.')}</p>
        <input type="text" placeholder={t("검수자 성명 입력", "Inspector Name")} className="w-full max-w-xs mx-auto mb-3 p-2.5 border border-indigo-300 rounded-lg text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="bg-white border-2 border-dashed border-indigo-300 rounded-xl mx-auto max-w-sm mb-3 relative" style={{ height: '150px' }}>
          <canvas ref={canvasRef} className="w-full h-full rounded-xl cursor-crosshair touch-none"
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 pointer-events-none">{t('여기에 서명해 주세요', 'Sign Here')}</span>
        </div>
        <div className="flex justify-center space-x-3">
          <button type="button" onClick={clearCanvas} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">{t('다시 쓰기', 'Clear')}</button>
          <button type="button" onClick={handleSubmit} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md">{t('최종 승인 (서명 제출)', 'Submit Signature')}</button>
        </div>
      </div>
    </div>
  );
});

export default SignaturePad;
