import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "src/core/sync.ts",
      "src/core/state.ts",
      "src/core/economy.ts",
      "index.html",
      "tests/.test-output/",
      "traces/",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-this-alias": "off",
    },
  }
);
