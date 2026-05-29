import { API, getChatEncryptionKey, setChatEncryptionKey, escapeHtml, debounce } from './utils.js';

const EMOJIS = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮','😯','😲','😳','🥺','😢','😭','😤','😠','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','💋','👋','🤚','✋','🖐','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦵','🦶','👂','👃','🧠','🫀','🫁','👀','👁️','👅','👄'];

let emojiPickerOpen = false;
let chatState = { offset: 0, hasMore: true, loading: false, loadingMore: false, sendLock: false, typingTimer: null };

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function aesEncrypt(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const ivArr = Array.from(iv);
  const ctArr = Array.from(new Uint8Array(ciphertext));
  return btoa(ivArr.concat(ctArr).map(b => String.fromCharCode(b)).join(''));
}

async function aesDecrypt(ciphertext, key) {
  const data = atob(ciphertext);
  const arr = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
  const iv = arr.slice(0, 12);
  const ct = arr.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plaintext);
}

async function decryptMessage(content, key) {
  if (!key || !content) return content;
  if (!/^[A-Za-z0-9+/=]+$/.test(content)) return content;
  try {
    const k = await deriveKey(key, 'class-chat-salt');
    return await aesDecrypt(content, k);
  } catch { return content; }
}

function generateKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureEncryptionKey() {
  let key = getChatEncryptionKey();
  if (key) return key;
  let user;
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  if (!user.class_id) return null;
  const keyStorageName = `chatKey_${user.class_id}`;
  let storedKey = localStorage.getItem(keyStorageName);
  if (!storedKey) {
    try {
      const res = await fetch(`${API}/chat/key`, { credentials: 'same-origin' });
      storedKey = (await res.json()).key;
      localStorage.setItem(keyStorageName, storedKey);
    } catch {
      storedKey = generateKey();
      localStorage.setItem(keyStorageName, storedKey);
    }
  }
  setChatEncryptionKey(storedKey);
  return storedKey;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function toggleEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  emojiPickerOpen = !emojiPickerOpen;
  picker.classList.toggle('open', emojiPickerOpen);
  if (emojiPickerOpen) {
    picker.innerHTML = '<div class="emoji-grid">' + EMOJIS.map(e =>
      `<span class="emoji-item" data-emoji="${e}">${e}</span>`
    ).join('') + '</div>';
    picker.querySelectorAll('.emoji-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('chatInput').value += el.dataset.emoji;
        document.getElementById('chatInput').focus();
        toggleEmojiPicker();
      });
    });
  }
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

function scrollToBottom(el, smooth) {
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

export async function loadChatMessages() {
  if (chatState.loading) return;
  chatState.loading = true;

  try {
    await ensureEncryptionKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API}/chat/messages?offset=0&limit=50`, {
      credentials: 'same-origin',
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) { updateChatStatus('offline'); return; }
    const data = await res.json();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const container = document.getElementById('chatMessages');
    const wasNearBottom = isNearBottom(container);

    await renderMessages(container, data.messages, user);
    chatState.hasMore = data.messages.length >= 50;
    chatState.offset = 0;

    if (wasNearBottom || data.messages.length <= 1) scrollToBottom(container, false);
    updateChatStatus('online');
  } catch { updateChatStatus('offline'); }
  finally { chatState.loading = false; }
}

async function loadMoreMessages() {
  if (chatState.loadingMore || !chatState.hasMore) return;
  chatState.loadingMore = true;
  const newOffset = chatState.offset + 50;

  try {
    const res = await fetch(`${API}/chat/messages?offset=${newOffset}&limit=50`, {
      credentials: 'same-origin'
    });
    const data = await res.json();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const container = document.getElementById('chatMessages');
    const prevHeight = container.scrollHeight;

    container.querySelector('.msg-loader-more')?.remove();

    if (data.messages.length === 0) { chatState.hasMore = false; return; }

    const firstExisting = container.querySelector('[data-msg-id]');
    const cutoff = firstExisting ? parseInt(firstExisting.dataset.msgId, 10) : Infinity;
    const filtered = data.messages.filter(m => m.id < cutoff);

    if (filtered.length > 0) {
      const html = await buildMessagesHtml(filtered, user);
      container.insertAdjacentHTML('afterbegin', html);
    }

    chatState.hasMore = data.messages.length >= 50;
    chatState.offset = newOffset;

    if (chatState.hasMore) {
      container.insertAdjacentHTML('afterbegin',
        '<div class="msg-loader-more">↕ Загрузить ещё</div>');
    }
    container.scrollTop = container.scrollHeight - prevHeight;
  } catch { /* ignore */ }
  finally { chatState.loadingMore = false; }
}

async function buildMessagesHtml(messages, user) {
  const key = getChatEncryptionKey();
  const decrypted = await Promise.all(messages.map(m => decryptMessage(m.content, key)));

  let html = '';
  let lastDate = '';

  messages.forEach((m, i) => {
    const msgDate = new Date(m.created_at).toDateString();
    if (msgDate !== lastDate) {
      html += `<div class="msg-date-divider">${formatDate(m.created_at)}</div>`;
      lastDate = msgDate;
    }

    const isOwn = m.user_id === user.id;
    const content = decrypted[i];
    const imageHtml = m.image_url
      ? `<img src="${escapeHtml(m.image_url)}" class="msg-image" onclick="window.open(this.src)" loading="lazy" />`
      : '';
    const deleteBtn = isOwn
      ? `<button class="msg-delete" data-action="deleteMessage" data-msg-id="${m.id}" title="Удалить">✕</button>`
      : '';

    html += `<div class="msg ${isOwn ? 'user' : 'ai'}" data-msg-id="${m.id}">
      ${!isOwn ? `<div class="msg-author">${escapeHtml(m.user_name)}</div>` : ''}
      ${deleteBtn}
      <div class="msg-content">${escapeHtml(content)}</div>
      ${imageHtml}
      <div class="msg-time">${formatTime(m.created_at)}</div>
    </div>`;
  });

  return html;
}

async function renderMessages(container, messages, user) {
  const html = await buildMessagesHtml(messages, user);
  container.innerHTML = html || '<div style="text-align:center;padding:40px;color:var(--text-sec)">Сообщений пока нет. Начните общение!</div>';
}

async function deleteMessage(msgId) {
  try {
    const res = await fetch(`${API}/chat/messages/${msgId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    if (res.ok) {
      const el = document.querySelector(`.msg[data-msg-id="${msgId}"]`);
      if (el) el.remove();
    }
  } catch { /* ignore */ }
}

export async function sendMessage() {
  if (chatState.sendLock) return;
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;

  chatState.sendLock = true;
  const key = await ensureEncryptionKey();
  let encryptedContent = content;

  if (key) {
    try {
      const k = await deriveKey(key, 'class-chat-salt');
      encryptedContent = await aesEncrypt(content, k);
    } catch { /* fallback to plaintext */ }
  }

  try {
    const res = await fetch(`${API}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ content: encryptedContent })
    });
    if (res.ok) {
      input.value = '';
      await loadChatMessages();
    }
  } catch { /* ignore */ }
  finally { chatState.sendLock = false; }
}

export async function sendImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch(`${API}/chat/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    });
    if (res.ok) await loadChatMessages();
  } catch { /* ignore */ }
}

async function loadParticipants() {
  try {
    const [partRes, typingRes] = await Promise.all([
      fetch(`${API}/chat/participants`, {
        credentials: 'same-origin'
      }),
      fetch(`${API}/chat/typing`, {
        credentials: 'same-origin'
      }).then(r => r.json()).catch(() => []),
    ]);
    const participants = await partRes.json();
    const typingUserIds = typingRes.map(t => t.user_id);
    document.getElementById('participantsList').innerHTML = participants.map(p => {
      const online = typingUserIds.includes(p.id);
      return `<div class="participant-item">
        <span class="participant-dot ${online ? 'online' : 'offline'}"></span>
        <span class="participant-name">${escapeHtml(p.name)}</span>
        <span class="participant-role">${escapeHtml(p.role === 'student' ? 'уч' : p.role === 'teacher' ? 'уч-ль' : p.role === 'admin' ? 'адм' : 'род')}</span>
      </div>`;
    }).join('');
  } catch { /* ignore */ }
}

function emitTyping() {
  fetch(`${API}/chat/typing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  }).catch(() => {});
}

async function pollTyping() {
  try {
    const typing = await fetch(`${API}/chat/typing`, {
      credentials: 'same-origin'
    }).then(r => r.json());
    const el = document.getElementById('typingIndicator');
    const nameEl = document.getElementById('typingNames');
    if (typing.length > 0) {
      nameEl.innerHTML = `${escapeHtml(typing.map(t => t.name).join(', '))} печатает<span class="dots"></span>`;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  } catch { /* ignore */ }
}

function updateChatStatus(state) {
  const el = document.getElementById('chatStatus');
  if (!el) return;
  el.innerHTML = state === 'online'
    ? '<span class="status-dot"></span> В сети'
    : '<span class="status-dot offline"></span> Нет соединения';
}

export function initChat() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!['student', 'parent'].includes(user.role)) return;

    loadChatMessages();
    loadParticipants();

    setInterval(async () => {
      if (document.getElementById('chat')?.classList.contains('active')) {
        await loadChatMessages();
        loadParticipants();
      }
    }, 5000);

    setInterval(pollTyping, 3000);

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('input', debounce(() => {
        if (chatInput.value.trim()) emitTyping();
      }, 500));
    }

    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);

    const chatInputEl = document.getElementById('chatInput');
    if (chatInputEl) {
      chatInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.addEventListener('scroll', debounce(() => {
        if (chatMessages.scrollTop < 50 && chatState.hasMore && !chatState.loadingMore) {
          loadMoreMessages();
        }
      }, 200));

      chatMessages.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="deleteMessage"]');
        if (deleteBtn) deleteMessage(deleteBtn.dataset.msgId);
      });
    }

    document.querySelector('[data-action="chatRefresh"]')?.addEventListener('click', loadChatMessages);

    setTimeout(() => scrollToBottom(document.getElementById('chatMessages'), true), 300);
  } catch { /* chat init failed — status stays as is */ }
}

export { chatState };
