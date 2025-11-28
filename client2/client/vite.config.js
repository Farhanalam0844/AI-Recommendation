import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // proxy all /api calls to your backend
      "/api": "http://localhost:5000"
    }
  }
});
