"use strict";

var baseRules = require("eslint-config-lydell");

module.exports = {
  root: true,
  plugins: ["jest", "prettier"],
  env: { node: true },
  rules: Object.assign({}, baseRules(), {
    "init-declarations": "off",
    "no-param-reassign": "off",
    "no-var": "off",
    "one-var": "error",
    "prefer-destructuring": "off",
    "prefer-rest-params": "off",
    "prefer-spread": "off",
    "prefer-template": "off",
    "prettier/prettier": "error",
  }),
  overrides: [
    {
      files: ["*.test.js"],
      parserOptions: { sourceType: "module" },
      env: { es6: true, jest: true },
      rules: baseRules({ jest: true }),
    },
  ],
};
