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
      '.github/**'
    ]
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
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.app.json', './tsconfig.server.json']
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
