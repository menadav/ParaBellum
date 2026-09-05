import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Puerto del backend en local. Solo se usa al desarrollar.
const API = process.env.API_LOCAL ?? "http://localhost:8030";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Vite rechaza peticiones cuyo Host no reconoce, y el de ngrok
    // cambia en cada sesion. Solo afecta al servidor de desarrollo.
    allowedHosts: [
      ".ngrok-free.dev",
      ".ngrok-free.app",
      ".ngrok.app",
      ".ngrok.io",
    ],
    // Con VITE_API_URL=/api todo sale por el mismo origen que la
    // pagina, asi que un tunel de ngrok al 5173 lleva tambien la API.
    // Apuntar a localhost:8030 solo funciona en tu propia maquina: en
    // el navegador de otro, localhost es SU ordenador.
    proxy: {
      "/api": {
        target: API,
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, ""),
      },
    },
  },
});
