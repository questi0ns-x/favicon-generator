import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { SIZES, COLORS, EXPORT_FORMATS, DEFAULT_TEXT } from './utils/constants'
import { drawToCanvas } from './utils/canvas'
import { loadImageFromFile, loadImageFromURL } from './utils/image'
import { generateIco } from './utils/generators/ico'
import { createFaviconPack, downloadBlob } from './utils/generators/zip'
import { useFilters } from './hooks/useFilters'
import { useHistory } from './hooks/useHistory'
import CollapsibleCard from './components/CollapsibleCard'
import Slider from './components/Slider'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '1.25rem',
}

const sectionLabel = {
  fontSize: '10px',
  letterSpacing: '0.12em',
  color: COLORS.accent,
  marginBottom: '12px',
  display: 'block',
  ...mono,
}

const pillBtn = (active) => ({
  ...mono,
  fontSize: '12px',
  padding: '7px 12px',
  borderRadius: '6px',
  border: `1px solid ${active ? COLORS.accent : COLORS.borderDark}`,
  background: active ? COLORS.accent : 'transparent',
  color: active ? COLORS.bg : COLORS.textDim,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s',
  fontWeight: active ? 700 : 400,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

export default function App() {
  const [image, setImage] = useState(null)
  const [filename, setFilename] = useState('')
  const [fit, setFit] = useState('cover')
  const [bgType, setBgType] = useState('transparent')
  const [bgColor, setBgColor] = useState(COLORS.accent)
  const [padding, setPadding] = useState(0)
  const [borderRadius, setBorderRadius] = useState(0)
  const [textOverlay, setTextOverlay] = useState(DEFAULT_TEXT)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [selectedFormats, setSelectedFormats] = useState(
    Object.keys(EXPORT_FORMATS).reduce((acc, key) => {
      acc[key] = EXPORT_FORMATS[key].checked
      return acc
    }, {})
  )
  const [siteName, setSiteName] = useState('My Site')
  const [themeColor, setThemeColor] = useState(COLORS.accent)

  const { filters, updateFilter, resetFilters } = useFilters()
  const { history, currentIndex, addToHistory, undo, redo, canUndo, canRedo } = useHistory()

  const canvasRefs = useRef({})
  const browserRef = useRef(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  // Prevent default drag/drop on document
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('dragover', preventDefaults)
    document.addEventListener('drop', preventDefaults)
    return () => {
      document.removeEventListener('dragover', preventDefaults)
      document.removeEventListener('drop', preventDefaults)
    }
  }, [])

  const getBg = useCallback(() => {
    if (bgType === 'transparent') return null
    if (bgType === 'white') return '#ffffff'
    if (bgType === 'black') return '#000000'
    return bgColor
  }, [bgType, bgColor])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    try {
      const img = await loadImageFromFile(file)
      setImage(img)
      setFilename(file.name)
      addToHistory({ img, filename: file.name })
    } catch (err) {
      console.error(err)
    }
  }, [addToHistory])

  const handleURL = async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    setUrlError('')
    try {
      const img = await loadImageFromURL(urlInput)
      setImage(img)
      setFilename('image-from-url')
      addToHistory({ img, filename: 'image-from-url' })
      setUrlInput('')
    } catch (err) {
      setUrlError(err.message)
    }
    setUrlLoading(false)
  }

  // Handle paste
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) handleFile(file)
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleFile])

  // Render canvases with debounce
  const renderAllCanvases = useCallback(() => {
    if (!image) return
    const bg = getBg()
    SIZES.forEach(sz => {
      const c = canvasRefs.current[sz]
      if (c) drawToCanvas(c, image, fit, bg, filters, padding, borderRadius, textOverlay)
    })
    if (browserRef.current) {
      drawToCanvas(browserRef.current, image, fit, bg, filters, padding, borderRadius, textOverlay)
    }
  }, [image, fit, getBg, filters, padding, borderRadius, textOverlay])

  const debouncedRender = useMemo(() => {
    let timeout
    return () => {
      clearTimeout(timeout)
      timeout = setTimeout(renderAllCanvases, 150)
    }
  }, [renderAllCanvases])

  useEffect(() => {
    debouncedRender()
  }, [debouncedRender])

  const download = async () => {
    setStatus('generating...')

    const canvases = SIZES.map(sz => canvasRefs.current[sz]).filter(Boolean)

    // Check if only ICO selected
    const onlyIco = selectedFormats.ico && Object.entries(selectedFormats).filter(([k, v]) => v && k !== 'ico').length === 0

    if (onlyIco) {
      // Single ICO download
      const buf = await generateIco(canvases)
      const blob = new Blob([buf], { type: 'image/x-icon' })
      downloadBlob(blob, 'favicon.ico')
      setStatus('done. 6 sizes packed → 16 32 48 64 128 256')
    } else {
      // Multi-format ZIP download
      const settings = {
        fit,
        background: getBg(),
        filters,
        padding,
        borderRadius,
        text: textOverlay,
      }
      const zipBlob = await createFaviconPack(canvases, image, settings, selectedFormats, { siteName, themeColor })
      downloadBlob(zipBlob, 'favicon-pack.zip')
      setStatus('done. zip downloaded with selected formats')
    }

    setTimeout(() => setStatus(''), 5000)
  }

  const copySnippet = () => {
    navigator.clipboard.writeText('<link rel="icon" type="image/x-icon" href="/favicon.ico">')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUndo = () => {
    const entry = undo()
    if (entry) {
      setImage(entry.img)
      setFilename(entry.filename)
    }
  }

  const handleRedo = () => {
    const entry = redo()
    if (entry) {
      setImage(entry.img)
      setFilename(entry.filename)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, position: 'relative', overflow: 'hidden', ...mono }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(#161616 1px, transparent 1px), linear-gradient(90deg, #161616 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Lime ambient glow */}
      <div style={{
        position: 'fixed', top: -300, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(163,230,53,0.06) 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '52px 24px 96px' }}>

        {/* Header */}
        <header style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', ...mono }}>
                FAVGEN
              </h1>
              <span style={{ fontSize: '12px', color: COLORS.textDimmer, ...mono }}>v2.0.0</span>
            </div>
            {image && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  style={{
                    ...mono,
                    fontSize: '11px',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: `1px solid ${canUndo ? COLORS.borderDark : COLORS.border}`,
                    color: canUndo ? COLORS.textDim : COLORS.textDimmer,
                    borderRadius: '6px',
                    cursor: canUndo ? 'pointer' : 'not-allowed',
                  }}
                >
                  ← Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  style={{
                    ...mono,
                    fontSize: '11px',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: `1px solid ${canRedo ? COLORS.borderDark : COLORS.border}`,
                    color: canRedo ? COLORS.textDim : COLORS.textDimmer,
                    borderRadius: '6px',
                    cursor: canRedo ? 'pointer' : 'not-allowed',
                  }}
                >
                  Redo →
                </button>
              </div>
            )}
          </div>
          <p style={{ fontSize: '12px', color: COLORS.textDim, margin: 0, lineHeight: 1.6 }}>
            drop an image. get multi-format favicons with filters, text, and more.
          </p>
          <div style={{ marginTop: '16px', height: '1px', background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
        </header>

        {!image ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => document.getElementById('fileInput').click()}
              style={{
                border: `1.5px dashed ${dragging ? COLORS.accent : COLORS.borderDark}`,
                borderRadius: '16px',
                padding: '80px 32px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: dragging ? 'rgba(163,230,53,0.03)' : 'rgba(255,255,255,0.01)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '20px', opacity: dragging ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                ⬡
              </div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', margin: '0 0 8px', letterSpacing: '0.05em' }}>
                DROP IMAGE HERE
              </p>
              <p style={{ fontSize: '11px', color: COLORS.textDimmest, margin: 0 }}>
                or click to select · png jpg svg webp · paste with Ctrl+V
              </p>
              <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* URL Input */}
            <div style={card}>
              <span style={sectionLabel}>// OR LOAD FROM URL</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: urlError ? '8px' : 0 }}>
                <input
                  type="text"
                  placeholder="https://example.com/image.png"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleURL()}
                  style={{
                    flex: 1,
                    ...mono,
                    fontSize: '11px',
                    padding: '9px 12px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.borderDark}`,
                    borderRadius: '6px',
                    color: COLORS.text,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleURL}
                  disabled={urlLoading || !urlInput.trim()}
                  style={{
                    ...mono,
                    fontSize: '11px',
                    padding: '9px 16px',
                    background: urlLoading ? COLORS.borderDark : COLORS.accent,
                    color: COLORS.bg,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: urlLoading || !urlInput.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {urlLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
              {urlError && (
                <p style={{ fontSize: '10px', color: '#ff5f57', margin: 0, ...mono }}>
                  {urlError}
                </p>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Controls - Fit & Background */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={card}>
                <span style={sectionLabel}>// FIT MODE</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[['cover', 'crop to fill'], ['contain', 'fit inside'], ['stretch', 'stretch']].map(([v, l]) => (
                    <button key={v} onClick={() => setFit(v)} style={pillBtn(fit === v)}>
                      <span>{fit === v ? '▶ ' : '  '}{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={card}>
                <span style={sectionLabel}>// BACKGROUND</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    ['transparent', 'transparent', null],
                    ['white', '#ffffff', null],
                    ['black', '#000000', null],
                    ['custom', 'custom color', bgColor],
                  ].map(([v, l, swatch]) => (
                    <button key={v} onClick={() => setBgType(v)} style={pillBtn(bgType === v)}>
                      <span>{bgType === v ? '▶ ' : '  '}{l}</span>
                      {swatch && (
                        <input
                          type="color" value={bgColor}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { setBgColor(e.target.value); setBgType('custom') }}
                          style={{ width: '18px', height: '14px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters */}
            <CollapsibleCard title="// FILTERS & EFFECTS">
              <Slider label="Brightness" value={filters.brightness} min={0} max={200} unit="%" onChange={v => updateFilter('brightness', v)} />
              <Slider label="Contrast" value={filters.contrast} min={0} max={200} unit="%" onChange={v => updateFilter('contrast', v)} />
              <Slider label="Saturation" value={filters.saturation} min={0} max={200} unit="%" onChange={v => updateFilter('saturation', v)} />
              <Slider label="Hue Rotate" value={filters.hue} min={0} max={360} unit="°" onChange={v => updateFilter('hue', v)} />
              <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} unit="%" onChange={v => updateFilter('grayscale', v)} />
              <button
                onClick={resetFilters}
                style={{
                  ...mono,
                  fontSize: '11px',
                  padding: '8px',
                  background: 'transparent',
                  border: `1px solid ${COLORS.borderDark}`,
                  color: COLORS.textDim,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px',
                }}
              >
                RESET FILTERS
              </button>
            </CollapsibleCard>

            {/* Padding & Border */}
            <CollapsibleCard title="// PADDING & BORDER" defaultOpen={false}>
              <Slider label="Padding" value={padding} min={0} max={32} unit="px" onChange={setPadding} />
              <Slider label="Border Radius" value={borderRadius} min={0} max={50} unit="%" onChange={setBorderRadius} />
            </CollapsibleCard>

            {/* Text Overlay */}
            <CollapsibleCard title="// TEXT OVERLAY" defaultOpen={false}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '11px', color: COLORS.textDim, ...mono }}>
                <input
                  type="checkbox"
                  checked={textOverlay.enabled}
                  onChange={e => setTextOverlay(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <span>Enable text overlay</span>
              </label>
              {textOverlay.enabled && (
                <>
                  <input
                    type="text"
                    placeholder="Enter text or emoji"
                    value={textOverlay.content}
                    onChange={e => setTextOverlay(prev => ({ ...prev, content: e.target.value }))}
                    style={{
                      width: '100%',
                      ...mono,
                      fontSize: '11px',
                      padding: '9px 12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.borderDark}`,
                      borderRadius: '6px',
                      color: COLORS.text,
                      outline: 'none',
                      marginBottom: '16px',
                    }}
                  />
                  <Slider label="Position X" value={textOverlay.x} min={0} max={100} unit="%" onChange={v => setTextOverlay(prev => ({ ...prev, x: v }))} />
                  <Slider label="Position Y" value={textOverlay.y} min={0} max={100} unit="%" onChange={v => setTextOverlay(prev => ({ ...prev, y: v }))} />
                  <Slider label="Size" value={textOverlay.size} min={8} max={64} unit="px" onChange={v => setTextOverlay(prev => ({ ...prev, size: v }))} />
                  <label style={{ fontSize: '11px', color: COLORS.textDim, marginBottom: '8px', display: 'block', ...mono }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={textOverlay.color}
                    onChange={e => setTextOverlay(prev => ({ ...prev, color: e.target.value }))}
                    style={{ width: '100%', height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </>
              )}
            </CollapsibleCard>

            {/* Preview */}
            <div style={card}>
              <span style={sectionLabel}>// PREVIEW</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', flexWrap: 'wrap' }}>
                {SIZES.map(sz => (
                  <div key={sz} style={{ textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block', borderRadius: '4px', overflow: 'hidden',
                      border: `1px solid ${COLORS.borderDark}`,
                      background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #0d0d0d 0% 50%) 0 0 / 8px 8px',
                    }}>
                      <canvas
                        ref={el => canvasRefs.current[sz] = el}
                        width={sz} height={sz}
                        style={{ display: 'block', imageRendering: 'pixelated' }}
                      />
                    </div>
                    <p style={{ fontSize: '10px', color: COLORS.textDimmest, margin: '6px 0 0', ...mono }}>{sz}px</p>
                  </div>
                ))}

                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: COLORS.textDimmest, margin: '0 0 6px', letterSpacing: '0.08em' }}>// BROWSER TAB</p>
                  <div style={{
                    background: '#141414', border: `1px solid #222`, borderRadius: '8px',
                    padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                    minWidth: '160px',
                  }}>
                    <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
                      {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                        <div key={c} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c }} />
                      ))}
                    </div>
                    <canvas ref={browserRef} width={16} height={16}
                      style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: COLORS.textDimmest, whiteSpace: 'nowrap' }}>
                      mi-sitio.com
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Formats */}
            <CollapsibleCard title="// EXPORT FORMATS">
              {Object.entries(EXPORT_FORMATS).map(([key, config]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedFormats[key]}
                    onChange={e => setSelectedFormats(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '11px', color: COLORS.text, fontWeight: 500, ...mono }}>
                      {config.label}
                    </div>
                    <div style={{ fontSize: '10px', color: COLORS.textDim, ...mono }}>
                      {config.description}
                    </div>
                  </div>
                </label>
              ))}
              {selectedFormats.manifest && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${COLORS.border}` }}>
                  <label style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '6px', display: 'block', ...mono }}>
                    Site Name (for manifest)
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    style={{
                      width: '100%',
                      ...mono,
                      fontSize: '11px',
                      padding: '8px 12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.borderDark}`,
                      borderRadius: '6px',
                      color: COLORS.text,
                      outline: 'none',
                      marginBottom: '12px',
                    }}
                  />
                  <label style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '6px', display: 'block', ...mono }}>
                    Theme Color
                  </label>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={e => setThemeColor(e.target.value)}
                    style={{ width: '100%', height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              )}
            </CollapsibleCard>

            {/* Download */}
            <button
              onClick={download}
              disabled={!Object.values(selectedFormats).some(v => v)}
              style={{
                width: '100%', padding: '15px', background: Object.values(selectedFormats).some(v => v) ? COLORS.accent : COLORS.borderDark,
                color: COLORS.bg, border: 'none', borderRadius: '10px',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
                cursor: Object.values(selectedFormats).some(v => v) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s', ...mono,
              }}
              onMouseEnter={e => Object.values(selectedFormats).some(v => v) && (e.currentTarget.style.background = '#bef264', e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.background = Object.values(selectedFormats).some(v => v) ? COLORS.accent : COLORS.borderDark, e.currentTarget.style.transform = 'translateY(0)')}
            >
              GENERATE + DOWNLOAD
            </button>

            {status && (
              <p style={{ fontSize: '11px', color: COLORS.accent, margin: 0, textAlign: 'center', letterSpacing: '0.04em' }}>
                ✓ {status}
              </p>
            )}

            {/* HTML Snippet */}
            <div style={card}>
              <span style={sectionLabel}>// HTML SNIPPET</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{
                  flex: 1, fontSize: '11px', color: COLORS.textDim,
                  background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                  borderRadius: '6px', padding: '9px 12px',
                  display: 'block', overflow: 'auto', whiteSpace: 'nowrap', ...mono,
                }}>
                  {'<link rel="icon" type="image/x-icon" href="/favicon.ico">'}
                </code>
                <button
                  onClick={copySnippet}
                  style={{
                    flexShrink: 0, fontSize: '11px', padding: '9px 14px',
                    background: copied ? COLORS.accent : 'transparent',
                    border: `1px solid ${copied ? COLORS.accent : COLORS.borderDark}`,
                    color: copied ? COLORS.bg : COLORS.textDim,
                    borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s', ...mono,
                  }}
                >
                  {copied ? 'copied!' : 'copy'}
                </button>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setImage(null)
                setFilename('')
              }}
              style={{
                background: 'transparent', border: `1px solid ${COLORS.border}`,
                color: COLORS.textDimmer, borderRadius: '8px', padding: '8px',
                fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', ...mono,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = COLORS.textDim; e.currentTarget.style.borderColor = COLORS.borderDark }}
              onMouseLeave={e => { e.currentTarget.style.color = COLORS.textDimmer; e.currentTarget.style.borderColor = COLORS.border }}
            >
              ← new image
            </button>

          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.borderDark}; border-radius: 2px; }
        ::selection { background: ${COLORS.accent}; color: ${COLORS.bg}; }
      `}</style>
    </div>
  )
}
