const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { reportService } = require('../config/container');
const { ERR } = require('../config/constants');

router.use(auth, roles('teacher', 'admin'), logger);

router.get('/export', asyncHandler(async (req, res) => {
  const { type, class_id, period } = req.query;
  if (!type || !['pdf', 'excel'].includes(type)) {
    return res.status(400).json({ error: 'Укажите тип: pdf или excel', code: ERR.INVALID_TYPE });
  }

  const grades = await reportService.getGradesForReport(class_id, period);

  let className = 'Все классы';
  if (class_id) {
    const db = reportService.db;
    const cls = await db.get('SELECT name FROM classes WHERE id = $1', [class_id]);
    className = cls?.name || class_id;
  }

  if (type === 'pdf') {
    const pdfBuffer = await reportService.generatePDF(grades, className);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=otchet-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } else {
    const excelBuffer = reportService.generateExcel(grades);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=otchet-${Date.now()}.xlsx`);
    res.send(excelBuffer);
  }
}));

module.exports = router;
