/* UDOO · demo de producto sobre cartografía real (OpenStreetMap).
   Zonas, sectores, avisos, carritos, vehículos y capataces son ficticios y se generan en el navegador. */
{
  const root = document.getElementById('ud');
  if (root && window.L) {
    /* mapa base: para cambiar de proveedor basta con editar TILES */
    const TILES = {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const C = {
      aviso: css('--op-aviso'), veh: css('--op-vehiculo'), sup: css('--op-supervisor'), dentro: css('--op-dentro'), fuera: css('--op-fuera'),
      sinasig: css('--op-sinasignar'), libre: css('--op-libre'), sector: css('--op-sector'), ok: css('--color-accent'),
      zones: [1, 2, 3, 4, 5].map(i => css('--op-z' + i))
    };
    let seed = 20261127;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const pick = a => a[Math.floor(rnd() * a.length)];

    const map = L.map(root.querySelector('#ud-map'), { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.25, attributionControl: true });
    L.tileLayer(TILES.url, { maxZoom: TILES.maxZoom, attribution: TILES.attribution, keepBuffer: 4, updateWhenZooming: false }).addTo(map);
    const BOUNDS = L.latLngBounds([40.4092, -3.6889], [40.4211, -3.6765]);
    map.fitBounds(BOUNDS, { padding: [4, 4] });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    /* iconos operativos: chinchetas con símbolo y círculos de estado */
    const GLYPH = {
      aviso: '<rect x="13.8" y="7" width="2.4" height="8.6" rx="1.2" fill="#fff"/><circle cx="15" cy="19" r="1.6" fill="#fff"/>',
      hecho: '<path d="M9.5 14.2l3.6 3.6 7.4-7.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
      veh: '<path d="M7.5 10.5h9.5v7.5H7.5z M17 12.8h3.4l2.6 3v2.2H17z" fill="#fff"/><circle cx="10.6" cy="18.6" r="1.9" fill="#fff" stroke="currentColor" stroke-width="1"/><circle cx="19.6" cy="18.6" r="1.9" fill="#fff" stroke="currentColor" stroke-width="1"/>',
      sup: '<circle cx="15" cy="10.6" r="3.3" fill="#fff"/><path d="M9.2 20.2c0-3.4 2.6-5.7 5.8-5.7s5.8 2.3 5.8 5.7z" fill="#fff"/>'
    };
    const pinSvg = (color, glyph, size = 30) => `<svg class="ud-pinsvg" viewBox="0 0 30 40" width="${size}" height="${Math.round(size * 4 / 3)}" style="color:${color}" aria-hidden="true"><path d="M15 38.5S2.5 24.5 2.5 14.2a12.5 12.5 0 0 1 25 0C27.5 24.5 15 38.5 15 38.5z" fill="currentColor" stroke="#fff" stroke-width="2"/>${glyph}</svg>`;
    const pin = (color, glyph, cls = '') => L.divIcon({ className: 'ud-pin ' + cls, html: pinSvg(color, glyph), iconSize: [30, 40], iconAnchor: [15, 39], tooltipAnchor: [0, -30] });
    const dot = color => `<span class="ud-ldot" style="background:${color}"></span>`;
    const mini = (color, glyph) => `<span class="ud-lpin">${pinSvg(color, glyph, 15)}</span>`;

    /* zonas de trabajo: praderas reales del Retiro agrupadas de forma ficticia */
    const GEO = window.UDOO_GEO;
    const ZONES = GEO.zonas;
    const gZones = L.layerGroup().addTo(map);
    ZONES.forEach((polys, i) => polys.forEach(r => L.polygon(r, { color: C.zones[i], weight: 2, fillColor: C.zones[i], fillOpacity: 0.28 })
      .bindTooltip('Zona ' + (i + 1), { className: 'ud-ltip', sticky: true }).addTo(gZones)));

    /* sectores (ficticios) */
    const SECT = [[-3.6889, -3.6845], [-3.6845, -3.6805], [-3.6805, -3.6764]];
    const gSect = L.layerGroup().addTo(map), gSectLbl = L.layerGroup();
    SECT.forEach(([a, b]) => L.rectangle([[40.4090, a], [40.4212, b]], { color: C.sector, weight: 2.5, fill: false, interactive: false }).addTo(gSect));
    SECT.forEach(([a, b], i) => L.marker([40.4208, (a + b) / 2], { icon: L.divIcon({ className: 'ud-sect', html: 'Sector ' + (i + 1), iconSize: null }), interactive: false }).addTo(gSectLbl));
    const sectorOf = lng => SECT.findIndex(([a, b]) => lng >= a && lng < b);

    /* recorridos: paseos reales del parque, ida y vuelta */
    const M_LAT = 111320, M_LNG = 111320 * Math.cos(40.415 * Math.PI / 180);
    const segLen = (a, b) => Math.hypot((b[0] - a[0]) * M_LAT, (b[1] - a[1]) * M_LNG);
    const LOOPS = GEO.rutas.map(pts => {
      const len = pts.slice(1).map((p, i) => segLen(pts[i], p));
      const l = { pts, len, total: len.reduce((a, b) => a + b, 0) };
      const share = [0, 0, 0];
      len.forEach((d, i) => { const s = sectorOf((pts[i][1] + pts[i + 1][1]) / 2); if (s >= 0) share[s] += d; });
      l.s = share.indexOf(Math.max(...share));
      return l;
    });
    const posOn = (l, d) => {
      d = ((d % (2 * l.total)) + 2 * l.total) % (2 * l.total);
      if (d > l.total) d = 2 * l.total - d;
      for (let i = 0; i < l.len.length; i++) {
        if (d <= l.len[i]) { const a = l.pts[i], b = l.pts[i + 1], t = d / l.len[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
        d -= l.len[i];
      }
      return l.pts[l.pts.length - 1];
    };

    /* recursos: carritos (con sector, sin asignar o libres), vehículos y supervisores */
    const gIn = L.layerGroup().addTo(map), gOut = L.layerGroup().addTo(map), gUn = L.layerGroup().addTo(map), gFree = L.layerGroup().addTo(map);
    const gVeh = L.layerGroup().addTo(map), gSup = L.layerGroup().addTo(map);
    const PLAN = [
      { kind: 'carrito', route: 2 }, { kind: 'carrito', route: 3 }, { kind: 'carrito', route: 4 }, { kind: 'carrito', route: 5 },
      { kind: 'carrito', route: 7 }, { kind: 'carrito', route: 8 }, { kind: 'carrito', route: 2, off: 0.55 },
      { kind: 'sinasig', route: 6 }, { kind: 'libre', route: 0 },
      { kind: 'veh', route: 1 }, { kind: 'veh', route: 0, off: 0.5 },
      { kind: 'sup', route: 5, off: 0.3 }, { kind: 'sup', route: 3, off: 0.7 }
    ];
    const SPEED = { carrito: [6, 9], sinasig: [6, 9], libre: [6, 9], veh: [15, 20], sup: [8, 11] };
    const count = { carrito: 0, veh: 0, sup: 0 };
    const res = PLAN.map(p => {
      const l = LOOPS[p.route];
      const fam = p.kind === 'veh' ? 'veh' : p.kind === 'sup' ? 'sup' : 'carrito';
      const n = ++count[fam];
      const r = { kind: p.kind, loop: l, s: p.kind === 'carrito' ? l.s : -1, d: 2 * l.total * ((p.off || 0) + rnd() * 0.3), speed: SPEED[p.kind][0] + rnd() * (SPEED[p.kind][1] - SPEED[p.kind][0]), out: false };
      r.id = (fam === 'veh' ? 'V-' : fam === 'sup' ? 'K-' : 'C-') + String(n).padStart(2, '0');
      const at = posOn(l, r.d);
      if (p.kind === 'veh') r.mk = L.marker(at, { icon: pin(C.veh, GLYPH.veh), keyboard: false, zIndexOffset: 300 }).addTo(gVeh);
      else if (p.kind === 'sup') r.mk = L.marker(at, { icon: pin(C.sup, GLYPH.sup), keyboard: false, zIndexOffset: 400 }).addTo(gSup);
      else {
        const col = p.kind === 'sinasig' ? C.sinasig : p.kind === 'libre' ? C.libre : C.dentro;
        r.mk = L.circleMarker(at, { radius: 8, color: '#fff', weight: 2.5, fillColor: col, fillOpacity: 1 }).addTo(p.kind === 'sinasig' ? gUn : p.kind === 'libre' ? gFree : gIn);
      }
      r.mk.bindTooltip(() => {
        if (r.kind === 'veh') return `Vehículo ${r.id} · apoyo a recogida y poda`;
        if (r.kind === 'sup') return `Capataz ${r.id} · atención de avisos en su cantón`;
        if (r.kind === 'sinasig') return `Carrito ${r.id} · sin sector asignado (revisar)`;
        if (r.kind === 'libre') return `Carrito ${r.id} · libre, bajo demanda`;
        return `Carrito ${r.id} · Sector ${r.s + 1} · posición GPS ${r.out ? 'fuera de' : 'dentro de'} su sector`;
      }, { className: 'ud-ltip' });
      return r;
    });
    const carts = res.filter(r => r.kind === 'carrito');

    /* jornada simulada: 1 segundo real equivale a 1 minuto de la jornada */
    const J_START = 9 * 60, J_END = 15 * 60;
    let simMin = J_START;
    const clock = root.querySelector('[data-k="clock"]');
    const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.floor(m % 60)).padStart(2, '0');

    /* praderas: paso registrado = alguna posición GPS a menos de 30 m de la pradera durante la jornada */
    const LAWNS = [];
    ZONES.forEach((polys, zi) => polys.forEach(r => LAWNS.push({ zone: zi, pts: r, seen: false })));
    const NEAR = 30;
    const markPass = p => LAWNS.forEach(l => { if (!l.seen && l.pts.some(q => segLen(p, q) < NEAR)) l.seen = true; });

    /* avisos (ficticios) */
    const TYPES = ['Papelera desbordada', 'Restos de poda', 'Rama caída en paseo', 'Riego averiado', 'Banco dañado', 'Hojas en paseo', 'Fuente sin agua', 'Pintada en mobiliario'];
    const gPins = L.layerGroup().addTo(map);
    const feed = root.querySelector('.ud-feed');
    let nextId, open, solved, received;
    const pins = [];
    const inside = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ya, xa] = r[i], [yb, xb] = r[j]; if ((ya > p[0]) !== (yb > p[0]) && p[1] < (xb - xa) * (p[0] - ya) / (yb - ya) + xa) c = !c; } return c; };
    const pointIn = r => {
      const la = r.map(p => p[0]), lo = r.map(p => p[1]);
      const box = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
      for (let t = 0; t < 40; t++) { const p = [box[0] + rnd() * (box[1] - box[0]), box[2] + rnd() * (box[3] - box[2])]; if (inside(p, r)) return p; }
      return [la.reduce((a, b) => a + b) / la.length, lo.reduce((a, b) => a + b) / lo.length];
    };
    const addFeed = (cls, title, text) => {
      const li = document.createElement('li'); li.className = cls;
      const b = document.createElement('b'); b.textContent = title; li.append(b, document.createElement('br'), document.createTextNode(text));
      feed.prepend(li); while (feed.children.length > 6) feed.lastElementChild.remove();
    };
    const spawn = () => {
      const zi = Math.floor(rnd() * ZONES.length), poly = pick(ZONES[zi]);
      const p = { id: nextId++, type: pick(TYPES), zone: zi + 1, born: simMin, life: 12 + rnd() * 16 };
      p.mk = L.marker(pointIn(poly), { icon: pin(C.aviso, GLYPH.aviso, reduce ? '' : 'ud-new'), keyboard: false, zIndexOffset: 500 }).addTo(gPins);
      p.mk.bindTooltip(() => `Aviso ${p.id} · ${p.type} · Zona ${p.zone} · ${p.solved ? 'resuelto' : 'abierto'}`, { className: 'ud-ltip' });
      pins.push(p); open++; received[p.zone - 1]++;
      addFeed('new', `${hhmm(simMin)} · Aviso ${p.id} recibido`, `${p.type} · Zona ${p.zone}`);
      update();
    };
    const solve = p => {
      p.solved = true; p.mk.setIcon(pin(C.ok, GLYPH.hecho));
      open--; solved++;
      addFeed('done', `${hhmm(simMin)} · Aviso ${p.id} resuelto`, `${p.type} · Zona ${p.zone}`);
      setTimeout(() => { gPins.removeLayer(p.mk); const i = pins.indexOf(p); if (i >= 0) pins.splice(i, 1); }, 3500);
      update();
    };

    /* indicadores: todos se calculan con los mismos datos que se ven en el mapa */
    const k = name => root.querySelector(`[data-k="${name}"]`);
    const bRec = root.querySelector('[data-b="rec"]'), bPass = root.querySelector('[data-b="pass"]'), bGps = root.querySelector('[data-b="gps"]');
    const barRow = (label, frac, val) => { const d = document.createElement('div'); d.className = 'ud-bar'; const s = document.createElement('span'); s.textContent = label; const i = document.createElement('i'); i.style.width = Math.round(frac * 100) + '%'; const e = document.createElement('em'); e.textContent = val; d.append(s, i, e); return d; };
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    function update(){
      if (!received) return;
      const seen = LAWNS.filter(l => l.seen).length;
      k('open').textContent = open; k('solved').textContent = solved;
      k('fleet').textContent = carts.filter(r => !r.out).length + '/' + carts.length;
      k('pass').textContent = pct(seen, LAWNS.length) + ' %';
      clock.textContent = 'Jornada simulada · ' + hhmm(J_START) + '–' + hhmm(simMin);
      const maxRec = Math.max(1, ...received);
      bRec.replaceChildren(...received.map((n, i) => barRow('Zona ' + (i + 1), n / maxRec, String(n))));
      bPass.replaceChildren(...ZONES.map((_, i) => { const t = LAWNS.filter(l => l.zone === i), s = t.filter(l => l.seen).length; return barRow('Zona ' + (i + 1), s / t.length, `${s}/${t.length}`); }));
      bGps.replaceChildren(...SECT.map((_, i) => { const t = carts.filter(r => r.s === i), s = t.filter(r => !r.out).length; return barRow('Sector ' + (i + 1), t.length ? s / t.length : 0, `${s}/${t.length}`); }));
    }

    /* bucle */
    let last = performance.now(), visible = true, acc = 0, ui = 0;
    const place = r => {
      const p = posOn(r.loop, r.d); r.mk.setLatLng(p);
      if (r.kind === 'carrito') {
        const [a, b] = SECT[r.s], tol = 40 / M_LNG, out = p[1] < a - tol || p[1] > b + tol;
        if (out !== r.out) {
          r.out = out; r.mk.setStyle({ fillColor: out ? C.fuera : C.dentro });
          (out ? gIn : gOut).removeLayer(r.mk); (out ? gOut : gIn).addLayer(r.mk);
          update();
        }
      }
      return p;
    };
    const newDay = () => {
      pins.splice(0).forEach(p => gPins.removeLayer(p.mk));
      feed.replaceChildren();
      simMin = J_START; nextId = 2481; open = 0; solved = 0; received = ZONES.map(() => 0);
      LAWNS.forEach(l => { l.seen = false; });
      /* primeras horas de la jornada (07:00–09:00): recorridos ya hechos y avisos ya resueltos */
      res.forEach(r => { for (let t = 0; t < 120; t++) markPass(posOn(r.loop, r.d - t * r.speed * 30)); });
      [4, 6, 3, 5, 3].forEach((n, i) => { received[i] += n; solved += n; });
      for (let i = 0; i < 4; i++) spawn();
    };
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !document.hidden) {
        simMin += dt;
        res.forEach(r => { r.d += r.speed * dt; markPass(place(r)); });
        acc += dt; ui += dt;
        if (acc > 3.5) { acc = 0; if (pins.filter(p => !p.solved).length < 8) spawn(); }
        pins.forEach(p => { if (!p.solved && simMin - p.born > p.life) solve(p); });
        if (ui > 1) { ui = 0; update(); }
        if (simMin >= J_END) newDay();
      }
      requestAnimationFrame(step);
    };

    /* control de capas con leyenda */
    const OVER = {};
    OVER['Sectores'] = gSect;
    OVER[dot(C.dentro) + 'Carritos dentro del sector'] = gIn;
    OVER[dot(C.fuera) + 'Carritos fuera de sector'] = gOut;
    OVER[dot(C.sinasig) + 'Carritos sin asignar (revisar)'] = gUn;
    OVER[dot(C.libre) + 'Libres / bajo demanda'] = gFree;
    OVER[mini(C.veh, GLYPH.veh) + 'Vehículos'] = gVeh;
    OVER[mini(C.sup, GLYPH.sup) + 'Capataces'] = gSup;
    OVER[mini(C.aviso, GLYPH.aviso) + 'Avisos'] = gPins;
    OVER['Zonas de trabajo'] = gZones;
    L.control.layers(null, OVER, { collapsed: root.clientWidth < 900, position: 'topright' }).addTo(map);

    /* pestañas */
    const mapView = root.querySelector('.ud-map'), panel = root.querySelector('.ud-panel');
    const tabs = [...root.querySelectorAll('.ud-tabs button')];
    let saved = null, fitted = false;
    const show = m => {
      tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === m)));
      if (m === 'ind' && !mapView.hidden && fitted) saved = { c: map.getCenter(), z: map.getZoom() };
      mapView.hidden = m === 'ind'; panel.hidden = m !== 'ind';
      const fleet = m === 'flota';
      if (fleet) { gSectLbl.addTo(map); gZones.eachLayer(z => z.setStyle({ fillOpacity: 0.1, opacity: 0.45 })); }
      else { map.removeLayer(gSectLbl); gZones.eachLayer(z => z.setStyle({ fillOpacity: 0.28, opacity: 1 })); }
      if (m !== 'ind') { map.invalidateSize({ pan: false }); if (saved) { map.setView(saved.c, saved.z, { animate: false }); saved = null; } }
    };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.v)));
    root.querySelector('.ud-tabs').addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); show(n.dataset.v);
    });

    /* arranque */
    res.forEach(place);
    newDay();
    update(); show(root.dataset.start || 'mapa');
    new ResizeObserver(es => { const r = es[0].contentRect; if (!r.width || !r.height) return; map.invalidateSize({ pan: false }); if (!fitted) { fitted = true; map.fitBounds(BOUNDS, { padding: [4, 4] }); } }).observe(root.querySelector('#ud-map'));
    if (!reduce) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
      requestAnimationFrame(step);
    }
  }
}
