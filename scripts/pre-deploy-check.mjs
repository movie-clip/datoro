#!/usr/bin/env node
/**
 * Pre-Deployment Validation Script
 * Run this before deploying to Render.com
 * Usage: node scripts/pre-deploy-check.mjs
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Running Pre-Deployment Checks...\n');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function check(name, condition, errorMsg) {
  if (condition) {
    checks.passed.push(name);
    console.log(`✅ ${name}`);
    return true;
  } else {
    checks.failed.push({ name, error: errorMsg });
    console.log(`❌ ${name}: ${errorMsg}`);
    return false;
  }
}

function warn(name, message) {
  checks.warnings.push({ name, message });
  console.log(`⚠️  ${name}: ${message}`);
}

// Check 1: Git repository
check(
  'Git Repository',
  existsSync(join(rootDir, '.git')),
  'Not a git repository. Run: git init'
);

// Check 2: Node version
const nodeVersion = process.version;
const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
check(
  'Node.js Version',
  nodeOk,
  `Node ${nodeVersion} detected. Requires Node 18+. Update from nodejs.org`
);

// Check 3: package.json exists
check(
  'package.json',
  existsSync(join(rootDir, 'package.json')),
  'package.json not found'
);

// Check 4: Dependencies installed
check(
  'Node Modules',
  existsSync(join(rootDir, 'node_modules')),
  'Dependencies not installed. Run: npm install'
);

// Check 5: Required files
const requiredFiles = [
  'server/server.mjs',
  'vite.config.js',
  'prisma/schema.prisma',
  'render.yaml',
  '.env.example'
];

requiredFiles.forEach(file => {
  check(
    `File: ${file}`,
    existsSync(join(rootDir, file)),
    `${file} not found`
  );
});

// Check 6: Build test
console.log('\n📦 Testing Production Build...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  checks.passed.push('Production Build');
  console.log('✅ Production Build successful');
} catch (error) {
  checks.failed.push({ name: 'Production Build', error: 'Build failed' });
  console.log('❌ Production Build failed');
}

// Check 7: Prisma schema
console.log('\n🗄️  Checking Prisma Schema...');
try {
  execSync('npx prisma validate', { cwd: rootDir, stdio: 'pipe' });
  checks.passed.push('Prisma Schema');
  console.log('✅ Prisma Schema valid');
} catch (error) {
  checks.failed.push({ name: 'Prisma Schema', error: 'Invalid schema' });
  console.log('❌ Prisma Schema invalid');
}

// Check 8: Environment variables
console.log('\n🔐 Checking Environment Configuration...');
const envExample = join(rootDir, '.env.example');
if (existsSync(envExample)) {
  const envContent = readFileSync(envExample, 'utf-8');
  const requiredVars = [
    'FMP_API_KEY',
    'DATABASE_URL',
    'REDIS_URL',
    'NODE_ENV',
    'PORT',
    'VITE_API_BASE_URL'
  ];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      checks.passed.push(`Env Var: ${varName}`);
    } else {
      warn(`Env Var: ${varName}`, 'Not found in .env.example');
    }
  });
}

// Check 9: Git status
console.log('\n📝 Checking Git Status...');
try {
  const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8' });
  if (status.trim()) {
    warn('Uncommitted Changes', 'You have uncommitted changes. Commit before deploying.');
  } else {
    checks.passed.push('Git Clean');
    console.log('✅ No uncommitted changes');
  }
} catch (error) {
  warn('Git Status', 'Could not check git status');
}

// Check 10: Remote repository
try {
  const remote = execSync('git remote get-url origin', { cwd: rootDir, encoding: 'utf-8' });
  if (remote.includes('github.com')) {
    checks.passed.push('GitHub Remote');
    console.log(`✅ GitHub Remote: ${remote.trim()}`);
  } else {
    warn('GitHub Remote', 'Not using GitHub. Render.com works best with GitHub.');
  }
} catch (error) {
  warn('GitHub Remote', 'No remote repository configured. Run: git remote add origin <url>');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`❌ Failed: ${checks.failed.length}`);
console.log(`⚠️  Warnings: ${checks.warnings.length}`);
console.log('='.repeat(60));

if (checks.failed.length > 0) {
  console.log('\n❌ FAILED CHECKS:');
  checks.failed.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  checks.warnings.forEach(({ name, message }) => {
    console.log(`   - ${name}: ${message}`);
  });
}

if (checks.failed.length === 0) {
  console.log('\n🎉 All critical checks passed! Ready to deploy to Render.com');
  console.log('\n📝 Next Steps:');
  console.log('   1. Commit and push to GitHub: git add . && git commit -m "Ready for deployment" && git push');
  console.log('   2. Go to https://render.com and sign up/login');
  console.log('   3. Click "New" → "Blueprint"');
  console.log('   4. Select your GitHub repository');
  console.log('   5. Render will auto-detect render.yaml and deploy!');
  console.log('\n📖 Full guide: See RENDER_DEPLOYMENT.md');
} else {
  console.log('\n⛔ Fix failed checks before deploying');
  process.exit(1);
}
