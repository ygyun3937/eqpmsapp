import * as XLSX from 'xlsx';

// Excel 여러 시트 내보내기
// sheets: [{ name: 'Sheet1', rows: [{...}, ...], columns: [{ header, key }, ...] }]
export const exportToExcel = (filename, sheets) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const rows = sheet.rows || [];
    const cols = sheet.columns || [];

    // 2D 배열로 변환 (첫 행: 헤더)
    const aoa = [cols.map(c => c.header)];
    rows.forEach(row => {
      aoa.push(cols.map(c => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      }));
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // 컬럼 너비 자동 조정
    const colWidths = cols.map((c, i) => {
      const maxLen = Math.max(
        String(c.header).length,
        ...rows.slice(0, 100).map(row => String(row[c.key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
    });
    ws['!cols'] = colWidths;

    // 시트명 엑셀 제한 (31자, 특수문자 제외)
    const safeName = (sheet.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// 한 시트에 여러 섹션(테이블) 넣기
export const exportSectionedExcel = (filename, sheets) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const aoa = [];
    (sheet.sections || []).forEach((section, idx) => {
      if (idx > 0) { aoa.push([]); aoa.push([]); }
      aoa.push([`■ ${section.title}`]);
      if (!section.rows || section.rows.length === 0) {
        aoa.push(['(데이터 없음)']);
        return;
      }
      aoa.push(section.columns.map(c => c.header));
      section.rows.forEach(row => {
        aoa.push(section.columns.map(c => {
          const val = row[c.key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        }));
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // 최대 컬럼 수 파악 후 너비 조정
    let maxCols = 0;
    aoa.forEach(row => { if (row.length > maxCols) maxCols = row.length; });
    ws['!cols'] = Array(maxCols).fill({ wch: 20 });

    const safeName = (sheet.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generatePDF = (project, projectIssues) => {
  const printWin = window.open('', '', 'width=800,height=900');
  const html = `
    <html>
      <head>
        <title>Buy-off Report: ${project.name}</title>
        <style>
          body{font-family:'Segoe UI', sans-serif; padding:40px; color:#333; line-height:1.5;}
          table{width:100%; border-collapse:collapse; margin-top:20px; font-size:14px;}
          th,td{border:1px solid #ddd; padding:10px; text-align:left;}
          th{background:#f8fafc; color:#1e293b;}
          h1{color:#1e40af; border-bottom:2px solid #e2e8f0; padding-bottom:10px;}
          .header-box{background:#f1f5f9; padding:20px; border-radius:8px; margin-bottom:30px;}
          .signature-box{border:1px dashed #cbd5e1; padding:20px; width:300px; text-align:center; float:right;}
        </style>
      </head>
      <body>
        <h1>Project Final Buy-off Report</h1>
        <div class="header-box">
          <h2>${project.name} (${project.domain})</h2>
          <p><strong>Customer:</strong> ${project.customer}</p>
          <p><strong>Site Location:</strong> ${project.site}</p>
          <p><strong>Setup Period:</strong> ${project.startDate} ~ ${project.signOff.date}</p>
          <p><strong>Manager:</strong> ${project.manager}</p>
          <p><strong>Version:</strong> HW: ${project.hwVersion||'-'} | SW: ${project.swVersion||'-'} | FW: ${project.fwVersion||'-'}</p>
        </div>
        <h3>Checklist Results</h3>
        <table>
          <tr><th>Category</th><th>Task</th><th>Status</th><th>Note</th></tr>
          ${project.checklist.map(c => `<tr><td>${c.category}</td><td>${c.task}</td><td><strong>${c.status}</strong></td><td>${c.note||'-'}</td></tr>`).join('')}
        </table>
        <h3 style="margin-top:40px;">Resolved Issues History</h3>
        <table>
          <tr><th>Issue Title</th><th>Severity</th><th>Author</th><th>Date</th></tr>
          ${projectIssues.length > 0 ? projectIssues.map(i => `<tr><td>${i.title}</td><td>${i.severity}</td><td>${i.author}</td><td>${i.date}</td></tr>`).join('') : '<tr><td colspan="4">No issues recorded.</td></tr>'}
        </table>
        <div style="margin-top:50px;">
          <div class="signature-box">
            <p><strong>Approved by (Customer):</strong> ${project.signOff.customerName}</p>
            <img src="${project.signOff.signatureData}" style="max-height:80px; margin:10px 0;"/>
            <p><strong>Date:</strong> ${project.signOff.date}</p>
          </div>
        </div>
      </body>
    </html>
  `;
  printWin.document.write(html);
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 500);
};

const formatCell = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') val = JSON.stringify(val);
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  }
  return str;
};

// 섹션별로 구분된 종합 CSV 내보내기 (엑셀에서 섹션 구분 ### 으로 표시)
export const exportMultiSectionCSV = (filename, sections) => {
  const lines = [];
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('', '');
    lines.push(`### ${section.title} ###`);
    if (!section.rows || section.rows.length === 0) {
      lines.push('(데이터 없음)');
      return;
    }
    lines.push(section.columns.map(c => c.header).join(','));
    section.rows.forEach(row => {
      lines.push(section.columns.map(c => formatCell(row[c.key])).join(','));
    });
  });

  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }
  const csvContent = [
    columns.map(c => c.header).join(','),
    ...data.map(item => columns.map(c => formatCell(item[c.key])).join(','))
  ].join('\n');

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
