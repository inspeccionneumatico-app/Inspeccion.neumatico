import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en /<nombre-del-repo>/, por eso el base.
// La salida va a docs/ para poder publicar con "main / docs" sin Actions.
export default defineConfig({
  plugins: [react()],
  base: '/Inspeccion.neumatico/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    // El dataset del reporte (4.493 neumáticos vigentes) va embebido a
    // propósito: así el sitio es un único archivo estático sin fetch. Son
    // ~100 kB comprimidos en total.
    chunkSizeWarningLimit: 1000,
  },
})
