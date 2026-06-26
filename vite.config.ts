import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/orders-dashboard/" : "/",
  plugins: [react(), svgr(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // if (id.includes("node_modules")) {
            // if (id.includes("react")) return "react";
            // if (id.includes("lodash")) return "lodash";
            // return "vendor";
          // }
          if (id.includes("/Accordion/")) {
            return "accordion";
          }
        },
      },
    },
  },
});
