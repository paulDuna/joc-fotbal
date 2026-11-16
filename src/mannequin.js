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
      resolve(g);
    }, undefined, () => resolve(null));
  });
}

export function makeMannequin(shirt, shorts) {
  const root = SkeletonUtils.clone(gltf.scene);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    const joints = /joint/i.test(o.material.name) || /joint/i.test(o.name);
    o.material = new THREE.MeshStandardMaterial({ color: joints ? shorts : shirt, roughness: joints ? 0.5 : 0.75, metalness: 0.05 });
  });
  const mixer = new THREE.AnimationMixer(root), acts = {};
  for (const n of ['idle', 'walk', 'run']) {
    const clip = gltf.animations.find((a) => a.name === n);
    if (!clip) continue;
    const a = mixer.clipAction(clip); a.play(); a.time = Math.random() * clip.duration; a.setEffectiveWeight(n === 'idle' ? 1 : 0);
    acts[n] = a;
  }
  const bone = (name) => { let b = null; root.traverse((o) => { if (!b && o.isBone && o.name.endsWith(name)) b = o; }); return b; };
  const bones = { rUpLeg: bone('RightUpLeg'), rLeg: bone('RightLeg'), lUpLeg: bone('LeftUpLeg'), lArm: bone('LeftArm'), rArm: bone('RightArm'), spine: bone('Spine') };
  return { root, mixer, acts, bones, scale: baseScale };
}

// amesteca animatiile dupa viteza (m/s): sta -> merge -> alearga
export function animateMannequin(m, sp, dt) {
  const wIdle = Math.max(0, 1 - sp / 1.0), wRun = Math.min(1, Math.max(0, (sp - 2.2) / 2.3)), wWalk = Math.max(0, 1 - wIdle - wRun);
  if (m.acts.idle) m.acts.idle.setEffectiveWeight(wIdle);
  if (m.acts.walk) { m.acts.walk.setEffectiveWeight(wWalk); m.acts.walk.timeScale = Math.min(1.6, Math.max(0.6, sp / 1.6)); }
  if (m.acts.run) { m.acts.run.setEffectiveWeight(wRun); m.acts.run.timeScale = Math.min(1.5, Math.max(0.7, sp / 6.5)); }
  m.mixer.update(dt);
}
