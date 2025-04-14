import { useEffect, useRef, useState } from 'react'
import { usePlayersStore } from '../store/usePlayersStore'
import type { Position } from '../data/types'

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']
const MAX_TOP_N = 5000

export function FilterPanel() {
  const { filters, setFilter, allPlayers, filteredIndices } = usePlayersStore()
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 768)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchInput, setSearchInput] = useState(filters.search)

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsOpen(true)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function handleSearch(value: string) {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setFilter({ search: value })
    }, 200)
  }

  function togglePosition(pos: Position) {
    const next = filters.positions.includes(pos)
      ? filters.positions.filter((p) => p !== pos)
      : [...filters.positions, pos]
    setFilter({ positions: next })
  }

  function resetFilters() {
    setSearchInput('')
    setFilter({
      search: '',
      topN: 500,
      positions: [],
      eraRange: [1946, 2025],
    })
  }

  const panelContent = (
    <div className="flex flex-col gap-4 p-4 text-white w-64">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          🏀 NBA Universe
        </h1>
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white text-xl leading-none"
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
          Search
        </label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Player name..."
          className="bg-white/10 rounded-lg px-3 py-2 w-full text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
        />
      </div>

      {/* Top N */}
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
          Top players by salary:{' '}
          <span className="text-white font-semibold">
            {filters.topN >= MAX_TOP_N ? 'All' : filters.topN}
          </span>
        </label>
        <input
          type="range"
          min={10}
          max={MAX_TOP_N}
          step={10}
          value={filters.topN}
          onChange={(e) => setFilter({ topN: Number(e.target.value) })}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-white/30 mt-0.5">
          <span>10</span>
          <span>All</span>
        </div>
      </div>

      {/* Position filter */}
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
          Position
        </label>
        <div className="flex gap-1 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filters.positions.includes(pos)
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Era range */}
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
          Era range
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1946}
            max={filters.eraRange[1]}
            value={filters.eraRange[0]}
            onChange={(e) =>
              setFilter({ eraRange: [Number(e.target.value), filters.eraRange[1]] })
            }
            className="bg-white/10 rounded px-2 py-1 w-20 text-xs text-white text-center outline-none focus:ring-1 focus:ring-white/30"
          />
          <span className="text-white/30 text-xs">–</span>
          <input
            type="number"
            min={filters.eraRange[0]}
            max={2025}
            value={filters.eraRange[1]}
            onChange={(e) =>
              setFilter({ eraRange: [filters.eraRange[0], Number(e.target.value)] })
            }
            className="bg-white/10 rounded px-2 py-1 w-20 text-xs text-white text-center outline-none focus:ring-1 focus:ring-white/30"
          />
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs rounded-lg px-3 py-1.5 transition-colors"
      >
        Reset filters
      </button>

      {/* Count */}
      <p className="text-xs text-white/40">
        Showing {filteredIndices.size} / {allPlayers.length} players
      </p>
    </div>
  )

  if (isMobile) {
    return (
      <>
        {/* Floating basketball toggle button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 bg-orange-500 hover:bg-orange-400 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg z-40"
            aria-label="Open filters"
          >
            🏀
          </button>
        )}

        {/* Bottom sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 bg-black/90 border-t border-white/10 z-50 transition-transform duration-300 max-h-[80vh] overflow-y-auto rounded-t-2xl ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {panelContent}
        </div>
      </>
    )
  }

  return (
    <div className="fixed top-0 left-0 h-full bg-black/90 border-r border-white/10 z-40 overflow-y-auto">
      {panelContent}
    </div>
  )
}
