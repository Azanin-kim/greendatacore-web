/* UDOO · demo de producto sobre cartografía real (OpenStreetMap).
   Zonas, sectores, avisos y vehículos son ficticios y se generan en el navegador. */
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
    const C = { accent: css('--color-accent'), accentDeep: css('--color-forest'), track: css('--color-track'), signal: css('--color-signal'), err: css('--color-error'), ink: css('--color-paper'), forest: css('--color-forest') };
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

    /* zonas de mantenimiento: praderas reales del Retiro agrupadas de forma ficticia */
    const GEO = window.UDOO_GEO;
    const ZONES = GEO.zonas;
    const gZones = L.layerGroup().addTo(map);
    const zoneLayers = [];
    ZONES.forEach((polys, i) => polys.forEach(r => zoneLayers.push(L.polygon(r, { color: C.forest, weight: 1.5, fillColor: C.track, fillOpacity: 0.45 })
      .bindTooltip('Zona ' + (i + 1), { className: 'ud-ltip', sticky: true }).addTo(gZones))));

    /* sectores de la flota (ficticios) */
    const SECT = [[-3.6889, -3.6845], [-3.6845, -3.6805], [-3.6805, -3.6764]];
    const gSect = L.layerGroup();
    SECT.forEach(([a, b], i) => L.rectangle([[40.4090, a], [40.4212, b]], { color: C.ink, weight: 2, dashArray: '6 6', fill: false, interactive: false }).addTo(gSect));
    SECT.forEach(([a, b], i) => L.marker([40.4208, (a + b) / 2], { icon: L.divIcon({ className: 'ud-sect', html: 'Sector ' + (i + 1), iconSize: null }), interactive: false }).addTo(gSect));
    const sectorOf = lng => SECT.findIndex(([a, b]) => lng >= a && lng < b);

    /* vehículos: recorren paseos reales del parque, ida y vuelta */
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
    const gVeh = L.layerGroup().addTo(map), gTrail = L.layerGroup().addTo(map);
    const vehicles = [];
    LOOPS.forEach((l, li) => [0, 0.55].forEach((off, k) => {
      if (k && li !== 2) return;
      const v = { id: 'V-' + String(vehicles.length + 1).padStart(2, '0'), loop: l, s: l.s, d: 2 * l.total * (off + rnd() * 0.3), speed: 9 + rnd() * 6, trail: [] };
      v.trailEl = L.polyline([], { color: C.accentDeep, weight: 4, opacity: 0.55, interactive: false }).addTo(gTrail);
      v.dot = L.circleMarker(posOn(l, v.d), { radius: 7, color: C.ink, weight: 2.5, fillColor: C.accent, fillOpacity: 1 }).addTo(gVeh);
      v.dot.bindTooltip(() => `Vehículo ${v.id} · Sector ${v.s + 1} · posición GPS ${v.out ? 'fuera de' : 'dentro de'} su sector`, { className: 'ud-ltip' });
      vehicles.push(v);
    }));

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
      const [lat, lng] = pointIn(poly);
      const p = { id: nextId++, type: pick(TYPES), zone: zi + 1, born: simMin, life: 12 + rnd() * 16 };
      p.mk = L.circleMarker([lat, lng], { radius: 8, color: C.ink, weight: 2, fillColor: C.signal, fillOpacity: 1, className: reduce ? '' : 'ud-pulse' }).addTo(gPins);
      p.mk.bindTooltip(() => `Aviso ${p.id} · ${p.type} · Zona ${p.zone} · ${p.solved ? 'resuelto' : 'abierto'}`, { className: 'ud-ltip' });
      pins.push(p); open++; received[p.zone - 1]++;
      addFeed('new', `${hhmm(simMin)} · Aviso ${p.id} recibido`, `${p.type} · Zona ${p.zone}`);
      update();
    };
    const solve = p => {
      p.solved = true; p.mk.setStyle({ fillColor: C.accent }); const el = p.mk.getElement(); if (el) el.classList.remove('ud-pulse');
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
      const inSect = vehicles.filter(v => !v.out).length;
      const seen = LAWNS.filter(l => l.seen).length;
      k('open').textContent = open; k('solved').textContent = solved;
      k('fleet').textContent = inSect + '/' + vehicles.length;
      k('pass').textContent = pct(seen, LAWNS.length) + ' %';
      clock.textContent = 'Jornada simulada · ' + hhmm(J_START) + '–' + hhmm(simMin);
      const maxRec = Math.max(1, ...received);
      bRec.replaceChildren(...received.map((n, i) => barRow('Zona ' + (i + 1), n / maxRec, String(n))));
      bPass.replaceChildren(...ZONES.map((_, i) => { const t = LAWNS.filter(l => l.zone === i), s = t.filter(l => l.seen).length; return barRow('Zona ' + (i + 1), s / t.length, `${s}/${t.length}`); }));
      bGps.replaceChildren(...SECT.map((_, i) => { const t = vehicles.filter(v => v.s === i), s = t.filter(v => !v.out).length; return barRow('Sector ' + (i + 1), t.length ? s / t.length : 0, `${s}/${t.length}`); }));
    }

    /* bucle */
    let last = performance.now(), visible = true, acc = 0, ui = 0;
    const place = v => {
      const p = posOn(v.loop, v.d); v.dot.setLatLng(p);
      v.trail.push(p); if (v.trail.length > 30) v.trail.shift(); v.trailEl.setLatLngs(v.trail);
      const [a, b] = SECT[v.s], tol = 40 / M_LNG, out = p[1] < a - tol || p[1] > b + tol;
      if (out !== v.out) { v.out = out; v.dot.setStyle({ fillColor: out ? C.err : C.accent }); v.trailEl.setStyle({ color: out ? C.err : C.accentDeep }); update(); }
      return p;
    };
    const newDay = () => {
      pins.splice(0).forEach(p => gPins.removeLayer(p.mk));
      feed.replaceChildren();
      simMin = J_START; nextId = 2481; open = 0; solved = 0; received = ZONES.map(() => 0);
      LAWNS.forEach(l => { l.seen = false; });
      /* primeras horas de la jornada (07:00–09:00): recorridos ya hechos y avisos ya resueltos */
      vehicles.forEach(v => { for (let t = 0; t < 120; t++) { markPass(posOn(v.loop, v.d - t * v.speed * 30)); } });
      [4, 6, 3, 5, 3].forEach((n, i) => { received[i] += n; solved += n; });
      for (let i = 0; i < 4; i++) spawn();
    };
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !document.hidden) {
        simMin += dt;
        vehicles.forEach(v => { v.d += v.speed * dt; markPass(place(v)); });
        acc += dt; ui += dt;
        if (acc > 3.5) { acc = 0; if (pins.filter(p => !p.solved).length < 8) spawn(); }
        pins.forEach(p => { if (!p.solved && simMin - p.born > p.life) solve(p); });
        if (ui > 1) { ui = 0; update(); }
        if (simMin >= J_END) newDay();
      }
      requestAnimationFrame(step);
    };

    /* capas y pestañas */
    const LAYERS = { zones: [gZones], pins: [gPins], veh: [gVeh, gTrail] };
    const setLayer = (name, on) => LAYERS[name].forEach(g => on ? g.addTo(map) : map.removeLayer(g));
    root.querySelectorAll('.ud-layers input').forEach(inp => inp.addEventListener('change', () => { setLayer(inp.value, inp.checked); }));
    const mapView = root.querySelector('.ud-map'), panel = root.querySelector('.ud-panel');
    const tabs = [...root.querySelectorAll('.ud-tabs button')];
    let saved = null, fitted = false;
    const show = m => {
      tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === m)));
      if (m === 'ind' && !mapView.hidden && fitted) saved = { c: map.getCenter(), z: map.getZoom() };
      mapView.hidden = m === 'ind'; panel.hidden = m !== 'ind';
      if (m === 'flota') { gSect.addTo(map); map.removeLayer(gPins); gZones.eachLayer(z => z.setStyle({ fillOpacity: 0.15, opacity: 0.4 })); }
      else { map.removeLayer(gSect); if (root.querySelector('.ud-layers input[value=pins]').checked) gPins.addTo(map); gZones.eachLayer(z => z.setStyle({ fillOpacity: 0.45, opacity: 1 })); }
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
    vehicles.forEach(place);
    newDay();
    update(); show(root.dataset.start || 'mapa');
    new ResizeObserver(es => { const r = es[0].contentRect; if (!r.width || !r.height) return; map.invalidateSize({ pan: false }); if (!fitted) { fitted = true; map.fitBounds(BOUNDS, { padding: [4, 4] }); } }).observe(root.querySelector('#ud-map'));
    if (!reduce) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
      requestAnimationFrame(step);
    }
  }
}
