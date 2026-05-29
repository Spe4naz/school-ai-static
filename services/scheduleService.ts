const { ERR } = require('../config/constants');
const { getCached, setCache, invalidate, invalidatePrefix, TTL } = require('../utils/cache');

class ScheduleService {
  private db: any;

  constructor(db) {
    this.db = db;
  }

  async list({ class_id, user }) {
    let query = `
      SELECT s.*, t.name as teacher_name, c.name as class_name
      FROM schedule s
      LEFT JOIN users t ON s.teacher_id = t.id
      LEFT JOIN classes c ON s.class_id = c.id
    `;
    const params = [];
    let idx = 0;

    if (user.role === 'student' || user.role === 'parent') {
      const studentId = user.role === 'student' ? user.id : user.linked_student_id;
      const student = await this.db.get('SELECT class_id FROM users WHERE id = $1', [studentId]);
      if (student?.class_id) {
        query += ` WHERE s.class_id = $${++idx}`;
        params.push(student.class_id);
      }
    } else if (class_id && (user.role === 'teacher' || user.role === 'admin')) {
      query += ` WHERE s.class_id = $${++idx}`;
      params.push(class_id);
    }

    query += ` ORDER BY 
      CASE s.day 
        WHEN 'Пн' THEN 1 WHEN 'Вт' THEN 2 WHEN 'Ср' THEN 3 
        WHEN 'Чт' THEN 4 WHEN 'Пт' THEN 5 WHEN 'Сб' THEN 6 
      END, s.time_slot`;

    const cacheKey = `schedule:${user.role}:${user.id}:${class_id || ''}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const result = await this.db.all(query, params);
    setCache(cacheKey, result, TTL.SCHEDULE);
    return result;
  }

  async create({ day, time_slot, subject, teacher_id, class_id, room }) {
    await this.db.query(
      'INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) VALUES ($1,$2,$3,$4,$5,$6)',
      [day, time_slot, subject, teacher_id, class_id, room || null],
    );
    invalidatePrefix('schedule:');
    return { success: true };
  }

  async delete(id, userId, userRole) {
    const condition = userRole === 'admin' ? 'id = $1' : 'id = $1 AND teacher_id = $2';
    const params = userRole === 'admin' ? [id] : [id, userId];
    const result = await this.db.query(`DELETE FROM schedule WHERE ${condition}`, params);

    if (result.rowCount === 0) {
      const lesson = await this.db.get('SELECT id FROM schedule WHERE id = $1', [id]);
      if (!lesson) throw Object.assign(new Error('Урок не найден'), { status: 404, code: ERR.NOT_FOUND });
      throw Object.assign(new Error('Нельзя удалить чужой урок'), { status: 403, code: ERR.FORBIDDEN });
    }

    invalidatePrefix('schedule:');
    return { success: true };
  }

  async update(id, userId, userRole, updates) {
    const condition = userRole === 'admin' ? 'id = $1' : 'id = $1 AND teacher_id = $2';
    const params = userRole === 'admin' ? [id] : [id, userId];
    const checkResult = await this.db.query(`SELECT id FROM schedule WHERE ${condition}`, params);

    if (checkResult.rowCount === 0) {
      const lesson = await this.db.get('SELECT id FROM schedule WHERE id = $1', [id]);
      if (!lesson) throw Object.assign(new Error('Урок не найден'), { status: 404, code: ERR.NOT_FOUND });
      throw Object.assign(new Error('Нельзя редактировать чужой урок'), { status: 403, code: ERR.FORBIDDEN });
    }

    const lesson = await this.db.get('SELECT * FROM schedule WHERE id = $1', [id]);
    const updateParams = [
      updates.day || lesson.day,
      updates.time_slot || lesson.time_slot,
      updates.subject || lesson.subject,
      updates.room ?? lesson.room,
      id,
    ];

    await this.db.query('UPDATE schedule SET day = $1, time_slot = $2, subject = $3, room = $4 WHERE id = $5', updateParams);
    invalidatePrefix('schedule:');
    return { success: true };
  }
}

module.exports = ScheduleService;

