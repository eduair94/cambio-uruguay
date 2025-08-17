// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
  },
  dirs: {
    src: [
      './pages',
      './components',
      './composables',
      './utils',
      './layouts',
      './plugins',
      './middleware',
      './assets',
    ],
  },
}).append(
  // Your custom configs here
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,vue}'],
    rules: {
      // Custom rules for your project
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/html-self-closing': ['error', {
        html: {
          void: 'always',
          normal: 'always',
          component: 'always',
        },
        svg: 'always',
        math: 'always',
      }],
      'vue/max-attributes-per-line': ['error', {
        singleline: { max: 3 },
        multiline: { max: 1 },
      }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        registeredComponentsOnly: true,
        ignores: [],
      }],
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: './tsconfig.json',
        extraFileExtensions: ['.vue'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'off', // Allow any types
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  },
  {
    files: ['server/**/*.ts'],
    rules: {
      // Server-side specific rules
      'no-console': 'off', // Allow console logs in server-side code
    },
  },
  {
    files: ['plugins/**/*.{js,ts}', 'middleware/**/*.{js,ts}'],
    rules: {
      // Plugin and middleware specific rules
      'no-console': 'warn',
    },
  },
)
