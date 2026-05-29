import { API, escapeHtml } from './utils.js';

export async function loadAnnouncements() {
  try {
    const res = await fetch(`${API}/announcements`, {
      credentials: 'same-origin'
    });
    const announcements = await res.json();
    const container = document.getElementById('announcementList');
    if (!container) return;
    if (announcements.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-sec)">Объявлений пока нет</div>';
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    container.innerHTML = announcements.map(a => {
      const delBtn = isAdmin ? `<button class="btn btn-sm btn-danger" data-action="deleteAnnouncement" data-id="${a.id}" style="margin-left:auto">✕</button>` : '';
      return `<div class="announcement-item" style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;border:1px solid var(--border);border-left:4px solid var(--warning)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:1rem">${escapeHtml(a.title)}</div>
            <div style="font-size:0.8rem;color:var(--text-sec);margin-top:2px">${escapeHtml(a.user_name)} • ${new Date(a.created_at).toLocaleDateString('ru-RU')}</div>
            <div style="margin-top:8px;font-size:0.92rem;line-height:1.5">${escapeHtml(a.content)}</div>
          </div>
          ${delBtn}
        </div>
      </div>`;
    }).join('');
  } catch { /* ignore */ }
}

export async function submitAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title || !content) return alert('Заполните все поля');

  try {
    const res = await fetch(`${API}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title, content })
    });
    if (res.ok) {
      document.getElementById('annModal').style.display = 'none';
      document.getElementById('annForm').reset();
      loadAnnouncements();
    } else {
      const data = await res.json();
      alert(data.error || 'Ошибка');
    }
  } catch { alert('Ошибка сети'); }
}
