import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Vite rechaza peticiones cuyo Host no reconoce, y el de ngrok
    // cambia en cada sesion. Solo afecta al servidor de desarrollo.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
  },
});
