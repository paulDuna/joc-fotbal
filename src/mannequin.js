// Manechin 3D cu miscari filmate de la un om adevarat (modelul Xbot din exemplele three.js).
// Are animatiile: idle (sta), walk (merge), run (alearga). Le amestecam dupa viteza jucatorului.
import * as THREE from 'three';
import { GLTFLoader } from '../lib/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../lib/addons/utils/SkeletonUtils.js';

let gltf = null, baseScale = 1;

export function loadMannequin() {
  return new Promise((resolve) => {
    new GLTFLoader().load('./lib/models/Xbot.glb', (g) => {
      gltf = g;
      const box = new THREE.Box3().setFromObject(g.scene), h = box.max.y - box.min.y;
      baseScale = h > 0 ? 1.82 / h : 1;                 // inaltimea unui fotbalist: ~1.82 m
      const info = { h, meshes: [], bones: [] };
      g.scene.traverse((o) => {
        if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; info.meshes.push({ name: o.name, mat: o.material.name, min: bb.min.toArray().map((v) => +v.toFixed(3)), max: bb.max.toArray().map((v) => +v.toFixed(3)), scale: o.getWorldScale(new THREE.Vector3()).toArray().map((v) => +v.toFixed(4)) }); }
        if (o.isBone && /Head|Neck|Hips|Spine2$/.test(o.name)) info.bones.push(o.name + ':' + o.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(','));
      });
      window.__manInfo = info;
      resolve(g);
    }, undefined, () => resolve(null));
  });
}

// "Echipament" pictat pe manechin dupa pozitia fiecarui punct in poza de baza (in T, inaltime 1.8 m):
// cap si gat = piele, trunchi = tricou, brate = maneca scurta apoi piele, sold = sort, coapse = piele,
// gambe = jambiere, talpi = ghete. Asa arata ca un fotbalist imbracat, nu ca un robot.
function kitMaterial(c) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.0 });
  const U = { uShirt: { value: new THREE.Color(c.shirt) }, uShorts: { value: new THREE.Color(c.shorts) }, uSocks: { value: new THREE.Color(c.socks) },
    uSkin: { value: new THREE.Color(c.skin) }, uBoot: { value: new THREE.Color(c.boot) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBind = position;
        {   // corp de fotbalist: piept si umeri lati, brate si picioare musculoase, gat gros, solduri inguste
          vec3 p = transformed; float ax = abs(p.x), sx = sign(p.x);
          float wa = p.y > 1.2 ? smoothstep(0.17, 0.28, ax) : 0.0;          // cat de mult e "brat" (trecere lina la umar)
          if (p.y > 0.97 && p.y <= 1.53) {                                 // trunchi in forma de V: talie ingusta, abdomen plat, piept si umeri foarte lati
            float k = smoothstep(1.02, 1.36, p.y);
            p.x = mix(p.x * mix(0.9, 1.3, k), p.x, wa); p.z = mix(p.z * mix(0.84, 1.16, k), p.z, wa);
          }
          if (wa > 0.0) {                                                  // brate (in poza de baza sunt orizontale)
            float sh = 1.0 + 0.15 * (1.0 - smoothstep(0.26, 0.42, ax)), f = mix(1.0, 1.3 * sh, wa);
            p.y = 1.42 + (p.y - 1.42) * f; p.z *= f; p.x += sx * 0.05 * wa;
          } else if (p.y > 0.8 && p.y <= 0.97) {                           // solduri inguste (barbatesti)
            p.x *= 0.85; p.z *= 0.9;
          } else if (p.y > 0.06 && p.y <= 0.8) {                           // coapse si gambe musculoase
            float lx = sx * 0.09, m = mix(1.12, 1.24, smoothstep(0.3, 0.7, p.y));
            p.x = lx + (p.x - lx) * m; p.z *= m;
          }
          if (p.y > 1.46 && ax < 0.09) { p.x *= 1.4; p.z *= 1.3; }        // gat gros
          transformed = p;
        }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;\nuniform vec3 uShirt, uShorts, uSocks, uSkin, uBoot;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float y = vBind.y, ax = abs(vBind.x);
        vec3 col = uSkin;
        if (ax > 0.2 && y > 1.2) { col = ax < 0.38 ? uShirt : uSkin; }          // brate: maneca scurta, apoi piele
        else if (y > 1.47 && ax < 0.085) col = uSkin;                            // gat (umerii raman in tricou)
        else if (y > 0.97) col = uShirt;                                         // tricou
        else if (y > 0.74) col = uShorts;                                        // sort
        else if (y > 0.53) col = uSkin;                                          // genunchi / coapsa
        else if (y > 0.085) col = uSocks;                                        // jambiere
        else col = uBoot;                                                        // ghete
        vec4 diffuseColor = vec4( col, opacity );`);
  };
  m.customProgramCacheKey = () => 'kit';
  return m;
}

export function makeMannequin(c) {
  const root = SkeletonUtils.clone(gltf.scene);
  const mat = kitMaterial(c);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    o.material = mat;
  });
  const mixer = new THREE.AnimationMixer(root), acts = {};
  for (const n of ['idle', 'walk', 'run']) {
    const clip = gltf.animations.find((a) => a.name === n);
    if (!clip) continue;
    const a = mixer.clipAction(clip); a.play(); a.time = Math.random() * clip.duration; a.setEffectiveWeight(n === 'idle' ? 1 : 0);
    acts[n] = a;
  }
  const bone = (name) => { let b = null; root.traverse((o) => { if (!b && o.isBone && o.name.endsWith(name)) b = o; }); return b; };
  const bones = { rUpLeg: bone('RightUpLeg'), rLeg: bone('RightLeg'), lUpLeg: bone('LeftUpLeg'), lArm: bone('LeftArm'), rArm: bone('RightArm'), spine: bone('Spine'), head: bone('Head') };
  return { root, mixer, acts, bones, scale: baseScale, head: null, headCorr: null };
}

// pune capul jucatorului pe manechin: capul manechinului e ascuns (os micsorat), iar capul nostru urmeaza osul capului
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _gq = new THREE.Quaternion();
export function attachHead(m, head, group) {
  m.head = head; group.add(head);
  m.root.updateMatrixWorld(true);
  m.bones.head.getWorldQuaternion(_q); group.getWorldQuaternion(_gq);
  m.headCorr = _gq.clone().invert().multiply(_q).invert();        // in poza de baza capul priveste inainte
}
function placeHead(m) {
  const hb = m.bones.head, grp = m.head.parent;
  hb.scale.setScalar(0.001);                                      // ascundem capul de manechin
  m.root.updateMatrixWorld(true);
  hb.getWorldPosition(_v); grp.worldToLocal(_v);
  hb.getWorldQuaternion(_q); grp.getWorldQuaternion(_gq);
  m.head.quaternion.copy(_gq.invert().multiply(_q)).multiply(m.headCorr);
  m.head.position.copy(_v).add(new THREE.Vector3(0, 0.085, 0.01).applyQuaternion(m.head.quaternion));
}

// amesteca animatiile dupa viteza (m/s): sta -> merge -> alearga
export function animateMannequin(m, sp, dt) {
  const wIdle = Math.max(0, 1 - sp / 1.0), wRun = Math.min(1, Math.max(0, (sp - 2.2) / 2.3)), wWalk = Math.max(0, 1 - wIdle - wRun);
  if (m.acts.idle) m.acts.idle.setEffectiveWeight(wIdle);
  if (m.acts.walk) { m.acts.walk.setEffectiveWeight(wWalk); m.acts.walk.timeScale = Math.min(1.6, Math.max(0.6, sp / 1.6)); }
  if (m.acts.run) { m.acts.run.setEffectiveWeight(wRun); m.acts.run.timeScale = Math.min(1.5, Math.max(0.7, sp / 6.5)); }
  m.mixer.update(dt);
}
export function afterPose(m) { if (m.head && m.bones.head) placeHead(m); }   // dupa ce am modificat oasele (sut, braziliana)
