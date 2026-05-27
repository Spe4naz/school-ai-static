const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { z } = require('zod');
const { userService, adminService, backupService } = require('../config/container');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { validate, createUserSchema, updateUserSchema } = require('../middleware/validate');
const { ERR, LIMITS } = require('../config/constants');

router.use(auth, logger);

const classNameSchema = z.object({ name: z.string().min(1, 'name обязателен').max(100) });
const registrationCodeSchema = z.object({
  code: z.string().min(1, 'code обязателен').max(50),
  role: z.enum(['teacher', 'head_teacher'], { message: 'role должен быть teacher или head_teacher' }),
});

// ---- Classes ----
router.get('/classes', asyncHandler(async (req, res) => {
  const classes = await adminService.listClasses();
  res.json(classes);
}));

router.post('/classes', roles('admin'), validate(classNameSchema), asyncHandler(async (req, res) => {
  const cls = await adminService.createClass(req.body.name);
  res.status(201).json({ success: true, class: cls });
}));

router.put('/classes/:id', roles('admin'), validate(classNameSchema), asyncHandler(async (req, res) => {
  const cls = await adminService.updateClass(req.params.id, req.body.name);
  res.json({ success: true, class: cls });
}));

router.delete('/classes/:id', roles('admin'), asyncHandler(async (req, res) => {
  const result = await adminService.deleteClass(req.params.id);
  res.json(result);
}));

// ---- Students ----
router.get('/students', asyncHandler(async (req, res) => {
  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Доступ запрещён', code: ERR.FORBIDDEN });
  }
  const students = await adminService.listStudents(req.query.class_id);
  res.json(students);
}));

// ---- Logs ----
router.get('/logs', roles('admin'), asyncHandler(async (req, res) => {
  const logs = await adminService.listLogs(parseInt(req.query.limit) || LIMITS.ADMIN_LOGS);
  res.json(logs);
}));

// ---- Stats ----
router.get('/stats', roles('admin'), asyncHandler(async (req, res) => {
  const stats = await adminService.getStats(backupService);
  res.json(stats);
}));

// ---- Users ----
router.post(
  '/users',
  roles('admin'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role, class_id } = req.body;
    const newUser = await userService.create({
      email,
      password,
      name,
      role,
      class_id: role === 'student' ? class_id || null : null,
      linked_student_id: null,
    });
    res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } });
  }),
);

router.get('/users', roles('admin'), asyncHandler(async (req, res) => {
  const users = await adminService.listUsers({ role: req.query.role, class_id: req.query.class_id, q: req.query.q });
  res.json(users);
}));

router.get('/users/:id', roles('admin'), asyncHandler(async (req, res) => {
  const user = await adminService.getUser(req.params.id);
  res.json(user);
}));

router.put('/users/:id', roles('admin'), validate(updateUserSchema), asyncHandler(async (req, res) => {
  const result = await adminService.updateUser(req.params.id, req.body);
  res.json({ success: true, user: result });
}));

router.delete('/users/:id', roles('admin'), asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.params.id, req.user.id);
  res.json(result);
}));

// ---- Registration Codes ----
router.get('/registration-codes', roles('admin'), asyncHandler(async (req, res) => {
  const codes = await adminService.listRegistrationCodes();
  res.json(codes);
}));

router.post('/registration-codes', roles('admin'), validate(registrationCodeSchema), asyncHandler(async (req, res) => {
  const result = await adminService.createRegistrationCode(req.body.code.toUpperCase(), req.body.role);
  res.status(201).json({ success: true, code: result });
}));

router.delete('/registration-codes/:code', roles('admin'), asyncHandler(async (req, res) => {
  const result = await adminService.deleteRegistrationCode(req.params.code);
  res.json(result);
}));

// ---- Backups ----
router.get('/backups', roles('admin'), asyncHandler(async (req, res) => {
  const backups = await backupService.list();
  res.json(backups);
}));

router.post('/backups', roles('admin'), asyncHandler(async (req, res) => {
  const backupPath = await backupService.create();
  res.json({ success: true, path: backupPath });
}));

router.get('/backups/:name/download', roles('admin'), asyncHandler(async (req, res) => {
  if (req.params.name.includes('..')) {
    return res.status(400).json({ error: 'Invalid backup name', code: ERR.INVALID_INPUT });
  }
  const filePath = backupService.getPath(req.params.name);
  res.download(filePath);
}));

router.delete('/backups/:name', roles('admin'), asyncHandler(async (req, res) => {
  if (req.params.name.includes('..')) {
    return res.status(400).json({ error: 'Invalid backup name', code: ERR.INVALID_INPUT });
  }
  const result = await backupService.remove(req.params.name);
  res.json(result);
}));

// ---- Settings ----
router.get('/settings', roles('admin'), asyncHandler(async (req, res) => {
  const settings = await adminService.getSettings();
  res.json(settings);
}));

module.exports = router;
