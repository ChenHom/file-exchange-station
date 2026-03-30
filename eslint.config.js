import htmlPlugin from 'eslint-plugin-html';
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.html'],
    plugins: {
      html: htmlPlugin
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off'
    }
  }
];
