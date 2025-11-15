const globals = require("globals");

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
    },
  },
];
