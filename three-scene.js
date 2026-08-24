import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initFallback(){
  const canvas = document.getElementById('neuralCanvas');
  if(!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let nodes = [];
  const resize = () => { canvas.width = hero.clientWidth; canvas.height = hero.clientHeight; };
  const init = () => {
    nodes = [];
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
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
          ctx.strokeStyle = 'rgba(139,92,246,' + (0.18 * (1 - d / 110)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    nodes.forEach((n, i) => {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(34,211,238,0.6)' : 'rgba(139,92,246,0.6)';
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

function initHero(){
  const canvas = document.getElementById('neuralCanvas');
  if(!canvas) return;
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  }catch(err){
    initFallback();
    return;
  }

  const hero = canvas.parentElement;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0814, 0.04);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120);
  camera.position.set(0, 0, 16);

  const VIOLET = new THREE.Color(0x8b5cf6);
  const CYAN = new THREE.Color(0x22d3ee);
  const LILAC = new THREE.Color(0xc4b5fd);
  const PINK = new THREE.Color(0xf472b6);
  const PALETTE = [VIOLET, VIOLET, CYAN, LILAC];

  const BOUNDS = { x: 23, y: 13, z: 11 };
  const narrow = Math.min(screen.width, screen.height) < 640;
  const COUNT = Math.round(Math.min(narrow ? 340 : 900, Math.max(200, (hero.clientWidth * hero.clientHeight) / 2600)));
  const HUBS = Math.min(90, COUNT);

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  const vel = new Float32Array(COUNT * 3);

  for(let i = 0; i < COUNT; i++){
    positions[i * 3]     = (Math.random() * 2 - 1) * BOUNDS.x;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * BOUNDS.y;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * BOUNDS.z;
    const c = Math.random() < 0.12 ? PINK : PALETTE[(Math.random() * PALETTE.length) | 0];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    sizes[i] = 0.05 + Math.random() * 0.11;
    phases[i] = Math.random() * Math.PI * 2;
    vel[i * 3]     = (Math.random() - 0.5) * 0.006;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime:  { value: 0 },
    uScale: { value: 1 },
    uPR:    { value: Math.min(window.devicePixelRatio || 1, 2) }
  };

  const pMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uPR;
      varying vec3 vColor;
      varying float vFade;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mv.z, 0.001);
        float tw = 0.55 + 0.45 * sin(uTime * 1.3 + aPhase);
        gl_PointSize = aSize * uPR * uScale * tw / dist;
        gl_Position = projectionMatrix * mv;
        vFade = tw * smoothstep(38.0, 9.0, dist);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.05, d) * vFade * 0.85;
        if(a < 0.004) discard;
        gl_FragColor = vec4(vColor, a);
      }`
  });

  const points = new THREE.Points(pGeo, pMat);

  const segPos = [];
  outer:
  for(let i = 0; i < HUBS; i++){
    for(let j = i + 1; j < HUBS; j++){
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      if(dx * dx + dy * dy + dz * dz < 10.9){
        segPos.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
        );
        if(segPos.length >= 2520) break outer;
      }
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(segPos, 3));
  const lMat = new THREE.LineBasicMaterial({
    color: 0x8b5cf6, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const lines = new THREE.LineSegments(lGeo, lMat);

  const wireMat = (hex, op) => new THREE.MeshBasicMaterial({ color: hex, wireframe: true, transparent: true, opacity: op });
  const shapeA = new THREE.Mesh(new THREE.IcosahedronGeometry(6.5, 1), wireMat(0x8b5cf6, 0.07));
  shapeA.position.set(-14, 5, -9);
  const shapeB = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 1), wireMat(0x22d3ee, 0.06));
  shapeB.position.set(15, -5, -7);
  const shapeC = new THREE.Mesh(new THREE.TorusKnotGeometry(3, 0.85, 120, 14), wireMat(0xf472b6, 0.05));
  shapeC.position.set(2, -1, -16);

  const group = new THREE.Group();
  group.add(points, lines, shapeA, shapeB, shapeC);
  scene.add(group);

  const resize = () => {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    uniforms.uPR.value = renderer.getPixelRatio();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  };
  resize();

  const pointer = { x: 0, y: 0 };
  if(!REDUCED){
    window.addEventListener('pointermove', e => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  const clock = new THREE.Clock();
  let spin = 0;

  function tick(){
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    for(let i = HUBS; i < COUNT; i++){
      positions[i * 3]     += vel[i * 3];
      positions[i * 3 + 1] += vel[i * 3 + 1];
      positions[i * 3 + 2] += vel[i * 3 + 2];
      if(positions[i * 3]     >  BOUNDS.x || positions[i * 3]     < -BOUNDS.x) vel[i * 3] *= -1;
      if(positions[i * 3 + 1] >  BOUNDS.y || positions[i * 3 + 1] < -BOUNDS.y) vel[i * 3 + 1] *= -1;
      if(positions[i * 3 + 2] >  BOUNDS.z || positions[i * 3 + 2] < -BOUNDS.z) vel[i * 3 + 2] *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;

    shapeA.rotation.y = t * 0.06;  shapeA.rotation.x = t * 0.03;
    shapeB.rotation.y = -t * 0.05; shapeB.rotation.z = t * 0.04;
    shapeC.rotation.x = t * 0.07;  shapeC.rotation.y = t * 0.09;

    spin += 0.0007;
    group.rotation.y += ((spin + pointer.x * 0.12) - group.rotation.y) * 0.03;
    group.rotation.x += ((pointer.y * 0.08) - group.rotation.x) * 0.03;

    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 1.0 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  if(REDUCED){
    window.addEventListener('resize', () => { resize(); tick(); });
    tick();
  } else {
    renderer.setAnimationLoop(tick);
    new IntersectionObserver(entries => {
      entries.forEach(en => renderer.setAnimationLoop(en.isIntersecting ? tick : null));
    }, { threshold: 0 }).observe(hero);
    window.addEventListener('resize', resize);
  }
}

try { initHero(); } catch(err) { console.error('WebGL scene failed', err); }

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
