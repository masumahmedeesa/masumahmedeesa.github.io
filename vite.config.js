import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1400,
    modulePreload: {
      resolveDependencies(_filename, deps, { hostType }) {
        if (hostType !== "html") return deps;

        return deps.filter((dep) => !/\/?(three|motion|TreeExperience|ContentPanel|ContentManager)-/.test(dep));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("node_modules/gsap")) return "motion";
          if (id.includes("node_modules/three") || id.includes("node_modules/@react-three")) return "three";
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
      },
    },
  },
});
