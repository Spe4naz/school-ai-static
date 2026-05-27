class HomeworkService {
  private db: any;

  constructor(db) {
    this.db = db;
  }

  async list(classId) {
    return this.db.all(
      `SELECT h.*, u.name as teacher_name
       FROM homeworks h
       JOIN users u ON h.teacher_id = u.id
       WHERE h.class_id = $1
       ORDER BY h.due_date ASC, h.created_at DESC`,
      [classId],
    );
  }

  async create({ class_id, teacher_id, subject, title, description, due_date }) {
    const { rows } = await this.db.query(
      `INSERT INTO homeworks (class_id, teacher_id, subject, title, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [class_id, teacher_id, subject, title, description, due_date],
    );
    const hw = await this.db.get('SELECT * FROM homeworks WHERE id = $1', [rows[0].id]);
    return hw;
  }

  async delete(homeworkId, teacherId) {
    const hw = await this.db.get('SELECT * FROM homeworks WHERE id = $1', [homeworkId]);
    if (!hw) return false;
    if (hw.teacher_id !== teacherId) return false;
    await this.db.query('DELETE FROM homeworks WHERE id = $1', [homeworkId]);
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
}

module.exports = HomeworkService;

