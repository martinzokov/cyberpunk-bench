import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { buildLayout, mulberry32 } from './layout.js';
import { createBuildings } from './buildings.js';
import { createAtlas, createSigns, createSignMaterial } from './signs.js';
import { addMegatower, towerBannerItems, createTowerExtras } from './tower.js';
import { createTraffic } from './traffic.js';
import { createRain } from './rain.js';
import { createSky, createSkyline } from './sky.js';
import { createGround } from './ground.js';
import { createPost } from './post.js';

const isMobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;

async function loadFonts() {
  if (!document.fonts) return;
  const timeout = new Promise((r) => setTimeout(r, 1500));
  await Promise.race([
    Promise.all([
      document.fonts.load("800 64px 'Orbitron'"),
      document.fonts.load("500 32px 'Orbitron'"),
    ]).catch(() => {}),
    timeout,
  ]);
}

async function init() {
  await loadFonts();

  // ------------------------------------------------------------ renderer
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0414, 0.0014);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 6000);

  // Uniforms shared by every custom material.
  const shared = {
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFogLow: { value: new THREE.Color(0.05, 0.012, 0.05) },
    uFogHigh: { value: new THREE.Color(0.006, 0.004, 0.016) },
    uFogDensity: { value: 0.00155 },
  };

  // ------------------------------------------------------------ world
  const layout = buildLayout(2089);
  addMegatower(layout);

  scene.add(createBuildings(layout, shared));

  const atlas = createAtlas();
  scene.add(createSigns(layout, atlas, shared, towerBannerItems(atlas.rects)));

  const tower = createTowerExtras(layout, shared, pixelRatio);
  scene.add(tower.group);

  const traffic = createTraffic(layout, mulberry32(77));
  scene.add(traffic.group);

  const rain = createRain(isMobile ? 7000 : 18000, shared);
  scene.add(rain.mesh);

  const sky = createSky(shared);
  scene.add(sky.mesh);
  scene.add(createSkyline(shared));

  const ground = createGround(9000, shared, renderer);
  scene.add(ground.mesh);

  // The advertising blimp: a slow black leviathan selling escape to the rich.
  const blimp = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x06060a })
  );
  hull.scale.set(70, 17, 17);
  blimp.add(hull);
  for (const side of [1, -1]) {
    const screen = createSignMaterial(atlas, shared, atlas.rects.blimp, 2.6);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0, side * 17.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side > 0 ? 0 : Math.PI, 0)),
      new THREE.Vector3(80, 22, 1)
    );
    screen.setMatrixAt(0, m);
    blimp.add(screen);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 1), hull.material);
  fin.position.set(-66, 6, 0);
  blimp.add(fin);
  scene.add(blimp);

  // ------------------------------------------------------------ camera
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 30;
  controls.maxDistance = 1500;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.target.set(0, 170, 0);

  const introFrom = new THREE.Vector3(1100, 950, 1300);
  const introTo = isMobile ? new THREE.Vector3(560, 110, 700) : new THREE.Vector3(430, 70, 540);
  camera.position.copy(introFrom);
  camera.lookAt(controls.target);
  let introT = 0;
  const INTRO = 7;
  controls.enabled = false;

  // Cinematic flight through the canyons, looping forever.
  const P = 58;
  const flightPts = [
    [8, 40, 8], [8, 55, -2], [5, 90, -6], [0, 140, -5], [-4, 70, -8], [-8, 35, -5],
    [-8, 50, 2], [-6, 120, 5], [-2, 200, 6], [4, 110, 7], [7, 60, 5],
  ].map(([x, y, z]) => new THREE.Vector3(x * P - P / 2, y, z * P - P / 2));
  const flight = new THREE.CatmullRomCurve3(flightPts, true, 'centripetal');
  let cinematic = false;
  let flightU = 0;
  const lookTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  // ------------------------------------------------------------ post
  const post = createPost(renderer, scene, camera);

  // ------------------------------------------------------------ HUD
  const hud = document.getElementById('hud');
  const camMode = document.getElementById('cam-mode');
  const scoreEl = document.getElementById('score');
  const rainEl = document.getElementById('rain-pct');
  const tickerEl = document.getElementById('ticker');
  const tickerItems = [
    ['VNTA', '+4.21%', 'up'], ['NEWS', 'Water rationing extended to Sectors 4–9', 'news'],
    ['NRLK', '+12.7%', 'up'], ['KRGN', '-3.02%', 'down'],
    ['NEWS', 'VANTA-SHIGURE acquires municipal police for ¥1', 'news'],
    ['ORGN', '+0.88%', 'up'], ['NEWS', 'Off-world lottery: 1 winner, 40M entrants', 'news'],
    ['SYNS', '-7.44%', 'down'], ['NEWS', 'Memory audits now mandatory for debtors', 'news'],
    ['CHRM', '+2.19%', 'up'], ['NEWS', 'Acid index critical — remain indoors if you can afford one', 'news'],
    ['HMNT', '-19.6%', 'down'], ['NEWS', 'Unregistered dreams are a Class C offense', 'news'],
  ];
  tickerEl.innerHTML = tickerItems
    .map(([a, b, cls]) => (cls === 'news' ? `<span class="news">▲ ${b}</span>` : `${a} <span class="${cls}">${b}</span>`))
    .join('<i>//</i>');
  let score = 412;
  let rainOn = true;

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'h') hud.classList.toggle('hidden');
    if (k === 'r') {
      rainOn = !rainOn;
      rain.mesh.visible = rainOn;
      rainEl.textContent = rainOn ? '87%' : 'PAUSED';
    }
    if (k === 'c') {
      cinematic = !cinematic;
      introT = INTRO;
      controls.enabled = !cinematic;
      camMode.textContent = cinematic ? 'FLIGHT' : 'ORBIT';
      if (!cinematic) {
        // Hand back to orbit from wherever the flight left us.
        camera.getWorldDirection(tmp);
        controls.target.copy(camera.position).addScaledVector(tmp, 200);
        controls.target.y = Math.max(controls.target.y, 20);
      }
    }
  });
  let idle = 0;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    idle = 0;
  });

  // ------------------------------------------------------------ resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.resize(w, h);
    ground.resize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ------------------------------------------------------------ lightning
  let nextStrike = 6 + Math.random() * 8;
  let strikeT = -1;

  // ------------------------------------------------------------ loop
  const clock = new THREE.Timer();
  let t = 0;
  let scoreTimer = 0;

  function frame() {
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    shared.uTime.value = t;

    // Intro fly-in.
    if (introT < INTRO) {
      introT += dt;
      const k = Math.min(introT / INTRO, 1);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(introFrom, introTo, e);
      camera.position.y = THREE.MathUtils.lerp(introFrom.y, introTo.y, Math.pow(e, 0.7));
      camera.lookAt(controls.target);
      if (k >= 1) controls.enabled = true;
    } else if (cinematic) {
      flightU = (flightU + dt / 120) % 1;
      flight.getPointAt(flightU, camera.position);
      flight.getPointAt((flightU + 0.012) % 1, lookTarget);
      // Keep glancing back at the tower so it looms over every turn.
      tmp.set(0, 330, 0);
      lookTarget.lerp(tmp, 0.25);
      camera.lookAt(lookTarget);
    } else {
      if (!controls.autoRotate) {
        idle += dt;
        if (idle > 8) controls.autoRotate = true;
      }
      controls.update();
    }

    // Lightning.
    if (t > nextStrike && strikeT < 0) {
      strikeT = 0;
      const a = Math.random() * Math.PI * 2;
      sky.uniforms.uFlashPos.value.set(Math.cos(a), 0.35 + Math.random() * 0.3, Math.sin(a));
    }
    if (strikeT >= 0) {
      strikeT += dt;
      const f = Math.max(0, Math.exp(-strikeT * 9) + 0.8 * Math.exp(-Math.pow((strikeT - 0.22) * 18, 2)) + 0.4 * Math.exp(-Math.pow((strikeT - 0.4) * 22, 2)));
      shared.uFlash.value = f;
      if (strikeT > 1) {
        strikeT = -1;
        shared.uFlash.value = 0;
        nextStrike = t + 9 + Math.random() * 16;
      }
    }

    // Blimp.
    const ba = t * 0.03;
    blimp.position.set(Math.cos(ba) * 420, 270 + Math.sin(t * 0.2) * 6, Math.sin(ba) * 420);
    blimp.rotation.y = -ba - Math.PI / 2;

    tower.update(t, dt, camera);
    traffic.update(t, dt);
    rain.update(camera);
    sky.mesh.position.copy(camera.position);

    scoreTimer += dt;
    if (scoreTimer > 1.2) {
      scoreTimer = 0;
      score = Math.max(0, score + Math.round((Math.random() - 0.62) * 9));
      scoreEl.textContent = String(score);
    }

    post.render(t);
    raf = requestAnimationFrame(frame);
  }
  let raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      clock.update();
      raf = requestAnimationFrame(frame);
    }
  });

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
  });
}

init();
