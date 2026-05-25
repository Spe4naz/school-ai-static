// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  maxWorkers: 1,

  // Таймауты для медленных операций на Windows
  testTimeout: 30000,

  // Покрытие кода (пороги можно снизить для начала)
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },

  // Игнорируем transform для node_modules (ускоряет тесты)
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],

  // Сбор покрытия
  collectCoverageFrom: [
    'config/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'server.js',
    '!**/node_modules/**',
  ],
};
