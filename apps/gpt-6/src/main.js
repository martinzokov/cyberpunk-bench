import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b16);
scene.fog = new THREE.FogExp2(0x081522, 0.0025);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.5, 900);
camera.position.set(0, 72, 225);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.querySelector('#scene').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 85, -100);
controls.enableDamping = true;
controls.minDistance = 45; controls.maxDistance = 300;
controls.maxPolarAngle = Math.PI * 0.48;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.65, 0.75));
composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight(0x81c3e0, 0x09121a, 1.5));
const moon = new THREE.DirectionalLight(0x5f9ec3, 3); moon.position.set(-70, 150, 80); scene.add(moon);
const orange = new THREE.DirectionalLight(0xff7645, 1.8); orange.position.set(40, 70, -100); scene.add(orange);
let seed = 92841;
function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
const metal = new THREE.MeshStandardMaterial({ color: 0x13202a, metalness: 0.72, roughness: 0.4 });
const dark = new THREE.MeshStandardMaterial({ color: 0x0b131e, metalness: 0.6, roughness: 0.55 });
const concrete = new THREE.MeshStandardMaterial({ color: 0x23343b, metalness: 0.35, roughness: 0.7 });
const cyan = new THREE.MeshBasicMaterial({ color: 0x42e6df });
const amber = new THREE.MeshBasicMaterial({ color: 0xff6936 });
const pink = new THREE.MeshBasicMaterial({ color: 0xf6539e });
for (const mat of [cyan, amber, pink]) mat.color.multiplyScalar(3);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(x,y,z,w,h,d,material=metal,parent=scene){const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function tube(points, radius, material, parent=scene){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,6,false),material);parent.add(m);return m;}
function sign(text,sub,w,h,color='#63f5e9'){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#06141c';ctx.fillRect(0,0,1024,512);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(18,18,988,476);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 118px sans-serif';ctx.fillText(text,512,245);ctx.font='28px monospace';ctx.fillText(sub,512,335);for(let y=0;y<512;y+=7){ctx.fillStyle='#00000020';ctx.fillRect(0,y,1024,2);}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
}
// A shared facade texture keeps the dense skyline inexpensive.
const facade=document.createElement('canvas');facade.width=128;facade.height=256;
const fc=facade.getContext('2d');fc.fillStyle='#0c1822';fc.fillRect(0,0,128,256);
for(let y=4;y<256;y+=8)for(let x=3;x<128;x+=8){const r=rand();fc.fillStyle=r>0.78?'#93d4cc':r>0.52?'#40616b':r>0.46?'#d39866':'#132630';fc.fillRect(x,y,3,4);}
const facadeTex=new THREE.CanvasTexture(facade);facadeTex.colorSpace=THREE.SRGBColorSpace;facadeTex.magFilter=THREE.NearestFilter;
const buildingMat=new THREE.MeshStandardMaterial({map:facadeTex,emissiveMap:facadeTex,emissive:0x91c6dc,emissiveIntensity:0.6,roughness:0.55,metalness:0.6});
// Canal and its reflected canyon.
box(0,-3,-90,520,5,650,dark);
const water=new Reflector(new THREE.PlaneGeometry(78,560),{clipBias:0.01,textureWidth:Math.min(1536,innerWidth),textureHeight:Math.min(1024,innerHeight),color:0x526d79});
water.rotation.x=-Math.PI/2;water.position.set(0,-0.35,-85);scene.add(water);
const rippleMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){float w=sin(vUv.y*1800.+sin(vUv.x*90.+time)*3.+time*2.);float a=smoothstep(.92,1.,w)*.13;gl_FragColor=vec4(.16,.43,.49,a+.10);}'});
const ripples=new THREE.Mesh(new THREE.PlaneGeometry(78,560),rippleMat);ripples.rotation.x=-Math.PI/2;ripples.position.copy(water.position);ripples.position.y+=0.05;scene.add(ripples);
for(const side of [-1,1]){
 box(side*48,0,-85,18,3,550,concrete);box(side*39.5,1.2,-85,.4,.35,550,cyan);
 for(let z=-320;z<180;z+=22){box(side*40,3,z,1,6,1,metal);box(side*40,6,z,1.8,.4,1.8,amber);}
 for(let row=0;row<5;row++)for(let j=0;j<17;j++){
  const x=side*(62+row*30+rand()*9),z=125-j*29+rand()*8;
  const h=18+rand()*65+row*7,w=16+rand()*12,d=17+rand()*9;
  box(x,h/2,z,w,h,d,buildingMat);box(x,h+1,z,w+1,2,d+1,metal);
  if(rand()>.45){box(x+w*.35,h+5,z,.5,9,.5,metal);box(x+w*.35,h+9.5,z,.7,.7,.7,amber);}
  if(row===0){box(x-side*(w/2+.1),h*.55,z,.3,h*.72,.6,j%3===0?pink:cyan);for(let k=0;k<3;k++)box(x,h*.3+k*3,z+d/2+.1,w*.8,.25,.2,cyan);}
  if(row===0&&j%3===0){const s=sign(['KŌEN','夜市場','MEMORY','新世界','NO SIGNAL','HOTEL'][j%6],'OPEN ALL NIGHT / SECTOR 09',w*.9,9,j%2?'#ff764a':'#62f4e5');s.position.set(x,h*.68,z+d/2+.2);scene.add(s);}
 }
}
// Helios headquarters: a monumental split tower and suspended solar relay.
for(const side of [-1,1]){
 box(side*24,70,-130,29,140,32,dark);
 box(side*24,72,-111.8,23,133,2,buildingMat);
 box(side*39,72,-112,.7,140,.7,amber);
 for(let y=10;y<145;y+=12)box(side*24,y,-110,29,.6,1,metal);
 box(side*24,143,-130,34,5,38,concrete);
 box(side*24,161,-130,2,35,2,metal);
}
box(0,112,-130,24,9,27,metal);
const logo=sign('HELIOS','YOUR FUTURE. OUR PROPERTY.',47,21,'#ff8651');logo.position.set(0,128,-108);scene.add(logo);
const halo=new THREE.Group();halo.position.set(0,183,-132);halo.rotation.x=.20;scene.add(halo);
for(const [radius,width,mat] of [[35,2.2,metal],[32.5,.55,amber],[37,.25,amber]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,width,10,160),mat);halo.add(ring);}
for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const m=box(Math.cos(a)*35,Math.sin(a)*35,0,4,1,3,metal,halo);m.rotation.z=a;}
const core=new THREE.Mesh(new THREE.IcosahedronGeometry(10,1),new THREE.MeshBasicMaterial({color:0xff8147,wireframe:true}));halo.add(core);
// Utility conduits, crossing bridges, and the elevated maglev.
for(const z of [-70,50]){box(0,12,z,115,3,12,metal);for(const side of [-1,1]){box(side*43,6,z,3,12,8,concrete);box(0,14,z+side*5,116,.35,.4,cyan);}for(let x=-54;x<55;x+=6)box(x,15,z+5,.25,3,.25,metal);}
tube([[-180,34,30],[-85,32,0],[0,29,-25],[95,32,-38],[180,38,-65]],1.6,metal);
tube([[-180,35.5,30],[-85,33.5,0],[0,30.5,-25],[95,33.5,-38],[180,39.5,-65]],.22,cyan);
const trainTrack=new THREE.CatmullRomCurve3([new THREE.Vector3(-180,37,30),new THREE.Vector3(-85,35,0),new THREE.Vector3(0,32,-25),new THREE.Vector3(95,35,-38),new THREE.Vector3(180,41,-65)]);
const train=new THREE.Group();scene.add(train);for(let i=0;i<4;i++){box(-i*7,0,0,6.5,3,3,metal,train);box(-i*7,.5,1.53,5.8,.75,.05,cyan,train);box(-i*7,.5,-1.53,5.8,.75,.05,cyan,train);}
const flyers=[];
for(let i=0;i<28;i++){const g=new THREE.Group();box(0,0,0,3,.8,1.5,metal,g);box(-1.7,0,0,.25,.35,1.2,amber,g);box(1.7,0,0,.25,.35,1.2,cyan,g);scene.add(g);flyers.push({g,speed:8+rand()*13,phase:rand()*500,y:22+rand()*65,z:-240+rand()*360});}
const rainCount=6500,positions=new Float32Array(rainCount*6);
for(let i=0;i<rainCount;i++){const x=(rand()-.5)*330,y=rand()*200,z=(rand()-.5)*400-60;positions.set([x,y,z,x-.35,y-2.5,z],i*6);}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0x88b6cd,transparent:true,opacity:.2,depthWrite:false}));scene.add(rain);
let flying=true;
const tourButton=document.querySelector('#tour');
function setFlight(value){flying=value;tourButton.textContent=value?'Pause flight':'Resume flight';tourButton.setAttribute('aria-pressed',String(value));}
tourButton.onclick=()=>setFlight(!flying);
controls.addEventListener('start',()=>setFlight(false));
document.querySelector('#rain').onclick=e=>{rain.visible=!rain.visible;e.target.textContent=rain.visible?'Rain on':'Rain off';e.target.setAttribute('aria-pressed',String(rain.visible));};
document.querySelector('#reset').onclick=()=>{camera.position.set(0,72,225);controls.target.set(0,85,-100);setFlight(true);};
const clock=new THREE.Clock();let elapsed=0;
renderer.setAnimationLoop(()=>{
 const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
 if(flying){camera.position.set(18*Math.sin(elapsed*.035),72+Math.sin(elapsed*.07)*8,225+Math.sin(elapsed*.035)*15);controls.target.set(0,85,-100);}
 controls.update();core.rotation.y=elapsed*.25;core.rotation.z=elapsed*.1;rippleMat.uniforms.time.value=elapsed;
 for(const f of flyers){f.g.position.set(((elapsed*f.speed+f.phase)%500)-250,f.y+Math.sin(elapsed*.5+f.phase),f.z);}
 const t=(elapsed*.025)%1;train.position.copy(trainTrack.getPointAt(t));const tangent=trainTrack.getTangentAt(t);train.rotation.y=-Math.atan2(tangent.z,tangent.x);
 if(rain.visible){for(let i=0;i<rainCount;i++){const p=i*6;positions[p+1]-=dt*48;positions[p+4]-=dt*48;if(positions[p+1]<0){positions[p+1]+=200;positions[p+4]+=200;}}rainGeo.attributes.position.needsUpdate=true;}
 composer.render();
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);controls.dispose();composer.dispose();renderer.dispose();});
