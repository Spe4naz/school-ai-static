const API = 'http://localhost:3000/api';

// Проверка сессии при загрузке
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    if (location.pathname.includes('dashboard')) location.href = '/';
    return;
  }
  if (location.pathname.includes('dashboard')) {
    renderDashboard(user);
    loadGrades();
    if (user.role === 'admin') loadLogs();
    if (user.role === 'parent') loadParentData();
  }
});

// Рендер меню под роль
function renderDashboard(user) {
  const nav = document.getElementById('navMenu');
  const links = {
    admin: [['📓 Дневник', 'diary'], ['📜 Логи', 'logs']],
    teacher: [['📓 Мои оценки', 'diary']],
    student: [['📓 Мой дневник', 'diary']],
    parent: [['📓 Оценки ребёнка', 'diary'], ['👨‍👩‍👧 Профиль', 'parent']]
  };
  nav.innerHTML = (links[user.role] || links.student).map(([text, id]) => 
    `<div class="nav-link" onclick="showPage('${id}')">${text}</div>`
  ).join('');
  document.querySelector('.sidebar').insertAdjacentHTML('beforeend', `<div style="margin-top:auto; font-size:0.8rem; color:#666;">👤 ${user.name} (${user.role})</div>`);
}

// Переключение вкладок
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Загрузка оценок
async function loadGrades() {
  const res = await fetch(`${API}/grades`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const grades = await res.json();
  const tbody = document.querySelector('#gradesTable tbody');
  tbody.innerHTML = grades.map(g => `
    <tr>
      <td>${g.subject}</td><td><span class="grade grade-${g.grade}">${g.grade}</span></td>
      <td>${g.teacher_name || '—'}</td><td>${g.comment || '—'}</td><td>${g.date}</td>
    </tr>`).join('');
}

// Загрузка логов (админ)
async function loadLogs() {
  const res = await fetch(`${API}/logs`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const logs = await res.json();
  document.querySelector('#logsTable tbody').innerHTML = logs.map(l => `
    <tr><td>${l.user_name}</td><td>${l.action}</td><td>${l.details}</td><td>${new Date(l.timestamp).toLocaleString()}</td></tr>
  `).join('');
}

// Загрузка данных родителя
async function loadParentData() {
  const res = await fetch(`${API}/parent/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const data = await res.json();
  document.getElementById('parentInfo').innerHTML = `
    <div style="background:#fff; padding:20px; border-radius:12px; margin-bottom:20px;">
      <h3>👦 Ребёнок: ${data.child.name}</h3>
      <p>Класс: ${data.child.class_id}</p>
    </div>`;
}

// Логин
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      location.href = '/dashboard.html';
    } else {
      document.getElementById('errorMsg').textContent = data.error;
      document.getElementById('errorMsg').style.display = 'block';
    }
  } catch {
    alert('Ошибка сервера');
  }
});

function logout() {
  localStorage.clear();
  location.href = '/';
}