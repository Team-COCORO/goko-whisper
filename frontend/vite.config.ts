import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "五高の囁き",
        short_name: "五高の囁き",
        lang: "ja",
        display: "standalone",
        background_color: "#f5efeb",
        theme_color: "#1e2d3d",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webp,png,ico}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /survey\.html$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        survey: resolve(import.meta.dirname, "survey.html"),
      },
    },
  },
});
