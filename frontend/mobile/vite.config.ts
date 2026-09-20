import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server:{
    port: 5500
  },
  plugins: [solid({ hot: false }), tailwindcss()],
  root: "./src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
