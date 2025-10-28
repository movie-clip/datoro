import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')
dotenv.config({ path: join(rootDir, '.env') })

const { getPrismaClient } = await import('../server/services/databaseService.ts')

const prisma = getPrismaClient()

console.log('Making user_id nullable in watchlist_items...\n')

try {
  await prisma.$executeRaw`ALTER TABLE watchlist_items ALTER COLUMN user_id DROP NOT NULL;`
  console.log('✅ Success! user_id is now nullable')
  
  // Verify the change
  const result = await prisma.$queryRaw`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'watchlist_items' AND column_name = 'user_id';
  `
  console.log('\nVerification:', result)
  
} catch (error) {
  console.error('❌ Error:', error.message)
}

await prisma.$disconnect()
