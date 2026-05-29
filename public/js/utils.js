export const API = window.location.origin + '/api';

export const ROLE_LABELS = {
  admin: 'Администратор',
  teacher: 'Учитель',
  student: 'Ученик',
  parent: 'Родитель',
  head_teacher: 'Завуч',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Toast notifications
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Confirm modal (replaces window.confirm)
export function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <h3>Подтверждение</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-ghost" data-action="cancel">Отмена</button>
          <button class="btn btn-sm" style="background:var(--danger);color:white" data-action="confirm">Подтвердить</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

export function getChartInstance() {
  return window._chartInstance;
}
export function setChartInstance(instance) {
  window._chartInstance = instance;
}
export function getChatInterval() {
  return window._chatInterval;
}
export function setChatInterval(interval) {
  window._chatInterval = interval;
}
export function getChatEncryptionKey() {
  return window._chatEncryptionKey;
}
export function setChatEncryptionKey(key) {
  window._chatEncryptionKey = key;
}
export function setRefreshInterval(id, interval) {
  window['_refresh_' + id] = interval;
}
export function getRefreshInterval(id) {
  return window['_refresh_' + id];
}
export function clearAllIntervals() {
  const keys = Object.keys(window).filter((k) => k.startsWith('_refresh_') || k === '_chatInterval');
  keys.forEach((k) => {
    clearInterval(window[k]);
    delete window[k];
  });
}

export function escapeHtml(str) {
  if (str == null) return ''; // eslint-disable-line eqeqeq
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function safeSetHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) {
    const tmp = document.createElement('div');
    tmp.textContent = html;
    el.innerHTML = '';
    el.appendChild(tmp);
  }
}

export async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.body && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });

  if (res.status === 401) {
    localStorage.removeItem('user');
    if (location.pathname !== '/' && location.pathname !== '/index.html') {
      location.href = '/';
    }
    throw new Error('Требуется авторизация');
  }

  return res;
}
