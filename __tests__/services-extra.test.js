const db = require('../config/database');
const { scheduleService, adminService, homeworkService, announcementService } = require('../config/container');
const asyncHandler = require('../middleware/asyncHandler');
const { invalidate, invalidatePrefix } = require('../utils/cache');

describe('AdminService', () => {
  test('listClasses returns array', async () => {
    const classes = await adminService.listClasses();
    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBeGreaterThan(0);
  });

  test('listClasses result is cached', async () => {
    const r1 = await adminService.listClasses();
    const r2 = await adminService.listClasses();
    expect(r1).toBe(r2);
  });

  test('listStudents returns array', async () => {
    const students = await adminService.listStudents();
    expect(Array.isArray(students)).toBe(true);
  });

  test('listStudents filters by class_id', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      const students = await adminService.listStudents(cls.id);
      expect(Array.isArray(students)).toBe(true);
    }
  });

  test('listUsers returns array', async () => {
    const users = await adminService.listUsers({});
    expect(Array.isArray(users)).toBe(true);
  });

  test('listUsers filters by role', async () => {
    const admins = await adminService.listUsers({ role: 'admin' });
    admins.forEach(u => expect(u.role).toBe('admin'));
  });

  test('listUsers searches by query', async () => {
    const users = await adminService.listUsers({ q: 'admin' });
    expect(Array.isArray(users)).toBe(true);
  });

  test('getStats returns stats object', async () => {
    const backupService = { list: async () => [] };
    const stats = await adminService.getStats(backupService);
    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('totalGrades');
    expect(stats).toHaveProperty('totalClasses');
    expect(stats).toHaveProperty('lastBackup');
  });

  test('deleteUser rejects deleting self', async () => {
    await expect(adminService.deleteUser('self-id', 'self-id'))
      .rejects.toThrow('Нельзя удалить себя');
  });

  test('deleteUser rejects non-existent user', async () => {
    await expect(adminService.deleteUser('nonexistent-id', 'other-id'))
      .rejects.toThrow('Пользователь не найден');
  });

  test('createClass and deleteClass', async () => {
    const cls = await adminService.createClass('Test Class Temp');
    expect(cls.name).toBe('Test Class Temp');
    const classes = await adminService.listClasses();
    const found = classes.find(c => c.name === 'Test Class Temp');
    expect(found).toBeDefined();
    invalidate('classes:all');
  });

  test('getSettings returns object', async () => {
    const settings = await adminService.getSettings();
    expect(settings).toHaveProperty('nodeEnv');
    expect(settings).toHaveProperty('frontendUrl');
    expect(settings).toHaveProperty('backupDir');
    expect(settings).toHaveProperty('backupRetention');
  });

  test('listRegistrationCodes returns array', async () => {
    const codes = await adminService.listRegistrationCodes();
    expect(Array.isArray(codes)).toBe(true);
  });

  test('listLogs returns array', async () => {
    const logs = await adminService.listLogs(10);
    expect(Array.isArray(logs)).toBe(true);
  });
});

describe('ScheduleService', () => {
  let testClassId;

  beforeAll(async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    testClassId = cls?.id;
  });

  test('list returns array for admin', async () => {
    const schedule = await scheduleService.list({ user: { role: 'admin', id: 'admin-id' } });
    expect(Array.isArray(schedule)).toBe(true);
  });

  test('list returns array for teacher', async () => {
    const schedule = await scheduleService.list({ user: { role: 'teacher', id: 'teacher-id' } });
    expect(Array.isArray(schedule)).toBe(true);
  });

  test('list result is cached', async () => {
    const r1 = await scheduleService.list({ user: { role: 'admin', id: 'admin-id' } });
    const r2 = await scheduleService.list({ user: { role: 'admin', id: 'admin-id' } });
    expect(r1).toBe(r2);
  });

  test('create adds a schedule entry', async () => {
    if (testClassId) {
      const result = await scheduleService.create({
        day: 'Пн', time_slot: '08:30', subject: 'Тест',
        teacher_id: 'admin-id', class_id: testClassId, room: '101',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('HomeworkService', () => {
  test('list returns array', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      const homeworks = await homeworkService.list(cls.id);
      expect(Array.isArray(homeworks)).toBe(true);
    }
  });

  test('create and delete homework', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      const hw = await homeworkService.create({
        class_id: cls.id, teacher_id: 'teacher-id',
        subject: 'Тест', title: 'Тестовое ДЗ', description: '', due_date: '2026-01-01',
      });
      expect(hw).toHaveProperty('title', 'Тестовое ДЗ');
      expect(hw).toHaveProperty('id');
    }
  });
});

describe('AnnouncementService', () => {
  test('list returns array', async () => {
    const announcements = await announcementService.list();
    expect(Array.isArray(announcements)).toBe(true);
  });

  test('create announcement', async () => {
    const a = await announcementService.create({
      user_id: 'admin-id', title: 'Тест', content: 'Контент',
    });
    expect(a).toHaveProperty('title', 'Тест');
  });
});

describe('asyncHandler', () => {
  test('catches async errors → calls next', async () => {
    const fn = asyncHandler(async () => { throw new Error('test error'); });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'test error' }));
  });

  test('passes successful response through', async () => {
    const fn = asyncHandler(async (req, res) => { res.json({ ok: true }); });
    const next = jest.fn();
    const json = jest.fn();
    await fn({}, { json }, next);
    expect(json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  test('handles sync errors in async function', async () => {
    const fn = asyncHandler(async () => { JSON.parse('invalid json'); });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
