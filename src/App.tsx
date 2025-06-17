import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { NBA_PLAYERS } from '../data/players'
import type { Player } from '../data/players'
import { Universe } from './universe'
import type { AxisMap } from './universe'
import { PlayerImg, NumStepper, AddPlayerModal, SalaryResultModal, CompareModal, estimateSalary, fmtM, eraFromYear } from './components/Modals'
import type { SalaryResult, AddForm } from './components/Modals'
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakSelect, TweakColor } from './components/TweaksPanel'

// Mutable runtime player list (shared by universe + react)
const PLAYERS: Player[] = [...NBA_PLAYERS]

const STORE_KEY = 'nba_universe_added_v2'
const FAV_KEY = 'nba_universe_favorites_v1'

function saveAdded() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(PLAYERS.filter(p => p.added))) } catch (_) {}
}
function loadFavs(): Set<number> {
  try { return new Set<number>(JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')) } catch { return new Set() }
}

;(function hydrate() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return
    const arr = JSON.parse(raw) as Player[]
    if (Array.isArray(arr)) arr.forEach(p => { if (p?.id != null && !PLAYERS.some(x => x.id === p.id)) PLAYERS.push(p) })
  } catch (_) {}
})()

const nextId = () => PLAYERS.reduce((m, p) => Math.max(m, p.id), -1) + 1
const pById = (id: number) => PLAYERS.find(p => p.id === id)

const YEARS = PLAYERS.map(p => p.year)
const MIN_Y = Math.min(...YEARS)
const MAX_Y = Math.max(...YEARS)

interface Filters {
  query: string
  topN: number
  positions: Set<string>
  eraFrom: number
  eraTo: number
  source: string
  statRanges: Record<string, [number, number]>
}
const DEFAULTS = (): Filters => ({
  query: '', topN: PLAYERS.length, positions: new Set(),
  eraFrom: MIN_Y, eraTo: MAX_Y, source: 'all', statRanges: {},
})

const STAT_DEFS = [
  { field: 'ppg', label: 'PPG', lo: 0, hi: 45, step: 0.1 },
  { field: 'rpg', label: 'RPG', lo: 0, hi: 22, step: 0.1 },
  { field: 'apg', label: 'APG', lo: 0, hi: 15, step: 0.1 },
  { field: 'fg', label: 'FG%', lo: 25, hi: 70, step: 1 },
  { field: 'tp', label: '3P%', lo: 0, hi: 55, step: 1 },
  { field: 'ft', label: 'FT%', lo: 30, hi: 100, step: 1 },
  { field: 'per', label: 'PER', lo: 0, hi: 40, step: 0.1 },
  { field: 'ws', label: 'WS', lo: 0, hi: 22, step: 0.1 },
  { field: 'bpm', label: 'BPM', lo: -8, hi: 15, step: 0.1 },
]

const PALETTES = [
  ['#7b2ff7', '#00e0c7', '#eaff2b', '#ff2d9b'],
  ['#5b2a9e', '#ffcf33', '#ff7a18', '#ff2d9b'],
  ['#1d8a8a', '#7b2ff7', '#7dffd0', '#ff2d9b'],
  ['#2a3fff', '#00caff', '#eef4ff', '#ff2d9b'],
]

const LAYOUT_MAP: Record<string, string> = {
  'Stat Space': 'stats', Galaxy: 'galaxy', Positions: 'positions', Eras: 'eras', 'Pay Tiers': 'salary',
}
const LAYOUT_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(LAYOUT_MAP).map(([k, v]) => [v, k]))

const AXIS_OPTIONS = ['ppg', 'rpg', 'apg', 'fg', 'tp', 'ft', 'per', 'ws', 'bpm', 'salary', 'year']
const AXIS_LABELS: Record<string, string> = {
  ppg: 'PPG', rpg: 'RPG', apg: 'APG', fg: 'FG%', tp: '3P%', ft: 'FT%',
  per: 'PER', ws: 'WS', bpm: 'BPM', salary: 'Salary', year: 'Year', birthYear: 'Born',
}

const STATIC_AXIS: Record<string, Record<string, string>> = {
  galaxy: { x: 'free', y: 'free', z: 'free' },
  positions: { x: 'court', y: 'height', z: 'court' },
  eras: { x: 'Year', y: 'spread', z: 'spread' },
  salary: { x: 'spread', y: 'Pay', z: 'spread' },
}

// Parse URL hash for initial state restoration
function readHash() {
  try {
    const raw = window.location.hash.slice(1)
    if (!raw) return null
    const p = new URLSearchParams(raw)
    return {
      layout: p.get('layout'),
      ax: p.get('ax'), ay: p.get('ay'), az: p.get('az'),
      pal: p.get('pal') !== null ? parseInt(p.get('pal')!) : null,
      player: p.get('p') !== null ? parseInt(p.get('p')!) : null,
    }
  } catch { return null }
}
const HASH_INIT = readHash()

function mixHex(a: string, b: string, amt: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255
  const r = Math.round(ar + (br - ar) * amt), g = Math.round(ag + (bg - ag) * amt), bl = Math.round(ab + (bb - ab) * amt)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)
}

function applyPalette(pal: string[]): string {
  const [c0, c1, c2, c3] = pal
  const rs = document.documentElement.style
  rs.setProperty('--purple', c0)
  rs.setProperty('--teal', c1)
  rs.setProperty('--neon', c2)
  rs.setProperty('--pink', c3)
  rs.setProperty('--purple-d', mixHex(c0, '#000000', 0.45))
  rs.setProperty('--teal-d', mixHex(c1, '#000000', 0.4))
  const s0 = mixHex(c0, '#04020c', 0.82)
  rs.setProperty('--space-0', s0)
  rs.setProperty('--space-1', mixHex(c0, '#0a0620', 0.58))
  rs.setProperty('--space-2', mixHex(c0, '#160c34', 0.42))
  return s0
}

// ---- Compass ----
function Compass({ arrangement, shifted, onRecalibrate, axisLegend }: {
  arrangement: string; shifted: boolean; onRecalibrate: () => void
  axisLegend?: Record<string, string>
}) {
  const key = LAYOUT_MAP[arrangement] ?? 'galaxy'
  const m = key === 'stats' && axisLegend ? axisLegend : (STATIC_AXIS[key] ?? { x: 'PPG', y: 'PER', z: 'Born' })
  return (
    <div id="compass" className={shifted ? 'shift' : ''} onClick={onRecalibrate}
      title="Click to reset orientation">
      <svg id="compass-svg" viewBox="0 0 100 100">
        <circle className="cmp-ring" cx="50" cy="50" r="40" />
        <g data-axis="z" className="ax z">
          <line className="ax-line" x1="50" y1="50" x2="50" y2="22" />
          <circle className="ax-dot" r="3.2" cx="50" cy="22" />
          <text className="ax-label" textAnchor="middle" x="50" y="14">Z</text>
        </g>
        <g data-axis="y" className="ax y">
          <line className="ax-line" x1="50" y1="50" x2="50" y2="22" />
          <circle className="ax-dot" r="3.2" cx="50" cy="22" />
          <text className="ax-label" textAnchor="middle" x="50" y="14">Y</text>
        </g>
        <g data-axis="x" className="ax x">
          <line className="ax-line" x1="50" y1="50" x2="78" y2="50" />
          <circle className="ax-dot" r="3.2" cx="78" cy="50" />
          <text className="ax-label" textAnchor="middle" x="78" y="50">X</text>
        </g>
        <circle className="cmp-hub" cx="50" cy="50" r="2.6" />
      </svg>
      <div className="cmp-reset">⟲ reset view</div>
      <div className="cmp-legend">
        {(['x', 'y', 'z'] as const).map(k => (
          <div className={`cl ${k}`} key={k}>
            <span className="cl-dot" />{k.toUpperCase()} · {m[k]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Dual-range slider ----
function DualRange({ lo, hi, step, a, b, onA, onB }: {
  lo: number; hi: number; step: number; a: number; b: number;
  onA: (v: number) => void; onB: (v: number) => void
}) {
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100
  return (
    <div className="dual">
      <div className="dual-track">
        <div className="dual-fill" style={{ left: pct(a) + '%', right: (100 - pct(b)) + '%' }} />
      </div>
      <input type="range" className="dr" min={lo} max={hi} step={step} value={a}
        onChange={e => onA(+e.target.value)} />
      <input type="range" className="dr" min={lo} max={hi} step={step} value={b}
        onChange={e => onB(+e.target.value)} />
    </div>
  )
}

function StatRow({ def, filters, setFilters }: {
  def: typeof STAT_DEFS[number]
  filters: Filters
  setFilters: (f: Filters) => void
}) {
  const cur = filters.statRanges[def.field] ?? [def.lo, def.hi]
  const [a, b] = cur
  const snap = (v: number) => def.step < 1 ? Math.round(v * 10) / 10 : Math.round(v)
  const fmt = (v: number) => def.step < 1 ? v.toFixed(1) : String(Math.round(v))
  const set = (na: number, nb: number) =>
    setFilters({ ...filters, statRanges: { ...filters.statRanges, [def.field]: [na, nb] } })
  const onA = (v: number) => set(Math.max(def.lo, Math.min(snap(v), b)), b)
  const onB = (v: number) => set(a, Math.min(def.hi, Math.max(snap(v), a)))
  return (
    <div className="stat-filter">
      <div className="sf-head">
        <label>{def.label}</label>
        <div className="sf-nums">
          <NumStepper value={fmt(a)} step={def.step} min={def.lo} max={def.hi}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onA(v) }} />
          <span>–</span>
          <NumStepper value={fmt(b)} step={def.step} min={def.lo} max={def.hi}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onB(v) }} />
        </div>
      </div>
      <DualRange lo={def.lo} hi={def.hi} step={def.step} a={a} b={b} onA={onA} onB={onB} />
    </div>
  )
}

// ---- Left sidebar ----
function LeftBar({ filters, setFilters, count, onReset, onSearchEnter, collapsed, onCollapse, page, setPage, searchRef }: {
  filters: Filters; setFilters: (f: Filters) => void; count: number;
  onReset: () => void; onSearchEnter: () => void;
  collapsed: boolean; onCollapse: () => void;
  page: string; setPage: (p: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>
}) {
  const togglePos = (pos: string) => {
    const next = new Set(filters.positions)
    next.has(pos) ? next.delete(pos) : next.add(pos)
    setFilters({ ...filters, positions: next })
  }
  return (
    <div id="left" className={'panel' + (collapsed ? ' collapsed' : '')}>
      <div className={'left-pages' + (page === 'advanced' ? ' adv' : '')}>

        {/* BASIC PAGE */}
        <div className="left-page scroll">
          <div className="lead">
            <div className="app-logo">🏀 <span className="ball">NBA</span> UNIVERSE</div>
            <div className="app-tag">How much are YOU worth?</div>
            {page === 'basic' && (
              <button className="left-collapse" onClick={onCollapse} title="Collapse">«</button>
            )}
          </div>
          <div className="body">
            <div className="field">
              <label>Search</label>
              <div className="search-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
                </svg>
                <input ref={searchRef} className="search" placeholder="player or team…"
                  value={filters.query}
                  onChange={e => setFilters({ ...filters, query: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') onSearchEnter() }} />
              </div>
            </div>

            <div className="field">
              <label>Top Players <span className="slider-val">{filters.topN}</span></label>
              <input type="range" min="5" max={PLAYERS.length} value={filters.topN}
                onChange={e => setFilters({ ...filters, topN: +e.target.value })} />
              <div className="hint">by career value (PER)</div>
            </div>

            <div className="field">
              <label>Positions</label>
              <div className="pills">
                {['PG', 'SG', 'SF', 'PF', 'C'].map(p => (
                  <div key={p} className={'pill' + (filters.positions.has(p) ? ' on' : '')}
                    onClick={() => togglePos(p)}>{p}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Source</label>
              <div className="pills">
                {[['all', 'All'], ['original', 'Original'], ['added', 'Added'], ['fav', '★ Favs']].map(([v, lab]) => (
                  <div key={v} className={'pill src' + (filters.source === v ? ' on' : '')}
                    onClick={() => setFilters({ ...filters, source: v })}>{lab}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Era</label>
              <div className="era-row">
                <NumStepper value={filters.eraFrom} step={1}
                  onChange={e => setFilters({ ...filters, eraFrom: +e.target.value })} />
                <span>—</span>
                <NumStepper value={filters.eraTo} step={1}
                  onChange={e => setFilters({ ...filters, eraTo: +e.target.value })} />
              </div>
            </div>

            <div className="field">
              <button className="btn btn-more" onClick={() => setPage('advanced')}>⚙ More filters ›</button>
            </div>

            <div className="field">
              <label>Legend</label>
              <div className="legend">
                <div className="lg"><span className="dot" style={{ background: 'var(--under)', color: 'var(--under)' }} /> Underpaid — worth more than earned</div>
                <div className="lg"><span className="dot" style={{ background: 'var(--over)', color: 'var(--over)' }} /> Overpaid — earned more than worth</div>
                <div className="lg"><span className="dot" style={{ background: 'var(--fair)', color: 'var(--fair)' }} /> Fair value</div>
              </div>
            </div>

            <div className="field">
              <button className="btn btn-reset" onClick={onReset}>↺ Reset Filters</button>
            </div>

            <div className="count-line"><b>{count}</b> of {PLAYERS.length} players in view</div>
          </div>
        </div>

        {/* ADVANCED PAGE */}
        <div className="left-page scroll">
          <div className="lead adv-lead">
            <button className="btn btn-back" onClick={() => setPage('basic')}>‹ Back to basic filters</button>
          </div>
          <div className="body">
            <div className="field" style={{ marginTop: 6 }}>
              <label>Filter by stat range</label>
              <div className="hint">drag the handles or type exact values</div>
            </div>
            {STAT_DEFS.map(d => <StatRow key={d.field} def={d} filters={filters} setFilters={setFilters} />)}
            <div className="field">
              <button className="btn btn-reset" onClick={onReset}>↺ Reset all filters</button>
            </div>
            <div className="count-line"><b>{count}</b> of {PLAYERS.length} players in view</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Right sidebar ----
const STAT_FULL: Record<string, string> = {
  PPG: 'Points Per Game', RPG: 'Rebounds Per Game', APG: 'Assists Per Game',
  'FG%': 'Field Goal Percentage', '3P%': 'Three-Point Percentage', 'FT%': 'Free Throw Percentage',
  PER: 'Player Efficiency Rating', WS: 'Win Shares', BPM: 'Box Plus/Minus',
}

function catWord(c: string) {
  return c === 'under' ? 'Underpaid' : c === 'over' ? 'Overpaid' : c === 'user' ? 'Your value' : 'Fair value'
}

function RightBar({ player, onClose, onPick, onDelete, isFav, onFavToggle, onCompare, compareMode }: {
  player: Player | null; onClose: () => void;
  onPick: (id: number) => void; onDelete: (id: number) => void
  isFav: boolean; onFavToggle: () => void
  onCompare: () => void; compareMode: boolean
}) {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTip = (e: React.MouseEvent<HTMLDivElement>, text: string) => {
    clearTimeout(tipTimer.current ?? undefined)
    const el = e.currentTarget
    tipTimer.current = setTimeout(() => {
      const r = el.getBoundingClientRect()
      setTip({ text, x: r.left + r.width / 2, y: r.top - 8 })
    }, 500)
  }
  const hideTip = () => { clearTimeout(tipTimer.current ?? undefined); setTip(null) }

  if (!player) return <div id="right" className="panel" />

  const stats: [string, number][] = [
    ['PPG', player.ppg], ['RPG', player.rpg], ['APG', player.apg],
    ['FG%', player.fg], ['3P%', player.tp], ['FT%', player.ft],
    ['PER', player.per], ['WS', player.ws], ['BPM', player.bpm],
  ]
  const deltaTxt = player.category === 'user'
    ? 'Estimated market value'
    : player.category === 'fair'
      ? 'Paid about right'
      : (player.category === 'under' ? 'Underpaid by ' : 'Overpaid by ') + fmtM(Math.abs(player.delta))

  return (
    <div id="right" className="panel scroll open">
      <div className="rhead">
        <button className={'r-icon-btn' + (isFav ? ' fav' : '')}
          style={{ position: 'absolute', top: 10, left: 12 }}
          onClick={onFavToggle} title={isFav ? 'Remove bookmark' : 'Bookmark'}>★</button>
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className={'r-icon-btn' + (compareMode ? ' active' : '')} onClick={onCompare}
            title="Compare with another player">↔</button>
          <div className="r-close" style={{ position: 'static' }} onClick={onClose}>✕</div>
        </div>

        <div className="polaroid">
          <div className="pic">
            <PlayerImg player={player} size={144} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="cap">{player.team}</div>
        </div>
        <div className="r-name">{player.name}</div>
        <div className="r-meta">
          <span className="tag pos">{player.pos}</span>
          <span className="tag era">{player.era}</span>
          <span className="tag team">{player.team}</span>
        </div>
        {!player.added && player.profileUrl && (
          <a className="nba-link" href={player.profileUrl} target="_blank" rel="noopener noreferrer">
            View on NBA.com ↗
          </a>
        )}
      </div>
      <div className="rbody">
        <div className="section-h">Career Stats</div>
        <div className="stat-grid">
          {stats.map(([k, v]) => (
            <div className="stat-cell" key={k}
              onMouseEnter={e => showTip(e, STAT_FULL[k] ?? k)} onMouseLeave={hideTip}>
              <div className="v">{v}</div><div className="k">{k}</div>
            </div>
          ))}
        </div>

        <div className="section-h">Salary Reality Check</div>
        <div className={`salary-card ${player.category}`}>
          <div className="sc-row"><span className="lbl">Best-year salary</span><span className="num">{fmtM(player.salary)}</span></div>
          <div className="sc-row"><span className="lbl">Today's market value</span><span className="num">{fmtM(player.expected)}</span></div>
          <span className={`delta-badge ${player.category}`}>
            {player.category === 'under' ? '▲' : player.category === 'over' ? '▼' : '◆'} {deltaTxt}
          </span>
        </div>

        <div className="section-h">Hardware</div>
        <div className="ach-row">
          {player.rings > 0 && <div className="ach ring"><span className="ico">💍</span> {player.rings}× Champ</div>}
          {player.mvp > 0 && <div className="ach mvp"><span className="ico">🏆</span> {player.mvp}× MVP</div>}
          {player.allstar > 0 && <div className="ach star"><span className="ico">⭐</span> {player.allstar}× All-Star</div>}
          {player.rings === 0 && player.mvp === 0 && player.allstar === 0 && (
            <div className="ach" style={{ opacity: 0.6 }}>No hardware yet</div>
          )}
        </div>

        <div className="section-h">Similar Players</div>
        <div className="sim-list">
          {player.similar.map(id => {
            const q = pById(id)
            if (!q) return null
            return (
              <div className="sim" key={id} onClick={() => onPick(id)}>
                <PlayerImg player={q} size={30} className="chip" localOnly />
                <span className="nm">{q.name}</span>
                <span className="mt">{q.pos} · {q.era}</span>
              </div>
            )
          })}
        </div>

        {player.added && (
          <button className="btn btn-reset del-btn" onClick={() => onDelete(player.id)}>
            🗑 Delete this player
          </button>
        )}
      </div>
      {tip && (
        <div className="stat-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>
      )}
    </div>
  )
}

// ---- HoverCard ----
function HoverCard({ player, hostRef }: {
  player: Player | null; hostRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div id="hovercard" ref={hostRef} className={player ? 'show' : ''}>
      {player && (
        <div>
          <div className="hc-top">
            <PlayerImg player={player} size={60} className="hc-pic" />
            <div>
              <div className="hc-name">{player.name}</div>
              <div className="hc-sub">{player.era} · {player.pos} · {player.team}</div>
            </div>
          </div>
          <div className="hc-stats">
            <div><div className="v">{player.ppg}</div><div className="k">PPG</div></div>
            <div><div className="v">{player.rpg}</div><div className="k">RPG</div></div>
            <div><div className="v">{player.apg}</div><div className="k">APG</div></div>
          </div>
          <div className="hc-salary">
            <span className="s">{fmtM(player.salary)}<span style={{ fontSize: 11, opacity: 0.6 }}>/yr</span></span>
            <span className={`hc-badge ${player.category}`}>{catWord(player.category)}</span>
          </div>
          <div className="hc-ach">
            {player.rings > 0 && <span className="hc-pill">💍 {player.rings}</span>}
            {player.mvp > 0 && <span className="hc-pill">🏆 MVP×{player.mvp}</span>}
            {player.allstar > 0 && <span className="hc-pill">⭐ {player.allstar}×AS</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Build user player from salary result ----
function buildUserPlayer(form: AddForm, result: SalaryResult): Player {
  const num = (v: string, d: number) => { const n = parseFloat(v); return isNaN(n) ? d : n }
  const birthYear = result.birthYear ?? (parseInt(form.birthyear) || 2000)
  const peak = birthYear + 25
  const mid = result.mid
  const ppg = num(form.ppg, Math.max(3, mid * 0.65))
  const per = Math.max(8, Math.min(33, 9 + mid * 0.55))
  const p: Player = {
    id: nextId(),
    name: form.name.trim(),
    pos: form.pos,
    year: peak,
    era: eraFromYear(peak),
    team: 'Free Agent',
    ppg: Math.round(ppg * 10) / 10,
    rpg: Math.round(ppg * 0.32 * 10) / 10,
    apg: Math.round(ppg * 0.26 * 10) / 10,
    fg: num(form.fg, 46), tp: num(form.tp, 34), ft: num(form.ft, 75),
    per: Math.round(per * 10) / 10,
    ws: Math.round(Math.min(18, mid * 0.4) * 10) / 10,
    bpm: Math.round(Math.min(10, mid * 0.18) * 10) / 10,
    allstar: 0, mvp: 0, rings: 0,
    salary: Math.round(mid * 10) / 10,
    expected: Math.round(mid * 10) / 10,
    delta: 0, category: 'user',
    birthYear, added: true,
    estSalary: mid,
    photo: form.photo ?? undefined,
    similar: [],
  }
  const ds = PLAYERS.filter(q => q.category !== 'user')
    .map(q => ({ id: q.id, d: Math.abs(q.ppg - p.ppg) + Math.abs(q.per - p.per) * 0.6 }))
  ds.sort((a, b) => a.d - b.d)
  p.similar = ds.slice(0, 5).map(x => x.id)
  return p
}

// ---- App ----
const TWEAK_DEFAULTS = {
  palette: HASH_INIT?.pal != null ? (PALETTES[HASH_INIT.pal] ?? PALETTES[0]) : PALETTES[0],
  arrangement: HASH_INIT?.layout ? (LAYOUT_REVERSE[HASH_INIT.layout] ?? 'Stat Space') : 'Stat Space',
  energy: 42,
  axisX: HASH_INIT?.ax ?? 'ppg',
  axisY: HASH_INIT?.ay ?? 'per',
  axisZ: HASH_INIT?.az ?? 'birthYear',
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULTS)
  const [selected, setSelected] = useState<Player | null>(null)
  const [hover, setHover] = useState<Player | null>(null)
  const [count, setCount] = useState(PLAYERS.length)
  const [modal, setModal] = useState<null | 'add' | 'result' | 'compare'>(null)
  const [result, setResult] = useState<SalaryResult | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(loadFavs)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePlayerA, setComparePlayerA] = useState<Player | null>(null)
  const [comparePlayerB, setComparePlayerB] = useState<Player | null>(null)

  const uni = useRef<Universe | null>(null)
  const hcRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const compareModeRef = useRef(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [leftPage, setLeftPage] = useState('basic')
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)

  // init Three.js universe + cassette loading progress
  useEffect(() => {
    const canvas = document.getElementById('universe-canvas') as HTMLCanvasElement
    const labelLayer = document.getElementById('label-layer') as HTMLElement
    uni.current = new Universe(canvas, {
      players: PLAYERS,
      labelLayer,
      onHover: p => setHover(p),
      onSelect: p => {
        if (compareModeRef.current && p) {
          setComparePlayerB(p)
          compareModeRef.current = false
          setCompareMode(false)
          setModal('compare')
        } else {
          setSelected(p)
        }
      },
    })
    if (hcRef.current) uni.current.setHoverCardEl(hcRef.current)
    uni.current.setCompass(document.getElementById('compass-svg') as SVGElement | null)

    // restore favorites
    const savedFavs = loadFavs()
    if (savedFavs.size) uni.current.setFavorites(savedFavs)

    // restore selected player from hash
    if (HASH_INIT?.player != null) {
      const pid = HASH_INIT.player
      setTimeout(() => uni.current?.selectById(pid), 700)
    }

    const bar = document.querySelector('.loader-bar > i') as HTMLElement | null
    const loader = document.getElementById('loader')
    let pct = 0
    const iv = setInterval(() => {
      pct = Math.min(100, pct + 6 + Math.random() * 12)
      if (bar) bar.style.width = pct + '%'
      if (pct >= 100) {
        clearInterval(iv)
        setTimeout(() => { loader?.classList.add('hide'); setLoaded(true) }, 280)
      }
    }, 130)
    return () => { clearInterval(iv); uni.current?.destroy() }
  }, [])

  // apply filters
  useEffect(() => {
    if (!uni.current) return
    const c = uni.current.applyFilter(filters)
    setCount(c)
  }, [filters])

  // apply tweaks (palette / arrangement / energy / axis)
  const axisMap: AxisMap = {
    x: (t.axisX as string) ?? 'ppg',
    y: (t.axisY as string) ?? 'per',
    z: (t.axisZ as string) ?? 'birthYear',
  }
  useEffect(() => {
    if (!uni.current) return
    const space = applyPalette(t.palette as string[] ?? PALETTES[0])
    uni.current.setPalette((t.palette as string[] ?? PALETTES[0]).concat(['#ffffff']), space)
    uni.current.setAxisMap(axisMap)
    uni.current.setLayout(LAYOUT_MAP[t.arrangement as string] ?? 'galaxy')
    uni.current.setEnergy(((t.energy as number) ?? 42) / 100)
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps

  // write URL hash when key state changes
  const writeHash = useCallback(() => {
    const p = new URLSearchParams()
    const layoutKey = LAYOUT_MAP[t.arrangement as string] ?? 'galaxy'
    p.set('layout', layoutKey)
    const palIdx = PALETTES.findIndex(x => JSON.stringify(x) === JSON.stringify(t.palette))
    if (palIdx > 0) p.set('pal', String(palIdx))
    if (axisMap.x !== 'ppg') p.set('ax', axisMap.x)
    if (axisMap.y !== 'per') p.set('ay', axisMap.y)
    if (axisMap.z !== 'birthYear') p.set('az', axisMap.z)
    if (selected?.id != null) p.set('p', String(selected.id))
    window.history.replaceState(null, '', p.toString() ? '#' + p.toString() : ' ')
  }, [t, selected, axisMap.x, axisMap.y, axisMap.z]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { writeHash() }, [writeHash])

  const toggleFav = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])) } catch (_) {}
      uni.current?.setFavorites(next)
      return next
    })
  }, [])

  const startCompare = useCallback(() => {
    setComparePlayerA(selected)
    compareModeRef.current = true
    setCompareMode(true)
  }, [selected])

  const cancelCompare = useCallback(() => {
    compareModeRef.current = false
    setCompareMode(false)
  }, [])

  void loaded

  const onReset = () => { setFilters(DEFAULTS()); uni.current?.recenter() }
  const onSearchEnter = () => uni.current?.focusOnSearch()
  const closeRight = () => { setSelected(null); uni.current?.deselect(); cancelCompare() }
  const pickSimilar = (id: number) => uni.current?.selectById(id)

  const submitAdd = (form: AddForm) => {
    const r = estimateSalary(form, PLAYERS)
    setResult(r)
    setModal('result')
  }

  const viewMyself = (r: SalaryResult) => {
    const p = buildUserPlayer(r.identity, r)
    PLAYERS.push(p)
    uni.current?.addRealPlayer(p)
    saveAdded()
    setFilters(f => ({
      ...f, query: '', topN: PLAYERS.length,
      source: f.source === 'original' ? 'all' : f.source,
      positions: f.positions.size ? new Set([...f.positions, p.pos]) : f.positions,
      eraFrom: Math.min(f.eraFrom, p.year), eraTo: Math.max(f.eraTo, p.year),
    }))
    setModal(null)
  }

  const onDelete = (id: number) => {
    uni.current?.removePlayer(id)
    saveAdded()
    setSelected(null)
    setFilters(f => ({ ...f }))
  }

  const paletteOptions = useMemo(() => PALETTES, [])

  // Compass legend: for stats mode use current axis labels, otherwise static
  const compassLegend: Record<string, string> = {
    x: AXIS_LABELS[axisMap.x] ?? axisMap.x,
    y: AXIS_LABELS[axisMap.y] ?? axisMap.y,
    z: AXIS_LABELS[axisMap.z] ?? axisMap.z,
  }

  return (
    <>
      {leftOpen ? (
        <LeftBar filters={filters} setFilters={setFilters} count={count} onReset={onReset}
          onSearchEnter={onSearchEnter} collapsed={false} onCollapse={() => setLeftOpen(false)}
          page={leftPage} setPage={setLeftPage} searchRef={searchRef} />
      ) : (
        <button id="left-expand" onClick={() => {
          setLeftOpen(true); setLeftPage('basic')
          setTimeout(() => searchRef.current?.focus(), 80)
        }} title="Show filters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>FILTERS</span>
        </button>
      )}

      <RightBar player={selected} onClose={closeRight} onPick={pickSimilar} onDelete={onDelete}
        isFav={selected ? favorites.has(selected.id) : false}
        onFavToggle={() => selected && toggleFav(selected.id)}
        onCompare={startCompare} compareMode={compareMode} />
      <HoverCard player={hover} hostRef={hcRef} />
      <Compass arrangement={t.arrangement as string} shifted={!!selected}
        onRecalibrate={() => uni.current?.recalibrate()} axisLegend={compassLegend} />

      {/* Compare mode hint overlay */}
      {compareMode && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 8,
          background: 'var(--panel-2)', border: '2px solid var(--neon)', borderRadius: 12,
          padding: '10px 20px', display: 'flex', gap: 14, alignItems: 'center',
          fontFamily: 'var(--font-chunky)', fontSize: 15, color: '#fff',
          boxShadow: '0 0 0 2px #000, 0 12px 30px rgba(0,0,0,0.6)',
        }}>
          <span style={{ color: 'var(--neon)' }}>↔ Click any player to compare</span>
          <button className="btn btn-reset" style={{ padding: '6px 12px', fontSize: 13 }} onClick={cancelCompare}>Cancel</button>
        </div>
      )}

      <div id="fab" className={selected ? 'shift-right' : ''} title="Add yourself"
        onClick={() => setModal('add')} role="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>

      <div id="brand-mark" className={!!selected ? 'hide' : ''}>
        <div className="bm-logo"><span className="ball">🏀</span> NBA UNIVERSE</div>
        <div className="bm-tag">How much are YOU worth</div>
      </div>

      {modal === 'add' && (
        <AddPlayerModal players={PLAYERS} onCancel={() => setModal(null)} onSubmit={submitAdd} />
      )}
      {modal === 'result' && result && (
        <SalaryResultModal result={result} onClose={() => setModal(null)} onView={viewMyself} />
      )}
      {modal === 'compare' && comparePlayerA && comparePlayerB && (
        <CompareModal playerA={comparePlayerA} playerB={comparePlayerB}
          onClose={() => { setModal(null); setComparePlayerA(null); setComparePlayerB(null) }} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Court Palette" />
        <TweakColor label="Colorway" value={t.palette as string[]} options={paletteOptions}
          onChange={v => setTweak('palette', v)} />
        <TweakSection label="Arrangement" />
        <TweakSelect label="Layout" value={t.arrangement as string}
          options={['Stat Space', 'Galaxy', 'Positions', 'Eras', 'Pay Tiers']}
          onChange={v => setTweak('arrangement', v)} />
        {(t.arrangement as string) === 'Stat Space' && <>
          <TweakSelect label="X axis" value={t.axisX as string}
            options={AXIS_OPTIONS.map(o => ({ value: o, label: AXIS_LABELS[o] ?? o }))}
            onChange={v => setTweak('axisX', v)} />
          <TweakSelect label="Y axis" value={t.axisY as string}
            options={AXIS_OPTIONS.map(o => ({ value: o, label: AXIS_LABELS[o] ?? o }))}
            onChange={v => setTweak('axisY', v)} />
          <TweakSelect label="Z axis" value={t.axisZ as string}
            options={AXIS_OPTIONS.map(o => ({ value: o, label: AXIS_LABELS[o] ?? o }))}
            onChange={v => setTweak('axisZ', v)} />
        </>}
        <TweakSection label="Motion" />
        <TweakSlider label="Energy" value={t.energy as number} min={0} max={100} unit="%"
          onChange={v => setTweak('energy', v)} />
      </TweaksPanel>
    </>
  )
}
