const { ERR } = require('../config/constants');

async function resolveClass(service, user) {
  const classId = await service.getClassForUser(user);
  if (!classId) throw Object.assign(new Error('Класс не найден'), { status: 400, code: ERR.NO_CLASS });
  return classId;
}

module.exports = resolveClass;
