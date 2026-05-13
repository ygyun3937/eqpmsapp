// 보고서 메일 HTML 양식 (출장신청서 / 출장보고서 / AS보고서)
//
// 양식은 회사 도메인 색상/로고로 커스터마이즈 가능.
// 본문에는 시스템 접속 링크를 함께 넣어, 메일 수신자가 클릭 → 시스템에서 상세 확인.

const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
);

const baseStyles = `
  body { font-family: 'Malgun Gothic', -apple-system, sans-serif; color: #1e293b; max-width: 720px; margin: 0 auto; padding: 24px; }
  .hdr { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 20px 24px; border-radius: 10px 10px 0 0; }
  .hdr h1 { margin: 0 0 4px; font-size: 18px; }
  .hdr .meta { font-size: 11px; opacity: 0.9; }
  .body { background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 20px 24px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; color: #475569; width: 130px; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin: 16px 0 4px; }
  .text-block { background: #f8fafc; padding: 12px; border-left: 3px solid #6366f1; white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .btn { display: inline-block; background: #4f46e5; color: white !important; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px; }
`;

const wrapHtml = (title, badge, content) => `
  <html><head><meta charset="utf-8"></head><body>
  <style>${baseStyles}</style>
  <div class="hdr">
    <div style="font-size:11px; font-weight:bold; opacity:0.85; margin-bottom:6px;">${badge}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">MAK-PMS · ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  <div class="body">
    ${content}
    <div class="footer">MAK-PMS — 산업장비 셋업 관리 시스템 자동 발송 메일입니다.</div>
  </div>
  </body></html>
`;

// === 1. 출장 신청서 ===
export function buildTripRequestEmail({ project, trip, author, additionalComment }) {
  const engineerName = trip.engineerName || author || '';
  const projectName = project?.name || '';
  const projectCustomer = project?.customer || project?.endUser || '';
  const projectId = project?.id || '';
  const site = trip.site || project?.site || '';
  const purpose = trip.purpose || trip.note || '';

  const subject = `[MAK-PMS] 출장 신청서 — ${engineerName} (${projectName} / ${trip.departureDate}~${trip.returnDate})`;

  const content = `
    <table>
      <tr><th>신청자</th><td>${escapeHtml(engineerName)}</td></tr>
      <tr><th>프로젝트</th><td>${escapeHtml(projectName)}${projectCustomer ? ` <span style="color:#64748b">(${escapeHtml(projectCustomer)})</span>` : ''}</td></tr>
      <tr><th>출장지</th><td>${escapeHtml(site || '-')}</td></tr>
      <tr><th>기간</th><td><strong>${escapeHtml(trip.departureDate || '?')} ~ ${escapeHtml(trip.returnDate || '?')}</strong></td></tr>
      ${trip.cost ? `<tr><th>예상 비용</th><td>${escapeHtml(String(trip.cost))}</td></tr>` : ''}
      <tr><th>신청 일시</th><td>${escapeHtml(new Date().toLocaleString('ko-KR'))}</td></tr>
    </table>
    ${purpose ? `<div class="label">출장 목적 / 업무 내용</div><div class="text-block">${escapeHtml(purpose)}</div>` : ''}
    ${additionalComment ? `<div class="label">신청자 추가 코멘트</div><div class="text-block">${escapeHtml(additionalComment)}</div>` : ''}
    <div class="label">프로젝트 ID</div>
    <div style="font-family: monospace; font-size:11px; color:#64748b;">${escapeHtml(projectId)}</div>
  `;

  return {
    subject,
    htmlBody: wrapHtml('출장 신청서', '✈ 출장 신청', content),
    plainFallback: `${subject}\n\n신청자: ${engineerName}\n프로젝트: ${projectName}\n기간: ${trip.departureDate} ~ ${trip.returnDate}\n출장지: ${site}\n${purpose ? '\n목적: ' + purpose : ''}`
  };
}

// === 2. 출장 보고서 ===
export function buildTripReportEmail({ project, trip, author, achievements, issues, nextSteps, additionalComment }) {
  const engineerName = trip.engineerName || author || '';
  const projectName = project?.name || '';
  const subject = `[MAK-PMS] 출장 보고서 — ${engineerName} (${projectName} / ${trip.departureDate}~${trip.returnDate})`;

  const content = `
    <table>
      <tr><th>보고자</th><td>${escapeHtml(engineerName)}</td></tr>
      <tr><th>프로젝트</th><td>${escapeHtml(projectName)}</td></tr>
      <tr><th>출장지</th><td>${escapeHtml(trip.site || project?.site || '-')}</td></tr>
      <tr><th>기간</th><td><strong>${escapeHtml(trip.departureDate || '?')} ~ ${escapeHtml(trip.returnDate || '?')}</strong></td></tr>
      <tr><th>보고 일시</th><td>${escapeHtml(new Date().toLocaleString('ko-KR'))}</td></tr>
    </table>
    ${achievements ? `<div class="label">주요 수행 내용 / 성과</div><div class="text-block">${escapeHtml(achievements)}</div>` : ''}
    ${issues ? `<div class="label">발견 이슈 / 미해결 사항</div><div class="text-block">${escapeHtml(issues)}</div>` : ''}
    ${nextSteps ? `<div class="label">후속 조치 계획</div><div class="text-block">${escapeHtml(nextSteps)}</div>` : ''}
    ${additionalComment ? `<div class="label">기타 코멘트</div><div class="text-block">${escapeHtml(additionalComment)}</div>` : ''}
  `;

  return {
    subject,
    htmlBody: wrapHtml('출장 보고서', '✈ 출장 보고', content),
    plainFallback: `${subject}\n\n보고자: ${engineerName}\n프로젝트: ${projectName}\n기간: ${trip.departureDate} ~ ${trip.returnDate}\n${achievements ? '\n[성과]\n' + achievements : ''}${issues ? '\n[이슈]\n' + issues : ''}${nextSteps ? '\n[후속]\n' + nextSteps : ''}`
  };
}

// === 3. AS 보고서 ===
export function buildASReportEmail({ project, as, author, additionalComment }) {
  const projectName = project?.name || '';
  const customer = project?.customer || project?.endUser || '';
  const asType = as.type || '';
  const asCategory = as.category || 'HW';
  const subject = `[MAK-PMS] AS 보고서 — ${asCategory}/${asType} (${projectName})`;

  const description = as.description || '';
  const resolution = as.resolution || '';
  const comments = Array.isArray(as.comments) ? as.comments : [];

  const commentsHtml = comments.length === 0 ? '' : `
    <div class="label">처리 이력 (${comments.length}건)</div>
    <div style="background:#f8fafc; padding:10px; border-radius:6px; font-size:12px;">
      ${comments.map(c => `<div style="padding:6px 0; border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(c.author || '')}</strong> <span style="color:#94a3b8; font-size:10px;">· ${escapeHtml(c.time || '')}</span><br/>${escapeHtml(c.text || '')}</div>`).join('')}
    </div>
  `;

  const content = `
    <table>
      <tr><th>구분</th><td><span style="background:${asCategory === 'SW' ? '#ede9fe' : '#fef3c7'}; padding:2px 8px; border-radius:4px; font-weight:bold; color:${asCategory === 'SW' ? '#6d28d9' : '#92400e'}; font-size:11px;">${escapeHtml(asCategory)}</span> ${escapeHtml(asType)}</td></tr>
      <tr><th>프로젝트</th><td>${escapeHtml(projectName)}${customer ? ` <span style="color:#64748b">(${escapeHtml(customer)})</span>` : ''}</td></tr>
      <tr><th>담당 엔지니어</th><td>${escapeHtml(as.engineer || author || '-')}</td></tr>
      <tr><th>접수일</th><td>${escapeHtml(as.date || as.reqDate || '-')}</td></tr>
      <tr><th>상태</th><td><strong>${escapeHtml(as.status || '-')}</strong></td></tr>
      ${as.priority ? `<tr><th>중요도</th><td>${escapeHtml(as.priority)}</td></tr>` : ''}
      ${as.serial ? `<tr><th>시리얼</th><td>${escapeHtml(as.serial)}</td></tr>` : ''}
      <tr><th>발송 일시</th><td>${escapeHtml(new Date().toLocaleString('ko-KR'))}</td></tr>
    </table>
    ${description ? `<div class="label">${asCategory === 'SW' ? '문제 증상 / 재현 절차' : '현장 상황 / 증상'}</div><div class="text-block">${escapeHtml(description)}</div>` : ''}
    ${resolution ? `<div class="label">${asCategory === 'SW' ? '원인 분석 / 패치 내역' : '조치 내역'}</div><div class="text-block">${escapeHtml(resolution)}</div>` : ''}
    ${commentsHtml}
    ${additionalComment ? `<div class="label">발송자 추가 코멘트</div><div class="text-block">${escapeHtml(additionalComment)}</div>` : ''}
  `;

  return {
    subject,
    htmlBody: wrapHtml('AS 처리 보고서', `🔧 AS 보고 (${asCategory})`, content),
    plainFallback: `${subject}\n\n프로젝트: ${projectName}\n유형: ${asCategory}/${asType}\n상태: ${as.status}\n${description ? '\n증상:\n' + description : ''}${resolution ? '\n조치:\n' + resolution : ''}`
  };
}
