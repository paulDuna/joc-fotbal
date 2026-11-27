import * as THREE from 'three';
import { SKIN } from './data.js';
import { buildStadium } from './stadium.js';

export const HALF_L = 52.5, HALF_W = 34, GOAL_W = 3.66, GOAL_H = 2.44, BALL_R = 0.11;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pitchTexture() {
  const S = 20;
  return canvasTex(105 * S, 68 * S, (g, W, H) => {
    // iarba tunsa in dungi, ca pe stadioanele mari, cu margini moi intre dungi
    const N = 18;
    for (let i = 0; i < N; i++) {
      const x0 = i * W / N, gr = g.createLinearGradient(x0, 0, x0 + W / N, 0);
      const c = i % 2 ? ['#1d5a20', '#205f23'] : ['#27682a', '#2a6c2d'];        // verde inchis, ca pe stadioanele mari
      gr.addColorStop(0, c[0]); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, c[0]);
      g.fillStyle = gr; g.fillRect(x0, 0, W / N + 1, H);
    }
    for (let j = 0; j < 12; j++) if (j % 2) { g.fillStyle = 'rgba(255,255,240,0.03)'; g.fillRect(0, j * H / 12, W, H / 12 + 1); }   // si putin in carouri
    // fire de iarba de nuante diferite
    const blades = ['rgba(10,50,10,0.10)', 'rgba(200,255,160,0.06)', 'rgba(60,110,30,0.10)', 'rgba(20,70,25,0.12)'];
    for (let i = 0; i < 170000; i++) { g.fillStyle = blades[i & 3]; g.fillRect(Math.random() * W, Math.random() * H, 1, 2 + Math.random() * 3); }
    const X = m => (m + 52.5) * S, Z = m => (m + 34) * S;
    // iarba mai uzata in fata portilor si la mijloc
    const wear = (x, z, rx, a) => {
      const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rx * S);
      gr.addColorStop(0, 'rgba(125,115,60,' + a + ')'); gr.addColorStop(1, 'rgba(125,115,60,0)');
      g.fillStyle = gr; g.fillRect(X(x) - rx * S, Z(z) - rx * S, rx * 2 * S, rx * 2 * S);
    };
    wear(-50, 0, 5, 0.18); wear(50, 0, 5, 0.18); wear(-41.5, 0, 2.5, 0.12); wear(41.5, 0, 2.5, 0.12);   // putin uzat doar in fata portilor
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 4;                 // linii albe, clare
    g.strokeRect(2, 2, W - 4, H - 4);
    g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 9.15 * S, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 5, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) {
      const rect = (depth, half) => {
        const x0 = Math.min(X(s * 52.5), X(s * (52.5 - depth)));
        g.strokeRect(x0, Z(-half), depth * S, half * 2 * S);
      };
      rect(16.5, 20.16); rect(5.5, 9.16);
      const sx = X(s * (52.5 - 11));
      g.beginPath(); g.arc(sx, Z(0), 5, 0, Math.PI * 2); g.fill();
      const a = Math.acos(5.5 / 9.15), mid = s < 0 ? 0 : Math.PI;
      g.beginPath(); g.arc(sx, Z(0), 9.15 * S, mid - a, mid + a); g.stroke();
      for (const zs of [-1, 1]) { g.beginPath(); g.arc(X(s * 52.5), Z(zs * 34), S, 0, Math.PI * 2); g.stroke(); }
    }
  });
}

function crowdTexture() {
  const t = canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#20242c'; g.fillRect(0, 0, W, H);
    // suporterii: in stanga mai multi albastri, in dreapta mai multi rosii, plus cativa neutri
    const other = ['#eee', '#fc3', '#2a2', '#888', '#111', '#f80'];
    for (let y = 5; y < H; y += 8) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 4, W, 2);
      for (let x = 3 + (y % 2) * 3; x < W; x += 6) {
        if (Math.random() < 0.06) continue;
        const r = Math.random(), blue = x / W < 0.5 ? 0.6 : 0.15;
        g.fillStyle = r < blue ? '#1f5fd6' : r < 0.78 ? '#d62828' : other[(Math.random() * other.length) | 0];
        g.fillRect(x, y - 2, 4, 5);
        g.fillStyle = ['#f0c8a0', '#c68e5e', '#7a4a2a', '#e8b890'][(Math.random() * 4) | 0];
        g.fillRect(x + 1, y - 5, 2, 3);
        if (Math.random() < 0.05) { g.fillStyle = Math.random() < 0.5 ? '#1f5fd6' : '#d62828'; g.fillRect(x - 2, y - 9, 8, 4); }   // steaguri / esarfe
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function netTexture() {
  const t = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    g.strokeRect(0, 0, 64, 64);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// poarta ca pe stadioanele mari: stalpi rotunzi albi, cadru in spate (sus 0.8 m adancime, jos 2 m)
// si plasa din ochiuri (linii) care se umfla cand intra mingea
export const NET_TOP = 0.8, NET_BOT = 2.0;
export const netDepthAt = (y) => NET_TOP + (NET_BOT - NET_TOP) * Math.max(0, 1 - y / GOAL_H);   // cat de adanca e poarta la inaltimea y
const goals = [];
function buildGoal(scene, side) {
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.5 });
  const x = side * HALF_L, R = 0.06;
  const post = new THREE.CylinderGeometry(R, R, GOAL_H + R, 18);
  for (const z of [-GOAL_W, GOAL_W]) {
    const m = new THREE.Mesh(post, white); m.position.set(x, (GOAL_H + R) / 2, z); m.castShadow = true; scene.add(m);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GOAL_W * 2 + R * 2, 18), white);
  bar.rotation.x = Math.PI / 2; bar.position.set(x, GOAL_H, 0); bar.castShadow = true; scene.add(bar);
  // cadrul din spate: bare subtiri care tin plasa
  const rod = (a, b, r = 0.025) => {
    const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), frame);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); scene.add(m);
  };
  const P = (dx, y, z) => new THREE.Vector3(x + side * dx, y, z);
  for (const z of [-GOAL_W, GOAL_W]) { rod(P(0, GOAL_H, z), P(NET_TOP, GOAL_H, z)); rod(P(NET_TOP, GOAL_H, z), P(NET_BOT, 0.02, z)); rod(P(0, 0.02, z), P(NET_BOT, 0.02, z)); }
  rod(P(NET_TOP, GOAL_H, -GOAL_W), P(NET_TOP, GOAL_H, GOAL_W)); rod(P(NET_BOT, 0.02, -GOAL_W), P(NET_BOT, 0.02, GOAL_W), 0.03);
  // plasa: retea de linii pe acoperis, spate si laterale (ochiuri de ~12 cm)
  const S = 0.12, pts = [], add = (a, b) => { pts.push(a.x, a.y, a.z, b.x, b.y, b.z); };
  const back = (u, v) => P(NET_TOP + (NET_BOT - NET_TOP) * v, GOAL_H * (1 - v), u);                    // u = z, v = 0 sus .. 1 jos
  const nu = Math.round(GOAL_W * 2 / S), nb = Math.round(Math.hypot(GOAL_H, NET_BOT - NET_TOP) / S), nr = Math.round(NET_TOP / S);
  for (let i = 0; i <= nu; i++) { const z = -GOAL_W + i * GOAL_W * 2 / nu; add(back(z, 0), back(z, 1)); add(P(0, GOAL_H, z), P(NET_TOP, GOAL_H, z)); }
  for (let j = 0; j <= nb; j++) add(back(-GOAL_W, j / nb), back(GOAL_W, j / nb));
  for (let j = 0; j <= nr; j++) add(P(j * NET_TOP / nr, GOAL_H, -GOAL_W), P(j * NET_TOP / nr, GOAL_H, GOAL_W));
  for (const z of [-GOAL_W, GOAL_W]) {                     // laterale: trapez
    const ny = Math.round(GOAL_H / S), nx = Math.round(NET_BOT / S);
    for (let j = 0; j <= ny; j++) { const y = j * GOAL_H / ny; add(P(0, y, z), P(netDepthAt(y), y, z)); }
    for (let i = 0; i <= nx; i++) { const dx = i * NET_BOT / nx, ytop = dx <= NET_TOP ? GOAL_H : GOAL_H * (1 - (dx - NET_TOP) / (NET_BOT - NET_TOP)); add(P(dx, 0, z), P(dx, ytop, z)); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const net = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(net);
  goals.push({ side, x, net, base: Float32Array.from(pts), hit: null });
}
// mingea intra in plasa: ochiurile din jurul ei sunt impinse in spate, apoi plasa vibreaza si revine
export function netHit(side, z, y, power = 1) { const g = goals.find((q) => q.side === side); if (g) g.hit = { z, y, t: 0, a: 0.55 * Math.min(1.4, power) }; }
function updateNets(dt) {
  for (const g of goals) {
    if (!g.hit) continue;
    const h = g.hit; h.t += dt;
    const pos = g.net.geometry.attributes.position, arr = pos.array, b = g.base;
    const amp = h.a * Math.exp(-h.t * 2.2) * Math.cos(h.t * 11);
    for (let i = 0; i < arr.length; i += 3) {
      const dz = b[i + 2] - h.z, dy = b[i + 1] - h.y, w = Math.exp(-(dz * dz + dy * dy) / 1.1);
      const inside = Math.abs(b[i] - g.x) > 0.05 ? 1 : 0;        // stalpii raman pe loc
      arr[i] = b[i] + g.side * amp * w * inside;
    }
    pos.needsUpdate = true;
    if (h.t > 2.5) { arr.set(b); pos.needsUpdate = true; g.hit = null; }
  }
}

export function buildWorld(scene, renderer, shadowSize = 2048) {
  const daySky = canvasTex(8, 256, (g) => {               // cer in degrade
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2f6fc4'); gr.addColorStop(0.55, '#8ec3ee'); gr.addColorStop(1, '#dff0fb');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  });
  const nightSky = canvasTex(256, 256, (g) => {           // cer de noapte, cu stele si lumina stadionului jos
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#02040a'); gr.addColorStop(0.6, '#0a1430'); gr.addColorStop(1, '#2a3550');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; g.fillRect(Math.random() * 256, Math.random() * 150, 1, 1); }
  });
  scene.background = daySky;
  scene.fog = new THREE.Fog(0xcfe6f7, 150, 340);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a7a3a, 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.3); sun.position.set(-40, 80, 50); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 46, bottom: -46, near: 10, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const crowdTex = [], crowdMats = [];

  const outer = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: 0x2f7429, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true; scene.add(outer);

  const pt = pitchTexture(); pt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // relief fin de iarba (se repeta des), ca lumina sa nu para "de plastic"
  const det = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) { const v = (100 + Math.random() * 120) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 3); }
    return c;
  })());
  det.wrapS = det.wrapT = THREE.RepeatWrapping; det.repeat.set(70, 45); det.anisotropy = pt.anisotropy;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pt, bumpMap: det, bumpScale: 0.8, roughness: 0.92 }));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);

  buildGoal(scene, -1); buildGoal(scene, 1);

  // panouri publicitare
  const adTex = canvasTex(1024, 64, (g, W, H) => {
    const cols = ['#0b3d91', '#b3001b', '#111', '#e6a700', '#0a7a4b'];
    const words = ['FOTBAL 3D', 'GOOOL!', 'STADION', 'FAIR PLAY', 'CAMPIONI'];
    for (let i = 0; i < 5; i++) {
      g.fillStyle = cols[i]; g.fillRect(i * W / 5, 0, W / 5, H);
      g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(words[i], (i + 0.5) * W / 5, H / 2 + 2);
    }
  });
  adTex.wrapS = THREE.RepeatWrapping; adTex.repeat.set(2, 1);
  const ledTex = [adTex];                                  // panourile LED se misca (vezi main.js)
  const stadium = buildStadium(scene, adTex); ledTex.push(...stadium.ledTex);   // tribunele 3D cu suporteri
  const ads = new THREE.Mesh(new THREE.PlaneGeometry(110, 1), new THREE.MeshBasicMaterial({ map: adTex }));
  ads.position.set(0, 0.5, -HALF_W - 4); scene.add(ads);
  {                                                         // panouri LED si pe partea dinspre camera (se vad jos pe ecran)
    const t3 = adTex.clone(); t3.needsUpdate = true; t3.repeat.set(2, 1); ledTex.push(t3);
    const near = new THREE.Mesh(new THREE.PlaneGeometry(110, 0.9), new THREE.MeshBasicMaterial({ map: t3 }));
    near.rotation.y = Math.PI; near.position.set(0, 0.45, HALF_W + 4); scene.add(near);
    const back = new THREE.Mesh(new THREE.BoxGeometry(110, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x15181f }));
    back.position.set(0, 0.45, HALF_W + 4.1); scene.add(back);
  }

  // stegulete de corner
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pole.position.set(sx * HALF_L, 0.75, sz * HALF_W); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide }));
    flag.position.set(sx * HALF_L - sx * 0.2, 1.36, sz * HALF_W); scene.add(flag);
  }

  // panouri in spatele portilor
  for (const sx of [-1, 1]) {
    const t2 = adTex.clone(); t2.needsUpdate = true; t2.repeat.set(1, 1); ledTex.push(t2);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(56, 1), new THREE.MeshBasicMaterial({ map: t2 }));
    b.rotation.y = -sx * Math.PI / 2; b.position.set(sx * (HALF_L + 5), 0.5, 0); scene.add(b);
  }
  // stralucirea nocturnelor (se vede doar seara)
  const glowTex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,250,220,0.6)'); gr.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const glows = [];
  const glow = (x, y, z, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.position.set(x, y, z); sp.scale.setScalar(s); sp.visible = false; scene.add(sp); glows.push(sp); };
  for (const l of stadium.lamps) glow(l.x, l.y, l.z, 9);   // luminile de pe marginea acoperisului

  // steaguri care flutura in tribune
  const flags = [], flagGeo = new THREE.PlaneGeometry(2.2, 1.4, 6, 1);
  const flagCols = [0x1f5fd6, 0xd62828, 0xffffff, 0xffd400];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(flagGeo.clone(), new THREE.MeshBasicMaterial({ color: flagCols[i % 4], side: THREE.DoubleSide }));
    const u = Math.random(), row = Math.random();
    const r = Math.floor(row * 17); m.position.set(-55 + u * 110, 1.6 + r * 0.42 + 1.4, -HALF_W - 7 - r * 0.85 - 0.3); m.rotation.x = -0.15;
    m.userData = { ph: Math.random() * 6, base: Float32Array.from(m.geometry.attributes.position.array) };
    scene.add(m); flags.push(m);
  }
  // fumigene colorate in tribune, la gol
  const smokeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const smoke = [];
  for (let i = 0; i < 60; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false; scene.add(sp); smoke.push({ sp, t: 99, vx: 0, vy: 0 });
  }
  const sunDay = { c: 0xfff2d8, i: 2.3 }, sunNight = { c: 0xf4f8ff, i: 2.9 };
  let night = false;
  function setNight(on) {
    night = on;
    scene.background = on ? nightSky : daySky;
    scene.fog.color.set(on ? 0x0b1222 : 0xcfe6f7);
    hemi.color.set(on ? 0x7f93b8 : 0xffffff); hemi.groundColor.set(on ? 0x14261a : 0x4a7a3a); hemi.intensity = on ? 0.35 : 1.15;
    sun.color.set(on ? sunNight.c : sunDay.c); sun.intensity = on ? sunNight.i : sunDay.i;
    renderer.toneMappingExposure = on ? 1.0 : 1.15;
    stadium.setNight(on);                                   // tribunele sunt in semiintuneric, terenul e luminat
    outer.material.color.set(on ? 0x163a17 : 0x2f7429);
    for (const gl of glows) gl.visible = on;
  }
  function flare(color, side) {                              // fumigene in tribuna din spatele portii
    const c = new THREE.Color(color);
    smoke.forEach((s, i) => {
      s.t = -Math.random() * 1.5; s.sp.material.color.copy(c);
      const along = (Math.random() - 0.5) * 50;
      s.sp.position.set(side * (HALF_L + 16 + Math.random() * 8), 3 + Math.random() * 6, along);
      s.vx = (Math.random() - 0.5) * 0.6; s.vy = 1.2 + Math.random() * 1.5; s.sp.visible = true;
    });
  }
  function update(dt, t, excited) {
    updateNets(dt);
    // publicul: se misca tot timpul putin, sare la gol
    stadium.update(t, excited);
    for (const f of flags) {                                 // steagurile flutura
      const p = f.geometry.attributes.position, a = p.array, b = f.userData.base;
      for (let i = 0; i < a.length; i += 3) { const k = (b[i] + 1.1) / 2.2; a[i + 2] = b[i + 2] + Math.sin(t * (excited ? 9 : 5) + f.userData.ph + b[i] * 2.5) * 0.35 * k; }
      p.needsUpdate = true;
    }
    for (const s of smoke) {                                 // fumul urca si se imprastie
      if (!s.sp.visible) continue;
      s.t += dt; if (s.t < 0) continue;
      s.sp.position.x += s.vx * dt; s.sp.position.y += s.vy * dt;
      const life = s.t / 6; s.sp.scale.setScalar(3 + s.t * 2.2);
      s.sp.material.opacity = Math.max(0, Math.min(0.75, s.t * 2) * (1 - life));
      if (life >= 1) s.sp.visible = false;
    }
  }
  return { sun, crowdTex, ledTex, setNight, flare, update, isNight: () => night, setCrowdColors: (a, b) => stadium.setColors(a, b) };
}

// ---------- minge ----------
// mingea clasica: 12 pentagoane negre si 20 de hexagoane albe, cu cusaturi (ca o minge adevarata)
function ballTexture() {
  const W = 1024, H = 512, f = (1 + Math.sqrt(5)) / 2, cyc = (a, b, c) => [[a, b, c], [c, a, b], [b, c, a]];
  const pent = [], hex = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    pent.push(...cyc(0, s1, s2 * f));                     // varfurile icosaedrului = centrele pentagoanelor
    hex.push(...cyc(0, s1 * f, s2 / f));                  // centrele fetelor = centrele hexagoanelor
  }
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) hex.push([a, b, c]);
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const C = [...pent.map((v) => [...norm(v), 1]), ...hex.map((v) => [...norm(v), 0])];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let r = 0; r < H; r++) {
    const th = Math.PI * (r + 0.5) / H, st = Math.sin(th), y = Math.cos(th);
    for (let c = 0; c < W; c++) {
      const ph = 2 * Math.PI * (c + 0.5) / W, x = -Math.cos(ph) * st, z = Math.sin(ph) * st;
      let b1 = -2, b2 = -2, k1 = 0;
      for (const q of C) { const dot = q[0] * x + q[1] * y + q[2] * z; if (dot > b1) { b2 = b1; b1 = dot; k1 = q[3]; } else if (dot > b2) b2 = dot; }
      let v = k1 ? 24 : 246;
      if (b1 - b2 < 0.012) v = k1 ? 70 : 150;              // cusatura dintre petice
      const i = (r * W + c) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function makeBall(scene) {
  const tex = ballTexture();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.0 }));
  mesh.castShadow = true; scene.add(mesh);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; scene.add(shadow);
  return { mesh, shadow };
}

// ---------- jucator ----------
const G = {};
const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  return matCache.get(color);
}
const skinCache = new Map();
function skinMat(color) {                               // pielea luceste putin, nu e mata ca tricoul
  if (!skinCache.has(color)) skinCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  return skinCache.get(color);
}
function geos() {
  if (G.torso) return G;
  // corpul e facut din forme rotunjite, netede (multe segmente), nu din cutii
  const V = (x, y) => new THREE.Vector2(x, y);
  G.torso = new THREE.LatheGeometry([V(0, 0), V(0.15, 0), V(0.16, 0.1), V(0.185, 0.28), V(0.2, 0.4), V(0.195, 0.47), V(0.16, 0.54), V(0.1, 0.6), V(0.06, 0.63), V(0, 0.63)], 28);   // talie -> piept -> umeri
  G.shorts = new THREE.LatheGeometry([V(0, 0), V(0.17, 0), V(0.185, 0.1), V(0.17, 0.25), V(0, 0.25)], 24);   // soldurile (de jos in sus, ca sa se vada din afara)
  G.shortsLeg = new THREE.CylinderGeometry(0.1, 0.097, 0.22, 18);                                            // cracul pantalonului, se misca odata cu piciorul
  G.thigh = new THREE.CapsuleGeometry(0.08, 0.28, 8, 16);
  G.shin = new THREE.CapsuleGeometry(0.06, 0.3, 8, 16);
  G.sockTop = new THREE.CylinderGeometry(0.068, 0.068, 0.05, 16);
  G.boot = new THREE.SphereGeometry(0.07, 18, 12);
  G.sleeve = new THREE.CylinderGeometry(0.066, 0.056, 0.2, 16);
  G.upperArm = new THREE.CapsuleGeometry(0.05, 0.16, 8, 14);
  G.foreArm = new THREE.CapsuleGeometry(0.042, 0.15, 8, 14);
  G.head = new THREE.SphereGeometry(0.12, 28, 20);
  G.nose = new THREE.SphereGeometry(0.022, 10, 8);
  G.ear = new THREE.SphereGeometry(0.03, 10, 8);
  G.hand = new THREE.SphereGeometry(0.042, 14, 10);
  G.hair = new THREE.SphereGeometry(0.128, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  G.neck = new THREE.CylinderGeometry(0.05, 0.055, 0.12, 16);
  G.collar = new THREE.TorusGeometry(0.068, 0.016, 8, 24);
  G.shadow = new THREE.CircleGeometry(0.42, 16);
  G.shadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.32, depthWrite: false });
  return G;
}

function numberTexture(num, colorHex) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#' + colorHex.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 4;
    g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText(String(num), 32, 35); g.fillText(String(num), 32, 35);
  });
}

// fata pictata pe cap: pe sfera, fata (+z) e la u = 0.25, adica x = 64 din 256; ochii ~y 58, gura ~y 76
function faceTexture(skinHex, hairHex, seed, beard) {
  const css = (h) => '#' + h.toString(16).padStart(6, '0');
  const t = canvasTex(256, 128, (g) => {
    g.fillStyle = css(skinHex); g.fillRect(0, 0, 256, 128);
    const cx = 64;
    // umbre usoare: obraji si sub barbie, ca fata sa aiba volum
    let gr = g.createRadialGradient(cx, 66, 4, cx, 66, 40); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
    g.fillStyle = gr; g.fillRect(cx - 50, 30, 100, 70);
    for (const s of [-1, 1]) { gr = g.createRadialGradient(cx + s * 13, 70, 1, cx + s * 13, 70, 8); gr.addColorStop(0, 'rgba(200,80,70,0.18)'); gr.addColorStop(1, 'rgba(200,80,70,0)'); g.fillStyle = gr; g.fillRect(cx + s * 13 - 8, 62, 16, 16); }
    const iris = ['#4a2e1a', '#2b1a10', '#3d6b8c', '#5a7a3a'][seed % 4];
    for (const s of [-1, 1]) {
      const ex = cx + s * 9.5, ey = 57;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(ex, ey - 1, 5.5, 3.6, 0, 0, Math.PI * 2); g.fill();      // orbita
      g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(ex, ey, 4.4, 2.5, 0, 0, Math.PI * 2); g.fill();                  // albul ochiului
      g.fillStyle = iris; g.beginPath(); g.arc(ex, ey, 2.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#080808'; g.beginPath(); g.arc(ex, ey, 1.0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(ex + 0.6, ey - 1.2, 1, 1);
      g.strokeStyle = 'rgba(20,10,5,0.75)'; g.lineWidth = 1; g.beginPath(); g.ellipse(ex, ey, 4.4, 2.5, 0, Math.PI, Math.PI * 2); g.stroke();   // pleoapa
      g.strokeStyle = css(hairHex); g.lineWidth = 3.4; g.lineCap = 'round';                                              // spranceana groasa, dreapta (barbateasca)
      g.beginPath(); g.moveTo(ex - s * 5, ey - 4.6); g.quadraticCurveTo(ex, ey - 6.0, ex + s * 5.5, ey - 5.2); g.stroke();
    }
    if (beard) {                                          // barba pictata: pe falci, barbie si mustata, nu o masca
      const c = new THREE.Color(hairHex), rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
      g.filter = 'blur(1.5px)';                            // margini moi, ca firele de par
      g.fillStyle = `rgba(${rgb},0.42)`;
      g.beginPath(); g.moveTo(cx - 24, 62); g.quadraticCurveTo(cx - 22, 92, cx, 96); g.quadraticCurveTo(cx + 22, 92, cx + 24, 62);
      g.lineTo(cx + 18, 64); g.quadraticCurveTo(cx + 14, 82, cx, 84); g.quadraticCurveTo(cx - 14, 82, cx - 18, 64); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(cx, 74, 8, 2.4, 0, 0, Math.PI * 2); g.fill();                                                                       // mustata
      g.fillStyle = `rgba(${rgb},0.35)`; g.beginPath(); g.ellipse(cx, 84, 13, 9, 0, 0, Math.PI * 2); g.fill();                                     // barbie
      g.filter = 'none';
    }
    g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 3, 69); g.quadraticCurveTo(cx, 71, cx + 3, 69); g.stroke();   // nari
    // falca si barbia: umbra de barba nerasa (la toti), ca fata sa para de barbat
    g.filter = 'blur(2px)'; g.fillStyle = 'rgba(40,30,25,0.13)';
    g.beginPath(); g.moveTo(cx - 22, 66); g.quadraticCurveTo(cx - 20, 92, cx, 95); g.quadraticCurveTo(cx + 20, 92, cx + 22, 66); g.lineTo(cx + 15, 70); g.quadraticCurveTo(cx, 86, cx - 15, 70); g.closePath(); g.fill();
    g.filter = 'none';
    g.fillStyle = 'rgba(125,75,65,0.45)'; g.beginPath(); g.ellipse(cx, 77, 5.5, 1.1, 0, 0, Math.PI * 2); g.fill();                                  // buze subtiri, nu rosii
    g.strokeStyle = 'rgba(55,25,20,0.75)'; g.lineWidth = 1.0; g.beginPath(); g.moveTo(cx - 5.5, 77); g.lineTo(cx + 5.5, 77); g.stroke();
  });
  return t;
}

// frizuri: 'short' (implicit), 'buzz' (tuns scurt), 'bald' (ras), 'long' (par lung), 'bun' (coc), 'afro' (par cret bogat)
function addHair(body, add, style, hairMat) {
  if (!G.afro) {
    G.afro = new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    G.longBack = new THREE.CapsuleGeometry(0.1, 0.16, 3, 8);
    G.bun = new THREE.SphereGeometry(0.06, 10, 8);
    G.beard = new THREE.SphereGeometry(0.129, 14, 8, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.55, Math.PI * 0.3);   // partea din fata, jos
    G.eye = new THREE.SphereGeometry(0.018, 6, 5);
    G.brow = new THREE.BoxGeometry(0.05, 0.012, 0.012);
  }
  if (style === 'bald') return;
  // calota de par e inclinata spre spate, ca sa lase fruntea si ochii liberi
  if (style === 'afro') { const a = add(G.afro, hairMat, 0, 1.75, -0.02); a.scale.set(1, 1.05, 1); a.rotation.x = -0.4; return; }
  const cap = add(G.hair, hairMat, 0, 1.735, -0.008);
  cap.rotation.x = -0.45;
  cap.scale.set(style === 'buzz' ? 0.955 : 1.0, style === 'buzz' ? 1.08 : 1.15, style === 'buzz' ? 1.0 : 1.05);
  if (style === 'long') add(G.longBack, hairMat, 0, 1.66, -0.08).scale.set(1.2, 1, 0.6);
  if (style === 'bun') add(G.bun, hairMat, 0, 1.87, -0.09);
}

// capul jucatorului (fata pictata, nas, urechi, par, barba), separat, cu centrul in origine:
// il punem pe manechin, ca sa semene cu jucatorul adevarat (frizura, barba, culoarea pielii)
export function makeHead({ skinTone, hair, num, style, beard }) {
  geos();
  const grp = new THREE.Group(), Y = 1.73;
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y - Y, z); o.castShadow = true; grp.add(o); return o; };
  const skin2 = skinMat(SKIN[skinTone] ?? SKIN[0]);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(SKIN[skinTone] ?? SKIN[0], hair ?? 0x18120e, num, beard), roughness: 0.55 });
  add(G.head, faceMat, 0, 1.73, 0).scale.set(1.0, 1.08, 1.0);                     // fata mai lata, falca patrata
  add(G.nose, skin2, 0, 1.716, 0.118).scale.set(0.75, 1.1, 0.85);
  for (const sx of [-1, 1]) add(G.ear, skin2, sx * 0.118, 1.725, 0).scale.set(0.4, 1, 0.7);
  if (!G.jaw) G.jaw = new THREE.SphereGeometry(0.075, 16, 10);
  add(G.jaw, skin2, 0, 1.652, 0.02).scale.set(1.3, 0.62, 1.0);               // barbie puternica
  addHair(null, add, style, mat(hair ?? 0x18120e));
  return grp;
}

export function makePlayerMesh(scene, { shirt, shorts, socks, skinTone, hair, num, style, beard }) {
  const g = geos();
  const skin = mat(SKIN[skinTone] ?? SKIN[0]);
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const add = (geo, m, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  const skin2 = skinMat(SKIN[skinTone] ?? SKIN[0]);
  add(g.torso, mat(shirt), 0, 0.98, 0).scale.set(1.12, 1, 0.7);
  const numTex = numberTexture(num, shirt);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: numTex }));
  back.rotation.y = Math.PI; back.position.set(0, 1.3, -0.137); body.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ map: numTex }));
  front.position.set(0.07, 1.42, 0.142); body.add(front);
  add(g.collar, mat(shorts === shirt ? 0xffffff : shorts), 0, 1.59, 0).rotation.x = Math.PI / 2;
  add(g.shorts, mat(shorts), 0, 0.86, 0).scale.set(1.05, 1, 0.75);
  add(g.neck, skin2, 0, 1.62, 0);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(SKIN[skinTone] ?? SKIN[0], hair ?? 0x18120e, num, beard), roughness: 0.55 });
  add(g.head, faceMat, 0, 1.73, 0).scale.set(0.95, 1.1, 1);
  add(G.nose, skin2, 0, 1.718, 0.115).scale.set(0.6, 0.95, 0.75);
  for (const sx of [-1, 1]) add(G.ear, skin2, sx * 0.112, 1.725, 0).scale.set(0.4, 1, 0.7);
  const hairMat = mat(hair ?? 0x18120e);
  addHair(body, add, style, hairMat);

  const BOOTS = [0x111111, 0xffffff, 0xff4fa3, 0x29e3ff, 0xc6ff2e, 0xff7a1a, 0xffd400, 0x111111];
  const bootMat = mat(BOOTS[(num * 7 + skinTone) % BOOTS.length]);   // ghete colorate, ca la profesionisti
  const pivot = (x, y, parent = body) => { const p = new THREE.Group(); p.position.set(x, y, 0); parent.add(p); return p; };
  const leg = (x) => {
    const hip = pivot(x, 0.92);
    add(g.thigh, skin2, 0, -0.22, 0, hip);
    add(g.shortsLeg, mat(shorts), 0, -0.07, 0, hip);
    const knee = pivot(0, -0.45, hip);
    add(g.shin, mat(socks), 0, -0.2, 0, knee);
    add(g.sockTop, mat(0xf2f2f2), 0, -0.04, 0, knee);
    add(g.boot, bootMat, 0, -0.44, 0.05, knee).scale.set(0.9, 0.6, 2.0);
    return [hip, knee];
  };
  const arm = (x) => {                                    // umar -> brat -> cot -> antebrat -> mana
    const p = pivot(x, 1.5);
    add(g.sleeve, mat(shirt), 0, -0.07, 0, p); add(g.upperArm, skin2, 0, -0.2, 0, p);
    const elbow = pivot(0, -0.3, p);
    add(g.foreArm, skin2, 0, -0.12, 0, elbow); add(g.hand, skin2, 0, -0.26, 0, elbow).scale.set(0.8, 1.25, 0.65);
    return [p, elbow];
  };
  const [legL, kneeL] = leg(-0.1), [legR, kneeR] = leg(0.1), [armL, elbowL] = arm(-0.235), [armR, elbowR] = arm(0.235);

  body.traverse((o) => { if (o.isMesh && o !== back) o.castShadow = true; });
  const sh = new THREE.Mesh(g.shadow, g.shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; group.add(sh);
  group.scale.setScalar(1.12);
  scene.add(group);
  return { group, body, legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, blob: sh };
}

// ---------- eticheta cu nume + inel sub jucatorul controlat ----------
export function makeMarker(scene, colorCss) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(5, 1.25, 1); sprite.renderOrder = 10; scene.add(sprite);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 28),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(colorCss), transparent: true, opacity: 0.9, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; scene.add(ring);
  let cur = null;
  return {
    sprite, ring,
    setText(t) {
      if (t === cur) return; cur = t;
      g.clearRect(0, 0, 256, 64);
      g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(t, 128, 30);
      g.fillStyle = colorCss; g.fillText(t, 128, 30);
      g.beginPath(); g.moveTo(118, 50); g.lineTo(138, 50); g.lineTo(128, 62); g.closePath(); g.fill();
      tex.needsUpdate = true;
    },
    setVisible(v) { sprite.visible = v; ring.visible = v; },
  };
}
