import { useState, useEffect, useRef, useCallback } from 'react'

const SIZES = [16, 32, 48, 64]

function drawToCanvas(canvas, img, fit, bg) {
  const ctx = canvas.getContext('2d')
  const s = canvas.width
  ctx.clearRect(0, 0, s, s)
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s) }
  if (fit === 'stretch') {
    ctx.drawImage(img, 0, 0, s, s)
  } else if (fit === 'cover') {
    const sc = Math.max(s / img.width, s / img.height)
    const sw = s / sc, sh = s / sc
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, s, s)
  } else {
    const sc = Math.min(s / img.width, s / img.height)
    const dw = img.width * sc, dh = img.height * sc
    ctx.drawImage(img, (s - dw) / 2, (s - dh) / 2, dw, dh)
  }
}

function canvasToPng(c) {
  return new Promise(r => c.toBlob(async b => r(await b.arrayBuffer()), 'image/png'))
}

async function generateIco(canvases) {
  const pngs = await Promise.all(canvases.map(c => canvasToPng(c)))
  const n = pngs.length, ds = 6 + 16 * n
  const tot = ds + pngs.reduce((a, b) => a + b.byteLength, 0)
  const buf = new ArrayBuffer(tot)
  const v = new DataView(buf)
  v.setUint16(0, 0, true); v.setUint16(2, 1, true); v.setUint16(4, n, true)
  let off = ds
  for (let i = 0; i < n; i++) {
    const sz = SIZES[i], b = 6 + i * 16
    v.setUint8(b, sz >= 256 ? 0 : sz); v.setUint8(b + 1, sz >= 256 ? 0 : sz)
    v.setUint8(b + 2, 0); v.setUint8(b + 3, 0)
    v.setUint16(b + 4, 1, true); v.setUint16(b + 6, 32, true)
    v.setUint32(b + 8, pngs[i].byteLength, true); v.setUint32(b + 12, off, true)
    off += pngs[i].byteLength
  }
  let wo = ds
  for (const p of pngs) { new Uint8Array(buf, wo, p.byteLength).set(new Uint8Array(p)); wo += p.byteLength }
  return buf
}

export default function App() {
  const [image, setImage] = useState(null)
  const [fit, setFit] = useState('cover')
  const [bgType, setBgType] = useState('transparent')
  const [bgColor, setBgColor] = useState('#a3e635')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRefs = useRef({})
  const browserRef = useRef(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  const getBg = useCallback(() => {
    if (bgType === 'transparent') return null
    if (bgType === 'white') return '#ffffff'
    if (bgType === 'black') return '#000000'
    return bgColor
  }, [bgType, bgColor])

  useEffect(() => {
    if (!image) return
    const bg = getBg()
    SIZES.forEach(sz => { const c = canvasRefs.current[sz]; if (c) drawToCanvas(c, image, fit, bg) })
    if (browserRef.current) drawToCanvas(browserRef.current, image, fit, bg)
  }, [image, fit, getBg])

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => setImage(img)
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const download = async () => {
    setStatus('generating...')
    const buf = await generateIco(SIZES.map(sz => canvasRefs.current[sz]))
    const blob = new Blob([buf], { type: 'image/x-icon' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'favicon.ico'; a.click()
    URL.revokeObjectURL(url)
    setStatus('done. 4 sizes packed → 16 32 48 64')
    setTimeout(() => setStatus(''), 5000)
  }

  const copySnippet = () => {
    navigator.clipboard.writeText('<link rel="icon" type="image/x-icon" href="/favicon.ico">')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mono = { fontFamily: "'JetBrains Mono', monospace" }

  const card = {
    background: '#111111',
    border: '1px solid #1f1f1f',
    borderRadius: '12px',
    padding: '1.25rem',
  }

  const sectionLabel = {
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: '#a3e635',
    marginBottom: '12px',
    display: 'block',
    ...mono,
  }

  const pillBtn = (active) => ({
    ...mono,
    fontSize: '12px',
    padding: '7px 12px',
    borderRadius: '6px',
    border: `1px solid ${active ? '#a3e635' : '#2a2a2a'}`,
    background: active ? '#a3e635' : 'transparent',
    color: active ? '#080808' : '#737373',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontWeight: active ? 700 : 400,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f5f5f5', position: 'relative', overflow: 'hidden', ...mono }}>

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
        background: 'radial-gradient(ellipse, rgba(163,230,53,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '52px 24px 96px' }}>

        {/* Header */}
        <header style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', ...mono }}>
              FAVGEN
            </h1>
            <span style={{ fontSize: '12px', color: '#3d3d3d', ...mono }}>v1.0.0</span>
          </div>
          <p style={{ fontSize: '12px', color: '#525252', margin: 0, lineHeight: 1.6 }}>
            drop an image. get a .ico with 16 32 48 64px — ready for production.
          </p>
          <div style={{ marginTop: '16px', height: '1px', background: 'linear-gradient(90deg, #1f1f1f, transparent)' }} />
        </header>

        {!image ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => document.getElementById('fileInput').click()}
            style={{
              border: `1.5px dashed ${dragging ? '#a3e635' : '#2a2a2a'}`,
              borderRadius: '16px',
              padding: '80px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: dragging ? 'rgba(163,230,53,0.03)' : 'rgba(255,255,255,0.01)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '20px', opacity: dragging ? 1 : 0.4, transition: 'opacity 0.2s' }}>
              ⬡
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', margin: '0 0 8px', letterSpacing: '0.05em' }}>
              DROP IMAGE HERE
            </p>
            <p style={{ fontSize: '11px', color: '#404040', margin: 0 }}>
              or click to select · png jpg svg webp
            </p>
            <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Controls row */}
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

            {/* Preview card */}
            <div style={card}>
              <span style={sectionLabel}>// PREVIEW</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', flexWrap: 'wrap' }}>
                {SIZES.map(sz => (
                  <div key={sz} style={{ textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block', borderRadius: '4px', overflow: 'hidden',
                      border: '1px solid #2a2a2a',
                      background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #0d0d0d 0% 50%) 0 0 / 8px 8px',
                    }}>
                      <canvas
                        ref={el => canvasRefs.current[sz] = el}
                        width={sz} height={sz}
                        style={{ display: 'block', imageRendering: 'pixelated' }}
                      />
                    </div>
                    <p style={{ fontSize: '10px', color: '#404040', margin: '6px 0 0', ...mono }}>{sz}px</p>
                  </div>
                ))}

                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', color: '#404040', margin: '0 0 6px', letterSpacing: '0.08em' }}>// BROWSER TAB</p>
                  <div style={{
                    background: '#141414', border: '1px solid #222', borderRadius: '8px',
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
                    <span style={{ fontSize: '11px', color: '#404040', whiteSpace: 'nowrap' }}>
                      mi-sitio.com
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Download */}
            <button
              onClick={download}
              style={{
                width: '100%', padding: '15px', background: '#a3e635',
                color: '#080808', border: 'none', borderRadius: '10px',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all 0.15s', ...mono,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#bef264'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#a3e635'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              GENERATE + DOWNLOAD FAVICON.ICO
            </button>

            {status && (
              <p style={{ fontSize: '11px', color: '#a3e635', margin: 0, textAlign: 'center', letterSpacing: '0.04em' }}>
                ✓ {status}
              </p>
            )}

            {/* Snippet */}
            <div style={card}>
              <span style={sectionLabel}>// HTML SNIPPET</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{
                  flex: 1, fontSize: '11px', color: '#525252',
                  background: '#0d0d0d', border: '1px solid #1a1a1a',
                  borderRadius: '6px', padding: '9px 12px',
                  display: 'block', overflow: 'auto', whiteSpace: 'nowrap', ...mono,
                }}>
                  {'<link rel="icon" type="image/x-icon" href="/favicon.ico">'}
                </code>
                <button
                  onClick={copySnippet}
                  style={{
                    flexShrink: 0, fontSize: '11px', padding: '9px 14px',
                    background: copied ? '#a3e635' : 'transparent',
                    border: `1px solid ${copied ? '#a3e635' : '#2a2a2a'}`,
                    color: copied ? '#080808' : '#525252',
                    borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s', ...mono,
                  }}
                >
                  {copied ? 'copied!' : 'copy'}
                </button>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => setImage(null)}
              style={{
                background: 'transparent', border: '1px solid #1a1a1a',
                color: '#3d3d3d', borderRadius: '8px', padding: '8px',
                fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', ...mono,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#737373'; e.currentTarget.style.borderColor = '#2a2a2a' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3d3d3d'; e.currentTarget.style.borderColor = '#1a1a1a' }}
            >
              ← new image
            </button>

          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        ::selection { background: #a3e635; color: #080808; }
      `}</style>
    </div>
  )
}
