// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import prettierPlugin from 'eslint-plugin-prettier'

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
      './server',
      './stores',
      './types',
    ],
  },
}).append(
  // Your custom configs here
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,vue}'],
    rules: {
      // Custom rules for your project
      'no-console': 'off', // Allow console logs for development
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-case-declarations': 'off',
      'unicorn/prefer-number-properties': 'off', // Allow isNaN
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/no-v-html': 'warn', // Allow v-html but warn
      'vue/require-default-prop': 'off', // Don't require default props
      'vue/no-template-shadow': 'off', // Allow template variable shadowing
      'vue/valid-v-slot': 'off', // Allow v-slot modifiers for Vuetify compatibility
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
      'vue/html-self-closing': [
        'error',
        {
          html: {
            // Avoid conflicts with Prettier for void elements
            void: 'any',
            normal: 'always',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: { max: 5 },
          multiline: { max: 1 },
        },
      ],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: true,
          ignores: [],
        },
      ],
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
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Allow || operator
      '@typescript-eslint/prefer-optional-chain': 'off', // Don't enforce optional chain
      '@typescript-eslint/no-invalid-void-type': 'off', // Allow void in union types
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
      'no-console': 'off', // Allow console logs in plugins/middleware
    },
  },
  {
    files: ['i18n/**/*.ts'],
    rules: {
      // i18n specific rules
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused params in i18n files
    },
  },
  {
    files: ['types/**/*.ts', '**/*.d.ts'],
    rules: {
      // Type definition specific rules
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in type definitions
    },
  },
  {
    // Prettier integration
    files: ['**/*.{js,mjs,cjs,ts,mts,vue}'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  // Put eslint-config-prettier last to disable conflicting formatting rules
  eslintConfigPrettier
)
