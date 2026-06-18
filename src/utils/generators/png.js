import { drawToCanvas } from '../canvas'

export const PNG_SIZES = {
  standard: [16, 32, 48, 64],
  extended: [128, 256],
  apple: 180,
  android: [192, 512],
}

export async function generatePngBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

export async function generatePngSet(img, settings, selectedFormats) {
  const results = {}
  const { fit, background, filters, padding, borderRadius, text } = settings

  // Helper to create canvas and render
  const createPng = async (size, filename) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    drawToCanvas(canvas, img, fit, background, filters, padding, borderRadius, text)
    const blob = await generatePngBlob(canvas)
    return { filename, blob }
  }

  // Standard PNGs
  if (selectedFormats.pngStandard) {
    for (const size of PNG_SIZES.standard) {
      const png = await createPng(size, `${size}.png`)
      results[png.filename] = png.blob
    }
  }

  // Extended PNGs
  if (selectedFormats.pngExtended) {
    for (const size of PNG_SIZES.extended) {
      const png = await createPng(size, `${size}.png`)
      results[png.filename] = png.blob
    }
  }

  // Apple Touch Icon
  if (selectedFormats.apple) {
    const png = await createPng(PNG_SIZES.apple, 'apple-touch-icon.png')
    results[png.filename] = png.blob
  }

  // Android Chrome
  if (selectedFormats.android) {
    for (const size of PNG_SIZES.android) {
      const png = await createPng(size, `android-chrome-${size}x${size}.png`)
      results[png.filename] = png.blob
    }
  }

  return results
}
