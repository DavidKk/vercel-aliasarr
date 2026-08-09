import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (!existsSync('.git')) {
  process.exit(0)
}

try {
  execSync('pnpm exec husky', { stdio: 'inherit' })
} catch {
  // husky may not be ready on first install; ignore
}
