// tests/setup.js
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

// Set test timeouts
const TEST_TIMEOUT = 10000 // 10 seconds for integration tests

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

console.log('🧪 Test environment initialized')
console.log(`📍 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
console.log(`🔑 FMP API Key: ${process.env.FMP_API_KEY ? 'Loaded' : 'Not configured'}`)
