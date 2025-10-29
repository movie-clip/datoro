#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Security Audit Script
 * Scans codebase for potential security issues like hardcoded secrets
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Patterns that might indicate hardcoded secrets
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|password|token|auth)["\s]*[:=]["\s]*[a-zA-Z0-9_\-]{20,}/gi,
  /sk[_-][a-zA-Z0-9]{20,}/g, // ElevenLabs/OpenAI style keys
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
  /gho_[a-zA-Z0-9]{36}/g, // GitHub OAuth tokens
  /ghu_[a-zA-Z0-9]{36}/g, // GitHub user tokens
  /ghs_[a-zA-Z0-9]{36}/g, // GitHub server tokens
  /glpat-[a-zA-Z0-9_\-]{20}/g, // GitLab tokens
  /xox[baprs]-[a-zA-Z0-9\-]{10,}/g, // Slack tokens
];

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.env\.example/,
  /README\.md/,
  /\.md$/,
  /security-audit\.mjs$/,
  /\.venv/,
  /venv/,
  /__pycache__/,
  /\.pyc$/,
  /site-packages/,
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.vue', '.py', '.json', '.env', '.yml', '.yaml'];

function shouldScanFile(filePath) {
  return (
    SCAN_EXTENSIONS.includes(extname(filePath)) &&
    !IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
  );
}

function scanDirectory(dir, results = { files: 0, issues: [] }) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const relativePath = fullPath.replace(rootDir + '/', '');
    
    if (IGNORE_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (shouldScanFile(fullPath)) {
      results.files++;
      scanFile(fullPath, relativePath, results);
    }
  }
  
  return results;
}

function scanFile(filePath, relativePath, results) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((_line, _index) => {
      SECRET_PATTERNS.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Skip obvious examples and placeholders
            if (
              match.includes('your_key_here') ||
              match.includes('your-key-here') ||
              match.includes('example') ||
              match.includes('placeholder') ||
              match.includes('xxx') ||
              match.includes('***')
            ) {
              return;
            }
            
            results.issues.push({
              file: relativePath,
              line: index + 1,
              content: line.trim(),
              match: match,
              type: 'potential_secret'
            });
          });
        }
      });
    });
  } catch (_error) {
    console.warn(`Warning: Could not read file ${relativePath}: ${_error.message}`);
  }
}

function main() {
  console.log('🔒 Running Security Audit...\n');
  
  const results = scanDirectory(rootDir);
  
  console.log(`📁 Scanned ${results.files} files`);
  console.log(`🚨 Found ${results.issues.length} potential issues\n`);
  
  if (results.issues.length > 0) {
    console.log('⚠️  POTENTIAL SECURITY ISSUES:');
    console.log('=' .repeat(60));
    
    results.issues.forEach((_issue, _index) => {
      console.log(`\n${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Match: ${issue.match}`);
      console.log(`   Line: ${issue.content}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('🔧 RECOMMENDATIONS:');
    console.log('- Move hardcoded secrets to environment variables');
    console.log('- Use .env.local for development secrets');
    console.log('- Add sensitive files to .gitignore');
    console.log('- Rotate any exposed API keys');
    
    process.exit(1);
  } else {
    console.log('✅ No hardcoded secrets detected!');
    console.log('🎉 Security audit passed');
  }
}

main();
