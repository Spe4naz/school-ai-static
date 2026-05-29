const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  HEAD_TEACHER: 'head_teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  ALL: ['admin', 'teacher', 'head_teacher', 'student', 'parent'],
  REGISTRABLE: ['student', 'parent', 'teacher', 'head_teacher'],
});

const ERR = Object.freeze({
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_ROLE: 'INVALID_ROLE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  MISSING_CLASS: 'MISSING_CLASS',
  MISSING_EMAIL: 'MISSING_EMAIL',
  INVALID_TOKEN: 'INVALID_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INVALID_GRADE: 'INVALID_GRADE',
  INVALID_TYPE: 'INVALID_TYPE',
  NO_CLASS: 'NO_CLASS',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  MISSING_NAME: 'MISSING_NAME',
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DAYS = Object.freeze(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']);

const SUBJECTS = Object.freeze([
  'Математика',
  'Русский язык',
  'Английский язык',
  'Окружающий мир',
  'Физкультура',
  'Музыка',
  'ИЗО',
  'Информатика',
]);

const LIMITS = Object.freeze({
  CHAT_MESSAGES: 50,
  NOTIFICATIONS: 20,
  ADMIN_LOGS: 50,
  CHAT_POLL_MS: 5000,
  GRADE_MIN: 2,
  GRADE_MAX: 5,
  CHAT_TYPING_TIMEOUT_MS: 10000,
  CHAT_TYPING_STALE_THRESHOLD_MS: 15000,
  CHAT_TYPING_DEBOUNCE_MS: 500,
});

module.exports = { ROLES, ERR, EMAIL_REGEX, DAYS, SUBJECTS, LIMITS };
