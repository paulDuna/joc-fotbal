import * as THREE from 'three';
import { TEAMS, FORMATION, SKIN } from './data.js';
import { buildWorld, makeBall, makePlayerMesh, makeHead, makeMarker, netHit, netDepthAt, HALF_L, HALF_W, GOAL_W, GOAL_H, BALL_R } from './world.js';
import { initAudio, sfx } from './audio.js';
import { loadMannequin, makeMannequin, animateMannequin, attachHead, afterPose } from './mannequin.js';

let HALF_SECONDS = 240;           // durata reala a unei reprize (se alege din meniu)
// lungimea reala a reprizei curente, cu tot cu minutele de prelungire (+X) date de arbitru
const periodMin = () => (game.half <= 2 ? 45 : 15);
const periodLen = () => (game.half <= 2 ? HALF_SECONDS : HALF_SECONDS / 3) * (periodMin() + (game.added || 0)) / periodMin();
function newPeriod() {                                   // arbitrul decide cate minute se adauga la final
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  game.added = game.half === 1 ? r(1, 3) : game.half === 2 ? r(2, 7) : r(0, 2);
  game.addShown = false;
}
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

// ---------- scena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 500);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);   // telefon: cand apare/dispare bara browserului
document.addEventListener('fullscreenchange', () => setTimeout(resize, 50));
const world = buildWorld(scene, renderer, matchMedia('(pointer: coarse)').matches ? 1024 : 2048);
const ballGfx = makeBall(scene);

// ---------- stare ----------
const players = [];
const ball = { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: 0, lastPlayer: null,
  noPick: null, noPickT: 0, passTarget: null, protectT: 0, offside: null, throwIn: null, cornerK: null };
const game = { state: 'menu', diff: 0, paused: false, mode: 0, half: 1, time: 0, score: [0, 0], freeze: 0, timer: 0, msgT: 0 };
const humans = [];
const cam = { x: 0, z: 0, zoom: 1, lz: 0 };

TEAMS.forEach((t, ti) => {
  const sign = ti === 0 ? 1 : -1;
  t.players.forEach((d, i) => {
    const f = FORMATION[i], gk = i === 0;
    const m = makePlayerMesh(scene, { shirt: gk ? t.gk : t.color, shorts: gk ? t.gk : t.shorts, socks: gk ? t.gk : t.socks, skinTone: d.t, hair: d.h, num: d.num, style: d.s, beard: d.b });
    players.push({ ...m, team: ti, sign, d, role: f.role, isGK: gk, hx: f.x, hz: f.z,
      x: f.x * sign, z: f.z * sign, vx: 0, vz: 0, fx: sign, fz: 0, stamina: 1, phase: Math.random() * 6,
      kickT: 0, lungeT: 0, lungeHit: false, stunT: 0, tackleCd: 0, aiT: 0, holdT: 0, diveT: 0, diveDir: 0, human: null, yellow: 0, jumpT: 0 });
  });
});
const teamOf = (t) => players.filter((p) => p.team === t);
const allPlayers = players.slice(), squad = [players.slice(0, 11), players.slice(11)];
const gkOf = (t) => squad[t][0];
const attackingTeam = (side) => (squad[0][0].sign === side ? 0 : 1);     // echipa care ataca spre partea aceea
const firstActive = (t, order) => order.map((i) => squad[t][i]).find((p) => players.includes(p));
const stats = { own: [0, 0], shots: [0, 0], fouls: [0, 0], offs: [0, 0] };
// dificultate: se aplica doar echipei conduse de calculator cand joci singur
const DIFF = [
  { spd: 0.86, tackle: 0.45, gk: 0.65, shot: 1.7 },      // usor
  { spd: 0.95, tackle: 0.9, gk: 0.95, shot: 1.1 },       // normal
  { spd: 1.0, tackle: 1.35, gk: 1.12, shot: 0.8 },       // greu
];
const DIFF_BASE = { spd: 1, tackle: 1, gk: 1, shot: 1 };
const dk = (p) => (game.mode === 1 && humans.length && p.team !== humans[0].team ? DIFF[game.diff] : DIFF_BASE);   // dificultatea se aplica echipei calculatorului
const rec = [];                                                         // ultimele secunde, pentru reluare
const TGT = [0, 1].map(() => {                                          // inel alb: cui ii merge pasa
  const m = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.visible = false; scene.add(m); return m;
});
function setShadows(on) {                                               // umbre reale sau, pe telefoane lente, pete simple
  renderer.shadowMap.enabled = on; world.sun.castShadow = on;
  for (const p of allPlayers) p.blob.visible = !on;
  ballGfx.shadow.visible = !on;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
}
setShadows(true);
// confetti la gol
const CONF_N = 240, confPos = new Float32Array(CONF_N * 3), confVel = new Float32Array(CONF_N * 3), confCol = new Float32Array(CONF_N * 3);
const confGeo = new THREE.BufferGeometry();
confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3)); confGeo.setAttribute('color', new THREE.BufferAttribute(confCol, 3));
const conf = new THREE.Points(confGeo, new THREE.PointsMaterial({ size: 0.38, vertexColors: true, transparent: true, depthWrite: false }));
conf.visible = false; conf.frustumCulled = false; scene.add(conf);
let confT = 0;
function confetti(x, z) {
  if (net.role === 'host') netEv.push(['c', x, z]);
  confT = 4.5; conf.visible = true;
  const c = new THREE.Color();
  for (let i = 0; i < CONF_N; i++) {
    confPos[i * 3] = x + rnd(7); confPos[i * 3 + 1] = 2 + Math.random() * 8; confPos[i * 3 + 2] = z + rnd(7);
    confVel[i * 3] = rnd(2.5); confVel[i * 3 + 1] = Math.random() * 5; confVel[i * 3 + 2] = rnd(2.5);
    c.setHSL(Math.random(), 0.95, 0.6); confCol[i * 3] = c.r; confCol[i * 3 + 1] = c.g; confCol[i * 3 + 2] = c.b;
  }
  confGeo.attributes.color.needsUpdate = true;
}
function updateConfetti(dt) {
  if (confT <= 0) return;
  confT -= dt;
  for (let i = 0; i < CONF_N; i++) {
    const j = i * 3;
    if (confPos[j + 1] <= 0.06) continue;
    confVel[j + 1] -= 5 * dt; confVel[j] += rnd(6) * dt; confVel[j + 2] += rnd(6) * dt;
    confPos[j] += confVel[j] * dt; confPos[j + 1] = Math.max(0.06, confPos[j + 1] + Math.max(confVel[j + 1], -3.5) * dt); confPos[j + 2] += confVel[j + 2] * dt;
  }
  confGeo.attributes.position.needsUpdate = true;
  if (confT <= 0) conf.visible = false;
}
// dara in urma suturilor puternice
const trail = [0, 1, 2, 3, 4, 5].map((i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15 - i * 0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34 - i * 0.05, depthWrite: false }));
  m.visible = false; scene.add(m); return m;
});
const hist = [];
const offLine = [0, 0];                                                 // linia de ofsaid (in cadrul propriu al echipei care ataca)
const TEAM_CSS = TEAMS.map((t) => '#' + t.color.toString(16).padStart(6, '0'));

const KEYMAPS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', pass: ['KeyF'], through: ['KeyR'], shoot: ['KeyG', 'Space'], sprint: 'ShiftLeft' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', pass: ['KeyK'], through: ['KeyO'], shoot: ['KeyL'], sprint: 'ShiftRight' },
];
const MARKERS = [makeMarker(scene, '#ffd84a'), makeMarker(scene, '#4ae3ff')];
MARKERS.forEach((m) => m.setVisible(false));

// ---------- tastatura ----------
// comenzile: cele locale (tastatura / ecran) si, la jocul online, cele venite de pe celalalt telefon
let keys = new Set(), pressed = new Set(), released = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter' || e.code === 'NumpadEnter') netJoin(e.target.value.trim()); return; }   // scrii codul jocului online
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (!LOCAL.keys.has(e.code)) LOCAL.pressed.add(e.code);
  LOCAL.keys.add(e.code);
  initAudio();
  if (game.state === 'menu') { if (e.code === 'Digit1') openTrain(); if (e.code === 'Digit2') startMatch(2); }
  else if (game.state === 'end' && e.code === 'Enter') toMenu();
});
window.addEventListener('keyup', (e) => { LOCAL.keys.delete(e.code); LOCAL.released.add(e.code); });
window.addEventListener('blur', () => LOCAL.keys.clear());
// pe telefon jocul porneste pe tot ecranul (fara barele browserului jos/sus)
function goFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  try { const pr = req && req.call(el, { navigationUI: 'hide' }); if (pr && pr.then) pr.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => {}); } catch (_) {}
}
document.querySelectorAll('.opt[data-mode]').forEach((el) => el.addEventListener('click', () => { initAudio(); goFullscreen(); if (+el.dataset.mode === 1) openTrain(); else startMatch(+el.dataset.mode); }));

// ---------- comenzi tactile (telefon / tableta) ----------
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(location.search).has('touch');
const CZ = isTouch ? 0.8 : 1;                          // pe telefon camera sta mai aproape
let stick = { id: null, ox: 0, oy: 0, x: 0, z: 0, mag: 0 };
const LOCAL = { keys, pressed, released, stick };
const REMOTE = { keys: new Set(), pressed: new Set(), released: new Set(), stick: { x: 0, z: 0, mag: 0 } };
function useInput(inp) { keys = inp.keys; pressed = inp.pressed; released = inp.released; stick = inp.stick; }
const inputOf = (h) => (h && h.remote ? REMOTE : LOCAL);
let endAt = 0;
if (isTouch) {
  document.body.classList.add('touch');
  const zone = $('stickZone'), base = $('stick'), knob = base.firstElementChild, R = 52;
  const reset = () => { stick.id = null; stick.mag = 0; base.classList.add('idle'); base.style.left = base.style.top = base.style.bottom = ''; knob.style.transform = ''; };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    if (stick.id !== null) return;
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.mag = 0;
    try { zone.setPointerCapture(e.pointerId); } catch (_) {}
    base.classList.remove('idle'); base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.style.bottom = 'auto';
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stick.id) return;
    const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, l = Math.hypot(dx, dy) || 1, m = Math.min(1, l / R);
    stick.x = dx / l; stick.z = dy / l; stick.mag = m;
    knob.style.transform = `translate(${stick.x * m * R}px, ${stick.z * m * R}px)`;
  });
  const up = (e) => { if (e.pointerId === stick.id) reset(); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  const button = (id, code) => {
    const el = $(id);
    const off = (e) => { e.preventDefault(); if (LOCAL.keys.has(code)) { LOCAL.keys.delete(code); LOCAL.released.add(code); } el.classList.remove('on'); };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); initAudio();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      if (!LOCAL.keys.has(code)) LOCAL.pressed.add(code); LOCAL.keys.add(code); el.classList.add('on');
    });
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
  };
  button('bPass', 'KeyF'); button('bShoot', 'KeyG'); button('bThrough', 'KeyR'); button('bSprint', 'ShiftLeft'); button('bTrick', 'KeyE');
  window.addEventListener('pointerdown', () => { if (game.state === 'end' && performance.now() - endAt > 1500) toMenu(); });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}
try { const d = +localStorage.getItem('fotbal_diff'); if (d >= 0 && d <= 2) game.diff = d; } catch (_) {}
function setDiff(d) {
  game.diff = clamp(d, 0, 2);
  document.querySelectorAll('.dif').forEach((el) => el.classList.toggle('sel', +el.dataset.d === game.diff));
  try { localStorage.setItem('fotbal_diff', game.diff); } catch (_) {}
}
document.querySelectorAll('.dif').forEach((el) => el.addEventListener('click', () => setDiff(+el.dataset.d)));
setDiff(game.diff);
function setDur(m) {                                     // durata reprizei, in minute reale
  if (![2, 4, 6].includes(m)) m = 4;
  HALF_SECONDS = m * 60;
  document.querySelectorAll('.dur').forEach((el) => el.classList.toggle('sel', +el.dataset.m === m));
  try { localStorage.setItem('fotbal_dur', m); } catch (_) {}
}
document.querySelectorAll('.dur').forEach((el) => el.addEventListener('click', () => setDur(+el.dataset.m)));
try { setDur(+localStorage.getItem('fotbal_dur')); } catch (_) { setDur(4); }
let myTeam = 0;                                          // cu ce echipa joci cand esti singur (0 = Albastrii, 1 = Rosiii)
function setMyTeam(t) {
  myTeam = t === 1 ? 1 : 0;
  document.querySelectorAll('.myt').forEach((el) => el.classList.toggle('sel', +el.dataset.t === myTeam));
  try { localStorage.setItem('fotbal_team', myTeam); } catch (_) {}
}
document.querySelectorAll('.myt').forEach((el) => el.addEventListener('click', () => setMyTeam(+el.dataset.t)));
try { setMyTeam(+localStorage.getItem('fotbal_team')); } catch (_) { setMyTeam(0); }
let camTV = true;
const closeup = +new URLSearchParams(location.search).get('closeup') || 0;
const camShot = new URLSearchParams(location.search).get('shot');
let radarHidden = false;
function setCam(tv) {
  camTV = tv;
  document.querySelectorAll('.cam').forEach((el) => el.classList.toggle('sel', (el.dataset.c === 'tv') === tv));
  try { localStorage.setItem('fotbal_cam', tv ? 'tv' : 'larg'); } catch (_) {}
}
document.querySelectorAll('.cam').forEach((el) => el.addEventListener('click', () => setCam(el.dataset.c === 'tv')));
try { setCam(localStorage.getItem('fotbal_cam') !== 'larg'); } catch (_) { setCam(true); }
// meci de zi sau de seara (cu nocturne)
function setNight(on) {
  world.setNight(on);
  document.querySelectorAll('.tod').forEach((el) => el.classList.toggle('sel', (el.dataset.n === '1') === on));
  try { localStorage.setItem('fotbal_night', on ? '1' : '0'); } catch (_) {}
}
document.querySelectorAll('.tod').forEach((el) => el.addEventListener('click', () => setNight(el.dataset.n === '1')));
try { setNight(localStorage.getItem('fotbal_night') === '1' || new URLSearchParams(location.search).has('night')); } catch (_) { setNight(false); }
// la gol: plasa se umfla, fumigene in tribuna din spatele portii (si la prieten, in jocul online)
function goalFx(side, z, y, speed, color) {
  netHit(side, z, y, speed / 22); world.flare(color, side);
  if (net.role === 'host') netEv.push(['g', side, z, y, speed, color]);
}
window.addEventListener('keydown', (e) => { if (e.code === 'KeyC' && game.state !== 'menu') { setCam(!camTV); toast(camTV ? '📺 Cameră TV' : '🔭 Cameră largă'); } });
function setPaused(v) {
  if (game.state === 'menu' || game.state === 'end') v = false;
  game.paused = v; $('pause').classList.toggle('hidden', !v);
  if (!v) { $('teamPanel').classList.add('hidden'); $('fkPanel').classList.add('hidden'); }
}
$('pauseBtn').addEventListener('click', () => setPaused(true));
// ---------- manechin cu miscari filmate (se poate alege din meniu: Manechin / Clasic) ----------
let manReady = false, useMan = true;
try { useMan = localStorage.getItem('fotbal_model') !== 'clasic'; } catch (_) {}
function attachMannequin(p) {
  if (!manReady) return;
  if (p.man) { p.group.remove(p.man.root); if (p.man.head) p.group.remove(p.man.head); }
  const t = TEAMS[p.team], d = p.d, BOOTS = [0x111111, 0xffffff, 0xff4fa3, 0x29e3ff, 0xc6ff2e, 0xff7a1a, 0xffd400, 0x111111];
  // manechin imbracat ca un fotbalist (tricou, sort, jambiere, ghete) + capul jucatorului (fata, par, barba)
  p.man = makeMannequin({ shirt: p.isGK ? t.gk : t.color, shorts: p.isGK ? t.gk : t.shorts, socks: p.isGK ? t.gk : t.socks, skin: SKIN[d.t] ?? SKIN[0], boot: BOOTS[(d.num * 7 + (d.t || 0)) % BOOTS.length] });
  p.man.root.scale.setScalar(p.man.scale / p.group.scale.x);
  p.group.add(p.man.root);
  attachHead(p.man, makeHead({ skinTone: d.t, hair: d.h, num: d.num, style: d.s, beard: d.b }), p.group);
  p.man.root.visible = p.man.head.visible = useMan; p.body.visible = !useMan;
}
function setModel(man) {
  useMan = man;
  document.querySelectorAll('.mdl').forEach((el) => el.classList.toggle('sel', (el.dataset.m === 'man') === man));
  try { localStorage.setItem('fotbal_model', man ? 'man' : 'clasic'); } catch (_) {}
  for (const p of allPlayers) { if (p.man) p.man.root.visible = p.man.head.visible = man; p.body.visible = !(man && p.man); }
}
document.querySelectorAll('.mdl').forEach((el) => el.addEventListener('click', () => setModel(el.dataset.m === 'man')));
setModel(useMan);
loadMannequin().then((g) => { if (!g) return; manReady = true; for (const p of allPlayers) attachMannequin(p); setModel(useMan); });

// ---------- echipa si schimbari de jucatori ----------
const origD = allPlayers.map((p) => p.d);               // primul 11, ca sa-l punem la loc la meci nou
const bench = [[], []], subsUsed = [0, 0], MAX_SUBS = 5;
let tpTeam = 0, tpSel = null;                             // tpSel: { kind: 'field'|'bench', i }
function resetSquads() {
  allPlayers.forEach((p, i) => { if (p.d !== origD[i]) substitute(p, origD[i]); });
  for (let t = 0; t < 2; t++) { bench[t] = (TEAMS[t].bench || []).map((d) => ({ d, out: false })); subsUsed[t] = 0; }
}
function substitute(p, d) {                              // schimba omul (si aspectul), pastreaza postul
  const t = TEAMS[p.team];
  scene.remove(p.group);
  const m = makePlayerMesh(scene, { shirt: p.isGK ? t.gk : t.color, shorts: p.isGK ? t.gk : t.shorts, socks: p.isGK ? t.gk : t.socks, skinTone: d.t, hair: d.h, num: d.num, style: d.s, beard: d.b });
  Object.assign(p, m);
  p.d = d; p.stamina = 1; p.yellow = 0; p.lastAng = undefined;
  p.blob.visible = !renderer.shadowMap.enabled; p.group.visible = players.includes(p);
  p.man = null; attachMannequin(p);
}
const POS = { G: 'POR', D: 'FUN', M: 'MIJ', A: 'ATA' };
function renderTeam() {
  const t = tpTeam, enBar = (v) => `<span class="tp-en"><i style="width:${(v * 100) | 0}%;background:${v > 0.5 ? '#4cd964' : v > 0.25 ? '#ffd84a' : '#ff5a36'}"></i></span>`;
  $('tpTitle').textContent = 'Echipa ' + TEAMS[t].name;
  $('tpSubs').textContent = 'Schimbări: ' + subsUsed[t] + ' / ' + MAX_SUBS;
  $('tpTabs').innerHTML = game.mode === 2 ? [0, 1].map((i) => `<span class="tp-tab${i === t ? ' sel' : ''}" data-t="${i}">${TEAMS[i].short}</span>`).join('') : '';
  $('tpField').innerHTML = squad[t].map((p, i) => {
    const on = players.includes(p), sel = tpSel && tpSel.kind === 'field' && tpSel.i === i;
    return `<div class="tp-row${sel ? ' sel' : ''}${on ? '' : ' off'}" data-k="field" data-i="${i}"><span class="tp-num">${p.d.num}</span><span class="tp-pos">${POS[p.role]}</span><span class="tp-name">${p.d.name}${p.yellow ? ' 🟨' : ''}${on ? '' : ' 🟥'}</span>${enBar(p.stamina)}</div>`;
  }).join('');
  $('tpBench').innerHTML = bench[t].map((b, i) => {
    const sel = tpSel && tpSel.kind === 'bench' && tpSel.i === i;
    return `<div class="tp-row${sel ? ' sel' : ''}${b.out ? ' off' : ''}" data-k="bench" data-i="${i}"><span class="tp-num">${b.d.num}</span><span class="tp-pos">${b.d.gk ? 'POR' : ''}</span><span class="tp-name">${b.d.name}${b.out ? ' (a ieșit)' : ''}</span>${b.out ? '' : enBar(1)}</div>`;
  }).join('');
}
function trySub(fi, bi) {
  const t = tpTeam, p = squad[t][fi], b = bench[t][bi];
  if (!players.includes(p)) return toast('Jucătorul eliminat nu poate fi schimbat');
  if (b.out) return toast('Jucătorul a ieșit deja, nu mai poate intra');
  if (subsUsed[t] >= MAX_SUBS) return toast('Ai făcut deja toate cele ' + MAX_SUBS + ' schimbări');
  if (!!p.isGK !== !!b.d.gk) return toast(p.isGK ? 'Portarul se schimbă doar cu un portar' : 'Un portar intră doar în locul portarului');
  const old = p.d;
  substitute(p, b.d);
  bench[t][bi] = { d: old, out: true };
  subsUsed[t]++;
  stats.subs = (stats.subs || 0) + 1;
  toast('🔁 Iese ' + old.name + ', intră ' + p.d.name, 3);
  tpSel = null;
}
function openTeam(v) {
  if (game.state === 'menu' || game.state === 'end') v = false;
  if (v) { tpSel = null; tpTeam = humans.length ? humans[0].team : 0; renderTeam(); $('pause').classList.add('hidden'); }
  $('teamPanel').classList.toggle('hidden', !v);
  game.paused = v;
}
$('teamBtn').addEventListener('click', () => openTeam(true));
$('teamOpen').addEventListener('click', () => openTeam(true));
$('tpClose').addEventListener('click', () => openTeam(false));
$('teamPanel').addEventListener('click', (e) => {
  const tab = e.target.closest('.tp-tab');
  if (tab) { tpTeam = +tab.dataset.t; tpSel = null; return renderTeam(); }
  const row = e.target.closest('.tp-row'); if (!row || row.classList.contains('off')) return;
  const k = row.dataset.k, i = +row.dataset.i;
  if (tpSel && tpSel.kind !== k) { k === 'bench' ? trySub(tpSel.i, i) : trySub(i, tpSel.i); }
  else tpSel = tpSel && tpSel.kind === k && tpSel.i === i ? null : { kind: k, i };
  renderTeam();
});
window.addEventListener('keydown', (e) => { if (e.code === 'KeyT' && game.state !== 'menu' && game.state !== 'end') openTeam($('teamPanel').classList.contains('hidden')); });
$('resume').addEventListener('click', () => setPaused(false));
$('quit').addEventListener('click', () => { setPaused(false); toMenu(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') setPaused(!game.paused);
  if (game.state === 'menu') { if (e.code === 'ArrowLeft') setDiff(game.diff - 1); if (e.code === 'ArrowRight') setDiff(game.diff + 1); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state !== 'menu') setPaused(true); });
let toastT = 0;
function toast(text, secs = 1.6) { if (net.role === 'host') netEv.push(['t', text, secs]); const t = $('toast'); t.textContent = text; t.classList.toggle('on', !!text); toastT = secs; }
const anyDown = (list) => list.some((k) => keys.has(k));
const anyPressed = (list) => list.some((k) => pressed.has(k));
const anyReleased = (list) => list.some((k) => released.has(k));

// ---------- HUD ----------
$('t0').textContent = TEAMS[0].name; $('t1').textContent = TEAMS[1].name;
const log = [];
function showMsg(text, secs = 2) { if (net.role === 'host') netEv.push(['m', text, secs]); $('msg').classList.toggle('long', text.length > 60); log.push(Math.round(game.time) + 's ' + text.replace(/\n/g, ' ')); const m = $('msg'); m.textContent = text; m.classList.add('on'); game.msgT = secs; }
let lastClock = '';
function updateHud() {
  if (game.drill) {                                       // antrenament: in loc de ceas, timpul sau incercarea
    const d = game.drill;
    const s = d.type === 'sprint' ? (d.phase === 'run' ? d.t.toFixed(1) + ' s' : '🏃 ' + (d.n + 1) + '/' + d.runs) : '🎯 ' + Math.min(d.n + 1, d.total) + '/' + d.total;
    if (s !== lastClock) { $('clock').textContent = s; lastClock = s; }
    if (d.type === 'fk') $('sc').textContent = '⚽ ' + d.score;
  }
  else {
  const len = periodMin(), base = [0, 45, 90, 105][game.half - 1] || 0, add = game.added || 0;
  const ms = Math.min(game.time, periodLen()) / periodLen() * (len + add) * 60 + base * 60;
  if (game.state === 'play' && !game.addShown && add > 0 && ms >= (base + len) * 60) {
    game.addShown = true; toast('⏱ Arbitrul de rezervă arată: +' + add + (add === 1 ? ' minut' : ' minute'), 3.5);
  }
  const s = game.state === 'shootout' ? 'PEN' : String(Math.floor(ms / 60)).padStart(2, '0') + ':' + String(Math.floor(ms % 60)).padStart(2, '0');
  if (s !== lastClock) { $('clock').textContent = s; lastClock = s; }
  }
  humans.forEach((h, i) => {
    const n = i + 1;
    $('p' + n + 'n').textContent = h.ctrl.d.num + ' · ' + h.ctrl.d.name;
    $('p' + n + 's').style.width = (h.ctrl.stamina * 100).toFixed(0) + '%';
    $('p' + n + 'p').style.width = (h.charge * 100).toFixed(0) + '%';
  });
}
let defUi = null;
function updateTouchUi() {
  if (!isTouch || !humans.length) return;
  const def = game.state === 'shootout' ? !!SO.taker && SO.taker.team !== humans[0].team : !(ball.owner && ball.owner.team === humans[0].team);
  if (def !== defUi) { defUi = def; document.body.classList.toggle('def', def); }
}
const radar = $('radar').getContext('2d');
let radarN = 0;
function drawRadar() {
  if (radarN++ % 3) return;
  const W = 150, H = 97, g = radar;
  g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(18,64,24,0.85)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
  for (const p of players) {
    g.fillStyle = TEAM_CSS[p.team]; g.beginPath(); g.arc((p.x + 52.5) / 105 * W, (p.z + 34) / 68 * H, 2.6, 0, 6.3); g.fill();
    if (humans.some((h) => h.ctrl === p)) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
  }
  g.fillStyle = '#ffe94a'; g.beginPath(); g.arc((ball.x + 52.5) / 105 * W, (ball.z + 34) / 68 * H, 2, 0, 6.3); g.fill();
}
function updateScore() {
  const p = game.pens ? '  (' + game.pens[0] + ' - ' + game.pens[1] + ')' : '';
  $('sc').textContent = game.score[0] + ' - ' + game.score[1] + p;
}

// ---------- flux meci ----------
function startMatch(mode, online) {
  game.mode = mode; game.half = 1; game.time = 0; game.score = [0, 0]; game.next = null; game.pens = null; newPeriod(); updateScore();
  humans.length = 0;
  for (let i = 0; i < mode; i++) {
    // online: eu (telefonul care a creat jocul) + prietenul, care trimite comenzile prin internet
    const tm = mode === 1 || online ? (i === 0 ? myTeam : 1 - myTeam) : i;
    humans.push({ team: tm, keys: online ? KEYMAPS[0] : KEYMAPS[i], remote: !!online && i === 1, ctrl: squad[tm][9], charge: 0, charging: false, marker: MARKERS[i], tgt: TGT[i], passTo: null, swT: 0 });
  }
  MARKERS.forEach((m, i) => m.setVisible(i < mode));
  $('p1').classList.toggle('hidden', mode < 1); $('p2').classList.toggle('hidden', mode < 2 || !!online);
  $('menu').classList.add('hidden'); $('touch').classList.toggle('hidden', !isTouch); $('pauseBtn').classList.remove('hidden'); $('teamBtn').classList.remove('hidden');
  players.length = 0; players.push(...allPlayers);
  resetSquads();
  players.forEach((p) => { p.stamina = 1; p.yellow = 0; p.sign = p.team === 0 ? 1 : -1; p.group.visible = true; });
  for (const k in stats) stats[k] = [0, 0];
  game.state = 'play';
  kickoff(0);
}
function toMenu() { netClose(); drillCleanup(); $('trainPanel').classList.add('hidden'); game.state = 'menu'; $('touch').classList.add('hidden'); $('pauseBtn').classList.add('hidden'); $('teamBtn').classList.add('hidden'); $('teamPanel').classList.add('hidden'); TGT.forEach((m) => { m.visible = false; }); toast('', 0); $('menu').classList.remove('hidden'); $('msg').classList.remove('on'); }

function setOwner(p) {
  const off = ball.offside === p; ball.offside = null;
  if (off) {                                             // primeste mingea din pozitie de ofsaid
    stats.offs[p.team]++;
    showOffLine(p);
    restart(1 - p.team, clamp(p.x, -HALF_L + 2, HALF_L - 2), clamp(p.z, -HALF_W + 2, HALF_W - 2), 'OFSAID! 🚩\n' + p.d.name);
    return;
  }
  ball.owner = p; ball.passTarget = null; ball.lastTouch = p.team; ball.lastPlayer = p;
  if (p.isGK) p.holdT = 1.3;
}

// linia galbena de ofsaid (ca la VAR): arata unde era ultimul aparator cand s-a dat pasa
const offMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.18, HALF_W * 2), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.9, depthWrite: false }));
offMesh.rotation.x = -Math.PI / 2; offMesh.position.y = 0.045; offMesh.visible = false; scene.add(offMesh);
let offT = 0;
function showOffLine(p) {
  const s = squad[p.team][0].sign;
  offMesh.position.x = (ball.offLineX ?? offLine[p.team]) * s;
  offMesh.visible = true; offT = 3;
}

function kickoff(team) {
  game.penView = null;
  for (const p of players) {
    let x = Math.min(p.hx, p.team === team ? -1.5 : -9.5);
    p.x = x * p.sign; p.z = p.hz * p.sign; p.vx = p.vz = 0; p.fx = p.sign; p.fz = 0;
    p.lungeT = p.stunT = p.kickT = p.tackleCd = p.diveT = 0;
  }
  const taker = firstActive(team, [9, 8, 10, 6, 5, 7, 1]);
  ball.offside = ball.throwIn = ball.cornerK = ball.freeKick = null; game.scorer = null; rec.length = 0;
  taker.x = -0.6 * taker.sign; taker.z = 0;
  ball.vx = ball.vy = ball.vz = 0; ball.noPickT = 0;
  setOwner(taker); ball.protectT = 1.5;
  ball.freeKick = taker; game.fkT = 1.4;                 // lovitura de inceput: nu poti fugi cu mingea, trebuie data o pasa
  if (humans.some((h) => h.team === team)) toast('Lovitura de început: dă o PASĂ', 2.5);
  for (const h of humans) { h.ctrl = h.team === team ? taker : firstActive(h.team, [6, 5, 7, 9, 8, 10, 1]); h.charge = 0; h.charging = false; }
  game.freeze = 1.2; sfx.whistle();
}

// lovitura libera: jocul sta pe loc pana o bate executantul (zid daca e aproape de poarta)
function setFreeKick(taker, direct) {
  ball.freeKick = taker; game.fkT = 0;
  const def = 1 - taker.team, gx = -HALF_L * squad[def][0].sign;          // poarta pe care o apara adversarii
  const dx = gx - ball.x, dz = -ball.z, d = Math.hypot(dx, dz);
  if (d < 32 && d > 11) {
    const ux = dx / d, uz = dz / d, cx = ball.x + ux * 9.15, cz = ball.z + uz * 9.15;
    const n = d < 22 ? 4 : 3;
    const wall = players.filter((q) => q.team === def && !q.isGK).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)).slice(0, n);
    wall.forEach((q, i) => { const o = (i - (n - 1) / 2) * 0.62; q.x = cx - uz * o; q.z = cz + ux * o; q.vx = q.vz = 0; q.fx = -ux; q.fz = -uz; });
  }
  const hum = humans.find((h) => h.team === taker.team);
  if (hum && !hum.remote && direct && d < 32 && d > 13) openFkPick(taker);   // lovitura libera directa: alegi cine bate, apoi tintesti cu efect
  else if (hum) toast('Lovitură liberă: țintește, apoi PASĂ sau ȘUT', 3.5);
}

// ---------- lovitura libera directa (langa careu): alegi executantul, tintesti cu efect, elan, sut ----------
const FK_STARS = { Messi: 96, Ronaldo: 93, 'De Bruyne': 91, Kimmich: 89, Kane: 88, Modrić: 86, Valverde: 86, Foden: 85, Bellingham: 84, Salah: 84, Saka: 84, Lewandowski: 84, Pedri: 82, Musiala: 82, Mbappé: 82, Vinícius: 80, Haaland: 78 };
const fkSkill = (d) => FK_STARS[d.name] ?? Math.round(d.sho * 0.5 + d.pas * 0.35 + d.dri * 0.15 - 8);
const fkDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.85, depthWrite: false }), 48);
fkDots.visible = false; fkDots.frustumCulled = false; scene.add(fkDots);
const fkTmp = new THREE.Object3D();
function openFkPick(taker) {
  const list = players.filter((q) => q.team === taker.team && !q.isGK).sort((a, b) => fkSkill(b.d) - fkSkill(a.d));
  $('fkList').innerHTML = list.map((q, i) => `<div class="tp-row${i === 0 ? ' fk-best' : ''}" data-n="${allPlayers.indexOf(q)}"><span class="tp-num">${q.d.num}</span><span class="tp-name">${i === 0 ? '⭐ ' : ''}${q.d.name}${i === 0 ? ' — cel mai bun' : ''}</span><span class="fk-skill">${fkSkill(q.d)}</span></div>`).join('');
  $('fkPanel').classList.remove('hidden'); game.paused = true;
}
$('fkList').addEventListener('click', (e) => {
  const row = e.target.closest('.tp-row'); if (!row) return;
  const p = allPlayers[+row.dataset.n], old = ball.freeKick;
  $('fkPanel').classList.add('hidden'); game.paused = false;
  if (old && old !== p) { old.x = ball.x - 3 * (old.sign); old.z = ball.z + 2.5; old.vx = old.vz = 0; }   // celalalt se da la o parte
  ball.owner = p; ball.freeKick = p; ball.lastTouch = p.team; ball.lastPlayer = p; ball.protectT = 3;
  for (const h of humans) if (h.team === p.team) { if (h.ctrl) h.ctrl.human = null; h.ctrl = p; h.charge = 0; h.charging = false; }
  const gx = -HALF_L * squad[1 - p.team][0].sign;
  game.fkAim = { taker: p, gx, aimZ: 0, curve: 0, phase: 'aim', run: 0, power: 0.55 };
  placeFkTaker();
  toast(isTouch ? 'Joystick sus/jos = ținta · stânga/dreapta = efectul · ține ȘUT' : 'W/S = ținta · A/D = efectul · ține ȘUT (G) pentru putere', 5);
});
function fkLaunch(a, power) {                            // viteza si efectul pentru tinta/efect/putere alese
  const p = a.taker, dx0 = a.gx - ball.x, dz0 = a.aimZ - ball.z, dist = Math.hypot(dx0, dz0) || 1;
  const sp = (19 + 11 * power) * (0.85 + p.d.sho * 0.0015) * (0.9 + fkSkill(p.d) / 1000);
  const th = clamp(0.5 * a.curve * dist / sp, -0.4, 0.4), c = Math.cos(-th), s = Math.sin(-th);
  const ux = dx0 / dist, uz = dz0 / dist;
  return { vx: (ux * c - uz * s) * sp, vz: (ux * s + uz * c) * sp, vy: 2.6 + power * 4.6, curve: a.curve };
}
function placeFkTaker() {                                 // executantul sta 2.5 m in spatele mingii, pe directia sutului
  const a = game.fkAim, p = a.taker, L = fkLaunch(a, a.power), l = Math.hypot(L.vx, L.vz) || 1;
  const back = a.phase === 'run' ? 2.5 * (1 - a.run) + 0.55 : 2.5;
  p.fx = L.vx / l; p.fz = L.vz / l; p.x = ball.x - p.fx * back; p.z = ball.z - p.fz * back;
}
function drawFkPath() {                                  // linia curba: unde va zbura mingea (aceeasi fizica ca updateBall)
  const a = game.fkAim, L = fkLaunch(a, a.power);
  let x = ball.x, y = BALL_R, z = ball.z, vx = L.vx, vy = L.vy, vz = L.vz, cv = L.curve, n = 0;
  for (let i = 0; i < 150 && n < 48; i++) {
    const dt = 1 / 60; vy -= 9.81 * dt;
    if (cv && Math.hypot(vx, vz) > 3) { const ax = -vz * cv, az = vx * cv; vx += ax * dt; vz += az * dt; cv *= 1 - 0.4 * dt; }
    x += vx * dt; y += vy * dt; z += vz * dt; if (y < BALL_R) { y = BALL_R; vy = -vy * 0.55; }
    const k = 1 - 0.12 * dt; vx *= k; vz *= k;
    if (i % 3 === 0) { fkTmp.position.set(x, y, z); fkTmp.updateMatrix(); fkDots.setMatrixAt(n++, fkTmp.matrix); }
    if (Math.abs(x) > HALF_L + 0.5) break;
  }
  fkDots.count = n; fkDots.instanceMatrix.needsUpdate = true; fkDots.visible = true;
}
function fkAimStep(h, dt) {
  const a = game.fkAim, p = a.taker, K = h.keys;
  p.human = h;
  if (a.phase === 'aim') {
    let ix = (keys.has(K.right) ? 1 : 0) - (keys.has(K.left) ? 1 : 0), iz = (keys.has(K.down) ? 1 : 0) - (keys.has(K.up) ? 1 : 0);
    if ((h === humans[0] || h.remote) && stick.mag > 0.2) { ix = stick.x * stick.mag; iz = stick.z * stick.mag; }
    a.aimZ = clamp(a.aimZ + iz * 3.2 * dt, -6, 6);
    a.curve = clamp(a.curve + ix * 0.5 * dt * (a.gx > 0 ? 1 : -1), -0.55, 0.55);
    if (anyPressed(K.shoot)) h.charging = true;
    if (h.charging) {
      h.charge = Math.min(1, h.charge + dt / 1.1); a.power = Math.max(0.15, h.charge);
      if (anyReleased(K.shoot) || !anyDown(K.shoot) || h.charge >= 1) { a.phase = 'run'; a.run = 0; h.charging = false; h.charge = 0; }
    }
    p.vx = p.vz = 0; placeFkTaker(); drawFkPath();
    return;
  }
  // elanul: cativa pasi spre minge, apoi sutul
  a.run = Math.min(1, a.run + dt / 0.6);
  const L = fkLaunch(a, a.power), l = Math.hypot(L.vx, L.vz) || 1;
  p.vx = L.vx / l * 5.5; p.vz = L.vz / l * 5.5; placeFkTaker();
  if (a.run >= 1) {
    fkDots.visible = false; game.fkAim = null;
    kick(p, L.vx, L.vy, L.vz); ball.curve = L.curve; stats.shots[p.team]++;
  }
}

function restart(team, x, z, text, useGK, forced) {
  if (game.drill) return drillOutcome(false, 'Pe lângă!');   // antrenament: mingea a iesit = ratat
  ball.offside = ball.throwIn = ball.cornerK = ball.freeKick = null;
  let taker = forced && players.includes(forced) && !forced.isGK ? forced : null, best = 1e9;
  if (useGK) taker = gkOf(team);
  else if (!taker) for (const p of teamOf(team)) { if (p.isGK) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < best) { best = d; taker = p; } }
  taker.x = x; taker.z = z; taker.vx = taker.vz = 0; taker.stunT = taker.lungeT = 0;
  const l = Math.hypot(x, z) || 1; taker.fx = -x / l; taker.fz = -z / l;
  if (useGK) { taker.fx = taker.sign; taker.fz = 0; }
  for (const q of players) {                       // adversarii se dau la 9 metri
    if (q.team === team || q.isGK) continue;
    const dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
    if (d < 9.15) { const k = 9.15 / (d || 1); q.x = clamp(x + (dx || -taker.fx) * k, -HALF_L, HALF_L); q.z = clamp(z + (dz || 1) * k, -HALF_W, HALF_W); q.vx = q.vz = 0; }
  }
  ball.vx = ball.vy = ball.vz = 0; ball.noPickT = 0;
  setOwner(taker); ball.protectT = 2.5;
  if (!taker.isGK) taker.holdT = 0.9;
  if (text.startsWith('Fault') || text.startsWith('OFSAID')) setFreeKick(taker, text.startsWith('Fault'));
  else { ball.freeKick = taker; game.fkT = 0; }          // aut, corner, lovitura de poarta: toti asteapta pana se executa
  const secs = text.includes('\n') ? 2.4 : 1.2;
  game.freeze = secs - 0.3; showMsg(text, secs); sfx.whistle();
}

function penalty(team, card) {
  const side = squad[team][0].sign;
  game.penView = { side, t: 99 };                       // camera trece in spatele executantului
  ball.offside = ball.throwIn = ball.cornerK = ball.freeKick = null;
  let taker = null;
  for (const p of players) if (p.team === team && !p.isGK && (!taker || p.d.sho > taker.d.sho)) taker = p;
  for (const p of players) {
    p.vx = p.vz = 0; p.stunT = p.lungeT = 0;
    if (p.isGK) { if (p.team !== team) { p.x = side * (HALF_L - 0.6); p.z = 0; p.fx = -side; p.fz = 0; } continue; }
    if (p !== taker && p.x * side > HALF_L - 19 && Math.abs(p.z) < 22) p.x = side * (HALF_L - 19.5 - Math.random() * 4);
  }
  taker.x = side * (HALF_L - 11.9); taker.z = 0; taker.fx = side; taker.fz = 0;
  ball.vx = ball.vy = ball.vz = 0; ball.noPickT = 0;
  setOwner(taker); ball.protectT = 4; ball.freeKick = taker; game.fkT = 0;
  if (humans.some((h) => h.team === taker.team)) toast('Penalty: țintește, apoi ȘUT', 3.5);
  game.freeze = 1.9; showMsg('PENALTY!' + card, 2.2); sfx.whistle();
}

function sendOff(p) {
  const i = players.indexOf(p); if (i >= 0) players.splice(i, 1);
  p.group.visible = false; p.human = null;
  if (ball.passTarget === p) ball.passTarget = null;
  for (const h of humans) if (h.ctrl === p) h.ctrl = firstActive(h.team, [6, 5, 7, 9, 8, 10, 1, 2, 3, 4]);
}

function foul(p, o, behind) {
  const x = clamp(ball.x, -HALF_L + 1, HALF_L - 1), z = clamp(ball.z, -HALF_W + 1, HALF_W - 1);
  const pen = inOwnBox({ x, z, sign: p.sign });
  stats.fouls[p.team]++;
  let card = '';
  if (behind && Math.random() < 0.12) {                    // cartonas galben: doar la faulturi urate, din spate
    p.yellow++;
    if (p.yellow >= 2) { card = '\n🟥 ' + p.d.name + ' eliminat'; sendOff(p); } else card = '\n🟨 ' + p.d.name;
  }
  if (pen) penalty(o.team, card); else restart(o.team, x, z, 'Fault' + card, false, o);
}

function header(p) {
  const s = p.sign, gx = HALF_L * s, dg = Math.hypot(gx - p.x, p.z);
  let dx, dz, sp, vy;
  if (dg < 17) { dx = gx - p.x; dz = rnd(3.2) - p.z; sp = 12.5 + p.d.sho * 0.05; vy = -1 + Math.random() * 2.5; stats.shots[p.team]++; }
  else {
    const m = p.x * s > -28 ? bestPass(p, true) : null;
    if (m) { dx = m.x - p.x; dz = m.z - p.z; sp = Math.min(14, 6 + Math.hypot(dx, dz) * 0.5); vy = 2; }
    else { dx = s; dz = rnd(0.6); sp = 13; vy = 5; }       // degajare cu capul
  }
  const l = Math.hypot(dx, dz) || 1, e = rnd(0.12), c = Math.cos(e), sn = Math.sin(e);
  dx /= l; dz /= l; [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c];
  p.fx = dx; p.fz = dz; p.jumpT = 0.4;
  ball.vx = dx * sp; ball.vz = dz * sp; ball.vy = vy;
  ball.lastTouch = p.team; ball.lastPlayer = p; ball.noPick = p; ball.noPickT = 0.5; ball.passTarget = null; ball.offside = null;
  sfx.kick(0.4);
}

function statLine() {
  const t = stats.own[0] + stats.own[1] || 1, a = Math.round(stats.own[0] / t * 100);
  return 'Posesie ' + a + '% - ' + (100 - a) + '%   ·   Șuturi ' + stats.shots[0] + ' - ' + stats.shots[1] + '   ·   Faulturi ' + stats.fouls[0] + ' - ' + stats.fouls[1];
}

function goal(team) {
  if (game.drill) return drillOutcome(true);
  game.score[team]++; updateScore();
  const sc = ball.lastPlayer;
  const who = sc ? (sc.team === team ? sc.d.name : 'autogol ' + sc.d.name) : '';
  showMsg('GOOOL!\n' + who, 3); sfx.goal();
  goalFx(Math.sign(ball.x) || 1, ball.z, ball.y, Math.hypot(ball.vx, ball.vz), TEAMS[team].color);
  try { navigator.vibrate && navigator.vibrate(250); } catch (_) {}
  confetti(clamp(ball.x, -HALF_L + 4, HALF_L - 4), ball.z);
  game.state = 'goal'; game.timer = 4; game.kick = 1 - team;
  game.scorer = sc && sc.team === team && players.includes(sc) ? sc : null;
  ball.owner = null; ball.offside = null;
}

// ---------- miscare ----------
function topSpeed(p, sprint, dt) {
  const top = (5 + p.d.spd * 0.035) * dk(p).spd;
  const moving = Math.hypot(p.vx, p.vz) > 2;
  // energia: se consuma mai incet la sprint (~20 s de sprint) si revine mai repede (~11 s)
  if (sprint && p.stamina > 0.03) { if (moving) p.stamina = Math.max(0, p.stamina - 0.05 * dt); return top * (0.95 + 0.25 * p.stamina); }   // sprint rapid: pana la ~10 m/s la cei mai rapizi
  p.stamina = Math.min(1, p.stamina + 0.09 * dt);
  return top * 0.74;
}

function move(p, dx, dz, speed, dt) {
  if (ball.owner === p) speed *= 0.93;
  if (ball.throwIn === p || ball.freeKick === p) speed = 0;
  let ax = dx * speed - p.vx, az = dz * speed - p.vz;
  const al = Math.hypot(ax, az), mx = 13 * dt;         // accelerare/franare treptata, nu instantanee
  if (al > mx) { ax *= mx / al; az *= mx / al; }
  p.vx += ax; p.vz += az;
  p.x = clamp(p.x + p.vx * dt, -HALF_L - 3, HALF_L + 3); p.z = clamp(p.z + p.vz * dt, -HALF_W - 2.5, HALF_W + 2.5);
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.8) face(p, p.vx / sp, p.vz / sp, Math.min(1, 11 * dt));
}
function face(p, dx, dz, k = 1) {
  let fx = p.fx + (dx - p.fx) * k, fz = p.fz + (dz - p.fz) * k;
  const l = Math.hypot(fx, fz);
  if (l < 0.05) { fx = dx; fz = dz; } else { fx /= l; fz /= l; }
  p.fx = fx; p.fz = fz;
}
function goTo(p, tx, tz, sprint, dt) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d < 0.35) {
    move(p, 0, 0, 0, dt); topSpeed(p, false, dt);
    const bx = ball.x - p.x, bz = ball.z - p.z, bl = Math.hypot(bx, bz) || 1; face(p, bx / bl, bz / bl, Math.min(1, 5 * dt));
    return;
  }
  move(p, dx / d, dz / d, topSpeed(p, sprint && p.stamina > 0.2, dt) * Math.min(1, d / 1.5 + 0.2), dt);
}

// ---------- actiuni cu mingea ----------
function kick(p, vx, vy, vz) {
  const gkHold = p.isGK && ball.owner === p, thr = ball.throwIn === p;
  if (thr) { const sp = Math.hypot(vx, vz) || 1, k = Math.min(1, 13 / sp); vx *= k; vz *= k; vy = clamp(vy, 3, 5); }   // aruncare cu mana
  ball.owner = null; ball.passTarget = null; ball.offside = ball.throwIn = ball.cornerK = ball.freeKick = null;
  ball.x = p.x + p.fx * 0.7; ball.z = p.z + p.fz * 0.7; ball.y = thr ? 2 : gkHold ? 0.5 : BALL_R;
  ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.curve = 0;
  ball.noPick = p; ball.noPickT = 0.4; ball.lastTouch = p.team; ball.lastPlayer = p;
  p.kickT = 0.35;
  sfx.kick(Math.min(1, Math.hypot(vx, vz) / 30));
}

function doPass(p, m, dx, dz, through) {
  let sp = 21, vy = 0;
  if (m) {
    const d0 = Math.hypot(m.x - p.x, m.z - p.z), lead = Math.min(0.8, d0 / 24);
    if (through) { dx = clamp(m.x + p.sign * (7 + d0 * 0.25), -HALF_L + 3, HALF_L - 3) - p.x; dz = clamp(m.z + m.vz * 0.8, -HALF_W + 2, HALF_W - 2) - p.z; }
    else { dx = m.x + m.vx * lead - p.x; dz = m.z + m.vz * lead - p.z; }
    const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    if (d > 30 || ball.cornerK === p) { vy = d > 30 ? 7 : 6; sp = d / (2 * vy / 9.81) * 0.9; } else sp = Math.sqrt(140 + 17 * d);  // pase pe jos: rapide, dar usor de controlat
  }
  const e = rnd((1 - p.d.pas / 100) * 0.16), c = Math.cos(e), s = Math.sin(e);
  [dx, dz] = [dx * c - dz * s, dx * s + dz * c];
  p.fx = dx; p.fz = dz;
  const off = m && ball.protectT <= 0 && m.x * p.sign > offLine[p.team] + 0.3;
  const lineAtPass = offLine[p.team];
  kick(p, dx * sp, vy, dz * sp);
  ball.passTarget = m || null; ball.offside = off ? m : null; ball.offLineX = lineAtPass;
}

function shoot(p, power, aimZ) {
  stats.shots[p.team]++;
  const s = p.sign, gx = HALF_L * s;
  if (aimZ == null && p.fx * s > 0.25 && Math.abs(gx - p.x) < 42) {
    aimZ = clamp(p.fz * 5.5, -3.2, 3.2);
    if (Math.abs(aimZ) < 1.4) { const k = gkOf(1 - p.team); aimZ = (k.z - p.z * 0.05 > 0 ? -1 : 1) * 2.7; }   // ajutor la tinta: coltul liber
  }
  let dx = p.fx, dz = p.fz;
  if (aimZ != null) { dx = gx - p.x; dz = aimZ - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
  const sp = (23 + 17 * power) * (0.85 + p.d.sho * 0.0015);   // suturi tari: pana la ~40 m/s (~140 km/h)
  // sut cu efect: pleaca putin pe langa si se curbeaza spre tinta (cu cat e mai bland, cu atat are mai mult efect)
  const dist = Math.hypot(gx - p.x, (aimZ ?? p.z) - p.z);
  let curve = 0;
  if (dist < 38 && Math.random() < 0.8) {
    curve = (Math.random() < 0.5 ? -1 : 1) * (0.12 + (1 - power) * 0.22) * (0.6 + p.d.sho / 250);
    const th = clamp(0.5 * curve * dist / sp, -0.25, 0.25);
    const cc = Math.cos(-th), ss = Math.sin(-th); [dx, dz] = [dx * cc - dz * ss, dx * ss + dz * cc];
  }
  const e = rnd((0.02 + (1 - p.d.sho / 100) * 0.22 + power * 0.04) * (p.human ? 0.6 : dk(p).shot)), c = Math.cos(e), sn = Math.sin(e);
  [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c];
  p.fx = dx; p.fz = dz;
  kick(p, dx * sp, 1.2 + power * power * 7.5 + Math.random() * 1.5, dz * sp);
  ball.curve = curve;
}

// "braziliana" (rainbow flick): mingea e ridicata cu calcaiul pe la spate, peste cap, si cade in fata jucatorului
function rainbow(p) {
  const f = Math.max(Math.hypot(p.vx, p.vz), 4) + 1.4;
  kick(p, p.fx * f, 6.3, p.fz * f);
  ball.y = 0.35; ball.noPickT = 0.6; ball.passTarget = p; ball.trickT = 1.3;
  p.kickT = 0; p.trickT = 0.45;
  toast('Braziliana! 🌈', 1.2);
}

function startLunge(p) {
  if (p.lungeT > 0 || p.stunT > 0 || p.tackleCd > 0) return;
  p.lungeT = 0.32; p.lungeHit = false; p.tackleCd = 1.1;
}

// ---------- ajutoare AI ----------
function nearestOpp(p) {
  let best = null, bd = 1e9;
  for (const q of players) { if (q.team === p.team) continue; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = q; } }
  return { q: best, d: bd };
}
function laneClear(p, m) {
  const dx = m.x - p.x, dz = m.z - p.z, l2 = dx * dx + dz * dz || 1;
  for (const q of players) {
    if (q.team === p.team) continue;
    const t = clamp(((q.x - p.x) * dx + (q.z - p.z) * dz) / l2, 0, 1);
    if (Math.hypot(p.x + dx * t - q.x, p.z + dz * t - q.z) < 1.8) return false;
  }
  return true;
}
function bestPass(p, allowBack) {
  let best = null, bs = allowBack ? -1e9 : 0.6;
  for (const m of players) {
    if (m.team !== p.team || m === p || m.isGK) continue;
    const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < 5 || d > 42) continue;
    const prog = (m.x - p.x) * p.sign; if (prog < -15 && !allowBack) continue;
    if (ball.protectT <= 0 && m.x * p.sign > offLine[p.team] + 0.3 && Math.random() > 0.3) continue;      // e in ofsaid (dar uneori calculatorul nu observa)
    if (!laneClear(p, m)) continue;
    const sc = prog * 0.08 + Math.min(nearestOpp(m).d, 10) * 0.15 + Math.random() * 0.5 - (d > 30 ? 1 : 0);
    if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}
function humanPassTarget(p, dx, dz) {
  let best = null, bs = -1e9;
  for (const m of players) {
    if (m.team !== p.team || m === p) continue;
    const vx = m.x - p.x, vz = m.z - p.z, d = Math.hypot(vx, vz);
    if (d < 3 || d > 50 || (m.isGK && d > 25)) continue;
    const cos = (vx * dx + vz * dz) / d; if (cos < 0.5) continue;
    const sc = cos * 2 - d / 50;
    if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}

function formationTarget(p) {
  const s = p.sign, bx = ball.x * s, bz = ball.z * s;
  const has = ball.owner ? ball.owner.team === p.team : ball.lastTouch === p.team;
  let x;
  if (p.role === 'D') x = clamp(p.hx + (bx + HALF_L) * 0.45 + (has ? 4 : -2), -46, 5);
  else if (p.role === 'M') x = clamp(p.hx + bx * 0.6 + (has ? 8 : -4), -40, 38);
  else x = clamp(p.hx + bx * 0.6 + (has ? 12 : -2), -20, 46);
  // nu sta in ofsaid... de obicei: atacantii mai scapa din cand in cand cu un pas prea mult, ca in realitate
  if (p.role === 'A' && Math.random() < 0.004) p.greedy = Math.random() < 0.35 ? 3.5 : 0;
  if (p.role !== 'D' && has) x = Math.min(x, offLine[p.team] - 0.7 + (p.greedy || 0));
  const z = clamp(p.hz * (has ? 1 : 0.75) + bz * 0.25, -32, 32);
  return [x * s, z * s];
}

// ---------- AI ----------
function carrierAI(p, dt) {
  const s = p.sign, gx = HALF_L * s, dg = Math.hypot(gx - p.x, p.z);
  const opp = nearestOpp(p);
  if (ball.freeKick === p && ball.throwIn !== p && ball.cornerK !== p) {   // lovitura libera / penalty batut de calculator
    move(p, 0, 0, 0, dt);
    const gdx = gx - p.x, gdz = -p.z, gl = Math.hypot(gdx, gdz) || 1; face(p, gdx / gl, gdz / gl, Math.min(1, 6 * dt));
    if (game.fkT > 2) {
      const k = gkOf(1 - p.team);
      if (dg < 30) shoot(p, 0.55 + Math.random() * 0.35, (k.z > 0 ? -1 : 1) * (1.8 + Math.random() * 1.4));
      else {                                               // pasa scurta, sigura, la cel mai apropiat coleg liber
        let m = null, md = 1e9;
        for (const q of players) {
          if (q.team !== p.team || q === p || q.isGK) continue;
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          if (d > 4 && d < 28 && d < md && laneClear(p, q)) { md = d; m = q; }
        }
        doPass(p, m || bestPass(p, true), p.fx, p.fz);
      }
    }
    return;
  }
  if (ball.throwIn === p || ball.cornerK === p) {         // aut sau corner executat de calculator
    move(p, 0, 0, 0, dt); p.holdT -= dt;
    if (p.holdT <= 0) {
      if (ball.cornerK === p) {
        const tx = gx - s * (8 + Math.random() * 5), tz = rnd(5), d = Math.hypot(tx - p.x, tz - p.z), vy = 8.5, sp = d / (2 * vy / 9.81) * 0.97;
        p.fx = (tx - p.x) / d; p.fz = (tz - p.z) / d; kick(p, p.fx * sp, vy, p.fz * sp);
      } else doPass(p, bestPass(p, true), p.fx, p.fz);
    }
    return;
  }
  p.aiT -= dt;
  if (p.aiT <= 0) {
    p.aiT = 0.2 + Math.random() * 0.15;
    if ((dg < 23 && Math.abs(p.z) < 16) || (dg < 30 && Math.random() < 0.04)) {
      const k = gkOf(1 - p.team);
      shoot(p, 0.55 + Math.random() * 0.4, (k.z > 0 ? -1 : 1) * (2 + Math.random() * 1.1));
      return;
    }
    if (opp.d < 3.5 || Math.random() < 0.06) { const m = bestPass(p, false); if (m) { doPass(p, m); return; } }
  }
  let dx = gx - p.x, dz = -p.z * 0.5, l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  if (opp.d < 6) {
    const ox = opp.q.x - p.x, oz = opp.q.z - p.z;
    if (ox * dx + oz * dz > 0) { const px = -dz, pz = dx, side = Math.sign(px * ox + pz * oz) || 1; dx -= px * side * 0.9; dz -= pz * side * 0.9; }
  }
  if (Math.abs(p.z) > 30) dz -= Math.sign(p.z) * 0.8;
  l = Math.hypot(dx, dz) || 1;
  move(p, dx / l, dz / l, topSpeed(p, p.stamina > 0.3, dt), dt);
}

function gkAI(p, dt) {
  const s = p.sign, gx = -HALF_L * s;
  if (ball.owner === p) {
    move(p, 0, 0, 0, dt); face(p, s, 0, Math.min(1, 6 * dt));
    p.holdT -= dt;
    if (p.holdT <= 0) {
      const m = bestPass(p, true);
      if (m && Math.random() < 0.75) doPass(p, m);
      else { p.fx = s; p.fz = 0; kick(p, s * 25, 11, rnd(7)); }
    }
    return;
  }
  const bdx = ball.x - gx, bdz = ball.z, bd = Math.hypot(bdx, bdz) || 1;
  // sut spre poarta -> plonjon spre punctul in care mingea trece linia
  if (!ball.owner && ball.vx * -s > 6) {
    const t = (gx + s * 1.0 - ball.x) / ball.vx;
    if (t > 0 && t < 1.6) {
      const zc = ball.z + ball.vz * t;
      if (Math.abs(zc) < 5) {
        const tz = clamp(zc, -3.9, 3.9), dx = gx + s * 1.0 - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const sp = Math.min((5.2 + p.d.def * 0.024) * (0.75 + 0.25 * dk(p).gk), d / Math.max(dt, t * 0.5));
          p.vx = dx / d * sp; p.vz = dz / d * sp; p.x += p.vx * dt; p.z += p.vz * dt;
          if (Math.abs(dz) > 1.3 && p.diveT <= 0) { p.diveT = 0.6; p.diveDir = Math.sign(dz * p.fx - dx * p.fz) || 1; }
        } else { p.vx = p.vz = 0; }
        return;
      }
    }
  }
  // minge libera aproape de poarta -> iese la ea
  if (!ball.owner && bd < 13 && Math.hypot(ball.vx, ball.vz) < 9) {
    let nearest = true; const dme = Math.hypot(p.x - ball.x, p.z - ball.z);
    for (const q of players) if (q !== p && Math.hypot(q.x - ball.x, q.z - ball.z) < dme - 1) { nearest = false; break; }
    if (nearest) { goTo(p, ball.x, ball.z, true, dt); return; }
  }
  const out = clamp(bd * 0.11, 0.8, 5);
  goTo(p, gx + bdx / bd * out, clamp(bdz / bd * out, -3.3, 3.3), false, dt);
  face(p, bdx / bd, bdz / bd, Math.min(1, 8 * dt));
}

const chasers = [null, null];
function computeChasers() {
  for (let t = 0; t < 2; t++) {
    const s = squad[t][0].sign; let a = -1e9, b = -1e9;
    for (const q of players) { if (q.team === t) continue; const v = q.x * s; if (v > a) { b = a; a = v; } else if (v > b) b = v; }
    offLine[t] = Math.max(b, ball.x * s, 0);
    chasers[t] = null;
    if (ball.owner && (ball.owner.team === t || ball.owner.isGK)) continue;
    if (!ball.owner && ball.passTarget && ball.passTarget.team === t) { chasers[t] = ball.passTarget; continue; }
    let bd = 1e9;
    const px = ball.x + (ball.owner ? 0 : ball.vx * 0.4), pz = ball.z + (ball.owner ? 0 : ball.vz * 0.4);
    for (const p of players) {
      if (p.team !== t || p.isGK || p.stunT > 0) continue;
      const d = Math.hypot(p.x - px, p.z - pz); if (d < bd) { bd = d; chasers[t] = p; }
    }
  }
}

function chaseBall(p, dt) {
  const d = Math.hypot(p.x - ball.x, p.z - ball.z), t = ball.owner ? 0.15 : Math.min(1, d / 9);
  goTo(p, ball.x + ball.vx * t, ball.z + ball.vz * t, true, dt);
  return d;
}

function updateAI(p, dt) {
  if (ball.owner === p) return carrierAI(p, dt);
  if (chasers[p.team] === p) {
    const d = chaseBall(p, dt), o = ball.owner;
    if (o && o.team !== p.team && !o.isGK && d < 1.6 && ball.protectT <= 0 && p.tackleCd <= 0 && Math.random() < dt * 2.2 * dk(p).tackle) {
      face(p, (ball.x - p.x) / (d || 1), (ball.z - p.z) / (d || 1)); startLunge(p);
    }
    return;
  }
  let [tx, tz] = formationTarget(p);
  const has = ball.owner ? ball.owner.team === p.team : ball.lastTouch === p.team;
  if (!has && p.role !== 'A') {                          // marcaj: sta intre adversar si poarta proprie
    let mk = null, md = 10;
    for (const q of players) {
      if (q.team === p.team || q.isGK || q === ball.owner || q.x * p.sign > 5) continue;
      const d = Math.hypot(q.x - tx, q.z - tz); if (d < md) { md = d; mk = q; }
    }
    if (mk) { const dx = -HALF_L * p.sign - mk.x, dz = -mk.z, l = Math.hypot(dx, dz) || 1; tx = mk.x + dx / l * 2.2; tz = mk.z + dz / l * 2.2; }
  }
  goTo(p, tx, tz, Math.hypot(tx - p.x, tz - p.z) > 12, dt);
}

// ---------- jucator uman ----------
function updateHuman(h, dt) {
  const K = h.keys;
  if (ball.owner && ball.owner.team === h.team && !ball.owner.isGK) h.ctrl = ball.owner;
  const p = h.ctrl; p.human = h; h.passTo = null;
  let ix = (keys.has(K.right) ? 1 : 0) - (keys.has(K.left) ? 1 : 0), iz = (keys.has(K.down) ? 1 : 0) - (keys.has(K.up) ? 1 : 0);
  let sprint = keys.has(K.sprint);
  if ((h === humans[0] || h.remote) && stick.mag > 0.2) { ix = stick.x; iz = stick.z; }
  if (game.penView && game.state === 'play') { const s = game.penView.side; [ix, iz] = [-iz * s, ix * s]; }   // camera din spate: sus = spre poarta
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  const owns = ball.owner === p;
  if (p.stunT > 0 || p.lungeT > 0) { h.charging = false; h.charge = 0; return; }

  h.tapT = (h.tapT || 0) - dt;
  if (owns) {
    const trickKey = h === humans[0] || h.remote ? 'KeyE' : 'KeyU';      // butonul TRUC (tasta E / U) sau SPRINT de 2 ori = braziliana
    if (pressed.has(trickKey) && ball.throwIn !== p && ball.freeKick !== p) { if (il) face(p, ix, iz); rainbow(p); h.charging = false; h.charge = 0; return; }
    if (pressed.has(K.sprint) && ball.throwIn !== p && ball.freeKick !== p) {
      if (h.tapT > 0) { h.tapT = 0; if (il) face(p, ix, iz); rainbow(p); h.charging = false; h.charge = 0; return; }
      h.tapT = 0.5;                                       // ai o jumatate de secunda pentru a doua apasare
    }
    h.passTo = humanPassTarget(p, il ? ix : p.fx, il ? iz : p.fz);
    const thr = anyPressed(K.through);
    if (anyPressed(K.pass) || thr) {
      const dx = il ? ix : p.fx, dz = il ? iz : p.fz, m = humanPassTarget(p, dx, dz);
      doPass(p, m, dx, dz, thr); h.charging = false; h.charge = 0;
      if (m && !m.isGK) { h.ctrl.human = null; h.ctrl = m; m.human = h; }
      return;
    }
    if (anyPressed(K.shoot) && ball.throwIn !== p) h.charging = true;
    if (h.charging) {
      if (anyDown(K.shoot) && h.charge < 1) h.charge = Math.min(1, h.charge + dt / 0.9);
      if (anyReleased(K.shoot) || !anyDown(K.shoot) || h.charge >= 1) {
        if (il) face(p, ix, iz);
        shoot(p, Math.max(0.15, h.charge)); h.charging = false; h.charge = 0; return;
      }
    }
  } else {
    h.charging = false; h.charge = 0;
    h.swT -= dt;                                       // schimbare automata pe aparatorul cel mai apropiat de minge
    if (h.swT <= 0 && !(ball.owner && ball.owner.team === h.team) && ball.passTarget !== p) {
      h.swT = 0.5;
      let near = null, nd = Math.hypot(p.x - ball.x, p.z - ball.z) - 5;
      for (const q of players) {
        if (q.team !== h.team || q.isGK || q === p || q.stunT > 0) continue;
        const d = Math.hypot(q.x - ball.x, q.z - ball.z); if (d < nd) { nd = d; near = q; }
      }
      if (near) { p.human = null; h.ctrl = near; near.human = h; return; }
    }
    if (anyPressed(K.pass)) {                         // schimba jucatorul: cel mai apropiat de minge
      h.swT = 1.5;
      let best = null, bd = 1e9;
      for (const q of players) {
        if (q.team !== h.team || q.isGK || q === p) continue;
        const d = Math.hypot(q.x - ball.x, q.z - ball.z); if (d < bd) { bd = d; best = q; }
      }
      if (best) { p.human = null; h.ctrl = best; best.human = h; return; }
    }
    if (anyPressed(K.shoot)) { if (il) face(p, ix, iz); startLunge(p); return; }
  }
  const sp = topSpeed(p, sprint && il > 0, dt);
  if (il) { if (ball.throwIn === p || ball.freeKick === p) face(p, ix, iz, Math.min(1, 8 * dt)); move(p, ix, iz, sp, dt); }
  else if (!ball.owner && ball.passTarget === p) chaseBall(p, dt);   // ajutor la primirea pasei
  else move(p, 0, 0, 0, dt);
}

// ---------- minge ----------
function updateBall(dt) {
  ball.noPickT -= dt; ball.protectT -= dt; ball.trickT = (ball.trickT || 0) - dt;
  const px = ball.x;
  if (ball.owner && game.fkAim && game.fkAim.taker === ball.owner) {   // lovitura libera directa: mingea sta pe loc, executantul isi ia elan
    ball.vx = ball.vy = ball.vz = 0; ball.y = BALL_R; return px;
  }
  if (ball.owner) {
    const o = ball.owner, hold = o.isGK, thr = ball.throwIn === o;
    // mingea e condusa din atingeri: se departeaza putin de picior la fiecare pas
    const k = thr ? 0 : hold ? 0.35 : 0.5 + 0.32 * Math.abs(Math.sin(o.phase)) * Math.min(1, Math.hypot(o.vx, o.vz) / 5);
    ball.x = o.x + o.fx * k; ball.z = o.z + o.fz * k;
    if (hold) ball.x = clamp(ball.x, -HALF_L + 0.25, HALF_L - 0.25);   // portarul cu mingea in brate nu intra cu ea in poarta
    ball.y = thr ? 2.05 : hold ? 1.05 : BALL_R; ball.vx = o.vx; ball.vz = o.vz; ball.vy = 0;
    if (thr) ball.protectT = Math.max(ball.protectT, 0.3); else if (ball.protectT <= 0) ball.cornerK = null;
    spinBall(dt);
    return px;
  }
  ball.vy -= 9.81 * dt;
  const hs = Math.hypot(ball.vx, ball.vz);
  if (ball.curve && hs > 3) {                            // efect: mingea se curbeaza in aer (efectul Magnus)
    const ax = -ball.vz * ball.curve, az = ball.vx * ball.curve;
    ball.vx += ax * dt; ball.vz += az * dt;
    ball.curve *= ball.y <= BALL_R + 0.01 ? 1 - 3 * dt : 1 - 0.4 * dt;
  }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
  const sp = Math.hypot(ball.vx, ball.vz);
  if (ball.y <= BALL_R) {
    ball.y = BALL_R;
    if (ball.vy < -1.5) { ball.vy = -ball.vy * 0.55; ball.vx *= 0.82; ball.vz *= 0.82; }
    else {
      ball.vy = 0;
      if (sp > 0) { const k = Math.max(0, sp - (2.5 + 0.2 * sp) * dt) / sp; ball.vx *= k; ball.vz *= k; }
    }
  } else { const k = 1 - 0.12 * dt; ball.vx *= k; ball.vz *= k; }
  spinBall(dt);
  return px;
}
const spinAxis = new THREE.Vector3();
function spinBall(dt) {
  const sp = Math.hypot(ball.vx, ball.vz);
  if (sp > 0.05) { spinAxis.set(ball.vz / sp, 0, -ball.vx / sp); ballGfx.mesh.rotateOnWorldAxis(spinAxis, sp * dt / 0.16); }
}

function inOwnBox(p) { return p.x * p.sign < -HALF_L + 16.5 && Math.abs(p.z) < 20.16; }

function pickups() {
  if (ball.owner || Math.abs(ball.x) > HALF_L || Math.abs(ball.z) > HALF_W) return;   // mingea iesita din teren nu mai poate fi jucata
  let best = null, bd = 1e9;
  for (const p of players) {
    if (p.stunT > 0 && p.lungeT <= 0) continue;
    if (ball.noPick === p && ball.noPickT > 0) continue;
    const hands = p.isGK && inOwnBox(p);
    // cat de departe ajunge un jucator la minge (picior intins): mai mare = pasele sunt oprite/interceptate mai usor
    const reach = hands ? (p.diveT > 0 ? 1.9 : 1.4) : p.lungeT > 0 ? 1.5 : 1.15;
    const d = Math.hypot(p.x - ball.x, p.z - ball.z);
    if (d < reach && ball.y < (hands ? 2.6 : 1.4) && d < bd) { bd = d; best = p; }
  }
  if (!best) {                                           // minge inalta -> lovitura de cap
    if (ball.y >= 1.4 && ball.y < 2.5 && ball.vy < 2 && !(ball.trickT > 0)) {   // la braziliana nimeni nu da cu capul
      let hp = null, hd = 1.0;
      for (const p of players) {
        if (p.isGK || p.stunT > 0 || (ball.noPick === p && ball.noPickT > 0)) continue;
        const d = Math.hypot(p.x - ball.x, p.z - ball.z); if (d < hd) { hd = d; hp = p; }
      }
      if (hp) header(hp);
    }
    return;
  }
  const p = best, rel = Math.hypot(ball.vx - p.vx, ball.vz - p.vz);
  if (p.isGK && inOwnBox(p)) {
    const gs = dk(p).gk;
    if (rel < 12 || Math.random() < (0.16 + p.d.def * 0.002) * gs) { setOwner(p); return; }
    if (Math.random() < p.d.def * 0.0058 * gs) {         // respinge
      ball.vx = -ball.vx * 0.35 + rnd(2); ball.vz = ball.vz * 0.5 + rnd(7); ball.vy = 2 + Math.random() * 3;
      ball.lastTouch = p.team; sfx.kick(0.3); toast('Ce paradă!');          // golul ramane al celui care a sutat
    }
    ball.noPick = p; ball.noPickT = 0.6; ball.offside = null; sfx.ooh();
    return;
  }
  if (rel > 13 + p.d.dri * 0.12 && ball.passTarget !== p) {   // minge prea tare: ricoseaza
    ball.vx = -ball.vx * 0.25 + rnd(2); ball.vz = ball.vz * 0.4 + rnd(3); ball.vy = Math.abs(ball.vy) * 0.3 + 1;
    ball.lastTouch = p.team; ball.lastPlayer = p; ball.noPick = p; ball.noPickT = 0.4; ball.passTarget = null; ball.offside = null; sfx.kick(0.3);
    return;
  }
  setOwner(p);
}

function checkBounds(prevX) {
  if (Math.abs(ball.x) > HALF_L) {
    const side = Math.sign(ball.x), az = Math.abs(ball.z);
    if (az < GOAL_W && ball.y < GOAL_H) return goal(attackingTeam(side));
    if (!ball.owner && Math.abs(prevX) <= HALF_L && az < GOAL_W + 0.25 && ball.y < GOAL_H + 0.25) {   // bara!
      ball.x = side * (HALF_L - 0.1); ball.vx *= -0.6; ball.vz += rnd(2); sfx.post(); sfx.ooh(); toast('Bară!'); return;
    }
    const def = 1 - attackingTeam(side), zs = Math.sign(ball.z) || 1;
    if (ball.lastTouch === def) { restart(1 - def, side * (HALF_L - 0.5), zs * (HALF_W - 0.5), 'Corner'); ball.cornerK = ball.owner; }
    else restart(def, side * (HALF_L - 6), 0, 'Lovitură de poartă', true);
  } else if (Math.abs(ball.z) > HALF_W) {
    restart(1 - ball.lastTouch, clamp(ball.x, -HALF_L + 1, HALF_L - 1), Math.sign(ball.z) * (HALF_W - 0.4), 'Aut'); ball.throwIn = ball.owner;
  }
}

// ---------- simulare ----------
function step(dt) {
  for (const p of players) {
    p.human = null;
    p.kickT -= dt; p.tackleCd -= dt; p.diveT -= dt; p.jumpT -= dt; p.trickT = (p.trickT || 0) - dt;
    if (p.stunT > 0) p.stunT -= dt;
  }
  computeChasers();
  const fk = ball.freeKick && ball.owner === ball.freeKick ? ball.freeKick : null;   // la lovitura libera toti asteapta
  if (fk) game.fkT += dt; else ball.freeKick = null;
  if (game.penView && !fk) { if (game.penView.t > 50) game.penView.t = 2.2; game.penView.t -= dt; if (game.penView.t <= 0) game.penView = null; }   // dupa sut, camera revine
  if (game.fkAim && fk !== game.fkAim.taker) { game.fkAim = null; fkDots.visible = false; }
  for (const h of humans) {
    if (fk && h.team !== fk.team) continue;
    useInput(inputOf(h));
    if (game.fkAim && h.team === game.fkAim.taker.team) fkAimStep(h, dt); else updateHuman(h, dt);
    useInput(LOCAL);
  }
  for (const p of players) {
    if (p.lungeT > 0) {                                // alunecare / deposedare
      p.lungeT -= dt; p.vx = p.fx * 9; p.vz = p.fz * 9; p.x += p.vx * dt; p.z += p.vz * dt;
      const o = ball.owner;
      if (!p.lungeHit && o && o.team !== p.team && !o.isGK && ball.protectT <= 0 && Math.hypot(p.x - ball.x, p.z - ball.z) < 1.15) {
        p.lungeHit = true;
        const behind = p.fx * o.fx + p.fz * o.fz > 0.5;    // atac din spate: mai greu si mai periculos
        if (Math.random() < clamp(0.55 + (p.d.def - o.d.dri) / 150, 0.3, 0.85) - (behind ? 0.2 : 0)) { setOwner(p); o.stunT = 0.5; p.lungeT = 0; }
        else { p.stunT = 0.7; if (Math.random() < (behind ? 0.14 : 0.016)) { p.lungeT = 0; foul(p, o, behind); return; } }   // faulturi: din cand in cand, nu foarte des
      }
      if (p.lungeT <= 0 && ball.owner !== p) p.stunT = Math.max(p.stunT, 0.3);
      continue;
    }
    if (p.stunT > 0) { move(p, 0, 0, 0, dt); continue; }
    if (fk && p !== fk) { move(p, 0, 0, 0, dt); if (!p.human) { const bx = ball.x - p.x, bz = ball.z - p.z, bl = Math.hypot(bx, bz) || 1; face(p, bx / bl, bz / bl, Math.min(1, 5 * dt)); } continue; }
    if (p.human) continue;
    if (p.isGK) gkAI(p, dt); else updateAI(p, dt);
  }
  // jucatorii nu trec unii prin altii
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const a = players[i], b = players[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 0.6 && d > 0.001) { const k = (0.6 - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
  }
  const prevX = updateBall(dt);
  if (ball.owner) stats.own[ball.owner.team]++;
  pickups();
  checkBounds(prevX);

  game.time += dt;
  if (game.drill) drillWatch(dt);
  if (game.state === 'play' && !game.drill && game.time >= periodLen()) {
    const [a, b] = game.score, sc = a + ' - ' + b, draw = a === b;
    const brk = (text, next) => { game.state = 'break'; game.timer = 5; game.next = next || null; showMsg(text, 5); };
    if (game.half === 1) { sfx.whistle(2); brk('Pauză  ' + sc + '\n' + statLine() + '\nEchipele schimbă terenul'); }
    else if (game.half === 2 && draw) { sfx.whistle(2); brk('Egal după 90 de minute: ' + sc + '\nUrmează PRELUNGIRILE\n2 reprize a câte 15 minute'); }
    else if (game.half === 3) { sfx.whistle(2); brk('Pauză în prelungiri  ' + sc + '\nEchipele schimbă terenul'); }
    else if (game.half === 4 && draw) { sfx.whistle(3); brk('Egal și după prelungiri: ' + sc + '\nUrmează LOVITURILE DE LA 11 METRI!', 'shootout'); }
    else { sfx.whistle(3); endMatch(); }
  }
}

function endMatch() {
  game.state = 'end'; endAt = performance.now();
  TGT.forEach((m) => { m.visible = false; });
  const [a, b] = game.score, pens = game.pens;
  let w = a === b ? 'Egal' : 'Câștigă ' + TEAMS[a > b ? 0 : 1].name;
  if (pens) w = 'Câștigă ' + TEAMS[pens[0] > pens[1] ? 0 : 1].name + ' la penalty-uri (' + pens[0] + ' - ' + pens[1] + ')';
  const extra = game.half > 2 ? ' (după prelungiri)' : '';
  showMsg('Final: ' + a + ' - ' + b + extra + '\n' + w + '\n' + statLine() + (isTouch ? '\nAtinge ecranul = meniu' : '\nEnter = meniu'), 1e9);
}

// ---------- lovituri de la 11 metri (dupa prelungiri) ----------
// Toate se bat la poarta din dreapta (x = +HALF_L). Echipele bat pe rand, cate 5; daca e tot egal, continua una-una.
const SO = { kicks: [[], []], turn: 0, order: [[], []], idx: [0, 0], taker: null, keeper: null, phase: 'set', t: 0, diveZ: 0, saved: false, aim: 0 };
function startShootout() {
  game.state = 'shootout'; game.pens = [0, 0]; updateScore();
  SO.kicks = [[], []]; SO.turn = game.drill ? myTeam : 0; SO.idx = [0, 0];
  for (let t = 0; t < 2; t++) SO.order[t] = players.filter((p) => p.team === t && !p.isGK).sort((x, y) => y.d.sho - x.d.sho);
  ball.offside = ball.throwIn = ball.cornerK = ball.passTarget = null;
  for (const p of players) { p.vx = p.vz = 0; p.stunT = p.lungeT = p.kickT = p.diveT = p.jumpT = 0; }
  TGT.forEach((m) => { m.visible = false; });
  nextPenalty();
}
function nextPenalty() {
  const t = SO.turn, list = SO.order[t];
  const p = list[SO.idx[t] % list.length]; SO.idx[t]++;
  const k = gkOf(1 - t);
  SO.taker = p; SO.keeper = k; SO.phase = 'set'; SO.t = 0; SO.saved = false; SO.aim = 0;
  let i = 0;
  for (const q of players) {                             // ceilalti asteapta in cercul de la centru
    if (q === p || q === k) continue;
    const a = (i++ / (players.length - 2)) * Math.PI - Math.PI / 2;
    q.x = 2 + Math.cos(a) * 6 * (q.team ? 1 : 0.6); q.z = Math.sin(a) * 7; q.vx = q.vz = 0; q.fx = 1; q.fz = 0; q.diveT = 0;
  }
  p.sign = 1; k.sign = -1;
  p.x = HALF_L - 12; p.z = 0; p.fx = 1; p.fz = 0; p.vx = p.vz = 0;
  k.x = HALF_L - 0.5; k.z = 0; k.fx = -1; k.fz = 0; k.vx = k.vz = 0; k.diveT = 0;
  ball.owner = null; ball.x = HALF_L - 11; ball.z = 0; ball.y = BALL_R; ball.vx = ball.vy = ball.vz = 0;
  ball.lastPlayer = p; ball.lastTouch = p.team;
  for (const h of humans) { h.ctrl = h.team === p.team ? p : k; h.charge = 0; h.charging = false; }
  const me = humans.find((h) => h.team === p.team), meK = humans.find((h) => h.team === k.team);
  if (me) toast('Țintește ' + (isTouch ? 'cu joystick-ul' : 'cu stânga/dreapta') + ', ține ȘUT și dă drumul', 4);
  else if (meK) toast('Ești portar: ține ' + (isTouch ? 'joystick-ul' : 'stânga sau dreapta') + ' ca să plonjezi', 4);
  sfx.whistle();
}
function soInput(h) {                                    // -1 sus, 1 jos, 0 la mijloc
  // camera e in spatele jucatorului: stanga/dreapta pe ecran = stanga/dreapta portii (z)
  const K = h.keys, I = inputOf(h);
  let iz = (I.keys.has(K.right) ? 1 : 0) - (I.keys.has(K.left) ? 1 : 0);
  if ((h === humans[0] || h.remote) && I.stick.mag > 0.3) iz = Math.abs(I.stick.x) > 0.35 ? Math.sign(I.stick.x) : 0;
  return iz;
}
function soDecided() {
  const g = SO.kicks.map((k) => k.filter(Boolean).length), n = SO.kicks.map((k) => k.length);
  if (n[0] <= 5 && n[1] <= 5) {
    if (g[0] + (5 - n[0]) < g[1]) return 1;
    if (g[1] + (5 - n[1]) < g[0]) return 0;
    return -1;
  }
  if (n[0] === n[1] && g[0] !== g[1]) return g[0] > g[1] ? 0 : 1;
  return -1;
}
function soResult(scored, text) {
  SO.phase = 'result'; SO.t = 0;
  SO.kicks[SO.taker.team].push(scored);
  if (scored) { game.pens[SO.taker.team]++; sfx.goal(); goalFx(1, ball.z, ball.y, Math.hypot(ball.vx, ball.vz), TEAMS[SO.taker.team].color); } else sfx.ooh();
  updateScore();
  const row = (t) => TEAMS[t].short + '  ' + SO.kicks[t].map((x) => (x ? '⚽' : '❌')).join(' ');
  showMsg(text + '\n' + row(0) + '\n' + row(1), 2.2);
}
function shootoutStep(dt) {
  SO.t += dt;
  const p = SO.taker, k = SO.keeper;
  for (const q of players) { q.kickT -= dt; q.diveT -= dt; if (q !== p && q !== k) { q.vx = q.vz = 0; } }
  if (SO.phase === 'set') {
    k.z = Math.sin(SO.t * 2.2) * 0.35;                  // portarul se misca pe linie
    const h = humans.find((x) => x.team === p.team);
    if (SO.t < 1.2) return;
    let power = -1;
    if (h) {
      p.human = h; const iz = soInput(h);
      SO.aim += (iz * 3.3 - SO.aim) * Math.min(1, 6 * dt);
      p.fz = SO.aim / 11; p.fx = 1;
      useInput(inputOf(h));
      if (anyPressed(h.keys.shoot)) h.charging = true;
      if (h.charging) {
        if (anyDown(h.keys.shoot)) h.charge = Math.min(1, h.charge + dt / 0.9);
        if (anyReleased(h.keys.shoot) || !anyDown(h.keys.shoot) || h.charge >= 1) { power = Math.max(0.2, h.charge); h.charging = false; h.charge = 0; }
      }
      useInput(LOCAL);
    } else if (SO.t > 2.2) {
      power = 0.45 + Math.random() * 0.35;
      SO.aim = Math.random() < 0.15 ? rnd(0.6) : (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 1.6);
    }
    if (power < 0) return;
    p.x = ball.x - 0.7;
    shoot(p, power, SO.aim); stats.shots[p.team]--;
    // portarul alege unde plonjeaza
    const t = (HALF_L - 0.5 - ball.x) / (ball.vx || 1), zc = ball.z + ball.vz * t;
    const hk = humans.find((x) => x.team === k.team);
    if (hk) SO.diveZ = soInput(hk) * 2.8;
    else SO.diveZ = Math.random() < 0.38 * dk(k).gk ? clamp(zc, -3.2, 3.2) : [-2.8, 0, 2.8][Math.floor(Math.random() * 3)];
    SO.phase = 'flight'; SO.t = 0;
    return;
  }
  if (SO.phase === 'flight') {
    if (SO.t > 0.08) {                                   // plonjonul
      const dz = SO.diveZ - k.z;
      if (Math.abs(dz) > 0.05) { k.z += Math.sign(dz) * Math.min(Math.abs(dz), 7.5 * dt); if (k.diveT <= 0 && Math.abs(SO.diveZ) > 1) { k.diveT = 0.7; k.diveDir = Math.sign(SO.diveZ * k.fx) || 1; } }
    }
    const prevX = ball.x;
    updateBall(dt);
    if (!SO.saved && Math.abs(ball.x - k.x) < 0.6 && Math.abs(ball.z - k.z) < (k.diveT > 0 ? 1.5 : 0.9) && ball.y < 2.3) {
      SO.saved = true;
      ball.vx = -Math.abs(ball.vx) * 0.3; ball.vz = rnd(6); ball.vy = 2 + Math.random() * 2;
      sfx.kick(0.3); return soResult(false, 'APĂRAT! ' + k.d.name);
    }
    if (!SO.saved && ball.x > HALF_L) {
      const az = Math.abs(ball.z);
      if (az < GOAL_W && ball.y < GOAL_H) return soResult(true, 'GOL! ' + p.d.name);
      if (prevX <= HALF_L && az < GOAL_W + 0.25 && ball.y < GOAL_H + 0.25) { ball.vx *= -0.5; sfx.post(); return soResult(false, 'BARĂ! ' + p.d.name); }
      return soResult(false, (ball.y >= GOAL_H ? 'Peste poartă! ' : 'Pe lângă! ') + p.d.name);
    }
    if (SO.t > 3) return soResult(false, 'Ratat! ' + p.d.name);
    return;
  }
  // rezultat: mingea se opreste in plasa, apoi urmeaza urmatorul
  updateBall(dt);
  if (ball.x > HALF_L) { const kk = 1 - Math.min(1, 5 * dt); ball.vx *= kk; ball.vz *= kk; ball.y = Math.min(ball.y, GOAL_H - 0.2); ball.x = Math.min(ball.x, HALF_L + netDepthAt(ball.y) - 0.2); ball.z = clamp(ball.z, -GOAL_W + 0.2, GOAL_W - 0.2); }
  if (SO.t > 2.4) {
    if (game.drill) { const d = game.drill; d.n++; d.score = game.pens[myTeam]; if (d.n >= d.total) endDrill(); else nextPenalty(); return; }
    const w = soDecided();
    if (w >= 0) { confetti(HALF_L - 10, 0); sfx.goal(); endMatch(); return; }
    SO.turn = 1 - SO.turn; nextPenalty();
  }
}

function idleStep(dt) {                                 // dupa gol / la pauza: mingea se opreste in plasa
  const sc = game.state === 'goal' ? game.scorer : null;
  for (const p of players) {
    p.kickT -= dt; p.lungeT = 0; p.stunT = 0;
    if (sc === p) goTo(p, p.sign * (HALF_L - 7), (Math.sign(p.z) || 1) * (HALF_W - 6), true, dt);          // bucuria dupa gol
    else if (sc && p.team === sc.team && !p.isGK && Math.hypot(p.x - sc.x, p.z - sc.z) > 2.5) goTo(p, sc.x, sc.z, true, dt);
    else move(p, 0, 0, 0, dt);
  }
  if (ball.owner) return;
  updateBall(dt);
  if (Math.abs(ball.x) > HALF_L) {
    const k = 1 - Math.min(1, 5 * dt); ball.vx *= k; ball.vz *= k;
    ball.y = Math.min(ball.y, GOAL_H - 0.2); ball.z = clamp(ball.z, -GOAL_W + 0.2, GOAL_W - 0.2);
    const mx = HALF_L + netDepthAt(ball.y) - 0.2; ball.x = clamp(ball.x, -mx, mx);   // mingea ramane in plasa (poarta e mai putin adanca sus)
  }
}

// ---------- desenare ----------
function syncGfx(dt) {
  for (const p of players) {
    p.group.position.set(p.x, 0, p.z);
    // intoarcere lina + aplecare in curba (ca un om care schimba directia din fuga)
    const ang = Math.atan2(p.fx, p.fz);
    let dAng = ang - (p.lastAng ?? ang); dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng)); p.lastAng = ang;
    p.turn = (p.turn || 0) + ((dt > 0 ? dAng / dt : 0) - (p.turn || 0)) * Math.min(1, 8 * dt);
    p.group.rotation.y = ang;
    const sp = Math.hypot(p.vx, p.vz), run = Math.min(1, sp / 7);
    // pasi in ritmul real al alergarii (~1.5 pasi duble pe secunda), nu proportionali cu viteza
    if (sp > 0.25) p.phase += dt * (5 + sp * 0.8);
    // ciclul de alergare al unui om (unghi pozitiv = piciorul/bratul in spate, negativ = in fata):
    //  - coapsa urca mult in fata (genunchi sus) si merge mai putin in spate
    //  - cand piciorul revine din spate spre fata, genunchiul se indoaie mult (calcaiul urca spre fund)
    //  - cand piciorul e pe pamant, genunchiul e aproape drept
    const mv = sp > 0.25 ? 1 : 0;
    const thigh = (s) => (s > 0 ? s * (0.25 + 0.4 * run) : s * (0.3 + 0.75 * run)) * mv;
    const knee = (ph) => 0.12 + Math.max(0, Math.sin(ph - Math.PI / 4)) * (0.5 + 1.6 * run) * mv;
    const s1 = Math.sin(p.phase), s2 = -s1;
    p.legL.rotation.x = thigh(s1); p.legR.rotation.x = thigh(s2);
    p.kneeL.rotation.x = knee(p.phase); p.kneeR.rotation.x = knee(p.phase + Math.PI);
    // bratele: invers fata de picioare, cot indoit ~90 de grade, mana vine in fata pana la piept
    const t = performance.now() / 1000, breathe = Math.sin(t * 2.2 + p.phase) * 0.03 * (1 - run);
    // s = piciorul de pe aceeasi parte: cand piciorul e in spate, bratul e in fata (si invers)
    const arm = (s) => (s > 0 ? -s * (0.2 + 0.7 * run) : -s * (0.15 + 0.45 * run)) * mv;
    p.armL.rotation.x = arm(s1) + breathe; p.armR.rotation.x = arm(s2) + breathe;
    p.armL.rotation.z = -0.1 - 0.05 * run; p.armR.rotation.z = 0.1 + 0.05 * run;
    const elb = -0.3 - 1.15 * run * mv;
    p.elbowL.rotation.x = elb - Math.max(0, s1) * 0.25 * run; p.elbowR.rotation.x = elb - Math.max(0, s2) * 0.25 * run;
    // corpul: aplecat in fata cand fuge, aplecat in curbe, sare usor la fiecare pas (de doua ori pe ciclu), respira cand sta
    let rx = 0.03 + run * 0.22, rz = clamp(-p.turn * 0.06 * run, -0.3, 0.3);
    let y = (Math.abs(s1) * 0.07 - 0.02) * run + breathe * 0.2;   // sus cand picioarele sunt departate (in zbor), jos cand se incruciseaza
    p.body.rotation.y = -s1 * 0.08 * run;                 // umerii se rasucesc invers fata de solduri
    if (p.kickT > 0) {                                   // sut: piciorul merge mult in fata, bratele se deschid pentru echilibru
      const kt = 1 - p.kickT / 0.35;
      p.legR.rotation.x = -1.6 * Math.sin(Math.PI * (0.3 + 0.7 * kt)); p.kneeR.rotation.x = kt < 0.15 ? 0.6 : 0.05;
      p.legL.rotation.x = 0.15; p.kneeL.rotation.x = 0.25;
      p.armL.rotation.z = -0.9; p.armR.rotation.z = 0.6; p.armL.rotation.x = -0.4; rx = -0.22;
    }
    if (p.trickT > 0) {                                  // braziliana: calcaiul urca pe la spate si arunca mingea peste cap
      const tt = Math.sin(Math.PI * (1 - p.trickT / 0.45));
      p.legR.rotation.x = 0.55 * tt; p.kneeR.rotation.x = 0.2 + 2.2 * tt; p.legL.rotation.x = -0.1; p.kneeL.rotation.x = 0.3;
      p.armL.rotation.z = -0.7; p.armR.rotation.z = 0.7; rx = 0.25; y += 0.08 * tt;
    }
    if (p.lungeT > 0) { rx = -1.2; y = 0.12; p.legL.rotation.x = -0.2; p.legR.rotation.x = -0.5; p.kneeL.rotation.x = 0.9; p.kneeR.rotation.x = 0; }
    else if (p.stunT > 0) { rx = -0.5; }
    if (p.isGK) {
      if (p.diveT > 0) { rz = -p.diveDir * 1.15 * Math.min(1, p.diveT / 0.25); p.armL.rotation.z = -2.6; p.armR.rotation.z = 2.6; y = 0.25; }
      else if (ball.owner === p) { p.armL.rotation.x = p.armR.rotation.x = -1.3; }
    }
    if ((game.state === 'goal' && p === game.scorer) || ball.throwIn === p) { p.armL.rotation.z = -2.7; p.armR.rotation.z = 2.7; p.armL.rotation.x = p.armR.rotation.x = 0; }
    if (p.jumpT > 0) y += Math.sin(Math.PI * (1 - p.jumpT / 0.4)) * 0.45;
    p.body.rotation.x += (rx - p.body.rotation.x) * Math.min(1, 14 * dt);
    p.body.rotation.z += (rz - p.body.rotation.z) * Math.min(1, 14 * dt);
    p.body.position.y = y;
    if (p.man && useMan) {                               // manechinul: miscari filmate + aplecari pentru alunecare, plonjon, sarituri
      animateMannequin(p.man, sp, dt);
      const r = p.man.root, special = p.lungeT > 0 || p.stunT > 0 || (p.isGK && p.diveT > 0);
      r.rotation.x = special ? p.body.rotation.x : 0; r.rotation.z = p.body.rotation.z;
      r.position.y = p.jumpT > 0 || special || p.trickT > 0 ? p.body.position.y : 0;
      const b = p.man.bones;
      if (p.kickT > 0 && b.rUpLeg) {                     // sut: piciorul drept merge in fata peste animatie
        const kt = 1 - p.kickT / 0.35, k = Math.sin(Math.PI * (0.3 + 0.7 * kt));
        b.rUpLeg.rotation.x -= 1.4 * k; if (b.rLeg) b.rLeg.rotation.x += kt < 0.15 ? 0.6 : 0.05;
      }
      if (p.trickT > 0 && b.rLeg) { const tt = Math.sin(Math.PI * (1 - p.trickT / 0.45)); b.rLeg.rotation.x += 2.0 * tt; if (b.rUpLeg) b.rUpLeg.rotation.x += 0.5 * tt; }
      if (((game.state === 'goal' && p === game.scorer) || ball.throwIn === p || (p.isGK && p.diveT > 0)) && b.lArm && b.rArm) { b.lArm.rotation.z -= 1.2; b.rArm.rotation.z += 1.2; }
      afterPose(p.man);
    }
  }
  ballGfx.mesh.position.set(ball.x, ball.y + 0.05, ball.z);
  ballGfx.shadow.position.set(ball.x, 0.025, ball.z);
  const sc = 1 / (1 + ball.y * 0.25); ballGfx.shadow.scale.setScalar(sc); ballGfx.shadow.material.opacity = 0.42 * sc;
  for (const h of humans) {
    const p = h.ctrl;
    h.marker.ring.position.set(p.x, 0.04, p.z);
    h.marker.sprite.position.set(p.x, 2.9, p.z);
    h.marker.setText(p.d.name);
    const pt = ball.owner === p && game.state === 'play' ? h.passTo : null;
    h.tgt.visible = !!pt; if (pt) h.tgt.position.set(pt.x, 0.035, pt.z);
  }
  if (dt > 0) { hist.unshift([ball.x, ball.y, ball.z]); if (hist.length > 13) hist.pop(); }
  const fast = !ball.owner && game.state !== 'replay' && Math.hypot(ball.vx, ball.vz) > 17;
  trail.forEach((m, i) => { const h = hist[(i + 1) * 2]; m.visible = fast && !!h; if (m.visible) m.position.set(h[0], h[1] + 0.05, h[2]); });
  updateConfetti(dt);
  if (offT > 0) { offT -= dt; offMesh.material.opacity = Math.min(0.9, offT); if (offT <= 0) offMesh.visible = false; }
  world.update(dt, performance.now() / 1000, game.state === 'goal');      // public, steaguri, fumigene, plasa portii
  for (const t of world.ledTex) t.offset.x = (t.offset.x + dt * 0.03) % 1;   // reclamele de pe panouri curg
  const k = Math.min(1, (camTV ? 5 : 3.5) * dt), celeb = game.state === 'goal' && game.scorer;
  const so = game.state === 'shootout' || (game.state === 'end' && game.pens);
  // camera TV e mai aproape, deci trebuie sa urmareasca mingea si spre margini si spre porti
  const xl = camTV ? 46 : 36, follow = camTV ? 1 : 0.6;
  const fa = game.fkAim;                                  // la lovitura libera camera arata si mingea si poarta
  const tx = celeb ? clamp(celeb.x, -44, 44) : so ? HALF_L - 6 : fa ? clamp((ball.x + fa.gx) / 2, -46, 46) : clamp(ball.x, -xl, xl), tz = celeb ? celeb.z : so ? 0 : fa ? ball.z / 2 : ball.z;
  cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
  cam.lz += ((celeb ? tz : tz * follow) - cam.lz) * k;
  cam.zoom += ((celeb ? 0.55 : fa ? (camTV ? 1.35 : 0.85) : so ? 0.45 : game.state === 'replay' ? 0.6 : 1) - cam.zoom) * Math.min(1, 2 * dt);
  const [ch, cd] = camTV ? [13, 27] : [25, 45];          // TV: ca la televizor, mai jos si mai aproape
  camera.position.set(cam.x, ch * CZ * cam.zoom, cam.lz + (cd * CZ - cam.z * 0.15) * cam.zoom);
  camera.lookAt(cam.x, celeb ? 1 : 0, cam.lz);
  const pv = game.state === 'shootout' ? { side: 1 } : (game.penView && game.state === 'play' ? game.penView : null);
  if (pv) { camera.position.set(pv.side * (HALF_L - 20.5), 3.3, 0); camera.lookAt(pv.side * HALF_L, 1.0, 0); }   // penalty: vezi din spatele jucatorului, poarta in fata
  if (!!pv !== radarHidden) { radarHidden = !!pv; $('radar').classList.toggle('hidden', radarHidden); }        // radarul ar acoperi mingea
  else if (game.drill && game.drill.type === 'sprint') { const q = game.drill.p; camera.position.set(q.x - 2, 9 * CZ, q.z + 20 * CZ); camera.lookAt(q.x + 4, 0.8, q.z); }
  if (camShot === 'goal') { camera.position.set(HALF_L - 9, 3.2, 7); camera.lookAt(HALF_L, 1.1, 0); }   // test: poza cu poarta
  else if (closeup) { const q = squad[0][closeup]; camera.position.set(q.x + q.fx * 2.6 + 0.6, 1.9, q.z + q.fz * 2.6 + 0.6); camera.lookAt(q.x, 1.4, q.z); }   // test: vezi un jucator de aproape
  world.sun.position.set(cam.x - 40, 80, 50); world.sun.target.position.set(cam.x, 0, 0);
}

// ---------- antrenamente inainte de meci: sprint, lovituri libere, penalty-uri ----------
const TRAIN_BEST = { sprint: null, fk: null, pen: null };
try { Object.assign(TRAIN_BEST, JSON.parse(localStorage.getItem('fotbal_train') || '{}')); } catch (_) {}
const saveBest = () => { try { localStorage.setItem('fotbal_train', JSON.stringify(TRAIN_BEST)); } catch (_) {} };
const sprintLines = [-1, 1].map((s) => {                 // linia verde de start si linia rosie de sosire
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: s < 0 ? 0x4cd964 : 0xff4a3a, transparent: true, opacity: 0.9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(s * 30, 0.045, 0); m.visible = false; scene.add(m); return m;
});
function openTrain(result) {
  drillCleanup();
  game.state = 'menu';
  players.length = 0; players.push(...allPlayers); allPlayers.forEach((p) => { p.group.visible = true; });
  $('menu').classList.add('hidden'); $('touch').classList.add('hidden'); $('pauseBtn').classList.add('hidden'); $('teamBtn').classList.add('hidden');
  $('p1').classList.add('hidden'); MARKERS.forEach((m) => m.setVisible(false));
  const b = TRAIN_BEST;
  $('trBest').innerHTML = 'Recorduri: 🏃 ' + (b.sprint ? b.sprint.toFixed(2) + ' s' : '–') + ' · 🎯 ' + (b.fk ?? '–') + '/5 · ⚽ ' + (b.pen ?? '–') + '/5';
  $('trResult').textContent = result || '';
  $('trainPanel').classList.remove('hidden');
}
function drillCleanup() {
  if (!game.drill && !sprintLines[0].visible) return;
  game.drill = null; game.fkAim = null; game.penView = null; fkDots.visible = false;
  sprintLines.forEach((m) => { m.visible = false; });
}
function drillSetup(list) {                               // pe teren raman doar jucatorii din exercitiu
  game.mode = 1; game.paused = false; game.score = [0, 0]; game.pens = null; game.half = 1; game.time = 0; game.added = 0; game.freeze = 0; updateScore();
  humans.length = 0;
  humans.push({ team: myTeam, keys: KEYMAPS[0], ctrl: list[0], charge: 0, charging: false, marker: MARKERS[0], tgt: TGT[0], passTo: null, swT: 999 });
  MARKERS.forEach((m, i) => m.setVisible(i === 0));
  allPlayers.forEach((p) => { p.sign = p.team === 0 ? 1 : -1; p.group.visible = list.includes(p); p.stamina = 1; p.vx = p.vz = 0; p.kickT = p.lungeT = p.stunT = p.diveT = p.jumpT = 0; p.human = null; });
  players.length = 0; players.push(...list);
  ball.owner = ball.freeKick = ball.throwIn = ball.cornerK = ball.offside = ball.passTarget = null; ball.curve = 0;
  game.fkAim = null; fkDots.visible = false; game.penView = null;
  $('trainPanel').classList.add('hidden'); $('menu').classList.add('hidden');
  $('touch').classList.toggle('hidden', !isTouch); $('pauseBtn').classList.remove('hidden'); $('teamBtn').classList.add('hidden');
  $('p1').classList.remove('hidden'); $('p2').classList.add('hidden');
}
// sprint: 60 m contra cronometru, de 3 ori
function startSprint() {
  const p = squad[myTeam].filter((q) => !q.isGK).sort((a, b) => b.d.spd - a.d.spd)[0];
  drillSetup([p]);
  game.drill = { type: 'sprint', n: 0, runs: 3, best: null, phase: 'ready', t: 0, p };
  sprintLines.forEach((m) => { m.visible = true; });
  ball.x = 0; ball.y = BALL_R; ball.z = HALF_W + 40; ball.vx = ball.vy = ball.vz = 0;       // mingea nu se foloseste
  sprintReady();
}
function sprintReady() {
  const d = game.drill, p = d.p;
  p.x = -31.5; p.z = 0; p.vx = p.vz = 0; p.fx = 1; p.fz = 0; p.stamina = 1;
  d.phase = 'ready'; d.t = 0; game.state = 'train';
  showMsg('🏃 Sprint ' + (d.n + 1) + ' din ' + d.runs + '\nȚine ' + (isTouch ? 'joystick-ul spre dreapta + SPRINT' : 'D + SHIFT') + ' până la linia roșie!', 2.6);
}
// lovituri libere: 5 incercari cu zid si portar, cu tintirea cu linie curba
function startFkDrill() {
  const opp = 1 - myTeam;
  const taker = squad[myTeam].filter((q) => !q.isGK).sort((a, b) => fkSkill(b.d) - fkSkill(a.d))[0];
  drillSetup([taker, gkOf(opp), ...squad[opp].filter((q) => !q.isGK).slice(1, 5)]);
  game.drill = { type: 'fk', n: 0, total: 5, score: 0, phase: 'aim', t: 0, taker };
  nextDrillShot();
}
// penalty-uri: 5 penalty-uri contra portarului, cu camera din spate
function startPenDrill() {
  const opp = 1 - myTeam;
  drillSetup([...squad[myTeam].filter((q) => !q.isGK).sort((a, b) => b.d.sho - a.d.sho).slice(0, 5), gkOf(opp)]);
  game.drill = { type: 'pen', n: 0, total: 5, score: 0, phase: 'aim', t: 0 };
  startShootout();
}
function nextDrillShot() {
  const d = game.drill; d.phase = 'aim'; d.t = 0;
  const opp = 1 - myTeam, side = -squad[opp][0].sign, p = d.taker, k = gkOf(opp);
  ball.x = side * (HALF_L - 19 - Math.random() * 9); ball.z = rnd(13); ball.y = BALL_R; ball.vx = ball.vy = ball.vz = 0; ball.curve = 0;
  k.x = side * (HALF_L - 0.6); k.z = 0; k.vx = k.vz = 0; k.fx = -side; k.fz = 0; k.diveT = 0;
  for (const q of players) { q.stunT = q.lungeT = q.kickT = 0; }
  p.x = ball.x - side; p.z = ball.z;
  setOwner(p); ball.protectT = 3;
  setFreeKick(p, false);                                  // zidul se aseaza singur
  game.fkAim = { taker: p, gx: side * HALF_L, aimZ: 0, curve: 0, phase: 'aim', run: 0, power: 0.55 };
  placeFkTaker();
  game.state = 'play'; game.freeze = 0.4;
  showMsg('🎯 Lovitura liberă ' + (d.n + 1) + ' din ' + d.total, 1.6);
  toast(isTouch ? 'Joystick sus/jos = ținta · stânga/dreapta = efectul · ține ȘUT' : 'W/S = ținta · A/D = efectul · ține ȘUT (G)', 4);
}
function drillWatch(dt) {                                 // in timpul jocului: a intrat mingea? a aparat portarul?
  const d = game.drill; if (d.type !== 'fk') return;
  if (d.phase === 'aim' && !game.fkAim && !ball.freeKick) { d.phase = 'shot'; d.t = 0; }
  if (d.phase !== 'shot') return;
  d.t += dt;
  if (ball.owner) return drillOutcome(false, ball.owner.isGK ? 'Apărat de ' + ball.owner.d.name + '!' : 'În zid!');
  if (d.t > 4) drillOutcome(false, 'Ratat!');
}
function drillOutcome(scored, text) {
  const d = game.drill; if (!d || d.phase === 'wait') return;
  if (scored) { d.score++; sfx.goal(); goalFx(Math.sign(ball.x) || 1, ball.z, ball.y, Math.hypot(ball.vx, ball.vz), TEAMS[myTeam].color); } else sfx.ooh();
  d.n++; d.phase = 'wait'; d.t = 0; game.state = 'train'; ball.owner = null; ball.freeKick = null; game.fkAim = null; fkDots.visible = false;
  showMsg((scored ? 'GOOOL! 🎉' : text || 'Ratat!') + '\n' + d.score + ' din ' + d.n, 1.8);
}
function drillStep(dt) {
  const d = game.drill; if (!d) return;
  d.t += dt;
  if (d.type === 'sprint') {
    const p = d.p, h = humans[0];
    if (d.phase === 'ready') { p.vx = p.vz = 0; if (d.t > 2.7) { d.phase = 'run'; d.t = 0; sfx.whistle(); toast('START! 🏃', 1.2); } return; }
    if (d.phase === 'run') {
      p.lungeT -= dt; p.stunT -= dt; p.tackleCd -= dt; p.kickT -= dt;
      p.human = null; useInput(LOCAL); updateHuman(h, dt);
      if (p.x >= 30) {
        const t = d.t, rec = !TRAIN_BEST.sprint || t < TRAIN_BEST.sprint;
        d.best = d.best ? Math.min(d.best, t) : t; if (rec) { TRAIN_BEST.sprint = t; saveBest(); }
        sfx.whistle(); if (rec) sfx.goal();
        showMsg('⏱ ' + t.toFixed(2) + ' secunde' + (rec ? '\n🏆 Record nou!' : ''), 2.4);
        d.phase = 'done'; d.t = 0;
      } else if (d.t > 30) { showMsg('Prea încet! Mai încearcă.', 2); d.phase = 'done'; d.t = 0; }
      return;
    }
    p.vx *= 0.9; p.vz *= 0.9;
    if (d.phase === 'done' && d.t > 2.6) { d.n++; if (d.n >= d.runs) endDrill(); else sprintReady(); }
    return;
  }
  idleStep(dt);                                           // intre incercari: mingea se opreste
  if (d.phase === 'wait' && d.t > 2) { if (d.n >= d.total) endDrill(); else nextDrillShot(); }
}
function endDrill() {
  const d = game.drill;
  let res;
  if (d.type === 'sprint') res = '🏃 Sprint: cel mai bun timp ' + (d.best ? d.best.toFixed(2) + ' s' : '–');
  else {
    const key = d.type; if (TRAIN_BEST[key] == null || d.score > TRAIN_BEST[key]) { TRAIN_BEST[key] = d.score; saveBest(); }
    res = (d.type === 'fk' ? '🎯 Lovituri libere: ' : '⚽ Penalty-uri: ') + d.score + ' goluri din ' + d.total;
  }
  openTrain(res);
}
$('trSprint').addEventListener('click', () => { initAudio(); startSprint(); });
$('trFk').addEventListener('click', () => { initAudio(); startFkDrill(); });
$('trPen').addEventListener('click', () => { initAudio(); startPenDrill(); });
$('trPlay').addEventListener('click', () => { initAudio(); drillCleanup(); $('trainPanel').classList.add('hidden'); startMatch(1); });
$('trBack').addEventListener('click', () => { $('trainPanel').classList.add('hidden'); toMenu(); });

// ---------- joc online pe doua telefoane ----------
// Telefonul care creeaza jocul ("gazda") ruleaza meciul. Prietenul ("client") trimite doar comenzile lui
// si primeste de 20 de ori pe secunda pozitiile tuturor. Legatura e directa intre telefoane (WebRTC, prin PeerJS);
// serverul gratuit PeerJS ajuta doar la gasirea celuilalt telefon dupa cod.
const net = { role: null, peer: null, conn: null, frame: 0, pend: { p: [], r: [] }, snap: null, team: 1, names: null };
const netEv = [];
for (const k of Object.keys(sfx)) { const orig = sfx[k]; sfx[k] = (...a) => { orig(...a); if (net.role === 'host') netEv.push(['s', k, a]); }; }
const r2 = (v) => Math.round((v || 0) * 100) / 100;
function setNetStatus(t) { $('netStatus').textContent = t; }
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = res; s.onerror = rej; document.head.append(s); });
}
function netClose() {
  const c = net.conn, pr = net.peer;
  net.role = null; net.conn = null; net.peer = null; net.snap = null; net.names = null;
  REMOTE.keys.clear(); REMOTE.pressed.clear(); REMOTE.released.clear(); REMOTE.stick.mag = 0;
  try { c && c.close(); } catch (_) {}
  try { pr && pr.destroy(); } catch (_) {}
}
function netLost() {
  if (!net.role && !net.peer) return;
  const wasGame = game.state !== 'menu';
  netClose();
  if (wasGame) { toMenu(); toast('Legătura cu celălalt telefon s-a pierdut', 4); }
  else setNetStatus('Legătura s-a pierdut. Încearcă din nou.');
}
function showNetPanel(v) {
  $('netPanel').classList.toggle('hidden', !v);
  if (v) { $('netChoose').classList.remove('hidden'); $('netCodeBox').classList.add('hidden'); $('netJoinBox').classList.add('hidden'); setNetStatus('Unul dintre voi creează jocul, celălalt intră cu codul. Fiți pe internet amândoi.'); }
}
async function netHost(forced) {
  $('netChoose').classList.add('hidden'); setNetStatus('Se pregătește jocul...');
  try { await loadPeer(); } catch (_) { return setNetStatus('Nu am putut porni jocul online. Verifică internetul.'); }
  const code = forced || String(1000 + Math.floor(Math.random() * 9000));
  const peer = new Peer('fotbal3d-' + code); net.peer = peer;
  peer.on('open', () => { $('netCode').textContent = code; $('netCodeBox').classList.remove('hidden'); setNetStatus('Spune-i prietenului codul de mai jos. Așteptăm să intre...'); });
  peer.on('error', (e) => { if (e.type === 'unavailable-id') { peer.destroy(); net.peer = null; netHost(); } else setNetStatus('Eroare: ' + e.type + '. Încearcă din nou.'); });
  peer.on('connection', (conn) => {
    if (net.conn) { conn.close(); return; }
    net.conn = conn;
    conn.on('open', () => {
      net.role = 'host'; net.frame = 0;
      conn.send({ t: 'start', team: 1 - myTeam });
      showNetPanel(false); goFullscreen(); startMatch(2, true);
      toast('Prietenul a intrat! Tu ești ' + TEAMS[myTeam].name, 3);
    });
    conn.on('data', (m) => {
      if (!m || m.t !== 'i') return;
      REMOTE.keys = new Set(m.k);
      for (const c of m.p) REMOTE.pressed.add(c);
      for (const c of m.r) REMOTE.released.add(c);
      REMOTE.stick.x = m.s[0]; REMOTE.stick.z = m.s[1]; REMOTE.stick.mag = m.s[2];
    });
    conn.on('close', netLost); conn.on('error', netLost);
  });
}
async function netJoin(code) {
  if (!/^\d{4}$/.test(code)) return setNetStatus('Codul are 4 cifre.');
  setNetStatus('Caut jocul ' + code + '...');
  try { await loadPeer(); } catch (_) { return setNetStatus('Nu am putut porni jocul online. Verifică internetul.'); }
  const peer = new Peer(); net.peer = peer;
  peer.on('open', () => {
    const conn = peer.connect('fotbal3d-' + code, { reliable: true }); net.conn = conn;
    conn.on('open', () => setNetStatus('Conectat! Pornește meciul...'));
    conn.on('data', onClientData);
    conn.on('close', netLost); conn.on('error', netLost);
  });
  peer.on('error', (e) => setNetStatus(e.type === 'peer-unavailable' ? 'Nu există joc cu codul ' + code + '. Verifică codul.' : 'Eroare: ' + e.type + '. Încearcă din nou.'));
}
function onClientData(m) {
  if (!m) return;
  if (m.t === 'start') {                                 // incepe meciul la prieten
    net.role = 'client'; net.team = m.team; net.frame = 0;
    showNetPanel(false); goFullscreen();
    game.mode = 2; game.score = [0, 0]; game.pens = null; game.half = 1; game.time = 0; updateScore();
    players.length = 0; players.push(...allPlayers);
    allPlayers.forEach((p) => { p.group.visible = true; });
    resetSquads();
    humans.length = 0;
    [net.team, 1 - net.team].forEach((t, i) => humans.push({ team: t, keys: KEYMAPS[0], ctrl: squad[t][9], charge: 0, charging: false, marker: MARKERS[i], tgt: TGT[i], passTo: null, swT: 0 }));
    MARKERS.forEach((mk) => mk.setVisible(true));
    $('p1').classList.remove('hidden'); $('p2').classList.add('hidden');
    $('menu').classList.add('hidden'); $('touch').classList.toggle('hidden', !isTouch); $('pauseBtn').classList.add('hidden'); $('teamBtn').classList.add('hidden');
    game.state = 'play';
    toast('Ai intrat! Tu ești ' + TEAMS[net.team].name, 3);
    return;
  }
  if (m.t !== 's') return;
  net.snap = m;
  for (const ev of m.ev || []) {                         // mesaje, sunete, confetti de la gazda
    if (ev[0] === 'm') showMsg(ev[1], ev[2]);
    else if (ev[0] === 't') toast(ev[1], ev[2]);
    else if (ev[0] === 's' && sfx[ev[1]]) sfx[ev[1]](...ev[2]);
    else if (ev[0] === 'c') confetti(ev[1], ev[2]);
    else if (ev[0] === 'g') goalFx(...ev.slice(1));
  }
  if (m.r && (!net.names || m.r.join() !== net.names.join())) {   // schimbari de jucatori facute la gazda
    const all = TEAMS.flatMap((t) => t.players.concat(t.bench || []));
    m.r.forEach((name, i) => { const p = allPlayers[i]; if (p.d.name !== name) { const d = all.find((x) => x.name === name); if (d) substitute(p, d); } });
    net.names = m.r;
  }
  if (m.st === 'end' && game.state !== 'end') endAt = performance.now();
}
function netSendSnap() {
  if (!net.conn || !net.conn.open || (net.frame++ % 3)) return;
  const m = {
    t: 's', b: [r2(ball.x), r2(ball.y), r2(ball.z)], o: ball.owner ? allPlayers.indexOf(ball.owner) : -1,
    P: allPlayers.map((p) => [r2(p.x), r2(p.z), r2(p.fx), r2(p.fz), r2(p.vx), r2(p.vz), r2(p.kickT), r2(p.lungeT), r2(p.diveT), p.diveDir || 0, r2(p.jumpT), r2(p.trickT), r2(p.stunT), players.includes(p) ? 1 : 0, r2(p.stamina)]),
    st: game.state, h: game.half, tm: r2(game.time), ad: game.added || 0, sc: game.score, pn: game.pens,
    hc: humans.map((h) => allPlayers.indexOf(h.ctrl)), ch: humans.map((h) => r2(h.charge)), gs: game.scorer ? allPlayers.indexOf(game.scorer) : -1,
    ev: netEv.splice(0),
  };
  if (net.frame % 60 < 3) m.r = allPlayers.map((p) => p.d.name);
  try { net.conn.send(m); } catch (_) {}
}
function clientTick(dt) {
  const m = net.snap;
  if (m) {
    const k = Math.min(1, 14 * dt), kb = Math.min(1, 22 * dt);
    allPlayers.forEach((p, i) => {
      const a = m.P[i]; if (!a) return;
      const far = Math.hypot(a[0] - p.x, a[1] - p.z) > 5;            // dupa gol / fault jucatorii sunt mutati dintr-odata
      p.x = far ? a[0] : p.x + (a[0] - p.x) * k; p.z = far ? a[1] : p.z + (a[1] - p.z) * k;
      [p.fx, p.fz, p.vx, p.vz, p.kickT, p.lungeT, p.diveT, p.diveDir, p.jumpT, p.trickT, p.stunT] = a.slice(2, 13);
      p.stamina = a[14];
      const on = a[13] === 1, isOn = players.includes(p);
      if (on !== isOn) { if (on) players.push(p); else players.splice(players.indexOf(p), 1); p.group.visible = on; }
    });
    const far = Math.hypot(m.b[0] - ball.x, m.b[2] - ball.z) > 6;
    ball.x = far ? m.b[0] : ball.x + (m.b[0] - ball.x) * kb; ball.y = far ? m.b[1] : ball.y + (m.b[1] - ball.y) * kb; ball.z = far ? m.b[2] : ball.z + (m.b[2] - ball.z) * kb;
    ball.owner = m.o >= 0 ? allPlayers[m.o] : null;
    game.state = m.st; game.half = m.h; game.time = m.tm; game.added = m.ad;
    if (game.score.join() !== m.sc.join() || JSON.stringify(game.pens) !== JSON.stringify(m.pn)) { game.score = m.sc; game.pens = m.pn; updateScore(); }
    if (m.hc.length > 1) {                                // la gazda: [gazda, prieten]; aici: [eu, gazda]
      humans[0].ctrl = allPlayers[m.hc[1]] || humans[0].ctrl; humans[1].ctrl = allPlayers[m.hc[0]] || humans[1].ctrl;
      humans[0].charge = m.ch[1]; humans[1].charge = m.ch[0];
    }
    game.scorer = m.gs >= 0 ? allPlayers[m.gs] : null;
  }
  // trimitem comenzile mele (tastatura / joystick / butoane) catre gazda
  net.pend.p.push(...LOCAL.pressed); net.pend.r.push(...LOCAL.released);
  if (net.conn && net.conn.open && (net.frame++ % 2 === 0)) {
    try { net.conn.send({ t: 'i', k: [...LOCAL.keys], p: net.pend.p, r: net.pend.r, s: [r2(LOCAL.stick.x), r2(LOCAL.stick.z), r2(LOCAL.stick.mag)] }); } catch (_) {}
    net.pend = { p: [], r: [] };
  }
}
$('netOpen').addEventListener('click', () => { initAudio(); showNetPanel(true); });
{                                                       // test: ?nettest=host|join&code=NNNN (doua browsere)
  const q = new URLSearchParams(location.search), nt = q.get('nettest');
  if (nt) {
    const pre = document.createElement('pre'); pre.id = 'simout'; document.body.append(pre); let sent = false;
    setInterval(() => {
      if (nt === 'join' && net.role === 'client' && !sent) { LOCAL.keys.add('KeyD'); sent = true; }
      pre.textContent = JSON.stringify({ role: net.role, state: game.state, frame: net.frame, status: $('netStatus').textContent, remote: [...REMOTE.keys], snap: !!net.snap, ctrl: humans.map((h) => h.ctrl && h.ctrl.d.name), ball: [r2(ball.x), r2(ball.z)] });
    }, 300);
    showNetPanel(true); if (nt === 'host') netHost(q.get('code')); else netJoin(q.get('code'));
  }
}
$('netHost').addEventListener('click', () => netHost());
$('netJoin').addEventListener('click', () => { $('netChoose').classList.add('hidden'); $('netJoinBox').classList.remove('hidden'); setNetStatus('Scrie codul de 4 cifre de pe telefonul prietenului.'); $('netInput').focus(); });
$('netGo').addEventListener('click', () => netJoin($('netInput').value.trim()));
$('netBack').addEventListener('click', () => { netClose(); showNetPanel(false); });

// ---------- bucla principala ----------
const demo = new URLSearchParams(location.search).has('demo');
const autoMode = +new URLSearchParams(location.search).get('mode');
if (autoMode === 1 || autoMode === 2) startMatch(autoMode);
if (demo) { $('menu').classList.add('hidden'); game.state = 'play'; kickoff(0); }
if (new URLSearchParams(location.search).has('pens') && game.state === 'play') { game.half = 4; startShootout(); }   // test: direct la penalty-uri

const SNAP = 11;
function record() {
  const a = new Float32Array(allPlayers.length * SNAP + 3); let i = 0;
  for (const p of allPlayers) { a[i++] = p.x; a[i++] = p.z; a[i++] = p.fx; a[i++] = p.fz; a[i++] = p.vx; a[i++] = p.vz; a[i++] = p.phase; a[i++] = p.kickT; a[i++] = p.lungeT; a[i++] = p.diveT; a[i++] = p.jumpT; }
  a[i++] = ball.x; a[i++] = ball.y; a[i++] = ball.z;
  rec.push(a); if (rec.length > 330) rec.shift();
}
function applySnap(a) {
  let i = 0;
  for (const p of allPlayers) { p.x = a[i++]; p.z = a[i++]; p.fx = a[i++]; p.fz = a[i++]; p.vx = a[i++]; p.vz = a[i++]; p.phase = a[i++]; p.kickT = a[i++]; p.lungeT = a[i++]; p.diveT = a[i++]; p.jumpT = a[i++]; }
  ball.x = a[i++]; ball.y = a[i++]; ball.z = a[i++];
}

function tick(dt, now) {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (game.msgT > 0) { game.msgT -= dt; if (game.msgT <= 0) $('msg').classList.remove('on'); }
  if (net.role === 'client') { clientTick(dt); return endTick(dt); }   // online, la prieten: doar afisam ce trimite telefonul gazda
  if (game.state === 'play') {
    if (game.freeze > 0) game.freeze -= dt; else { step(dt); record(); }
  } else if (game.state === 'goal' || game.state === 'break') {
    idleStep(dt); game.timer -= dt;
    if (game.state === 'goal' && game.timer > 2.9) record();
    if (game.timer <= 0) {
      if (game.state === 'goal' && rec.length > 90) { game.state = 'replay'; game.rp = Math.max(0, rec.length - 230); toast('🎬 Reluare', 99); }
      else {
        if (game.state === 'break' && game.next === 'shootout') { game.next = null; startShootout(); return endTick(dt); }
        if (game.state === 'break') { game.half++; game.time = 0; game.kick = game.half % 2 === 0 ? 1 : 0; newPeriod(); for (const p of allPlayers) p.sign = -p.sign; }
        game.state = 'play'; kickoff(game.kick);
      }
    }
  } else if (game.state === 'replay') {                  // reluarea golului, cu incetinitorul
    game.rp += dt * 60 * 0.5;
    if (game.rp >= rec.length - 1 || pressed.size) { toast('', 0); game.state = 'play'; kickoff(game.kick); }
    else applySnap(rec[game.rp | 0]);
  } else if (game.state === 'shootout') {
    for (const p of players) p.human = null;
    shootoutStep(dt);
  } else if (game.state === 'train') {
    drillStep(dt);
  } else if (game.state === 'menu') {
    cam.x = Math.sin(now / 6000) * 25;                   // camera se plimba in meniu
  }
  endTick(dt);
}
function endTick(dt) {
  if (net.role === 'host') netSendSnap();
  for (const inp of [LOCAL, REMOTE]) { inp.pressed.clear(); inp.released.clear(); }
  syncGfx(dt); updateHud(); updateTouchUi(); drawRadar();
}

const simN = +new URLSearchParams(location.search).get('sim');
if (simN) {
  let own = [0, 0, 0], err = '';
  try { for (let i = 0; i < simN; i++) { tick(1 / 60, 0); own[ball.owner ? ball.owner.team : 2]++; if (!isFinite(ball.x + ball.y + ball.z)) throw new Error('NaN minge la pasul ' + i); } } catch (e) { err = String(e.stack || e); }
  const pre = document.createElement('pre'); pre.id = 'simout';
  pre.textContent = JSON.stringify({ err, state: game.state, half: game.half, time: game.time, score: game.score, own, ball: [ball.x, ball.y, ball.z], log }, null, 1);
  document.body.append(pre);
}

let last = performance.now(), perfT = 0, perfN = 0;
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.033); last = now;
  if (game.paused) { for (const inp of [LOCAL, REMOTE]) { inp.pressed.clear(); inp.released.clear(); } } else tick(dt, now);
  if (perfN >= 0 && game.state === 'play' && !game.paused) {            // telefon lent -> imagine mai putin detaliata, dar fluida
    perfT += dt; perfN++;
    if (perfN === 120) {
      if (perfT / perfN > 0.027) {
        if (renderer.shadowMap.enabled) { setShadows(false); perfN = 0; perfT = 0; }        // pasul 1: fara umbre reale
        else { renderer.setPixelRatio(1); resize(); perfN = -1; }                           // pasul 2: rezolutie mai mica
      } else perfN = -1;
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { game, ball, players, tick, log, humans, stats, keys, pressed, released };
if (new URLSearchParams(location.search).has('traintest')) {   // test: cele trei antrenamente, cu taste apasate automat
  const res = [], dt = 1 / 60, T = (n) => { for (let i = 0; i < n; i++) tick(dt, 0); };
  const press = (code) => { LOCAL.keys.add(code); LOCAL.pressed.add(code); }, rel = (code) => { LOCAL.keys.delete(code); LOCAL.released.add(code); };
  try {
    openTrain(); startSprint(); T(200);
    press('KeyD'); press('ShiftLeft'); T(600); rel('KeyD'); rel('ShiftLeft');
    res.push('sprint: best=' + (game.drill && game.drill.best ? game.drill.best.toFixed(2) : 'nimic') + ' x=' + game.drill.p.x.toFixed(1));
    drillCleanup(); startFkDrill(); T(60);
    res.push('fk: aim=' + !!game.fkAim + ' wall=' + players.length + ' state=' + game.state);
    press('KeyG'); T(30); rel('KeyG'); T(400);
    res.push('fk dupa sut: n=' + game.drill.n + ' scor=' + game.drill.score + ' faza=' + game.drill.phase + ' state=' + game.state);
    drillCleanup(); startPenDrill();
    for (let k = 0; k < 5; k++) { T(100); press('KeyG'); T(20); rel('KeyG'); T(260); }
    res.push('pen: ' + (game.drill ? 'n=' + game.drill.n : 'terminat') + ' rezultat="' + $('trResult').textContent + '" panou=' + !$('trainPanel').classList.contains('hidden'));
  } catch (e) { res.push('ERR ' + e.stack); }
  const pre = document.createElement('pre'); pre.id = 'simout'; pre.textContent = res.join(' | '); document.body.append(pre);
}
if (new URLSearchParams(location.search).has('maninfo')) {      // test: cum e construit manechinul
  const pre = document.createElement('pre'); pre.id = 'simout'; document.body.append(pre);
  const iv = setInterval(() => { if (window.__manInfo) { pre.textContent = JSON.stringify(window.__manInfo); clearInterval(iv); } }, 200);
}
if (new URLSearchParams(location.search).has('fktest')) {       // test: fault langa careu pentru echipa omului
  const res = [], dt = 1 / 60;
  try {
    startMatch(1); for (let i = 0; i < 100; i++) tick(dt, 0);
    const me = humans[0].team, opp = squad[1 - me][6], victim = squad[me][9], side = squad[1 - me][0].sign;
    ball.x = -side * (HALF_L - 24); ball.z = 4; victim.x = ball.x; victim.z = ball.z; setOwner(victim);
    foul(opp, victim, false);
    res.push('panel=' + !$('fkPanel').classList.contains('hidden') + ' rows=' + $('fkList').children.length + ' best=' + $('fkList').firstElementChild.textContent);
    $('fkList').firstElementChild.click();
    res.push('aim=' + !!game.fkAim + ' taker=' + (game.fkAim && game.fkAim.taker.d.name));
    for (let i = 0; i < 160; i++) tick(dt, 0);
    if (new URLSearchParams(location.search).get('fktest') === 'aim') { game.fkAim.curve = 0.35; game.fkAim.aimZ = -2; throw new Error('stop-aim'); }
    keys.add('KeyG'); pressed.add('KeyG'); for (let i = 0; i < 40; i++) tick(dt, 0); keys.delete('KeyG'); released.add('KeyG');
    for (let i = 0; i < 50; i++) tick(dt, 0);
    res.push('after: aim=' + !!game.fkAim + ' owner=' + (ball.owner ? ball.owner.d.name : 'none') + ' ballv=' + Math.hypot(ball.vx, ball.vz).toFixed(1) + ' curve=' + (ball.curve || 0).toFixed(2) + ' dots=' + fkDots.visible);
    for (let i = 0; i < 120; i++) tick(dt, 0);
    res.push('score=' + game.score.join('-') + ' log=' + log.slice(-3).join(' / '));
  } catch (e) { res.push('ERR ' + e.stack); }
  const pre = document.createElement('pre'); pre.id = 'simout'; pre.textContent = res.join(' | '); document.body.append(pre);
}
if (new URLSearchParams(location.search).has('subtest')) {      // test: deschide echipa si face o schimbare
  const res = [];
  try {
    startMatch(1); for (let i = 0; i < 30; i++) tick(1 / 60, 0);
    openTeam(true);
    const before = squad[0][9].d.name;
    $('tpField').querySelector('[data-i="9"]').click(); $('tpBench').querySelector('[data-i="4"]').click();
    res.push(before + ' -> ' + squad[0][9].d.name + ' subs=' + subsUsed[0] + ' benchOut=' + bench[0][4].d.name + '/' + bench[0][4].out + ' paused=' + game.paused);
    $('tpField').querySelector('[data-i="0"]').click(); $('tpBench').querySelector('[data-i="1"]').click();
    res.push('gk-check subs=' + subsUsed[0] + ' toast=' + $('toast').textContent);
  } catch (e) { res.push('ERR ' + e.stack); }
  const pre = document.createElement('pre'); pre.id = 'simout'; pre.textContent = res.join(' | '); document.body.append(pre);
}
if (new URLSearchParams(location.search).has('tricktest')) {     // test: apasa SPRINT de 2 ori cu mingea la picior
  const res = [], dt = 1 / 60;
  try {
    startMatch(1);
    for (let i = 0; i < 120; i++) tick(dt, 0);
    pressed.add('KeyF'); tick(dt, 0);
    for (let i = 0; i < 60; i++) tick(dt, 0);
    setOwner(humans[0].ctrl); ball.protectT = 3; ball.freeKick = null;
    res.push('owner=' + (ball.owner ? ball.owner.d.name + '/t' + ball.owner.team : 'none') + ' ctrl=' + humans[0].ctrl.d.name + ' state=' + game.state + ' fk=' + !!ball.freeKick);
    const tap = () => { keys.add('ShiftLeft'); pressed.add('ShiftLeft'); tick(dt, 0); keys.delete('ShiftLeft'); released.add('ShiftLeft'); tick(dt, 0); };
    tap(); for (let i = 0; i < 6; i++) tick(dt, 0); tap();
    res.push('after: trickT=' + (ball.trickT || 0).toFixed(2) + ' y=' + ball.y.toFixed(2) + ' owner=' + (ball.owner ? ball.owner.d.name : 'none') + ' tapT=' + (humans[0].tapT || 0).toFixed(2));
  } catch (e) { res.push('ERR ' + e.stack); }
  const pre = document.createElement('pre'); pre.id = 'simout'; pre.textContent = res.join(' | '); document.body.append(pre);
}
