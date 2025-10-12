// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test timeout (5 seconds for API tests)
    testTimeout: 5000,
    
    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'dist/',
        '.github/',
        'prisma/'
      ],
      // Coverage thresholds for production readiness
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70
    },
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Run tests in sequence to avoid database conflicts
    sequence: {
      concurrent: false
    },
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],
    
    // Global variables
    globals: true
  }
})
