// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'school.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
    this.run = promisify(this.db.run).bind(this.db);
    this.all = promisify(this.db.all).bind(this.db);
    this.get = promisify(this.db.get).bind(this.db);
  }

  async init() {
    await this.run(`CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT UNIQUE)`);
    
    await this.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT,
      role TEXT CHECK(role IN ('admin','teacher','student','parent')),
      class_id TEXT, linked_student_id TEXT,
      reset_token TEXT, reset_token_expiry DATETIME
    )`);

    await this.run(`CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT, teacher_id TEXT,
      subject TEXT, grade INTEGER, comment TEXT, date TEXT
    )`);

    await this.run(`CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT, time_slot TEXT,
      subject TEXT, teacher_id TEXT, class_id TEXT, room TEXT
    )`);

    await this.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, title TEXT,
      message TEXT, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT, 
      details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.seed();
  }

  async seed() {
    const { count } = await this.get("SELECT COUNT(*) as count FROM classes");
    if (count === 0) await this._createSeedData();
  }

  async _createSeedData() {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    
    console.log('🌱 Инициализация тестовых данных...');
    
    const c1 = uuidv4(), c2 = uuidv4();
    await this.run("INSERT INTO classes VALUES (?,?)", [c1, '3А']);
    await this.run("INSERT INTO classes VALUES (?,?)", [c2, '4Б']);

    const hash = await bcrypt.hash('123456', 8);
    const teacherId = uuidv4(), studentId = uuidv4(), parentId = uuidv4();

    await this.run("INSERT INTO users VALUES (?,?,?,?,?,?,?,NULL,NULL)", 
      [uuidv4(), 'admin@school.ru', hash, 'Админ', 'admin', null, null]);
    await this.run("INSERT INTO users VALUES (?,?,?,?,?,?,?,NULL,NULL)", 
      [teacherId, 'teacher@school.ru', hash, 'Иванова А.П.', 'teacher', null, null]);
    await this.run("INSERT INTO users VALUES (?,?,?,?,?,?,?,NULL,NULL)", 
      [studentId, 'ivan@school.ru', hash, 'Петров Иван', 'student', c1, null]);
    await this.run("INSERT INTO users VALUES (?,?,?,?,?,?,?,NULL,NULL)", 
      [parentId, 'parent@school.ru', hash, 'Петрова Мария', 'parent', null, studentId]);

    await this.run("INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES (?,?,?,?,?,?)",
      [studentId, teacherId, 'Математика', 5, 'Отлично!', new Date().toISOString().split('T')[0]]);

    await this.run("INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES (?,?,?,?,?,?)",
      ['Пн', '08:30', 'Математика', teacherId, c1, '302']);

    console.log('✅ Тестовые данные созданы');
  }

  close() {
    return new Promise((resolve) => this.db.close(resolve));
  }
}

module.exports = new Database();