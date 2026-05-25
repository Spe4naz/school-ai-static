const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

class ReportService {
  constructor(db) {
    this.db = db;
  }

  async getGradesForReport(classId, period) {
    let query = `
      SELECT g.*, u.name as student_name, u.class_id, c.name as class_name
      FROM grades g 
      JOIN users u ON g.student_id = u.id 
      LEFT JOIN classes c ON u.class_id = c.id
    `;
    const params = [];
    let idx = 0;

    if (classId) {
      query += ` WHERE u.class_id = $${++idx}`;
      params.push(classId);
    }

    if (period) {
      const startDate = new Date();
      if (period === 'week') startDate.setDate(startDate.getDate() - 7);
      else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
      else if (period === 'term') startDate.setMonth(startDate.getMonth() - 3);

      query += idx > 0 ? ' AND' : ' WHERE';
      query += ` g.date >= $${++idx}`;
      params.push(startDate.toISOString().split('T')[0]);
    }

    query += ' ORDER BY g.date DESC';
    return this.db.all(query, params);
  }

  generatePDF(grades, className) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Отчёт об успеваемости', { align: 'center' });
      doc.fontSize(12).text(`Класс: ${className || 'Все классы'}`, { align: 'center' });
      doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, { align: 'center' });
      doc.moveDown(2);

      if (grades.length === 0) {
        doc.text('Нет данных об оценках за выбранный период.');
      } else {
        doc.fontSize(10);
        doc.text('№ | Дата       | Ученик          | Предмет      | Оценка | Комментарий');
        doc.text('-'.repeat(80));

        grades.forEach((g, i) => {
          const row = `${i + 1}  | ${g.date} | ${(g.student_name || '').padEnd(15)} | ${(g.subject || '').padEnd(12)} | ${g.grade}     | ${(g.comment || '-').substring(0, 30)}`;
          doc.text(row);
        });

        doc.moveDown(2);
        const avg = grades.reduce((a, b) => a + b.grade, 0) / grades.length;
        doc.fontSize(12).text(`Средний балл: ${avg.toFixed(2)}`);
        doc.text(`Всего оценок: ${grades.length}`);
      }

      doc.end();
    });
  }

  generateExcel(grades) {
    const data = grades.map((g) => ({
      Дата: g.date,
      Ученик: g.student_name,
      Предмет: g.subject,
      Оценка: g.grade,
      Комментарий: g.comment || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оценки');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = ReportService;
