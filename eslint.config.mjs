import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "dayjs",
              message: "Use date-fns. See ADR 014.",
            },
            {
              name: "moment",
              message: "Use date-fns. See ADR 014.",
            },
            {
              name: "luxon",
              message: "Use date-fns. See ADR 014.",
            },
            {
              name: "@prisma/client",
              message: "Use Drizzle ORM. See ADR 003.",
            },
            {
              name: "prisma",
              message: "Use Drizzle ORM. See ADR 003.",
            },
          ],
          patterns: [
            {
              group: ["@prisma/*"],
              message: "Use Drizzle ORM. See ADR 003.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "drizzle/**",
      "supabase/**",
      "coverage/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
