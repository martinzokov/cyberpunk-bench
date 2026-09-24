import * as THREE from 'three';
import { FOG } from './shaderlib.js';

// All advertising in the city lives on one canvas-drawn texture atlas and is
// rendered by a single instanced mesh. Corporate propaganda, street kanji,
// body-mod clinics and memory brokers, all glowing through the smog.

const ATLAS = 2048;

const HORIZONTAL = [
  { title: 'VANTA-SHIGURE', sub: 'ヴァンタ・シグレ  ·  WE OWN TOMORROW', color: '#ff2a3d', bg: '#140004' },
  { title: 'NEURO//LINK', sub: 'THINK FASTER. OWE MORE.', color: '#2ef6ff', bg: '#00121a' },
  { title: 'SYNTH 酒', sub: 'DRINK. FORGET. REPEAT.', color: '#ff2bd6', bg: '#16001a' },
  { title: 'CHROME ARMS', sub: '0% APR ON LIMBS · 臓器 買取', color: '#ffb03a', bg: '#170a00' },
  { title: 'OBEY', sub: 'COMPLIANCE IS FREEDOM', color: '#ffffff', bg: '#b0001c' },
  { title: '電脳', sub: 'CYBERBRAIN CLINIC 24H', color: '#39ffb0', bg: '#00140c' },
  { title: 'MEMORY WIPE', sub: '¥999 · NO QUESTIONS', color: '#a36bff', bg: '#0b0019' },
  { title: 'HOTEL 夢', sub: 'ROOMS BY THE HOUR', color: '#ff5fa2', bg: '#1a0010' },
];

const VERTICAL = [
  { text: 'ラーメン', color: '#ff3b3b' },
  { text: '電脳街', color: '#2ef6ff' },
  { text: '夜市', color: '#ffb03a' },
  { text: '薬局', color: '#39ffb0' },
  { text: '未来', color: '#ff2bd6' },
  { text: '黒金', color: '#ff2a3d' },
  { text: 'カラオケ', color: '#a36bff' },
  { text: '闇医者', color: '#39ffb0' },
  { text: 'BAR', color: '#ff5fa2' },
  { text: 'HOTEL', color: '#2ef6ff' },
  { text: '24H', color: '#ffe14a' },
  { text: 'パチンコ', color: '#ff2bd6' },
  { text: '寿司', color: '#ff7a2e' },
  { text: '義体', color: '#2ef6ff' },
  { text: '監視中', color: '#ff2a3d' },
  { text: '自由', color: '#ffffff' },
];

const BANNERS = [
  { text: 'VANTA', sub: 'ヴァンタ', color: '#ff2a3d' },
  { text: 'SHIGURE', sub: '時雨重工', color: '#ff2a3d' },
  { text: '服従', sub: 'OBEY', color: '#2ef6ff' },
  { text: '消費', sub: 'CONSUME', color: '#ff2bd6' },
];

function glowText(ctx, text, x, y, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur * 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function fitFont(ctx, text, maxW, size, family, weight = '800') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 4;
  } while (ctx.measureText(text).width > maxW && s > 10);
}

const DISPLAY = "'Orbitron', 'Arial Black', sans-serif";
const JP = "'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', 'Meiryo', sans-serif";

function drawHorizontal(ctx, d, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = d.bg;
  ctx.fillRect(0, 0, w, h);
  // Pixel grid texture.
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = d.color;
  for (let i = 0; i < w; i += 6) ctx.fillRect(i, 0, 1, h);
  ctx.globalAlpha = 1;
  // Border tube.
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 6;
  ctx.shadowColor = d.color;
  ctx.shadowBlur = 18;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, d.title, w - 70, 104, `${DISPLAY}, ${JP}`);
  glowText(ctx, d.title, w / 2, h * 0.43, d.color, 26);
  fitFont(ctx, d.sub, w - 80, 28, `${JP}`, '700');
  glowText(ctx, d.sub, w / 2, h * 0.78, '#ffffff', 10);
  ctx.restore();
}

function drawVertical(ctx, d, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#07030a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 5;
  ctx.shadowColor = d.color;
  ctx.shadowBlur = 14;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...d.text];
  const step = (h - 40) / chars.length;
  const size = Math.min(w - 28, step * 0.86);
  ctx.font = `900 ${size}px ${JP}`;
  chars.forEach((c, i) => glowText(ctx, c, w / 2, 20 + step * (i + 0.5), d.color, 18));
  ctx.restore();
}

function drawBanner(ctx, d, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a0003');
  g.addColorStop(0.5, '#1a0006');
  g.addColorStop(1, '#0a0003');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 8;
  ctx.shadowColor = d.color;
  ctx.shadowBlur = 24;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...d.text];
  const step = (h * 0.72) / chars.length;
  ctx.font = `900 ${Math.min(w * 0.7, step * 0.9)}px ${DISPLAY}, ${JP}`;
  chars.forEach((c, i) => glowText(ctx, c, w / 2, 40 + step * (i + 0.5), d.color, 30));
  ctx.font = `700 ${w * 0.16}px ${JP}`;
  glowText(ctx, d.sub, w / 2, h * 0.88, '#ffffff', 12);
  ctx.restore();
}

function drawBlimpScreen(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#20002a');
  g.addColorStop(1, '#00161f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 120px ${DISPLAY}`;
  glowText(ctx, 'OFF-WORLD', w / 2, h * 0.3, '#2ef6ff', 30);
  ctx.font = `800 64px ${DISPLAY}`;
  glowText(ctx, 'A NEW LIFE AWAITS', w / 2, h * 0.56, '#ff2bd6', 24);
  ctx.font = `700 34px ${JP}`;
  glowText(ctx, '— for those who can afford it · 残りは残れ —', w / 2, h * 0.78, '#ffffff', 10);
  ctx.restore();
}

export function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS;
  canvas.height = ATLAS;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ATLAS, ATLAS);

  const rects = { horizontal: [], vertical: [], banner: [], blimp: null };
  const toUv = (x, y, w, h) => new THREE.Vector4(x / ATLAS, 1 - (y + h) / ATLAS, w / ATLAS, h / ATLAS);
  const pad = 4;

  HORIZONTAL.forEach((d, i) => {
    const x = (i % 4) * 512;
    const y = Math.floor(i / 4) * 256;
    drawHorizontal(ctx, d, x + pad, y + pad, 512 - pad * 2, 256 - pad * 2);
    rects.horizontal.push(toUv(x + pad, y + pad, 512 - pad * 2, 256 - pad * 2));
  });
  VERTICAL.forEach((d, i) => {
    const x = i * 128;
    const y = 512;
    drawVertical(ctx, d, x + pad, y + pad, 128 - pad * 2, 512 - pad * 2);
    rects.vertical.push(toUv(x + pad, y + pad, 128 - pad * 2, 512 - pad * 2));
  });
  BANNERS.forEach((d, i) => {
    const x = i * 256;
    const y = 1024;
    drawBanner(ctx, d, x + pad, y + pad, 256 - pad * 2, 1024 - pad * 2);
    rects.banner.push(toUv(x + pad, y + pad, 256 - pad * 2, 1024 - pad * 2));
  });
  drawBlimpScreen(ctx, 1024 + pad, 1024 + pad, 1024 - pad * 2, 512 - pad * 2);
  rects.blimp = toUv(1024 + pad, 1024 + pad, 1024 - pad * 2, 512 - pad * 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, rects };
}

const vertexShader = /* glsl */ `
  attribute vec4 aRect;
  attribute float aSeed;
  attribute float aGain;
  varying vec2 vUv;
  varying vec2 vLocalUv;
  varying float vSeed;
  varying float vGain;
  varying vec3 vWorld;
  void main() {
    vLocalUv = uv;
    vUv = aRect.xy + uv * aRect.zw;
    vSeed = aSeed;
    vGain = aGain;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uTime;
  varying vec2 vUv;
  varying vec2 vLocalUv;
  varying float vSeed;
  varying float vGain;
  varying vec3 vWorld;
  ${FOG}
  float h1(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    // Glitch: horizontal tearing on a few unlucky signs.
    float t = floor(uTime * 12.0);
    float tear = step(0.985, h1(t + vSeed * 91.0)) * (h1(t * 1.3 + floor(vLocalUv.y * 18.0)) - 0.5) * 0.04;
    vec2 uv = vUv + vec2(tear, 0.0);
    vec3 c = texture2D(uAtlas, uv).rgb;
    // Dying tubes: some signs stutter off.
    float broken = step(0.88, vSeed);
    float stutter = mix(1.0, step(0.4, h1(floor(uTime * 9.0) + vSeed * 37.0)), broken);
    float scan = 0.82 + 0.18 * sin(vLocalUv.y * 260.0 - uTime * 6.0);
    float breathe = 0.85 + 0.15 * sin(uTime * (1.0 + vSeed * 2.0) + vSeed * 40.0);
    vec3 col = c * vGain * scan * breathe * stutter;
    col = applyFog(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FACES = [
  { nx: 1, nz: 0, ry: Math.PI / 2 },
  { nx: -1, nz: 0, ry: -Math.PI / 2 },
  { nx: 0, nz: 1, ry: 0 },
  { nx: 0, nz: -1, ry: Math.PI },
];

export function createSigns(layout, atlas, shared, extra = []) {
  const { lots, rand } = layout;
  const { rects } = atlas;
  const items = [...extra];

  for (const lot of lots) {
    if (lot.style === 3 || lot.style === 4 || lot.baseY) continue;
    if (lot.h < 14) continue;
    const dist = Math.hypot(lot.x, lot.z);
    if (dist > 640) continue;
    const signCount = Math.floor(rand() * (dist < 380 ? 4 : 2.5));
    for (let s = 0; s < signCount; s++) {
      const face = FACES[Math.floor(rand() * 4)];
      const faceW = face.nx !== 0 ? lot.d : lot.w;
      const halfOut = face.nx !== 0 ? lot.w / 2 : lot.d / 2;
      const roll = rand();

      if (roll < 0.45) {
        // Blade sign sticking out of the facade, readable down the street.
        const h = 10 + rand() * 12;
        const w = h / 4;
        const y = 6 + h / 2 + rand() * Math.max(0, Math.min(lot.h, 70) - h - 8);
        const along = (rand() - 0.5) * (faceW - 2);
        const out = halfOut + w / 2 + 0.4;
        const px = lot.x + (face.nx !== 0 ? face.nx * out : along);
        const pz = lot.z + (face.nz !== 0 ? face.nz * out : along);
        items.push({
          pos: [px, y, pz],
          ry: face.ry + Math.PI / 2,
          size: [w, h],
          rect: rects.vertical[Math.floor(rand() * rects.vertical.length)],
          gain: 2.2 + rand() * 1.5,
        });
      } else if (roll < 0.85 || lot.h < 60) {
        // Flat billboard on the wall.
        const w = Math.min(faceW * 0.9, 10 + rand() * 18);
        const h = w / 2;
        if (lot.h < h + 10) continue;
        const y = 8 + h / 2 + rand() * Math.max(0, Math.min(lot.h - h - 8, 90));
        const along = (rand() - 0.5) * (faceW - w);
        const out = halfOut + 0.35;
        const px = lot.x + (face.nx !== 0 ? face.nx * out : along);
        const pz = lot.z + (face.nz !== 0 ? face.nz * out : along);
        items.push({
          pos: [px, y, pz],
          ry: face.ry,
          size: [w, h],
          rect: rects.horizontal[Math.floor(rand() * rects.horizontal.length)],
          gain: 1.8 + rand() * 1.4,
        });
      } else {
        // Towering vertical banner high on a skyscraper.
        const w = Math.min(faceW * 0.5, 8 + rand() * 8);
        const h = w * 4;
        if (lot.h < h + 30) continue;
        const y = lot.h - h / 2 - 6 - rand() * 20;
        const out = halfOut + 0.35;
        const along = (rand() - 0.5) * (faceW - w);
        const px = lot.x + (face.nx !== 0 ? face.nx * out : along);
        const pz = lot.z + (face.nz !== 0 ? face.nz * out : along);
        items.push({
          pos: [px, y, pz],
          ry: face.ry,
          size: [w, h],
          rect: rects.banner[Math.floor(rand() * rects.banner.length)],
          gain: 2.4,
        });
      }
    }
  }

  const geo = new THREE.PlaneGeometry(1, 1);
  const count = items.length;
  const aRect = new Float32Array(count * 4);
  const aSeed = new Float32Array(count);
  const aGain = new Float32Array(count);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    uniforms: {
      uAtlas: { value: atlas.texture },
      uTime: shared.uTime,
      uFogLow: shared.uFogLow,
      uFogHigh: shared.uFogHigh,
      uFogDensity: shared.uFogDensity,
    },
  });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const obj = new THREE.Object3D();
  items.forEach((it, i) => {
    obj.position.set(...it.pos);
    obj.rotation.set(0, it.ry, 0);
    obj.scale.set(it.size[0], it.size[1], 1);
    obj.updateMatrix();
    mesh.setMatrixAt(i, obj.matrix);
    aRect.set([it.rect.x, it.rect.y, it.rect.z, it.rect.w], i * 4);
    aSeed[i] = rand();
    aGain[i] = it.gain;
  });
  geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(aRect, 4));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aGain', new THREE.InstancedBufferAttribute(aGain, 1));
  mesh.frustumCulled = false;
  return mesh;
}

export function createSignMaterial(atlas, shared, rect, gain = 2.2) {
  // A standalone material showing one atlas cell, for moving objects (blimp).
  const geo = new THREE.PlaneGeometry(1, 1);
  const r = new Float32Array([rect.x, rect.y, rect.z, rect.w]);
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uAtlas: { value: atlas.texture },
        uTime: shared.uTime,
        uFogLow: shared.uFogLow,
        uFogHigh: shared.uFogHigh,
        uFogDensity: shared.uFogDensity,
      },
    }),
    1
  );
  geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(r, 4));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([0.3]), 1));
  geo.setAttribute('aGain', new THREE.InstancedBufferAttribute(new Float32Array([gain]), 1));
  mesh.setMatrixAt(0, new THREE.Matrix4());
  mesh.frustumCulled = false;
  return mesh;
}
