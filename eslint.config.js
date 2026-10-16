import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vitepress/cache/**',
      '**/.vitepress/dist/**',
      '**/coverage/**',
      '**/public/**',
      '**/*.md',
    ],
  },

  // 基础：捕获低级错误（未定义变量、语法错误、重复声明等），不做风格强制
  js.configs.recommended,

  // Vue 单文件组件：仅启用 essential 规则（捕获运行/编译期错误，不强制模板风格）
  ...vue.configs['flat/essential'],

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': 'off',
    },
  },

  // 后端为 CommonJS
  {
    files: ['apps/server/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  // Vue <script> 按 ESM 解析
  {
    files: ['**/*.vue'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
]
