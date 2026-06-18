import { useState } from 'react'
import { DEFAULT_FILTERS } from '../utils/constants'

export function useFilters(initialFilters = DEFAULT_FILTERS) {
  const [filters, setFilters] = useState(initialFilters)

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: Number(value) }))
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  return {
    filters,
    updateFilter,
    resetFilters,
  }
}
