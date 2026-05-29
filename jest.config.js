// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  transform: {
    '^.+\\.ts$': ['ts-jest'],
  },

  maxWorkers: 1,

  // Таймауты для медленных операций на Windows
  testTimeout: 30000,

  // Покрытие кода
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },

  // Игнорируем transform для node_modules
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],

  // Сбор покрытия
  collectCoverageFrom: [
    'config/**/*.{js,ts}',
    'middleware/**/*.{js,ts}',
    'routes/**/*.{js,ts}',
    'services/**/*.{js,ts}',
    'server.ts',
    'server.js',
    '!**/node_modules/**',
  ],
};
