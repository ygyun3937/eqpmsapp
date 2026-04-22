export const downloadICS = (prj) => {
  const start = prj.startDate.replace(/-/g, '') + 'T000000Z';
  const due = prj.dueDate.replace(/-/g, '') + 'T235959Z';
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:[Setup] ${prj.name}\nDTSTART:${start}\nDTEND:${due}\nLOCATION:${prj.site}\nDESCRIPTION:Customer: ${prj.customer} \\nManager: ${prj.manager}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prj.name}_schedule.ics`;
  a.click();
};

export const openGoogleCalendar = (prj) => {
  const start = prj.startDate.replace(/-/g, '') + 'T000000Z';
  const due = prj.dueDate.replace(/-/g, '') + 'T235959Z';
  const text = encodeURIComponent(`[Setup] ${prj.name}`);
  const details = encodeURIComponent(`Customer: ${prj.customer}\nManager: ${prj.manager}`);
  const location = encodeURIComponent(prj.site);
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${due}&details=${details}&location=${location}`, '_blank');
};
