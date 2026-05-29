import { API, escapeHtml } from './utils.js';

export async function loadProfile() {
  const container = document.getElementById('profileContainer');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    const [profileRes, gradesRes] = await Promise.all([
      fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      fetch(`${API}/grades`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
    ]);

    const profile = await profileRes.json();
    const grades = await gradesRes.json();

    const subjectAverages = {};
    const subjectCounts = {};
    let totalSum = 0;
    let totalCount = 0;

    grades.forEach(g => {
      if (!subjectAverages[g.subject]) { subjectAverages[g.subject] = 0; subjectCounts[g.subject] = 0; }
      subjectAverages[g.subject] += g.grade;
      subjectCounts[g.subject]++;
      totalSum += g.grade;
      totalCount++;
    });

    const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '—';

    const subjects = Object.keys(subjectAverages).map(s => ({
      name: s,
      avg: (subjectAverages[s] / subjectCounts[s]).toFixed(1),
      count: subjectCounts[s],
      pct: ((subjectAverages[s] / subjectCounts[s] - 2) / 3 * 100).toFixed(0),
    })).sort((a, b) => b.avg - a.avg);

    const bestSubject = subjects.length > 0 ? subjects[0].name : '—';

    const initials = (user.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    container.innerHTML = `
      <div class="profile-header-card">
        <div class="profile-avatar-lg">${escapeHtml(initials)}</div>
        <div class="profile-info">
          <h2>${escapeHtml(user.name)}</h2>
          <p>${escapeHtml(getRoleLabel(user.role))}${profile.class_name ? ` · ${escapeHtml(profile.class_name)}` : ''}</p>
          <p style="font-size:0.85rem; margin-top:6px; opacity:0.7">${escapeHtml(profile.email)}</p>
        </div>
      </div>
      <div class="profile-grid">
        <div class="profile-card">
          <h3>📊 Общая статистика</h3>
          <div class="profile-stat"><span class="profile-stat-label">Всего оценок</span><span class="profile-stat-value">${totalCount}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">Средний балл</span><span class="profile-stat-value" style="color: ${overallAvg >= 4 ? 'var(--success)' : overallAvg >= 3 ? 'var(--warning)' : 'var(--danger)'}">${overallAvg}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">Лучший предмет</span><span class="profile-stat-value">${escapeHtml(bestSubject)}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">Предметов</span><span class="profile-stat-value">${subjects.length}</span></div>
        </div>
        <div class="profile-card">
          <h3>👤 Аккаунт</h3>
          <div class="profile-stat"><span class="profile-stat-label">Роль</span><span class="profile-stat-value"><span class="role-badge role-${escapeHtml(user.role)}">${escapeHtml(getRoleLabel(user.role))}</span></span></div>
          <div class="profile-stat"><span class="profile-stat-label">Email</span><span class="profile-stat-value" style="font-size:0.85rem">${escapeHtml(profile.email)}</span></div>
          ${profile.class_name ? `<div class="profile-stat"><span class="profile-stat-label">Класс</span><span class="profile-stat-value">${escapeHtml(profile.class_name)}</span></div>` : ''}
        </div>
        <div class="profile-card full">
          <h3>📈 Успеваемость по предметам</h3>
          ${subjects.length > 0 ? subjects.map(s => `
            <div class="subject-progress">
              <div class="subject-progress-header">
                <span>${escapeHtml(s.name)}</span>
                <span>${s.avg} (${s.count} оценок)</span>
              </div>
              <div class="subject-progress-bar">
                <div class="subject-progress-fill" style="width:${Math.min(100, s.pct)}%"></div>
              </div>
            </div>
          `).join('') : '<p style="color:var(--text-sec); text-align:center; padding:20px;">Нет данных об оценках</p>'}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger)">Ошибка загрузки профиля</div>';
    console.error(err);
  }
}

function getRoleLabel(role) {
  const labels = { admin: 'Администратор', teacher: 'Учитель', student: 'Ученик', parent: 'Родитель' };
  return labels[role] || role;
}
