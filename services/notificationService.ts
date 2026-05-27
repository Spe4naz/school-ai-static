const { LIMITS } = require('../config/constants');

class NotificationService {
  private db: any;
  private _sseClients: any;

  constructor(db) {
    this.db = db;
    this._sseClients = null;
  }

  setSseClients(clients) { this._sseClients = clients; }

  _notifySSE(userId) {
    if (!this._sseClients) return;
    const clients = this._sseClients.get(userId);
    if (clients) {
      const data = JSON.stringify({ type: 'notification', unread: true });
      clients.forEach(c => c.write(`data: ${data}\n\n`));
    }
  }

  async create({ user_id, title, message }) {
    await this.db.query('INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)', [
      user_id,
      title,
      message,
    ]);
    this._notifySSE(user_id);
    return { user_id, title, message };
  }

  async createForGrade(student_id, subject, grade, comment = '') {
    const message = `Вы получили оценку ${grade} по предмету "${subject}". ${comment}`.trim();

    await this.create({
      user_id: student_id,
      title: `Новая оценка: ${subject}`,
      message,
    });

    const parent = await this.db.get("SELECT id FROM users WHERE linked_student_id = $1 AND role = 'parent'", [
      student_id,
    ]);
    if (parent) {
      await this.create({
        user_id: parent.id,
        title: `Оценка ребёнка: ${subject}`,
        message: `Ученик получил ${grade} по "${subject}". ${comment}`.trim(),
      });
    }
  }

  async list(user_id, limit = LIMITS.NOTIFICATIONS) {
    return this.db.all('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [
      user_id,
      limit,
    ]);
  }

  async markAsRead(user_id) {
    await this.db.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [user_id]);
  }

  async getUnreadCount(user_id) {
    const result = await this.db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0', [
      user_id,
    ]);
    return parseInt(result?.count || 0, 10);
  }
}

module.exports = NotificationService;


