"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  env: { node: true },
  rules: {
    "one-var": "error",
  },
  parserOptions: { sourceType: "module" },
  env: { es6: true },
  overrides: [
    {
      files: ["*.test.js"],
      extends: ["plugin:jest/recommended", "plugin:jest/style"],
      rules: {
        "one-var": "off",
      },
    },
  ],
};
