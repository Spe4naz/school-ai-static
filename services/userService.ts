const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/auth');

class UserService {
  private db: any;

  constructor(db) {
    this.db = db;
  }

  async findByEmail(email) {
    return this.db.get('SELECT * FROM users WHERE email = $1', [email]);
  }

  async findById(id) {
    return this.db.get('SELECT * FROM users WHERE id = $1', [id]);
  }

  async create({ email, password, name, role, class_id = null, linked_student_id = null }) {
    const hash = await bcrypt.hash(password, config.bcryptRounds);
    const id = uuidv4();

    await this.db.query(
      'INSERT INTO users (id, email, password, name, role, class_id, linked_student_id, reset_token, reset_token_expiry, reset_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,CURRENT_TIMESTAMP)',
      [id, email, hash, name, role, class_id, linked_student_id],
    );

    return { id, email, name, role };
  }

  async updatePassword(userId, newPassword) {
    const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await this.db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userId]);
  }

  async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetId = crypto.randomUUID();
    const expiry = new Date(Date.now() + config.resetTokenExpiry);

    await this.db.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2, reset_id = $3 WHERE id = $4', [
      resetToken,
      expiry.toISOString(),
      resetId,
      user.id,
    ]);

    return { user, resetId };
  }

  async confirmPasswordReset(resetId, email, newPassword) {
    const user = await this.db.get(
      'SELECT * FROM users WHERE reset_id = $1 AND email = $2 AND reset_token_expiry > $3',
      [resetId, email, new Date().toISOString()],
    );

    if (!user) {
      throw new (require('../utils/AppError'))(400, 'INVALID_TOKEN', 'Неверный или истёкший токен');
    }

    const result = await this.db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, reset_id = NULL WHERE id = $2 AND reset_id = $3',
      [await bcrypt.hash(newPassword, config.bcryptRounds), user.id, resetId],
    );

    if (result.rowCount === 0) {
      throw new (require('../utils/AppError'))(400, 'INVALID_TOKEN', 'Неверный или истёкший токен');
    }
    return true;
  }

  async listByClass(classId) {
    return this.db.all("SELECT id, name, email, role FROM users WHERE class_id = $1 AND role = 'student'", [classId]);
  }

  async updateLastLogin(userId) {
    await this.db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  }

  async validateRegistrationCode(code, role) {
    const record = await this.db.get(
      'SELECT * FROM registration_codes WHERE code = $1 AND role = $2 AND used = 0',
      [code, role],
    );
    if (!record) return false;
    await this.db.query('UPDATE registration_codes SET used = 1 WHERE code = $1', [code]);
    return true;
  }

  async getProfile(userId) {
    const user = await this.db.get('SELECT id, email, name, role, class_id FROM users WHERE id = $1', [userId]);
    if (!user) return null;
    let class_name = null;
    if (user.class_id) {
      const cls = await this.db.get('SELECT name FROM classes WHERE id = $1', [user.class_id]);
      class_name = cls?.name;
    }
    return { ...user, class_name };
  }

  async createRefreshToken(userId) {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + config.refreshExpiresInMs);
    await this.db.query(
      'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt.toISOString()],
    );
    return token;
  }

  async consumeRefreshToken(token) {
    const record = await this.db.get(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > $2 AND used = 0',
      [token, new Date().toISOString()],
    );
    if (!record) return null;

    await this.db.query('UPDATE refresh_tokens SET used = 1 WHERE id = $1', [record.id]);
    return { user_id: record.user_id };
  }

  async invalidateAllRefreshTokens(userId) {
    await this.db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND used = 0', [userId]);
  }
}

module.exports = UserService;


