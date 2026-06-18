import { useState } from 'react'

const MAX_HISTORY = 5

export function useHistory() {
  const [history, setHistory] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const addToHistory = (imageData) => {
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...imageData,
    }

    setHistory(prev => {
      // Remove items after current index (branching history)
      const truncated = prev.slice(0, currentIndex + 1)

      // Add new entry
      const updated = [...truncated, newEntry]

      // Keep only last MAX_HISTORY items
      if (updated.length > MAX_HISTORY) {
        setCurrentIndex(MAX_HISTORY - 1)
        return updated.slice(-MAX_HISTORY)
      }

      setCurrentIndex(updated.length - 1)
      return updated
    })
  }

  const goToHistory = (index) => {
    if (index >= 0 && index < history.length) {
      setCurrentIndex(index)
      return history[index]
    }
    return null
  }

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const undo = () => {
    if (canUndo) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      return history[newIndex]
    }
    return null
  }

  const redo = () => {
    if (canRedo) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      return history[newIndex]
    }
    return null
  }

  const clearHistory = () => {
    setHistory([])
    setCurrentIndex(-1)
  }

  return {
    history,
    currentIndex,
    addToHistory,
    goToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  }
}
