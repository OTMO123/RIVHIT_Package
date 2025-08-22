module.exports = {
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/packages/backend/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/backend/tests/setup.ts'],
      collectCoverageFrom: [
        'packages/backend/src/**/*.ts',
        '!packages/backend/src/**/*.d.ts',
        '!packages/backend/src/types/**/*',
      ],
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/packages/frontend/**/*.test.{ts,tsx}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/packages/frontend/tests/setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/frontend/src/renderer/$1',
        '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
      },
      collectCoverageFrom: [
        'packages/frontend/src/**/*.{ts,tsx}',
        '!packages/frontend/src/**/*.d.ts',
        '!packages/frontend/src/main/**/*',
      ],
    },
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/packages/shared/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      collectCoverageFrom: [
        'packages/shared/src/**/*.ts',
        '!packages/shared/src/**/*.d.ts',
        '!packages/shared/src/index.ts',
      ],
    },
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/types/**/*',
    '!packages/*/src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};