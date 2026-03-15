// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'node_modules/**',
      'dist/**',
      'generated/**',
      'prisma/generated/**',
      'prisma/migrations/**'
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // ✅ SECURITY FIX: Ban unsafe SQL queries (Phase 1 Production Blocker #1)
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='$executeRawUnsafe']",
          message:
            '❌ SECURITY: $executeRawUnsafe is banned due to SQL injection risk. Use $executeRaw with template literals instead: prisma.$executeRaw`...`',
        },
        {
          selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
          message:
            '⚠️  SECURITY: $queryRawUnsafe is banned due to SQL injection risk. Use $queryRaw with template literals instead: prisma.$queryRaw`...`',
        },
      ],
    },
  },
);
