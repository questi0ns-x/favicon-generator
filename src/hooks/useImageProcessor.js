import { useState } from 'react'
import { DEFAULT_FILTERS, DEFAULT_TEXT } from '../utils/constants'

export function useImageProcessor() {
  const [currentImage, setCurrentImage] = useState(null)
  const [fit, setFit] = useState('cover')
  const [bgType, setBgType] = useState('transparent')
  const [bgColor, setBgColor] = useState('#a3e635')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [padding, setPadding] = useState(0)
  const [borderRadius, setBorderRadius] = useState(0)
  const [textOverlay, setTextOverlay] = useState(DEFAULT_TEXT)
  const [comparisonBase, setComparisonBase] = useState(null)
  const [batchImages, setBatchImages] = useState([])

  const getBg = () => {
    if (bgType === 'transparent') return null
    if (bgType === 'white') return '#ffffff'
    if (bgType === 'black') return '#000000'
    return bgColor
  }

  const getCurrentSettings = () => ({
    fit,
    background: getBg(),
    filters,
    padding,
    borderRadius,
    text: textOverlay,
  })

  const loadImage = (img, filename = 'image') => {
    setCurrentImage({
      img,
      id: crypto.randomUUID(),
      filename,
      timestamp: Date.now(),
    })
  }

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const updateTextOverlay = (updates) => {
    setTextOverlay(prev => ({ ...prev, ...updates }))
  }

  const saveAsComparisonBase = () => {
    if (currentImage) {
      setComparisonBase({
        img: currentImage.img,
        settings: getCurrentSettings(),
      })
    }
  }

  const clearComparison = () => {
    setComparisonBase(null)
  }

  const addToBatch = (img, filename) => {
    setBatchImages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        img,
        filename,
        status: 'pending',
      },
    ])
  }

  const removeBatchImage = (id) => {
    setBatchImages(prev => prev.filter(img => img.id !== id))
  }

  const clearBatch = () => {
    setBatchImages([])
  }

  return {
    // State
    currentImage,
    fit,
    bgType,
    bgColor,
    filters,
    padding,
    borderRadius,
    textOverlay,
    comparisonBase,
    batchImages,

    // Setters
    setFit,
    setBgType,
    setBgColor,
    setPadding,
    setBorderRadius,
    updateFilters,
    updateTextOverlay,

    // Computed
    getBg,
    getCurrentSettings,

    // Actions
    loadImage,
    saveAsComparisonBase,
    clearComparison,
    addToBatch,
    removeBatchImage,
    clearBatch,
  }
}
