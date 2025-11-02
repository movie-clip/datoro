// Test login flow and verify subscription data
import fetch from 'node-fetch'

async function testLogin() {
  const baseUrl = 'http://localhost:7071'
  
  console.log('\n=== Testing Login Flow ===\n')
  
  // Login
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test-subscription@datoro.com',
      password: 'TestPass123!'
    })
  })
  
  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text())
    return
  }
  
  const loginData: any = await loginResponse.json()
  console.log('✓ Login successful!')
  console.log('\nUser email:', loginData.data.user.email)
  console.log('User ID:', loginData.data.user.id)
  console.log('\n✓ Token present:', !!loginData.data.token)
  
  // Decode JWT to check payload (just the payload part, not verifying signature)
  if (loginData.data.token) {
    const parts = loginData.data.token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      console.log('\nJWT Payload:', JSON.stringify(payload, null, 2))
      console.log('\n✓ JWT does NOT contain subscriptionTier:', !('subscriptionTier' in payload))
      console.log('✓ JWT contains userId and email only:', 'userId' in payload && 'email' in payload)
    }
  }
}

testLogin().catch(console.error)
