/**
 * Test Subscription Flow
 * Run with: npx tsx scripts/test-subscription-flow.ts
 */

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:7071/api'

async function testSubscriptionFlow() {
  console.log('🧪 Testing Subscription Flow\n')

  // Step 1: Register a test user
  console.log('1️⃣ Registering test user...')
  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: 'Test123456',
      name: 'Test User'
    })
  })

  if (!registerResponse.ok) {
    console.error('❌ Registration failed:', await registerResponse.text())
    return
  }

  const { token, user } = await registerResponse.json() as any
  console.log(`✅ User registered: ${user.email} (ID: ${user.id})`)
  console.log(`🔑 JWT Token: ${token}\n`)

  // Step 2: Get Stripe config (publishable key)
  console.log('2️⃣ Getting Stripe config...')
  const configResponse = await fetch(`${API_BASE}/subscription/config`)
  const { publishableKey } = await configResponse.json() as any
  console.log(`✅ Publishable Key: ${publishableKey}\n`)

  // Step 3: Create checkout session
  console.log('3️⃣ Creating Stripe Checkout session...')
  const checkoutResponse = await fetch(`${API_BASE}/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!checkoutResponse.ok) {
    console.error('❌ Checkout failed:', await checkoutResponse.text())
    return
  }

  const { sessionId, url } = await checkoutResponse.json() as any
  console.log(`✅ Checkout Session Created!`)
  console.log(`   Session ID: ${sessionId}`)
  console.log(`   Checkout URL: ${url}\n`)

  console.log('📋 Next Steps:')
  console.log('   1. Open the checkout URL in your browser')
  console.log('   2. Use test card: 4242 4242 4242 4242')
  console.log('   3. Complete the checkout')
  console.log('   4. Webhook events will be sent to your server!')
  console.log(`\n🌐 Checkout URL: ${url}`)

  // Open in browser (Windows)
  const { exec } = await import('child_process')
  exec(`start ${url}`)
}

testSubscriptionFlow().catch(console.error)
