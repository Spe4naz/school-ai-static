const { ERR } = require('../config/constants');

module.exports = (req, res, next) => {
  if (req.user.role === 'student') {
    req.studentId = req.user.id;
    return next();
  }

  if (req.user.role === 'parent') {
    if (!req.user.linked_student_id) {
      return res.status(400).json({ error: 'Родитель не привязан к ученику', code: ERR.STUDENT_NOT_FOUND });
    }
    req.studentId = req.user.linked_student_id;
    return next();
  }

  return res.status(403).json({ error: 'Доступ только для учеников и родителей', code: ERR.FORBIDDEN });
};
