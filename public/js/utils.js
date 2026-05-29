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

export function getChartInstance() { return window._chartInstance; }
export function setChartInstance(instance) { window._chartInstance = instance; }
export function getChatInterval() { return window._chatInterval; }
export function setChatInterval(interval) { window._chatInterval = interval; }
export function getChatEncryptionKey() { return window._chatEncryptionKey; }
export function setChatEncryptionKey(key) { window._chatEncryptionKey = key; }
export function setRefreshInterval(id, interval) { window['_refresh_' + id] = interval; }
export function getRefreshInterval(id) { return window['_refresh_' + id]; }
export function clearAllIntervals() {
  const keys = Object.keys(window).filter(k => k.startsWith('_refresh_') || k === '_chatInterval');
  keys.forEach(k => { clearInterval(window[k]); delete window[k]; });
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function safeSetHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.innerHTML = html;
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
