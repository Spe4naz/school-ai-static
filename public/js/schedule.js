import { API, escapeHtml, showToast, showConfirm } from './utils.js';

function getDayOrder(day) {
  const order = { Пн: 1, Вт: 2, Ср: 3, Чт: 4, Пт: 5, Сб: 6 };
  return order[day] || 0;
}

export async function loadSchedule(classId = '') {
  const user = JSON.parse(localStorage.getItem('user'));
  let url = `${API}/schedule`;
  if (classId) url += `?class_id=${classId}`;

  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    const schedule = await res.json();

    const byDay = {};
    schedule.forEach((s) => {
      if (!byDay[s.day]) byDay[s.day] = [];
      byDay[s.day].push(s);
    });

    const container = document.getElementById('scheduleContainer');
    const sortedDays = Object.keys(byDay).sort((a, b) => getDayOrder(a) - getDayOrder(b));

    if (sortedDays.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">Расписание пусто</div>';
    } else {
      container.innerHTML = sortedDays
        .map(
          (day) => `
        <div class="schedule-day">
          <h3>${escapeHtml(day)}</h3>
          <ul>
            ${byDay[day]
              .map(
                (s) => `
              <li style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <span class="time">${escapeHtml(s.time_slot)}</span> 
                  <strong>${escapeHtml(s.subject)}</strong>
                </div>
                <div>
                  <span class="room">${escapeHtml(s.room) || '—'}</span>
                  ${
                    ['teacher', 'admin'].includes(user.role) && (user.role === 'admin' || s.teacher_id === user.id)
                      ? `<button class="schedule-delete-btn" data-id="${s.id}" style="margin-left:10px; padding:2px 8px; font-size:0.7rem; background:#fee2e2; border:none; border-radius:4px; cursor:pointer;">✕</button>`
                      : ''
                  }
                </div>
              </li>
            `,
              )
              .join('')}
          </ul>
        </div>
      `,
        )
        .join('');
    }

    document.getElementById('homeScheduleCount').textContent = `${schedule.length} уроков`;

    container.querySelectorAll('.schedule-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteSchedule(btn.dataset.id));
    });
  } catch (err) {
    console.error(err);
  }
}

export async function loadClassesForSchedule() {
  const user = JSON.parse(localStorage.getItem('user'));
  const filterSelect = document.getElementById('scheduleClassFilter');
  const modalSelect = document.getElementById('scheduleClass');

  try {
    const res = await fetch(`${API}/classes`, { credentials: 'same-origin' });
    const classes = await res.json();

    if (filterSelect) {
      filterSelect.innerHTML =
        '<option value="">Все классы</option>' +
        classes.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    }

    if (modalSelect) {
      const userClassId = user.class_id;
      modalSelect.innerHTML = classes
        .map(
          (c) =>
            `<option value="${escapeHtml(c.id)}" ${c.id === userClassId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`,
        )
        .join('');
    }
  } catch (err) {
    console.error(err);
  }
}

export async function createSchedule(e) {
  e.preventDefault();
  const errorEl = document.getElementById('scheduleError');
  errorEl.style.display = 'none';

  const payload = {
    day: document.getElementById('scheduleDay').value,
    time_slot: document.getElementById('scheduleTime').value,
    subject: document.getElementById('scheduleSubject').value.trim(),
    class_id: document.getElementById('scheduleClass').value,
    room: document.getElementById('scheduleRoom').value.trim() || null,
  };

  if (!payload.day || !payload.time_slot || !payload.subject || !payload.class_id) {
    errorEl.textContent = 'Заполните все обязательные поля';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      showToast('Урок добавлен!', 'success');
      const modal = document.getElementById('scheduleModal');
      if (modal) modal.style.display = 'none';
      const form = document.getElementById('scheduleForm');
      if (form) form.reset();
      loadSchedule();
    } else {
      errorEl.textContent = data.error || 'Ошибка';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Ошибка сети';
    errorEl.style.display = 'block';
  }
}

export async function deleteSchedule(id) {
  const ok = await showConfirm('Удалить этот урок?');
  if (!ok) return;

  try {
    const res = await fetch(`${API}/schedule/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (res.ok) {
      loadSchedule();
    } else {
      const data = await res.json();
      showToast(data.error || 'Ошибка удаления', 'error');
    }
  } catch (err) {
    showToast('Ошибка сети', 'error');
  }
}
