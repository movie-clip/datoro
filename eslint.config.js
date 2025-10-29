import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
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
      'Thumbs.db'
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

  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx,vue}', 'tests/**/*.{ts,js}', 'server/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.app.json', './tsconfig.server.json', './tsconfig.test.json']
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
      
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
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
  }
];
