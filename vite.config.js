import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ["gsap"],
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
