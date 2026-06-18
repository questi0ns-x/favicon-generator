import JSZip from 'jszip'
import { generateIco } from './ico'
import { generatePngSet } from './png'
import { generateManifest, generateHtmlSnippet, generateSVG } from './manifest'

export async function createFaviconPack(canvases, img, settings, selectedFormats, manifestOptions = {}) {
  const zip = new JSZip()

  // Add .ico
  if (selectedFormats.ico) {
    const icoBuffer = await generateIco(canvases)
    zip.file('favicon.ico', icoBuffer)
  }

  // Add PNGs
  const pngs = await generatePngSet(img, settings, selectedFormats)
  Object.entries(pngs).forEach(([filename, blob]) => {
    zip.file(filename, blob)
  })

  // Add SVG
  if (selectedFormats.svg) {
    const svgCanvas = canvases.find(c => c.width === 64) || canvases[0]
    const svgContent = generateSVG(svgCanvas)
    zip.file('favicon.svg', svgContent)
  }

  // Add manifest + HTML
  if (selectedFormats.manifest) {
    const { siteName, themeColor } = manifestOptions
    const manifestContent = generateManifest(siteName, themeColor)
    const htmlContent = generateHtmlSnippet({ includeSVG: selectedFormats.svg, themeColor })

    zip.file('manifest.json', manifestContent)
    zip.file('favicon-snippet.html', htmlContent)
  }

  // Generate zip blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return blob
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
