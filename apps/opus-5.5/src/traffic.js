import * as THREE from 'three';

// Flying traffic: streams of spinners threading the street canyons at several
// altitudes. Each vehicle is a dark hull plus white headlights and red tail
// lights, all instanced; bloom turns the lights into streaks.

const LANE_ALTITUDES = [28, 46, 70, 105, 150];

export function createTraffic(layout, rand) {
  const { streets, extent } = layout;
  const lanes = [];
  for (const s of streets) {
    if (Math.abs(s) < 95) continue; // keep clear of the megatower
    for (const alt of LANE_ALTITUDES) {
      if (rand() < 0.45) continue;
      const axis = rand() < 0.5 ? 'x' : 'z';
      const dir = rand() < 0.5 ? 1 : -1;
      const offset = (rand() - 0.5) * 6;
      lanes.push({ axis, dir, coord: s + offset, alt: alt + (rand() - 0.5) * 6, speed: 30 + rand() * 45 });
    }
  }

  const cars = [];
  for (const lane of lanes) {
    const n = 2 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      cars.push({
        lane,
        t: (rand() * 2 - 1) * extent,
        speed: lane.speed * (0.8 + rand() * 0.4),
        bob: rand() * 10,
        police: rand() < 0.025,
      });
    }
  }
  const count = cars.length;

  const hullGeo = new THREE.BoxGeometry(2.2, 0.9, 4.8);
  const hull = new THREE.InstancedMesh(hullGeo, new THREE.MeshBasicMaterial({ color: 0x07070c }), count);
  const lightGeo = new THREE.BoxGeometry(1.8, 0.35, 1.6);
  const lights = new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), count * 2);

  const white = new THREE.Color(3.2, 3.0, 2.6);
  const red = new THREE.Color(3.5, 0.15, 0.1);
  const blue = new THREE.Color(0.2, 0.5, 4.0);
  for (let i = 0; i < count; i++) {
    lights.setColorAt(i * 2, white);
    lights.setColorAt(i * 2 + 1, red);
  }
  hull.frustumCulled = false;
  lights.frustumCulled = false;

  const group = new THREE.Group();
  group.add(hull, lights);

  const obj = new THREE.Object3D();
  const fwd = new THREE.Vector3();
  const span = extent * 2;

  function update(t, dt) {
    for (let i = 0; i < count; i++) {
      const c = cars[i];
      const L = c.lane;
      c.t += c.speed * L.dir * dt;
      if (c.t > extent) c.t -= span;
      if (c.t < -extent) c.t += span;
      const y = L.alt + Math.sin(t * 0.8 + c.bob) * 0.8;
      if (L.axis === 'x') {
        obj.position.set(c.t, y, L.coord);
        fwd.set(L.dir, 0, 0);
      } else {
        obj.position.set(L.coord, y, c.t);
        fwd.set(0, 0, L.dir);
      }
      obj.rotation.set(0, Math.atan2(fwd.x, fwd.z), Math.sin(t + c.bob) * 0.05);
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      hull.setMatrixAt(i, obj.matrix);

      const px = obj.position.x;
      const pz = obj.position.z;
      // Head lights, stretched into short streaks.
      obj.position.set(px + fwd.x * 2.6, y, pz + fwd.z * 2.6);
      obj.scale.set(1, 1, 1.4);
      obj.updateMatrix();
      lights.setMatrixAt(i * 2, obj.matrix);
      // Tail lights, with longer streaks.
      obj.position.set(px - fwd.x * 3.4, y, pz - fwd.z * 3.4);
      obj.scale.set(1, 1, 2.2);
      obj.updateMatrix();
      lights.setMatrixAt(i * 2 + 1, obj.matrix);

      if (c.police) {
        const phase = Math.floor(t * 8 + c.bob) % 2 === 0;
        lights.setColorAt(i * 2 + 1, phase ? red : blue);
        lights.setColorAt(i * 2, phase ? blue : white);
      }
    }
    hull.instanceMatrix.needsUpdate = true;
    lights.instanceMatrix.needsUpdate = true;
    if (lights.instanceColor) lights.instanceColor.needsUpdate = true;
  }

  return { group, update };
}
