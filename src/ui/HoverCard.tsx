import { Html } from '@react-three/drei'
import type { Player } from '../data/types'

interface HoverCardProps {
  player: Player | null
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

const SilhouetteSVG = () => (
  <svg
    viewBox="0 0 64 64"
    className="w-16 h-16 rounded-full bg-white/10"
    fill="currentColor"
  >
    <circle cx="32" cy="22" r="12" opacity="0.6" />
    <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" opacity="0.6" />
  </svg>
)

export function HoverCard({ player }: HoverCardProps) {
  if (!player) return null

  const delta = player.salaryDelta
  const deltaLabel =
    delta > 500_000
      ? { text: `+${formatMoney(delta)} overpaid`, cls: 'bg-red-500/80 text-white' }
      : delta < -500_000
        ? { text: `${formatMoney(delta)} underpaid`, cls: 'bg-green-500/80 text-white' }
        : { text: '~fair', cls: 'bg-white/20 text-white/70' }

  return (
    <Html position={[player.x, player.y + 1.5, player.z]} center>
      <div className="bg-black/80 backdrop-blur border border-white/20 rounded-xl p-3 text-white text-sm w-52 pointer-events-none select-none">
        {/* Photo + name */}
        <div className="flex items-center gap-3 mb-2">
          {player.nbaId ? (
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nbaId}.png`}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              alt={player.name}
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
                  svg.setAttribute('viewBox', '0 0 64 64')
                  svg.setAttribute('class', 'w-16 h-16 rounded-full bg-white/10 text-white/40 flex-shrink-0')
                  svg.setAttribute('fill', 'currentColor')
                  svg.innerHTML =
                    '<circle cx="32" cy="22" r="12" opacity="0.6"/><path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" opacity="0.6"/>'
                  parent.prepend(svg)
                }
              }}
            />
          ) : (
            <SilhouetteSVG />
          )}
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate">{player.name}</p>
            <p className="text-white/60 text-xs">{player.era} · {player.position}</p>
            <p className="text-white/50 text-xs truncate">{player.team}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-center border-t border-white/10 pt-2 mb-2">
          {[
            { label: 'PPG', value: player.ppg.toFixed(1) },
            { label: 'RPG', value: player.rpg.toFixed(1) },
            { label: 'APG', value: player.apg.toFixed(1) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-white/50 text-xs">{label}</p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {/* Salary */}
        <div className="border-t border-white/10 pt-2 space-y-0.5 text-xs">
          <p className="text-white/60">
            Best year: <span className="text-white">{formatMoney(player.salaryBest)}</span>
          </p>
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-0.5 rounded-full ${deltaLabel.cls}`}>
              {deltaLabel.text}
            </span>
          </div>
        </div>

        {/* Achievements */}
        {(player.allStarCount > 0 || player.mvpCount > 0 || player.rings > 0) && (
          <div className="border-t border-white/10 pt-2 flex flex-wrap gap-1 mt-1">
            {player.allStarCount > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
                ⭐ {player.allStarCount}x All-Star
              </span>
            )}
            {player.mvpCount > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                🏆 {player.mvpCount}x MVP
              </span>
            )}
            {player.rings > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                💍 {player.rings}x
              </span>
            )}
          </div>
        )}
      </div>
    </Html>
  )
}
