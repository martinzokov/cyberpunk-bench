import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import '@fontsource/barlow-condensed/latin-900.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './style.css';

// NOCTIS / District 07 — a procedural city seen from its flooded arterial.
let seed = 71829;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const choice = (items) => items[Math.floor(random() * items.length)];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030712);
scene.fog = new THREE.FogExp2(0x07101e, 0.0046);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 420);
const initialPosition = new THREE.Vector3(9, 16, 76);
const initialTarget = new THREE.Vector3(0, 19, -48);
camera.position.copy(initialPosition);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
document.querySelector('#scene').append(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.18, 0.55, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(initialTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 18;
controls.maxDistance = 155;
controls.maxPolarAngle = Math.PI * 0.49;
controls.enablePan = true;
controls.update();

const palette = { cyan: 0x49fff0, blue: 0x308de9, magenta: 0xff337c, amber: 0xffbd59, violet: 0xae71ff, ice: 0xb9edff };
const black = new THREE.MeshStandardMaterial({ color: 0x080f1b, roughness: 0.42, metalness: 0.75 });
const dark = new THREE.MeshStandardMaterial({ color: 0x101c2b, roughness: 0.55, metalness: 0.55 });
const trim = new THREE.MeshStandardMaterial({ color: 0x24364a, roughness: 0.35, metalness: 0.72 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x14546a, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.62, side: THREE.DoubleSide });
const emissive = (color, intensity = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
const neons = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, emissive(color, 1.8)]));
const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);

function block(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(box, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}
function line(parent, points, color, radius = 0.045) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(2, points.length * 3), radius, 5, false), emissive(color));
  parent.add(mesh);
  return mesh;
}
function light(x, y, z, color, power, distance) {
  const source = new THREE.PointLight(color, power, distance, 2);
  source.position.set(x, y, z);
  scene.add(source);
}
function makeText(text, color = '#7dfff0', opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = opts.width ?? 512;
  canvas.height = opts.height ?? 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = opts.glow ?? 28;
  ctx.fillStyle = color;
  ctx.font = `${opts.weight ?? 800} ${opts.size ?? 92}px ${opts.font ?? 'Arial, sans-serif'}`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 22);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
}
function sign(x, y, z, w, h, text, color, background = '#07111b', rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  scene.add(group);
  block(group, 0, 0, 0, w + 0.3, h + 0.3, 0.25, black);
  const face = new THREE.Mesh(plane, makeText(text, color, { background, size: Math.min(104, 480 / text.length), width: 512, height: 180 }));
  face.scale.set(w, h, 1);
  face.position.z = 0.14;
  group.add(face);
  const c = new THREE.Color(color);
  line(group, [[-w / 2, -h / 2, 0.18], [-w / 2, h / 2, 0.18], [w / 2, h / 2, 0.18], [w / 2, -h / 2, 0.18]], c, 0.07);
  return group;
}

// Horizon: layered silhouettes retain a sense of scale through the smog.
const skylineMats = [new THREE.MeshBasicMaterial({ color: 0x08101d }), new THREE.MeshBasicMaterial({ color: 0x0b1726 }), new THREE.MeshBasicMaterial({ color: 0x101e2d })];
for (let layer = 0; layer < 3; layer++) {
  for (let i = 0; i < 55; i++) {
    const x = (i - 27) * 7 + (random() - 0.5) * 4;
    const h = 14 + random() * (32 + layer * 15);
    const z = -168 + layer * 12 + random() * 10;
    block(scene, x, h / 2 - 2, z, 3 + random() * 7, h, 5 + random() * 8, skylineMats[layer]);
  }
}
const moon = new THREE.Mesh(new THREE.SphereGeometry(17, 32, 16), new THREE.MeshBasicMaterial({ color: 0x44576b, fog: false }));
moon.position.set(-72, 88, -183);
scene.add(moon);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 64);
  g.addColorStop(0, '#8ca8d555'); g.addColorStop(0.3, '#6580b020'); g.addColorStop(1, '#6580b000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})(), transparent: true, depthWrite: false, fog: false }));
moonHalo.position.copy(moon.position); moonHalo.scale.set(95, 95, 1); scene.add(moonHalo);

// The black Helix arcology controls the visual axis of the district.
const hq = new THREE.Group(); hq.position.set(0, 0, -133); scene.add(hq);
block(hq, 0, 47, 0, 25, 94, 21, black);
for (let level = 0; level < 4; level++) {
  const w = 29 - level * 3.3;
  const height = 13;
  block(hq, 0, 82 + level * 12, 0, w, height, 18 - level * 1.5, black);
  line(hq, [[-w / 2, 89 + level * 12, 9 - level * 0.75], [w / 2, 89 + level * 12, 9 - level * 0.75]], palette.cyan, 0.12);
}
block(hq, 0, 125, 0, 3, 20, 3, trim);
block(hq, 0, 136, 0, 0.35, 18, 0.35, neons.magenta);
for (let y = 9; y < 91; y += 3.3) {
  const c = y % 10 < 4 ? neons.cyan : dark;
  for (const x of [-11, 11]) block(hq, x, y, 10.55, 0.2, 0.65, 0.09, c);
  if (y % 7 < 3.4) line(hq, [[-12.5, y, 10.6], [12.5, y, 10.6]], palette.blue, 0.04);
}
line(hq, [[-13, 4, 11], [-13, 95, 11], [-9, 110, 9], [-3, 128, 5]], palette.cyan, 0.12);
line(hq, [[13, 4, 11], [13, 95, 11], [9, 110, 9], [3, 128, 5]], palette.magenta, 0.12);
const eye = new THREE.Group(); eye.position.set(0, 75, 12.4); hq.add(eye);
eye.add(new THREE.Mesh(new THREE.TorusGeometry(9.7, 0.23, 10, 80), neons.cyan));
eye.add(new THREE.Mesh(new THREE.TorusGeometry(7.7, 0.10, 8, 80), neons.magenta));
eye.add(new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.12, 8, 80), neons.cyan));
const iris = new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 16), new THREE.MeshBasicMaterial({ color: 0x06171d }));
iris.scale.z = 0.14; eye.add(iris);
eye.add(new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), neons.magenta));
const spokes = new THREE.Group(); eye.add(spokes);
for (let i = 0; i < 12; i++) {
  const a = i * Math.PI / 6;
  line(spokes, [[Math.cos(a) * 8.2, Math.sin(a) * 8.2, 0.2], [Math.cos(a) * 9.2, Math.sin(a) * 9.2, 0.2]], palette.cyan, 0.09);
}
const hqLabel = new THREE.Mesh(plane, makeText('H E L I X', '#dcffff', { width: 700, height: 120, size: 72 }));
hqLabel.position.set(0, 50, 10.85); hqLabel.scale.set(19, 3.2, 1); hq.add(hqLabel);
light(0, 75, -119, palette.cyan, 220, 60);

// One facade texture is shared across most towers; offsets in the mesh and
// silhouette make the repetition read as a dense city rather than a grid.
function facadeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#0a1421'; ctx.fillRect(0, 0, 256, 512);
  for (let row = 0; row < 32; row++) for (let col = 0; col < 12; col++) {
    const v = random();
    ctx.fillStyle = v < 0.37 ? '#091624' : v < 0.47 ? '#1b4050' : v < 0.79 ? '#329eab' : v < 0.91 ? '#b9d8c2' : '#c9748b';
    ctx.globalAlpha = v < 0.37 ? 0.8 : 0.4 + random() * 0.45;
    ctx.fillRect(col * 21 + 4, row * 16 + 3, 12, 7);
    if (v > 0.83) { ctx.fillStyle = '#d3efff'; ctx.fillRect(col * 21 + 5, row * 16 + 4, 10, 1); }
  }
  ctx.globalAlpha = 1;
  for (let y = 0; y < 512; y += 16) { ctx.fillStyle = '#172a39'; ctx.fillRect(0, y, 256, 1); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
const facadeMap = facadeTexture();
const facade = new THREE.MeshStandardMaterial({ map: facadeMap, emissiveMap: facadeMap, color: 0xc8e4ef, emissive: 0x78cde0, emissiveIntensity: 1.35, roughness: 0.48, metalness: 0.18 });
const buildingData = [];
for (const side of [-1, 1]) {
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 17; i++) {
      const z = 56 - i * 12.6 + (random() - 0.5) * 2;
      const x = side * (24 + row * 15 + random() * 5);
      const h = (row ? 20 : 29) + random() * (row ? 38 : 57);
      const w = 8 + random() * 6;
      const d = 8 + random() * 8;
      const building = new THREE.Group(); building.position.set(x, 0, z); scene.add(building);
      block(building, 0, h / 2, 0, w, h, d, facade);
      block(building, 0, h + 0.7, 0, w + 0.6, 1.4, d + 0.6, black);
      block(building, 0, h + 1.7, 0, w * 0.62, 1.8, d * 0.64, trim);
      const neon = choice([palette.cyan, palette.magenta, palette.blue, palette.violet]);
      if (random() < 0.74) {
        line(building, [[-w / 2, 0, d / 2 + 0.07], [-w / 2, h + 0.7, d / 2 + 0.07], [w / 2, h + 0.7, d / 2 + 0.07]], neon, 0.05);
      }
      if (random() < 0.7) line(building, [[-w / 2, h * 0.68, d / 2 + 0.12], [w / 2, h * 0.68, d / 2 + 0.12]], neon, 0.075);
      if (random() < 0.32) {
        const tower = block(building, 0, h + 4.5, 0, 0.35, 8, 0.35, trim);
        tower.rotation.z = (random() - 0.5) * 0.2;
        block(building, 0, h + 9, 0, 0.55, 1, 0.55, neons.magenta);
      }
      buildingData.push({ x, z, h, w, d, side, row });
    }
  }
}

// Street furniture and advertisements make the lower canyon inhabited.
const adWords = ['SYNTH//LIFE', 'NEUROLINK', 'ECHO 2089', 'VOID BANK', 'DREAMS™', 'NO EXIT', 'KAIROS', 'OWN TOMORROW'];
let adIndex = 0;
for (const b of buildingData) {
  if (b.row || b.z < -95 || b.z > 50 || adIndex >= 28 || random() < 0.5) continue;
  const color = choice(['#5ffff1', '#ff3c87', '#ffc060', '#a783ff']);
  const z = b.z + b.d / 2 + 0.45;
  sign(b.x, Math.min(b.h * 0.43, 25), z, Math.min(b.w * 0.92, 10), 3.3 + random() * 2, choice(adWords), color);
  adIndex++;
}
sign(-21.6, 14, 23, 11, 6.5, 'MEMORY', '#ff3e84', '#170b1d', 0.16);
sign(21.5, 16, 0, 11, 7, 'CONTROL', '#6bfff3', '#071d24', -0.13);
sign(-21.5, 20, -50, 9, 8, 'OBEY', '#ffc168', '#201012', 0.11);
sign(17.8, 34, 29, 6, 12, 'HELI×', '#ff4686', '#1d0c24', -0.23);
sign(-18.5, 27, 4, 5, 12, 'NOVA', '#63fff1', '#091d29', 0.22);
for (const b of buildingData) {
  if (b.row || b.z > 40 || b.z < -95 || random() > 0.32) continue;
  sign(b.x - b.side * (b.w / 2 + 0.18), Math.min(b.h * 0.52, 32), b.z, Math.min(b.d * 0.78, 10), 3.8, choice(adWords), choice(['#ff5d91', '#55ffed', '#f6bf75']), '#081722', -b.side * Math.PI / 2);
}

// Elevated cross-city transit and suspended conduit cables.
for (const z of [-35, -91]) {
  block(scene, 0, 20, z, 72, 2.3, 6.2, black);
  block(scene, 0, 21.25, z - 2.9, 72, 0.15, 0.3, neons.cyan);
  block(scene, 0, 21.25, z + 2.9, 72, 0.15, 0.3, neons.magenta);
  for (let x = -32; x < 34; x += 6) {
    block(scene, x, 18.5, z + 3.3, 0.18, 1.6, 0.2, neons.cyan);
  }
  block(scene, -31, 10, z, 2, 20, 2, trim);
  block(scene, 31, 10, z, 2, 20, 2, trim);
}
for (let i = 0; i < 9; i++) {
  const z = 48 - i * 24;
  line(scene, [[-39, 46, z], [-15, 35, z - 5], [12, 33, z - 7], [42, 47, z - 4]], palette.blue, 0.035);
  line(scene, [[-39, 44.5, z], [-15, 33.5, z - 5], [12, 31.5, z - 7], [42, 45.5, z - 4]], palette.magenta, 0.025);
}

// Asphalt is layered with shallow pools and fragmented neon reflections.
block(scene, 0, -0.6, -30, 46, 1, 300, new THREE.MeshStandardMaterial({ color: 0x070d15, metalness: 0.8, roughness: 0.22 }));
for (const side of [-1, 1]) {
  block(scene, side * 24, 0.04, -30, 3, 0.18, 300, dark);
  block(scene, side * 22.25, 0.08, -30, 0.15, 0.1, 300, neons.cyan);
  for (let i = 0; i < 28; i++) {
    const z = 80 - i * 10;
    block(scene, side * 21, 0.13, z, 0.16, 0.04, 3.5, emissive(i % 3 ? palette.cyan : palette.magenta, 1.1));
    if (i % 2 === 0) {
      block(scene, side * 20, 1.5, z, 0.2, 3, 0.2, trim);
      block(scene, side * 20, 3.1, z, 0.5, 0.22, 0.5, neons.amber);
    }
  }
}
for (let i = 0; i < 24; i++) {
  const z = 78 - i * 12;
  block(scene, 0, 0.035, z, 0.15, 0.03, 3.4, neons.amber);
}
const puddleMaterial = new THREE.MeshBasicMaterial({ color: 0x10223b, transparent: true, opacity: 0.4, depthWrite: false });
for (let i = 0; i < 160; i++) {
  const z = 72 - random() * 258;
  const x = (random() - 0.5) * 41;
  const w = 0.1 + random() * 2.2;
  block(scene, x, 0.015 + random() * 0.005, z, w, 0.004, 0.2 + random() * 4, puddleMaterial);
  if (random() < 0.55) block(scene, x + 0.3, 0.023, z, w * 0.25, 0.003, 0.5 + random() * 3, choice([neons.cyan, neons.magenta, neons.amber]));
}

// Small, repeated ships travel separate traffic corridors.
const vehicles = [];
function vehicle(x, y, z, direction, color) {
  const craft = new THREE.Group(); scene.add(craft); craft.position.set(x, y, z);
  block(craft, 0, 0, 0, 2.1, 0.65, 4.7, black);
  block(craft, 0, 0.42, -0.25 * direction, 1.45, 0.75, 2.6, glass);
  block(craft, 0, -0.36, 0, 1.5, 0.08, 3.6, emissive(color, 1.3));
  for (const sx of [-0.85, 0.85]) {
    block(craft, sx, -0.1, 1.9 * direction, 0.45, 0.18, 0.12, neons.magenta);
    block(craft, sx, -0.1, -2.15 * direction, 0.38, 0.12, 0.12, neons.ice);
  }
  vehicles.push({ craft, x, y, direction, speed: 9 + random() * 11, baseZ: z, bob: random() * 6.28 });
}
for (let i = 0; i < 16; i++) vehicle(choice([-13, -7, 7, 13]) + random() * 1.4, 2.4 + random() * 4, -140 + i * 15 + random() * 20, i % 2 ? 1 : -1, choice([palette.cyan, palette.blue, palette.magenta]));
for (let i = 0; i < 7; i++) vehicle(choice([-30, -27, 27, 30]), 24 + random() * 12, -145 + random() * 190, i % 2 ? 1 : -1, palette.violet);

// Rain uses one dynamic point cloud, so the weather remains cheap to animate.
const rainCount = innerWidth < 700 ? 900 : 1900;
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = (random() - 0.5) * 125;
  rainPositions[i * 3 + 1] = random() * 85;
  rainPositions[i * 3 + 2] = 75 - random() * 220;
}
const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0x8dc9e9, size: 0.17, transparent: true, opacity: 0.56, depthWrite: false }));
scene.add(rain);

scene.add(new THREE.AmbientLight(0x6b87b5, 0.55));
const key = new THREE.DirectionalLight(0x688db9, 0.8); key.position.set(-60, 100, -90); scene.add(key);
light(-18, 13, 20, palette.magenta, 95, 35);
light(20, 14, -4, palette.cyan, 95, 35);
light(-20, 15, -52, palette.amber, 80, 30);
light(0, 23, -35, palette.cyan, 55, 40);

let touring = true;
let raining = true;
let userMoved = false;
controls.addEventListener('start', () => { userMoved = true; touring = false; document.querySelector('#tour').setAttribute('aria-pressed', 'false'); });
document.querySelector('#tour').addEventListener('click', (event) => {
  touring = !touring;
  if (touring) userMoved = false;
  event.currentTarget.setAttribute('aria-pressed', String(touring));
});
document.querySelector('#rain').addEventListener('click', (event) => {
  raining = !raining; rain.visible = raining;
  event.currentTarget.setAttribute('aria-pressed', String(raining));
  event.currentTarget.innerHTML = raining ? '◈ &nbsp; RAIN ON' : '◇ &nbsp; RAIN OFF';
});
document.querySelector('#reset').addEventListener('click', () => {
  camera.position.copy(initialPosition);
  controls.target.copy(initialTarget);
  controls.update();
  touring = true; userMoved = false;
  document.querySelector('#tour').setAttribute('aria-pressed', 'true');
});

function resize() {
  const width = innerWidth;
  const height = innerHeight;
  camera.aspect = width / height;
  camera.fov = width < 700 ? 70 : 58;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (touring && !userMoved) {
    const a = t * 0.095;
    camera.position.set(8 + Math.sin(a) * 5, 16 + Math.sin(a * 0.57) * 2, 74 + Math.cos(a * 0.8) * 5);
    controls.target.set(Math.sin(a * 0.48) * 4, 20, -47);
  }
  spokes.rotation.z = t * 0.13;
  eye.rotation.z = Math.sin(t * 0.4) * 0.025;
  for (const v of vehicles) {
    v.craft.position.z = v.baseZ + ((t * v.speed * v.direction + 500) % 275) - 135;
    v.craft.position.y = v.y + Math.sin(t * 2 + v.bob) * 0.13;
  }
  if (raining) {
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3 + 1] -= dt * (24 + i % 17);
      rainPositions[i * 3] += dt * 4.5;
      if (rainPositions[i * 3 + 1] < 0) { rainPositions[i * 3 + 1] = 80; rainPositions[i * 3] -= 25; }
    }
    rainGeometry.attributes.position.needsUpdate = true;
  }
  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}
animate();
