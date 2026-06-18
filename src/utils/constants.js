export const SIZES = [16, 32, 48, 64, 128, 256]

export const COLORS = {
  bg: '#080808',
  card: '#111111',
  border: '#1f1f1f',
  borderDark: '#2a2a2a',
  accent: '#a3e635',
  text: '#f5f5f5',
  textDim: '#525252',
  textDimmer: '#3d3d3d',
  textDimmest: '#404040',
}

export const EXPORT_FORMATS = {
  ico: {
    label: 'favicon.ico',
    description: '16, 32, 48, 64, 128, 256px',
    checked: true,
  },
  pngStandard: {
    label: 'PNG Set (Standard)',
    description: '16, 32, 48, 64px',
    checked: false,
  },
  pngExtended: {
    label: 'PNG Set (Extended)',
    description: '128, 256px',
    checked: false,
  },
  apple: {
    label: 'Apple Touch Icon',
    description: '180x180px',
    checked: false,
  },
  android: {
    label: 'Android Chrome',
    description: '192x192, 512x512px',
    checked: false,
  },
  svg: {
    label: 'favicon.svg',
    description: 'Vector format',
    checked: false,
  },
  manifest: {
    label: 'Manifest + HTML Pack',
    description: 'manifest.json + snippet',
    checked: false,
  },
}

export const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  grayscale: 0,
}

export const DEFAULT_TEXT = {
  content: '',
  x: 50,
  y: 50,
  size: 32,
  color: '#ffffff',
  enabled: false,
}
