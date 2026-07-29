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
  },
})
