import * as THREE from 'three';
import { NOISE } from './shaderlib.js';

// A low, heavy sky: smog clouds lit from below by the city's neon, a sick
// orange-magenta light-pollution band on the horizon, and lightning.

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlash;
  uniform vec3 uFlashPos;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    vec3 zenith = vec3(0.004, 0.003, 0.012);
    vec3 mid = vec3(0.03, 0.01, 0.06);
    vec3 horizon = vec3(0.12, 0.025, 0.09);
    vec3 col = mix(mid, zenith, smoothstep(0.05, 0.6, h));
    col = mix(col, horizon, exp(-max(h, 0.0) * 9.0));
    // Sodium haze sitting right on the skyline.
    col += vec3(0.3, 0.09, 0.02) * exp(-abs(h) * 30.0) * 0.35;

    if (h > 0.0) {
      vec2 uv = d.xz / (h + 0.12) * 1.4;
      float c = fbm(uv + vec2(uTime * 0.008, uTime * 0.003));
      float c2 = fbm(uv * 2.3 - vec2(uTime * 0.012, 0.0));
      float clouds = smoothstep(0.35, 0.85, c * 0.7 + c2 * 0.45);
      // Underlit by the city: warmer and brighter towards the horizon.
      vec3 under = mix(vec3(0.5, 0.05, 0.35), vec3(0.08, 0.2, 0.45), smoothstep(0.0, 0.5, h));
      col += clouds * under * (0.05 + 0.14 * exp(-h * 4.0));
      // Lightning inside the clouds.
      float fl = uFlash * clouds * (0.6 + 0.4 * c2);
      float focus = pow(max(dot(d, normalize(uFlashPos)), 0.0), 6.0);
      col += fl * vec3(0.6, 0.65, 1.0) * (0.25 + 1.8 * focus);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky(shared) {
  const uniforms = {
    uTime: shared.uTime,
    uFlash: shared.uFlash,
    uFlashPos: { value: new THREE.Vector3(1, 0.4, 0) },
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}

// Endless sprawl past the edge of the detailed city: a ring of skyline
// silhouettes with pinprick windows, dissolving into the smog.
const skylineVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const skylineFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uFogLow;
  uniform vec3 uFogHigh;
  uniform float uLayer;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    float x = vUv.x * (320.0 + uLayer * 160.0);
    float id = floor(x);
    float hgt = 0.05 + 0.3 * pow(hash12(vec2(id, uLayer)), 4.0);
    hgt += 0.22 * pow(vnoise(vec2(x * 0.05, uLayer * 7.0)), 2.0);
    if (vUv.y > hgt) discard;
    vec2 w = vec2(fract(x) * 10.0, vUv.y * 220.0);
    vec2 wid = floor(w);
    float lit = step(0.9, hash12(wid + id * 13.0 + uLayer)) * step(0.3, fract(w.x)) * step(0.4, fract(w.y));
    vec3 wc = mix(vec3(1.0, 0.6, 0.3), vec3(0.4, 0.8, 1.0), hash12(wid + id));
    float haze = mix(0.55, 0.8, uLayer);
    vec3 fogCol = mix(uFogLow, uFogHigh, vUv.y * 0.6);
    vec3 col = mix(vec3(0.006, 0.005, 0.012), fogCol, haze) + lit * wc * 0.35 * (1.0 - haze * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSkyline(shared) {
  const group = new THREE.Group();
  [0, 1].forEach((layer) => {
    const r = 1500 + layer * 700;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 520 + layer * 200, 256, 1, true),
      new THREE.ShaderMaterial({
        vertexShader: skylineVertex,
        fragmentShader: skylineFragment,
        side: THREE.BackSide,
        uniforms: {
          uTime: shared.uTime,
          uFogLow: shared.uFogLow,
          uFogHigh: shared.uFogHigh,
          uLayer: { value: layer },
        },
      })
    );
    mesh.position.y = (520 + layer * 200) / 2 - 2;
    group.add(mesh);
  });
  return group;
}
