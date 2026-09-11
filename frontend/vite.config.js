import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(),
    tailwindcss(), 
  ],
  build: {
    outDir: "../backend/app/web/dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/web": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});