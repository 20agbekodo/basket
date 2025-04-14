import { useSceneStore } from '../store/useSceneStore'
import { usePlayersStore } from '../store/usePlayersStore'
import type { Player } from '../data/types'

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2 text-center">
      <p className="text-white/40 text-xs mb-0.5">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  )
}

const SilhouetteSVG = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="currentColor">
    <circle cx="60" cy="40" r="24" opacity="0.4" />
    <path d="M12 112c0-26.51 21.49-48 48-48s48 21.49 48 48" opacity="0.4" />
  </svg>
)

interface NeighborItemProps {
  player: Player
  onSelect: (player: Player) => void
}

function NeighborItem({ player, onSelect }: NeighborItemProps) {
  return (
    <button
      onClick={() => onSelect(player)}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
    >
      <span className="text-xs font-medium text-white/80 truncate">{player.name}</span>
      <span className="text-xs text-white/30 ml-auto flex-shrink-0">{player.position}</span>
    </button>
  )
}

export function PlayerDetail() {
  const { selectedIdx, setSelected, setCameraTarget } = useSceneStore()
  const { allPlayers } = usePlayersStore()

  if (selectedIdx === null) return null

  const player = allPlayers[selectedIdx]
  if (!player) return null

  const delta = player.salaryDelta
  const deltaLabel =
    delta > 500_000
      ? { text: `+${formatMoney(delta)} overpaid`, cls: 'bg-red-500/20 text-red-300' }
      : delta < -500_000
        ? { text: `${formatMoney(Math.abs(delta))} underpaid`, cls: 'bg-green-500/20 text-green-300' }
        : { text: '~fair value', cls: 'bg-white/10 text-white/50' }

  const expectedSalary = player.salaryBest - player.salaryDelta

  const neighborPlayers = player.neighbors
    .map((idx) => allPlayers[idx])
    .filter((p): p is Player => p !== undefined)
    .slice(0, 5)

  function handleNeighborSelect(neighbor: Player) {
    setSelected(neighbor.idx)
    setCameraTarget({ x: neighbor.x, y: neighbor.y, z: neighbor.z })
  }

  return (
    <div className="fixed top-0 right-0 h-full bg-black/95 border-l border-white/10 text-white z-40 overflow-y-auto w-72">
      <div className="p-5">
        {/* Close button */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setSelected(null)}
            className="text-white/40 hover:text-white text-2xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Photo */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 mx-auto mb-4">
          {player.nbaId ? (
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nbaId}.png`}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  const div = document.createElement('div')
                  div.className = 'w-full h-full text-white/30'
                  div.innerHTML = `<svg viewBox="0 0 120 120" class="w-full h-full" fill="currentColor"><circle cx="60" cy="40" r="24" opacity="0.4"/><path d="M12 112c0-26.51 21.49-48 48-48s48 21.49 48 48" opacity="0.4"/></svg>`
                  parent.appendChild(div)
                }
              }}
            />
          ) : (
            <SilhouetteSVG />
          )}
        </div>

        {/* Name + meta */}
        <h2 className="text-2xl font-bold text-center leading-tight">{player.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-1 mb-4">
          <span className="bg-orange-500/20 text-orange-300 text-xs font-semibold px-2 py-0.5 rounded">
            {player.position}
          </span>
          <span className="text-white/40 text-xs">{player.era}</span>
          <span className="text-white/40 text-xs">·</span>
          <span className="text-white/60 text-xs truncate max-w-[120px]">{player.team}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          <StatCell label="PPG" value={player.ppg.toFixed(1)} />
          <StatCell label="RPG" value={player.rpg.toFixed(1)} />
          <StatCell label="APG" value={player.apg.toFixed(1)} />
          <StatCell label="FG%" value={`${(player.fgPct * 100).toFixed(1)}%`} />
          <StatCell label="3P%" value={`${(player.threePct * 100).toFixed(1)}%`} />
          <StatCell label="FT%" value={`${(player.ftPct * 100).toFixed(1)}%`} />
          <StatCell label="PER" value={player.per.toFixed(1)} />
          <StatCell label="WS" value={player.ws.toFixed(1)} />
          <StatCell label="BPM" value={player.bpm.toFixed(1)} />
        </div>

        {/* Salary */}
        <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-1.5">
          <h3 className="text-xs text-white/40 uppercase tracking-wider">Salary</h3>
          <div className="flex justify-between">
            <span className="text-white/60 text-sm">Best year</span>
            <span className="text-white font-semibold">{formatMoney(player.salaryBest)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-sm">Expected</span>
            <span className="text-white/80">{formatMoney(expectedSalary)}</span>
          </div>
          <div className="pt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${deltaLabel.cls}`}>
              {deltaLabel.text}
            </span>
          </div>
        </div>

        {/* Achievements */}
        {(player.allStarCount > 0 || player.mvpCount > 0 || player.rings > 0) && (
          <div className="mb-4">
            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Achievements</h3>
            <div className="flex flex-wrap gap-1.5">
              {player.allStarCount > 0 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg">
                  ⭐ {player.allStarCount}x All-Star
                </span>
              )}
              {player.mvpCount > 0 && (
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">
                  🏆 {player.mvpCount}x MVP
                </span>
              )}
              {player.rings > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
                  💍 {player.rings}x Champion
                </span>
              )}
            </div>
          </div>
        )}

        {/* Similar players */}
        {neighborPlayers.length > 0 && (
          <div>
            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Similar Players</h3>
            <div className="space-y-0.5">
              {neighborPlayers.map((neighbor) => (
                <NeighborItem
                  key={neighbor.idx}
                  player={neighbor}
                  onSelect={handleNeighborSelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
