import type { Config } from '@jest/types'
import path from 'path'

export default (): Config.InitialOptions => ({
  displayName: 'unit',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.join(__dirname),
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts', '<rootDir>/__tests__/**/*.spec.tsx'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // jose (pnpm nested copy) ships ESM-only; transpile it for Jest CJS.
  transformIgnorePatterns: ['/node_modules/(?!(?:\\.pnpm/)?jose(?:@[^/]+)?(?:/|$))'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          isolatedModules: true,
          jsx: 'react-jsx',
        },
      },
    ],
  },
})
