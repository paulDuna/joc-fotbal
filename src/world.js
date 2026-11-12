import * as THREE from 'three';
import { SKIN } from './data.js';

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
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#3d8c38' : '#479a41'; g.fillRect(i * W / 14, 0, W / 14 + 1, H); }
    for (let i = 0; i < 70000; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,40,0,0.06)' : 'rgba(210,255,180,0.05)';
      g.fillRect(Math.random() * W, Math.random() * H, 2, 5);
    }
    const X = m => (m + 52.5) * S, Z = m => (m + 34) * S;
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 3;
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
    const cols = ['#d33', '#36c', '#eee', '#fc3', '#2a2', '#888', '#c7a', '#f80', '#345'];
    for (let y = 6; y < H; y += 11) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 5, W, 3);
      for (let x = 4 + (y % 2) * 4; x < W; x += 8) {
        if (Math.random() < 0.12) continue;
        g.fillStyle = cols[(Math.random() * cols.length) | 0];
        g.fillRect(x, y - 3, 5, 6);
        g.fillStyle = ['#f0c8a0', '#c68e5e', '#7a4a2a'][(Math.random() * 3) | 0];
        g.fillRect(x + 1, y - 6, 3, 3);
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

function buildGoal(scene, side, netTex) {
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const x = side * HALF_L, depth = 2;
  const post = new THREE.CylinderGeometry(0.07, 0.07, GOAL_H, 10);
  for (const z of [-GOAL_W, GOAL_W]) {
    const m = new THREE.Mesh(post, white); m.position.set(x, GOAL_H / 2, z); m.castShadow = true; scene.add(m);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, GOAL_W * 2 + 0.14, 10), white);
  bar.rotation.x = Math.PI / 2; bar.position.set(x, GOAL_H, 0); scene.add(bar);
  const net = (w, h, rx, ry, px, py, pz) => {
    const tex = netTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 0.25, h / 0.25);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.set(rx, ry, 0); m.position.set(px, py, pz); scene.add(m);
  };
  net(GOAL_W * 2, GOAL_H, 0, Math.PI / 2, x + side * depth, GOAL_H / 2, 0);        // spate
  net(depth, GOAL_H, 0, 0, x + side * depth / 2, GOAL_H / 2, -GOAL_W);             // lateral
  net(depth, GOAL_H, 0, 0, x + side * depth / 2, GOAL_H / 2, GOAL_W);              // lateral
  net(depth, GOAL_W * 2, Math.PI / 2, 0, x + side * depth / 2, GOAL_H, 0);         // sus
}

export function buildWorld(scene, renderer, shadowSize = 2048) {
  scene.background = canvasTex(8, 256, (g) => {           // cer in degrade
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2f6fc4'); gr.addColorStop(0.55, '#8ec3ee'); gr.addColorStop(1, '#dff0fb');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  });
  scene.fog = new THREE.Fog(0xcfe6f7, 150, 340);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a7a3a, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.3); sun.position.set(-40, 80, 50); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 46, bottom: -46, near: 10, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const crowdTex = [];

  const outer = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: 0x357d31, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true; scene.add(outer);

  const pt = pitchTexture(); pt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pt, roughness: 1 }));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);

  const netTex = netTexture();
  buildGoal(scene, -1, netTex); buildGoal(scene, 1, netTex);

  // tribune (fara cea dinspre camera)
  const crowd = crowdTexture();
  const stand = (len, ry, px, pz) => {
    const tex = crowd.clone(); tex.needsUpdate = true; tex.repeat.set(len / 30, 1.4); crowdTex.push(tex);
    const grp = new THREE.Group(); grp.rotation.y = ry; grp.position.set(px, 0, pz);
    const H = 24;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), new THREE.MeshBasicMaterial({ map: tex }));
    m.rotation.x = -0.75; m.position.y = 1.5 + (H / 2) * Math.cos(0.75); m.position.z = -(H / 2) * Math.sin(0.75);
    grp.add(m);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0x39404d }));
    roof.position.set(0, 21, -15); grp.add(roof);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len, 1.5, 1), new THREE.MeshStandardMaterial({ color: 0x2a2f3a }));
    base.position.set(0, 0.75, 0.4); grp.add(base);
    scene.add(grp);
  };
  stand(130, 0, 0, -HALF_W - 9);
  stand(86, Math.PI / 2, -HALF_L - 11, 0);
  stand(86, -Math.PI / 2, HALF_L + 11, 0);

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
  const ads = new THREE.Mesh(new THREE.PlaneGeometry(110, 1), new THREE.MeshBasicMaterial({ map: adTex }));
  ads.position.set(0, 0.5, -HALF_W - 4); scene.add(ads);

  // stegulete de corner
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pole.position.set(sx * HALF_L, 0.75, sz * HALF_W); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide }));
    flag.position.set(sx * HALF_L - sx * 0.2, 1.36, sz * HALF_W); scene.add(flag);
  }

  // panouri in spatele portilor
  for (const sx of [-1, 1]) {
    const t2 = adTex.clone(); t2.needsUpdate = true; t2.repeat.set(1, 1);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(56, 1), new THREE.MeshBasicMaterial({ map: t2 }));
    b.rotation.y = -sx * Math.PI / 2; b.position.set(sx * (HALF_L + 5), 0.5, 0); scene.add(b);
  }
  // nocturne in colturile din spate
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a919c, roughness: 0.6 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
  for (const sx of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 44, 1.2), steel); pole.position.set(sx * 74, 22, -58); scene.add(pole);
    const head = new THREE.Group(); head.position.set(sx * 74, 45, -58); head.rotation.y = -sx * 0.7; head.rotation.x = 0.25; scene.add(head);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(11, 7, 0.8), steel));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10), lamp); l.position.set(-3.9 + i * 2.6, -2.1 + j * 2.1, 0.45); head.add(l);
    }
  }
  return { sun, crowdTex };
}

// ---------- minge ----------
export function makeBall(scene) {
  const tex = canvasTex(128, 64, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#1a1a1a';
    for (const [x, y] of [[16, 16], [48, 44], [80, 14], [112, 46], [64, 32], [0, 50], [128, 50], [32, 60], [96, 2]]) {
      g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
    }
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
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
function geos() {
  if (G.torso) return G;
  G.torso = new THREE.CapsuleGeometry(0.17, 0.3, 4, 10);
  G.shorts = new THREE.CylinderGeometry(0.2, 0.215, 0.26, 10);
  G.thigh = new THREE.CapsuleGeometry(0.078, 0.3, 3, 8);
  G.shin = new THREE.CapsuleGeometry(0.06, 0.3, 3, 8);
  G.boot = new THREE.BoxGeometry(0.12, 0.08, 0.27);
  G.sleeve = new THREE.CapsuleGeometry(0.062, 0.12, 3, 8);
  G.arm = new THREE.CapsuleGeometry(0.045, 0.3, 3, 8);
  G.head = new THREE.SphereGeometry(0.125, 14, 10);
  G.hand = new THREE.SphereGeometry(0.052, 8, 6);
  G.hair = new THREE.SphereGeometry(0.132, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  G.neck = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
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

export function makePlayerMesh(scene, { shirt, shorts, socks, skinTone, hair, num }) {
  const g = geos();
  const skin = mat(SKIN[skinTone] ?? SKIN[0]);
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const add = (geo, m, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  add(g.torso, mat(shirt), 0, 1.27, 0).scale.set(1.25, 1, 0.75);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: numberTexture(num, shirt) }));
  back.rotation.y = Math.PI; back.position.set(0, 1.3, -0.135); body.add(back);
  add(g.shorts, mat(shorts), 0, 0.92, 0).scale.set(1, 1, 0.75);
  add(g.neck, skin, 0, 1.6, 0);
  add(g.head, skin, 0, 1.72, 0);
  add(g.hair, mat(hair ?? 0x18120e), 0, 1.73, -0.01);

  const pivot = (x, y, parent = body) => { const p = new THREE.Group(); p.position.set(x, y, 0); parent.add(p); return p; };
  const leg = (x) => {
    const hip = pivot(x, 0.92);
    add(g.thigh, skin, 0, -0.22, 0, hip);
    const knee = pivot(0, -0.45, hip);
    add(g.shin, mat(socks), 0, -0.2, 0, knee); add(g.boot, mat(0x111111), 0, -0.43, 0.06, knee);
    return [hip, knee];
  };
  const arm = (x) => {
    const p = pivot(x, 1.5);
    add(g.sleeve, mat(shirt), 0, -0.08, 0, p); add(g.arm, skin, 0, -0.36, 0, p); add(g.hand, skin, 0, -0.58, 0, p);
    return p;
  };
  const [legL, kneeL] = leg(-0.11), [legR, kneeR] = leg(0.11), armL = arm(-0.27), armR = arm(0.27);

  body.traverse((o) => { if (o.isMesh && o !== back) o.castShadow = true; });
  const sh = new THREE.Mesh(g.shadow, g.shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; group.add(sh);
  group.scale.setScalar(1.12);
  scene.add(group);
  return { group, body, legL, legR, kneeL, kneeR, armL, armR, blob: sh };
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
