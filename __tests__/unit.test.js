const AppError = require('../utils/AppError');
const BackupService = require('../services/backupService');
const { getCached, setCache, invalidate, invalidatePrefix, TTL } = require('../utils/cache');
const dockerService = require('../services/dockerService');

describe('AppError', () => {
  test('creates error with status and code', () => {
    const err = new AppError(400, 'TEST_ERROR', 'Test message');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('Test message');
  });

  test('instanceof Error works', () => {
    const err = new AppError(500, 'INTERNAL', 'Internal');
    expect(err instanceof Error).toBe(true);
  });

  test('stack trace is captured', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Not found');
    expect(err.stack).toBeDefined();
  });

  test('multiple instances are independent', () => {
    const e1 = new AppError(400, 'ERR1', 'msg1');
    const e2 = new AppError(500, 'ERR2', 'msg2');
    expect(e1.status).not.toBe(e2.status);
    expect(e1.code).not.toBe(e2.code);
  });

  test('can throw and catch', () => {
    expect(() => {
      throw new AppError(422, 'VALIDATION', 'Bad input');
    }).toThrow('Bad input');
  });

  test('error has correct name', () => {
    const err = new AppError(400, 'TEST', 'msg');
    expect(err.name).toBe('Error');
  });
});

describe('BackupService', () => {
  test('constructor sets backupDir and retentionDays', () => {
    const svc = new BackupService('./test-backups', 14);
    expect(svc.backupDir).toContain('test-backups');
    expect(svc.retentionDays).toBe(14);
  });

  test('default retention is 7 days', () => {
    const svc = new BackupService();
    expect(svc.retentionDays).toBe(7);
  });

  test('default backupDir contains "backups"', () => {
    const svc = new BackupService();
    expect(svc.backupDir).toContain('backups');
  });

  test('_safePath rejects path traversal with ..', () => {
    const svc = new BackupService();
    expect(() => svc._safePath('../../etc/passwd')).toThrow();
  });

  test('_safePath rejects path traversal with /', () => {
    const svc = new BackupService();
    expect(() => svc._safePath('/etc/passwd')).toThrow();
  });

  test('_safePath rejects path traversal with \\', () => {
    const svc = new BackupService();
    expect(() => svc._safePath('..\\..\\windows\\system32')).toThrow();
  });

  test('_safePath rejects null bytes', () => {
    const svc = new BackupService();
    expect(() => svc._safePath('backup\x00.sql')).toThrow();
  });

  test('_safePath accepts valid filename', () => {
    const svc = new BackupService();
    const result = svc._safePath('backup_2024.sql');
    expect(result).toContain('backup_2024.sql');
  });

  test('_safePath accepts filename with underscores', () => {
    const svc = new BackupService();
    const result = svc._safePath('backup_2024-01-15.sql');
    expect(result).toContain('backup_2024-01-15.sql');
  });
});

describe('Cache utility (comprehensive)', () => {
  beforeEach(() => {
    invalidatePrefix('test:');
  });

  test('setCache and getCached', () => {
    setCache('test:a', 'value', 5000);
    expect(getCached('test:a')).toBe('value');
  });

  test('getCached returns undefined for missing key', () => {
    expect(getCached('test:missing')).toBeUndefined();
  });

  test('expired entry returns undefined', () => {
    setCache('test:exp', 'val', -1);
    expect(getCached('test:exp')).toBeUndefined();
  });

  test('invalidate removes specific key', () => {
    setCache('test:inv', 42, 5000);
    invalidate('test:inv');
    expect(getCached('test:inv')).toBeUndefined();
  });

  test('invalidate non-existent key does not throw', () => {
    expect(() => invalidate('test:nonexistent')).not.toThrow();
  });

  test('invalidatePrefix removes all matching', () => {
    setCache('test:px:1', 1, 5000);
    setCache('test:px:2', 2, 5000);
    setCache('other:px:1', 3, 5000);
    invalidatePrefix('test:px:');
    expect(getCached('test:px:1')).toBeUndefined();
    expect(getCached('test:px:2')).toBeUndefined();
    expect(getCached('other:px:1')).toBe(3);
  });

  test('TTL values are reasonable', () => {
    expect(TTL.CLASSES).toBe(5 * 60 * 1000);
    expect(TTL.SCHEDULE).toBe(2 * 60 * 1000);
    expect(TTL.ANNOUNCEMENTS).toBe(60 * 1000);
    expect(TTL.USERS).toBe(2 * 60 * 1000);
  });

  test('cache handles complex objects', () => {
    const obj = { nested: { arr: [1, 2, 3] } };
    setCache('test:obj', obj, 5000);
    expect(getCached('test:obj')).toEqual(obj);
  });

  test('cache overwrites existing key', () => {
    setCache('test:ow', 'old', 5000);
    setCache('test:ow', 'new', 5000);
    expect(getCached('test:ow')).toBe('new');
  });

  test('cache handles null value', () => {
    setCache('test:null', null, 5000);
    expect(getCached('test:null')).toBeNull();
  });

  test('cache handles undefined value', () => {
    setCache('test:undef', undefined, 5000);
    expect(getCached('test:undef')).toBeUndefined();
  });

  test('cache handles empty string', () => {
    setCache('test:empty', '', 5000);
    expect(getCached('test:empty')).toBe('');
  });

  test('cache handles number zero', () => {
    setCache('test:zero', 0, 5000);
    expect(getCached('test:zero')).toBe(0);
  });

  test('cache handles boolean false', () => {
    setCache('test:false', false, 5000);
    expect(getCached('test:false')).toBe(false);
  });
});

describe('DockerService', () => {
  test('isAvailable returns boolean', async () => {
    const result = await dockerService.isAvailable();
    expect(typeof result).toBe('boolean');
  });

  test('getDockerInfo returns available flag', async () => {
    const info = await dockerService.getDockerInfo();
    expect(info).toHaveProperty('available');
    expect(typeof info.available).toBe('boolean');
  });

  test('getContainers returns array', async () => {
    const containers = await dockerService.getContainers();
    expect(Array.isArray(containers)).toBe(true);
  });

  test('getContainer for non-existent returns null', async () => {
    const container = await dockerService.getContainer('nonexistent-container-xyz');
    expect(container).toBeNull();
  });
});
