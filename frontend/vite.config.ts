import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  preview: {
    allowedHosts: [
      'zesty-surprise-production-0d64.up.railway.app',
      'mova.tec.br',
      'www.mova.tec.br',
    ],
  },
})
