import { API, escapeHtml } from './utils.js';

export async function loadHomeworks() {
  try {
    const res = await fetch(`${API}/homework`, {
      credentials: 'same-origin'
    });
    const homeworks = await res.json();
    const container = document.getElementById('homeworkList');
    if (!container) return;
    if (homeworks.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-sec)">Домашних заданий пока нет</div>';
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTeacher = ['teacher', 'admin'].includes(user.role);
    container.innerHTML = homeworks.map(h => {
      const due = new Date(h.due_date);
      const overdue = due < new Date() && !due.toDateString().includes(new Date().toDateString());
      const daysLeft = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
      const dueLabel = overdue ? 'Просрочено' : daysLeft <= 1 ? 'На сегодня' : `Осталось ${daysLeft} дн.`;
      const delBtn = isTeacher ? `<button class="btn btn-sm btn-danger" data-action="deleteHomework" data-id="${h.id}" style="margin-left:auto">✕</button>` : '';
      return `<div class="hw-item" style="background:var(--bg-card);border-radius:var(--radius-sm);padding:14px;border:1px solid var(--border);border-left:4px solid ${overdue ? 'var(--danger)' : 'var(--primary)'}">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-weight:600">${escapeHtml(h.title)}</div>
            <div style="font-size:0.85rem;color:var(--text-sec);margin-top:4px">${escapeHtml(h.subject)} • ${escapeHtml(h.teacher_name)}</div>
            ${h.description ? `<div style="font-size:0.9rem;margin-top:6px;color:var(--text-main)">${escapeHtml(h.description)}</div>` : ''}
          </div>
          ${delBtn}
        </div>
        <div style="margin-top:8px;font-size:0.8rem;color:${overdue ? 'var(--danger)' : 'var(--text-sec)'};font-weight:500">${escapeHtml(dueLabel)} • ${escapeHtml(h.due_date)}</div>
      </div>`;
    }).join('');
  } catch { /* ignore */ }
}

export async function submitHomework(e) {
  e.preventDefault();
  const subject = document.getElementById('hwSubject').value;
  const title = document.getElementById('hwTitle').value.trim();
  const description = document.getElementById('hwDesc').value.trim();
  const due_date = document.getElementById('hwDueDate').value;
  if (!subject || !title || !due_date) return alert('Заполните все поля');

  try {
    const res = await fetch(`${API}/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ subject, title, description, due_date })
    });
    if (res.ok) {
      document.getElementById('hwModal').style.display = 'none';
      document.getElementById('hwForm').reset();
      loadHomeworks();
    } else {
      const data = await res.json();
      alert(data.error || 'Ошибка');
    }
  } catch { alert('Ошибка сети'); }
}
