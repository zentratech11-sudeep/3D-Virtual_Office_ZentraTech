import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber scene code intentionally mutates three.js objects (materials,
    // meshes, renderer) inside useFrame/event callbacks — the standard R3F pattern for
    // per-frame updates without React re-renders. The React Compiler is not enabled, so
    // these compiler-oriented rules do not apply to this folder.
    files: ["src/components/experience/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);
