#!/usr/bin/env node
/* eslint-disable no-console */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const steps = [
  { name: 'ESLint', command: 'npm run lint:check' },
  { name: 'Security audit', command: 'npm run security:audit' },
  { name: 'Frontend type-check', command: 'npm run type-check' },
  { name: 'Backend type-check', command: 'npm run type-check:server' },
  { name: 'Test type-check', command: 'npm run type-check:tests' },
  {
    name: 'Unit tests',
    command: 'npm test -- --silent=passed-only',
    env: {
      CI: 'true',
      TEST_SILENT_LOGS: 'true'
    }
  },
  { name: 'Production build', command: 'npm run build' }
]

console.log('Production readiness check\n')
console.log('This runs the same core validation flow used in CI.\n')

let hasFailure = false

for (const step of steps) {
  console.log(`Running ${step.name}...`)

  try {
    execSync(step.command, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...step.env
      }
    })
    console.log(`OK  ${step.name}\n`)
  } catch {
    hasFailure = true
    console.log(`FAIL ${step.name}\n`)
    break
  }
}

if (hasFailure) {
  console.log('Not ready for production push.')
  process.exit(1)
}

console.log('Ready for production push.')
