# Favicon Generator

Convierte cualquier imagen (PNG, JPG, SVG, WEBP) en un `favicon.ico` multi-tamaño listo para webs.

Genera los 4 tamaños estándar en un solo archivo: 16×16, 32×32, 48×48 y 64×64 px.

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue en GitHub Pages

1. Edita `vite.config.js` y descomenta la línea `base`, poniendo el nombre de tu repo:
   ```js
   base: '/nombre-de-tu-repo/',
   ```
2. Sube el código a GitHub
3. Ve a **Settings → Pages → Source** y selecciona **GitHub Actions**
4. El workflow de `.github/workflows/deploy.yml` se ejecutará automáticamente en cada push a `main`

## Despliegue en Vercel

Conecta el repo en [vercel.com](https://vercel.com) — detecta Vite automáticamente, sin configuración extra.
