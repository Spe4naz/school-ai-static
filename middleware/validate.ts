const { z } = require('zod');
const { ERR, ROLES } = require('../config/constants');

const emailSchema = z.string().email('Неверный формат email').max(255).transform(v => v.trim().toLowerCase());
const passwordSchema = z.string().min(8, 'Пароль должен быть минимум 8 символов').max(128, 'Пароль слишком длинный')
  .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру');
const nameSchema = z.string().min(1).max(100).transform(v => v.replace(/[<>]/g, '').trim());
const uuidSchema = z.string().uuid('Неверный формат ID');
const roleSchema = z.enum(ROLES.ALL).optional();
const registrableRoleSchema = z.enum(ROLES.REGISTRABLE);
const classIdSchema = z.string().min(1).optional();
const studentEmailSchema = z.string().email().optional();
const codeSchema = z.string().min(1, 'Требуется код регистрации').optional();
const gradeSchema = z.coerce.number().int().min(2).max(5);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Email и пароль обязательны'),
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: registrableRoleSchema,
  class_id: classIdSchema,
  student_email: studentEmailSchema,
  code: codeSchema,
});

const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema,
  class_id: classIdSchema,
});

const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: roleSchema,
  class_id: classIdSchema,
});

const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

const passwordResetConfirmSchema = z.object({
  id: z.string().min(1),
  email: emailSchema,
  newPassword: passwordSchema,
});

const createGradeSchema = z.object({
  student_id: z.string().min(1),
  subject: z.string().min(1).max(100),
  grade: gradeSchema,
  comment: z.string().max(500).optional().default(''),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      const code = mapErrorCode(first);
      return res.status(400).json({ error: first.message, code, path: first.path });
    }
    req.body = result.data;
    next();
  };
}

function validateParams(paramName, schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params[paramName]);
    if (!result.success) {
      return res.status(400).json({ error: 'Неверный формат параметра', code: ERR.VALIDATION_ERROR });
    }
    next();
  };
}

function mapErrorCode(err) {
  const path = err.path || [];
  const pathStr = path.join('.');
  const isMissing = err.message.includes('Required') || err.code === 'invalid_type';

  if (isMissing) return ERR.MISSING_FIELDS;
  if (pathStr.includes('email')) return ERR.INVALID_EMAIL;
  if (pathStr.includes('password')) return ERR.WEAK_PASSWORD;
  if (pathStr.includes('role')) return ERR.INVALID_ROLE;
  if (pathStr.includes('grade')) return ERR.INVALID_GRADE;
  return ERR.VALIDATION_ERROR;
}

module.exports = {
  validate,
  validateParams,
  uuidSchema,
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  createGradeSchema,
};
