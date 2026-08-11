/// <reference types="jest" />

/** Globals installed by `__tests__/setup.ts` for Vitest-compatible env/global stubs. */
declare function stubEnv(key: string, value: string): void
declare function unstubAllEnvs(): void
declare function stubGlobal(name: string, value: unknown): void
declare function unstubAllGlobals(): void
