"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  env: { node: true },
  rules: {
    "one-var": "error",
  },
  overrides: [
    {
      files: ["*.test.js"],
      extends: ["plugin:jest/recommended", "plugin:jest/style"],
      parserOptions: { sourceType: "module" },
      env: { es6: true, jest: true },
      rules: {
        "one-var": "off",
      },
    },
  ],
};
