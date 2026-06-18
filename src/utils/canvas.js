export function applyFilters(ctx, filters) {
  const { brightness, contrast, saturation, hue, grayscale } = filters

  const filterString = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    `hue-rotate(${hue}deg)`,
    `grayscale(${grayscale}%)`,
  ].join(' ')

  ctx.filter = filterString
}

export function drawText(ctx, text, canvasSize) {
  if (!text.content || !text.enabled) return

  const { content, x, y, size, color } = text

  // Scale font size relative to canvas (base size 32 for 64px canvas)
  const scaledSize = Math.floor((size / 64) * canvasSize)

  ctx.font = `700 ${scaledSize}px 'JetBrains Mono', monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Calculate position from percentage
  const posX = (x / 100) * canvasSize
  const posY = (y / 100) * canvasSize

  // Add text shadow for visibility
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4

  ctx.fillText(content, posX, posY)

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function drawToCanvas(canvas, img, fit, bg, filters = null, padding = 0, borderRadius = 0, textOverlay = null) {
  const ctx = canvas.getContext('2d')
  const s = canvas.width

  // Clear canvas
  ctx.clearRect(0, 0, s, s)

  // Save context state
  ctx.save()

  // Background
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, s, s)
  }

  // Calculate drawing area with padding
  const drawSize = s - (padding * 2)
  const offset = padding

  // Apply border radius via clipping
  if (borderRadius > 0) {
    const radius = (drawSize * borderRadius) / 100
    ctx.beginPath()
    ctx.roundRect(offset, offset, drawSize, drawSize, radius)
    ctx.clip()
  }

  // Apply filters
  if (filters) {
    applyFilters(ctx, filters)
  }

  // Draw image with fit mode
  if (fit === 'stretch') {
    ctx.drawImage(img, offset, offset, drawSize, drawSize)
  } else if (fit === 'cover') {
    const sc = Math.max(drawSize / img.width, drawSize / img.height)
    const sw = drawSize / sc
    const sh = drawSize / sc
    const sx = (img.width - sw) / 2
    const sy = (img.height - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh, offset, offset, drawSize, drawSize)
  } else { // contain
    const sc = Math.min(drawSize / img.width, drawSize / img.height)
    const dw = img.width * sc
    const dh = img.height * sc
    const dx = offset + (drawSize - dw) / 2
    const dy = offset + (drawSize - dh) / 2
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  // Reset filter
  ctx.filter = 'none'

  // Restore context for text (no clipping)
  ctx.restore()

  // Draw text overlay
  if (textOverlay) {
    drawText(ctx, textOverlay, s)
  }
}

export function canvasToPng(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      resolve(await blob.arrayBuffer())
    }, 'image/png')
  })
}
