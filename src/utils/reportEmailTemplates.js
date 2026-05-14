// 보고서 메일 HTML 양식 (출장신청서 / 출장보고서 / AS보고서)
//
// [중요] 메일 클라이언트(Gmail, Outlook 등)는 <style> 블록을 제거하거나 무시함.
// 그래서 모든 스타일은 **inline style 속성**으로 작성해야 함. CSS 클래스 사용 금지.
//
// [이모지] 일부 클라이언트/GAS 인코딩에서 ������ 처럼 깨지는 사례 있어 텍스트 접두사([AS], [출장])로 대체.

const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
);

// 공통 스타일 상수 (inline용)
const S = {
  body: "font-family: 'Malgun Gothic', -apple-system, sans-serif; color: #1e293b; max-width: 720px; margin: 0 auto; padding: 24px; background: #f8fafc;",
  hdr: "background: #4f46e5; color: white; padding: 20px 24px; border-radius: 10px 10px 0 0;",
  hdrBadge: "font-size: 11px; font-weight: bold; opacity: 0.85; margin-bottom: 6px; letter-spacing: 0.5px;",
  hdrTitle: "margin: 0 0 4px; font-size: 20px; font-weight: 700;",
  hdrMeta: "font-size: 11px; opacity: 0.9;",
  bodyBox: "background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 20px 24px;",
  table: "width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px;",
  th: "background: #f1f5f9; padding: 8px 12px; text-align: left; color: #475569; width: 130px; font-weight: 600; border-bottom: 1px solid #e2e8f0;",
  td: "padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top;",
  label: "color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin: 16px 0 4px;",
  textBlock: "background: #f8fafc; padding: 12px; border-left: 3px solid #6366f1; white-space: pre-wrap; font-size: 13px; line-height: 1.6; margin: 4px 0 12px;",
  footer: "text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;",
  monoSm: "font-family: monospace; font-size: 11px; color: #64748b;"
};

const wrapHtml = (title, badge, content) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="${S.body}">
  <div style="${S.hdr}">
    <div style="${S.hdrBadge}">${escapeHtml(badge)}</div>
    <h1 style="${S.hdrTitle}">${escapeHtml(title)}</h1>
    <div style="${S.hdrMeta}">MAK-PMS &middot; ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  <div style="${S.bodyBox}">
    ${content}
    <div style="${S.footer}">MAK-PMS — 산업장비 셋업 관리 시스템 자동 발송 메일입니다.</div>
  </div>
</body></html>`;

// 표 행 헬퍼 — th/td 인라인 스타일 자동 적용
const row = (label, value) =>
  `<tr><th style="${S.th}">${escapeHtml(label)}</th><td style="${S.td}">${value}</td></tr>`;

const labelBlock = (label, text) =>
  text ? `<div style="${S.label}">${escapeHtml(label)}</div><div style="${S.textBlock}">${escapeHtml(text)}</div>` : '';

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
    <table style="${S.table}">
      ${row('신청자', escapeHtml(engineerName))}
      ${row('프로젝트', `${escapeHtml(projectName)}${projectCustomer ? ` <span style="color:#64748b">(${escapeHtml(projectCustomer)})</span>` : ''}`)}
      ${row('출장지', escapeHtml(site || '-'))}
      ${row('기간', `<strong>${escapeHtml(trip.departureDate || '?')} ~ ${escapeHtml(trip.returnDate || '?')}</strong>`)}
      ${trip.cost ? row('예상 비용', escapeHtml(String(trip.cost))) : ''}
      ${row('신청 일시', escapeHtml(new Date().toLocaleString('ko-KR')))}
    </table>
    ${labelBlock('출장 목적 / 업무 내용', purpose)}
    ${labelBlock('신청자 추가 코멘트', additionalComment)}
    <div style="${S.label}">프로젝트 ID</div>
    <div style="${S.monoSm}">${escapeHtml(projectId)}</div>
  `;

  return {
    subject,
    htmlBody: wrapHtml('출장 신청서', '[출장 신청]', content),
    plainFallback: `${subject}\n\n신청자: ${engineerName}\n프로젝트: ${projectName}\n기간: ${trip.departureDate} ~ ${trip.returnDate}\n출장지: ${site}\n${purpose ? '\n목적: ' + purpose : ''}`,
    attachmentName: `MAK-PMS-출장신청서-${engineerName || '담당미정'}-${new Date().toISOString().slice(0, 10)}.html`
  };
}

// === 2. 출장 보고서 ===
export function buildTripReportEmail({ project, trip, author, achievements, issues, nextSteps, additionalComment }) {
  const engineerName = trip.engineerName || author || '';
  const projectName = project?.name || '';
  const subject = `[MAK-PMS] 출장 보고서 — ${engineerName} (${projectName} / ${trip.departureDate}~${trip.returnDate})`;

  const content = `
    <table style="${S.table}">
      ${row('보고자', escapeHtml(engineerName))}
      ${row('프로젝트', escapeHtml(projectName))}
      ${row('출장지', escapeHtml(trip.site || project?.site || '-'))}
      ${row('기간', `<strong>${escapeHtml(trip.departureDate || '?')} ~ ${escapeHtml(trip.returnDate || '?')}</strong>`)}
      ${row('보고 일시', escapeHtml(new Date().toLocaleString('ko-KR')))}
    </table>
    ${labelBlock('주요 수행 내용 / 성과', achievements)}
    ${labelBlock('발견 이슈 / 미해결 사항', issues)}
    ${labelBlock('후속 조치 계획', nextSteps)}
    ${labelBlock('기타 코멘트', additionalComment)}
  `;

  return {
    subject,
    htmlBody: wrapHtml('출장 보고서', '[출장 보고]', content),
    plainFallback: `${subject}\n\n보고자: ${engineerName}\n프로젝트: ${projectName}\n기간: ${trip.departureDate} ~ ${trip.returnDate}\n${achievements ? '\n[성과]\n' + achievements : ''}${issues ? '\n[이슈]\n' + issues : ''}${nextSteps ? '\n[후속]\n' + nextSteps : ''}`,
    attachmentName: `MAK-PMS-출장보고서-${engineerName || '담당미정'}-${new Date().toISOString().slice(0, 10)}.html`
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

  // 구분 셀(SW=보라, HW=앰버) — 인라인 스타일
  const catChipStyle = asCategory === 'SW'
    ? 'background:#ede9fe; color:#6d28d9;'
    : 'background:#fef3c7; color:#92400e;';
  const catCell = `<span style="${catChipStyle} padding:2px 8px; border-radius:4px; font-weight:bold; font-size:11px;">${escapeHtml(asCategory)}</span> ${escapeHtml(asType)}`;

  const commentsHtml = comments.length === 0 ? '' : `
    <div style="${S.label}">처리 이력 (${comments.length}건)</div>
    <div style="background:#f8fafc; padding:10px; border-radius:6px; font-size:12px; margin:4px 0 12px;">
      ${comments.map(c => `<div style="padding:6px 0; border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(c.author || '')}</strong> <span style="color:#94a3b8; font-size:10px;">&middot; ${escapeHtml(c.time || '')}</span><br/>${escapeHtml(c.text || '')}</div>`).join('')}
    </div>
  `;

  const content = `
    <table style="${S.table}">
      ${row('구분', catCell)}
      ${row('프로젝트', `${escapeHtml(projectName)}${customer ? ` <span style="color:#64748b">(${escapeHtml(customer)})</span>` : ''}`)}
      ${row('담당 엔지니어', escapeHtml(as.engineer || author || '-'))}
      ${row('접수일', escapeHtml(as.date || as.reqDate || '-'))}
      ${row('상태', `<strong>${escapeHtml(as.status || '-')}</strong>`)}
      ${as.priority ? row('중요도', escapeHtml(as.priority)) : ''}
      ${as.serial ? row('시리얼', escapeHtml(as.serial)) : ''}
      ${row('발송 일시', escapeHtml(new Date().toLocaleString('ko-KR')))}
    </table>
    ${labelBlock(asCategory === 'SW' ? '문제 증상 / 재현 절차' : '현장 상황 / 증상', description)}
    ${labelBlock(asCategory === 'SW' ? '원인 분석 / 패치 내역' : '조치 내역', resolution)}
    ${commentsHtml}
    ${labelBlock('발송자 추가 코멘트', additionalComment)}
  `;

  const asEngineer = as.engineer || author || '담당미정';
  return {
    subject,
    htmlBody: wrapHtml('AS 처리 보고서', `[AS 보고 / ${asCategory}]`, content),
    plainFallback: `${subject}\n\n프로젝트: ${projectName}\n유형: ${asCategory}/${asType}\n상태: ${as.status}\n${description ? '\n증상:\n' + description : ''}${resolution ? '\n조치:\n' + resolution : ''}`,
    attachmentName: `MAK-PMS-AS보고서-${asCategory}-${asEngineer}-${new Date().toISOString().slice(0, 10)}.html`
  };
}
