import * as THREE from 'three';
import { NOISE, FOG } from './shaderlib.js';

// Every building in the city is one instance of a unit box. The facade —
// window grids, lit apartments, flickering tubes, shopfront neon at street
// level, edge trims and crown lights — is all drawn procedurally in the
// fragment shader, so thousands of towers cost a single draw call.

const vertexShader = /* glsl */ `
  attribute vec3 aSize;
  attribute float aSeed;
  attribute float aStyle;
  attribute float aBase;

  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec3 vWorld;
  varying vec3 vSize;
  varying float vSeed;
  varying float vStyle;
  varying float vBase;

  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vLocal = (position + vec3(0.5, 0.0, 0.5)) * aSize;
    vNormalL = normal;
    vWorld = wp.xyz;
    vSize = aSize;
    vSeed = aSeed;
    vStyle = aStyle;
    vBase = aBase;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlash;
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec3 vWorld;
  varying vec3 vSize;
  varying float vSeed;
  varying float vStyle;
  varying float vBase;

  ${NOISE}
  ${FOG}

  vec3 neonPalette(float t) {
    if (t < 0.22) return vec3(1.0, 0.08, 0.62);   // magenta
    if (t < 0.44) return vec3(0.05, 0.85, 1.0);   // cyan
    if (t < 0.58) return vec3(1.0, 0.35, 0.05);   // sodium orange
    if (t < 0.72) return vec3(0.55, 0.15, 1.0);   // ultraviolet
    if (t < 0.84) return vec3(0.1, 1.0, 0.45);    // toxic green
    return vec3(1.0, 0.1, 0.15);                  // warning red
  }

  vec3 windowPalette(float t, float style) {
    if (style < 0.5 || style > 3.5) {
      // Corporate: cold fluorescent offices.
      if (t < 0.55) return vec3(0.55, 0.8, 1.0);
      if (t < 0.8) return vec3(0.85, 0.95, 1.0);
      return vec3(0.2, 0.9, 1.0);
    }
    // Residential: sodium, TV-blue, the odd pink neon room.
    if (t < 0.45) return vec3(1.0, 0.62, 0.3);
    if (t < 0.65) return vec3(1.0, 0.85, 0.55);
    if (t < 0.82) return vec3(0.35, 0.5, 1.0);
    return vec3(1.0, 0.25, 0.7);
  }

  void main() {
    vec3 n = vNormalL;
    float style = vStyle;
    float seed = vSeed;
    float worldY = vWorld.y;

    // Streets glow up onto the lower facades.
    vec3 streetTint = mix(vec3(1.0, 0.1, 0.55), vec3(0.1, 0.6, 1.0), vnoise(vWorld.xz * 0.012));
    float streetGlow = exp(-worldY / 22.0);

    vec3 col;

    if (n.y > 0.5) {
      // Roof: tar, grime, a faint grid of panels.
      vec2 g = fract(vLocal.xz / 3.0);
      float seam = step(0.94, max(g.x, g.y));
      col = vec3(0.012, 0.012, 0.02) + seam * 0.01;
      // A lit helipad ring on some tall towers.
      if (style < 0.5 && vSize.y > 150.0 && seed > 0.6) {
        vec2 c = vLocal.xz - vSize.xz * 0.5;
        float r = length(c);
        float ring = smoothstep(0.35, 0.0, abs(r - min(vSize.x, vSize.z) * 0.32));
        col += ring * vec3(1.0, 0.5, 0.1) * 3.0 * (0.6 + 0.4 * sin(uTime * 3.0 + seed * 20.0));
      }
    } else if (n.y < -0.5) {
      col = vec3(0.01);
    } else {
      bool sideX = abs(n.x) > 0.5;
      float u = sideX ? vLocal.z : vLocal.x;
      float faceW = sideX ? vSize.z : vSize.x;
      float faceId = sideX ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
      float v = vLocal.y;
      float absV = v + vBase;

      // Base facade: near-black concrete / smoked glass with rain streaks.
      float streaks = vnoise(vec2(u * 1.3 + faceId * 13.0, absV * 0.04 + seed * 50.0));
      vec3 facade = vec3(0.018, 0.02, 0.032) * (0.7 + 0.6 * streaks);
      if (style > 1.5 && style < 2.5) facade = vec3(0.008, 0.008, 0.012);
      col = facade;

      if (style > 2.5 && style < 3.5) {
        // Rooftop clutter: dark metal with a single status LED.
        float led = step(0.97, hash12(floor(vec2(u, v) * 1.5) + seed * 91.0));
        col += led * neonPalette(seed) * 2.0;
      } else {
        // Window grid.
        vec2 cellSize = style < 0.5 ? vec2(1.9, 3.4) : vec2(3.0, 3.1);
        if (style > 1.5 && style < 2.5) cellSize = vec2(4.5, 3.6);
        if (style > 3.5) cellSize = vec2(2.2, 4.2);
        vec2 gv = vec2(u, absV) / cellSize;
        vec2 id = floor(gv);
        vec2 f = fract(gv);
        float win = (style < 0.5 || style > 3.5)
          ? step(0.08, f.x) * step(f.x, 0.92) * step(0.14, f.y) * step(f.y, 0.86)
          : step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.78);

        float r = hash12(id + vec2(seed * 173.0 + faceId * 31.0, seed * 57.0));
        float r2 = hash12(id.yx + seed * 11.0 + faceId);
        // Whole floors dark — offices after the layoffs.
        float floorDark = step(0.72, hash12(vec2(floor(id.y / 3.0), seed * 97.0 + faceId)));
        float density = style < 0.5 ? 0.3 : 0.26;
        if (style > 1.5 && style < 2.5) density = 0.07;
        if (style > 3.5) density = 0.12;
        float lit = step(1.0 - density, r) * (1.0 - floorDark * 0.85);

        // Nothing lit in the podium's shopfront band or on the very top rows.
        float shopH = 6.0;
        lit *= step(shopH, absV);

        vec3 wc = windowPalette(r2, style);
        // The megatower's executive floors burn a colder, cleaner white.
        if (style > 3.5) wc = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.2, 0.25), step(0.9, r2));
        float flicker = 1.0;
        if (r2 > 0.965) flicker = step(0.35, fract(sin(uTime * 13.0 + r * 80.0) * 43758.0));
        float intensity = (0.25 + 0.9 * r * r * r) * flicker;
        // Blinds / silhouettes breaking up the light.
        float blinds = 0.75 + 0.25 * step(0.5, fract(f.y * 7.0 + r * 3.0));
        col += win * lit * wc * intensity * blinds;
        // Dim unlit glass still catches the city glow.
        col += win * (1.0 - lit) * vec3(0.006, 0.008, 0.015) * (1.0 + streetGlow * 3.0);

        // Corner trims.
        float edgeD = min(u, faceW - u);
        float trimOn = style > 3.5 ? 1.0 : step(0.55, hash11(seed * 331.0));
        if (style < 0.5 || style > 3.5) {
          vec3 trimCol = style > 3.5 ? vec3(1.0, 0.03, 0.08) : neonPalette(hash11(seed * 71.0));
          float trim = smoothstep(0.45, 0.0, edgeD) * trimOn;
          // Crawling pulse along the trim.
          float pulse = 0.55 + 0.45 * sin(absV * 0.05 - uTime * 2.0 + seed * 30.0);
          col += trim * trimCol * 2.4 * pulse;
        }

        // Horizontal neon bands on some towers.
        if (hash11(seed * 19.0) > 0.72 && style != 2.0) {
          float spacing = 18.0 + floor(hash11(seed * 7.0) * 3.0) * 12.0;
          float band = smoothstep(0.35, 0.0, abs(mod(absV, spacing) - spacing * 0.5) - 0.2);
          vec3 bandCol = neonPalette(hash11(seed * 3.3));
          col += band * bandCol * 2.2 * step(10.0, absV);
        }

        // Monoliths: a single blood-red vertical scar of light.
        if (style > 1.5 && style < 2.5) {
          float scar = smoothstep(0.35, 0.0, abs(u - faceW * 0.5));
          col += scar * vec3(1.0, 0.04, 0.08) * 3.0 * step(12.0, absV);
        }

        // Crown lighting on the tall ones.
        float topD = vSize.y - v;
        if (vSize.y + vBase > 110.0 && (hash11(seed * 13.7) > 0.45 || style > 3.5)) {
          float crown = smoothstep(2.2, 0.0, abs(topD - 1.2));
          vec3 crownCol = neonPalette(hash11(seed * 5.1));
          col += crown * crownCol * 3.0;
          // Up-lighting washing the top of the facade.
          col += exp(-topD / 10.0) * crownCol * 0.12;
        }

        // Street level shopfronts: bright neon panels, shutters, noodle bars.
        if (vBase < 0.5 && absV < shopH) {
          float seg = floor(u / 7.0);
          float sr = hash12(vec2(seg, seed * 41.0 + faceId));
          vec3 shopCol = neonPalette(sr);
          float fx = fract(u / 7.0);
          float panel = step(0.08, fx) * step(fx, 0.92) * step(0.6, absV) * step(absV, 4.2);
          float signBand = step(4.5, absV) * step(absV, 5.6) * step(0.1, fx) * step(fx, 0.9);
          float shutter = step(0.7, sr);
          float buzz = 0.8 + 0.2 * sin(uTime * 40.0 + sr * 100.0);
          col += panel * (1.0 - shutter) * mix(shopCol, vec3(1.0, 0.8, 0.6), 0.4) * 0.45;
          col += signBand * shopCol * 3.2 * buzz * step(0.25, sr);
          col += shutter * panel * vec3(0.03) * step(0.5, fract(absV * 3.0));
        }
      }

      // Neon bounce from the streets.
      col += streetTint * streetGlow * 0.08;
      // Lightning.
      col += uFlash * vec3(0.5, 0.55, 0.8) * 0.18 * (0.3 + 0.7 * max(n.x * 0.3 + n.z * 0.8, 0.0));
    }

    col = applyFog(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createBuildings(layout, shared) {
  const { lots } = layout;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);

  const count = lots.length;
  const aSize = new Float32Array(count * 3);
  const aSeed = new Float32Array(count);
  const aStyle = new Float32Array(count);
  const aBase = new Float32Array(count);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: shared.uTime,
      uFlash: shared.uFlash,
      uFogLow: shared.uFogLow,
      uFogHigh: shared.uFogHigh,
      uFogDensity: shared.uFogDensity,
    },
  });

  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m = new THREE.Matrix4();
  lots.forEach((lot, i) => {
    const base = lot.baseY ?? 0;
    const h = lot.h - base;
    m.makeScale(lot.w, h, lot.d);
    m.setPosition(lot.x, base, lot.z);
    mesh.setMatrixAt(i, m);
    aSize[i * 3] = lot.w;
    aSize[i * 3 + 1] = h;
    aSize[i * 3 + 2] = lot.d;
    aSeed[i] = lot.seed;
    aStyle[i] = lot.style;
    aBase[i] = base;
  });

  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(aStyle, 1));
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = false;

  return mesh;
}
