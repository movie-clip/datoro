// tests/setup.ts
// Global test setup - runs before all tests

import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load test environment variables
config({ path: join(__dirname, '..', '.env.local') })

// Ensure test environment
process.env.NODE_ENV = 'test'

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

console.log('🧪 Test environment initialized')
console.log(`📍 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
console.log(`🔑 FMP API Key: ${process.env.FMP_API_KEY ? 'Loaded' : 'Not configured'}`)
