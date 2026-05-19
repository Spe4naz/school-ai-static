// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDB, all, get, run } = require('./db');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется токен' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(403).json({ error: 'Токен невалиден' }); }
}
function role(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Доступ запрещён' }); }
async function log(uid, action, details) { await run("INSERT INTO logs (user_id, action, details) VALUES (?,?,?)", [uid, action, details]); }

// === API ===
app.post('/api/register', async (req, res) => {
  const { email, password, name, role, class_id, student_email } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Заполните все поля' });
  if (!['student', 'parent'].includes(role)) return res.status(400).json({ error: 'Саморегистрация только для учеников и родителей' });

  const exists = await get("SELECT id FROM users WHERE email = ?", [email]);
  if (exists) return res.status(409).json({ error: 'Email уже занят' });

  const hash = await bcrypt.hash(password, 8);
  let linked = null;
  if (role === 'parent' && student_email) {
    const stu = await get("SELECT id FROM users WHERE email = ? AND role = 'student'", [student_email]);
    if (!stu) return res.status(400).json({ error: 'Ученик не найден' });
    linked = stu.id;
  }

  const id = uuidv4();
  await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [id, email, hash, name, role, class_id || null, linked]);
  await log(id, 'REGISTER', `Новый пользователь: ${role}`);
  res.status(201).json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Неверные данные' });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, class_id: user.class_id, linked_student_id: user.linked_student_id } });
});

app.get('/api/grades', auth, async (req, res) => {
  let q = "SELECT g.*, u.name as student_name, t.name as teacher_name FROM grades g JOIN users u ON g.student_id=u.id JOIN users t ON g.teacher_id=t.id";
  let p = [];
  if (req.user.role === 'student') { q += " WHERE g.student_id=?"; p.push(req.user.id); }
  else if (req.user.role === 'parent') { q += " WHERE g.student_id=?"; p.push(req.user.linked_student_id); }
  else if (req.user.role === 'teacher') { q += " WHERE g.teacher_id=?"; p.push(req.user.id); }
  res.json(await all(q, p));
});

app.post('/api/grades', auth, role('teacher', 'admin'), async (req, res) => {
  const { student_id, subject, grade, comment } = req.body;
  await run("INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES (?,?,?,?,?,?)",
    [student_id, req.user.id, subject, grade, comment, new Date().toISOString().split('T')[0]]);
  await log(req.user.id, 'ADD_GRADE', `${subject}: ${grade}`);
  res.json({ success: true });
});

app.get('/api/logs', auth, role('admin'), async (req, res) => {
  res.json(await all("SELECT l.*, u.name as user_name FROM logs l JOIN users u ON l.user_id=u.id ORDER BY l.timestamp DESC LIMIT 50"));
});

app.get('/api/parent/dashboard', auth, role('parent'), async (req, res) => {
  const child = await get("SELECT * FROM users WHERE id = ?", [req.user.linked_student_id]);
  const grades = await all("SELECT * FROM grades WHERE student_id = ? ORDER BY date DESC", [req.user.linked_student_id]);
  res.json({ child, grades });
});

// 🚀 Запуск только при прямом вызове (не при импорте в тестах)
if (require.main === module) {
  initDB().then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)));
}
module.exports = app;