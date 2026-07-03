import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/lib/recommendation-engine/tests'],
  moduleNameMapper: {
    '^@engine/(.*)$': '<rootDir>/src/lib/recommendation-engine/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};

export default config;