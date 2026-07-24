module.exports = {
  root: true,
  extends: ['@rdcs/eslint-config'],
  env: {
    node: true,
    es2022: true,
    browser: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    '*.d.ts',
    'coverage/',
    '.turbo/',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};
