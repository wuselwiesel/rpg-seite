import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next.nosync/**",
    "node_modules.nosync/**",
    "node_modules.old/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Erzeugte Test-Bundles (e2e)
    "e2e/**/.build/**",
  ]),
]);

export default eslintConfig;
