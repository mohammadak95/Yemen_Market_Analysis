module.exports = {
  parser: '@babel/eslint-parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  env: {
    browser: true,
    node: true,
    es6: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  parserOptions: {
    requireConfigFile: false,  // Important for Babel parser to work without a separate Babel config
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  rules: {
    // Add any custom rules you need
  }
};