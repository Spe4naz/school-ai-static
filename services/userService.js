// services/userService.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/auth');

class UserService {
  async findByEmail(email) {
    return db.get("SELECT * FROM users WHERE email = ?", [email]);
  }

  async findById(id) {
    return db.get("SELECT * FROM users WHERE id = ?", [id]);
  }

  async create({ email, password, name, role, class_id = null, linked_student_id = null }) {
    const hash = await bcrypt.hash(password, config.bcryptRounds);
    const id = uuidv4();
    
    await db.run(
      "INSERT INTO users VALUES (?,?,?,?,?,?,?,NULL,NULL)",
      [id, email, hash, name, role, class_id, linked_student_id]
    );
    
    return { id, email, name, role };
  }

  async updatePassword(userId, newPassword) {
    const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await db.run("UPDATE users SET password = ? WHERE id = ?", [hash, userId]);
  }

  async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) return null; // Не раскрываем существование пользователя

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + config.resetTokenExpiry);
    
    await db.run(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [resetToken, expiry, user.id]
    );
    
    return { user, resetToken };
  }

  async confirmPasswordReset(email, token, newPassword) {
    const user = await db.get(
      "SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expiry > ?",
      [email, token, new Date()]
    );
    
    if (!user) throw new Error('Неверный или истёкший токен');
    
    await this.updatePassword(user.id, newPassword);
    await db.run("UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?", [user.id]);
    
    return true;
  }

  async listByClass(classId) {
    return db.all("SELECT id, name, email, role FROM users WHERE class_id = ? AND role = 'student'", [classId]);
  }
}

module.exports = new UserService();