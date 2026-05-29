const AppError = require('../utils/AppError');

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
    expect(e1.status).toBe(400);
    expect(e2.status).toBe(500);
    expect(e1.code).toBe('ERR1');
    expect(e2.code).toBe('ERR2');
  });
});

describe('BackupService path safety', () => {
  const BackupService = require('../services/backupService');

  test('constructor sets backupDir', () => {
    const svc = new BackupService('./test-backups', 14);
    expect(svc.backupDir).toContain('test-backups');
    expect(svc.retentionDays).toBe(14);
  });

  test('default retention is 7 days', () => {
    const svc = new BackupService();
    expect(svc.retentionDays).toBe(7);
  });
});
