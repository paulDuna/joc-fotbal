// Stadion 3D: tribune in trepte (doua inele), acoperis cu lumini, banda LED intre inele si
// mii de suporteri (un singur InstancedMesh) care se misca si sar la gol.
import * as THREE from 'three';

const HALF_L = 52.5, HALF_W = 34;
const T1 = { rows: 18, rise: 0.42, tread: 0.85, base: 1.6 };          // inelul de jos
const T2 = { rows: 16, rise: 0.55, tread: 0.8, base: 11.8, gap: 2.6 }; // inelul de sus, putin in spate

// profilul unei tribune (treptele), vazut din lateral: x = departe de teren, y = inaltime
function stairShape(t, start) {
  const s = new THREE.Shape();
  s.moveTo(start, 0); s.lineTo(start, t.base);
  for (let r = 0; r < t.rows; r++) {
    const x = start + r * t.tread, y = t.base + r * t.rise;
    s.lineTo(x, y + t.rise); s.lineTo(x + t.tread, y + t.rise);
  }
  const end = start + t.rows * t.tread;
  s.lineTo(end + 1.5, t.base + t.rows * t.rise + 2.5); s.lineTo(end + 1.5, 0); s.lineTo(start, 0);
  return s;
}

// suporterii: o "foaie" cu 16 oameni desenati (tricouri in culorile echipelor), fiecare loc alege unul
function crowdAtlas(c0, c1) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d'), css = (n) => '#' + n.toString(16).padStart(6, '0');
  const skins = ['#f0c8a0', '#c68e5e', '#7a4a2a', '#e8b890'], hairs = ['#1a1410', '#4a3423', '#c9a060', '#2b1a10', '#111'];
  const shirts = [c0, c0, c0, c0, c0, c1, c1, null];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) {
    const x = col * 64, y = row * 128, cx = x + 32, k = row * 8 + col;
    const shirt = shirts[col] === null ? ['#f2f2f2', '#222', '#e6a700'][k % 3] : css(shirts[col]);
    const skin = skins[k % 4], up = row === 1;                    // al doilea rand: cu bratele sus
    g.fillStyle = shirt;
    g.beginPath(); g.roundRect(cx - 16, y + 52, 32, 48, 8); g.fill();          // corp
    g.fillRect(cx - 14, y + 100, 28, 28);                                      // (picioarele ascunse de rand)
    g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = shirt;                // brate
    g.beginPath();
    if (up) { g.moveTo(cx - 14, y + 58); g.lineTo(cx - 24, y + 22); g.moveTo(cx + 14, y + 58); g.lineTo(cx + 24, y + 22); }
    else { g.moveTo(cx - 15, y + 58); g.lineTo(cx - 20, y + 92); g.moveTo(cx + 15, y + 58); g.lineTo(cx + 20, y + 92); }
    g.stroke();
    g.fillStyle = skin;
    if (up) { g.beginPath(); g.arc(cx - 24, y + 20, 5, 0, 7); g.arc(cx + 24, y + 20, 5, 0, 7); g.fill(); }
    g.beginPath(); g.arc(cx, y + 38, 13, 0, 7); g.fill();                     // cap
    g.fillStyle = hairs[k % 5]; g.beginPath(); g.arc(cx, y + 34, 13, Math.PI, 0); g.fill();
    if (k % 5 === 2) { g.fillStyle = shirt === css(c0) ? css(c1) : '#ffffff'; g.fillRect(cx - 17, y + 54, 34, 7); }   // esarfa
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function buildStadium(scene, adTex) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5a606c, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
  const ledTex = [], lamps = [], seats = [];              // seats: [x, y, z, normalX, normalZ] pentru suporteri
  // o tribuna: front = distanta de la centru, along = lungimea, dir = unde e "in spate" (spre exterior)
  const stand = (front, len, dir) => {
    const grp = new THREE.Group(), ang = Math.atan2(dir[0], dir[1]) - Math.PI / 2;   // forma: x local -> dir
    const place = (o) => grp.add(o);
    const e1 = new THREE.ExtrudeGeometry(stairShape(T1, 0), { depth: len, bevelEnabled: false });
    const t2start = T1.rows * T1.tread + T2.gap;
    const e2 = new THREE.ExtrudeGeometry(stairShape(T2, t2start), { depth: len, bevelEnabled: false });
    for (const geo of [e1, e2]) { geo.translate(0, 0, -len / 2); const m = new THREE.Mesh(geo, concrete); m.receiveShadow = true; place(m); }
    // banda LED intre inele
    const t = adTex.clone(); t.needsUpdate = true; t.repeat.set(len / 40, 1); ledTex.push(t);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.2), new THREE.MeshBasicMaterial({ map: t }));
    band.rotation.y = -Math.PI / 2; band.position.set(T1.rows * T1.tread + 0.6, T1.base + T1.rows * T1.rise + 1.7, 0); place(band);
    // acoperisul, cu un sir de lumini pe margine
    const rd = 26, rx = t2start + T2.rows * T2.tread + 3;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(rd, 0.7, len + 6), roofMat); roof.position.set(rx - rd / 2 + 4, 27, 0); roof.castShadow = false; place(roof);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, len), lampMat); strip.position.set(rx - rd + 4.2, 26.5, 0); place(strip);
    for (let i = -len / 2 + 6; i <= len / 2 - 6; i += 12) lamps.push(new THREE.Vector3(rx - rd + 4.2, 26.2, i));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 27, len), dark); back.position.set(rx + 4, 13.5, 0); place(back);
    // locurile pentru suporteri
    for (const [tr, start] of [[T1, 0], [T2, t2start]]) {
      for (let r = 0; r < tr.rows; r++) {
        const ox = start + r * tr.tread + tr.tread * 0.45, y = tr.base + (r + 1) * tr.rise;
        for (let a = -len / 2 + 0.4; a < len / 2 - 0.4; a += 0.62) {
          if (Math.random() < 0.08) continue;                  // cateva locuri goale
          seats.push([ox + (Math.random() - 0.5) * 0.12, y, a + (Math.random() - 0.5) * 0.15]);
        }
      }
    }
    grp.rotation.y = ang; grp.position.set(dir[0] * front, 0, dir[1] * front); grp.updateMatrixWorld(true);
    // trecem locurile si lampile in coordonatele lumii
    const v = new THREE.Vector3();
    const face = Math.atan2(-dir[0], -dir[1]);              // suporterii privesc spre teren
    for (let i = seats.length - 1; i >= 0 && !seats[i].world; i--) { v.set(...seats[i]); grp.localToWorld(v); seats[i] = { world: true, p: v.clone(), face }; }
    for (const l of lamps) if (!l.done) { grp.localToWorld(l); l.done = true; }
    scene.add(grp);
  };
  stand(HALF_W + 7, 2 * (HALF_L + 7) + 2 * 30, [0, -1]);                // tribuna principala (in fata camerei)
  stand(HALF_L + 7, 2 * (HALF_W + 7), [1, 0]);                          // in spatele portilor
  stand(HALF_L + 7, 2 * (HALF_W + 7), [-1, 0]);

  // suporterii: un InstancedMesh, fiecare cu "omuletul" lui din atlas si propria faza de saritura
  const geo = new THREE.PlaneGeometry(0.58, 1.16); geo.translate(0, 0.42, 0);
  const n = seats.length, cell = new Float32Array(n * 2), phase = new Float32Array(n);
  for (let i = 0; i < n; i++) { const k = Math.floor(Math.random() * 16); cell[i * 2] = (k % 8) / 8; cell[i * 2 + 1] = Math.floor(k / 8) / 2; phase[i] = Math.random() * 6.28; }
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  let atlas = crowdAtlas(0xf4f4f4, 0xa50044);
  atlas.repeat.set(1 / 8, 1 / 2);
  const mat = new THREE.MeshBasicMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide });
  const U = { uTime: { value: 0 }, uAmp: { value: 0.03 }, uFreq: { value: 2.0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aCell; attribute float aPhase; uniform float uTime, uAmp, uFreq;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv += aCell;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += max(0.0, sin(uTime * uFreq + aPhase)) * uAmp;');
  };
  const crowd = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  seats.forEach((s, i) => {
    q.setFromAxisAngle(up, s.face + (Math.random() - 0.5) * 0.3);   // privesc spre teren (fiecare putin altfel)
    m4.compose(s.p, q, one.setScalar(0.92 + Math.random() * 0.16)); crowd.setMatrixAt(i, m4);
  });
  crowd.frustumCulled = false; scene.add(crowd);

  return {
    ledTex, lamps,
    setColors(c0, c1) { const t = crowdAtlas(c0, c1); t.repeat.set(1 / 8, 1 / 2); mat.map.dispose(); mat.map = t; mat.needsUpdate = true; },
    setNight(on) { mat.color.set(on ? 0x7a8296 : 0xffffff); concrete.color.set(on ? 0x3a3f4a : 0x5a606c); },
    update(t, excited) { U.uTime.value = t; U.uAmp.value = excited ? 0.45 : 0.03; U.uFreq.value = excited ? 9 : 2; },
  };
}
