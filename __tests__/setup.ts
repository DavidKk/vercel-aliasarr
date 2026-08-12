import { stubEnv, stubGlobal, unstubAllEnvs, unstubAllGlobals } from './helpers/env'

Object.assign(globalThis, {
  stubEnv,
  unstubAllEnvs,
  stubGlobal,
  unstubAllGlobals,
})
