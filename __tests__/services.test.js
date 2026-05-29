const db = require('../config/database');
const { cryptoService, notificationService, gradeService } = require('../config/container');
const { getCached, setCache, invalidate, invalidatePrefix, TTL } = require('../utils/cache');

describe('CryptoService', () => {
  const testKey = cryptoService.generateKey();

  test('generateKey returns 64-char hex string', () => {
    const key = cryptoService.generateKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  test('different keys are unique', () => {
    const k1 = cryptoService.generateKey();
    const k2 = cryptoService.generateKey();
    expect(k1).not.toBe(k2);
  });

  test('encrypt and decrypt roundtrip', () => {
    const plaintext = 'Hello, World!';
    const encrypted = cryptoService.encrypt(plaintext, testKey);
    expect(encrypted).toContain(':');
    const decrypted = cryptoService.decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  test('decrypt with wrong key → error message', () => {
    const encrypted = cryptoService.encrypt('Secret', testKey);
    const result = cryptoService.decrypt(encrypted, cryptoService.generateKey());
    expect(result).toBe('[Ошибка расшифровки]');
  });

  test('decrypt invalid format → error message', () => {
    const result = cryptoService.decrypt('invalid', testKey);
    expect(result).toBe('[Ошибка расшифровки]');
  });

  test('hash produces consistent output', () => {
    expect(cryptoService.hash('test')).toBe(cryptoService.hash('test'));
    expect(cryptoService.hash('test')).toMatch(/^[0-9a-f]{64}$/);
  });

  test('different inputs produce different hashes', () => {
    expect(cryptoService.hash('test1')).not.toBe(cryptoService.hash('test2'));
  });

  test('empty string encryption works', () => {
    const encrypted = cryptoService.encrypt('', testKey);
    const decrypted = cryptoService.decrypt(encrypted, testKey);
    expect(decrypted).toBe('');
  });

  test('unicode encryption works', () => {
    const text = 'Привет мир! 🎉';
    const encrypted = cryptoService.encrypt(text, testKey);
    const decrypted = cryptoService.decrypt(encrypted, testKey);
    expect(decrypted).toBe(text);
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
      user_id: testUserId, title: 'Test', message: 'Test message',
    });
    expect(result).toHaveProperty('user_id', testUserId);
    expect(result).toHaveProperty('title', 'Test');
  });

  test('list notifications', async () => {
    const notifs = await notificationService.list(testUserId, 5);
    expect(Array.isArray(notifs)).toBe(true);
    expect(notifs.length).toBeGreaterThan(0);
  });

  test('mark as read → unread count becomes 0', async () => {
    await notificationService.markAsRead(testUserId);
    const count = await notificationService.getUnreadCount(testUserId);
    expect(count).toBe(0);
  });

  test('getUnreadCount returns number', async () => {
    const count = await notificationService.getUnreadCount(testUserId);
    expect(typeof count).toBe('number');
  });

  test('create multiple and list respects limit', async () => {
    for (let i = 0; i < 3; i++) {
      await notificationService.create({ user_id: testUserId, title: `Test ${i}`, message: `Msg ${i}` });
    }
    const notifs = await notificationService.list(testUserId, 2);
    expect(notifs.length).toBeLessThanOrEqual(2);
  });
});

describe('GradeService', () => {
  let testStudentId, testClassId;

  beforeAll(async () => {
    const student = await db.get("SELECT id, class_id FROM users WHERE role = 'student' LIMIT 1");
    testStudentId = student?.id;
    testClassId = student?.class_id;
  });

  test('getStats returns distribution via SQL', async () => {
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

describe('Cache utility', () => {
  beforeEach(() => { invalidatePrefix('test:'); });

  test('set and get cached value', () => {
    setCache('test:1', { a: 1 }, 5000);
    expect(getCached('test:1')).toEqual({ a: 1 });
  });

  test('expired cache returns undefined', () => {
    setCache('test:2', 'value', -1);
    expect(getCached('test:2')).toBeUndefined();
  });

  test('invalidate removes entry', () => {
    setCache('test:3', 'value', 5000);
    expect(getCached('test:3')).toBe('value');
    invalidate('test:3');
    expect(getCached('test:3')).toBeUndefined();
  });

  test('invalidatePrefix removes matching entries', () => {
    setCache('test:pfx:a', 1, 5000);
    setCache('test:pfx:b', 2, 5000);
    setCache('other:key', 3, 5000);
    invalidatePrefix('test:pfx:');
    expect(getCached('test:pfx:a')).toBeUndefined();
    expect(getCached('test:pfx:b')).toBeUndefined();
    expect(getCached('other:key')).toBe(3);
  });

  test('TTL constants are defined', () => {
    expect(TTL.CLASSES).toBeGreaterThan(0);
    expect(TTL.SCHEDULE).toBeGreaterThan(0);
    expect(TTL.ANNOUNCEMENTS).toBeGreaterThan(0);
  });
});
