import { API, escapeHtml } from './utils.js';

export async function loadNotifications() {
  try {
    const res = await fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const notifs = await res.json();
    const list = document.getElementById('notifList');

    if (notifs.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:#666;">Нет новых уведомлений</div>';
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div style="background:white; padding:15px; border-radius:10px; border-left: 4px solid ${n.is_read ? '#ccc' : 'var(--primary)'}; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between;">
          <strong>${escapeHtml(n.title)}</strong>
          <small style="color:#666;">${new Date(n.created_at).toLocaleString()}</small>
        </div>
        <p style="margin:5px 0 0;">${escapeHtml(n.message)}</p>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}
