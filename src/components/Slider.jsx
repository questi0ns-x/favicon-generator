import { COLORS } from '../utils/constants'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const sliderContainer = {
  marginBottom: '16px',
}

const sliderLabel = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  fontSize: '11px',
  color: COLORS.textDim,
  ...mono,
}

const sliderValue = {
  color: COLORS.accent,
  fontWeight: 700,
}

const slider = {
  width: '100%',
  height: '4px',
  background: COLORS.borderDark,
  borderRadius: '2px',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
}

export default function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div style={sliderContainer}>
      <label style={sliderLabel}>
        <span>{label}</span>
        <span style={sliderValue}>{value}{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={slider}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${COLORS.accent};
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${COLORS.accent};
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
