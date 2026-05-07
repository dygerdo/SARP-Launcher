import js from "@eslint/js"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import vuePlugin from "eslint-plugin-vue"
import vueParser from "vue-eslint-parser"
import globals from "globals"

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-electron/**",
      "release/**",
      "out/**",
      "build/**",
      "public/**",
      "*.min.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: { "no-console": "off" },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: { "no-console": "off" },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        __GIT_COMMIT__: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        __GIT_COMMIT__: "readonly",
      },
    },
    plugins: { vue: vuePlugin, "@typescript-eslint": tsPlugin },
    rules: {
      ...vuePlugin.configs["vue3-recommended"].rules,
      "no-useless-assignment": "off",
      "vue/multi-word-component-names": "off",
      "vue/html-self-closing": [
        "error",
        {
          html: { void: "always", normal: "always", component: "always" },
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
]
