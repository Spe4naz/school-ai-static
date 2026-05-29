class GradeService {
  private db: any;
  private notificationService: any;
  constructor(db, notificationService) {
    this.db = db;
    this.notificationService = notificationService || null;
  }

  async list({ class_id, user, week_offset }) {
    let query = `
      SELECT g.*, u.name as student_name, u.class_id, c.name as class_name, t.name as teacher_name 
      FROM grades g 
      JOIN users u ON g.student_id = u.id 
      JOIN classes c ON u.class_id = c.id 
      JOIN users t ON g.teacher_id = t.id
    `;
    const params = [];
    let idx = 0;
    const conditions = [];

    if (user.role === 'student') {
      conditions.push(`g.student_id = $${++idx}`);
      params.push(user.id);
    } else if (user.role === 'parent') {
      conditions.push(`g.student_id = $${++idx}`);
      params.push(user.linked_student_id);
    } else if (class_id) {
      conditions.push(`u.class_id = $${++idx}`);
      params.push(class_id);
    }

    if (week_offset !== undefined && !isNaN(week_offset)) {
      const offset = parseInt(week_offset, 10);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() + offset * 7);
      // move to Monday of that week (Sunday = 7, Monday = 1)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      conditions.push(`g.date >= $${++idx}`);
      params.push(weekStart.toISOString().split('T')[0]);
      conditions.push(`g.date <= $${++idx}`);
      params.push(weekEnd.toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY g.date DESC';
    return this.db.all(query, params);
  }

  async create({ student_id, teacher_id, subject, grade, comment }) {
    const date = new Date().toISOString().split('T')[0];

    await this.db.query(
      'INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES ($1,$2,$3,$4,$5,$6)',
      [student_id, teacher_id, subject, grade, comment, date],
    );

    await this.db.query(
      'INSERT INTO logs (user_id, action, details) VALUES ($1,$2,$3)',
      [teacher_id, 'grade_create', `Оценка ${grade} по "${subject}" ученику ${student_id}`],
    );

    if (this.notificationService) {
      await this.notificationService.createForGrade(student_id, subject, grade, comment);
    }

    return { student_id, subject, grade };
  }

  async getStats(classId) {
    const grades = await this.db.all(
      'SELECT grade FROM grades g JOIN users u ON g.student_id = u.id WHERE u.class_id = $1',
      [classId],
    );

    if (grades.length === 0) return { average: null, count: 0 };

    const sum = grades.reduce((acc, g) => acc + g.grade, 0);
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0 };
    grades.forEach((g) => {
      if (distribution[g.grade] !== undefined) {
        distribution[g.grade]++;
      }
    });

    return {
      average: (sum / grades.length).toFixed(2),
      count: grades.length,
      distribution,
    };
  }

  async getProgress(studentId, subject, period) {
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    let idx = 0;
    let query = `SELECT grade, date FROM grades WHERE student_id = $${++idx} AND date >= $${++idx}`;
    const params = [studentId, startDate.toISOString().split('T')[0]];

    if (subject && subject !== 'all') {
      query += ` AND subject = $${++idx}`;
      params.push(subject);
    }

    query += ' ORDER BY date ASC';
    const grades = await this.db.all(query, params);

    const byDate: Record<string, number[]> = {};
    grades.forEach((g) => {
      if (!byDate[g.date]) byDate[g.date] = [];
      byDate[g.date].push(g.grade);
    });

    const data = Object.entries(byDate).map(([date, arr]) => ({
      date,
      average: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2),
    }));

    return data;
  }

  async getSubjects(studentId) {
    const grades = await this.db.all('SELECT DISTINCT subject FROM grades WHERE student_id = $1 ORDER BY subject', [
      studentId,
    ]);

    if (grades.length > 0) {
      return grades.map((g) => g.subject);
    }

    const { SUBJECTS } = require('../config/constants');
    return [...SUBJECTS];
  }
}

module.exports = GradeService;

