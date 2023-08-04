import js from "@eslint/js";

export default [
  {
    rules: {
      ...js.recommended,
      curly: "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "SequenceExpression",
          message:
            "The comma operator is confusing and a common mistake. Don’t use it!",
        },
      ],
      "no-var": "error",
      "object-shorthand": "error",
      "one-var": ["error", "never"],
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-destructuring": [
        "error",
        {
          object: true,
          array: false,
        },
      ],
      "prefer-exponentiation-operator": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-spread": "error",
      "prefer-promise-reject-errors": "error",
      "prefer-regex-literals": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
    },
  },
];
