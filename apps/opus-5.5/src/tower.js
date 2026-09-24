import * as THREE from 'three';
import { STYLE } from './layout.js';
import { NOISE } from './shaderlib.js';

// The VANTA-SHIGURE arcology: a stepped black megastructure at the heart of
// the grid, crowned by an antenna, circled by holographic halos, sweeping the
// clouds with searchlights — and watching everything through a giant eye.

export const TIERS = [
  { s: 150, h: 40 },
  { s: 120, h: 210 },
  { s: 92, h: 340 },
  { s: 66, h: 440 },
  { s: 42, h: 520 },
  { s: 16, h: 600 },
];

export function addMegatower(layout) {
  const { lots } = layout;
  TIERS.forEach((t, i) => {
    lots.push({ x: 0, z: 0, w: t.s, d: t.s, h: t.h, style: STYLE.MEGA, seed: 0.13 + i * 0.07 });
  });
  // Corner buttresses.
  const c = TIERS[1].s / 2;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    lots.push({ x: sx * c, z: sz * c, w: 16, d: 16, h: 270, style: STYLE.MEGA, seed: 0.5 + sx * 0.1 + sz * 0.03 });
  }
}

export function towerBannerItems(rects) {
  const items = [];
  const half = TIERS[1].s / 2 + 0.6;
  const faces = [
    { p: [half, 0], ry: Math.PI / 2 },
    { p: [-half, 0], ry: -Math.PI / 2 },
    { p: [0, half], ry: 0 },
    { p: [0, -half], ry: Math.PI },
  ];
  faces.forEach((f, i) => {
    items.push({ pos: [f.p[0], 120, f.p[1]], ry: f.ry, size: [26, 104], rect: rects.banner[i % 2], gain: 3.0 });
  });
  const half2 = TIERS[3].s / 2 + 0.6;
  faces.forEach((f, i) => {
    const s = half2 / half;
    items.push({ pos: [f.p[0] * s, 395, f.p[1] * s], ry: f.ry, size: [18, 72], rect: rects.banner[2 + (i % 2)], gain: 2.6 });
  });
  return items;
}

// ---------------------------------------------------------------- the eye

const eyeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const eyeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform vec2 uLook;
  uniform float uGlitch;
  uniform float uFade;
  varying vec2 vUv;
  ${NOISE}

  float ring(float r, float target, float w) {
    return smoothstep(w, 0.0, abs(r - target));
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.0, 1.0);
    // Glitch displacement.
    float band = floor(vUv.y * 40.0);
    p.x += uGlitch * (hash12(vec2(band, floor(uTime * 20.0))) - 0.5) * 0.25;

    float r = length(p);
    float a = atan(p.y, p.x);
    vec3 col = vec3(0.0);

    // Surveillance reticle around the eye.
    float ticks = step(0.5, fract(a * 60.0 / 6.2831 + uTime * 0.2)) ;
    col += vec3(0.1, 0.9, 1.0) * ring(r, 0.47, 0.004) * 0.9;
    col += vec3(0.1, 0.9, 1.0) * ring(r, 0.49, 0.01) * ticks * 0.6;
    float arc = step(0.0, sin(a * 3.0 - uTime * 0.7));
    col += vec3(1.0, 0.1, 0.5) * ring(r, 0.43, 0.003) * arc;

    // Almond-shaped lids.
    float x = p.x / 0.9;
    float lid = 0.36 * pow(max(1.0 - x * x, 0.0), 0.85) * uOpen;
    float inside = smoothstep(0.004, -0.004, abs(p.y) - lid) * step(abs(x), 1.0);
    float outline = smoothstep(0.012, 0.0, abs(abs(p.y) - lid)) * step(abs(x), 1.0);
    col += outline * vec3(0.2, 1.0, 1.0) * 2.0;

    // Iris.
    vec2 ip = p - uLook * 0.12;
    float ir = length(ip);
    float ia = atan(ip.y, ip.x);
    float fibres = 0.55 + 0.45 * fbm(vec2(ia * 6.0, ir * 14.0 - uTime * 0.3));
    vec3 irisCol = mix(vec3(1.0, 0.05, 0.25), vec3(1.0, 0.55, 0.1), smoothstep(0.08, 0.24, ir));
    float iris = smoothstep(0.26, 0.24, ir);
    col += inside * iris * irisCol * fibres * 2.2;
    col += inside * ring(ir, 0.25, 0.012) * vec3(1.0, 0.3, 0.6) * 2.0;
    // Slit pupil.
    float pupil = smoothstep(0.012, 0.0, length(vec2(ip.x / 0.045, ip.y / 0.2)) - 1.0);
    col *= 1.0 - pupil * inside;
    col += inside * pupil * vec3(0.05, 0.0, 0.02);
    // Sclera: faint scan grid.
    float grid = step(0.94, fract(p.x * 40.0)) + step(0.94, fract(p.y * 40.0));
    col += inside * (1.0 - iris) * vec3(0.05, 0.25, 0.35) * (0.4 + grid * 0.8);
    // Catchlight.
    col += inside * smoothstep(0.03, 0.0, length(ip - vec2(0.07, 0.08))) * 3.0;

    // Hologram treatment.
    float scan = 0.7 + 0.3 * sin(vUv.y * 420.0 - uTime * 10.0);
    float flick = 0.9 + 0.1 * sin(uTime * 37.0) * sin(uTime * 11.0);
    col *= scan * flick * uFade * 0.55;
    float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ------------------------------------------------------------ searchlights

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  ${NOISE}
  void main() {
    float along = vUv.y;
    float facing = pow(abs(dot(vN, vV)), 2.0);
    float fade = pow(1.0 - along, 1.6) * smoothstep(0.0, 0.02, along);
    float dust = 0.7 + 0.3 * vnoise(vec2(vUv.x * 30.0, along * 20.0 - uTime * 0.6));
    float a = facing * fade * dust * 0.12;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

// ------------------------------------------------------------ halo rings

const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  float h(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    // RingGeometry uv is planar; recover the angle from it.
    vec2 p = vUv - 0.5;
    float a = atan(p.y, p.x) / 6.2831 + 0.5;
    float seg = floor(a * 96.0);
    float on = step(0.35, h(seg + uSeed * 17.0 + floor(uTime * 0.5 + uSeed) * 3.1));
    float gap = step(0.12, fract(a * 96.0));
    float data = step(0.5, h(floor(a * 700.0) + uSeed));
    float c = on * gap * (0.6 + 0.4 * data);
    float scan = 0.75 + 0.25 * sin(a * 6.2831 * 4.0 - uTime * 3.0);
    gl_FragColor = vec4(uColor * c * scan * 1.6, 1.0);
  }
`;

// ------------------------------------------------------------ beacons

const beaconVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vOn;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float blink = pow(max(sin(uTime * 2.2 + aPhase * 6.2831), 0.0), 8.0);
    vOn = 0.15 + blink;
    gl_PointSize = (90.0 + 60.0 * blink) * uPixelRatio / -mv.z;
    gl_PointSize = clamp(gl_PointSize, 1.5, 40.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const beaconFragment = /* glsl */ `
  varying float vOn;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float g = smoothstep(0.5, 0.0, d);
    g = g * g;
    gl_FragColor = vec4(vec3(1.0, 0.06, 0.05) * g * vOn * 4.0, 1.0);
  }
`;

export function createTowerExtras(layout, shared, pixelRatio) {
  const group = new THREE.Group();
  const additive = {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  };

  // Antenna mast.
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 3.2, 110, 8),
    new THREE.MeshBasicMaterial({ color: 0x050507 })
  );
  mast.position.y = 600 + 55;
  group.add(mast);

  // Eye.
  const eyeUniforms = {
    uTime: shared.uTime,
    uOpen: { value: 1 },
    uLook: { value: new THREE.Vector2() },
    uGlitch: { value: 0 },
    uFade: { value: 1 },
  };
  const eye = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 95),
    new THREE.ShaderMaterial({
      vertexShader: eyeVertex,
      fragmentShader: eyeFragment,
      uniforms: eyeUniforms,
      side: THREE.DoubleSide,
      ...additive,
    })
  );
  eye.renderOrder = 10;
  group.add(eye);

  // Searchlights.
  const beamGeo = new THREE.CylinderGeometry(60, 1.5, 900, 32, 1, true);
  beamGeo.translate(0, 450, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beams = [];
  const beamColors = [0xbfe6ff, 0xff4fd8, 0xbfe6ff, 0x4ff0ff, 0xbfe6ff, 0xff4fd8];
  const lampPositions = [
    [60, 212, 60], [-60, 212, -60], [60, 212, -60], [-60, 212, 60],
    [33, 442, 33], [-33, 442, -33],
  ];
  lampPositions.forEach((p, i) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      uniforms: { uColor: { value: new THREE.Color(beamColors[i]) }, uTime: shared.uTime },
      side: THREE.DoubleSide,
      ...additive,
    });
    const beam = new THREE.Mesh(beamGeo, mat);
    beam.position.set(...p);
    beam.userData.phase = i * 1.7;
    beam.userData.speed = 0.12 + (i % 3) * 0.05;
    beams.push(beam);
    group.add(beam);
  });

  // Holographic halos around the upper tower.
  const halos = [];
  const haloSpecs = [
    { r: 70, y: 470, c: 0x2ef6ff, s: 0.12 },
    { r: 92, y: 360, c: 0xff2bd6, s: -0.08 },
    { r: 48, y: 560, c: 0xff2a3d, s: 0.2 },
  ];
  haloSpecs.forEach((h, i) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(h.r, h.r + 3.5, 256, 1),
      new THREE.ShaderMaterial({
        vertexShader: eyeVertex,
        fragmentShader: haloFragment,
        uniforms: { uColor: { value: new THREE.Color(h.c) }, uTime: shared.uTime, uSeed: { value: i * 3.7 } },
        side: THREE.DoubleSide,
        ...additive,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = h.y;
    mesh.userData.spin = h.s;
    halos.push(mesh);
    group.add(mesh);
  });

  // Aircraft warning beacons on every tall roof.
  const beaconPos = [];
  const phases = [];
  for (const lot of layout.lots) {
    if (lot.style === STYLE.ROOFTOP || lot.h < 100) continue;
    beaconPos.push(lot.x, lot.h + 1.5, lot.z);
    phases.push(Math.random());
  }
  beaconPos.push(0, 712, 0);
  phases.push(0);
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(beaconPos, 3));
  beaconGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  const beacons = new THREE.Points(
    beaconGeo,
    new THREE.ShaderMaterial({
      vertexShader: beaconVertex,
      fragmentShader: beaconFragment,
      uniforms: { uTime: shared.uTime, uPixelRatio: { value: pixelRatio } },
      ...additive,
    })
  );
  beacons.frustumCulled = false;
  group.add(beacons);

  let nextBlink = 4;
  let blinkT = -1;
  const toCam = new THREE.Vector3();

  function update(t, dt, camera) {
    // Eye hovers in front of the tower on the camera's side and stares at it.
    toCam.set(camera.position.x, 0, camera.position.z);
    const dist = toCam.length();
    toCam.normalize();
    eye.position.set(toCam.x * 120, 375, toCam.z * 120);
    eye.lookAt(camera.position);
    const near = THREE.MathUtils.clamp((dist - 150) / 250, 0, 1);
    eyeUniforms.uFade.value = near;
    eye.visible = near > 0.01;

    // Blinking.
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      const k = blinkT / 0.35;
      eyeUniforms.uOpen.value = Math.abs(Math.cos(Math.min(k, 1) * Math.PI));
      if (k >= 1) {
        blinkT = -1;
        eyeUniforms.uOpen.value = 1;
        nextBlink = t + 3 + Math.random() * 6;
      }
    }
    eyeUniforms.uLook.value.set(Math.sin(t * 0.4) * 0.35, Math.sin(t * 0.27) * 0.2);
    eyeUniforms.uGlitch.value = Math.random() < 0.03 ? 1 : eyeUniforms.uGlitch.value * 0.85;

    beams.forEach((b) => {
      const a = t * b.userData.speed + b.userData.phase;
      const e = 0.9 + 0.35 * Math.sin(t * 0.21 + b.userData.phase);
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
      b.lookAt(b.position.clone().add(dir));
    });
    halos.forEach((h) => {
      h.rotation.z += h.userData.spin * dt;
    });
  }

  return { group, update };
}
