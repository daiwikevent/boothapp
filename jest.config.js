/**
 * jest.config.js
 * Minimal Jest config for TypeScript tests using ts-jest.
 * Only runs files in __tests__/ — does not touch Next.js build.
 */

/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  // ts-jest needs this to find tsconfig
  globals: {
    "ts-jest": {
      tsconfig: {
        paths: {
          "@/*": ["./*"],
        },
      },
    },
  },
};

module.exports = config;
