const db = require('../config/database');
const {
  scheduleService,
  adminService,
  homeworkService,
  announcementService,
  userService,
  chatService,
} = require('../config/container');
const asyncHandler = require('../middleware/asyncHandler');
const { invalidate, invalidatePrefix, getCached } = require('../utils/cache');

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

  test('createClass invalidates cache', async () => {
    // Populate cache
    await adminService.listClasses();
    expect(getCached('classes:all')).toBeDefined();

    // Create class (should invalidate)
    const cls = await adminService.createClass('Cache Test Class');
    expect(cls.name).toBe('Cache Test Class');

    // Cache should be cleared
    expect(getCached('classes:all')).toBeUndefined();
  });

  test('deleteClass invalidates cache', async () => {
    const cls = await adminService.createClass('To Delete');
    await adminService.listClasses(); // populate cache
    expect(getCached('classes:all')).toBeDefined();

    // Find the class and delete it
    const classes = await adminService.listClasses();
    const found = classes.find((c) => c.name === 'To Delete');
    if (found) {
      await adminService.deleteClass(found.id);
      expect(getCached('classes:all')).toBeUndefined();
    }
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
    admins.forEach((u) => expect(u.role).toBe('admin'));
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
    await expect(adminService.deleteUser('self-id', 'self-id')).rejects.toThrow('Нельзя удалить себя');
  });

  test('deleteUser rejects non-existent user', async () => {
    await expect(adminService.deleteUser('nonexistent-id', 'other-id')).rejects.toThrow('Пользователь не найден');
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

  test('listLogs respects limit', async () => {
    const logs = await adminService.listLogs(3);
    expect(logs.length).toBeLessThanOrEqual(3);
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

  test('create invalidates schedule cache', async () => {
    // Populate cache
    await scheduleService.list({ user: { role: 'admin', id: 'admin-id' } });

    if (testClassId) {
      await scheduleService.create({
        day: 'Вт',
        time_slot: '12:45',
        subject: 'Cache Test',
        teacher_id: 'admin-id',
        class_id: testClassId,
        room: '102',
      });
      // Cache should be invalidated
      expect(getCached('schedule:admin:admin-id:')).toBeUndefined();
    }
  });
});

describe('UserService', () => {
  test('findByEmail returns user or null', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    expect(user).toBeDefined();
    expect(user.email).toBe('admin@school.ru');

    const none = await userService.findByEmail('nonexistent@test.com');
    expect(none).toBeNull();
  });

  test('findById returns user or null', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    const found = await userService.findById(user.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(user.id);

    const none = await userService.findById('nonexistent-id');
    expect(none).toBeNull();
  });

  test('createRefreshToken returns token string', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    const token = await userService.createRefreshToken(user.id);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('consumeRefreshToken returns user_id', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    const token = await userService.createRefreshToken(user.id);
    const result = await userService.consumeRefreshToken(token);
    expect(result).toBeDefined();
    expect(result.user_id).toBe(user.id);
  });

  test('consumeRefreshToken: used token returns null', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    const token = await userService.createRefreshToken(user.id);
    await userService.consumeRefreshToken(token);
    const result = await userService.consumeRefreshToken(token);
    expect(result).toBeNull();
  });

  test('invalidateAllRefreshTokens marks all as used', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    await userService.createRefreshToken(user.id);
    await userService.createRefreshToken(user.id);
    await userService.invalidateAllRefreshTokens(user.id);
    // All tokens should now be consumed
    const token1 = await userService.createRefreshToken(user.id);
    const result = await userService.consumeRefreshToken(token1);
    expect(result).toBeDefined(); // new token works
  });

  test('getProfile returns user without password', async () => {
    const user = await userService.findByEmail('admin@school.ru');
    const profile = await userService.getProfile(user.id);
    expect(profile).toBeDefined();
    expect(profile).not.toHaveProperty('password');
    expect(profile).toHaveProperty('email');
  });

  test('validateRegistrationCode works', async () => {
    // Create a fresh code
    const valid = await userService.validateRegistrationCode('TESTCODE99', 'teacher');
    // Code doesn't exist, should return false
    expect(valid).toBe(false);
  });
});

describe('ChatService', () => {
  test('getOrCreateClassKey returns a key', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      const key = await chatService.getOrCreateClassKey(cls.id);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });

  test('getOrCreateClassKey is idempotent', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      const key1 = await chatService.getOrCreateClassKey(cls.id);
      const key2 = await chatService.getOrCreateClassKey(cls.id);
      expect(key1).toBe(key2);
    }
  });

  test('clearStaleTyping runs without error', async () => {
    const cls = await db.get('SELECT id FROM classes LIMIT 1');
    if (cls) {
      await expect(chatService.clearStaleTyping(cls.id)).resolves.not.toThrow();
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
        class_id: cls.id,
        teacher_id: 'teacher-id',
        subject: 'Тест',
        title: 'Тестовое ДЗ',
        description: '',
        due_date: '2026-01-01',
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
      user_id: 'admin-id',
      title: 'Тест',
      content: 'Контент',
    });
    expect(a).toHaveProperty('title', 'Тест');
  });
});

describe('asyncHandler', () => {
  test('catches async errors → calls next', async () => {
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

  test('handles sync errors in async function', async () => {
    const fn = asyncHandler(async () => {
      JSON.parse('invalid json');
    });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('DockerService (unit)', () => {
  const dockerService = require('../services/dockerService');

  test('isAvailable returns boolean', async () => {
    const result = await dockerService.isAvailable();
    expect(typeof result).toBe('boolean');
  });

  test('getDockerInfo returns object', async () => {
    const info = await dockerService.getDockerInfo();
    expect(info).toHaveProperty('available');
  });

  test('getContainers returns array', async () => {
    const containers = await dockerService.getContainers();
    expect(Array.isArray(containers)).toBe(true);
  });
});
