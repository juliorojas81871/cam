const eslintConfig = [
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/coverage/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;
