// Own config so the package stays self-contained: without it vitest walks up and
// loads the repo-root config, which fails in any checkout without root node_modules.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
