import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = Math.min(screen.width, screen.height) < 640;

function initFallback(){
  const canvas = document.getElementById('neuralCanvas');
  if(!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  let nodes = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  const init = () => {
    nodes = [];
    const count = Math.min(70, Math.floor((canvas.width * canvas.height) / 22000));
    for(let i = 0; i < count; i++){
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.5 + 0.7
      });
    }
  };
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if(n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if(n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });
    for(let i = 0; i < nodes.length; i++){
      for(let j = i + 1; j < nodes.length; j++){
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if(d < 110){
          ctx.strokeStyle = 'rgba(139,92,246,' + (0.15 * (1 - d / 110)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    nodes.forEach((n, i) => {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(34,211,238,0.5)' : 'rgba(139,92,246,0.5)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  resize(); init();
  if(!REDUCED){
    draw();
    window.addEventListener('resize', () => { resize(); init(); });
  }
}

function buildScene(){
  const canvas = document.getElementById('neuralCanvas');
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  }catch(err){
    initFallback();
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
  camera.position.set(0, 1.6, 17);
  camera.lookAt(0, 0, 0);

  const uTime = { value: 0 };

  function ribbonMat(c1, c2, c3, opacity, phase){
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime,
        uPhase: { value: phase },
        uOpacity: { value: opacity },
        c1: { value: new THREE.Color(c1) },
        c2: { value: new THREE.Color(c2) },
        c3: { value: new THREE.Color(c3) }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uPhase;
        varying vec2 vUv;
        varying float vElev;
        void main(){
          vUv = uv;
          vec3 p = position;
          float w1 = sin(p.x * 0.22 + uTime * 0.32 + uPhase);
          float w2 = sin(p.x * 0.09 - uTime * 0.21 + uPhase * 1.7);
          float w3 = cos(p.y * 0.30 + uTime * 0.26 + uPhase * 0.6);
          p.z += w1 * 1.9 + w2 * 2.6 + w3 * 1.1;
          vElev = w1 * 0.5 + w2 * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform float uOpacity;
        uniform vec3 c1;
        uniform vec3 c2;
        uniform vec3 c3;
        varying vec2 vUv;
        varying float vElev;
        void main(){
          vec3 col = mix(c1, c2, smoothstep(0.0, 1.0, vUv.x));
          col = mix(col, c3, 0.5 + 0.5 * sin(vUv.x * 3.14159 + uTime * 0.15 + uPhase));
          col += vElev * 0.06;
          float fadeY = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
          float fadeX = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x);
          float streak = 0.78 + 0.22 * sin(vUv.x * 19.0 + vUv.y * 4.0 + uTime * 0.2 + uPhase);
          float a = uOpacity * fadeY * fadeX * streak;
          if(a < 0.004) discard;
          gl_FragColor = vec4(col, a);
        }`
    });
  }

  const RIBBONS = [
    { y: 4.5,  z: -26, rotX: -1.28, op: 0.34, ph: 0.0, c: ['#6f5bd0', '#2e8fb8', '#b06ab3'] },
    { y: 0.5,  z: -19, rotX: -1.22, op: 0.42, ph: 2.1, c: ['#7c6bd6', '#3fb9d8', '#8b5cf6'] },
    { y: -3.2, z: -13, rotX: -1.15, op: 0.38, ph: 4.2, c: ['#8b5cf6', '#22d3ee', '#d77bb0'] },
    { y: 2.2,  z: -8,  rotX: -1.05, op: 0.30, ph: 1.2, c: ['#a78bfa', '#67e8f9', '#f0abdc'] },
    { y: -6.0, z: -33, rotX: -1.30, op: 0.26, ph: 5.3, c: ['#5b4bc4', '#22889f', '#9d5b8f'] }
  ];
  const geo = new THREE.PlaneGeometry(95, 13, NARROW ? 90 : 150, NARROW ? 14 : 22);
  RIBBONS.forEach(r => {
    const m = new THREE.Mesh(geo, ribbonMat(r.c[0], r.c[1], r.c[2], r.op, r.ph));
    m.position.set(0, r.y, r.z);
    m.rotation.x = r.rotX;
    scene.add(m);
  });

  function glowTexture(){
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }

  const glowTex = glowTexture();
  [['#8b5cf6', -14, 9, -30, 46], ['#22d3ee', 16, -7, -24, 38], ['#f472b6', 4, 12, -36, 52]].forEach(g => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: g[0], transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.position.set(g[1], g[2], g[3]);
    s.scale.setScalar(g[4]);
    scene.add(s);
  });

  function dustTexture(){
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  const DUST_N = NARROW ? 120 : 260;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST_N * 3);
  const dSpd = new Float32Array(DUST_N);
  for(let i = 0; i < DUST_N; i++){
    dPos[i * 3] = (Math.random() * 2 - 1) * 34;
    dPos[i * 3 + 1] = (Math.random() * 2 - 1) * 18;
    dPos[i * 3 + 2] = -2 - Math.random() * 34;
    dSpd[i] = 0.15 + Math.random() * 0.35;
  }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({
    map: dustTexture(), size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.32,
    color: 0xcfc6ee, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(dust);

  const starGeo = new THREE.BufferGeometry();
  const STAR_N = NARROW ? 300 : 700;
  const sPos = new Float32Array(STAR_N * 3);
  for(let i = 0; i < STAR_N; i++){
    sPos[i * 3] = (Math.random() * 2 - 1) * 50;
    sPos[i * 3 + 1] = (Math.random() * 2 - 1) * 28;
    sPos[i * 3 + 2] = -20 - Math.random() * 70;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    map: dustTexture(), size: 0.3, sizeAttenuation: true, transparent: true, opacity: 0.4,
    color: 0xaaa3c9, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(stars);

  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize(){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();

  function tick(){
    const t = clock.getElapsedTime();
    uTime.value = t;
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.03;
    camera.position.y += (1.6 - pointer.y * 0.5 - camera.position.y) * 0.03;
    camera.lookAt(pointer.x * 0.6, -pointer.y * 0.35, -10);
    const arr = dGeo.attributes.position.array;
    for(let i = 0; i < DUST_N; i++){
      arr[i * 3 + 1] += dSpd[i] * 0.008;
      arr[i * 3] += Math.sin(t * 0.2 + i) * 0.0022;
      if(arr[i * 3 + 1] > 19) arr[i * 3 + 1] = -19;
    }
    dGeo.attributes.position.needsUpdate = true;
    stars.rotation.z = t * 0.004;
    renderer.render(scene, camera);
  }

  if(REDUCED){
    tick();
  } else {
    renderer.setAnimationLoop(tick);
  }
}

try { buildScene(); } catch(err){ console.error('WebGL scene failed', err); }

if(window.matchMedia('(pointer: fine)').matches && !REDUCED){
  document.querySelectorAll('.proj-card, .skill-card, .cert-card, .fact-card').forEach(card => {
    card.classList.add('tilt');
    let raf = null;
    card.addEventListener('pointerenter', () => card.classList.add('tilting'));
    card.addEventListener('pointermove', e => {
      if(raf) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      raf = requestAnimationFrame(() => {
        card.style.transform = 'translateY(-5px) perspective(750px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg)';
        card.style.setProperty('--gx', (px * 100 + 50).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100 + 50).toFixed(1) + '%');
        raf = null;
      });
    });
    card.addEventListener('pointerleave', () => {
      if(raf){ cancelAnimationFrame(raf); raf = null; }
      card.classList.remove('tilting');
      card.style.transform = '';
    });
  });
}

if(!REDUCED && 'IntersectionObserver' in window){
  const targets = document.querySelectorAll(
    '.eyebrow, .section-title, .section-lead, .skill-card, .proj-card, .cert-card, .fact-card, .tl-item, .about-text p, .lang-chips, .contact-box > *'
  );
  targets.forEach(el => {
    el.classList.add('reveal');
    const sibs = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal')) : [];
    el.style.transitionDelay = Math.min(sibs.indexOf(el) * 70, 350) + 'ms';
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if(en.isIntersecting){
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => io.observe(el));
}
