import { API, escapeHtml } from './utils.js';

function getRoleLabel(role) {
  const labels = { admin: 'Админ', teacher: 'Учитель', student: 'Ученик', parent: 'Родитель' };
  return labels[role] || role;
}

export async function loadUsers() {
  const roleFilter = document.getElementById('userRoleFilter').value;
  let url = `${API}/admin/users`;
  if (roleFilter) url += `?role=${roleFilter}`;

  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
    });
    const users = await res.json();

    const tbody = document.querySelector('#usersTable tbody');
    const classes = await fetch(`${API}/classes`, {
      credentials: 'same-origin',
    }).then(r => r.json());

    const classMap = {};
    classes.forEach(c => classMap[c.id] = c.name);

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="role-badge role-${escapeHtml(u.role)}">${escapeHtml(getRoleLabel(u.role))}</span></td>
        <td>${u.class_id ? (escapeHtml(classMap[u.class_id]) || escapeHtml(u.class_id)) : '—'}</td>
        <td>
          ${u.role !== 'admin' || users.filter(x => x.role === 'admin').length > 1 ?
    `<button class="btn" style="padding:5px 10px; font-size:0.8rem; background:#ef4444;" data-action="deleteUser" data-id="${escapeHtml(u.id)}">Удалить</button>` :
    '<span style="color:#999; font-size:0.8rem;">Нельзя</span>'}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="deleteUser"]').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
  } catch (err) { console.error(err); }
}

export async function loadClassesForUserModal() {
  const res = await fetch(`${API}/classes`, {
    credentials: 'same-origin',
  });
  const classes = await res.json();
  document.getElementById('newUserClass').innerHTML = '<option value="">Без класса</option>' +
    classes.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleSelect = document.getElementById('newUserRole');
  if (roleSelect && user.role === 'teacher') {
    roleSelect.innerHTML = '<option value="student">Ученик</option><option value="parent">Родитель</option>';
  }
}

export function toggleUserClassField() {
  const role = document.getElementById('newUserRole').value;
  const wrapper = document.getElementById('newUserClassWrapper');
  wrapper.style.display = ['student', 'parent'].includes(role) ? 'block' : 'none';
}

export async function createUser(e) {
  e.preventDefault();
  const errorEl = document.getElementById('userError');
  errorEl.style.display = 'none';

  const payload = {
    name: document.getElementById('newUserName').value.trim(),
    email: document.getElementById('newUserEmail').value.trim(),
    password: document.getElementById('newUserPassword').value,
    role: document.getElementById('newUserRole').value,
    class_id: ['student', 'parent'].includes(document.getElementById('newUserRole').value) ?
      document.getElementById('newUserClass').value : null,
  };

  if (!payload.name || payload.name.length < 2) {
    errorEl.textContent = 'Введите корректное имя';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      alert('Пользователь создан!');
      const modal = document.getElementById('userModal');
      if (modal) modal.style.display = 'none';
      const form = document.getElementById('userForm');
      if (form) form.reset();
      loadUsers();
    } else {
      errorEl.textContent = data.error || 'Ошибка';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Ошибка сети';
    errorEl.style.display = 'block';
  }
}

export async function deleteUser(userId) {
  if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

  try {
    const res = await fetch(`${API}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (res.ok) {
      alert('Пользователь удалён');
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Ошибка удаления');
    }
  } catch (err) { alert('Ошибка сети'); }
}
