const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// QC 성적서 HTML 생성 — 브라우저 print()로 PDF 저장 가능
export const generateQCReport = (part, stageRecord) => {
  const { actor, completedAt, checklistResults = {}, notes = '', photoUrls = '' } = stageRecord;
  const date = completedAt ? new Date(completedAt).toLocaleDateString('ko-KR') : '-';
  const passed = Object.keys(checklistResults).length > 0 && Object.values(checklistResults).every(Boolean);

  const rows = Object.entries(checklistResults).map(([item, result]) =>
    `<tr><td>${escapeHtml(item)}</td><td style="color:${result ? 'green' : 'red'};font-weight:bold">${result ? '합격 ✓' : '불합격 ✗'}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>QC 성적서 — ${escapeHtml(part.partName)}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
    h1 { color: #1e293b; font-size: 22px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 14px; }
    .meta span { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .verdict { font-size: 20px; font-weight: bold; padding: 12px; border-radius: 8px; text-align: center; margin: 16px 0; }
    .pass { background: #d1fae5; color: #065f46; }
    .fail { background: #fee2e2; color: #991b1b; }
    .photo img { max-width: 300px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>QC 성적서 (Inspection Report)</h1>
  <div class="meta">
    <div><span>파트명:</span> <strong>${escapeHtml(part.partName)}</strong></div>
    <div><span>파트 ID:</span> <strong>${escapeHtml(part.id)}</strong></div>
    <div><span>도면번호:</span> <strong>${escapeHtml(part.partNumber) || '-'}</strong></div>
    <div><span>프로젝트:</span> <strong>${escapeHtml(part.projectName)}</strong></div>
    <div><span>검사자:</span> <strong>${escapeHtml(actor)}</strong></div>
    <div><span>검사일:</span> <strong>${escapeHtml(date)}</strong></div>
  </div>
  <div class="verdict ${passed ? 'pass' : 'fail'}">${passed ? '✅ 최종 합격' : '❌ 최종 불합격'}</div>
  <table>
    <thead><tr><th>검사 항목</th><th>결과</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${notes ? `<p><strong>특이사항:</strong> ${escapeHtml(notes)}</p>` : ''}
  ${photoUrls ? `<div class="photo"><strong>첨부 사진:</strong><br/><img src="${escapeHtml(photoUrls)}" /></div>` : ''}
  <p style="font-size:12px;color:#94a3b8;margin-top:32px">본 성적서는 MAK-PMS에서 자동 생성되었습니다. 생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
};

// 납품확인서 HTML 생성
export const generateDeliveryNote = (part, stageRecord) => {
  const { actor, completedAt, notes = '', photoUrls = '' } = stageRecord;
  const date = completedAt ? new Date(completedAt).toLocaleDateString('ko-KR') : '-';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>납품확인서 — ${escapeHtml(part.partName)}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
    h1 { color: #1e293b; font-size: 22px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 14px; }
    .meta span { color: #64748b; }
    .sign-box { border: 2px solid #334155; padding: 24px; margin: 24px 0; min-height: 80px; }
    .confirmed { font-size: 18px; font-weight: bold; padding: 12px; background: #d1fae5; color: #065f46; border-radius: 8px; text-align: center; margin: 16px 0; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>납품확인서 (Delivery Confirmation)</h1>
  <div class="meta">
    <div><span>파트명:</span> <strong>${escapeHtml(part.partName)}</strong></div>
    <div><span>수량:</span> <strong>${escapeHtml(part.quantity)} EA</strong></div>
    <div><span>도면번호:</span> <strong>${escapeHtml(part.partNumber) || '-'}</strong></div>
    <div><span>프로젝트:</span> <strong>${escapeHtml(part.projectName)}</strong></div>
    <div><span>납품 담당자:</span> <strong>${escapeHtml(actor)}</strong></div>
    <div><span>납품일:</span> <strong>${escapeHtml(date)}</strong></div>
  </div>
  <div class="confirmed">✅ 납품 완료</div>
  ${notes ? `<p><strong>비고:</strong> ${escapeHtml(notes)}</p>` : ''}
  <div class="sign-box">
    <p style="font-size:12px;color:#64748b;margin:0 0 16px">고객 서명 / Customer Signature:</p>
    ${photoUrls ? `<img src="${escapeHtml(photoUrls)}" style="max-width:200px" />` : ''}
  </div>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px">본 납품확인서는 MAK-PMS에서 자동 생성되었습니다. 생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
};

// 문서를 새 창에서 열어 인쇄 다이얼로그 표시
export const openDocumentForPrint = (html) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
};
