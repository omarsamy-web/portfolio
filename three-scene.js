import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = Math.min(screen.width, screen.height) < 700;

function spriteTexture(stops){
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

function initBackground(){
  const canvas = document.getElementById('neuralCanvas');
  if(!canvas) return;
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  }catch(err){ return; }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 20;

  const dot = spriteTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]);
  const STAR_N = NARROW ? 260 : 620;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(STAR_N * 3);
  for(let i = 0; i < STAR_N; i++){
    pos[i * 3] = (Math.random() * 2 - 1) * 46;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * 27;
    pos[i * 3 + 2] = -8 - Math.random() * 40;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    map: dot, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.38,
    color: 0xa79fc2, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(stars);

  [['#8b5cf6', -18, 10, -26, 44], ['#22d3ee', 20, -9, -22, 36]].forEach(g => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dot, color: g[0], transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.position.set(g[1], g[2], g[3]);
    s.scale.setScalar(g[4]);
    scene.add(s);
  });

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
    stars.rotation.z = t * 0.005;
    stars.position.y = Math.sin(t * 0.08) * 0.6;
    renderer.render(scene, camera);
  }
  if(REDUCED) tick(); else renderer.setAnimationLoop(tick);
}

function editorTexture(){
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 640;
  const x = cv.getContext('2d');
  x.fillStyle = '#0c0913'; x.fillRect(0, 0, 1024, 640);
  x.fillStyle = '#141021'; x.fillRect(0, 0, 1024, 52);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    x.fillStyle = c; x.beginPath(); x.arc(32 + i * 26, 26, 8, 0, 7); x.fill();
  });
  x.fillStyle = '#241d3a'; x.fillRect(64, 52, 2, 588);
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const words = ['const', 'model', 'train', 'data', 'render', 'await', 'return', 'app', 'props', 'state'];
  const cols = ['#c4b5fd', '#7dd3fc', '#f0abdc', '#e2e0f0', '#86efac'];
  x.font = '600 22px "JetBrains Mono", monospace';
  for(let i = 0; i < 16; i++){
    const y = 96 + i * 34;
    x.fillStyle = '#4a4366';
    x.fillText(String(i + 1).padStart(2, ' '), 20, y);
    let cx = 84;
    const tokens = 2 + Math.floor(rnd() * 4);
    for(let tk = 0; tk < tokens && cx < 930; tk++){
      const w = 46 + rnd() * 130;
      x.fillStyle = cols[Math.floor(rnd() * cols.length)];
      if(rnd() < 0.42){
        x.fillText(words[Math.floor(rnd() * words.length)], cx, y);
      } else {
        x.globalAlpha = 0.72;
        x.fillRect(cx, y - 17, w, 20);
        x.globalAlpha = 1;
      }
      cx += w + 20;
    }
  }
  x.fillStyle = 'rgba(196,181,253,0.95)';
  x.fillRect(84, 96 + 9 * 34 - 17, 3, 23);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function keysTexture(){
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 688;
  const x = cv.getContext('2d');
  x.fillStyle = '#110d1b'; x.fillRect(0, 0, 1024, 688);
  const kw = 62, kh = 52, gap = 10;
  const cols = 13, rows = 5;
  const totalW = cols * kw + (cols - 1) * gap;
  const startX = (1024 - totalW) / 2;
  for(let r = 0; r < rows; r++){
    for(let c = 0; c < cols; c++){
      const kx = startX + c * (kw + gap);
      const ky = 36 + r * (kh + gap);
      x.fillStyle = '#1d1730';
      x.beginPath();
      if(x.roundRect) x.roundRect(kx, ky, kw, kh, 9); else x.rect(kx, ky, kw, kh);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.05)';
      x.fillRect(kx + 4, ky + 3, kw - 8, 3);
    }
  }
  const sy = 36 + rows * (kh + gap);
  x.fillStyle = '#1d1730';
  x.beginPath();
  const sw = totalW * 0.46;
  const sx = (1024 - sw) / 2;
  if(x.roundRect) x.roundRect(sx, sy, sw, kh, 9); else x.rect(sx, sy, sw, kh);
  x.fill();
  const pw = totalW * 0.4, ph = 120;
  const px = (1024 - pw) / 2, py = sy + kh + 26;
  x.strokeStyle = '#2a2145'; x.lineWidth = 3;
  x.beginPath();
  if(x.roundRect) x.roundRect(px, py, pw, ph, 12); else x.rect(px, py, pw, ph);
  x.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initLaptop(){
  const canvas = document.getElementById('laptopCanvas');
  const wrap = canvas ? canvas.parentElement : null;
  if(!canvas || !wrap) return;
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  }catch(err){ return; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 1.4, 8.6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x2e2748, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rimV = new THREE.PointLight(0x8b5cf6, 42, 30, 2);
  rimV.position.set(-5, 2.5, 3);
  scene.add(rimV);
  const rimC = new THREE.PointLight(0x22d3ee, 20, 26, 2);
  rimC.position.set(5, -1, 3.5);
  scene.add(rimC);

  const dark = new THREE.MeshStandardMaterial({ color: 0x17121f, roughness: 0.55, metalness: 0.45 });
  const lid = new THREE.MeshStandardMaterial({ color: 0x1a1426, roughness: 0.5, metalness: 0.5 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 2.35),
    [dark, dark, new THREE.MeshStandardMaterial({ map: keysTexture(), roughness: 0.7, metalness: 0.2 }), dark, dark, dark]);
  const screenPivot = new THREE.Group();
  screenPivot.position.set(0, 0.05, -1.14);
  const screenMat = new THREE.MeshBasicMaterial({ map: editorTexture() });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.25, 0.09),
    [lid, lid, lid, lid, screenMat, lid]);
  screen.position.y = 1.14;
  screenPivot.add(screen);
  screenPivot.rotation.x = -0.28;
  const under = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.02, 2.37),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }));
  under.position.y = -0.09;

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteTexture([[0, 'rgba(139,92,246,0.55)'], [1, 'rgba(139,92,246,0)']]),
    transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  glow.position.set(0, -0.7, -0.4);
  glow.scale.set(7, 3, 1);

  const laptop = new THREE.Group();
  laptop.add(base, screenPivot, under, glow);
  if(window.innerWidth > 860) laptop.position.x = 0.4;
  laptop.rotation.x = 0.34;
  scene.add(laptop);

  let targetRY = -0.5, curRY = -0.5, velY = 0;
  let targetRX = 0.34, dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, lastInteract = 0;

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    downX = e.clientX; downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    targetRY += dx * 0.007;
    velY = dx * 0.007;
    targetRX = Math.max(-0.15, Math.min(0.75, targetRX + dy * 0.004));
    lastInteract = performance.now();
  });
  window.addEventListener('pointerup', e => {
    if(!dragging) return;
    dragging = false;
    if(Math.hypot(e.clientX - downX, e.clientY - downY) < 5) velY += 0.09;
    lastInteract = performance.now();
  });

  function resize(){
    const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function tick(){
    const t = clock.getElapsedTime();
    if(!dragging){
      targetRY += velY;
      velY *= 0.94;
      if(performance.now() - lastInteract > 2200 && Math.abs(velY) < 0.002) targetRY += 0.0035;
    }
    curRY += (targetRY - curRY) * 0.12;
    laptop.rotation.y = curRY;
    laptop.rotation.x += (targetRX - laptop.rotation.x) * 0.1;
    laptop.position.y = Math.sin(t * 0.8) * 0.12;
    rimV.intensity = 42 + Math.sin(t * 1.1) * 6;
    renderer.render(scene, camera);
  }
  if(REDUCED){ tick(); } else { renderer.setAnimationLoop(tick); }
}

try { initBackground(); } catch(err){ console.error(err); }
try { initLaptop(); } catch(err){ console.error(err); }

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
