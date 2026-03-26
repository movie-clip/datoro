// tests/setup.ts
// Global test setup - runs before all tests

import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load test environment variables
config({ path: join(__dirname, '..', '.env.local'), quiet: true })

// Ensure test environment
process.env.NODE_ENV = 'test'

declare global {
  var __DATORO_TEST_SETUP_LOGGED__: boolean | undefined
}

// Mock window object for tests (required for apiConfig and other browser-dependent code)
global.window = {
  location: {
    origin: 'http://localhost:5173',
    href: 'http://localhost:5173/',
    pathname: '/'
  }
} as any

// Suppress console logs during tests (optional - remove if you want to see logs)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn()
// }

// Global test utilities
declare global {
  var sleep: (ms: number) => Promise<void>
}

global.sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

if (!globalThis.__DATORO_TEST_SETUP_LOGGED__ && process.env.CI !== 'true') {
  globalThis.__DATORO_TEST_SETUP_LOGGED__ = true
  console.log('🧪 Test environment initialized')
  console.log(`📍 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
  console.log(`🔑 FMP API Key: ${process.env.FMP_API_KEY ? 'Loaded' : 'Not configured'}`)
}
