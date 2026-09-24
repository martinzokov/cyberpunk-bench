// Shared GLSL snippets used by the custom materials.

export const NOISE = /* glsl */ `
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return v;
  }
`;

// Height-aware atmospheric fog. Low-lying smog glows with the neon of the
// streets, the upper air sinks into a bruised violet dark.
export const FOG = /* glsl */ `
  uniform vec3 uFogLow;
  uniform vec3 uFogHigh;
  uniform float uFogDensity;
  vec3 applyFog(vec3 col, vec3 worldPos) {
    float d = length(worldPos - cameraPosition);
    float heightFactor = exp(-max(worldPos.y, 0.0) / 140.0);
    float f = 1.0 - exp(-pow(d * uFogDensity, 1.6) * (0.55 + 0.9 * heightFactor));
    vec3 fogCol = mix(uFogHigh, uFogLow, heightFactor);
    return mix(col, fogCol, clamp(f, 0.0, 1.0));
  }
`;
