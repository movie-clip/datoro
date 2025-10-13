import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

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
  }
];
