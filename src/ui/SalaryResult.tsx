import type { UserPlayer } from '../data/types'

interface SalaryResultProps {
  user: UserPlayer
  nearestPlayerName: string
  onClose: () => void
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

const RECREATIONAL_LEVELS = new Set(['Recreational', 'High School', 'College D2', 'College D1'])

export function SalaryResult({ user, nearestPlayerName, onClose }: SalaryResultProps) {
  const isJustForFun = RECREATIONAL_LEVELS.has(user.level)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-white">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🏀</div>
          <h2 className="text-xl font-bold">Your NBA Salary Estimate</h2>
        </div>

        {/* User identity */}
        <div className="flex items-center gap-3 mb-5">
          {user.photoBase64 ? (
            <img
              src={user.photoBase64}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-7 h-7 text-orange-300" fill="currentColor">
                <circle cx="32" cy="22" r="12" opacity="0.6" />
                <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" opacity="0.6" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-bold">{user.name}</p>
            <p className="text-white/50 text-sm">{user.position} · {user.level}</p>
          </div>
        </div>

        {/* Salary range */}
        <div className="bg-white/5 rounded-xl p-4 mb-4 text-center">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Annual salary range</p>
          <p className="text-white/60 text-sm">
            {formatMoney(user.expectedSalaryLow)} –{' '}
            <span className="text-white text-2xl font-bold">{formatMoney(user.expectedSalaryMid)}</span>{' '}
            – {formatMoney(user.expectedSalaryHigh)}
          </p>
          <p className="text-white/30 text-xs mt-1">/ year</p>
        </div>

        {/* Context */}
        <p className="text-white/60 text-sm text-center mb-4">
          That's similar to what{' '}
          <span className="text-white font-semibold">{nearestPlayerName}</span> earned
        </p>

        {/* Fun disclaimer for lower levels */}
        {isJustForFun && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
            <p className="text-yellow-300/80 text-xs text-center">
              This is a fun estimate — at {user.level} level, you'd likely be drafted in the 2nd round at best 😄
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-6 py-3 font-bold transition-colors"
        >
          View myself in the graph
        </button>
      </div>
    </div>
  )
}
