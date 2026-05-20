// services/gradeService.js
const db = require('../config/database');
const notificationService = require('./notificationService');

class GradeService {
  async list({ class_id, user }) {
    let query = `
      SELECT g.*, u.name as student_name, u.class_id, c.name as class_name, t.name as teacher_name 
      FROM grades g 
      JOIN users u ON g.student_id = u.id 
      JOIN classes c ON u.class_id = c.id 
      JOIN users t ON g.teacher_id = t.id
    `;
    const params = [];

    if (user.role === 'student') {
      query += " WHERE g.student_id = ?";
      params.push(user.id);
    } else if (user.role === 'parent') {
      query += " WHERE g.student_id = ?";
      params.push(user.linked_student_id);
    } else if (class_id) {
      query += " WHERE u.class_id = ?";
      params.push(class_id);
    }

    query += " ORDER BY g.date DESC";
    return db.all(query, params);
  }

  async create({ student_id, teacher_id, subject, grade, comment }) {
    const date = new Date().toISOString().split('T')[0];
    
    const result = await db.run(
      "INSERT INTO grades (student_id, teacher_id, subject, grade, comment, date) VALUES (?,?,?,?,?,?)",
      [student_id, teacher_id, subject, grade, comment, date]
    );

    // Уведомления
    await notificationService.createForGrade(student_id, subject, grade, comment);

    return { id: result.lastID, student_id, subject, grade };
  }

  async getStats(classId) {
    const grades = await db.all(
      "SELECT grade FROM grades g JOIN users u ON g.student_id = u.id WHERE u.class_id = ?",
      [classId]
    );
    
    if (grades.length === 0) return { average: null, count: 0 };
    
    const sum = grades.reduce((acc, g) => acc + g.grade, 0);
    return {
      average: (sum / grades.length).toFixed(2),
      count: grades.length,
      distribution: {
        5: grades.filter(g => g.grade === 5).length,
        4: grades.filter(g => g.grade === 4).length,
        3: grades.filter(g => g.grade === 3).length,
        2: grades.filter(g => g.grade === 2).length,
      }
    };
  }
}

module.exports = new GradeService();