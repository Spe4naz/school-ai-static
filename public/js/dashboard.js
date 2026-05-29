import { escapeHtml, clearAllIntervals, setRefreshInterval, API, getRoleLabel } from './utils.js';
import { loadClasses, loadGrades, submitGrade, shiftWeek, resetWeek } from './grades.js';
import { loadSchedule, loadClassesForSchedule, createSchedule } from './schedule.js';
import { loadNotifications } from './notifications.js';
import { loadChart, loadSubjectsForChart, loadStats } from './charts.js';
import { loadClassesForExport, exportReport } from './export.js';
import { toggleEmojiPicker, sendImage, initChat } from './chat.js';
import { loadProfile } from './profile.js';
import { loadUsers, loadClassesForUserModal, createUser, toggleUserClassField } from './admin.js';
import { loadHomeworks, submitHomework } from './homework.js';
import { loadAnnouncements, submitAnnouncement } from './announcements.js';
import { loadLogs } from './logs.js';

export function renderDashboard(user) {
  const nav = document.getElementById('navMenu');
  const links = {
    admin: [
      ['🏠 Главная', 'home'],
      ['📓 Дневник', 'diary'],
      ['📋 Задания', 'homework'],
      ['👤 Профиль', 'profile'],
      ['📅 Расписание', 'schedule'],
      ['👥 Пользователи', 'users'],
      ['📋 Логи', 'logs'],
      ['🔔 Уведомления', 'notifications'],
    ],
    teacher: [
      ['🏠 Главная', 'home'],
      ['📓 Дневник', 'diary'],
      ['📋 Задания', 'homework'],
      ['👤 Профиль', 'profile'],
      ['📅 Расписание', 'schedule'],
      ['👥 Пользователи', 'users'],
    ],
    student: [
      ['🏠 Главная', 'home'],
      ['📓 Дневник', 'diary'],
      ['📋 Задания', 'homework'],
      ['👤 Профиль', 'profile'],
      ['📈 Графики', 'charts'],
      ['📅 Расписание', 'schedule'],
      ['💬 Чат', 'chat'],
      ['🔔 Уведомления', 'notifications'],
    ],
    parent: [
      ['🏠 Главная', 'home'],
      ['📓 Дневник', 'diary'],
      ['📋 Задания', 'homework'],
      ['👤 Профиль', 'profile'],
      ['📈 Графики', 'charts'],
      ['📅 Расписание', 'schedule'],
      ['💬 Чат', 'chat'],
      ['🔔 Уведомления', 'notifications'],
    ],
  };
  nav.innerHTML = (links[user.role] || links.student)
    .map(
      ([text, id]) =>
        `<div class="nav-link" data-page="${id}"><span>${text}</span><span class="nav-badge" id="badge-${id}" style="display:none; margin-left:auto; background:var(--danger); color:white; font-size:0.7rem; padding:2px 8px; border-radius:10px; font-weight:600;"></span></div>`,
    )
    .join('');

  nav.querySelectorAll('.nav-link').forEach((el) => {
    el.addEventListener('click', () => showPage(el.dataset.page));
  });

  const sidebarUser = document.getElementById('sidebarUser');
  if (sidebarUser) {
    const initials = (user.name || '')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    sidebarUser.innerHTML = `
      <div class="sidebar-avatar">${escapeHtml(initials)}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${escapeHtml(user.name)}</div>
        <div class="sidebar-user-role">${escapeHtml(getRoleLabel(user.role))}</div>
      </div>`;
  }
}

export function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  if (id === 'profile') loadProfile();
  if (id === 'notifications') loadNotifications();
  if (id === 'homework') loadHomeworks();
  if (id === 'home') {
    loadAnnouncements();
    loadStats();
    loadSchedule();
  }
  if (id === 'logs') loadLogs();
}

export function logout() {
  clearAllIntervals();
  localStorage.removeItem('user');
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.startsWith('chatKey_')) keys.push(key);
  }
  keys.forEach((k) => sessionStorage.removeItem(k));
  fetch(`${API}/logout`, { method: 'POST', credentials: 'same-origin' }).finally(() => {
    location.href = '/';
  });
}

async function checkUnreadNotifications() {
  try {
    const res = await fetch(`${API}/notifications/unread-count`, {
      credentials: 'same-origin',
    });
    const data = await res.json();
    const badge = document.getElementById('badge-notifications');
    if (badge) {
      if (data.unread > 0) {
        badge.textContent = data.unread > 99 ? '99+' : data.unread;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    /* ignore */
  }
}

export function initDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user.id) {
    if (location.pathname === '/dashboard.html') location.href = '/';
    return;
  }

  renderDashboard(user);
  loadClasses(user);
  loadGrades();
  loadSchedule();
  loadNotifications();
  loadStats();
  loadSubjectsForChart();
  checkUnreadNotifications();
  loadAnnouncements();
  loadHomeworks();

  if (['teacher', 'admin'].includes(user.role)) {
    document.getElementById('addGradeBtn').style.display = 'block';
    document.getElementById('addScheduleBtn').style.display = 'block';
    document.getElementById('exportBtn').style.display = 'block';
    document.getElementById('addHwBtn').style.display = 'block';
    loadClassesForExport();
    loadClassesForSchedule();
  }

  if (['teacher', 'admin'].includes(user.role)) {
    document.getElementById('addAnnBtn').style.display = 'block';
  }

  if (['admin', 'teacher'].includes(user.role)) {
    loadUsers();
    loadClassesForUserModal();
  }

  if (['student', 'parent'].includes(user.role)) {
    loadChart();
    initChat();
  }

  setInterval(checkUnreadNotifications, 15000);
  // SSE real-time notifications with reconnect
  let esReconnectTimer = null;
  function connectSSE() {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(`${API}/notifications/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification') {
          checkUnreadNotifications();
          if (document.getElementById('notifications')?.classList.contains('active')) loadNotifications();
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      if (esReconnectTimer) clearTimeout(esReconnectTimer);
      esReconnectTimer = setTimeout(connectSSE, 5000);
    };
  }
  connectSSE();
  setRefreshInterval(
    'notif',
    setInterval(() => {
      if (document.getElementById('notifications')?.classList.contains('active')) loadNotifications();
    }, 30000),
  );
  setRefreshInterval(
    'stats',
    setInterval(() => {
      const home = document.getElementById('home')?.classList.contains('active');
      if (home) {
        loadStats();
        loadSchedule();
        loadAnnouncements();
      }
    }, 30000),
  );
  setRefreshInterval(
    'grades',
    setInterval(() => {
      if (document.getElementById('diary')?.classList.contains('active')) loadGrades();
    }, 30000),
  );

  document.getElementById('weekPrev')?.addEventListener('click', () => shiftWeek(-1));
  document.getElementById('weekNext')?.addEventListener('click', () => shiftWeek(1));
  document.getElementById('weekToday')?.addEventListener('click', () => resetWeek());

  document.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    if (action === 'logout') {
      el.addEventListener('click', logout);
    } else if (action === 'openModal') {
      el.addEventListener('click', () => {
        const m = document.getElementById(el.dataset.modal);
        if (m) m.style.display = 'flex';
      });
    } else if (action === 'closeModal') {
      el.addEventListener('click', () => {
        const m = document.getElementById(el.dataset.modal);
        if (m) m.style.display = 'none';
      });
    } else if (action === 'filterGrades') {
      el.addEventListener('change', () => loadGrades(el.value));
    } else if (action === 'filterSchedule') {
      el.addEventListener('change', () => loadSchedule(el.value));
    } else if (action === 'filterUsers') {
      el.addEventListener('change', loadUsers);
    } else if (action === 'loadChart') {
      el.addEventListener('change', loadChart);
    } else if (action === 'exportReport') {
      el.addEventListener('submit', exportReport);
    } else if (action === 'submitGrade') {
      el.addEventListener('submit', submitGrade);
    } else if (action === 'createUser') {
      el.addEventListener('submit', createUser);
    } else if (action === 'createSchedule') {
      el.addEventListener('submit', createSchedule);
    } else if (action === 'toggleUserClass') {
      el.addEventListener('change', toggleUserClassField);
    }
  });

  document.getElementById('hwForm')?.addEventListener('submit', submitHomework);
  document.getElementById('annForm')?.addEventListener('submit', submitAnnouncement);
  document.getElementById('refreshLogs')?.addEventListener('click', loadLogs);

  document.getElementById('homeworkList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="deleteHomework"]');
    if (btn) {
      const id = btn.dataset.id;
      await fetch(`${API}/homework/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      loadHomeworks();
    }
  });

  document.getElementById('announcementList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="deleteAnnouncement"]');
    if (btn) {
      const id = btn.dataset.id;
      await fetch(`${API}/announcements/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      loadAnnouncements();
    }
  });

  const emojiToggle = document.getElementById('emojiToggle');
  if (emojiToggle) emojiToggle.addEventListener('click', toggleEmojiPicker);

  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');
  if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        sendImage(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (emojiToggle && !e.target.closest('#emojiPicker') && !e.target.closest('#emojiToggle')) {
      const picker = document.getElementById('emojiPicker');
      if (picker) picker.classList.remove('open');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkUnreadNotifications();
      if (document.getElementById('notifications')?.classList.contains('active')) loadNotifications();
    }
  });

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
    themeToggle.innerHTML = isDark
      ? '<i class="bx bx-sun"></i> Светлая тема'
      : '<i class="bx bx-moon"></i> Тёмная тема';
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const dark = document.body.classList.contains('dark');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      themeToggle.innerHTML = dark
        ? '<i class="bx bx-sun"></i> Светлая тема'
        : '<i class="bx bx-moon"></i> Тёмная тема';
    });
  }
}
