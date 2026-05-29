const { LIMITS } = require('../config/constants');

class ChatService {
  private db: any;
  private cryptoService: any;
  constructor(db, cryptoService) {
    this.db = db;
    this.cryptoService = cryptoService || null;
  }

  async getMessages(classId, offset = 0, limit = LIMITS.CHAT_MESSAGES) {
    const messages = await this.db.all(
      `SELECT m.*, u.name as user_name, u.role as user_role
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.class_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [classId, limit, offset],
    );
    return messages.reverse();
  }

  async sendMessage(classId, userId, content, imageUrl = null) {
    const { rows } = await this.db.query(
      'INSERT INTO messages (class_id, user_id, content, image_url, updated_at) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) RETURNING id',
      [classId, userId, content, imageUrl],
    );
    const lastId = rows[0].id;

    const message = await this.db.get(
      `SELECT m.*, u.name as user_name, u.role as user_role
       FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [lastId],
    );
    return message;
  }

  async deleteMessage(messageId, userId) {
    const msg = await this.db.get('SELECT * FROM messages WHERE id = $1', [messageId]);
    if (!msg) return false;
    if (msg.user_id !== userId) return false;
    await this.db.query('DELETE FROM messages WHERE id = $1', [messageId]);
    return true;
  }

  async getClassForUser(user) {
    if (user.role === 'student') return user.class_id;
    if (user.role === 'parent' && user.linked_student_id) {
      const student = await this.db.get('SELECT class_id FROM users WHERE id = $1', [user.linked_student_id]);
      return student?.class_id || null;
    }
    if (user.role === 'teacher' || user.role === 'admin') {
      const fromSchedule = await this.db.get(
        'SELECT DISTINCT s.class_id FROM schedule s WHERE s.teacher_id = $1 LIMIT 1',
        [user.id],
      );
      if (fromSchedule) return fromSchedule.class_id;
      const anyClass = await this.db.get('SELECT id FROM classes LIMIT 1');
      return anyClass?.id || null;
    }
    return null;
  }

  async getOrCreateClassKey(classId) {
    const keyRecord = await this.db.get('SELECT encryption_key FROM class_keys WHERE class_id = $1', [classId]);
    if (keyRecord && keyRecord.encryption_key) return keyRecord.encryption_key;

    const newKey = this.cryptoService.generateKey();
    await this.db.query(
      'INSERT INTO class_keys (class_id, encryption_key) VALUES ($1,$2) ON CONFLICT (class_id) DO UPDATE SET encryption_key = $2',
      [classId, newKey],
    );
    return newKey;
  }

  async getParticipants(classId) {
    return this.db.all(
      `SELECT u.id, u.name, u.role
       FROM users u
       WHERE u.class_id = $1
          OR (u.role = 'parent' AND u.linked_student_id IN (SELECT id FROM users WHERE class_id = $1))
          OR u.role = 'teacher'
          OR u.role = 'admin'
       ORDER BY u.name`,
      [classId],
    );
  }

  async setTyping(classId, userId, userName) {
    await this.db.query(
      `INSERT INTO chat_typing (class_id, user_id, name, updated_at)
       VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
       ON CONFLICT (class_id, user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP, name = $3`,
      [classId, userId, userName],
    );
  }

  async getTyping(classId, ignoreUserId) {
    const rows = await this.db.all(
      `SELECT user_id, name, updated_at
       FROM chat_typing
       WHERE class_id = $1 AND user_id != $2`,
      [classId, ignoreUserId],
    );
    const now = Date.now();
    return rows.filter(r => now - new Date(r.updated_at).getTime() < LIMITS.CHAT_TYPING_TIMEOUT_MS);
  }

  async clearStaleTyping(classId) {
    await this.db.query(
      'DELETE FROM chat_typing WHERE class_id = $1 AND updated_at < NOW() - INTERVAL \'15 seconds\'',
      [classId],
    );
  }
}

module.exports = ChatService;

