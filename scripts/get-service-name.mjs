/* eslint-disable no-console */
#!/usr/bin/env node
/**
 * Get service name from centralized config
 * Usage: node scripts/get-service-name.mjs api
 */

const SERVICES = {
  api: { name: 'datoro-api' },
  frontend: { name: 'datoro' },
  database: { name: 'datoro-db' },
  redis: { name: 'datoro-redis' }
}

const serviceType = process.argv[2]
if (!serviceType || !SERVICES[serviceType]) {
  console.error('Usage: node scripts/get-service-name.mjs <api|frontend|database|redis>')
  process.exit(1)
}

console.log(SERVICES[serviceType].name)

