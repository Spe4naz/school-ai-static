// services/notificationService.js
const db = require('../config/database');

class NotificationService {
  async create({ user_id, title, message }) {
    const result = await db.run(
      "INSERT INTO notifications (user_id, title, message) VALUES (?,?,?)",
      [user_id, title, message]
    );
    return { id: result.lastID, user_id, title, message };
  }

  async createForGrade(student_id, subject, grade, comment = '') {
    const message = `Вы получили оценку ${grade} по предмету "${subject}". ${comment}`.trim();
    
    // Уведомление ученику
    await this.create({
      user_id: student_id,
      title: `Новая оценка: ${subject}`,
      message
    });

    // Уведомление родителю
    const parent = await db.get(
      "SELECT id FROM users WHERE linked_student_id = ? AND role = 'parent'",
      [student_id]
    );
    if (parent) {
      await this.create({
        user_id: parent.id,
        title: `Оценка ребёнка: ${subject}`,
        message: `Ученик получил ${grade} по "${subject}". ${comment}`.trim()
      });
    }
  }

  async list(user_id, limit = 20) {
    return db.all(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [user_id, limit]
    );
  }

  async markAsRead(user_id) {
    await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [user_id]);
  }

  async getUnreadCount(user_id) {
    const { count } = await db.get(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      [user_id]
    );
    return count;
  }
}

module.exports = new NotificationService();