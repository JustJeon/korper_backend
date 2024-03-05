export default {
  setupFiles: ['./__tests__/env.ts'],
  testPathIgnorePatterns: ['./__tests__/env.ts', './__tests__/testUtil.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
};
