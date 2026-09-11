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
      // Forwards all /web/* requests to the Go backend.
      // This means the browser always sees one origin (localhost:5173)
      // so the OAuth popup can read the callback response without
      // cross-origin errors, and no CORS config is needed in dev.
      "/web": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});