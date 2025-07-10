const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will match tsconfig.json paths)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    // Domain-specific module aliases
    '^@/shared$': '<rootDir>/src/shared/index.ts',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/auth$': '<rootDir>/src/auth/index.ts',
    '^@/auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@/reddit$': '<rootDir>/src/reddit/index.ts',
    '^@/reddit/(.*)$': '<rootDir>/src/reddit/$1',
    '^@/ai$': '<rootDir>/src/ai/index.ts',
    '^@/ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@/opportunities$': '<rootDir>/src/opportunities/index.ts',
    '^@/opportunities/(.*)$': '<rootDir>/src/opportunities/$1',
    '^@/bookmarks$': '<rootDir>/src/bookmarks/index.ts',
    '^@/bookmarks/(.*)$': '<rootDir>/src/bookmarks/$1',
    '^@/admin$': '<rootDir>/src/admin/index.ts',
    '^@/admin/(.*)$': '<rootDir>/src/admin/$1',
    '^@/analytics$': '<rootDir>/src/analytics/index.ts',
    '^@/analytics/(.*)$': '<rootDir>/src/analytics/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)