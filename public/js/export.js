import { API, escapeHtml } from './utils.js';

export async function loadClassesForExport() {
  const res = await fetch(`${API}/classes`, { credentials: 'same-origin' });
  const classes = await res.json();
  document.getElementById('exportClass').innerHTML = '<option value="">Все классы</option>' +
    classes.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
}

export async function exportReport(e) {
  e.preventDefault();
  const class_id = document.getElementById('exportClass').value;
  const period = document.getElementById('exportPeriod').value;
  const type = document.getElementById('exportType').value;

  let url = `${API}/reports/export?type=${type}&period=${period}`;
  if (class_id) url += `&class_id=${class_id}`;

  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
    });

    const blob = await res.blob();
    const ext = type === 'pdf' ? 'pdf' : 'xlsx';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `otchet-${Date.now()}.${ext}`;
    link.click();

    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'none';
    alert('Отчёт скачан!');
  } catch (err) {
    console.error(err);
    alert('Ошибка при экспорте');
  }
}
