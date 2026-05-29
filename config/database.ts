// config/database.js — PostgreSQL
const { Pool } = require('pg');

class Database {
  private pool: any;
  constructor() {
    this.pool = null;
  }

  _ensureConnected() {
    if (this.pool) return;
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    this.pool = new Pool({
      connectionString: url,
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      query_timeout: 10000,
    });
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err.message);
    });
  }

  async query(text: string, params?: any[]) {
    this._ensureConnected();
    return this.pool.query(text, params);
  }

  async all(text: string, params?: any[]) {
    this._ensureConnected();
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async get(text: string, params?: any[]) {
    this._ensureConnected();
    const result = await this.pool.query(text, params);
    return result.rows[0] || null;
  }

  async init() {
    this._ensureConnected();
    await this.query('SELECT 1');
    await this.query('CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)');

    await this.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','teacher','student','parent','head_teacher')),
      class_id TEXT, linked_student_id TEXT,
      reset_token TEXT, reset_token_expiry TIMESTAMP, reset_id TEXT
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY, student_id TEXT NOT NULL, teacher_id TEXT NOT NULL,
      subject TEXT NOT NULL, grade INTEGER NOT NULL, comment TEXT, date TEXT NOT NULL
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS schedule (
      id SERIAL PRIMARY KEY, day TEXT NOT NULL, time_slot TEXT NOT NULL,
      subject TEXT NOT NULL, teacher_id TEXT NOT NULL, class_id TEXT NOT NULL, room TEXT
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      message TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL,
      details TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      class_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS class_keys (
      class_id TEXT PRIMARY KEY,
      encryption_key TEXT NOT NULL
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS chat_typing (
      class_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (class_id, user_id)
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS homeworks (
      id SERIAL PRIMARY KEY,
      class_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS registration_codes (
      code TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'head_teacher')),
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await this._migrate();
    await this._createIndexes();

    await this.seed();
  }

  async _migrate() {
    const columnsToAdd = [
      { table: 'users', column: 'reset_id', type: 'TEXT' },
      { table: 'users', column: 'reset_token', type: 'TEXT' },
      { table: 'users', column: 'reset_token_expiry', type: 'TEXT' },
      { table: 'users', column: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { table: 'users', column: 'last_login', type: 'TIMESTAMP' },
      { table: 'messages', column: 'image_url', type: 'TEXT' },
      { table: 'messages', column: 'updated_at', type: 'TEXT' },
      { table: 'grades', column: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { table: 'grades', column: 'updated_at', type: 'TIMESTAMP' },
      { table: 'schedule', column: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    ];

    for (const { table, column, type } of columnsToAdd) {
      try {
        await this.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch (err) {
        if (err.code !== '42701') {
          throw err;
        }
      }
    }
  }

  async _createIndexes() {
    const indexes = [
      // users
      'CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_linked_student ON users(linked_student_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      // grades
      'CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_grades_teacher ON grades(teacher_id)',
      'CREATE INDEX IF NOT EXISTS idx_grades_student_date ON grades(student_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject)',
      // schedule
      'CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_unique ON schedule(day, time_slot, class_id, teacher_id)',
      // notifications
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)',
      // logs
      'CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)',
      // messages
      'CREATE INDEX IF NOT EXISTS idx_messages_class ON messages(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_class_created ON messages(class_id, created_at)',
      // homeworks
      'CREATE INDEX IF NOT EXISTS idx_homeworks_class ON homeworks(class_id)',
      'CREATE INDEX IF NOT EXISTS idx_homeworks_teacher ON homeworks(teacher_id)',
      'CREATE INDEX IF NOT EXISTS idx_homeworks_class_due ON homeworks(class_id, due_date)',
      // announcements
      'CREATE INDEX IF NOT EXISTS idx_announcements_user ON announcements(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at)',
      // registration_codes
      'CREATE INDEX IF NOT EXISTS idx_registration_codes_role ON registration_codes(role)',
      'CREATE INDEX IF NOT EXISTS idx_registration_codes_used ON registration_codes(used)',
      // class_keys
      'CREATE INDEX IF NOT EXISTS idx_chat_typing_class ON chat_typing(class_id)',
      // refresh_tokens
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)',
    ];

    for (const sql of indexes) {
      try {
        await this.query(sql);
      } catch (err) {
        // ignore duplicate index errors on re-runs
        if (err.code !== '42710') throw err;
      }
    }
  }

  async seed() {
    const { rows } = await this.query('SELECT COUNT(*) as count FROM classes');
    if (Number(rows[0].count) === 0) await this._createSeedData();
  }

  async _createSeedData() {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');

    console.log('Initializing test data...');

    const c1 = uuidv4(),
      c2 = uuidv4();
    await this.query('INSERT INTO classes VALUES ($1,$2)', [c1, '3А']);
    await this.query('INSERT INTO classes VALUES ($1,$2)', [c2, '4Б']);

    const hash = await bcrypt.hash('123456', 8);
    const teacherId = uuidv4(),
      studentId = uuidv4(),
      parentId = uuidv4();

    await this.query(
      'INSERT INTO users (id, email, password, name, role, class_id, linked_student_id, reset_token, reset_token_expiry, reset_id, created_at, last_login) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,CURRENT_TIMESTAMP,NULL)',
      [uuidv4(), 'admin@school.ru', hash, 'Админ', 'admin', null, null],
    );
    await this.query(
      'INSERT INTO users (id, email, password, name, role, class_id, linked_student_id, reset_token, reset_token_expiry, reset_id, created_at, last_login) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,CURRENT_TIMESTAMP,NULL)',
      [teacherId, 'teacher@school.ru', hash, 'Иванова А.П.', 'teacher', null, null],
    );
    await this.query(
      'INSERT INTO users (id, email, password, name, role, class_id, linked_student_id, reset_token, reset_token_expiry, reset_id, created_at, last_login) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,CURRENT_TIMESTAMP,NULL)',
      [studentId, 'ivan@school.ru', hash, 'Петров Иван', 'student', c1, null],
    );
    await this.query(
      'INSERT INTO users (id, email, password, name, role, class_id, linked_student_id, reset_token, reset_token_expiry, reset_id, created_at, last_login) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,CURRENT_TIMESTAMP,NULL)',
      [parentId, 'parent@school.ru', hash, 'Петрова Мария', 'parent', null, studentId],
    );

    await this.query(
      'INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES ($1,$2,$3,$4,$5,$6)',
      [studentId, teacherId, 'Математика', 5, 'Отлично!', new Date().toISOString().split('T')[0]],
    );

    const scheduleData = [
      ['Пн', '08:30', 'Математика', teacherId, c1, '302'],
      ['Пн', '09:20', 'Русский язык', teacherId, c1, '302'],
      ['Пн', '10:10', 'Английский язык', teacherId, c1, '305'],
      ['Пн', '11:00', 'Физкультура', teacherId, c1, 'Спортзал'],
      ['Пн', '11:55', 'Музыка', teacherId, c1, '307'],
      ['Вт', '08:30', 'Русский язык', teacherId, c1, '302'],
      ['Вт', '09:20', 'Математика', teacherId, c1, '302'],
      ['Вт', '10:10', 'Окружающий мир', teacherId, c1, '302'],
      ['Вт', '11:00', 'ИЗО', teacherId, c1, '309'],
      ['Вт', '11:55', 'Технология', teacherId, c1, '310'],
      ['Ср', '08:30', 'Математика', teacherId, c1, '302'],
      ['Ср', '09:20', 'Русский язык', teacherId, c1, '302'],
      ['Ср', '10:10', 'Английский язык', teacherId, c1, '305'],
      ['Ср', '11:00', 'Физкультура', teacherId, c1, 'Спортзал'],
      ['Ср', '11:55', 'Окружающий мир', teacherId, c1, '302'],
      ['Чт', '08:30', 'Русский язык', teacherId, c1, '302'],
      ['Чт', '09:20', 'Математика', teacherId, c1, '302'],
      ['Чт', '10:10', 'Музыка', teacherId, c1, '307'],
      ['Чт', '11:00', 'Информатика', teacherId, c1, '305'],
      ['Чт', '11:55', 'ОБЖ', teacherId, c1, '302'],
      ['Пт', '08:30', 'Математика', teacherId, c1, '302'],
      ['Пт', '09:20', 'Русский язык', teacherId, c1, '302'],
      ['Пт', '10:10', 'Английский язык', teacherId, c1, '305'],
      ['Пт', '11:00', 'Окружающий мир', teacherId, c1, '302'],
      ['Пт', '11:55', 'Физкультура', teacherId, c1, 'Спортзал'],
    ];

    for (const s of scheduleData) {
      await this.query(
        'INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES ($1,$2,$3,$4,$5,$6)',
        s,
      );
    }

    // Test registration codes
    await this.query('INSERT INTO registration_codes (code, role) VALUES ($1,$2)', ['SCHOOL2024', 'teacher']);
    await this.query('INSERT INTO registration_codes (code, role) VALUES ($1,$2)', ['ADMIN2024', 'head_teacher']);
    await this.query('INSERT INTO registration_codes (code, role) VALUES ($1,$2)', ['TEACH01', 'teacher']);
    await this.query('INSERT INTO registration_codes (code, role) VALUES ($1,$2)', ['TEACH02', 'teacher']);
    await this.query('INSERT INTO registration_codes (code, role) VALUES ($1,$2)', ['HEAD01', 'head_teacher']);

    console.log('Test data created');
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

module.exports = new Database();
