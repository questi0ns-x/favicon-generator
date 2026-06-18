import { canvasToPng } from '../canvas'

export async function generateIco(canvases) {
  const pngs = await Promise.all(canvases.map(c => canvasToPng(c)))
  const n = pngs.length
  const directorySize = 6 + 16 * n
  const totalSize = directorySize + pngs.reduce((acc, png) => acc + png.byteLength, 0)

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // ICO header
  view.setUint16(0, 0, true)      // Reserved (must be 0)
  view.setUint16(2, 1, true)      // Type (1 = ICO)
  view.setUint16(4, n, true)      // Number of images

  // Image directory entries
  let dataOffset = directorySize
  for (let i = 0; i < n; i++) {
    const size = canvases[i].width
    const entryOffset = 6 + i * 16

    // Width/Height (0 means 256)
    view.setUint8(entryOffset, size >= 256 ? 0 : size)
    view.setUint8(entryOffset + 1, size >= 256 ? 0 : size)
    view.setUint8(entryOffset + 2, 0)           // Color palette
    view.setUint8(entryOffset + 3, 0)           // Reserved
    view.setUint16(entryOffset + 4, 1, true)    // Color planes
    view.setUint16(entryOffset + 6, 32, true)   // Bits per pixel
    view.setUint32(entryOffset + 8, pngs[i].byteLength, true)  // Image size
    view.setUint32(entryOffset + 12, dataOffset, true)         // Image offset

    dataOffset += pngs[i].byteLength
  }

  // Write PNG data
  let writeOffset = directorySize
  for (const png of pngs) {
    new Uint8Array(buffer, writeOffset, png.byteLength).set(new Uint8Array(png))
    writeOffset += png.byteLength
  }

  return buffer
}
