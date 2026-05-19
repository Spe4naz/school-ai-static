// db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { promisify } = require('util');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'school.db');
const db = new sqlite3.Database(DB_PATH);

const run = promisify(db.run).bind(db);
const all = promisify(db.all).bind(db);
const get = promisify(db.get).bind(db);

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT,
    role TEXT CHECK(role IN ('admin','teacher','student','parent')),
    class_id TEXT, linked_student_id TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT, teacher_id TEXT,
    subject TEXT, grade INTEGER, comment TEXT, date TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT,
    details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const count = await get("SELECT count(*) as c FROM users");
  if (count.c === 0 && process.env.NODE_ENV !== 'test') {
    const hash = await bcrypt.hash('123456', 8);
    const adminId = uuidv4(), teacherId = uuidv4(), studentId = uuidv4(), parentId = uuidv4();
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [adminId, 'admin@school.ru', hash, 'Админ', 'admin', null, null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [teacherId, 'teacher@school.ru', hash, 'Иванова А.П.', 'teacher', '3Б', null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [studentId, 'student@school.ru', hash, 'Петров Иван', 'student', '3Б', null]);
    await run("INSERT INTO users VALUES (?,?,?,?,?,?,?)", [parentId, 'parent@school.ru', hash, 'Петрова Мария', 'parent', null, studentId]);
    await run("INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES (?,?,?,?,?,?)", [studentId, teacherId, 'Математика', 5, 'Отлично!', '2026-05-15']);
    console.log('✅ DB: Тестовые данные загружены');
  }
}

module.exports = { db, run, all, get, initDB, DB_PATH };