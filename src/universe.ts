// NBA Universe — Three.js 3D controller.
// Renders players as glowing colored sprites in a dark starfield with
// orbit-drag, auto-rotation, screen-space DOM salary labels, hover/click.

import * as THREE from 'three'
import type { Player } from '../data/players'

const CAT_COLOR: Record<string, number> = {
  under: 0x00e37d,
  over: 0xff3b5c,
  fair: 0xffffff,
  user: 0xff7a18,
}

function makeRadial(stops: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(s => g.addColorStop(s[0], s[1]))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

interface Node {
  p: Player
  hit: THREE.Mesh
  localPos: THREE.Vector3
  galaxyPos: THREE.Vector3
  targetLocal: THREE.Vector3
  baseHalo: number
  color: THREE.Color
  label: HTMLElement
  phase: number
  _proj: THREE.Vector3
  _sx?: number
  _sy?: number
  _camDist?: number
  _screenR?: number
  _w?: number
  _h?: number
  _vis?: boolean
}

interface UserNode {
  p: Player
  halo: THREE.Sprite
  core: THREE.Sprite
  localPos: THREE.Vector3
  baseHalo: number
  baseCore: number
  color: THREE.Color
  phase: number
  _proj: THREE.Vector3
  _screenR?: number
}

interface FilterState {
  query: string
  topN: number
  positions: Set<string>
  eraFrom: number
  eraTo: number
  source: string
  statRanges: Record<string, [number, number]>
}

interface PtrRec {
  x: number
  y: number
}

interface Gesture {
  pan: boolean
  moved: number
  multi?: boolean
  dist?: number
  mid?: { x: number; y: number }
}

export class Universe {
  canvas: HTMLCanvasElement
  players: Player[]
  onHover: (p: Player | null) => void
  onSelect: (p: Player | null) => void
  labelLayer: HTMLElement

  W: number
  H: number
  R = 28
  baseCamZ = 62
  targetCamZ = 62
  panX = 0
  targetPanX = 0
  panOffX = 0
  panOffY = 0
  targetPanOffX = 0
  targetPanOffY = 0

  hoveredId: number | null = null
  selectedId: number | null = null
  visible: Record<number, boolean> = {}
  searchHi: number | null = null
  hoverCardEl: HTMLElement | null = null
  userNode: UserNode | null = null
  userPillEl: HTMLElement | null = null

  renderer!: THREE.WebGLRenderer
  scene!: THREE.Scene
  camera!: THREE.PerspectiveCamera
  group!: THREE.Group
  stars!: THREE.Points
  glowTex!: THREE.CanvasTexture
  coreTex!: THREE.CanvasTexture
  raycaster!: THREE.Raycaster
  pointer!: THREE.Vector2
  nodes: Node[] = []
  layout = 'galaxy'
  energy = 0.42
  spinSpeed = 0.0075 + 0.42 * 0.08

  ptrs = new Map<number, PtrRec>()
  _gesture: Gesture | null = null
  _cursor: { x: number; y: number } | null = null
  _focusTarget: THREE.Quaternion | null = null
  _autoPause = 0
  _last = 0
  _raf = 0
  _cax: { line: Element; dot: Element; label: Element; v: THREE.Vector3 }[] | null = null

  constructor(
    canvas: HTMLCanvasElement,
    opts: {
      players: Player[]
      labelLayer: HTMLElement
      onHover?: (p: Player | null) => void
      onSelect?: (p: Player | null) => void
    },
  ) {
    this.canvas = canvas
    this.players = opts.players
    this.onHover = opts.onHover ?? (() => {})
    this.onSelect = opts.onSelect ?? (() => {})
    this.labelLayer = opts.labelLayer

    this.W = window.innerWidth
    this.H = window.innerHeight

    this._initThree()
    this._buildStarfield()
    this._buildNodes()
    this._bindEvents()
    this.players.forEach(p => { this.visible[p.id] = true })
    this._raf = requestAnimationFrame(this._loop.bind(this))
  }

  _initThree() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    r.setSize(this.W, this.H, false)
    this.renderer = r

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x0a0518, 0.011)

    this.camera = new THREE.PerspectiveCamera(55, this.W / this.H, 0.1, 400)
    this.camera.position.set(0, 0, this.baseCamZ)
    this.camera.lookAt(0, 0, 0)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.glowTex = makeRadial([
      [0, 'rgba(255,255,255,0.85)'],
      [0.28, 'rgba(255,255,255,0.32)'],
      [0.7, 'rgba(255,255,255,0.05)'],
      [1, 'rgba(255,255,255,0)'],
    ])
    this.coreTex = makeRadial([
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.95)'],
      [0.55, 'rgba(255,255,255,0.25)'],
      [1, 'rgba(255,255,255,0)'],
    ])

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2(-2, -2)
  }

  _buildStarfield() {
    const N = 1400
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const palette: [number, number, number][] = [
      [0.6, 0.4, 1], [0.0, 0.88, 0.78], [1, 0.18, 0.6], [0.9, 1, 0.17], [1, 1, 1],
    ]
    for (let i = 0; i < N; i++) {
      const rr = 80 + Math.random() * 180
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = rr * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th)
      pos[i * 3 + 2] = rr * Math.cos(ph)
      const c = palette[(Math.random() * palette.length) | 0]
      const dim = 0.25 + Math.random() * 0.5
      col[i * 3] = c[0] * dim; col[i * 3 + 1] = c[1] * dim; col[i * 3 + 2] = c[2] * dim
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({
      size: 1.4, map: this.coreTex, transparent: true, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  _fibSphere(i: number, n: number): THREE.Vector3 {
    const golden = Math.PI * (3 - Math.sqrt(5))
    const y = 1 - (i / (n - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = golden * i
    return new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius)
  }

  _labelHTML(p: Player): string {
    if (p.category === 'user') {
      return `<span class="nm">★ ${p.name}</span><span class="sal">$${Number(p.salary).toFixed(0)}M/yr</span>`
    }
    const arrow = p.category === 'under' ? '▲' : (p.category === 'over' ? '▼' : '◆')
    const amt = (p.delta >= 0 ? '+' : '−') + '$' + Math.abs(p.delta).toFixed(0) + 'M'
    return `<span class="nm">${p.name}</span><span class="sal"><span class="arrow">${arrow}</span> ${amt}</span>`
  }

  _buildNodes() {
    this.nodes = []
    const n = this.players.length
    this.players.forEach((p, i) => {
      const dir = this._fibSphere(i, n)
      const rr = this.R * (0.78 + (p.per / 35) * 0.34) + Math.sin(i * 12.9) * 1.5
      const localPos = dir.multiplyScalar(rr)

      const color = new THREE.Color(CAT_COLOR[p.category] ?? CAT_COLOR.fair)
      const baseHalo = 3.0 + (p.ws / 20) * 2.4 + (p.per / 35) * 1.4

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(baseHalo * 0.85, 6, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      )
      hit.position.copy(localPos)
      hit.userData = { id: p.id }
      this.group.add(hit)

      const lbl = document.createElement('div')
      lbl.className = 'salary-label ' + p.category
      lbl.innerHTML = this._labelHTML(p)
      this.labelLayer.appendChild(lbl)

      this.nodes.push({
        p, hit, localPos,
        galaxyPos: localPos.clone(), targetLocal: localPos.clone(),
        baseHalo, color, label: lbl,
        phase: Math.random() * Math.PI * 2,
        _proj: new THREE.Vector3(),
      })
    })
    this.layout = 'galaxy'
  }

  setLayout(mode: string) {
    this.layout = mode
    const R = this.R
    const n = this.nodes.length
    const POS = ['PG', 'SG', 'SF', 'PF', 'C']
    const anchors: Record<string, THREE.Vector3> = {}
    POS.forEach((pos, i) => {
      const a = (i / POS.length) * Math.PI * 2
      anchors[pos] = new THREE.Vector3(Math.cos(a) * R * 1.05, 0, Math.sin(a) * R * 1.05)
    })
    const minY = 1990, maxY = 2024
    this.nodes.forEach((node, i) => {
      const p = node.p
      let t: THREE.Vector3
      if (mode === 'stats') {
        const nx = (p.ppg - 8) / (36 - 8)
        const ny = (p.per - 8) / (33 - 8)
        const by = p.birthYear
        const nz = Math.max(0, Math.min(1, (by - 1960) / (2005 - 1960)))
        t = new THREE.Vector3((nx - 0.5) * R * 2.5, (ny - 0.5) * R * 2.3, (nz - 0.5) * R * 2.5)
      } else if (mode === 'positions') {
        const a = anchors[p.pos] ?? new THREE.Vector3()
        const jx = Math.sin(i * 7.1) * 7, jy = Math.cos(i * 3.3) * 9, jz = Math.sin(i * 5.7) * 7
        t = new THREE.Vector3(a.x + jx, jy, a.z + jz)
      } else if (mode === 'eras') {
        const x = ((p.year - minY) / (maxY - minY) - 0.5) * R * 3.0
        t = new THREE.Vector3(x, Math.sin(i * 2.7) * 11, Math.cos(i * 1.9) * 11)
      } else if (mode === 'salary') {
        const y = Math.max(-1, Math.min(1, -node.p.delta / 30)) * R * 1.3
        const ring = (i / n) * Math.PI * 2
        const rad = R * 0.8
        t = new THREE.Vector3(Math.cos(ring) * rad, y, Math.sin(ring) * rad)
      } else {
        t = node.galaxyPos.clone()
      }
      node.targetLocal.copy(t)
    })
  }

  setEnergy(v: number) {
    this.energy = v
    this.spinSpeed = 0.0075 + v * 0.08
  }

  setPalette(starColors: string[], spaceHex: string) {
    if (spaceHex && this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(spaceHex)
    if (!starColors || !this.stars) return
    const col = (this.stars.geometry as THREE.BufferGeometry).attributes.color as THREE.BufferAttribute
    const arr = col.array as Float32Array
    const pal = starColors.map(h => { const c = new THREE.Color(h); return [c.r, c.g, c.b] as [number, number, number] })
    for (let i = 0; i < arr.length / 3; i++) {
      const c = pal[(Math.random() * pal.length) | 0]
      const dim = 0.25 + Math.random() * 0.5
      arr[i * 3] = c[0] * dim; arr[i * 3 + 1] = c[1] * dim; arr[i * 3 + 2] = c[2] * dim
    }
    col.needsUpdate = true
  }

  addUserPlayer(p: Player) {
    const dir = new THREE.Vector3(0.12, 0.18, 1).normalize()
    const localPos = dir.applyQuaternion(this.group.quaternion.clone().invert()).multiplyScalar(this.R * 0.7)
    const color = new THREE.Color(CAT_COLOR.user)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: color.clone(), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
    }))
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.coreTex, color: new THREE.Color(0xfff0d8), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
    }))
    halo.position.copy(localPos)
    core.position.copy(localPos)
    this.group.add(halo)
    this.group.add(core)

    const pill = document.createElement('div')
    pill.className = 'user-pill'
    pill.innerHTML = `${p.name || 'You'}<small>~$${(p.estSalary ?? 0).toFixed(1)}M/yr</small>`
    this.labelLayer.appendChild(pill)

    this.userNode = {
      p, halo, core, localPos,
      baseHalo: 5.2, baseCore: 1.9, color,
      phase: 0, _proj: new THREE.Vector3(),
    }
    this.userPillEl = pill
    this.focusLocal(localPos)
  }

  addRealPlayer(p: Player): Node {
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
    const rr = this.R * (0.82 + Math.random() * 0.28)
    const localPos = dir.multiplyScalar(rr)
    const color = new THREE.Color(CAT_COLOR[p.category] ?? CAT_COLOR.fair)
    const baseHalo = 3.0 + (p.ws / 20) * 2.4 + (p.per / 35) * 1.4

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(baseHalo * 0.85, 6, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    )
    hit.position.copy(localPos)
    hit.userData = { id: p.id }
    this.group.add(hit)

    const lbl = document.createElement('div')
    lbl.className = 'salary-label ' + p.category
    lbl.innerHTML = this._labelHTML(p)
    this.labelLayer.appendChild(lbl)

    const node: Node = {
      p, hit, localPos,
      galaxyPos: localPos.clone(), targetLocal: localPos.clone(),
      baseHalo, color, label: lbl,
      phase: Math.random() * Math.PI * 2, _proj: new THREE.Vector3(),
    }
    this.nodes.push(node)
    this.visible[p.id] = true
    if (!this.players.includes(p)) this.players.push(p)
    this.setLayout(this.layout)
    this._select(p.id)
    this.focusLocal(localPos)
    return node
  }

  removePlayer(id: number) {
    const idx = this.nodes.findIndex(n => n.p.id === id)
    if (idx === -1) return
    const node = this.nodes[idx]
    this.group.remove(node.hit)
    if (node.label.parentNode) node.label.parentNode.removeChild(node.label)
    this.nodes.splice(idx, 1)
    const pidx = this.players.findIndex(p => p.id === id)
    if (pidx !== -1) this.players.splice(pidx, 1)
    delete this.visible[id]
    if (this.hoveredId === id) { this.hoveredId = null; this.onHover(null) }
    if (this.selectedId === id) this._select(null)
  }

  applyFilter(state: FilterState): number {
    const q = (state.query || '').trim().toLowerCase()
    const ranked = [...this.players].sort((a, b) => b.per - a.per)
    const rank: Record<number, number> = {}
    ranked.forEach((p, i) => { rank[p.id] = i })
    let count = 0
    this.searchHi = null
    let firstMatch: number | null = null
    this.players.forEach(p => {
      let ok = true
      if (q && !p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) ok = false
      if (state.positions?.size && !state.positions.has(p.pos)) ok = false
      if (p.year < state.eraFrom || p.year > state.eraTo) ok = false
      if (state.source === 'added' && !p.added) ok = false
      if (state.source === 'original' && p.added) ok = false
      if (ok && state.statRanges) {
        for (const sf in state.statRanges) {
          const r = state.statRanges[sf]
          const val = p[sf as keyof Player] as number
          if (val < r[0] || val > r[1]) ok = false
        }
      }
      if (ok && rank[p.id] >= state.topN) ok = false
      this.visible[p.id] = ok
      if (ok) count++
      if (ok && q && firstMatch === null) firstMatch = p.id
    })
    if (q && firstMatch !== null) this.searchHi = firstMatch
    return count
  }

  focusOnSearch() {
    if (this.searchHi === null) return
    const node = this._nodeById(this.searchHi)
    if (node) { this.focusLocal(node.localPos); this._select(this.searchHi) }
  }

  selectById(id: number) { this._select(id); const n = this._nodeById(id); if (n) this.focusLocal(n.localPos) }

  deselect() { this._select(null) }

  focusLocal(localPos: THREE.Vector3) {
    const dir = localPos.clone().normalize()
    this._focusTarget = new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 0, 1))
    this.targetCamZ = 44
    this.targetPanOffX = 0; this.targetPanOffY = 0
    this._autoPause = 1.0
  }

  clearFocus() {
    this._focusTarget = null
    this.targetCamZ = this.baseCamZ
    this.targetPanX = 0
    this.targetPanOffX = 0; this.targetPanOffY = 0
  }

  recenter() {
    this.targetCamZ = this.baseCamZ
    this.targetPanOffX = 0; this.targetPanOffY = 0
  }

  recalibrate() {
    this._focusTarget = new THREE.Quaternion()
    this.targetPanOffX = 0; this.targetPanOffY = 0
    this._autoPause = 1.5
  }

  setCompass(el: SVGElement | null) {
    if (!el) { this._cax = null; return }
    this._cax = ['x', 'y', 'z'].map(k => ({
      line: el.querySelector(`[data-axis="${k}"] .ax-line`)!,
      dot: el.querySelector(`[data-axis="${k}"] .ax-dot`)!,
      label: el.querySelector(`[data-axis="${k}"] .ax-label`)!,
      v: new THREE.Vector3(k === 'x' ? 1 : 0, k === 'y' ? 1 : 0, k === 'z' ? 1 : 0),
    }))
  }

  _updateCompass() {
    if (!this._cax) return
    const L = 28, cx = 50, cy = 50, q = this.group.quaternion
    for (const a of this._cax) {
      const w = a.v.clone().applyQuaternion(q)
      const x = cx + w.x * L, y = cy - w.y * L
      a.line.setAttribute('x2', x.toFixed(1))
      a.line.setAttribute('y2', y.toFixed(1))
      a.dot.setAttribute('cx', x.toFixed(1))
      a.dot.setAttribute('cy', y.toFixed(1))
      a.label.setAttribute('x', (cx + w.x * (L + 9)).toFixed(1))
      a.label.setAttribute('y', (cy - w.y * (L + 9) + 3.4).toFixed(1))
      const op = (0.32 + 0.68 * ((w.z + 1) / 2)).toFixed(2)
      ;(a.line as HTMLElement).style.opacity = op
      ;(a.dot as HTMLElement).style.opacity = op
      ;(a.label as HTMLElement).style.opacity = op
    }
  }

  _select(id: number | null) {
    this.selectedId = id
    this.targetPanX = id === null ? 0 : 7
    const node = id === null ? null : this._nodeById(id)
    this.onSelect(node ? node.p : null)
    if (id === null) this.clearFocus()
  }

  setHoverCardEl(el: HTMLElement) { this.hoverCardEl = el }

  _bindEvents() {
    const c = this.canvas
    c.addEventListener('contextmenu', e => e.preventDefault())

    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId)
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      c.classList.add('dragging')
      if (this.ptrs.size === 1) {
        this._gesture = { pan: (e.button === 1 || e.button === 2 || e.shiftKey), moved: 0 }
      } else if (this.ptrs.size === 2) {
        this._gesture = { pan: false, moved: 999, multi: true, dist: this._ptrDist(), mid: this._ptrMid() }
      }
    })

    c.addEventListener('pointermove', e => {
      const rect = c.getBoundingClientRect()
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      this._cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const rec = this.ptrs.get(e.pointerId)
      if (!rec) return
      const dx = e.clientX - rec.x, dy = e.clientY - rec.y
      rec.x = e.clientX; rec.y = e.clientY

      if (this.ptrs.size >= 2 && this._gesture?.multi) {
        const dist = this._ptrDist(), mid = this._ptrMid()
        this.targetCamZ = Math.max(12, Math.min(240, this.targetCamZ + ((this._gesture.dist ?? dist) - dist) * 0.45))
        this._pan(mid.x - (this._gesture.mid?.x ?? mid.x), mid.y - (this._gesture.mid?.y ?? mid.y))
        this._gesture.dist = dist; this._gesture.mid = mid
        this._autoPause = 1.2; this._focusTarget = null
      } else if (this.ptrs.size === 1 && this._gesture) {
        this._gesture.moved += Math.abs(dx) + Math.abs(dy)
        if (this._gesture.pan) this._pan(dx, dy)
        else this._orbit(dx * 0.005, dy * 0.005)
        this._autoPause = 1.2; this._focusTarget = null
      }
    })

    const up = (e: PointerEvent) => {
      if (this.ptrs.size === 1 && this._gesture && !this._gesture.pan && !this._gesture.multi && this._gesture.moved < 6) {
        this._click()
      }
      this.ptrs.delete(e.pointerId)
      try { c.releasePointerCapture(e.pointerId) } catch (_) {}
      if (this.ptrs.size === 0) { this._gesture = null; c.classList.remove('dragging') }
      else if (this.ptrs.size === 1) { this._gesture = { pan: false, moved: 999 } }
    }
    c.addEventListener('pointerup', up)
    c.addEventListener('pointercancel', up)

    c.addEventListener('wheel', e => {
      e.preventDefault()
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      this.targetCamZ = Math.max(12, Math.min(240, this.targetCamZ + step * 0.32))
    }, { passive: false })

    window.addEventListener('resize', this._resize.bind(this))
  }

  _ptrArr(): PtrRec[] { return Array.from(this.ptrs.values()) }
  _ptrDist(): number { const a = this._ptrArr(); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }
  _ptrMid(): { x: number; y: number } { const a = this._ptrArr(); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 } }

  _pan(dx: number, dy: number) {
    const camDist = Math.abs(this.camera.position.z)
    const factor = (2 * Math.tan(this.camera.fov * Math.PI / 360) * camDist) / this.H
    this.targetPanOffX -= dx * factor
    this.targetPanOffY += dy * factor
  }

  _pickAt(cx: number, cy: number): number | null {
    let best: number | null = null, bestDist = Infinity
    for (const n of this.nodes) {
      if (!this.visible[n.p.id] || n._vis === false) continue
      const w = (n._w ?? 80) / 2 + 4, h = (n._h ?? 34) / 2 + 4
      const sx = n._sx ?? 0, sy = n._sy ?? 0, cd = n._camDist ?? Infinity
      if (Math.abs(cx - sx) <= w && Math.abs(cy - sy) <= h && cd < bestDist) {
        bestDist = cd; best = n.p.id
      }
    }
    return best
  }

  _nodeById(id: number): Node | null {
    return this.nodes.find(n => n.p.id === id) ?? null
  }

  _orbit(yaw: number, pitch: number) {
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch)
    this.group.quaternion.premultiply(qy).premultiply(qx)
  }

  _click() {
    const id = this._cursor ? this._pickAt(this._cursor.x, this._cursor.y) : null
    if (id !== null) {
      this._select(id)
      const node = this._nodeById(id)
      if (node) this.focusLocal(node.localPos)
    } else {
      this._select(null)
    }
  }

  _resize() {
    this.W = window.innerWidth; this.H = window.innerHeight
    this.camera.aspect = this.W / this.H
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.W, this.H, false)
  }

  _project(localPos: THREE.Vector3, out: THREE.Vector3): { x: number; y: number; z: number } {
    out.copy(localPos).applyQuaternion(this.group.quaternion).project(this.camera)
    return { x: (out.x * 0.5 + 0.5) * this.W, y: (-out.y * 0.5 + 0.5) * this.H, z: out.z }
  }

  _updateNode(n: Node, time: number, camPos: THREE.Vector3) {
    const id = n.p.id
    const vis = this.visible[id]
    const hovered = id === this.hoveredId
    const selected = id === this.selectedId
    const hi = this.searchHi !== null && id === this.searchHi

    if (!vis) {
      n.hit.visible = false; n._vis = false
      if (n.label) n.label.style.opacity = '0'
      return
    }
    n.hit.visible = true

    if (n.targetLocal && n.localPos.distanceToSquared(n.targetLocal) > 0.01) {
      n.localPos.lerp(n.targetLocal, 0.07)
      n.hit.position.copy(n.localPos)
    }

    const worldPos = n.localPos.clone().applyQuaternion(this.group.quaternion)
    const camDist = worldPos.distanceTo(camPos)
    const s = this._project(n.localPos, n._proj)
    n._screenR = 26
    n._sx = s.x; n._sy = s.y; n._camDist = camDist
    if (!n._w && n.label.offsetWidth) { n._w = n.label.offsetWidth; n._h = n.label.offsetHeight }

    // keep time in use to avoid lint error
    void time

    if (n.label) {
      const onscreen = s.z < 1
      let op = 0
      if (onscreen) {
        op = Math.max(0.3, Math.min(1, (this.baseCamZ + 10 - camDist) / 26))
        if (hovered || selected || hi) op = 1
      }
      n._vis = op > 0.05 && onscreen
      n.label.style.opacity = String(op)
      n.label.style.zIndex = String(Math.round(1000 - camDist) + (hovered || selected ? 4000 : 0))
      n.label.classList.toggle('hovered', hovered)
      n.label.classList.toggle('selected', selected || hi)
      if (op > 0.02) {
        n.label.style.left = s.x + 'px'
        n.label.style.top = s.y + 'px'
      }
    }
  }

  _updateUserNode(n: UserNode, time: number, camPos: THREE.Vector3) {
    const amp = 0.04 + this.energy * 0.16
    const spd = 0.6 + this.energy * 1.1
    const pulse = 1 + Math.sin(time * spd + n.phase) * amp
    const hs = n.baseHalo * pulse, cs = n.baseCore * pulse
    n.halo.scale.set(hs, hs, 1); n.core.scale.set(cs, cs, 1)
    const worldPos = n.localPos.clone().applyQuaternion(this.group.quaternion)
    const camDist = worldPos.distanceTo(camPos)
    const s = this._project(n.localPos, n._proj)
    n._screenR = (hs * 0.5) * (this.H / (2 * Math.tan(this.camera.fov * Math.PI / 360) * camDist))
    if (this.userPillEl) {
      const onscreen = s.z < 1 && s.x > -50 && s.x < this.W + 50 && s.y > -50 && s.y < this.H + 50
      this.userPillEl.style.opacity = onscreen ? '1' : '0'
      this.userPillEl.style.left = s.x + 'px'
      this.userPillEl.style.top = (s.y - (n._screenR ?? 0)) + 'px'
    }
  }

  _loop(t: number) {
    this._raf = requestAnimationFrame(this._loop.bind(this))
    const time = t * 0.001
    const dt = Math.min(0.05, time - (this._last || time))
    this._last = time

    let hoverId: number | null = null
    if (this.ptrs.size === 0 && this._cursor) {
      hoverId = this._pickAt(this._cursor.x, this._cursor.y)
    }
    if (hoverId !== this.hoveredId) {
      this.hoveredId = hoverId
      this.canvas.style.cursor = hoverId !== null ? 'pointer' : 'grab'
      const hn = hoverId === null ? null : this._nodeById(hoverId)
      this.onHover(hn ? hn.p : null)
    }

    if (this._autoPause > 0) this._autoPause -= dt
    const paused = this.hoveredId !== null || this.selectedId !== null || this.ptrs.size > 0 || this._autoPause > 0 || !!this._focusTarget
    if (!paused) this._orbit(this.spinSpeed * dt, 0)

    if (this._focusTarget) {
      this.group.quaternion.slerp(this._focusTarget, 0.08)
      if (this.group.quaternion.angleTo(this._focusTarget) < 0.01) this._focusTarget = null
    }

    this.camera.position.z += (this.targetCamZ - this.camera.position.z) * 0.18
    this.panX += (this.targetPanX - this.panX) * 0.08
    this.panOffX += (this.targetPanOffX - this.panOffX) * 0.2
    this.panOffY += (this.targetPanOffY - this.panOffY) * 0.2
    const cx = this.panX + this.panOffX, cy = this.panOffY
    this.camera.position.x = cx
    this.camera.position.y = cy
    this.camera.lookAt(cx, cy, 0)

    this.stars.rotation.y += 0.004 * dt

    const camPos = this.camera.position
    for (const node of this.nodes) this._updateNode(node, time, camPos)
    if (this.userNode) this._updateUserNode(this.userNode, time, camPos)

    if (this.hoverCardEl && this.hoveredId !== null) {
      const n = this._nodeById(this.hoveredId)
      if (n) {
        const s = this._project(n.localPos, n._proj)
        const cw = this.hoverCardEl.offsetWidth || 230
        const ch = this.hoverCardEl.offsetHeight || 170
        const left = Math.max(cw / 2 + 8, Math.min(this.W - cw / 2 - 8, s.x))
        const top = Math.max(ch + 12, Math.min(this.H - 8, s.y - (n._screenR ?? 0) - 6))
        this.hoverCardEl.style.left = left + 'px'
        this.hoverCardEl.style.top = top + 'px'
      }
    }

    this._updateCompass()
    this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    cancelAnimationFrame(this._raf)
    this.renderer.dispose()
  }
}
