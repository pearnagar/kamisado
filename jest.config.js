/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/engine/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }],
  },
  globals: {
    // Simulate React Native's __DEV__ global so aiEngine.ts compiles.
    __DEV__: false,
  },
};
