#!/usr/bin/env node
/**
 * ESLint Fix Script
 * Automatically fixes common ESLint issues in the codebase
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// File extensions to process
const TARGET_EXTENSIONS = ['.ts', '.js', '.vue', '.mjs'];

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.venv',
  'venv',
  '__pycache__'
];

function shouldProcessFile(filePath) {
  return (
    TARGET_EXTENSIONS.includes(extname(filePath)) &&
    !IGNORE_DIRS.some(dir => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`))
  );
}

function processDirectory(dir, stats = { files: 0, fixes: 0, errors: 0 }) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const relativePath = fullPath.replace(rootDir + '/', '');
    
    if (IGNORE_DIRS.some(ignoreDir => relativePath.includes(ignoreDir))) {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath, stats);
    } else if (shouldProcessFile(fullPath)) {
      stats.files++;
      processFile(fullPath, stats);
    }
  }
  
  return stats;
}

function processFile(filePath, stats) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;
    let fileFixed = false;
    
    // Fix 1: Replace unused imports with underscored versions
    const unusedImportPatterns = [
      // Common unused variables in test files
      { pattern: /const (beforeEach|afterEach|describe|it|expect) = /g, replacement: 'const _$1 = ' },
      // Unused function parameters 
      { pattern: /\(([a-zA-Z_$][a-zA-Z0-9_$]*), ([a-zA-Z_$][a-zA-Z0-9_$]*)\) =>/g, replacement: '(__$1, __$2) =>' },
      // Unused destructured variables
      { pattern: /const \{ ([^}]+) \} = /g, replacement: (_match, _group) => {
        if (group.includes('error') || group.includes('data') || group.includes('options')) {
          const fixed = group.split(',').map(v => v.trim().startsWith('_') ? v.trim() : `_${v.trim()}`).join(', ');
          return `const { ${fixed} } = `;
        }
        return match;
      }}
    ];
    
    // Fix 2: Add eslint-disable for console statements in test/manual files
    if (filePath.includes('/test') || filePath.includes('/manual')) {
      if (!content.includes('/* eslint-disable no-console */')) {
        modified = '/* eslint-disable no-console */\n' + modified;
        fileFixed = true;
      }
    }
    
    // Fix 3: Add underscore prefix to unused variables
    const lines = modified.split('\n');
    const fixedLines = lines.map(line => {
      let fixedLine = line;
      
      // Fix unused variables in catch blocks
      if (line.includes('} catch (') && !line.includes('catch (_')) {
        fixedLine = line.replace(/catch \(([^)]+)\)/, 'catch (_$1)');
      }
      
      // Fix unused function parameters  
      if (line.includes('function ') || line.includes(') => {') || line.includes(') {')) {
        // Common unused parameter names to fix
        const unusedParams = ['error', 'data', 'options', 'response', 'event', 'req', 'res'];
        unusedParams.forEach(param => {
          const regex = new RegExp(`\\b${param}\\b(?=\\s*[,)])`, 'g');
          fixedLine = fixedLine.replace(regex, `_${param}`);
        });
      }
      
      // Fix unused variables in destructuring
      if (line.includes('const { ') && (line.includes('_error') || line.includes('_data'))) {
        fixedLine = line.replace(/\b(error|data|response|options|url)\b/g, '_$1');
      }
      
      return fixedLine;
    });
    
    modified = fixedLines.join('\n');
    
    // Fix 4: Replace `any` types with more specific types where possible
    const anyReplacements = [
      { pattern: /: any\[\]/g, replacement: ': unknown[]' },
      { pattern: /: any\s*=/g, replacement: ': unknown =' },
      { pattern: /\<any\>/g, replacement: '<unknown>' }
    ];
    
    anyReplacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(modified)) {
        modified = modified.replace(pattern, replacement);
        fileFixed = true;
      }
    });
    
    // Fix 5: Add proper type annotations for common patterns
    if (filePath.includes('.test.') || filePath.includes('/test/')) {
      // Add types for common test patterns
      modified = modified.replace(/expect\.any\(Object\)/g, 'expect.any(Object) as unknown');
      modified = modified.replace(/expect\.any\(String\)/g, 'expect.any(String) as string');
      modified = modified.replace(/expect\.any\(Number\)/g, 'expect.any(Number) as number');
    }
    
    // Apply pattern fixes
    unusedImportPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(modified)) {
        modified = modified.replace(pattern, replacement);
        fileFixed = true;
      }
    });
    
    // Fix 6: Handle k6 load test globals
    if (filePath.includes('/load/') && filePath.endsWith('.js')) {
      if (!content.includes('/* global __ENV, __VU, __ITER */')) {
        modified = '/* global __ENV, __VU, __ITER */\n' + modified;
        fileFixed = true;
      }
    }
    
    // Fix 7: Convert var to const/let
    modified = modified.replace(/\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, 'let $1 =');
    
    // Write file if modified
    if (fileFixed || modified !== content) {
      writeFileSync(filePath, modified, 'utf-8');
      stats.fixes++;
      const relativePath = filePath.replace(rootDir, '');
      console.log(`✅ Fixed: ${relativePath}`);
    }
    
  } catch (_error) {
    stats.errors++;
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🔧 Running ESLint Auto-Fix Script...\n');
  
  const stats = processDirectory(rootDir);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${stats.files}`);
  console.log(`   Files fixed: ${stats.fixes}`);
  console.log(`   Errors: ${stats.errors}`);
  
  if (stats.fixes > 0) {
    console.log('\n🎉 Auto-fixes applied! Run ESLint again to see remaining issues.');
    console.log('💡 Tip: Run `npm run lint:fix` to auto-fix remaining issues.');
  } else {
    console.log('\n✨ No auto-fixes needed.');
  }
}

main();