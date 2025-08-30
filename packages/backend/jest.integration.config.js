module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/tests/integration/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/tests/**/*'
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000, // 30 seconds for integration tests
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  }
};