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

export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }
  const csvContent = [
    columns.map(c => c.header).join(','),
    ...data.map(item => columns.map(c => {
      let val = item[c.key] || '';
      if (typeof val === 'string') {
        val = `"${val.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      }
      return val;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
