/** Jest 設定。utils（sm2, hangul）などの単体テスト用 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  collectCoverageFrom: ['src/utils/**/*.ts', '!src/utils/logger.ts'],
  coverageDirectory: 'coverage',
};
