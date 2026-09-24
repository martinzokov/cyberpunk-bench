import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Lens and film: bloom for the neon, then chromatic fringing, a vignette,
// grain and a faint teal/magenta split-tone for that cheap-optics grit.

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uAberration: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    varying vec2 vUv;
    float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * 0.018 * uAberration;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + off).b;

      // Split-tone: shadows toward teal, highlights toward magenta-amber.
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col += mix(vec3(0.0, 0.012, 0.02), vec3(0.02, -0.005, 0.01), smoothstep(0.1, 0.7, l));

      // Vignette.
      col *= 1.0 - smoothstep(0.18, 0.75, r2 * 1.6);

      // Grain.
      float g = rnd(vUv * uResolution + fract(uTime * 13.7) * 100.0) - 0.5;
      col += g * 0.045;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.85, 0.55, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  function resize(w, h) {
    composer.setSize(w, h);
    const pr = renderer.getPixelRatio();
    finish.uniforms.uResolution.value.set(w * pr, h * pr);
  }
  resize(size.x, size.y);

  return {
    composer,
    bloom,
    resize,
    render(t) {
      finish.uniforms.uTime.value = t;
      composer.render();
    },
  };
}
