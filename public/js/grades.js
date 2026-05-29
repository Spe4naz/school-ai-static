import { API, escapeHtml, showToast } from './utils.js';
import { loadNotifications } from './notifications.js';

let currentWeekOffset = 0;

export async function loadClasses(user) {
  const select = document.getElementById('classFilter');
  if (['teacher', 'admin'].includes(user.role)) {
    select.style.display = 'block';
    const res = await fetch(`${API}/classes`, { credentials: 'same-origin' });
    const classes = await res.json();
    select.innerHTML =
      '<option value="">Все классы</option>' +
      classes.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    loadStudentsForModal();
  }
}

export async function loadStudentsForModal() {
  try {
    const res = await fetch(`${API}/students`, { credentials: 'same-origin' });
    const students = await res.json();
    const select = document.getElementById('modalStudentId');
    select.innerHTML =
      '<option value="">Выберите ученика</option>' +
      students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  } catch (err) {
    console.error('Ошибка загрузки учеников:', err);
  }
}

export function setWeekOffset(offset) {
  currentWeekOffset = offset;
  const classFilter = document.getElementById('classFilter');
  loadGrades(classFilter ? classFilter.value : '');
}

export function shiftWeek(delta) {
  currentWeekOffset += delta;
  const classFilter = document.getElementById('classFilter');
  loadGrades(classFilter ? classFilter.value : '');
}

export function resetWeek() {
  currentWeekOffset = 0;
  const classFilter = document.getElementById('classFilter');
  loadGrades(classFilter ? classFilter.value : '');
}

export async function loadGrades(class_id = '') {
  let url = `${API}/grades?week_offset=${currentWeekOffset}`;
  if (class_id) url += `&class_id=${class_id}`;

  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    const grades = await res.json();
    const tbody = document.querySelector('#gradesTable tbody');
    tbody.innerHTML = grades
      .map(
        (g) => `
      <tr>
        <td>${escapeHtml(g.subject)}</td>
        <td><span class="grade grade-${g.grade}">${g.grade}</span></td>
        <td>${escapeHtml(g.student_name)}</td>
        <td>${escapeHtml(g.comment) || '—'}</td>
        <td>${escapeHtml(g.date)}</td>
      </tr>`,
      )
      .join('');
    updateWeekLabel();
  } catch (err) {
    console.error(err);
  }
}

function updateWeekLabel() {
  const el = document.getElementById('weekLabel');
  if (!el) return;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() + currentWeekOffset * 7 - (monday.getDay() || 7) + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  el.textContent = `${fmt(monday)} — ${fmt(sunday)}`;
}

export async function submitGrade(e) {
  e.preventDefault();
  const student_id = document.getElementById('modalStudentId').value;
  if (!student_id) return showToast('Выберите ученика', 'warning');

  const payload = {
    student_id,
    subject: document.getElementById('modalSubject').value,
    grade: document.getElementById('modalGrade').value,
    comment: document.getElementById('modalComment').value,
  };

  try {
    const res = await fetch(`${API}/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast('Оценка выставлена!', 'success');
      const modal = document.getElementById('gradeModal');
      if (modal) modal.style.display = 'none';
      loadGrades();
      loadNotifications();
      document.getElementById('modalStudentId').value = '';
      document.getElementById('modalSubject').value = '';
      document.getElementById('modalComment').value = '';
    } else {
      const data = await res.json();
      showToast(data.error || 'Ошибка при выставлении оценки', 'error');
    }
  } catch (err) {
    showToast('Ошибка сети', 'error');
  }
}
