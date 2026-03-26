import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  // Apply recommended configs
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.cjs',
      '*.config.ts',
      'coverage/**',
      '.github/**',
      'scripts/voice-generation/**/*.py',
      'ai-insights-tool/**',
      'docs/**',
      '.venv/**',
      'venv/**',
      '__pycache__/**',
      '**/__pycache__/**',
      '.env*',
      '*.log',
      '*.pid',
      '.DS_Store',
      'Thumbs.db',
      // Ignore test files (utility/test code, not production)
      'tests/manual/**/*.{js,mjs}',
      'tests/load/**/*.js',
      'tests/e2e/**/*.{js,ts}',
      // Ignore utility scripts (all types)
      'scripts/**/*.{js,mjs,ts}'
    ]
  },

  // Special configuration for test and manual files
  {
    files: ['tests/**/*.{js,mjs,ts}', 'scripts/**/*.{js,mjs}'],
    rules: {
      'no-console': 'off', // Allow console in test files
      'no-unused-vars': 'off', // Be more lenient with test files
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },

  // Special configuration for k6 load test files
  {
    files: ['tests/load/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly', 
        __ITER: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off'
    }
  },

  // Configuration for all JS/Vue files
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      
      // Console warnings
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      
      // Variable usage
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // Modern JS best practices
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Allow empty catch blocks (common in error handling)
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },

  // Vue files with TypeScript (<script setup lang="ts">)
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: typescriptParser,
        extraFileExtensions: ['.vue']
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      // Disable base rule for TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',  // TypeScript handles this
      
      // TypeScript-specific rules (more lenient for Vue components)
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^(props|emit)$',
        caughtErrors: 'none',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/no-side-effects-in-computed-properties': 'warn',
      'vue/no-mutating-props': 'warn',
      'vue/no-template-shadow': 'warn',
      'vue/require-default-prop': 'off',
      
      // Console warnings
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      
      // Modern practices
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },

  // TypeScript configuration for production code (src + server)
  {
    files: ['src/**/*.ts', 'server/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
        // Removed parserOptions.project to avoid parsing errors
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        NodeJS: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      // Disable base rule for TypeScript
      'no-unused-vars': 'off',
      
      // TypeScript-specific rules (more lenient for production code)
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      
      // Console warnings
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      
      // Modern practices
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },

  // TypeScript configuration for test files (no parserOptions.project)
  {
    files: ['tests/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
        // No project option for test files to avoid parsing errors
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      // Disable base rule for TypeScript
      'no-unused-vars': 'off',
      
      // TypeScript-specific rules (more lenient for tests)
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // Allow console in tests
      'no-console': 'off',
      
      // Modern practices
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },

  // Type definition files often model flexible external payloads
  {
    files: ['src/types/**/*.ts', 'server/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // Frontend logger intentionally wraps console methods
  {
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
