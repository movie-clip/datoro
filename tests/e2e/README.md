// tests/e2e/README.md
# End-to-End Tests

Comprehensive E2E tests for critical user flows in Factorly.

## Test Coverage

### 1. Authentication Flow (`auth-flow.test.ts`)
- ✅ User registration (validation, duplicate prevention)
- ✅ Login/logout flow
- ✅ Session persistence across requests
- ✅ Token management
- ✅ Error handling (invalid credentials, weak passwords)

### 2. Ticker Data Flow (`ticker-flow.test.ts`)
- ✅ Batch data retrieval (17 FMP endpoints)
- ✅ Data structure validation
- ✅ Cache performance (Redis caching)
- ✅ Invalid ticker handling
- ✅ Concurrent requests
- ✅ Response time validation

### 3. DCF Calculator Data (`dcf-data.test.ts`)
- ✅ FMP DCF valuation availability
- ✅ Advanced DCF model data
- ✅ Financial statement data (income, cash flow, balance)
- ✅ Growth rate calculations
- ✅ Margin calculations
- ✅ Data quality validation (5+ years history)

### 4. Watchlist Flow (`watchlist.test.ts`)
- ✅ CRUD operations (create, read, delete)
- ✅ Ticker validation
- ✅ Duplicate prevention
- ✅ Rate limiting
- ✅ User isolation
- ✅ Cascade deletion

## Requirements

### Server Running
**CRITICAL:** E2E tests require the server to be running before execution.

```bash
# Start server (pick one):
npm run server          # Development mode
npm run pm2:dev         # PM2 cluster mode
```

### Environment Variables
Tests use `.env.local` configuration:
- `TEST_API_URL` - Optional (defaults to `http://localhost:7071`)
- Database connection (Prisma)
- Redis connection
- FMP API key

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx vitest run tests/e2e/auth-flow.test.ts
npx vitest run tests/e2e/ticker-flow.test.ts
npx vitest run tests/e2e/dcf-data.test.ts
npx vitest run tests/e2e/watchlist.test.ts
```

### Watch Mode (Development)
```bash
npx vitest tests/e2e --watch
```

### With Coverage
```bash
npx vitest run tests/e2e --coverage
```

## Test Configuration

**File:** `vitest.config.js`

```javascript
{
  environment: 'node',
  testTimeout: 5000,        // 5s default
  setupFiles: ['./tests/setup.js'],
  sequence: { 
    concurrent: false       // Sequential (avoid DB conflicts)
  }
}
```

**Custom Timeouts:**
- Standard API calls: 10s
- Batch data fetching: 30s
- Multiple concurrent requests: 60s

## Test Patterns

### Server Running Check
```typescript
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL)
      .get('/api/health')
      .timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

beforeAll(async () => {
  const isServerRunning = await checkServerRunning()
  if (!isServerRunning) {
    throw new Error('Server not running - start with: npm run server')
  }
})
```

### Authentication Helper
```typescript
async function loginTestUser() {
  const response = await request(BASE_URL)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
  
  const cookies = response.headers['set-cookie']
  return cookies[0].split(';')[0]
}

// Use in tests:
const authCookie = await loginTestUser()
await request(BASE_URL)
  .get('/api/protected')
  .set('Cookie', authCookie)
```

### Database Cleanup
```typescript
beforeEach(async () => {
  await prisma.watchlistItem.deleteMany({ 
    where: { userId } 
  })
})

afterAll(async () => {
  await prisma.user.delete({ where: { id } })
  await prisma.$disconnect()
})
```

## Common Issues

### 1. "Server not running" Error
**Solution:** Start the server before running tests
```bash
npm run server
```

### 2. "Cannot connect to database" Error
**Solution:** Ensure PostgreSQL is running and `.env.local` has correct DATABASE_URL
```bash
# Check database:
npx prisma db push
```

### 3. "Redis connection failed" Error
**Solution:** Start Redis (Docker or local)
```bash
# Docker (development):
npm run docker:dev:up

# Or check Redis status:
redis-cli ping  # Should return "PONG"
```

### 4. Test Timeouts
**Solution:** Increase timeout for slow endpoints
```typescript
it('should fetch data', async () => {
  // test code
}, 30000) // 30 second timeout
```

### 5. Rate Limiting Errors
**Solution:** Tests are designed to test rate limits, but if you get unexpected 429s:
- Wait 60 seconds between test runs
- Restart Redis to clear rate limit cache
- Check rate limiter configuration in `server/middleware/rateLimiter.ts`

## Test Data

### Test Users
Tests create temporary users with unique emails:
```typescript
const TEST_USER = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'StrongPassword123!',
  name: 'E2E Test User'
}
```

### Test Tickers
Valid tickers with complete FMP data:
- **AAPL** - Apple (primary test ticker)
- **MSFT** - Microsoft (alternative)
- **GOOGL** - Google (multi-ticker tests)

### Invalid Test Data
- Invalid ticker: `INVALIDXYZ`
- Invalid email: `not-an-email`
- Weak password: `weak`
- Long ticker: `VERYLONGTICKER`

## Best Practices

1. **Always check server running** in `beforeAll()`
2. **Clean up test data** in `afterAll()` and `afterEach()`
3. **Use unique test users** to avoid conflicts
4. **Test both success and error paths**
5. **Validate response structure**, not just status codes
6. **Use appropriate timeouts** for different endpoints
7. **Test rate limiting** separately with higher test counts
8. **Avoid parallel execution** (database conflicts)

## CI/CD Integration

Tests run automatically on:
- Pull requests (GitHub Actions)
- Pre-push hooks (`npm run prepush`)
- Render.com deployments (after build)

**GitHub Actions Workflow:**
```yaml
- name: Start server
  run: npm run server &
  
- name: Wait for server
  run: sleep 5
  
- name: Run E2E tests
  run: npm run test:e2e
```

## Performance Benchmarks

Expected response times (based on test runs):

| Endpoint | First Request | Cached |
|----------|---------------|--------|
| Health Check | <100ms | <50ms |
| Login | <200ms | N/A |
| Batch Data (AAPL) | 1-5s | <100ms |
| Watchlist GET | <100ms | <50ms |
| Add to Watchlist | <200ms | N/A |

## Troubleshooting Commands

```bash
# Check server health
curl http://localhost:7071/api/health

# Check database connection
npx prisma studio

# Check Redis connection
redis-cli ping

# View server logs (PM2)
npm run pm2:logs

# Restart server
npm run pm2:restart

# Kill all test processes
pkill -f "vitest"
```

## Contributing

When adding new features:

1. ✅ Add E2E tests for critical user flows
2. ✅ Follow existing test patterns
3. ✅ Include both success and error cases
4. ✅ Update this README with new test coverage
5. ✅ Ensure tests pass before PR

## Test Statistics

**Total E2E Tests:** 60+
**Total Test Files:** 4
**Average Test Duration:** 2-5 minutes (full suite)
**Coverage:** Critical user flows (auth, data, watchlist, DCF)
