import * as THREE from 'three';

// Acid rain: a box of streaks that wraps around the camera, animated entirely
// on the GPU.

const vertexShader = /* glsl */ `
  attribute float aEnd;
  attribute float aSpeed;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform vec3 uBox;
  varying float vFade;
  varying float vEnd;
  void main() {
    vec3 p = position;
    float fall = uTime * aSpeed;
    p.y = mod(p.y - fall, uBox.y);
    p.x = mod(p.x - uCenter.x + fall * 0.08, uBox.x) - uBox.x * 0.5 + uCenter.x;
    p.z = mod(p.z - uCenter.z, uBox.z) - uBox.z * 0.5 + uCenter.z;
    p.y += uCenter.y - uBox.y * 0.5;
    // Streak along the velocity.
    p += vec3(0.08, -1.0, 0.0) * aEnd * aSpeed * 0.028;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    vFade = smoothstep(2.0, 12.0, d) * (1.0 - smoothstep(uBox.x * 0.25, uBox.x * 0.5, d));
    vEnd = aEnd;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vFade;
  varying float vEnd;
  void main() {
    float a = vFade * mix(1.0, 0.2, vEnd) * uOpacity;
    gl_FragColor = vec4(vec3(0.55, 0.7, 1.0) * a, 1.0);
  }
`;

export function createRain(count, shared) {
  const box = new THREE.Vector3(260, 160, 260);
  const pos = new Float32Array(count * 6);
  const end = new Float32Array(count * 2);
  const speed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * box.x;
    const y = Math.random() * box.y;
    const z = Math.random() * box.z;
    const s = 70 + Math.random() * 50;
    pos.set([x, y, z, x, y, z], i * 6);
    end.set([0, 1], i * 2);
    speed.set([s, s], i * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const uniforms = {
    uTime: shared.uTime,
    uCenter: { value: new THREE.Vector3() },
    uBox: { value: box },
    uOpacity: { value: 0.22 },
  };
  const rain = new THREE.LineSegments(
    geo,
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  rain.frustumCulled = false;

  function update(camera) {
    uniforms.uCenter.value.copy(camera.position);
  }
  return { mesh: rain, uniforms, update };
}
