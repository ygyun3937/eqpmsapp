import React, { useEffect } from 'react';

// 셀 클릭 시 펼쳐지는 작은 정보 카드.
// 사용 패턴:
//   <div className="relative">
//     <button onClick={() => setOpen(v => !v)}>...</button>
//     <InfoPopover open={open} onClose={() => setOpen(false)} align="left">
//       <div>...내용...</div>
//     </InfoPopover>
//   </div>
//
// - 부모에 relative 필요. popover는 absolute로 배치됨 (셀 바로 아래).
// - 외부 클릭 시 backdrop이 onClose 호출.
// - ESC 키로도 닫힘.
// - align: 'left' | 'right' — popover의 가로 정렬.
const InfoPopover = ({ open, onClose, children, align = 'left', width = 'w-80' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const alignCls = align === 'right' ? 'right-0' : 'left-0';
  return (
    <>
      {/* 외부 클릭 닫기 — 클릭이 popover 안으로 전파 안 되도록 stopPropagation */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute z-50 mt-1.5 ${alignCls} ${width} max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-[fadeIn_0.15s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
};

export default InfoPopover;
