const { ERR } = require('../config/constants');
const AppError = require('./AppError');

async function resolveClass(service, user) {
  const classId = await service.getClassForUser(user);
  if (!classId) throw new AppError(400, ERR.NO_CLASS, 'Класс не найден');
  return classId;
}

module.exports = resolveClass;
