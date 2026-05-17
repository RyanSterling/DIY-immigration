import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/frontend/index.ts",
    "src/backend/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
});