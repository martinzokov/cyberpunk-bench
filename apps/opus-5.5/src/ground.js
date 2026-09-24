import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE, FOG } from './shaderlib.js';
import { PITCH, STREET, PLAZA_RADIUS } from './layout.js';

// Rain-soaked asphalt: a planar reflection of the whole city, broken up by
// puddles, ripples and road grime so the neon smears across the streets.

const shader = {
  name: 'WetStreetShader',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTime: { value: 0 },
    uFogLow: { value: new THREE.Color() },
    uFogHigh: { value: new THREE.Color() },
    uFogDensity: { value: 0 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec4 vUv;
    varying vec3 vWorld;
    ${NOISE}
    ${FOG}

    void main() {
      vec2 xz = vWorld.xz;
      float P = ${PITCH.toFixed(1)};
      float S = ${STREET.toFixed(1)};
      vec2 q = mod(xz + P * 0.5, P);
      vec2 ds = min(q, P - q);
      float street = step(min(ds.x, ds.y), S * 0.5);
      float r = length(xz);
      float plaza = step(r, ${PLAZA_RADIUS.toFixed(1)} + 20.0);

      // Puddles and grime.
      float puddle = smoothstep(0.45, 0.62, fbm(xz * 0.035 + 3.0));
      float grime = fbm(xz * 0.25);

      // Rain ripples perturb the reflection.
      vec2 rip = vec2(
        vnoise(xz * 1.6 + vec2(uTime * 3.1, 0.0)),
        vnoise(xz * 1.6 + vec2(0.0, uTime * 2.7) + 7.0)
      ) - 0.5;
      float rough = mix(0.035, 0.006, puddle);
      vec4 uv = vUv;
      uv.xy += rip * rough * uv.w;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;

      vec3 base = vec3(0.012, 0.012, 0.018) * (0.6 + 0.8 * grime);
      float reflAmt = mix(0.28, 0.85, puddle) * mix(0.6, 1.0, street);

      // Lane markings.
      float dashZ = step(0.5, fract(xz.y / 6.0));
      float dashX = step(0.5, fract(xz.x / 6.0));
      float markV = smoothstep(0.22, 0.05, ds.x) * dashZ * step(S * 0.5, ds.y);
      float markH = smoothstep(0.22, 0.05, ds.y) * dashX * step(S * 0.5, ds.x);
      vec3 marks = vec3(1.0, 0.55, 0.12) * (markV + markH) * 0.25 * (1.0 - puddle * 0.7);

      // Corporate plaza: concentric red inlays around the megatower.
      float rings = smoothstep(0.35, 0.0, abs(fract(r / 14.0) - 0.5) * 14.0 - 6.6);
      vec3 plazaCol = vec3(1.0, 0.03, 0.08) * rings * plaza * 0.9 * (0.7 + 0.3 * sin(r * 0.08 - uTime * 1.5));
      base = mix(base, vec3(0.006, 0.006, 0.01), plaza);

      vec3 col = base * color + refl * reflAmt + marks + plazaCol;
      col = applyFog(col, vWorld);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createGround(size, shared, renderer) {
  const pr = Math.min(renderer.getPixelRatio(), 1.5);
  const ground = new Reflector(new THREE.PlaneGeometry(size, size), {
    shader,
    clipBias: 0.003,
    textureWidth: Math.floor(window.innerWidth * pr * 0.5),
    textureHeight: Math.floor(window.innerHeight * pr * 0.5),
    color: 0xffffff,
  });
  ground.rotation.x = -Math.PI / 2;
  const u = ground.material.uniforms;
  u.uTime = shared.uTime;
  u.uFogLow = shared.uFogLow;
  u.uFogHigh = shared.uFogHigh;
  u.uFogDensity = shared.uFogDensity;

  function resize(w, h) {
    ground.getRenderTarget().setSize(Math.floor(w * pr * 0.5), Math.floor(h * pr * 0.5));
  }
  return { mesh: ground, resize };
}
