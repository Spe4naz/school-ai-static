import { API, escapeHtml } from './utils.js';

export async function loadLogs() {
  try {
    const res = await fetch(`${API}/logs`, {
      credentials: 'same-origin',
    });
    const logs = await res.json();
    const tbody = document.getElementById('logsBody');
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="white-space:nowrap;font-size:0.85rem">${new Date(l.timestamp).toLocaleString('ru-RU')}</td>
        <td>${escapeHtml(l.user_name || '—')}</td>
        <td><span style="background:var(--primary-light);padding:2px 8px;border-radius:4px;font-size:0.85rem">${escapeHtml(l.action)}</span></td>
        <td style="font-size:0.9rem;color:var(--text-sec)">${escapeHtml(l.details || '')}</td>
      </tr>
    `).join('');
  } catch { /* ignore */ }
}
