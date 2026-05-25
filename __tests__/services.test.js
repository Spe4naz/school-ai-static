process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';

const db = require('../config/database');
const { cryptoService, notificationService, gradeService } = require('../config/container');

beforeAll(async () => {
  await db.init();
}, 30000);

afterAll(async () => {
  await db.close();
});

describe('CryptoService', () => {
  const testKey = cryptoService.generateKey();

  test('generateKey returns 64-char hex string', () => {
    const key = cryptoService.generateKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  test('encrypt and decrypt roundtrip', () => {
    const plaintext = 'Hello, World!';
    const encrypted = cryptoService.encrypt(plaintext, testKey);
    expect(encrypted).toContain(':');

    const decrypted = cryptoService.decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  test('decrypt with wrong key returns error message', () => {
    const plaintext = 'Secret';
    const wrongKey = cryptoService.generateKey();
    const encrypted = cryptoService.encrypt(plaintext, testKey);

    const decrypted = cryptoService.decrypt(encrypted, wrongKey);
    expect(decrypted).toBe('[Ошибка расшифровки]');
  });

  test('decrypt invalid format returns error message', () => {
    const result = cryptoService.decrypt('invalid', testKey);
    expect(result).toBe('[Ошибка расшифровки]');
  });

  test('hash produces consistent output', () => {
    const hash1 = cryptoService.hash('test');
    const hash2 = cryptoService.hash('test');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  test('different inputs produce different hashes', () => {
    const hash1 = cryptoService.hash('test1');
    const hash2 = cryptoService.hash('test2');
    expect(hash1).not.toBe(hash2);
  });
});

describe('NotificationService', () => {
  let testUserId;

  beforeAll(async () => {
    const user = await db.get("SELECT id FROM users WHERE role = 'student' LIMIT 1");
    testUserId = user?.id;
  });

  test('create notification', async () => {
    const result = await notificationService.create({
      user_id: testUserId,
      title: 'Test',
      message: 'Test message',
    });

    expect(result).toHaveProperty('user_id', testUserId);
    expect(result).toHaveProperty('title', 'Test');
  });

  test('list notifications', async () => {
    const notifs = await notificationService.list(testUserId, 5);
    expect(Array.isArray(notifs)).toBe(true);
  });

  test('mark as read', async () => {
    await notificationService.markAsRead(testUserId);
    const count = await notificationService.getUnreadCount(testUserId);
    expect(count).toBe(0);
  });

  test('getUnreadCount returns number', async () => {
    const count = await notificationService.getUnreadCount(testUserId);
    expect(typeof count).toBe('number');
  });
});

describe('GradeService', () => {
  let testStudentId, testClassId;

  beforeAll(async () => {
    const student = await db.get("SELECT id, class_id FROM users WHERE role = 'student' LIMIT 1");
    testStudentId = student?.id;
    testClassId = student?.class_id;
  });

  test('getStats returns distribution in single pass', async () => {
    const stats = await gradeService.getStats(testClassId);
    expect(stats).toHaveProperty('average');
    expect(stats).toHaveProperty('count');
    expect(stats).toHaveProperty('distribution');
    expect(stats.distribution).toHaveProperty('5');
    expect(stats.distribution).toHaveProperty('4');
    expect(stats.distribution).toHaveProperty('3');
    expect(stats.distribution).toHaveProperty('2');

    const distSum = stats.distribution[5] + stats.distribution[4] + stats.distribution[3] + stats.distribution[2];
    expect(distSum).toBe(stats.count);
  });

  test('getStats returns null average for empty class', async () => {
    const stats = await gradeService.getStats('nonexistent-class-id');
    expect(stats.average).toBeNull();
    expect(stats.count).toBe(0);
  });

  test('getProgress returns array', async () => {
    const progress = await gradeService.getProgress(testStudentId, 'all', 'month');
    expect(Array.isArray(progress)).toBe(true);
  });

  test('getSubjects returns array', async () => {
    const subjects = await gradeService.getSubjects(testStudentId);
    expect(Array.isArray(subjects)).toBe(true);
  });
});
