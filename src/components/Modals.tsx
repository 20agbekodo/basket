import { useState, useRef, useEffect } from 'react'
import { makeAvatarFromSeed, makeAvatar } from '../avatars'
import type { Player } from '../../data/players'

export function eraFromYear(y: number): string {
  if (y < 1980) return '70s'
  if (y < 1990) return '80s'
  if (y < 2000) return '90s'
  if (y < 2010) return '2000s'
  if (y < 2020) return '2010s'
  return '2020s'
}

export function fmtM(v: number): string {
  if (v < 1) return '$' + Math.round(v * 1000) + 'K'
  return '$' + v.toFixed(1) + 'M'
}

// Compress a data URL to a small JPEG for localStorage storage
export function compressDataUrl(dataUrl: string, maxPx = 150, quality = 0.72): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * s), h = Math.round(img.height * s)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

const RND_FIRST = ['Marcus', 'Jalen', 'Tyler', 'Andre', 'Mason', 'Elijah', 'Noah', 'Liam', 'Diego', 'Mateo', 'Kai', 'Devin', 'Cameron', 'Isaiah', 'Theo', 'Quincy', 'Malik', 'Owen', 'Caleb', 'Darius', 'Nico', 'Hugo', 'Amari', 'Jonah']
const RND_LAST = ['Carter', 'Brooks', 'Hayes', 'Bennett', 'Coleman', 'Reed', 'Foster', 'Greene', 'Murphy', 'Sullivan', 'Ramirez', 'Okafor', 'Petrov', 'Nakamura', 'Dubois', 'Hughes', 'Sanders', 'Walker', 'Price', 'Mensah', 'Vasquez', 'Larsson', 'Romano', 'Bishop']

// Real photo (player.photo = stored data URL) → remote photoUrl → pixel art fallback
// Pass localOnly=true to skip all remote requests (for small chips/thumbnails)
export function PlayerImg({ player, size, className, style, localOnly }: {
  player: Player; size: number; className?: string; style?: React.CSSProperties; localOnly?: boolean
}) {
  const pick = () => player.photo ?? (!localOnly ? player.photoUrl : null) ?? makeAvatar(player, size)
  const [src, setSrc] = useState(pick)
  useEffect(() => { setSrc(pick()) }, [player.id, player.photo, player.photoUrl]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <img className={className} style={style} src={src} alt={player.name} draggable={false}
      onError={() => { const a = makeAvatar(player, size); if (src !== a) setSrc(a) }} />
  )
}

// App-styled number field: text input + custom up/down steppers
export function NumStepper({ value, onChange, step = 1, min, max, placeholder }: {
  value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: number; min?: number; max?: number; placeholder?: string
}) {
  const dec = step < 1 ? 1 : 0
  const bump = (dir: number) => {
    let cur = parseFloat(String(value))
    if (isNaN(cur)) cur = min ?? 0
    let n = cur + dir * step
    if (min != null) n = Math.max(min, n)
    if (max != null) n = Math.min(max, n)
    n = dec ? Math.round(n * 10) / 10 : Math.round(n)
    onChange({ target: { value: String(n) } } as React.ChangeEvent<HTMLInputElement>)
  }
  return (
    <span className="numfield">
      <input type="number" value={value} placeholder={placeholder} step={step} min={min} max={max} onChange={onChange} />
      <span className="num-steps">
        <button type="button" tabIndex={-1} onClick={() => bump(1)}>▲</button>
        <button type="button" tabIndex={-1} onClick={() => bump(-1)}>▼</button>
      </span>
    </span>
  )
}

export interface SalaryResult {
  low: number
  mid: number
  high: number
  comp: Player | null
  recreational: boolean
  identity: AddForm
  heightIn: number
  birthYear: number | null
  peakYear: number | null
  era: string
}

export interface AddForm {
  name: string
  birthyear: string
  pos: string
  level: string
  ft0: string
  in0: string
  weight: string
  ppg: string
  fg: string
  tp: string
  ft: string
  vert: string
  wingspan: string
  sprint: string
  photo: string | null
}

export function estimateSalary(f: AddForm, players: Player[]): SalaryResult {
  const num = (v: string, d: number) => { const n = parseFloat(v); return isNaN(n) ? d : n }
  const ppg = num(f.ppg, 9)
  const fg = num(f.fg, 45)
  const tp = num(f.tp, 33)
  const ft = num(f.ft, 75)
  const heightIn = (parseInt(f.ft0) || 6) * 12 + (parseInt(f.in0) || 2)
  const vert = num(f.vert, 0)
  const wing = num(f.wingspan, 0)
  const sprint = num(f.sprint, 0)

  let vi = ppg * 1.0
    + Math.max(0, fg - 45) * 0.25
    + Math.max(0, tp - 33) * 0.2
    + Math.max(0, ft - 75) * 0.05
    + Math.max(0, heightIn - 72) * 0.45
  if (vert) vi += Math.max(0, vert - 24) * 0.18
  if (wing) vi += Math.max(0, wing - heightIn) * 0.35
  if (sprint) vi += Math.max(0, 13.5 - sprint) * 1.1

  const LEVELS: Record<string, number> = {
    'Recreational': 0.015, 'High School': 0.08, 'College': 0.45,
    'G-League': 0.9, 'NBA Rotation': 1.6, 'NBA Starter': 2.4,
    'All-Star': 3.4, 'Superstar': 4.6,
  }
  const mult = LEVELS[f.level] ?? 1.0
  const mid = Math.max(0.02, Math.min(58, vi * mult * 0.22))
  const low = mid * 0.68, high = mid * 1.45

  let comp: Player | null = null, best = Infinity
  players.forEach(p => {
    const d = Math.abs(p.salary - mid)
    if (d < best) { best = d; comp = p }
  })

  const recreational = f.level === 'Recreational' || f.level === 'High School'
  const birthYear = parseInt(f.birthyear) || null
  const peakYear = birthYear ? birthYear + 25 : null
  const era = peakYear ? eraFromYear(peakYear) : '—'
  return { low, mid, high, comp, recreational, identity: f, heightIn, birthYear, peakYear, era }
}

// ---- ADD PLAYER MODAL ----
export function AddPlayerModal({ players, onCancel, onSubmit }: {
  players: Player[]
  onCancel: () => void
  onSubmit: (f: AddForm) => void
}) {
  const [f, setF] = useState<AddForm>({
    name: '', birthyear: '', pos: 'PG', level: 'NBA Starter', ft0: '6', in0: '3', weight: '',
    ppg: '', fg: '', tp: '', ft: '', vert: '', wingspan: '', sprint: '', photo: null,
  })
  // 'user' = uploaded by user (randomize won't override)
  // 'random' = generated by randomize (randomize can override)
  // null = none
  const [photoSource, setPhotoSource] = useState<'user' | 'random' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(s => ({ ...s, [k]: e.target.value }))

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => {
      // compress immediately so storage-ready data URL is in the form
      compressDataUrl(r.result as string).then(compressed => {
        setF(s => ({ ...s, photo: compressed }))
        setPhotoSource('user')
      })
    }
    r.readAsDataURL(file)
    // reset so picking the same file again fires change
    e.target.value = ''
  }

  const removePhoto = () => {
    setF(s => ({ ...s, photo: null }))
    setPhotoSource(null)
  }

  const _by = parseInt(f.birthyear)
  const canSubmit = f.name.trim().length > 0 && _by >= 1930 && _by <= 2018
  // preview: stored photo > generated pixel art from name (when name typed)
  const preview = f.photo ?? (f.name.trim() ? makeAvatarFromSeed(f.name, 96) : null)
  const eraPreview = (_by >= 1930 && _by <= 2018) ? eraFromYear(_by + 25) : null

  const rint = (a: number, b: number) => Math.round(a + Math.random() * (b - a))
  const r1 = (a: number, b: number) => Math.round((a + Math.random() * (b - a)) * 10) / 10
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const randomize = () => {
    void players.length
    const pos = pick(['PG', 'SG', 'SF', 'PF', 'C'])
    const htrMap: Record<string, [number, number]> = { PG: [70, 76], SG: [74, 79], SF: [78, 82], PF: [80, 84], C: [82, 87] }
    const htr = htrMap[pos]
    const hin = rint(htr[0], htr[1])
    const name = pick(RND_FIRST) + ' ' + pick(RND_LAST)

    // generate pixel art avatar for the random name as the "random photo"
    const randomPhoto = photoSource !== 'user' ? makeAvatarFromSeed(name + pos, 96) : f.photo

    setF(s => ({
      ...s,
      name,
      birthyear: String(rint(1965, 2004)),
      pos,
      level: pick(['College', 'G-League', 'NBA Rotation', 'NBA Starter', 'All-Star', 'Superstar']),
      ft0: String(Math.floor(hin / 12)), in0: String(hin % 12),
      weight: String(rint((hin - 60) * 4 + 150, (hin - 60) * 4 + 195)),
      ppg: String(r1(5, 32)), fg: String(rint(42, 58)), tp: String(rint(25, 45)), ft: String(rint(60, 92)),
      vert: String(r1(24, 44)), wingspan: String(hin + rint(0, 6)), sprint: String(r1(10.6, 13.4)),
      photo: randomPhoto ?? null,
    }))
    if (photoSource !== 'user') setPhotoSource('random')
  }

  return (
    <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-head">
          <h2>Add Yourself to the Universe</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn dice-btn" onClick={randomize}>🎲 Randomize</button>
            <div className="r-close" onClick={onCancel}>✕</div>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div className="photo-up" onClick={() => fileRef.current?.click()}>
                  {preview
                    ? <img src={preview} alt="" onError={e => { (e.target as HTMLImageElement).src = makeAvatarFromSeed(f.name || 'player', 96) }} />
                    : <span>TAP TO<br />ADD PHOTO</span>}
                </div>
                {/* remove button — only shown when there's a photo */}
                {f.photo && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removePhoto() }}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--pink)', border: '2px solid #000',
                      color: '#fff', fontSize: 11, lineHeight: 1, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', padding: 0,
                    }}
                    title="Remove photo"
                  >✕</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--ink-dim)', marginTop: 6 }}>
                {photoSource === 'user' ? 'your photo' : photoSource === 'random' ? 'random' : 'tap to add'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-grid">
                <div className="form-row full">
                  <label>Name *</label>
                  <input value={f.name} onChange={set('name')} placeholder="Your name" />
                </div>
                <div className="form-row">
                  <label>Position</label>
                  <select value={f.pos} onChange={set('pos')}>
                    {['PG', 'SG', 'SF', 'PF', 'C'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Level</label>
                  <select value={f.level} onChange={set('level')}>
                    {['Recreational', 'High School', 'College', 'G-League', 'NBA Rotation', 'NBA Starter', 'All-Star', 'Superstar'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-row full">
                  <label>Birth year *</label>
                  <NumStepper value={f.birthyear} onChange={set('birthyear')} step={1} min={1930} max={2018} placeholder="e.g. 1995" />
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: eraPreview ? 'var(--neon)' : 'var(--ink-dim)' }}>
                    {eraPreview ? `→ plays in the ${eraPreview} era` : 'required — sets your era'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="form-row">
              <label>Height</label>
              <div className="unit-row">
                <NumStepper value={f.ft0} onChange={set('ft0')} step={1} min={4} max={8} /><span>ft</span>
                <NumStepper value={f.in0} onChange={set('in0')} step={1} min={0} max={11} /><span>in</span>
              </div>
            </div>
            <div className="form-row">
              <label>Weight</label>
              <div className="unit-row">
                <NumStepper value={f.weight} onChange={set('weight')} step={1} min={100} max={400} placeholder="—" /><span>lbs</span>
              </div>
            </div>
          </div>

          <div className="divider-h">Stats <span className="optional">(optional)</span></div>
          <div className="sub-grid">
            <div className="form-row"><label>PPG</label><NumStepper value={f.ppg} onChange={set('ppg')} step={0.1} min={0} max={45} placeholder="—" /></div>
            <div className="form-row"><label>FG %</label><NumStepper value={f.fg} onChange={set('fg')} step={1} min={0} max={100} placeholder="—" /></div>
            <div className="form-row"><label>3P %</label><NumStepper value={f.tp} onChange={set('tp')} step={1} min={0} max={100} placeholder="—" /></div>
            <div className="form-row"><label>FT %</label><NumStepper value={f.ft} onChange={set('ft')} step={1} min={0} max={100} placeholder="—" /></div>
          </div>

          <div className="divider-h">Athleticism <span className="optional">(optional)</span></div>
          <div className="sub-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-row"><label>Vertical</label><div className="unit-row"><NumStepper value={f.vert} onChange={set('vert')} step={0.5} min={0} max={60} placeholder="—" /><span>in</span></div></div>
            <div className="form-row"><label>Wingspan</label><div className="unit-row"><NumStepper value={f.wingspan} onChange={set('wingspan')} step={0.5} min={50} max={100} placeholder="—" /><span>in</span></div></div>
            <div className="form-row"><label>100m</label><div className="unit-row"><NumStepper value={f.sprint} onChange={set('sprint')} step={0.1} min={9} max={20} placeholder="—" /><span>s</span></div></div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-reset" style={{ width: 'auto' }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.45 }}
            onClick={() => onSubmit(f)}>🏀 Add to Universe</button>
        </div>
      </div>
    </div>
  )
}

// ---- SALARY RESULT MODAL ----
export function SalaryResultModal({ result, onClose, onView }: {
  result: SalaryResult
  onClose: () => void
  onView: (r: SalaryResult) => void
}) {
  const f = result.identity
  const photo = f.photo ?? makeAvatarFromSeed(f.name, 144)
  return (
    <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h2>Your Market Value</h2>
          <div className="r-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div className="result-identity reveal-step" style={{ animationDelay: '0.05s' }}>
            <div className="polaroid result-poly" style={{ transform: 'rotate(-2deg)' }}>
              <div className="pic"><img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} /></div>
              <div className="cap">{f.name}</div>
            </div>
            <div className="result-name">{f.name}</div>
            <div className="result-sub">{f.pos} · {f.level} · {f.ft0}'{f.in0}" · {result.era} era</div>
          </div>

          <div className="range-display reveal-step" style={{ animationDelay: '0.25s' }}>
            <div className="seg lo"><div className="lbl">Low</div><div className="amt">{fmtM(result.low)}</div></div>
            <div className="seg mid"><div className="lbl">Estimate</div><div className="amt">{fmtM(result.mid)}</div></div>
            <div className="seg hi"><div className="lbl">High</div><div className="amt">{fmtM(result.high)}</div></div>
          </div>

          {result.comp && (
            <div className="compare-line reveal-step" style={{ animationDelay: '0.45s' }}>
              That's right around what <b>{result.comp.name}</b> pulled in
              <br />({fmtM(result.comp.salary)}/yr in their {result.comp.era} prime)
            </div>
          )}

          {result.recreational && (
            <div className="disclaimer reveal-step" style={{ animationDelay: '0.6s' }}>
              ⚠️ Hoop-dreams disclaimer: this figure is for entertainment only.
              Please keep your day job. 🏀
            </div>
          )}
        </div>
        <div className="modal-foot" style={{ justifyContent: 'center' }}>
          <button className="btn btn-pink" style={{ fontSize: 17, padding: '13px 26px' }}
            onClick={() => onView(result)}>✨ View in the Graph</button>
        </div>
      </div>
    </div>
  )
}
