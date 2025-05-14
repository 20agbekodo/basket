/* ============================================================
   NBA UNIVERSE — Three.js 3D controller
   Renders players as glowing colored sprites in a dark
   starfield, with orbit-drag, auto-rotation, raycast hover/
   click, screen-projected DOM salary labels, search-focus,
   and a user "orange sphere" with floating pill.
   Exposes window.Universe (a class) — instantiate once.
   ============================================================ */
(function () {
  const CAT_COLOR = {
    under: 0x00e37d,
    over:  0xff3b5c,
    fair:  0xffffff,
    user:  0xff7a18,
  };

  // ---- shared sprite textures -------------------------------------------
  function makeRadial(stops) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  class Universe {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.players = opts.players;
      this.onHover = opts.onHover || function () {};
      this.onSelect = opts.onSelect || function () {};
      this.labelLayer = opts.labelLayer;

      this.W = window.innerWidth; this.H = window.innerHeight;
      this.R = 28;                       // sphere radius
      this.baseCamZ = 62;
      this.targetCamZ = 62;
      this.panX = 0; this.targetPanX = 0;
      this.panOffX = 0; this.panOffY = 0;
      this.targetPanOffX = 0; this.targetPanOffY = 0;

      this.hoveredId = null;
      this.selectedId = null;
      this.visible = {};                 // id -> bool (filter)
      this.searchHi = null;              // id highlighted by search
      this.hoverCardEl = null;
      this.userNode = null;
      this.userPillEl = null;

      this._initThree();
      window.__universe = this;
      this._buildStarfield();
      this._buildNodes();
      this._bindEvents();
      this.players.forEach(function (p) { this.visible[p.id] = true; }, this);
      this._raf = requestAnimationFrame(this._loop.bind(this));
    }

    _initThree() {
      const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setSize(this.W, this.H, false);
      this.renderer = r;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x0a0518, 0.011);

      this.camera = new THREE.PerspectiveCamera(55, this.W / this.H, 0.1, 400);
      this.camera.position.set(0, 0, this.baseCamZ);
      this.camera.lookAt(0, 0, 0);

      // group holds all player nodes; we rotate this group (quaternion orbit)
      this.group = new THREE.Group();
      this.scene.add(this.group);

      this.glowTex = makeRadial([
        [0, 'rgba(255,255,255,0.85)'],
        [0.28, 'rgba(255,255,255,0.32)'],
        [0.7, 'rgba(255,255,255,0.05)'],
        [1, 'rgba(255,255,255,0)'],
      ]);
      this.coreTex = makeRadial([
        [0, 'rgba(255,255,255,1)'],
        [0.35, 'rgba(255,255,255,0.95)'],
        [0.55, 'rgba(255,255,255,0.25)'],
        [1, 'rgba(255,255,255,0)'],
      ]);

      this.raycaster = new THREE.Raycaster();
      this.raycaster.params.Sprite = { threshold: 0 };
      this.pointer = new THREE.Vector2(-2, -2);
    }

    _buildStarfield() {
      const N = 1400;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const palette = [
        [0.6, 0.4, 1], [0.0, 0.88, 0.78], [1, 0.18, 0.6], [0.9, 1, 0.17], [1, 1, 1],
      ];
      for (let i = 0; i < N; i++) {
        // shell well beyond the play sphere
        const rr = 80 + Math.random() * 180;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = rr * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
        pos[i * 3 + 2] = rr * Math.cos(ph);
        const c = palette[(Math.random() * palette.length) | 0];
        const dim = 0.25 + Math.random() * 0.5;
        col[i * 3] = c[0] * dim; col[i * 3 + 1] = c[1] * dim; col[i * 3 + 2] = c[2] * dim;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: 1.4, map: this.coreTex, transparent: true, vertexColors: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      });
      this.stars = new THREE.Points(geo, mat);
      this.scene.add(this.stars);
    }

    _fibSphere(i, n) {
      // even distribution on unit sphere
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    }

    _buildNodes() {
      this.nodes = [];
      const n = this.players.length;
      this.players.forEach(function (p, i) {
        const dir = this._fibSphere(i, n);
        // perturb radius a touch by PER so stars sit at slightly different depths
        const rr = this.R * (0.78 + (p.per / 35) * 0.34) + (Math.sin(i * 12.9) * 1.5);
        const localPos = dir.multiplyScalar(rr);

        const color = new THREE.Color(CAT_COLOR[p.category]);
        const baseHalo = 3.0 + (p.ws / 20) * 2.4 + (p.per / 35) * 1.4;

        // invisible hit-target (raycastable, renders nothing) — the visible
        // representation of a player is now the DOM name box, not a glowing dot
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(baseHalo * 0.85, 6, 6),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        hit.position.copy(localPos);
        hit.userData = { id: p.id };
        this.group.add(hit);

        // DOM salary label
        const lbl = document.createElement('div');
        lbl.className = 'salary-label ' + p.category;
        lbl.innerHTML = this._labelHTML(p);
        this.labelLayer.appendChild(lbl);

        this.nodes.push({
          p: p, hit: hit, localPos: localPos,
          galaxyPos: localPos.clone(), targetLocal: localPos.clone(),
          baseHalo: baseHalo, color: color, label: lbl,
          phase: Math.random() * Math.PI * 2,
          _proj: new THREE.Vector3(),
        });
      }, this);
      this.layout = 'galaxy';
    }

    // ---- layout modes: reshape the spatial meaning of the universe -------
    setLayout(mode) {
      this.layout = mode;
      const R = this.R;
      const n = this.nodes.length;
      // position-cluster anchors around a ring
      const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
      const anchors = {};
      POS.forEach(function (pos, i) {
        const a = (i / POS.length) * Math.PI * 2;
        anchors[pos] = new THREE.Vector3(Math.cos(a) * R * 1.05, 0, Math.sin(a) * R * 1.05);
      });
      const minY = 1990, maxY = 2024;
      this.nodes.forEach(function (node, i) {
        const p = node.p;
        let t;
        if (mode === 'stats') {
          // X = scoring (PPG), Y = value (PER), Z = birth year (younger → forward)
          const nx = (p.ppg - 8) / (36 - 8);
          const ny = (p.per - 8) / (33 - 8);
          const by = (p.birthYear != null ? p.birthYear : p.year - 25);
          const nz = Math.max(0, Math.min(1, (by - 1960) / (2005 - 1960)));
          t = new THREE.Vector3((nx - 0.5) * R * 2.5, (ny - 0.5) * R * 2.3, (nz - 0.5) * R * 2.5);
        } else if (mode === 'positions') {
          const a = anchors[p.pos] || new THREE.Vector3();
          const jx = (Math.sin(i * 7.1) * 7), jy = (Math.cos(i * 3.3) * 9), jz = (Math.sin(i * 5.7) * 7);
          t = new THREE.Vector3(a.x + jx, jy, a.z + jz);
        } else if (mode === 'eras') {
          const x = ((p.year - minY) / (maxY - minY) - 0.5) * R * 3.0;
          t = new THREE.Vector3(x, (Math.sin(i * 2.7) * 11), (Math.cos(i * 1.9) * 11));
        } else if (mode === 'salary') {
          // underpaid float high, overpaid sink low, fair in the middle band
          const y = Math.max(-1, Math.min(1, -node.p.delta / 30)) * R * 1.3;
          const ring = (i / n) * Math.PI * 2;
          const rad = R * 0.8;
          t = new THREE.Vector3(Math.cos(ring) * rad, y, Math.sin(ring) * rad);
        } else { // galaxy
          t = node.galaxyPos.clone();
        }
        node.targetLocal.copy(t);
      });
    }

    setEnergy(v) { this.energy = v; this.spinSpeed = 0.0075 + v * 0.08; }  // 0..1 (half-speed motion)

    setPalette(starColors, spaceHex) {
      if (spaceHex && this.scene.fog) this.scene.fog.color.set(spaceHex);
      if (!starColors || !this.stars) return;
      const col = this.stars.geometry.attributes.color;
      const arr = col.array;
      const pal = starColors.map(function (h) { const c = new THREE.Color(h); return [c.r, c.g, c.b]; });
      for (let i = 0; i < arr.length / 3; i++) {
        const c = pal[(Math.random() * pal.length) | 0];
        const dim = 0.25 + Math.random() * 0.5;
        arr[i * 3] = c[0] * dim; arr[i * 3 + 1] = c[1] * dim; arr[i * 3 + 2] = c[2] * dim;
      }
      col.needsUpdate = true;
    }

    // ---- user player -----------------------------------------------------
    addUserPlayer(p) {
      // place near front-center of the current view
      const dir = new THREE.Vector3(0.12, 0.18, 1).normalize();
      const localPos = dir.applyQuaternion(this.group.quaternion.clone().invert()).multiplyScalar(this.R * 0.7);
      const color = new THREE.Color(CAT_COLOR.user);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color: color.clone(), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
      }));
      const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.coreTex, color: new THREE.Color(0xfff0d8), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
      }));
      halo.position.copy(localPos); core.position.copy(localPos);
      this.group.add(halo); this.group.add(core);

      const pill = document.createElement('div');
      pill.className = 'user-pill';
      pill.innerHTML = (p.name || 'You') + '<small>~$' + (p.estSalary || 0).toFixed(1) + 'M/yr</small>';
      this.labelLayer.appendChild(pill);

      this.userNode = {
        p: p, halo: halo, core: core, localPos: localPos,
        baseHalo: 5.2, baseCore: 1.9, color: color, phase: 0,
        _proj: new THREE.Vector3(),
      };
      this.userPillEl = pill;
      this.focusLocal(localPos);
    }

    // ---- add a real, filterable player at runtime ------------------------
    _labelHTML(p) {
      if (p.category === 'user') {
        return '<span class="nm">★ ' + p.name + '</span><span class="sal">$' + Number(p.salary).toFixed(0) + 'M/yr</span>';
      }
      const arrow = p.category === 'under' ? '▲' : (p.category === 'over' ? '▼' : '◆');
      const amt = (p.delta >= 0 ? '+' : '−') + '$' + Math.abs(p.delta).toFixed(0) + 'M';
      return '<span class="nm">' + p.name + '</span><span class="sal"><span class="arrow">' + arrow + '</span> ' + amt + '</span>';
    }

    removePlayer(id) {
      const idx = this.nodes.findIndex(function (n) { return n.p.id === id; });
      if (idx === -1) return;
      const node = this.nodes[idx];
      if (node.hit) this.group.remove(node.hit);
      if (node.label && node.label.parentNode) node.label.parentNode.removeChild(node.label);
      this.nodes.splice(idx, 1);
      const pidx = this.players.findIndex(function (p) { return p.id === id; });
      if (pidx !== -1) this.players.splice(pidx, 1);
      delete this.visible[id];
      if (this.hoveredId === id) { this.hoveredId = null; this.onHover(null); }
      if (this.selectedId === id) this._select(null);
    }

    addRealPlayer(p) {
      const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      const rr = this.R * (0.82 + Math.random() * 0.28);
      const localPos = dir.multiplyScalar(rr);
      const color = new THREE.Color(CAT_COLOR[p.category] || CAT_COLOR.fair);
      const baseHalo = 3.0 + (p.ws / 20) * 2.4 + (p.per / 35) * 1.4;

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(baseHalo * 0.85, 6, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hit.position.copy(localPos);
      hit.userData = { id: p.id };
      this.group.add(hit);

      const lbl = document.createElement('div');
      lbl.className = 'salary-label ' + p.category;
      lbl.innerHTML = this._labelHTML(p);
      this.labelLayer.appendChild(lbl);

      const node = {
        p: p, hit: hit, localPos: localPos,
        galaxyPos: localPos.clone(), targetLocal: localPos.clone(),
        baseHalo: baseHalo, color: color, label: lbl,
        phase: Math.random() * Math.PI * 2, _proj: new THREE.Vector3(),
      };
      this.nodes.push(node);
      this.visible[p.id] = true;
      if (this.players.indexOf(p) === -1) this.players.push(p);
      this.setLayout(this.layout);
      this._select(p.id);
      this.focusLocal(localPos);
      return node;
    }

    // ---- filtering -------------------------------------------------------
    applyFilter(state) {
      // state: { query, topN, positions:Set, eraFrom, eraTo }
      const q = (state.query || '').trim().toLowerCase();
      // rank by PER for topN
      const ranked = this.players.slice().sort(function (a, b) { return b.per - a.per; });
      const rank = {};
      ranked.forEach(function (p, i) { rank[p.id] = i; });
      let count = 0;
      this.searchHi = null;
      let firstMatch = null;
      this.players.forEach(function (p) {
        let ok = true;
        if (q && p.name.toLowerCase().indexOf(q) === -1 && p.team.toLowerCase().indexOf(q) === -1) ok = false;
        if (state.positions && state.positions.size && !state.positions.has(p.pos)) ok = false;
        if (p.year < state.eraFrom || p.year > state.eraTo) ok = false;
        if (state.source === 'added' && !p.added) ok = false;
        if (state.source === 'original' && p.added) ok = false;
        if (ok && state.statRanges) {
          for (const sf in state.statRanges) {
            const r = state.statRanges[sf];
            if (p[sf] < r[0] || p[sf] > r[1]) ok = false;
          }
        }
        if (ok && rank[p.id] >= state.topN) ok = false;
        this.visible[p.id] = ok;
        if (ok) count++;
        if (ok && q && firstMatch === null) firstMatch = p.id;
      }, this);
      if (q && firstMatch !== null) this.searchHi = firstMatch;
      return count;
    }

    focusOnSearch() {
      if (this.searchHi === null) return;
      const node = this._nodeById(this.searchHi);
      if (node) { this.focusLocal(node.localPos); this._select(this.searchHi); }
    }

    selectById(id) { this._select(id); const n = this._nodeById(id); if (n) this.focusLocal(n.localPos); }

    deselect() { this._select(null); }

    // ---- focus: bring a local point to the front (+Z) --------------------
    focusLocal(localPos) {
      const dir = localPos.clone().normalize();
      const target = new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 0, 1));
      this._focusTarget = target;
      this.targetCamZ = 44;
      this.targetPanOffX = 0; this.targetPanOffY = 0;
      this._autoPause = 1.0;
    }

    clearFocus() {
      this._focusTarget = null;
      this.targetCamZ = this.baseCamZ;
      this.targetPanX = 0;
      this.targetPanOffX = 0; this.targetPanOffY = 0;
    }

    recenter() {
      this.targetCamZ = this.baseCamZ;
      this.targetPanOffX = 0; this.targetPanOffY = 0;
    }

    // snap orientation back to home: X→right, Y→up, Z→toward the screen
    recalibrate() {
      this._focusTarget = new THREE.Quaternion();   // identity
      this.targetPanOffX = 0; this.targetPanOffY = 0;
      this._autoPause = 1.5;
    }

    // ---- live orientation compass (top-right gizmo) ----------------------
    setCompass(el) {
      this.compassEl = el;
      if (!el) { this._cax = null; return; }
      this._cax = ['x', 'y', 'z'].map(function (k) {
        const g = el.querySelector('[data-axis="' + k + '"]');
        return {
          line: g.querySelector('.ax-line'),
          dot: g.querySelector('.ax-dot'),
          label: g.querySelector('.ax-label'),
          v: new THREE.Vector3(k === 'x' ? 1 : 0, k === 'y' ? 1 : 0, k === 'z' ? 1 : 0),
        };
      });
    }

    _updateCompass() {
      if (!this._cax) return;
      const L = 28, cx = 50, cy = 50, q = this.group.quaternion;
      for (let i = 0; i < this._cax.length; i++) {
        const a = this._cax[i];
        const w = a.v.clone().applyQuaternion(q);
        const x = cx + w.x * L, y = cy - w.y * L;
        a.line.setAttribute('x2', x.toFixed(1));
        a.line.setAttribute('y2', y.toFixed(1));
        a.dot.setAttribute('cx', x.toFixed(1));
        a.dot.setAttribute('cy', y.toFixed(1));
        a.label.setAttribute('x', (cx + w.x * (L + 9)).toFixed(1));
        a.label.setAttribute('y', (cy - w.y * (L + 9) + 3.4).toFixed(1));
        const op = (0.32 + 0.68 * ((w.z + 1) / 2)).toFixed(2);
        a.line.style.opacity = op; a.dot.style.opacity = op; a.label.style.opacity = op;
      }
    }

    _select(id) {
      this.selectedId = id;
      this.targetPanX = id === null ? 0 : 7;   // shift scene left so right panel doesn't cover it
      const node = id === null ? null : this._nodeById(id);
      this.onSelect(node ? node.p : null);
      if (id === null) this.clearFocus();
    }

    setHoverCardEl(el) { this.hoverCardEl = el; }

    // ---- events ----------------------------------------------------------
    _bindEvents() {
      const c = this.canvas;
      this.ptrs = new Map();
      this._gesture = null;
      c.addEventListener('contextmenu', (e) => e.preventDefault());

      c.addEventListener('pointerdown', (e) => {
        c.setPointerCapture(e.pointerId);
        this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        c.classList.add('dragging');
        if (this.ptrs.size === 1) {
          this._gesture = { pan: (e.button === 1 || e.button === 2 || e.shiftKey), moved: 0 };
        } else if (this.ptrs.size === 2) {
          this._gesture = { multi: true, dist: this._ptrDist(), mid: this._ptrMid() };
        }
      });

      c.addEventListener('pointermove', (e) => {
        const rect = c.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const rec = this.ptrs.get(e.pointerId);
        if (!rec) return;
        const dx = e.clientX - rec.x, dy = e.clientY - rec.y;
        rec.x = e.clientX; rec.y = e.clientY;

        if (this.ptrs.size >= 2 && this._gesture && this._gesture.multi) {
          const dist = this._ptrDist(), mid = this._ptrMid();
          this.targetCamZ = Math.max(12, Math.min(240, this.targetCamZ + (this._gesture.dist - dist) * 0.45));
          this._pan(mid.x - this._gesture.mid.x, mid.y - this._gesture.mid.y);
          this._gesture.dist = dist; this._gesture.mid = mid;
          this._autoPause = 1.2; this._focusTarget = null;
        } else if (this.ptrs.size === 1 && this._gesture) {
          this._gesture.moved += Math.abs(dx) + Math.abs(dy);
          if (this._gesture.pan) this._pan(dx, dy);
          else this._orbit(dx * 0.005, dy * 0.005);
          this._autoPause = 1.2; this._focusTarget = null;
        }
      });

      const up = (e) => {
        if (this.ptrs.size === 1 && this._gesture && !this._gesture.pan && !this._gesture.multi && this._gesture.moved < 6) {
          this._click();
        }
        this.ptrs.delete(e.pointerId);
        try { c.releasePointerCapture(e.pointerId); } catch (_) {}
        if (this.ptrs.size === 0) { this._gesture = null; c.classList.remove('dragging'); }
        else if (this.ptrs.size === 1) { this._gesture = { pan: false, moved: 999 }; }
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);

      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const step = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
        this.targetCamZ = Math.max(12, Math.min(240, this.targetCamZ + step * 0.32));
      }, { passive: false });
      window.addEventListener('resize', this._resize.bind(this));
    }

    _ptrArr() { return Array.from(this.ptrs.values()); }
    _ptrDist() { const a = this._ptrArr(); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    _ptrMid() { const a = this._ptrArr(); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }

    _pan(dx, dy) {
      const camDist = Math.abs(this.camera.position.z);
      const factor = (2 * Math.tan(this.camera.fov * Math.PI / 360) * camDist) / this.H;
      this.targetPanOffX -= dx * factor;
      this.targetPanOffY += dy * factor;
    }

    // screen-space pick: the player whose name box is under the cursor (front-most)
    _pickAt(cx, cy) {
      let best = null, bestDist = Infinity;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (!this.visible[n.p.id] || n._vis === false) continue;
        const w = (n._w || 80) / 2 + 4, h = (n._h || 34) / 2 + 4;
        if (Math.abs(cx - n._sx) <= w && Math.abs(cy - n._sy) <= h && n._camDist < bestDist) {
          bestDist = n._camDist; best = n.p.id;
        }
      }
      return best;
    }

    _nodeById(id) {
      for (let i = 0; i < this.nodes.length; i++) if (this.nodes[i].p.id === id) return this.nodes[i];
      return null;
    }

    _orbit(yaw, pitch) {
      const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      this.group.quaternion.premultiply(qy).premultiply(qx);
    }

    _click() {
      const id = this._cursor ? this._pickAt(this._cursor.x, this._cursor.y) : null;
      if (id != null) {
        this._select(id);
        const node = this._nodeById(id);
        if (node) this.focusLocal(node.localPos);
      } else {
        this._select(null);
      }
    }

    _resize() {
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H, false);
    }

    // ---- main loop -------------------------------------------------------
    _loop(t) {
      this._raf = requestAnimationFrame(this._loop.bind(this));
      const time = t * 0.001;
      const dt = Math.min(0.05, time - (this._last || time)); this._last = time;

      // hover pick (screen-space, only when not dragging)
      let hoverId = null;
      if (this.ptrs.size === 0 && this._cursor) {
        hoverId = this._pickAt(this._cursor.x, this._cursor.y);
      }
      if (hoverId !== this.hoveredId) {
        this.hoveredId = hoverId;
        this.canvas.style.cursor = hoverId !== null ? 'pointer' : 'grab';
        const hn = hoverId === null ? null : this._nodeById(hoverId);
        this.onHover(hn ? hn.p : null);
      }

      // auto-rotate unless paused (hover / focus / drag / selection)
      if (this._autoPause > 0) this._autoPause -= dt;
      const paused = this.hoveredId !== null || this.selectedId !== null || this.ptrs.size > 0 || this._autoPause > 0 || this._focusTarget;
      if (!paused) this._orbit((this.spinSpeed != null ? this.spinSpeed : 0.05) * dt, 0);

      // focus slerp
      if (this._focusTarget) {
        this.group.quaternion.slerp(this._focusTarget, 0.08);
        if (this.group.quaternion.angleTo(this._focusTarget) < 0.01) this._focusTarget = null;
      }

      // camera dolly + pan ease
      this.camera.position.z += (this.targetCamZ - this.camera.position.z) * 0.18;
      this.panX += (this.targetPanX - this.panX) * 0.08;
      this.panOffX += (this.targetPanOffX - this.panOffX) * 0.2;
      this.panOffY += (this.targetPanOffY - this.panOffY) * 0.2;
      const cx = this.panX + this.panOffX, cy = this.panOffY;
      this.camera.position.x = cx;
      this.camera.position.y = cy;
      this.camera.lookAt(cx, cy, 0);

      this.stars.rotation.y += 0.004 * dt;

      // update nodes (scale pulse + highlight) and project labels
      const camPos = this.camera.position;
      for (let i = 0; i < this.nodes.length; i++) this._updateNode(this.nodes[i], time, camPos, false);
      if (this.userNode) this._updateNode(this.userNode, time, camPos, true);

      // hover card glue (clamped to stay fully on-screen)
      if (this.hoverCardEl && this.hoveredId !== null) {
        const n = this._nodeById(this.hoveredId);
        if (n) {
        const s = this._project(n.localPos, n._proj);
        const cw = this.hoverCardEl.offsetWidth || 230;
        const ch = this.hoverCardEl.offsetHeight || 170;
        const left = Math.max(cw / 2 + 8, Math.min(this.W - cw / 2 - 8, s.x));
        const top = Math.max(ch + 12, Math.min(this.H - 8, s.y - n._screenR - 6));
        this.hoverCardEl.style.left = left + 'px';
        this.hoverCardEl.style.top = top + 'px';
        }
      }

      this._updateCompass();
      this.renderer.render(this.scene, this.camera);
    }

    _project(localPos, out) {
      out.copy(localPos).applyQuaternion(this.group.quaternion).project(this.camera);
      const x = (out.x * 0.5 + 0.5) * this.W;
      const y = (-out.y * 0.5 + 0.5) * this.H;
      return { x: x, y: y, z: out.z };
    }

    _updateNode(n, time, camPos, isUser) {
      const id = isUser ? null : n.p.id;
      const vis = isUser ? true : this.visible[id];
      const hovered = id === this.hoveredId;
      const selected = id === this.selectedId;
      const hi = (this.searchHi !== null && id === this.searchHi);

      // ---- user player: still a glowing orange sphere + pill ----
      if (isUser) {
        const amp = 0.04 + (this.energy != null ? this.energy : 0.4) * 0.16;
        const spd = 0.6 + (this.energy != null ? this.energy : 0.4) * 1.1;
        const pulse = 1 + Math.sin(time * spd + n.phase) * amp;
        const hs = n.baseHalo * pulse, cs = n.baseCore * pulse;
        n.halo.scale.set(hs, hs, 1); n.core.scale.set(cs, cs, 1);
        const camDist = n.localPos.clone().applyQuaternion(this.group.quaternion).distanceTo(camPos);
        const s = this._project(n.localPos, n._proj);
        n._screenR = (hs * 0.5) * (this.H / (2 * Math.tan(this.camera.fov * Math.PI / 360) * camDist));
        const onscreen = s.z < 1 && s.x > -50 && s.x < this.W + 50 && s.y > -50 && s.y < this.H + 50;
        this.userPillEl.style.opacity = onscreen ? 1 : 0;
        this.userPillEl.style.left = s.x + 'px';
        this.userPillEl.style.top = (s.y - n._screenR) + 'px';
        return;
      }

      // ---- player: the name box IS the node (no glowing dot) ----
      if (!vis) {
        n.hit.visible = false; n._vis = false;
        if (n.label) n.label.style.opacity = 0;
        return;
      }
      n.hit.visible = true;

      // animate toward layout target position
      if (n.targetLocal && n.localPos.distanceToSquared(n.targetLocal) > 0.01) {
        n.localPos.lerp(n.targetLocal, 0.07);
        n.hit.position.copy(n.localPos);
      }

      const camDist = n.localPos.clone().applyQuaternion(this.group.quaternion).distanceTo(camPos);
      const s = this._project(n.localPos, n._proj);
      n._screenR = 26;
      n._sx = s.x; n._sy = s.y; n._camDist = camDist;
      if (!n._w && n.label.offsetWidth) { n._w = n.label.offsetWidth; n._h = n.label.offsetHeight; }

      if (n.label) {
        const onscreen = s.z < 1;
        let op = 0;
        if (onscreen) {
          op = Math.max(0.3, Math.min(1, (this.baseCamZ + 10 - camDist) / 26));
          if (hovered || selected || hi) op = 1;
        }
        n._vis = (op > 0.05 && onscreen);
        n.label.style.opacity = op;
        n.label.style.zIndex = Math.round(1000 - camDist) + ((hovered || selected) ? 4000 : 0);
        n.label.classList.toggle('hovered', hovered);
        n.label.classList.toggle('selected', selected || hi);
        if (op > 0.02) {
          n.label.style.left = s.x + 'px';
          n.label.style.top = s.y + 'px';
        }
      }
    }
  }

  window.Universe = Universe;
})();
