import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*", "../../../*", "../../../../*", "../../../../../*", "../../../../../../*"],
              message: "Evita imports relativos largos. Usa el alias '@/...'.",
            },
            {
              group: ["../*"],
              message: "Evita imports relativos entre carpetas. Usa el alias '@/...'.",
            },
          ],
        },
      ],
    },
  }
);
