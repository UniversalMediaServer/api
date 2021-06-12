module.exports = {
    "env": {
      "es6": true,
      "node": true
    },
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "globals": {
      "Atomics": "readonly",
      "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "plugins": [
      "@typescript-eslint"
    ],
    "parserOptions": {
      "ecmaVersion": 2018,
      "project": "./tsconfig.json",
      "sourceType": "module"
    },
    "rules": {
      "@typescript-eslint/ban-ts-ignore": "off",
      "array-bracket-spacing": "error",
      "block-spacing": "error",
      "comma-dangle": [
        "error",
        "always-multiline"
      ],
      "comma-spacing": "error",
      "comma-style": "error",
      "computed-property-spacing": "error",
      "curly": "error",
      "eol-last": "error",
      "func-call-spacing": "error",
      "function-paren-newline": "error",
      "indent": [
        "error",
        2,
        {
          "SwitchCase": 1
        }
      ],
      "key-spacing": "error",
      "keyword-spacing": "error",
      "linebreak-style": [
        "off",
        "unix"
      ],
      "newline-per-chained-call": "error",
      "no-console": "off",
      "no-multiple-empty-lines": "error",
      "no-unused-vars": [
        "error",
        {
          "args": "none"
        }
      ],
      "no-whitespace-before-property": "error",
      "object-curly-newline": [
        "error",
        {
          "multiline": true
        }
      ],
      "object-curly-spacing": [
        "error",
        "always"
      ],
      "object-property-newline": [
        "error",
        {
          "allowAllPropertiesOnSameLine": true
        }
      ],
      "padded-blocks": [
        "error",
        "never"
      ],
      "quote-props": [
        "error",
        "consistent"
      ],
      "quotes": [
        "error",
        "single"
      ],
      "semi": "error",
      "semi-spacing": "error",
      "space-before-blocks": "error",
      "space-before-function-paren": [
        "error",
        "never"
      ],
      "space-in-parens": "error",
      "spaced-comment": "error"
    }
  };
