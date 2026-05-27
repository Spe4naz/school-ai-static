const { z } = require('zod');
const { ERR, ROLES } = require('../config/constants');

const emailSchema = z.string().email('Неверный формат email').max(255).transform(v => v.trim().toLowerCase());
const passwordSchema = z.string().min(6, 'Пароль должен быть минимум 6 символов').max(128, 'Пароль слишком длинный');
const nameSchema = z.string().min(1).max(100).transform(v => v.replace(/[<>]/g, '').trim());
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
      const first = result.error.errors[0];
      const code = mapErrorCode(first);
      return res.status(400).json({ error: first.message, code, path: first.path });
    }
    req.body = result.data;
    next();
  };
}

function mapErrorCode(err) {
  if (err.path.includes('email')) return ERR.INVALID_EMAIL;
  if (err.path.includes('password')) return ERR.WEAK_PASSWORD;
  if (err.path.includes('role')) return ERR.INVALID_ROLE;
  if (err.message.includes('Required')) return ERR.MISSING_FIELDS;
  if (err.message.includes('grade')) return ERR.INVALID_GRADE;
  return ERR.VALIDATION_ERROR;
}

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  createGradeSchema,
};
