const db = require('../config/database');
const { scheduleService, adminService } = require('../config/container');
const asyncHandler = require('../middleware/asyncHandler');

describe('AdminService', () => {
  test('listClasses returns array', async () => {
    const classes = await adminService.listClasses();
    expect(Array.isArray(classes)).toBe(true);
  });

  test('listStudents returns array', async () => {
    const students = await adminService.listStudents();
    expect(Array.isArray(students)).toBe(true);
  });

  test('listUsers returns array', async () => {
    const users = await adminService.listUsers({});
    expect(Array.isArray(users)).toBe(true);
  });

  test('listUsers filters by role', async () => {
    const admins = await adminService.listUsers({ role: 'admin' });
    admins.forEach(u => expect(u.role).toBe('admin'));
  });

  test('getStats returns stats object', async () => {
    const backupService = { list: async () => [] };
    const stats = await adminService.getStats(backupService);
    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('totalGrades');
    expect(stats).toHaveProperty('totalClasses');
  });

  test('deleteUser rejects deleting self', async () => {
    await expect(adminService.deleteUser('self-id', 'self-id'))
      .rejects.toThrow('Нельзя удалить себя');
  });
});

describe('ScheduleService', () => {
  let testClassId;

  beforeAll(async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    testClassId = cls?.id;
  });

  test('list returns array for admin', async () => {
    const schedule = await scheduleService.list({
      user: { role: 'admin' },
    });
    expect(Array.isArray(schedule)).toBe(true);
  });

  test('list returns array for student with class_id', async () => {
    if (testClassId) {
      const schedule = await scheduleService.list({
        user: { role: 'student', id: 'does-not-exist', class_id: testClassId },
      });
      expect(Array.isArray(schedule)).toBe(true);
    }
  });

  test('create adds a schedule entry', async () => {
    if (testClassId) {
      const result = await scheduleService.create({
        day: 'Пн',
        time_slot: '08:30',
        subject: 'Тест',
        teacher_id: 'admin-id',
        class_id: testClassId,
        room: '101',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('asyncHandler', () => {
  test('catches errors and passes to next', async () => {
    const fn = asyncHandler(async () => {
      throw new Error('test error');
    });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'test error' }));
  });

  test('passes successful response through', async () => {
    const fn = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });
    const next = jest.fn();
    const json = jest.fn();
    await fn({}, { json }, next);
    expect(json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
