// Procedural city plan: a street grid, lots carved out of each block, and a
// height field that pushes the corporate spires towards the center where the
// megatower stands, with low sprawl bleeding out to the edges.

export const PITCH = 58; // block + street
export const STREET = 16;
export const HALF_BLOCKS = 12;
export const PLAZA_RADIUS = 95;

export const STYLE = {
  CORP: 0,
  RESIDENTIAL: 1,
  MONOLITH: 2,
  ROOFTOP: 3,
  MEGA: 4,
};

// Deterministic PRNG so the skyline is the same every visit.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLayout(seed = 2089) {
  const rand = mulberry32(seed);
  const lots = [];
  const block = PITCH - STREET;

  for (let bx = -HALF_BLOCKS; bx <= HALF_BLOCKS; bx++) {
    for (let bz = -HALF_BLOCKS; bz <= HALF_BLOCKS; bz++) {
      const cx = bx * PITCH;
      const cz = bz * PITCH;
      const dist = Math.hypot(cx, cz);
      if (dist < PLAZA_RADIUS + block * 0.5) continue;

      // Denser subdivision in the sprawl, big footprints in the core.
      const core = Math.exp(-dist / 260);
      const k = core > 0.45 ? (rand() < 0.5 ? 1 : 2) : rand() < 0.35 ? 2 : 3;
      const gap = 2.5;
      const cell = (block - gap * (k - 1)) / k;

      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          // Occasionally merge into a vacant lot / courtyard.
          if (k > 1 && rand() < 0.06) continue;
          const x = cx - block / 2 + cell / 2 + i * (cell + gap);
          const z = cz - block / 2 + cell / 2 + j * (cell + gap);
          const d = Math.hypot(x, z);

          const inset = rand() * 3;
          const w = cell - inset;
          const dp = cell - rand() * 3;

          const hBase = 18 + 300 * Math.exp(-d / 210);
          let h = hBase * (0.3 + 0.95 * Math.pow(rand(), 1.4));
          if (rand() < 0.05) h *= 1.8; // rogue spire
          if (d > 520) h = 8 + rand() * 30; // outer slums
          h = Math.max(h, 8);

          let style;
          const r = rand();
          if (d > 420) style = STYLE.RESIDENTIAL;
          else if (r < 0.1) style = STYLE.MONOLITH;
          else if (h > 90 && r < 0.75) style = STYLE.CORP;
          else style = r < 0.45 ? STYLE.CORP : STYLE.RESIDENTIAL;

          lots.push({ x, z, w, d: dp, h, style, seed: rand() });

          // Setback tiers on tall towers read as layered, ominous masses.
          if (h > 120 && rand() < 0.55) {
            const tiers = 1 + Math.floor(rand() * 2);
            let tw = w;
            let td = dp;
            let th = h;
            for (let t = 0; t < tiers; t++) {
              tw *= 0.62 + rand() * 0.15;
              td *= 0.62 + rand() * 0.15;
              const extra = th * (0.18 + rand() * 0.3);
              lots.push({ x, z, w: tw, d: td, h: th + extra, style, seed: rand(), baseless: true });
              th += extra;
            }
          }

          // Rooftop clutter: water tanks, HVAC boxes, relay huts.
          const top = lots[lots.length - 1];
          const clutter = Math.floor(rand() * 4);
          for (let c = 0; c < clutter; c++) {
            const s = 1.5 + rand() * 4;
            lots.push({
              x: top.x + (rand() - 0.5) * (top.w - s),
              z: top.z + (rand() - 0.5) * (top.d - s),
              w: s,
              d: s * (0.6 + rand() * 0.8),
              h: top.h + 1 + rand() * 4,
              style: STYLE.ROOFTOP,
              seed: rand(),
              baseY: top.h,
            });
          }
        }
      }
    }
  }

  // The street centerlines, used by traffic lanes.
  const streets = [];
  for (let b = -HALF_BLOCKS; b <= HALF_BLOCKS + 1; b++) {
    streets.push(b * PITCH - PITCH / 2);
  }

  return { lots, streets, extent: (HALF_BLOCKS + 0.5) * PITCH, rand };
}
