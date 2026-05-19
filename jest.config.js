module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  runInBand: true, // Важно для SQLite: тесты идут строго по очереди
  coverageThreshold: { global: { branches: 50, functions: 50, lines: 50 } }
};
