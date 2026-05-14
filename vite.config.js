import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Si usas GitHub Pages, descomenta la línea de abajo
  // y pon el nombre exacto de tu repositorio:
  // base: '/nombre-de-tu-repo/',
  plugins: [react()],
})
