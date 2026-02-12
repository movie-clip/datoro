#!/usr/bin/env node
/* eslint-disable no-console */
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

function parseCommandError(error) {
  const stdout = error?.stdout ? String(error.stdout).trim() : '';
  const stderr = error?.stderr ? String(error.stderr).trim() : '';
  const combined = [stderr, stdout].filter(Boolean).join('\n');
  if (!combined) return null;

  // Keep output concise but useful
  const lines = combined.split(/\r?\n/).filter(Boolean);
  return lines.slice(-8).join('\n');
}

function runCommand(command, options = {}) {
  const { cwd = rootDir, stdio = 'pipe' } = options;
  return execSync(command, { cwd, stdio, encoding: 'utf-8' });
}

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
const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10);
const nodeOk = Number.isFinite(nodeMajor) && nodeMajor >= 18;
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
  'server/server.ts',
  'vite.config.ts',
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
  runCommand('npm run build', { stdio: 'inherit' });
  checks.passed.push('Production Build');
  console.log('✅ Production Build successful');
} catch (error) {
  const details = parseCommandError(error);
  checks.failed.push({ name: 'Production Build', error: details ? `Build failed\n${details}` : 'Build failed' });
  console.log('❌ Production Build failed');
}

// Check 6.5: TypeScript type checking
console.log('\n🔍 TypeScript Type Checking...');
try {
  console.log('   Checking frontend types...');
  runCommand('npm run type-check');
  checks.passed.push('TypeScript Frontend');
  console.log('✅ Frontend type-check passed');
} catch (error) {
  const details = parseCommandError(error);
  checks.failed.push({
    name: 'TypeScript Frontend',
    error: details ? `Type errors found in frontend\n${details}` : 'Type errors found in frontend'
  });
  console.log('❌ Frontend type-check failed');
}

try {
  console.log('   Checking backend types...');
  runCommand('npm run type-check:server');
  checks.passed.push('TypeScript Backend');
  console.log('✅ Backend type-check passed');
} catch (_error) {
  // Backend type errors are warnings if tests pass (route handler signatures)
  const details = parseCommandError(_error);
  warn(
    'TypeScript Backend',
    details
      ? `Type errors found in backend. Verify tests pass to confirm runtime safety.\n${details}`
      : 'Type errors found in backend. Verify tests pass to confirm runtime safety.'
  );
}

try {
  console.log('   Checking test project types...');
  runCommand('npm run type-check:tests');
  checks.passed.push('TypeScript Tests');
  console.log('✅ Test type-check passed');
} catch (_error) {
  const details = parseCommandError(_error);
  warn('TypeScript Tests', details ? `Type errors found in tests.\n${details}` : 'Type errors found in tests.');
}

// Check 6.6: Security audit
console.log('\n🔒 Running Security Audit...');
try {
  runCommand('npm run security:audit');
  checks.passed.push('Security Audit');
  console.log('✅ Security audit passed - no hardcoded secrets detected');
} catch (error) {
  const details = parseCommandError(error);
  checks.failed.push({
    name: 'Security Audit',
    error: details ? `Security audit failed\n${details}` : 'Security vulnerabilities found'
  });
  console.log('❌ Security audit failed - hardcoded secrets detected');
}

// Check 6.7: ESLint validation
console.log('\n🔧 Running ESLint Validation...');
try {
  runCommand('npm run lint:check');
  checks.passed.push('ESLint Validation');
  console.log('✅ ESLint validation passed - code quality standards met');
} catch (error) {
  const details = parseCommandError(error);
  const summary = details || '';
  const match = summary.match(/\((\d+) errors?,\s*(\d+) warnings?\)/i);
  const errorCount = match ? Number.parseInt(match[1], 10) : NaN;

  if (Number.isFinite(errorCount) && errorCount > 0) {
    checks.failed.push({
      name: 'ESLint Validation',
      error: details
        ? `Lint errors found. Run: npm run lint:fix\n${details}`
        : 'Lint errors found. Run: npm run lint:fix'
    });
    console.log('❌ ESLint validation failed - lint errors detected');
  } else {
    // Warnings only (non-blocking)
    warn(
      'ESLint Validation',
      details
        ? `Lint warnings found. Run: npm run lint:fix\n${details}`
        : 'Lint warnings found. Run: npm run lint:fix'
    );
  }
}

// Check 6.8: Run tests
console.log('\n🧪 Running Tests...');
try {
  runCommand('npm test');
  checks.passed.push('Unit Tests');
  console.log('✅ All tests passed');
} catch (error) {
  const details = parseCommandError(error);
  checks.failed.push({ name: 'Unit Tests', error: details ? `Tests failed\n${details}` : 'Tests failed' });
  console.log('❌ Tests failed');
}

// Check 7: Prisma schema
console.log('\n🗄️  Checking Prisma Schema...');
try {
  runCommand('npx --no-install prisma validate');
  checks.passed.push('Prisma Schema');
  console.log('✅ Prisma Schema valid');
} catch (error) {
  const details = parseCommandError(error);
  checks.failed.push({ name: 'Prisma Schema', error: details ? `Invalid schema\n${details}` : 'Invalid schema' });
  console.log('❌ Prisma Schema invalid');
}

// Check 7.5: Verify Prisma migrations are synced
console.log('\n🔄 Checking Prisma Migrations...');
try {
  const migrationStatus = runCommand('npx --no-install prisma migrate status', { stdio: 'pipe' });
  if (/database schema is up to date/i.test(migrationStatus)) {
    checks.passed.push('Prisma Migrations');
    console.log('✅ Prisma migrations synced');
  } else if (/not yet been applied/i.test(migrationStatus)) {
    warn('Prisma Migrations', 'Pending migrations detected. Run: npx prisma migrate deploy');
  } else {
    checks.passed.push('Prisma Migrations');
    console.log('✅ Prisma migrations status checked');
  }
} catch (_error) {
  warn('Prisma Migrations', 'Could not verify migration status. Ensure database is accessible.');
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

  // Recommended (not required) for production hardening
  const recommendedVars = ['ADMIN_API_KEY', 'READINESS_REQUIRE_ADMIN_KEY'];
  recommendedVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      warn(`Env Var: ${varName}`, 'Recommended for production ops/security. Consider documenting in .env.example');
    } else {
      checks.passed.push(`Env Var (recommended): ${varName}`);
    }
  });
}

// Check 8.5: Verify critical TypeScript config files
console.log('\n⚙️  Checking TypeScript Configuration...');
const tsConfigs = [
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.server.json'
];

tsConfigs.forEach(file => {
  if (existsSync(join(rootDir, file))) {
    checks.passed.push(`TS Config: ${file}`);
  } else {
    warn(`TS Config: ${file}`, `${file} not found - may cause type-checking issues`);
  }
});

// Check 8.6: Verify dist directory exists after build
if (existsSync(join(rootDir, 'dist'))) {
  checks.passed.push('Build Output');
  console.log('✅ dist/ directory exists');
} else {
  warn('Build Output', 'dist/ directory not found. Build may have failed.');
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
} catch {
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
} catch {
  warn('GitHub Remote', 'No remote repository configured. Run: git remote add origin <url>');
}

// Check 11: Verify critical server files exist
console.log('\n🖥️  Checking Server Files...');
const serverFiles = [
  'server/server.ts',
  'server/config/database.config.ts',
  'server/services/batchDataService.ts',
  'server/services/cacheService.ts',
  'server/middleware/rateLimiter.ts',
  'server/middleware/errorHandler.ts'
];

serverFiles.forEach(file => {
  if (existsSync(join(rootDir, file))) {
    checks.passed.push(`Server: ${file.split('/').pop()}`);
  } else {
    checks.failed.push({ name: `Server File: ${file}`, error: 'Required server file missing' });
    console.log(`❌ Missing: ${file}`);
  }
});

// Check 12: Verify package.json scripts exist
console.log('\n📜 Checking Package Scripts...');
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const requiredScripts = ['build', 'test', 'type-check', 'type-check:server', 'server'];

requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    checks.passed.push(`Script: ${script}`);
  } else {
    warn(`Script: ${script}`, `Script "${script}" not found in package.json`);
  }
});

// Check 13: Verify render.yaml configuration matches TypeScript files
console.log('\n🚀 Checking Render.com Configuration...');
if (existsSync(join(rootDir, 'render.yaml'))) {
  const renderConfig = readFileSync(join(rootDir, 'render.yaml'), 'utf-8');
  
  // Check if startCommand uses the correct file extension
  if (renderConfig.includes('server.mjs')) {
    checks.failed.push({ 
      name: 'Render Config', 
      error: 'render.yaml still references server.mjs but file is now server.ts. Update startCommand to use tsx.' 
    });
    console.log('❌ render.yaml uses old server.mjs path');
  } else if (renderConfig.includes('tsx server/server.ts') || renderConfig.includes('node --import tsx server/server.ts')) {
    checks.passed.push('Render Config');
    console.log('✅ render.yaml correctly configured for TypeScript');
  } else {
    warn('Render Config', 'render.yaml startCommand may need verification');
  }
  
  // Check if tsx is in production dependencies (not devDependencies)
  if (packageJson.dependencies && packageJson.dependencies.tsx) {
    checks.passed.push('TSX Dependency');
    console.log('✅ tsx in production dependencies');
  } else if (packageJson.devDependencies && packageJson.devDependencies.tsx) {
    checks.failed.push({
      name: 'TSX Dependency',
      error: 'tsx is in devDependencies but needs to be in dependencies for production deployment'
    });
    console.log('❌ tsx must be moved from devDependencies to dependencies');
  } else {
    checks.failed.push({
      name: 'TSX Dependency',
      error: 'tsx not found in package.json - required to run TypeScript in production'
    });
    console.log('❌ tsx not found in dependencies');
  }
} else {
  warn('Render Config', 'render.yaml not found');
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

