import { useState, useCallback, useRef, useEffect } from 'react'

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:80px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 120px);display:flex;flex-direction:column;
    background:rgba(20,10,46,0.92);color:#fff;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:2px solid rgba(0,224,199,0.35);border-radius:14px;
    box-shadow:0 0 0 2px rgba(0,0,0,0.5),0 18px 50px rgba(0,0,0,0.6);
    font:11.5px/1.4 'Archivo',system-ui,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none;
    border-bottom:1px solid rgba(255,255,255,0.12)}
  .twk-hd b{font-size:13px;font-family:'Bungee',sans-serif;color:#eaff2b;text-shadow:1px 1px 0 #ff2d9b}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(255,255,255,0.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(255,45,155,0.4);color:#fff}
  .twk-body{padding:6px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:#7b2ff7 transparent}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(255,255,255,0.72)}
  .twk-lbl>span:first-child{font-weight:500;font-family:'Lilita One',sans-serif;font-size:12px}
  .twk-val{color:rgba(255,255,255,0.5);font-family:'VT323',monospace;font-size:15px}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    color:rgba(0,224,199,0.7);padding:10px 0 0;font-family:'Archivo',sans-serif}
  .twk-sect:first-child{padding-top:0}
  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:7px;margin:6px 0;
    border-radius:999px;background:linear-gradient(90deg,#00e0c7,#ff2d9b);outline:none;border:2px solid #000}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:20px;height:20px;border-radius:50%;background:#eaff2b;
    border:3px solid #000;box-shadow:0 0 8px #eaff2b;cursor:pointer}
  .twk-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;
    background:#eaff2b;border:3px solid #000;cursor:pointer}
  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:30px;padding:0 8px;
    border:2px solid rgba(0,224,199,0.35);border-radius:7px;
    background:rgba(0,0,0,0.4);color:#fff;font-family:'Archivo',sans-serif;outline:none}
  .twk-field:focus{border-color:#eaff2b}
  select.twk-field{padding-right:22px}
  .twk-chips{display:flex;gap:6px;flex-wrap:wrap}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:2px solid rgba(0,0,0,0.5);border-radius:8px;overflow:hidden;cursor:pointer;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12);transition:transform .12s,box-shadow .12s}
  .twk-chip:hover{transform:translateY(-2px);box-shadow:0 0 0 1.5px rgba(255,255,255,0.3),0 4px 10px rgba(0,0,0,.4)}
  .twk-chip[data-on="1"]{border-color:#fff;box-shadow:0 0 12px rgba(234,255,43,0.5)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.2)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
`

function isLight(hex: string): boolean {
  const h = String(hex).replace('#', '')
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0')
  const n = parseInt(x.slice(0, 6), 16)
  if (Number.isNaN(n)) return true
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return r * 299 + g * 587 + b * 114 > 148000
}

function Check({ light }: { light: boolean }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
    </svg>
  )
}

export function useTweaks<T extends Record<string, unknown>>(defaults: T): [T, (k: string, v: unknown) => void] {
  const [values, setValues] = useState<T>(defaults)
  const setTweak = useCallback((k: string, v: unknown) => {
    setValues(prev => ({ ...prev, [k]: v }))
  }, [])
  return [values, setTweak]
}

export function TweaksPanel({ title = 'Tweaks', children }: { title?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 16, y: 80 })
  const PAD = 16

  const clamp = useCallback(() => {
    const panel = dragRef.current
    if (!panel) return
    const w = panel.offsetWidth, h = panel.offsetHeight
    offsetRef.current = {
      x: Math.min(Math.max(PAD, window.innerWidth - w - PAD), Math.max(PAD, offsetRef.current.x)),
      y: Math.min(Math.max(PAD, window.innerHeight - h - PAD), Math.max(PAD, offsetRef.current.y)),
    }
    panel.style.right = offsetRef.current.x + 'px'
    panel.style.bottom = offsetRef.current.y + 'px'
  }, [])

  useEffect(() => {
    if (!open) return
    clamp()
    const ro = new ResizeObserver(clamp)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [open, clamp])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const t = e?.data?.type
      if (t === '__activate_edit_mode') setOpen(true)
      else if (t === '__deactivate_edit_mode') setOpen(false)
    }
    window.addEventListener('message', onMsg)
    window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current
    if (!panel) return
    const r = panel.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const startRight = window.innerWidth - r.right
    const startBottom = window.innerHeight - r.bottom
    const move = (ev: MouseEvent) => {
      offsetRef.current = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) }
      clamp()
    }
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  if (!open) return null
  return (
    <>
      <style>{TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" onClick={() => { setOpen(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*') }}>✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  )
}

export function TweakSection({ label }: { label: string }) {
  return <div className="twk-sect">{label}</div>
}

export function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span><span className="twk-val">{value}{unit}</span></div>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
        value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}

export function TweakSelect({ label, value, options, onChange }: {
  label: string; value: string
  options: string[] | { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <select className="twk-field" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </div>
  )
}

export function TweakColor({ label, value, options, onChange }: {
  label: string; value: string[]; options: string[][]; onChange: (v: string[]) => void
}) {
  const key = (o: string[]) => JSON.stringify(o).toLowerCase()
  const cur = key(value)
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div className="twk-chips">
        {options.map((o, i) => {
          const [hero, ...rest] = o
          const on = key(o) === cur
          return (
            <button key={i} type="button" className="twk-chip" data-on={on ? '1' : '0'}
              style={{ background: hero }} onClick={() => onChange(o)}>
              {rest.length > 0 && <span>{rest.slice(0, 4).map((c, j) => <i key={j} style={{ background: c }} />)}</span>}
              {on && <Check light={isLight(hero)} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
