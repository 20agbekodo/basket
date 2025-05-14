/* NBA UNIVERSE — React overlay: sidebars, hover card, FAB, modals, loader wiring. */
const { useState, useEffect, useRef, useMemo } = React;

const PLAYERS = window.NBA_PLAYERS;
const YEARS = PLAYERS.map((p) => p.year);
const MIN_Y = Math.min.apply(null, YEARS);
const MAX_Y = Math.max.apply(null, YEARS);

// ---- persistence for user-added players --------------------------------
const STORE_KEY = 'nba_universe_added_v2';
function saveAdded() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(PLAYERS.filter((p) => p.added))); } catch (e) {}
}
(function hydrate() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((p) => { if (p && p.id != null && !PLAYERS.some((x) => x.id === p.id)) PLAYERS.push(p); });
  } catch (e) {}
})();
const nextId = () => PLAYERS.reduce((m, p) => Math.max(m, p.id), -1) + 1;
const PBYID = (id) => PLAYERS.find((p) => p.id === id);

const DEFAULTS = () => ({
  query: '', topN: PLAYERS.length, positions: new Set(),
  eraFrom: 1980, eraTo: 2026, source: 'all', statRanges: {},
});

// stat range definitions: whole numbers for %, tenths for the rest
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
];

// ---- Tweaks: a few expressive controls that reshape the whole feel ------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#7b2ff7", "#00e0c7", "#eaff2b", "#ff2d9b"],
  "arrangement": "Stat Space",
  "energy": 42
}/*EDITMODE-END*/;

const PALETTES = [
  ["#7b2ff7", "#00e0c7", "#eaff2b", "#ff2d9b"],   // Magic '95
  ["#5b2a9e", "#ffcf33", "#ff7a18", "#ff2d9b"],   // Showtime gold
  ["#1d8a8a", "#7b2ff7", "#7dffd0", "#ff2d9b"],   // Hornets teal
  ["#2a3fff", "#00caff", "#eef4ff", "#ff2d9b"],   // Night game
];
const LAYOUT_MAP = { 'Stat Space': 'stats', Galaxy: 'galaxy', Positions: 'positions', Eras: 'eras', 'Pay Tiers': 'salary' };

// what the three world axes encode under each arrangement (axis -> stat)
const AXIS_MEANING = {
  stats:     { x: 'PPG', y: 'PER', z: 'Born' },
  galaxy:    { x: 'free', y: 'free', z: 'free' },
  positions: { x: 'court', y: 'height', z: 'court' },
  eras:      { x: 'Year', y: 'spread', z: 'spread' },
  salary:    { x: 'spread', y: 'Pay', z: 'spread' },
};

function mixHex(a, b, amt) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * amt), g = Math.round(ag + (bg - ag) * amt), bl = Math.round(ab + (bb - ab) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
function applyPalette(pal) {
  const c0 = pal[0], c1 = pal[1], c2 = pal[2], c3 = pal[3];
  const rs = document.documentElement.style;
  rs.setProperty('--purple', c0);
  rs.setProperty('--teal', c1);
  rs.setProperty('--neon', c2);
  rs.setProperty('--pink', c3);
  rs.setProperty('--purple-d', mixHex(c0, '#000000', 0.45));
  rs.setProperty('--teal-d', mixHex(c1, '#000000', 0.4));
  const s0 = mixHex(c0, '#04020c', 0.82);
  rs.setProperty('--space-0', s0);
  rs.setProperty('--space-1', mixHex(c0, '#0a0620', 0.58));
  rs.setProperty('--space-2', mixHex(c0, '#160c34', 0.42));
  return s0;
}

// ---- Live orientation compass ------------------------------------------
function Compass({ arrangement, shifted, onRecalibrate }) {
  const key = LAYOUT_MAP[arrangement] || 'stats';
  const m = AXIS_MEANING[key] || AXIS_MEANING.stats;
  const rows = [['x', m.x], ['y', m.y], ['z', m.z]];
  return (
    <div id="compass" className={shifted ? 'shift' : ''} onClick={onRecalibrate} title="Click to reset orientation (X right · Y up · Z toward you)">
      <svg id="compass-svg" viewBox="0 0 100 100">
        <circle className="cmp-ring" cx="50" cy="50" r="40" />
        <g data-axis="z" className="ax z"><line className="ax-line" x1="50" y1="50" x2="50" y2="22" /><circle className="ax-dot" r="3.2" cx="50" cy="22" /><text className="ax-label" textAnchor="middle" x="50" y="14">Z</text></g>
        <g data-axis="y" className="ax y"><line className="ax-line" x1="50" y1="50" x2="50" y2="22" /><circle className="ax-dot" r="3.2" cx="50" cy="22" /><text className="ax-label" textAnchor="middle" x="50" y="14">Y</text></g>
        <g data-axis="x" className="ax x"><line className="ax-line" x1="50" y1="50" x2="78" y2="50" /><circle className="ax-dot" r="3.2" cx="78" cy="50" /><text className="ax-label" textAnchor="middle" x="78" y="50">X</text></g>
        <circle className="cmp-hub" cx="50" cy="50" r="2.6" />
      </svg>
      <div className="cmp-reset">⟲ reset view</div>
      <div className="cmp-legend">
        {rows.map(([k, v]) => (
          <div className={'cl ' + k} key={k}><span className="cl-dot" />{k.toUpperCase()} · {v}</div>
        ))}
      </div>
    </div>
  );
}

function catWord(c) { return c === 'under' ? 'Underpaid' : (c === 'over' ? 'Overpaid' : (c === 'user' ? 'Your value' : 'Fair value')); }

// Turn the Add-Player form + estimate into a real, filterable player record.
function buildUserPlayer(form, result) {
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const birthYear = result.birthYear || (parseInt(form.birthyear, 10) || 2000);
  const peak = birthYear + 25;
  const mid = result.mid;
  const ppg = num(form.ppg, Math.max(3, mid * 0.65));
  const per = Math.max(8, Math.min(33, 9 + mid * 0.55));
  const p = {
    id: nextId(),
    name: form.name.trim(),
    pos: form.pos,
    year: peak,
    era: (window.eraFromYear ? window.eraFromYear(peak) : '2020s'),
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
    delta: 0,
    category: 'user',
    birthYear: birthYear,
    added: true,
    photoUrl: form.photo || null,
    similar: [],
  };
  const ds = PLAYERS.filter((q) => q.category !== 'user')
    .map((q) => ({ id: q.id, d: Math.abs(q.ppg - p.ppg) + Math.abs(q.per - p.per) * 0.6 }));
  ds.sort((a, b) => a.d - b.d);
  p.similar = ds.slice(0, 5).map((x) => x.id);
  return p;
}

// ---- Hover card content ------------------------------------------------
function HoverCard({ player, hostRef }) {
  const show = !!player;
  return (
    <div id="hovercard" ref={hostRef} className={show ? 'show' : ''}>
      {player && (() => {
        return (
          <div>
            <div className="hc-top">
              <window.PlayerImg player={player} size={60} className="hc-pic" />
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
              <span className="s">{window.fmtM(player.salary)}<span style={{ fontSize: 11, opacity: 0.6 }}>/yr</span></span>
              <span className={'hc-badge ' + player.category}>{catWord(player.category)}</span>
            </div>
            <div className="hc-ach">
              {player.rings > 0 && <span className="hc-pill">💍 {player.rings}</span>}
              {player.mvp > 0 && <span className="hc-pill">🏆 MVP×{player.mvp}</span>}
              {player.allstar > 0 && <span className="hc-pill">⭐ {player.allstar}×AS</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ---- Dual-range slider (lower + upper, slider + number inputs) ---------
function DualRange({ lo, hi, step, a, b, onA, onB }) {
  const pct = (v) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="dual">
      <div className="dual-track"><div className="dual-fill" style={{ left: pct(a) + '%', right: (100 - pct(b)) + '%' }} /></div>
      <input type="range" className="dr" min={lo} max={hi} step={step} value={a} onChange={(e) => onA(+e.target.value)} />
      <input type="range" className="dr" min={lo} max={hi} step={step} value={b} onChange={(e) => onB(+e.target.value)} />
    </div>
  );
}

function StatRow({ def, filters, setFilters }) {
  const cur = filters.statRanges[def.field] || [def.lo, def.hi];
  const a = cur[0], b = cur[1];
  const snap = (v) => def.step < 1 ? Math.round(v * 10) / 10 : Math.round(v);
  const fmt = (v) => def.step < 1 ? v.toFixed(1) : String(Math.round(v));
  const set = (na, nb) => setFilters({ ...filters, statRanges: { ...filters.statRanges, [def.field]: [na, nb] } });
  const onA = (v) => set(Math.max(def.lo, Math.min(snap(v), b)), b);
  const onB = (v) => set(a, Math.min(def.hi, Math.max(snap(v), a)));
  return (
    <div className="stat-filter">
      <div className="sf-head">
        <label>{def.label}</label>
        <div className="sf-nums">
          <window.NumStepper value={fmt(a)} step={def.step} min={def.lo} max={def.hi}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onA(v); }} />
          <span>–</span>
          <window.NumStepper value={fmt(b)} step={def.step} min={def.lo} max={def.hi}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onB(v); }} />
        </div>
      </div>
      <DualRange lo={def.lo} hi={def.hi} step={def.step} a={a} b={b} onA={onA} onB={onB} />
    </div>
  );
}

// ---- Left sidebar (two sliding pages: basic + advanced stat filters) ----
function LeftBar({ filters, setFilters, count, onReset, onSearchEnter, collapsed, onCollapse, page, setPage, searchRef }) {
  const togglePos = (pos) => {
    const next = new Set(filters.positions);
    next.has(pos) ? next.delete(pos) : next.add(pos);
    setFilters({ ...filters, positions: next });
  };
  return (
    <div id="left" className={'panel' + (collapsed ? ' collapsed' : '')}>
      <div className={'left-pages' + (page === 'advanced' ? ' adv' : '')}>

        {/* ---- BASIC PAGE ---- */}
        <div className="left-page scroll">
          <div className="lead">
            {page === 'basic' && <button className="left-collapse" onClick={onCollapse} title="Collapse panel">«</button>}
          </div>
          <div className="body">
            <div className="field">
              <label>Search</label>
              <div className="search-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                <input ref={searchRef} className="search" placeholder="player or team…" value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSearchEnter(); }} />
              </div>
            </div>

            <div className="field">
              <label>Top Players <span className="slider-val">{filters.topN}</span></label>
              <input type="range" min="5" max={PLAYERS.length} value={filters.topN}
                onChange={(e) => setFilters({ ...filters, topN: +e.target.value })} />
              <div className="hint">by career value (PER)</div>
            </div>

            <div className="field">
              <label>Positions</label>
              <div className="pills">
                {['PG', 'SG', 'SF', 'PF', 'C'].map((p) => (
                  <div key={p} className={'pill' + (filters.positions.has(p) ? ' on' : '')} onClick={() => togglePos(p)}>{p}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Source</label>
              <div className="pills">
                {[['all', 'All'], ['original', 'Original'], ['added', 'Added']].map(([v, lab]) => (
                  <div key={v} className={'pill src' + (filters.source === v ? ' on' : '')} onClick={() => setFilters({ ...filters, source: v })}>{lab}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Era</label>
              <div className="era-row">
                <window.NumStepper value={filters.eraFrom} step={1} onChange={(e) => setFilters({ ...filters, eraFrom: +e.target.value })} />
                <span>—</span>
                <window.NumStepper value={filters.eraTo} step={1} onChange={(e) => setFilters({ ...filters, eraTo: +e.target.value })} />
              </div>
            </div>

            <div className="field">
              <button className="btn btn-more" onClick={() => setPage('advanced')}>⚙ More filters ›</button>
            </div>

            <div className="field">
              <label>Legend</label>
              <div className="legend">
                <div className="lg"><span className="dot" style={{ background: 'var(--under)', color: 'var(--under)' }}></span> Underpaid — worth more than they earned</div>
                <div className="lg"><span className="dot" style={{ background: 'var(--over)', color: 'var(--over)' }}></span> Overpaid — earned more than worth</div>
                <div className="lg"><span className="dot" style={{ background: 'var(--fair)', color: 'var(--fair)' }}></span> Fair value</div>
              </div>
            </div>

            <div className="field">
              <button className="btn btn-reset" onClick={onReset}>↺ Reset Filters</button>
            </div>

            <div className="count-line"><b>{count}</b> of {PLAYERS.length} players in view</div>
          </div>
        </div>

        {/* ---- ADVANCED PAGE ---- */}
        <div className="left-page scroll">
          <div className="lead adv-lead">
            <button className="btn btn-back" onClick={() => setPage('basic')}>‹ Back to basic filters</button>
          </div>
          <div className="body">
            <div className="field" style={{ marginTop: 6 }}>
              <label>Filter by stat range</label>
              <div className="hint">drag the handles or type exact values</div>
            </div>
            {STAT_DEFS.map((d) => <StatRow key={d.field} def={d} filters={filters} setFilters={setFilters} />)}
            <div className="field">
              <button className="btn btn-reset" onClick={onReset}>↺ Reset all filters</button>
            </div>
            <div className="count-line"><b>{count}</b> of {PLAYERS.length} players in view</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ---- Right sidebar -----------------------------------------------------
const STAT_FULL = {
  PPG: 'Points Per Game', RPG: 'Rebounds Per Game', APG: 'Assists Per Game',
  'FG%': 'Field Goal Percentage', '3P%': 'Three-Point Percentage', 'FT%': 'Free Throw Percentage',
  PER: 'Player Efficiency Rating', WS: 'Win Shares', BPM: 'Box Plus/Minus',
};
function RightBar({ player, onClose, onPick, onDelete }) {
  const [tip, setTip] = useState(null);
  const tipTimer = useRef(null);
  const showTip = (e, text) => {
    const el = e.currentTarget;
    clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTip({ text: text, x: r.left + r.width / 2, y: r.top - 8 });
    }, 500);
  };
  const hideTip = () => { clearTimeout(tipTimer.current); setTip(null); };
  if (!player) return <div id="right" className="panel"></div>;
  const stats = [
    ['PPG', player.ppg], ['RPG', player.rpg], ['APG', player.apg],
    ['FG%', player.fg], ['3P%', player.tp], ['FT%', player.ft],
    ['PER', player.per], ['WS', player.ws], ['BPM', player.bpm],
  ];
  const deltaTxt = player.category === 'user'
    ? 'Estimated market value'
    : (player.category === 'fair'
      ? 'Paid about right'
      : (player.category === 'under' ? 'Underpaid by ' : 'Overpaid by ') + window.fmtM(Math.abs(player.delta)));
  return (
    <div id="right" className="panel scroll open">
      <div className="rhead">
        <div className="r-close" onClick={onClose}>✕</div>
        <div className="polaroid">
          <div className="pic"><window.PlayerImg player={player} size={144} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
          <div className="cap">{player.team}</div>
        </div>
        <div className="r-name">{player.name}</div>
        <div className="r-meta">
          <span className="tag pos">{player.pos}</span>
          <span className="tag era">{player.era}</span>
          <span className="tag team">{player.team}</span>
        </div>
        {!player.added && player.profileUrl && (
          <a className="nba-link" href={player.profileUrl} target="_blank" rel="noopener noreferrer">View on NBA.com ↗</a>
        )}
      </div>
      <div className="rbody">
        <div className="section-h">Career Stats</div>
        <div className="stat-grid">
          {stats.map((s) => (
            <div className="stat-cell" key={s[0]}
              onMouseEnter={(e) => showTip(e, STAT_FULL[s[0]] || s[0])} onMouseLeave={hideTip}>
              <div className="v">{s[1]}</div><div className="k">{s[0]}</div>
            </div>
          ))}
        </div>

        <div className="section-h">Salary Reality Check</div>
        <div className={'salary-card ' + player.category}>
          <div className="sc-row"><span className="lbl">Best-year salary</span><span className="num">{window.fmtM(player.salary)}</span></div>
          <div className="sc-row"><span className="lbl">Today's market value</span><span className="num">{window.fmtM(player.expected)}</span></div>
          <span className={'delta-badge ' + player.category}>
            {player.category === 'under' ? '▲' : (player.category === 'over' ? '▼' : '◆')} {deltaTxt}
          </span>
        </div>

        <div className="section-h">Hardware</div>
        <div className="ach-row">
          {player.rings > 0 && <div className="ach ring"><span className="ico">💍</span> {player.rings}× Champ</div>}
          {player.mvp > 0 && <div className="ach mvp"><span className="ico">🏆</span> {player.mvp}× MVP</div>}
          {player.allstar > 0 && <div className="ach star"><span className="ico">⭐</span> {player.allstar}× All-Star</div>}
          {player.rings === 0 && player.mvp === 0 && player.allstar === 0 && <div className="ach" style={{ opacity: 0.6 }}>No hardware yet</div>}
        </div>

        <div className="section-h">Similar Players</div>
        <div className="sim-list">
          {player.similar.map((id) => {
            const q = PBYID(id);
            if (!q) return null;
            return (
              <div className="sim" key={id} onClick={() => onPick(id)}>
                <window.PlayerImg player={q} size={30} className="chip" />
                <span className="nm">{q.name}</span>
                <span className="mt">{q.pos} · {q.era}</span>
              </div>
            );
          })}
        </div>

        {player.added && (
          <button className="btn btn-reset del-btn" onClick={() => onDelete(player.id)}>🗑 Delete this player</button>
        )}
      </div>
      {tip && ReactDOM.createPortal(
        <div className="stat-tip" style={{ left: tip.x + 'px', top: tip.y + 'px' }}>{tip.text}</div>,
        document.body
      )}
    </div>
  );
}

// ---- App ---------------------------------------------------------------
function App() {
  const [filters, setFilters] = useState(DEFAULTS);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const [count, setCount] = useState(PLAYERS.length);
  const [modal, setModal] = useState(null);     // null | 'add' | 'result'
  const [result, setResult] = useState(null);
  const [hasUser, setHasUser] = useState(false);

  const uni = useRef(null);
  const hcRef = useRef(null);
  const searchRef = useRef(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftPage, setLeftPage] = useState('basic');
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // init three + loader
  useEffect(() => {
    const canvas = document.getElementById('universe-canvas');
    uni.current = new window.Universe(canvas, {
      players: PLAYERS,
      labelLayer: document.getElementById('label-layer'),
      onHover: (p) => setHover(p),
      onSelect: (p) => setSelected(p),
    });
    if (hcRef.current) uni.current.setHoverCardEl(hcRef.current);
    uni.current.setCompass(document.getElementById('compass-svg'));

    // cassette loader progress
    const bar = document.querySelector('.loader-bar > i');
    const loader = document.getElementById('loader');
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(100, pct + 6 + Math.random() * 12);
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(iv);
        setTimeout(() => loader && loader.classList.add('hide'), 280);
      }
    }, 130);
    return () => clearInterval(iv);
  }, []);

  // re-apply filter when it changes
  useEffect(() => {
    if (!uni.current) return;
    const c = uni.current.applyFilter(filters);
    setCount(c);
  }, [filters]);

  // apply expressive tweaks (palette / arrangement / energy)
  useEffect(() => {
    if (!uni.current) return;
    const space = applyPalette(t.palette || PALETTES[0]);
    uni.current.setPalette((t.palette || PALETTES[0]).concat(['#ffffff']), space);
    uni.current.setLayout(LAYOUT_MAP[t.arrangement] || 'galaxy');
    uni.current.setEnergy((t.energy != null ? t.energy : 42) / 100);
  }, [t]);

  const onReset = () => { setFilters(DEFAULTS()); if (uni.current) uni.current.recenter(); };
  const onSearchEnter = () => uni.current && uni.current.focusOnSearch();
  const closeRight = () => { setSelected(null); uni.current && uni.current.deselect(); };
  const pickSimilar = (id) => uni.current && uni.current.selectById(id);

  const submitAdd = (form) => {
    const r = window.estimateSalary(form);
    setResult(r);
    setModal('result');
  };
  const viewMyself = (r) => {
    const p = buildUserPlayer(r.identity, r);
    PLAYERS.push(p);
    uni.current.addRealPlayer(p);
    saveAdded();
    setHasUser(true);
    // make sure the new player isn't filtered out, and refresh the count
    setFilters((f) => ({
      ...f,
      query: '',
      topN: PLAYERS.length,
      source: f.source === 'original' ? 'all' : f.source,
      positions: f.positions.size ? new Set([...f.positions, p.pos]) : f.positions,
      eraFrom: Math.min(f.eraFrom, p.year),
      eraTo: Math.max(f.eraTo, p.year),
    }));
    setModal(null);
  };

  const onDelete = (id) => {
    if (uni.current) uni.current.removePlayer(id);   // also removes it from PLAYERS
    saveAdded();
    setSelected(null);
    setFilters((f) => ({ ...f }));                   // re-run filter + refresh count
  };

  return (
    <React.Fragment>
      <LeftBar filters={filters} setFilters={setFilters} count={count} onReset={onReset} onSearchEnter={onSearchEnter} collapsed={!leftOpen} onCollapse={() => setLeftOpen(false)} page={leftPage} setPage={setLeftPage} searchRef={searchRef} />
      {!leftOpen && (
        <button id="left-expand" onClick={() => { setLeftOpen(true); setLeftPage('basic'); setTimeout(() => { if (searchRef.current) searchRef.current.focus(); }, 80); }} title="Show filters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span>FILTERS</span>
        </button>
      )}
      <RightBar player={selected} onClose={closeRight} onPick={pickSimilar} onDelete={onDelete} />
      <HoverCard player={hover} hostRef={hcRef} />
      <Compass arrangement={t.arrangement} shifted={!!selected} onRecalibrate={() => uni.current && uni.current.recalibrate()} />

      <div id="fab" className={selected ? 'shift-right' : ''} title="Add yourself" onClick={() => setModal('add')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </div>

      <div id="brand-mark" className={selected ? 'hide' : ''}>
        <div className="bm-logo"><span className="ball">🏀</span> NBA UNIVERSE</div>
        <div className="bm-tag">How much are YOU worth</div>
      </div>

      {modal === 'add' && <window.AddPlayerModal onCancel={() => setModal(null)} onSubmit={submitAdd} />}
      {modal === 'result' && result && <window.SalaryResultModal result={result} onClose={() => setModal(null)} onView={viewMyself} />}

      <window.TweaksPanel>
        <window.TweakSection label="Court Palette" />
        <window.TweakColor label="Colorway" value={t.palette} options={PALETTES}
          onChange={(v) => setTweak('palette', v)} />
        <window.TweakSection label="Arrangement" />
        <window.TweakSelect label="Layout" value={t.arrangement}
          options={['Stat Space', 'Galaxy', 'Positions', 'Eras', 'Pay Tiers']}
          onChange={(v) => setTweak('arrangement', v)} />
        <window.TweakSection label="Motion" />
        <window.TweakSlider label="Energy" value={t.energy} min={0} max={100} unit="%"
          onChange={(v) => setTweak('energy', v)} />
      </window.TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('ui-root')).render(<App />);
