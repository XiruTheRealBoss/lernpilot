/**
 * The Ascend reference's WebGL planet, ported to a module (three r0.143 — its shader injection
 * relies on that version's chunk names) and recoloured to the school's blue / orange / white.
 * Mounted only on the landing page. Returns a cleanup function.
 */
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { BOOKS, DRIFT, bookSlots, slid } from '@/lib/book-layout'
import { COVER_FONTS, coverCanvas, loadCover, spineCanvas } from './book-covers'

const ASSET_BASE_URL = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2'
const PLANET_GLB = `${ASSET_BASE_URL}/planet.glb`
const PLANET_LIGHTS_GLB = `${ASSET_BASE_URL}/planet-lights.glb`
const PLANET_CLOUDS_PNG = `${ASSET_BASE_URL}/planet-clouds.png`

const CONFIG = {
  rimColor: '#cfe0ff', rimPower: 2.4, nightLights: 10, terrainDepth: 0.33, terrainShade: 1.3,
  oceanGlint: 0.45, oceanDeep: 0.12, oceanFlow: 3, oceanFlowSpeed: 0.8, oceanFlowScale: 2.1,
  glowColor: '#2f6bff', glowIntensity: 3.35, planetRadius: 1.95, spin: 0.03, initRotation: 2.07,
  tilt: 0.37,
  cloud1Height: 1.005, cloud1Opacity: 0.6, cloud1Spin: 0.06,
  cloud2Height: 1.03, cloud2Opacity: 0.5, cloud2Spin: 0.14,
  cloud3Height: 1.075, cloud3Opacity: 0.5, cloud3Spin: 0.1,
  bgColor: '#020a1c', flameColor: '#2f6bff', flameColor2: '#ff8a3d', flameAmt: 0.15,
  atmoColor: '#a9c8ff', atmoCount: 320, atmoSize: 22, atmoSpeed: 0.8,
  starColor: '#e3ecff', starCount: 1400, starSize: 1.6, starFlicker: 1,
  markerColor: '#ff8a3d', markerCount: 60, markerSize: 16, markerSpeed: 0.5,
}
const SUN = 'vec3(-0.9, 0.18, 0.4)' // light direction baked in the reference shaders (view space)
const MOON_JPG = 'https://threejs.org/examples/textures/planets/moon_1024.jpg'
/** Backgrounds to compare on the landing: /?fundo=noite | amanhecer | lua (default: terra). */
const VARIANTS: Record<string, { sun: string; glow?: string; rim?: string; glowIntensity?: number; heroY?: number; heroS?: number; moon?: boolean; desk?: boolean; books?: boolean }> = {
  terra: { sun: SUN },
  noite: { sun: 'vec3(0.75, 0.3, -0.58)', glowIntensity: 2.2 },
  amanhecer: { sun: 'vec3(0.0, 0.94, 0.34)', glow: '#ff7a2e', rim: '#ffd2a8', glowIntensity: 3.8, heroY: -7.6, heroS: 3.4 },
  // classroom desk globe: the same Earth on a brass stand, lit from the front, no clouds/space glow
  globo: { sun: 'vec3(-0.75, 0.45, -0.5)', glowIntensity: 0, rim: '#ffffff', heroY: -1.0, heroS: 0.5, desk: true },
  // study books floating where the globe was
  livros: { sun: SUN, glow: '#2f6bff', glowIntensity: 0.5, heroY: -2.45, heroS: 1.0, books: true },
  lua: { sun: 'vec3(-0.82, 0.3, 0.48)', glow: '#8fa8d8', glowIntensity: 0.55, heroY: -3.9, heroS: 1.7, moon: true },
}
const LAYERS = { TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 }

const STOPS_X = [{ p: 0, v: 0 }, { p: 0.32, v: -3.1 }, { p: 0.64, v: 3.2 }, { p: 1, v: 0 }]
const BASE_Y = [{ p: 0, v: -4.5 }, { p: 0.32, v: 0.55 }, { p: 0.64, v: 0.45 }, { p: 1, v: 0.15 }]
const BASE_S = [{ p: 0, v: 2.15 }, { p: 0.32, v: 1.0 }, { p: 0.64, v: 0.92 }, { p: 1, v: 1.12 }]
const ENTRY_DUR = 1.9
const ENTRY_START_Y = -6.5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hexToVec3 = (hex: string) => {
  const c = new THREE.Color(hex)
  return new THREE.Vector3(c.r, c.g, c.b)
}
const sample = (stops: { p: number; v: number }[], p: number) => {
  if (p <= stops[0].p) return stops[0].v
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p)
      return a.v + (b.v - a.v) * (t * t * (3 - 2 * t))
    }
  }
  return stops[stops.length - 1].v
}

const SNOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

const FinalPass = {
  uniforms: {
    iTime: { value: 0 },
    tDiffuse: { value: null },
    torusTexture: { value: null },
    bloomTexture: { value: null },
    haloTexture: { value: null },
    uBg: { value: hexToVec3(CONFIG.bgColor) },
    uFlameA: { value: hexToVec3(CONFIG.flameColor) },
    uFlameB: { value: hexToVec3(CONFIG.flameColor2) },
    uFlameAmt: { value: CONFIG.flameAmt },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
    uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
    varying vec2 vUv;
    vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
      pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
      pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
      pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
      return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
    void main(){
      vec2 uv = 2.*vUv - 1.;
      vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
      vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
      flame *= smoothstep(0.25, 1., abs(uv.y));
      float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
      vec3 bg = uBg * (1.0 - 0.4 * length(uv));
      vec3 halo = texture2D(haloTexture, vUv).xyz;
      gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
    }`,
}

const PLANET_FRAGMENT = /* glsl */ `
#include <dithering_fragment>
vec3 normalizedNormal = normalize(vNormal);
vec3 viewDir = normalize(vViewPosition);
float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.7;
vec3 currentColor = gl_FragColor.rgb;
float blueDom = currentColor.b - max(currentColor.r, currentColor.g);
float waterMask = clamp(smoothstep(-0.005, 0.03, blueDom), 0.0, 1.0);
float shimmer = snoise(vec3(vCustomUv.x * noiseScale + time * speedX, vCustomUv.y * noiseScale - time * speedY, time * speedZ));
gl_FragColor.rgb += waterMask * shimmer * 0.025;
float fT = time * oceanFlowSpeed * 4.0;
float fS = 4.0 * oceanFlowScale;
float warp = snoise(vec3(vCustomUv.x * fS - fT * 0.5, vCustomUv.y * fS + fT * 0.4, fT * 0.5));
float flow = snoise(vec3(vCustomUv.x * fS * 2.0 + fT * 0.6 + warp, vCustomUv.y * fS * 2.0 - fT * 0.5, fT * 0.7));
flow = warp * 0.6 + flow * 0.4;
gl_FragColor.rgb += waterMask * flow * 0.12 * oceanFlow;
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
vec3 finalColor = mix(gl_FragColor.rgb, rimColor, rim);
gl_FragColor = vec4(finalColor, 1.0);
vec3 surfPos = -vViewPosition;
float terrH = dot(texture2D(map, vCustomUv).rgb, vec3(0.299, 0.587, 0.114));
vec3 sigX = dFdx(surfPos), sigY = dFdy(surfPos);
vec3 vR1 = cross(sigY, normalizedNormal), vR2 = cross(normalizedNormal, sigX);
float fDet = dot(sigX, vR1);
vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - terrainDepth * vGrad);
vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);
vec3 cityLights = texture2D(nightBlendTexture, vCustomUv).rgb * gl_FragColor.rgb * nightLights;
vec3 viewSunDir = normalize(vec3(-0.9, 0.18, 0.4));
float ndl = dot(normalizedNormal, viewSunDir);
float dayAmt = smoothstep(-0.05, 0.35, ndl);
float relief = dot(shadeNormal, viewSunDir) - ndl;
gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.55, 1.6);
float nightFactor  = smoothstep(0.18, -0.30, ndl);
float lightsFactor = smoothstep(0.30, -0.35, ndl);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);
gl_FragColor.rgb += cityLights * lightsFactor;
vec3 halfDir = normalize(viewSunDir + viewDir);
float ripple = snoise(vec3(vCustomUv * 240.0, time * 4.0));
float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
float glint = pow(ndh, 140.0);
gl_FragColor.rgb += glint * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);
`

const CLOUD_FRAGMENT = /* glsl */ `
#include <dithering_fragment>
gl_FragColor.rgb = vec3(1.0);
float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
float cloudEdge = pow(1.0 - cloudNdv, 3.0);
float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
gl_FragColor.a *= cloudMod * uOpacity * cloudDay;
`

export function mountPlanet(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; variant?: string | null }): () => void {
  const V = VARIANTS[opts.variant ?? ''] ?? VARIANTS.livros // the globe is still at ?fundo=terra
  const STOPS_Y = BASE_Y.map((p, i) => (i === 0 && V.heroY !== undefined ? { ...p, v: V.heroY } : p))
  const STOPS_S = BASE_S.map((p, i) => (i === 0 && V.heroS !== undefined ? { ...p, v: V.heroS } : p))
  let renderer: THREE.WebGL1Renderer
  try {
    renderer = new THREE.WebGL1Renderer({ canvas, antialias: true })
  } catch {
    canvas.dataset.failed = 'true' // CSS shows the static gradient instead
    return () => undefined
  }
  const disposables: { dispose: () => void }[] = []
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 8)
  camera.layers.enable(LAYERS.TORUS_SCENE)
  camera.layers.enable(LAYERS.BLOOM_SCENE)
  camera.layers.enable(LAYERS.ENTIRE_SCENE)
  scene.add(camera)

  const ambient = new THREE.AmbientLight(0xffffff, 1.8)
  const sun = new THREE.DirectionalLight(0xffffff, 0.8)
  sun.position.set(0, 10, 2)
  ambient.layers.set(LAYERS.ENTIRE_SCENE)
  sun.layers.set(LAYERS.ENTIRE_SCENE)
  scene.add(ambient, sun)
  if (V.books) {
    // the globe wants flat, strong light; printed covers want a soft key light from the upper left
    ambient.intensity = 0.8
    sun.intensity = 0.7
    sun.position.set(-4, 6, 7)
  }

  const size = new THREE.Vector2()
  const w0 = window.innerWidth
  const h0 = window.innerHeight
  renderer.setSize(w0, h0, false)

  const torusComposer = new EffectComposer(renderer)
  torusComposer.renderToScreen = false
  torusComposer.addPass(new RenderPass(scene, camera))
  torusComposer.addPass(new ShaderPass(GammaCorrectionShader))
  torusComposer.addPass(new UnrealBloomPass(new THREE.Vector2(w0, h0), 0.22, 0.2, 0))
  torusComposer.addPass(new ShaderPass(CopyShader))

  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new RenderPass(scene, camera))
  bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(w0, h0), 0.5, 0.6, 0))
  bloomComposer.addPass(new ShaderPass(GammaCorrectionShader))

  const finalComposer = new EffectComposer(renderer)
  finalComposer.addPass(new RenderPass(scene, camera))
  const finalPass = new ShaderPass(FinalPass)
  finalComposer.addPass(finalPass)

  // --- groups
  const worldGroup = new THREE.Group()
  const planetGroup = new THREE.Group()
  const cloudGroup = new THREE.Group()
  planetGroup.rotation.z = CONFIG.tilt
  cloudGroup.rotation.z = CONFIG.tilt
  worldGroup.add(planetGroup, cloudGroup)
  worldGroup.position.set(STOPS_X[0].v, STOPS_Y[0].v, 0)
  worldGroup.scale.setScalar(STOPS_S[0].v)
  scene.add(worldGroup)

  // --- atmosphere halo (billboard)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: hexToVec3(V.glow ?? CONFIG.glowColor) }, uIntensity: { value: V.glowIntensity ?? CONFIG.glowIntensity } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(uGlow * a * uIntensity, a); }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glowGeo = new THREE.PlaneGeometry(2, 2)
  const glowMesh = new THREE.Mesh(glowGeo, glowMat)
  glowMesh.scale.setScalar(CONFIG.planetRadius * 2.3)
  // same pass as the planet, so the planet's depth hides the halo's centre and only the rim glows
  glowMesh.layers.set(LAYERS.ENTIRE_SCENE)
  worldGroup.add(glowMesh)
  disposables.push(glowMat, glowGeo)

  // --- shared clocks
  let planetTime = 0
  let cloudTime = 0
  let starTime = 0
  let markerTime = 0

  // --- clouds
  const cloudTex = new THREE.TextureLoader().load(PLANET_CLOUDS_PNG)
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping
  cloudTex.repeat.set(5, 5)
  disposables.push(cloudTex)
  const cloudUniformTime = { value: 0 }
  const cloudLayers = [
    { h: CONFIG.cloud1Height, o: CONFIG.cloud1Opacity, s: CONFIG.cloud1Spin, ry: 0.0, phase: 0.0 },
    { h: CONFIG.cloud2Height, o: CONFIG.cloud2Opacity, s: CONFIG.cloud2Spin, ry: 2.2, phase: 13.0 },
    { h: CONFIG.cloud3Height, o: CONFIG.cloud3Opacity, s: CONFIG.cloud3Spin, ry: 4.3, phase: 27.0 },
  ]
  const cloudMeshes = cloudLayers.map((layer) => {
    const geo = new THREE.SphereGeometry(CONFIG.planetRadius * layer.h, 64, 64)
    const mat = new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false })
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uTime: cloudUniformTime,
        noiseScale: { value: 20 },
        uSpeedX: { value: 1 },
        uSpeedY: { value: 2 },
        uSpeedZ: { value: 2 },
        uOpacity: { value: layer.o },
        uPhase: { value: layer.phase },
      })
      shader.vertexShader = `varying vec2 vCloudUv;\n${shader.vertexShader}`.replace('void main() {', 'void main() {\n  vCloudUv = uv;')
      shader.fragmentShader =
        `uniform float uTime; uniform float noiseScale; uniform float uSpeedX; uniform float uSpeedY; uniform float uSpeedZ; uniform float uOpacity; uniform float uPhase;\nvarying vec2 vCloudUv;\n${SNOISE}\n${shader.fragmentShader}`.replace(
          '#include <dithering_fragment>',
          CLOUD_FRAGMENT.split(SUN).join(V.sun),
        )
    }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.y = layer.ry
    mesh.renderOrder = 2
    mesh.visible = false
    mesh.frustumCulled = false
    mesh.layers.set(LAYERS.TORUS_SCENE)
    cloudGroup.add(mesh)
    disposables.push(geo, mat)
    return { mesh, spin: layer.s }
  })

  // --- ambient motes
  const atmoGeo = new THREE.BufferGeometry()
  {
    const n = CONFIG.atmoCount
    const pos = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const seeds = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 2 - 1
      pos[i * 3 + 1] = Math.random() * 2 - 1
      pos[i * 3 + 2] = Math.random() * 2 - 1
      sizes[i] = CONFIG.atmoSize * (0.4 + Math.random())
      seeds[i] = Math.random()
    }
    atmoGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    atmoGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    atmoGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
  }
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uColor: { value: new THREE.Color(CONFIG.atmoColor) } },
    vertexShader: `attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
      varying float vA;
      vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
        p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
        p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
        return cos(p+vec3(1,2,4)); }
      void main(){
        vec3 v = position*4.0 + warp(position, uTime)*1.2;
        vec4 mv = modelViewMatrix * vec4(v, 1.0);
        float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
        vA = farF * nearF;
        gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
        float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
  const atmo = new THREE.Points(atmoGeo, atmoMat)
  atmo.frustumCulled = false
  atmo.layers.set(LAYERS.ENTIRE_SCENE)
  atmo.onBeforeRender = () => {
    const now = performance.now() / 1000
    atmoMat.uniforms.uTime.value = now * CONFIG.atmoSpeed * 8
    atmo.position.copy(camera.position)
    finalPass.uniforms.iTime.value = now
  }
  scene.add(atmo)
  disposables.push(atmoGeo, atmoMat)

  // --- starfield
  const starGeo = new THREE.BufferGeometry()
  {
    const n = CONFIG.starCount
    const pos = new Float32Array(n * 3)
    const seeds = new Float32Array(n)
    const bright = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      pos[i * 3] = 90 * r * Math.cos(th)
      pos[i * 3 + 1] = 90 * u
      pos[i * 3 + 2] = 90 * r * Math.sin(th)
      seeds[i] = Math.random() * 100
      bright[i] = 0.35 + Math.random() * 0.65
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    starGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
    starGeo.setAttribute('bright', new THREE.BufferAttribute(bright, 1))
  }
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: CONFIG.starSize },
      uFlicker: { value: CONFIG.starFlicker },
      uColor: { value: new THREE.Color(CONFIG.starColor) },
      uRes: { value: new THREE.Vector2() },
    },
    vertexShader: `attribute float seed; attribute float bright;
      uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes;
      varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed);
        vTw = bright * tw;
        gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vTw;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
        float core = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor, core * vTw); }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
  const stars = new THREE.Points(starGeo, starMat)
  stars.frustumCulled = false
  stars.layers.set(LAYERS.ENTIRE_SCENE)
  scene.add(stars)
  disposables.push(starGeo, starMat)

  // --- planet + markers (async)
  const planetUniformTime = { value: 0 }
  const markerUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(CONFIG.markerColor) },
    uSize: { value: CONFIG.markerSize },
    uSpeed: { value: CONFIG.markerSpeed },
    uRes: { value: new THREE.Vector2() },
  }
  let entryT = -1 // -1 = waiting below the fold; 0..1 = rising
  // Heavy steps (shader compiles, texture uploads, markers) run one per frame while the planet is
  // still below the fold; only then does it start rising. Nothing is frustum-culled meanwhile, so the
  // GPU work really happens here and not in the middle of the animation.
  const queue: (() => void)[] = []
  const start = () => {
    entryT = opts.reducedMotion ? 1 : 0
    canvas.dataset.ready = 'true'
  }
  let disposed = false

  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const gltf = new GLTFLoader()
  gltf.setDRACOLoader(draco)
  disposables.push(draco)

  const firstMesh = (root: THREE.Object3D) => {
    let found: THREE.Mesh | null = null
    root.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh
    })
    return found as THREE.Mesh | null
  }

  const addMarkers = (mesh: THREE.Mesh) => {
    const mat = mesh.material as THREE.MeshStandardMaterial
    const img = mat.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined
    const geo = mesh.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute
    if (!img || !posAttr || !uvAttr) return
    const cv = document.createElement('canvas')
    cv.width = 512
    cv.height = Math.max(1, Math.round((512 * img.height) / img.width))
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0, cv.width, cv.height)
    const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data
    const index = geo.getIndex()
    const triCount = index ? index.count / 3 : posAttr.count / 3
    const vi = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const tri = new THREE.Triangle()
    const cum = new Float32Array(triCount)
    let total = 0
    for (let t = 0; t < triCount; t++) {
      a.fromBufferAttribute(posAttr, vi(t, 0))
      b.fromBufferAttribute(posAttr, vi(t, 1))
      c.fromBufferAttribute(posAttr, vi(t, 2))
      total += tri.set(a, b, c).getArea()
      cum[t] = total
    }
    const positions: number[] = []
    const seeds: number[] = []
    const ua = new THREE.Vector2()
    const ub = new THREE.Vector2()
    const uc = new THREE.Vector2()
    for (let tries = 0; positions.length / 3 < CONFIG.markerCount && tries < CONFIG.markerCount * 60; tries++) {
      const r = Math.random() * total
      let lo = 0
      let hi = triCount - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cum[mid] < r) lo = mid + 1
        else hi = mid
      }
      let u = Math.random()
      let v = Math.random()
      if (u + v > 1) {
        u = 1 - u
        v = 1 - v
      }
      const w = 1 - u - v
      ua.fromBufferAttribute(uvAttr, vi(lo, 0))
      ub.fromBufferAttribute(uvAttr, vi(lo, 1))
      uc.fromBufferAttribute(uvAttr, vi(lo, 2))
      const tu = ua.x * w + ub.x * u + uc.x * v
      const tv = ua.y * w + ub.y * u + uc.y * v
      const px = Math.min(cv.width - 1, Math.max(0, Math.floor((((tu % 1) + 1) % 1) * cv.width)))
      const py = Math.min(cv.height - 1, Math.max(0, Math.floor((((tv % 1) + 1) % 1) * cv.height)))
      const o = (py * cv.width + px) * 4
      const cr = pixels[o]
      const cg = pixels[o + 1]
      const cb = pixels[o + 2]
      if (cb > cr + 6 && cb > cg + 6) continue // ocean
      a.fromBufferAttribute(posAttr, vi(lo, 0))
      b.fromBufferAttribute(posAttr, vi(lo, 1))
      c.fromBufferAttribute(posAttr, vi(lo, 2))
      const p = a.multiplyScalar(w).add(b.multiplyScalar(u)).add(c.multiplyScalar(v)).multiplyScalar(1.012)
      positions.push(p.x, p.y, p.z)
      seeds.push(Math.random())
    }
    const mgeo = new THREE.BufferGeometry()
    mgeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    mgeo.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1))
    const mmat = new THREE.ShaderMaterial({
      uniforms: markerUniforms,
      vertexShader: `attribute float seed; uniform float uSize; uniform vec2 uRes;
        varying float vSeed; varying float vFade;
        void main(){
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 vn = normalize(normalMatrix * normalize(position));
          vec3 vd = normalize(-mv.xyz);
          vFade = smoothstep(0.15, 0.5, dot(vn, vd));
          gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uSpeed;
        varying float vSeed; varying float vFade;
        void main(){
          if (vFade <= 0.001) discard;
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p) * 2.0;
          if (d > 1.0) discard;
          float core = smoothstep(0.30, 0.0, d) * 1.2;
          float ph = fract(uTime * uSpeed + vSeed);
          float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
          gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade);
        }`,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const markers = new THREE.Points(mgeo, mmat)
    markers.frustumCulled = false
    markers.layers.set(LAYERS.BLOOM_SCENE)
    mesh.add(markers)
    disposables.push(mgeo, mmat)
  }

  // ---- floating study books (default background) ----
  // The cluster follows the globe's scroll path (worldGroup) and the globe's turn becomes an orbit of
  // the slots, so covers keep facing the reader. Outer group: drift + sway. Inner group: full twirls.
  type Floater = { g: THREE.Group; twirl: THREE.Group; x: number; y: number; z: number; rx: number; ry: number; rz: number; f: number[]; p: number[]; turns: number; every: number; at: number; order: number }
  const floaters: Floater[] = []
  const bookGroup = new THREE.Group()
  bookGroup.scale.setScalar(0.78)
  const ORBIT_AXIS = new THREE.Vector3(-Math.sin(CONFIG.tilt), Math.cos(CONFIG.tilt), 0)
  const TWIRL = 2.8 // seconds one full turn takes: slow on purpose, a quick one reads as a jerk
  const DASH = 0.85 // seconds a book takes to cross its track (1.2 felt slow; much under 0.7 reads as a jerk)
  const DASH_GAP = 1.9 // seconds between one book's dash and the next book's: they go one at a time
  const smooth = (t: number) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2
  const v3 = new THREE.Vector3()
  const buildBooks = (photos: (HTMLImageElement | null)[]) => {
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 // fixed seed: same motion on every visit
    const paper = new THREE.MeshStandardMaterial({ color: '#efe6d3', roughness: 0.95, metalness: 0 })
    const gPages = new THREE.BoxGeometry(0.93, 1.32, 0.16)
    const gCover = new THREE.BoxGeometry(1, 1.4, 0.03)
    // the spine sits outside the covers' edge and is a hair deeper, so no two faces share a plane (no flicker)
    const gSpine = new THREE.BoxGeometry(0.03, 1.4, 0.23)
    const gLeaf = new THREE.BoxGeometry(0.94, 1.33, 0.012)
    const gHinge = new THREE.BoxGeometry(0.05, 1.4, 0.12)
    disposables.push(paper, gPages, gCover, gSpine, gLeaf, gHinge)
    const aniso = renderer.capabilities.getMaxAnisotropy()
    const texture = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c)
      t.encoding = THREE.sRGBEncoding
      t.anisotropy = aniso
      disposables.push(t)
      queue.push(() => renderer.initTexture(t)) // one upload per frame, while the books are still out of view
      return t
    }
    const slots = bookSlots()
    BOOKS.forEach((b, i) => {
      const mat = (map?: THREE.Texture) => {
        const m = new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : b.color, map: map ?? null, roughness: 0.66, metalness: 0 })
        disposables.push(m)
        return m
      }
      const plain = mat()
      const face = mat(texture(coverCanvas(b, photos[i])))
      const spine = mat(texture(spineCanvas(b)))
      const twirl = new THREE.Group()
      const part = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x: number, z: number, parent: THREE.Object3D = twirl) => {
        const mesh = new THREE.Mesh(geo, m)
        mesh.position.set(x, 0, z)
        mesh.layers.set(LAYERS.ENTIRE_SCENE)
        mesh.frustumCulled = false
        parent.add(mesh)
      }
      // box faces are +x, -x, +y, -y, +z, -z; the back carries the same artwork, so a turned book is never blank
      const front = [plain, plain, plain, plain, face, plain]
      const back = [plain, plain, plain, plain, plain, face]
      if (b.open) {
        // open book: two covers hinged on the spine and the pages fanned between them
        const leaf = (angle: number, geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x: number) => {
          const pivot = new THREE.Group()
          pivot.position.x = -0.45
          pivot.rotation.y = angle
          twirl.add(pivot)
          part(geo, m, x, 0, pivot)
        }
        leaf(-0.6, gCover, front, 0.5)
        leaf(0.6, gCover, back, 0.5)
        for (let k = 0; k < 9; k++) leaf(-0.5 + k * 0.125, gLeaf, paper, 0.47)
        part(gHinge, plain, -0.46, 0)
      } else {
        part(gPages, paper, 0.005, 0)
        part(gCover, front, 0, 0.095)
        part(gCover, back, 0, -0.095)
        part(gSpine, [plain, spine, plain, plain, plain, plain], -0.515, 0)
      }
      const g = new THREE.Group()
      g.add(twirl)
      g.scale.setScalar(b.scale)
      bookGroup.add(g)
      const r3 = () => [rnd(), rnd(), rnd()]
      floaters.push({
        g,
        twirl,
        ...slots[i],
        // resting pose: cover towards the reader, tilted a little differently per book
        rx: (rnd() - 0.5) * 0.7,
        ry: (rnd() - 0.5) * 1.1,
        rz: (rnd() - 0.5) * 0.9,
        f: r3().map((v) => 0.35 + v * 0.45),
        p: r3().map((v) => v * 6.28),
        turns: i % 2 ? -1 : 1,
        every: 18 + rnd() * 12,
        at: rnd() * 30,
        order: (i * 3) % BOOKS.length, // neighbours in the list do not dash one right after the other
      })
    })
  }

  if (V.desk) {
    // Stand: half meridian arc following the tilted axis, a post and a round base. It sits in
    // worldGroup, so it travels with the globe but does not spin with it.
    const r = CONFIG.planetRadius
    const brass = new THREE.MeshStandardMaterial({ color: '#5f451b', roughness: 0.38, metalness: 0 })
    const wood = new THREE.MeshStandardMaterial({ color: '#24160c', roughness: 0.7, metalness: 0 })
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r * 1.07, r * 0.028, 14, 96, Math.PI), brass)
    arc.rotation.z = -Math.PI / 2 + CONFIG.tilt
    const footX = Math.sin(CONFIG.tilt) * r * 1.07
    const footY = -Math.cos(CONFIG.tilt) * r * 1.07
    const post = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.035, r * 0.05, r * 0.36, 20), brass)
    post.position.set(footX, footY - r * 0.18, 0)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.58, r * 0.09, 64), wood)
    base.position.set(footX * 0.55, footY - r * 0.4, 0)
    for (const m of [arc, post, base]) {
      m.layers.set(LAYERS.ENTIRE_SCENE)
      m.frustumCulled = false
      worldGroup.add(m)
      disposables.push(m.geometry)
    }
    disposables.push(brass, wood)
  }

  const fail = () => {
    canvas.dataset.failed = 'true'
  }
  if (V.books) {
    const go = (photos: (HTMLImageElement | null)[]) => {
      if (disposed) return
      buildBooks(photos)
      queue.push(() => worldGroup.add(bookGroup), start)
    }
    // covers are drawn on canvases, so their fonts must be in before the first stroke
    const fonts = Promise.all(COVER_FONTS.map((f) => document.fonts.load(f))).catch(() => undefined) // a missing font only changes the spine lettering
    void Promise.all([Promise.all(BOOKS.map(loadCover)), fonts]).then(([photos]) => go(photos))
  } else if (V.moon) {
    const tex = new THREE.TextureLoader().load(MOON_JPG, () => queue.push(() => planetGroup.add(moon), start), undefined, fail)
    const geo = new THREE.SphereGeometry(CONFIG.planetRadius, 96, 96)
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vN;
        void main(){ float ndl = dot(normalize(vN), normalize(${V.sun})); float lit = smoothstep(-0.03, 0.3, ndl);
          gl_FragColor = vec4(texture2D(map, vUv).rgb * (0.012 + lit * 1.3), 1.0); }`,
    })
    const moon = new THREE.Mesh(geo, mat)
    moon.frustumCulled = false
    moon.layers.set(LAYERS.ENTIRE_SCENE)
    disposables.push(tex, geo, mat)
  } else
  gltf.load(
    PLANET_LIGHTS_GLB,
    (lights) => {
      const nightTex = (firstMesh(lights.scene)?.material as THREE.MeshStandardMaterial | undefined)?.map ?? null
      gltf.load(
        PLANET_GLB,
        (g) => {
          if (disposed) return
          const mesh = firstMesh(g.scene)
          if (!mesh) return fail()
          mesh.geometry.computeBoundingSphere()
          const radius = mesh.geometry.boundingSphere?.radius ?? 1
          mesh.scale.setScalar(CONFIG.planetRadius / radius)
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
          mat.metalness = 0
          mat.roughness = 1
          mat.envMapIntensity = 0
          mat.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, {
              time: planetUniformTime,
              noiseScale: { value: 30 },
              speedX: { value: 1.5 },
              speedY: { value: 2.0 },
              speedZ: { value: 2.5 },
              rimColor: { value: new THREE.Color(V.rim ?? CONFIG.rimColor) },
              rimPower: { value: CONFIG.rimPower },
              nightBlendTexture: { value: nightTex },
              nightLights: { value: CONFIG.nightLights },
              terrainDepth: { value: CONFIG.terrainDepth },
              terrainShade: { value: CONFIG.terrainShade },
              oceanGlint: { value: CONFIG.oceanGlint },
              oceanDeep: { value: CONFIG.oceanDeep },
              oceanFlow: { value: CONFIG.oceanFlow },
              oceanFlowSpeed: { value: CONFIG.oceanFlowSpeed },
              oceanFlowScale: { value: CONFIG.oceanFlowScale },
            })
            shader.vertexShader = `varying vec2 vCustomUv;\n${shader.vertexShader}`.replace('void main() {', 'void main() {\n  vCustomUv = uv;')
            shader.fragmentShader = `uniform float time; uniform float noiseScale; uniform float speedX; uniform float speedY; uniform float speedZ;
uniform vec3 rimColor; uniform float rimPower; uniform sampler2D nightBlendTexture; uniform float nightLights;
uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep;
uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;
varying vec2 vCustomUv;
${SNOISE}
${shader.fragmentShader}`.replace('#include <dithering_fragment>', PLANET_FRAGMENT.split(SUN).join(V.sun))
          }
          mesh.material = mat
          mesh.position.set(0, 0, 0)
          mesh.layers.set(LAYERS.ENTIRE_SCENE)
          mesh.frustumCulled = false
          disposables.push(mat, mesh.geometry)
          queue.push(
            () => planetGroup.add(mesh),
            ...(V.desk
              ? []
              : cloudMeshes.map((c) => () => {
                  c.mesh.visible = true
                })),
            () => {
              try {
                if (!V.desk) addMarkers(mesh)
              } catch {
                /* markers are decoration; never block the planet */
              }
            },
            start,
          )
        },
        undefined,
        fail,
      )
    },
    undefined,
    fail,
  )

  // --- loop
  let curP = 0
  let curX = STOPS_X[0].v
  let curY = STOPS_Y[0].v
  let curS = STOPS_S[0].v
  let spinPhase = 0
  let last = performance.now() / 1000
  let raf = 0

  const setRes = () => {
    renderer.getDrawingBufferSize(size)
    atmoMat.uniforms.uRes.value.set(size.x, size.y)
    starMat.uniforms.uRes.value.set(size.x, size.y)
    markerUniforms.uRes.value.set(size.x, size.y)
  }
  setRes()

  const onResize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    for (const c of [torusComposer, bloomComposer, finalComposer]) {
      c.setPixelRatio(renderer.getPixelRatio())
      c.setSize(w, h)
    }
    setRes()
  }
  window.addEventListener('resize', onResize)

  // Slow device (no GPU, old phone): drop the render resolution, at most twice, so the page stays responsive
  let slow = 0
  let downgrades = 0
  const frame = () => {
    raf = requestAnimationFrame(frame)
    const now = performance.now() / 1000
    const raw = now - last
    const dt = Math.min(0.05, raw)
    last = now
    slow = raw > 0.05 ? slow + 1 : 0
    if (slow > 20 && downgrades < 2) {
      slow = 0
      downgrades++
      renderer.setPixelRatio(Math.max(0.5, renderer.getPixelRatio() * 0.6))
      onResize()
    }

    const max = document.documentElement.scrollHeight - window.innerHeight
    const pTarget = clamp(max > 0 ? window.scrollY / max : 0, 0, 1)
    curP += (pTarget - curP) * Math.min(1, dt * 4.5)
    const sideScale = clamp(window.innerWidth / 1200, 0.5, 1)
    const k = Math.min(1, dt * 3.2)
    curX += (sample(STOPS_X, curP) * sideScale - curX) * k
    curY += (sample(STOPS_Y, curP) - curY) * k
    curS += (sample(STOPS_S, curP) - curS) * k

    queue.shift()?.()
    let entryY = ENTRY_START_Y
    if (entryT >= 0) {
      entryT = Math.min(1, entryT + dt / ENTRY_DUR) // dt is clamped, so a slow frame cannot make it jump
      entryY = ENTRY_START_Y * Math.pow(1 - entryT, 3) // eased 1-(1-t)^3 rise from ENTRY_START_Y to 0
    }
    worldGroup.position.set(curX, curY + entryY, 0)
    worldGroup.scale.setScalar(curS)
    spinPhase += dt * CONFIG.spin
    planetGroup.rotation.y = CONFIG.initRotation + spinPhase + curP * Math.PI * 1.6
    glowMesh.quaternion.copy(camera.quaternion)
    for (const c of cloudMeshes) c.mesh.rotation.y += dt * c.spin
    if (floaters.length) {
      const live = opts.reducedMotion ? 0 : 1
      const orbit = live * spinPhase * 3.5 + curP * Math.PI * 1.6
      for (const b of floaters) {
        // side-to-side dash: each book in turn crosses its track, waits at that end, and comes back next round
        const since = now - b.order * DASH_GAP
        const round = Math.floor(since / (DASH_GAP * floaters.length))
        const u = live * (round % 2 ? -1 : 1) * (2 * smooth((since - round * DASH_GAP * floaters.length) / DASH) - 1)
        const at = slid(b, u)
        v3.set(at.x, at.y, at.z).applyAxisAngle(ORBIT_AXIS, orbit)
        // DRIFT is the same amplitude the layout reserved around each book, so drifting cannot make two touch
        b.g.position.set(
          v3.x + live * DRIFT * Math.sin(now * b.f[0] + b.p[0]),
          v3.y + live * DRIFT * Math.sin(now * b.f[1] + b.p[1]),
          v3.z + live * DRIFT * Math.sin(now * b.f[2] + b.p[2]),
        )
        b.g.rotation.set(
          b.rx + live * 0.3 * Math.sin(now * b.f[1] + b.p[2]),
          b.ry + live * 0.5 * Math.sin(now * b.f[2] + b.p[0]),
          b.rz + live * 0.26 * Math.sin(now * b.f[0] + b.p[1]),
        )
        // "giradinha": once in a while a full, gentle turn; scrolling the page also turns each book once
        const t = ((now + b.at) % b.every) / TWIRL
        b.twirl.rotation.y = Math.PI * 2 * ((live && t < 1 ? smooth(t) : 0) + curP * b.turns)
      }
    }

    planetTime += dt / 12
    cloudTime += dt / 20
    starTime += dt
    markerTime += dt
    planetUniformTime.value = planetTime
    cloudUniformTime.value = cloudTime
    starMat.uniforms.uTime.value = starTime
    markerUniforms.uTime.value = markerTime

    camera.layers.set(LAYERS.TORUS_SCENE)
    torusComposer.render()
    camera.layers.set(LAYERS.BLOOM_SCENE)
    bloomComposer.render()
    // EffectComposer swaps buffers per pass, so read whichever buffer holds this frame's result
    finalPass.uniforms.torusTexture.value = torusComposer.readBuffer.texture
    finalPass.uniforms.bloomTexture.value = bloomComposer.readBuffer.texture
    camera.layers.set(LAYERS.ENTIRE_SCENE)
    finalComposer.render()
  }
  frame()

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    for (const d of disposables) d.dispose()
    for (const c of [torusComposer, bloomComposer, finalComposer]) {
      c.renderTarget1.dispose()
      c.renderTarget2.dispose()
    }
    renderer.dispose()
  }
}
