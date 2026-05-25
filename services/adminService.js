const crypto = require('crypto');
const { ERR } = require('../config/constants');

class AdminService {
  constructor(db) {
    this.db = db;
  }

  async listClasses() {
    return this.db.all('SELECT * FROM classes ORDER BY name');
  }

  async createClass(name) {
    await this.db.query('INSERT INTO classes (id, name) VALUES ($1,$2)', [
      crypto.randomBytes(16).toString('hex'),
      name,
    ]);
    return { name };
  }

  async updateClass(id, name) {
    const result = await this.db.query('UPDATE classes SET name = $1 WHERE id = $2', [name, id]);
    if (result.rowCount === 0) throw Object.assign(new Error('Класс не найден'), { status: 404, code: ERR.NOT_FOUND });
    return { id, name };
  }

  async deleteClass(id) {
    const students = await this.db.get('SELECT COUNT(*) as count FROM users WHERE class_id = $1', [id]);
    if (parseInt(students?.count || 0, 10) > 0) {
      throw Object.assign(new Error('Нельзя удалить класс с учениками'), { status: 400, code: ERR.CONFLICT });
    }
    const result = await this.db.query('DELETE FROM classes WHERE id = $1', [id]);
    if (result.rowCount === 0) throw Object.assign(new Error('Класс не найден'), { status: 404, code: ERR.NOT_FOUND });
    return { success: true };
  }

  async listStudents(class_id) {
    let query = "SELECT id, name, email, class_id FROM users WHERE role = 'student'";
    const params = [];
    if (class_id) {
      query += ' AND class_id = $1';
      params.push(class_id);
    }
    query += ' ORDER BY name';
    return this.db.all(query, params);
  }

  async listLogs(limit) {
    return this.db.all(
      `SELECT l.*, u.name as user_name 
       FROM logs l 
       LEFT JOIN users u ON l.user_id = u.id 
       ORDER BY l.timestamp DESC 
       LIMIT $1`,
      [limit],
    );
  }

  async getStats(backupService) {
    const [users, grades, classes, backups] = await Promise.all([
      this.db.get('SELECT COUNT(*) as count FROM users'),
      this.db.get('SELECT COUNT(*) as count FROM grades'),
      this.db.get('SELECT COUNT(*) as count FROM classes'),
      backupService.list().catch(() => []),
    ]);

    const lastBackup =
      backups.length > 0
        ? backups.sort((a, b) => new Date(b.created) - new Date(a.created))[0].created
        : null;

    return {
      totalUsers: parseInt(users?.count || 0, 10),
      totalGrades: parseInt(grades?.count || 0, 10),
      totalClasses: parseInt(classes?.count || 0, 10),
      lastBackup,
    };
  }

  async listUsers({ role, class_id }) {
    let query = 'SELECT id, email, name, role, class_id FROM users WHERE 1=1';
    const params = [];
    let idx = 0;

    if (role) {
      query += ` AND role = $${++idx}`;
      params.push(role);
    }
    if (class_id) {
      query += ` AND class_id = $${++idx}`;
      params.push(class_id);
    }

    query += ' ORDER BY role, name';
    return this.db.all(query, params);
  }

  async getUser(id) {
    const user = await this.db.get('SELECT id, email, name, role, class_id, created_at, last_login FROM users WHERE id = $1', [id]);
    if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404, code: ERR.NOT_FOUND });
    let class_name = null;
    if (user.class_id) {
      const cls = await this.db.get('SELECT name FROM classes WHERE id = $1', [user.class_id]);
      class_name = cls?.name;
    }
    return { ...user, class_name };
  }

  async updateUser(id, { email, name, role, class_id }) {
    const user = await this.db.get('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404, code: ERR.NOT_FOUND });

    const sets = [];
    const params = [];
    let idx = 0;

    if (email !== undefined) { sets.push(`email = $${++idx}`); params.push(email); }
    if (name !== undefined) { sets.push(`name = $${++idx}`); params.push(name); }
    if (role !== undefined) { sets.push(`role = $${++idx}`); params.push(role); }
    if (class_id !== undefined) { sets.push(`class_id = $${++idx}`); params.push(class_id); }

    if (sets.length === 0) return { id };

    params.push(id);
    await this.db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${++idx}`, params);
    return { id, email, name, role, class_id };
  }

  async deleteUser(id, currentUserId) {
    if (id === currentUserId) {
      throw Object.assign(new Error('Нельзя удалить себя'), { status: 400, code: ERR.CANNOT_DELETE_SELF });
    }

    const result = await this.db.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw Object.assign(new Error('Пользователь не найден'), { status: 404, code: ERR.NOT_FOUND });
    }

    return { success: true };
  }

  // Registration codes
  async listRegistrationCodes() {
    return this.db.all('SELECT * FROM registration_codes ORDER BY created_at DESC');
  }

  async createRegistrationCode(code, role) {
    const existing = await this.db.get('SELECT code FROM registration_codes WHERE code = $1', [code]);
    if (existing) throw Object.assign(new Error('Код уже существует'), { status: 409, code: ERR.CONFLICT });
    await this.db.query(
      'INSERT INTO registration_codes (code, role, used) VALUES ($1,$2,0)',
      [code, role],
    );
    return { code, role, used: 0 };
  }

  async deleteRegistrationCode(code) {
    const result = await this.db.query('DELETE FROM registration_codes WHERE code = $1', [code]);
    if (result.rowCount === 0) throw Object.assign(new Error('Код не найден'), { status: 404, code: ERR.NOT_FOUND });
    return { success: true };
  }

  // System info
  async getSettings() {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || '',
      smtpHost: process.env.SMTP_HOST || '',
      backupDir: process.env.BACKUP_DIR || './backups',
      backupRetention: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
      dbHost: process.env.DB_HOST || 'localhost',
      dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    };
  }
}

module.exports = AdminService;
