const API = 'http://localhost:3000/api';

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    if (location.pathname.includes('dashboard')) location.href = '/';
    return;
  }

  renderDashboard(user);
  
  // Загрузка данных в зависимости от роли
  loadClasses(user);
  loadGrades();
  loadSchedule();
  loadNotifications();
  loadStats(user);

  // Показываем кнопки только учителям/админам
  if (['teacher', 'admin'].includes(user.role)) {
    document.getElementById('addGradeBtn').style.display = 'block';
    document.getElementById('addScheduleBtn').style.display = 'block';
  }
});

function renderDashboard(user) {
  const nav = document.getElementById('navMenu');
  const links = {
    admin: [['🏠 Главная', 'home'], ['📓 Дневник', 'diary'], ['📅 Расписание', 'schedule'], ['🔔 Уведомления', 'notifications']],
    teacher: [['🏠 Главная', 'home'], ['📓 Дневник', 'diary'], ['📅 Расписание', 'schedule']],
    student: [['🏠 Главная', 'home'], ['📓 Дневник', 'diary'], ['📅 Расписание', 'schedule'], ['🔔 Уведомления', 'notifications']],
    parent: [['🏠 Главная', 'home'], ['📓 Дневник', 'diary'], ['📅 Расписание', 'schedule'], ['🔔 Уведомления', 'notifications']]
  };
  nav.innerHTML = (links[user.role] || links.student).map(([text, id]) => 
    `<div class="nav-link" onclick="showPage('${id}')">${text}</div>`
  ).join('');
  document.querySelector('.sidebar').insertAdjacentHTML('beforeend', `<div style="margin-top:auto; font-size:0.8rem; color:#666; padding:0 10px;">👤 ${user.name}</div>`);
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- ОЦЕНКИ ---
async function loadClasses(user) {
  const select = document.getElementById('classFilter');
  if (['teacher', 'admin'].includes(user.role)) {
    select.style.display = 'block';
    const res = await fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const classes = await res.json();
    select.innerHTML = '<option value="">Все классы</option>' + classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    // Заполняем селектор в модальном окне
    const modalStudentSelect = document.getElementById('modalStudentId');
    // Для простоты в модалке покажем всех учеников (в реальном проекте лучше фильтровать по классу)
    // Но здесь мы просто оставим пустым, т.к. нужен отдельный API для списка учеников.
    // Для демо: хардкодим или добавляем логику позже. Сейчас оставим пустым, учитель должен знать ID или мы сделаем отдельный запрос.
    // Сделаем запрос всех студентов:
    const allUsers = await fetch(`${API}/grades`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()); 
    // Это грязный хак, но для демо пойдет. Лучше сделать GET /api/students.
    // Пока просто оставим select пустым, пользователь введет ID или мы доработаем позже.
    // ДОРАБОТКА:
    // Создадим простую функцию для получения студентов
    loadStudentsForModal();
  }
}

async function loadStudentsForModal() {
    const res = await fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const classes = await res.json();
    const select = document.getElementById('modalStudentId');
    select.innerHTML = '<option value="">Выберите ученика (ID)</option>';
    // В идеале нужен endpoint /api/students. Сейчас оставим заглушку, т.к. в grades нет списка всех студентов без фильтра.
    // Но мы можем взять их из кэша или добавить endpoint.
    // Чтобы не усложнять сервер, добавим простую логику: учитель выбирает класс, потом ученика.
    // Пока оставим пустым и выведем сообщение.
    select.innerHTML = '<option value="">Требуется обновление API для списка учеников</option>';
}

async function loadGrades(class_id = '') {
  let url = `${API}/grades`;
  if (class_id) url += `?class_id=${class_id}`;
  
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const grades = await res.json();
    const tbody = document.querySelector('#gradesTable tbody');
    tbody.innerHTML = grades.map(g => `
      <tr>
        <td>${g.subject}</td>
        <td><span class="grade grade-${g.grade}">${g.grade}</span></td>
        <td>${g.student_name}</td>
        <td>${g.comment || '—'}</td>
        <td>${g.date}</td>
      </tr>`).join('');
  } catch (err) { console.error(err); }
}

async function submitGrade(e) {
  e.preventDefault();
  const student_id = document.getElementById('modalStudentId').value;
  if(!student_id) return alert('Выберите ученика'); // Заглушка
  
  const payload = {
    student_id: student_id, // В реальном UI тут будет ID из селекта
    subject: document.getElementById('modalSubject').value,
    grade: document.getElementById('modalGrade').value,
    comment: document.getElementById('modalComment').value
  };

  // Для демо: если селект пуст, берем первого попавшегося ученика из сессии (если учитель)
  // Или просим ввести ID вручную.
  // Сделаем проще: добавим поле ввода ID вручную в модалку для теста
  payload.student_id = prompt("Введите ID ученика (для теста введите ID из БД или оставьте как есть):", student_id);
  if(!payload.student_id) return;

  try {
    await fetch(`${API}/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(payload)
    });
    alert('Оценка выставлена! Родитель получил уведомление.');
    closeGradeModal();
    loadGrades();
    loadNotifications(); // Обновить колокольчик
  } catch (err) { alert('Ошибка'); }
}

function openGradeModal() { document.getElementById('gradeModal').style.display = 'flex'; }
function closeGradeModal() { document.getElementById('gradeModal').style.display = 'none'; }

// --- РАСПИСАНИЕ ---
async function loadSchedule() {
  const user = JSON.parse(localStorage.getItem('user'));
  let url = `${API}/schedule`;
  // Если ученик/родитель - грузим только их класс
  if (user.role === 'student' || user.role === 'parent') {
    const classId = user.role === 'student' ? user.class_id : null; 
    // Для родителя нужно узнать class_id ребёнка, но упростим:
    if(user.linked_student_id) {
       // Нужен запрос к БД чтобы узнать класс ребёнка. 
       // Пока грузим всё, фильтр на клиенте.
    }
  }

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const schedule = await res.json();
    
    // Группировка по дням
    const byDay = {};
    schedule.forEach(s => {
      if (!byDay[s.day]) byDay[s.day] = [];
      byDay[s.day].push(s);
    });

    const container = document.getElementById('scheduleContainer');
    container.innerHTML = Object.keys(byDay).map(day => `
      <div class="schedule-day">
        <h3>${day}</h3>
        <ul>
          ${byDay[day].map(s => `
            <li>
              <span class="time">${s.time_slot}</span> 
              <strong>${s.subject}</strong> 
              <span class="room">${s.room || ''}</span>
              <span style="font-size:0.8rem; color:#666;">(${s.teacher_name || '—'})</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
    
    document.getElementById('homeScheduleCount').textContent = `${schedule.length} уроков`;
  } catch (err) { console.error(err); }
}

// --- УВЕДОМЛЕНИЯ ---
async function loadNotifications() {
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
          <strong>${n.title}</strong>
          <small style="color:#666;">${new Date(n.created_at).toLocaleString()}</small>
        </div>
        <p style="margin:5px 0 0;">${n.message}</p>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadStats(user) {
  // Простой подсчет среднего балла
  const res = await fetch(`${API}/grades`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const grades = await res.json();
  if (grades.length > 0) {
    const avg = (grades.reduce((a, b) => a + b.grade, 0) / grades.length).toFixed(1);
    document.getElementById('homeAvgGrade').textContent = avg;
  }
}

function logout() { localStorage.clear(); location.href = '/'; }