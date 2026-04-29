import ExcelJS from 'exceljs';

// ===== 색상 팔레트 (보고용 톤) =====
const COLORS = {
  headerBg: 'FF1E40AF',         // 헤더 진한 블루
  headerFont: 'FFFFFFFF',       // 흰색
  sectionBg: 'FF312E81',        // 섹션 제목 짙은 인디고
  sectionFont: 'FFFFFFFF',      // 흰색
  zebra: 'FFF8FAFC',            // 슬레이트-50
  border: 'FFCBD5E1',           // 슬레이트-300
  // 상태 컬러
  ok: { fill: 'FFD1FAE5', font: 'FF065F46' },          // 에메랄드
  warn: { fill: 'FFFEF3C7', font: 'FF92400E' },        // 앰버
  bad: { fill: 'FFFEE2E2', font: 'FF991B1B' },         // 레드
  info: { fill: 'FFDBEAFE', font: 'FF1E40AF' },        // 블루
  neutral: { fill: 'FFE2E8F0', font: 'FF334155' }      // 슬레이트
};

// ISO 또는 날짜 문자열을 YYYY-MM-DD 또는 YYYY-MM-DD HH:mm 으로 정규화
const formatDate = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val);
  // ISO 패턴 (T 포함)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (isNaN(d)) return str;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str;
};

const formatCellValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) return formatDate(val);
  return val;
};

// 키워드 → 상태 컬러 매핑
const getStatusColorKey = (val) => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  // 완료/정상
  if (['완료', 'OK', 'Completed', '반영 완료', '조치 완료', '정상', '활성'].some(k => s.includes(k))) return 'ok';
  // 위험/지연
  if (['지연', 'NG', '만료', 'High', '긴급', '미해결', '위험'].some(k => s.includes(k))) return 'bad';
  // 경고/임박
  if (['임박', 'Medium', '검토중', '진행중', '대기', 'Pending', '접수', '출동'].some(k => s.includes(k))) return 'warn';
  return null;
};

// 진행률(% 문자열)에 컬러 매핑
const getProgressColorKey = (val) => {
  if (val === null || val === undefined) return null;
  const m = String(val).match(/(\d+)\s*%/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 100) return 'ok';
  if (n >= 70) return 'info';
  if (n >= 30) return 'warn';
  return 'bad';
};

const setCellStyle = (cell, opts = {}) => {
  const {
    bold = false, fillColor, fontColor, fontSize = 10,
    horizontal = 'left', vertical = 'middle', wrap = true,
    border = true, italic = false
  } = opts;
  cell.font = {
    name: '맑은 고딕',
    size: fontSize,
    bold,
    italic,
    color: { argb: fontColor || 'FF1F2937' }
  };
  if (fillColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
  }
  cell.alignment = { horizontal, vertical, wrapText: wrap };
  if (border) {
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } }
    };
  }
};

const autoColWidths = (worksheet, cols, rowsList) => {
  cols.forEach((c, i) => {
    let max = String(c.header).length;
    rowsList.forEach(r => {
      const v = r[c.key];
      if (v !== null && v !== undefined) {
        const s = String(formatCellValue(v));
        // 한글은 2배 가중
        let w = 0;
        for (const ch of s) w += /[ㄱ-힝]/.test(ch) ? 2 : 1;
        if (w > max) max = w;
      }
    });
    worksheet.getColumn(i + 1).width = Math.min(Math.max(max + 4, 10), 50);
  });
};

const triggerDownload = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============ 1. 단순 시트 (헤더 + 데이터) ============
export const exportToExcel = async (filename, sheets) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EQ-PMS';
  wb.created = new Date();

  sheets.forEach(sheet => {
    const rows = sheet.rows || [];
    const cols = sheet.columns || [];
    const safeName = (sheet.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').substring(0, 31);
    const ws = wb.addWorksheet(safeName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // 헤더
    const headerRow = ws.addRow(cols.map(c => c.header));
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      setCellStyle(cell, {
        bold: true, fillColor: COLORS.headerBg, fontColor: COLORS.headerFont,
        horizontal: 'center', fontSize: 11
      });
    });

    // 데이터 행
    rows.forEach((row, ri) => {
      const dataRow = ws.addRow(cols.map(c => formatCellValue(row[c.key])));
      dataRow.height = 22;
      dataRow.eachCell((cell, colNumber) => {
        const colDef = cols[colNumber - 1];
        const isZebra = ri % 2 === 1;
        let opts = {
          fillColor: isZebra ? COLORS.zebra : undefined,
          horizontal: typeof cell.value === 'number' ? 'right' : 'left'
        };
        // 상태/진행률 자동 컬러링
        const statusKey = getStatusColorKey(row[colDef.key]);
        const progressKey = getProgressColorKey(row[colDef.key]);
        const colorKey = statusKey || progressKey;
        if (colorKey && COLORS[colorKey]) {
          opts.fillColor = COLORS[colorKey].fill;
          opts.fontColor = COLORS[colorKey].font;
          opts.bold = true;
          opts.horizontal = 'center';
        }
        setCellStyle(cell, opts);
      });
    });

    autoColWidths(ws, cols, rows);

    // 자동 필터
    if (rows.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cols.length }
      };
    }
  });

  await triggerDownload(wb, filename);
};

// ============ 2. 섹션형 시트 (한 시트에 여러 테이블) ============
export const exportSectionedExcel = async (filename, sheets) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EQ-PMS';
  wb.created = new Date();

  sheets.forEach(sheet => {
    const safeName = (sheet.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').substring(0, 31);
    const ws = wb.addWorksheet(safeName, { views: [{ state: 'frozen', ySplit: 1 }] });

    let maxCols = 1;
    (sheet.sections || []).forEach(s => { if (s.columns && s.columns.length > maxCols) maxCols = s.columns.length; });

    let rowIdx = 0;

    (sheet.sections || []).forEach((section, sIdx) => {
      // 섹션 사이에 빈 줄
      if (sIdx > 0) {
        ws.addRow([]);
        ws.addRow([]);
        rowIdx += 2;
      }

      // 섹션 제목 (병합)
      const titleRow = ws.addRow([`■ ${section.title}`]);
      titleRow.height = 30;
      ws.mergeCells(titleRow.number, 1, titleRow.number, maxCols);
      const titleCell = ws.getCell(titleRow.number, 1);
      setCellStyle(titleCell, {
        bold: true, fillColor: COLORS.sectionBg, fontColor: COLORS.sectionFont,
        fontSize: 13, horizontal: 'left'
      });
      // 병합된 영역 모두 스타일 적용
      for (let c = 2; c <= maxCols; c++) {
        const mc = ws.getCell(titleRow.number, c);
        setCellStyle(mc, { fillColor: COLORS.sectionBg, fontColor: COLORS.sectionFont });
      }
      rowIdx++;

      const cols = section.columns || [];
      const rows = section.rows || [];

      if (rows.length === 0) {
        const emptyRow = ws.addRow(['(데이터 없음)']);
        ws.mergeCells(emptyRow.number, 1, emptyRow.number, maxCols);
        const ec = ws.getCell(emptyRow.number, 1);
        setCellStyle(ec, { italic: true, fontColor: 'FF94A3B8', horizontal: 'center', fillColor: 'FFF1F5F9' });
        for (let c = 2; c <= maxCols; c++) {
          setCellStyle(ws.getCell(emptyRow.number, c), { fillColor: 'FFF1F5F9' });
        }
        rowIdx++;
        return;
      }

      // 헤더
      const headerRow = ws.addRow(cols.map(c => c.header));
      headerRow.height = 24;
      headerRow.eachCell((cell, colNumber) => {
        if (colNumber > cols.length) return;
        setCellStyle(cell, {
          bold: true, fillColor: COLORS.headerBg, fontColor: COLORS.headerFont,
          horizontal: 'center', fontSize: 10
        });
      });
      rowIdx++;

      // 데이터
      rows.forEach((row, ri) => {
        const dataRow = ws.addRow(cols.map(c => formatCellValue(row[c.key])));
        dataRow.height = 20;
        dataRow.eachCell((cell, colNumber) => {
          if (colNumber > cols.length) return;
          const colDef = cols[colNumber - 1];
          const isZebra = ri % 2 === 1;
          let opts = {
            fillColor: isZebra ? COLORS.zebra : undefined,
            horizontal: typeof cell.value === 'number' ? 'right' : 'left'
          };
          const statusKey = getStatusColorKey(row[colDef.key]);
          const progressKey = getProgressColorKey(row[colDef.key]);
          const colorKey = statusKey || progressKey;
          if (colorKey && COLORS[colorKey]) {
            opts.fillColor = COLORS[colorKey].fill;
            opts.fontColor = COLORS[colorKey].font;
            opts.bold = true;
            opts.horizontal = 'center';
          }
          setCellStyle(cell, opts);
        });
        rowIdx++;
      });
    });

    // 컬럼 너비: 섹션 합산 기준
    const widthArr = [];
    (sheet.sections || []).forEach(section => {
      (section.columns || []).forEach((c, i) => {
        let max = String(c.header).length;
        (section.rows || []).forEach(r => {
          const v = r[c.key];
          if (v !== null && v !== undefined) {
            const s = String(formatCellValue(v));
            let w = 0;
            for (const ch of s) w += /[ㄱ-힝]/.test(ch) ? 2 : 1;
            if (w > max) max = w;
          }
        });
        if (!widthArr[i] || max > widthArr[i]) widthArr[i] = max;
      });
    });
    for (let i = 0; i < maxCols; i++) {
      ws.getColumn(i + 1).width = Math.min(Math.max((widthArr[i] || 12) + 4, 12), 50);
    }
  });

  await triggerDownload(wb, filename);
};

// ============ PDF (변경 없음) ============
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

// ============ CSV (변경 없음) ============
const formatCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') val = JSON.stringify(val);
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  }
  return str;
};

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
      lines.push(section.columns.map(c => formatCsvCell(row[c.key])).join(','));
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
    ...data.map(item => columns.map(c => formatCsvCell(item[c.key])).join(','))
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
