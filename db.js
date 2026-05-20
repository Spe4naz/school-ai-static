// db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // uuid v8 поддерживает require()
const path = require('path');
const { promisify } = require('util');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'school.db');
const db = new sqlite3.Database(DB_PATH);

const run = promisify(db.run).bind(db);
const all = promisify(db.all).bind(db);
const get = promisify(db.get).bind(db);

async function initDB() {
  // 1. Таблицы
  await run(`CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT UNIQUE)`);
  
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT,
    role TEXT CHECK(role IN ('admin','teacher','student','parent')),
    class_id TEXT, linked_student_id TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT, teacher_id TEXT,
    subject TEXT, grade INTEGER, comment TEXT, date TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT, time_slot TEXT,
    subject TEXT, teacher_id TEXT, class_id TEXT, room TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, title TEXT,
    message TEXT, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT, 
    details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. Сиды (только если БД пуста)
  const count = await get("SELECT count(*) as c FROM classes");
  if (count.c === 0) {
    console.log('🌱 Инициализация базы данных "Умная Школа"...');
    
    // Классы
    const c1 = uuidv4(), c2 = uuidv4();
    await run("INSERT INTO classes VALUES (?,?)", [c1, '3А']);
    await run("INSERT INTO classes VALUES (?,?)", [c2, '4Б']);

    // Пользователи
    const hash = await bcrypt.hash('123456', 8);
    const teacherId = uuidv4(), student1Id = uuidv4(), parentId = uuidv4();

    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [uuidv4(), 'admin@school.ru', hash, 'Админ', 'admin', null, null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [teacherId, 'teacher@school.ru', hash, 'Иванова А.П.', 'teacher', null, null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [student1Id, 'ivan@school.ru', hash, 'Петров Иван', 'student', c1, null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [parentId, 'parent@school.ru', hash, 'Петрова Мария', 'parent', null, student1Id]);

    // Оценки
    await run("INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES (?,?,?,?,?,?)",
      [student1Id, teacherId, 'Математика', 5, 'Отлично!', new Date().toISOString().split('T')[0]]);

    // Расписание
    await run("INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES (?,?,?,?,?,?)",
      ['Пн', '08:30', 'Математика', teacherId, c1, '302']);
    await run("INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES (?,?,?,?,?,?)",
      ['Пн', '09:25', 'Русский язык', teacherId, c1, '201']);
    await run("INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES (?,?,?,?,?,?)",
      ['Вт', '08:30', 'Физика', teacherId, c1, '402']);

    console.log('✅ База данных готова!');
  }
}

module.exports = { db, run, all, get, initDB };