import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = Math.min(screen.width, screen.height) < 640;
const VIOLET = new THREE.Color(0x8b5cf6);
const CYAN = new THREE.Color(0x22d3ee);
const LILAC = new THREE.Color(0xc4b5fd);
const PINK = new THREE.Color(0xf472b6);

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
  scene.fog = new THREE.FogExp2(0x0a0814, 0.016);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
  camera.position.set(0, 0, 16);

  const G = { uTime: { value: 0 }, uScale: { value: 1 }, uPR: { value: 1 } };

  function pointsMaterial(far, alpha){
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: G.uTime, uScale: G.uScale, uPR: G.uPR,
        uFar: { value: far }, uAlpha: { value: alpha }
      },
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
        uniform float uFar;
        uniform float uAlpha;
        varying vec3 vC;
        varying float vA;
        void main(){
          vC = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float dist = max(-mv.z, 0.001);
          float tw = 0.6 + 0.4 * sin(uTime * 1.3 + aPhase);
          gl_PointSize = aSize * uPR * uScale * tw / dist;
          gl_Position = projectionMatrix * mv;
          vA = tw * uAlpha * (1.0 - smoothstep(uFar * 0.24, uFar, dist));
        }`,
      fragmentShader: `
        varying vec3 vC;
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.05, d) * vA;
          if(a < 0.004) discard;
          gl_FragColor = vec4(vC, a);
        }`
    });
  }

  function makePoints(pos, cols, sizeArr, far, alpha){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const n = sizeArr.length;
    const ph = new Float32Array(n);
    for(let i = 0; i < n; i++) ph[i] = Math.random() * Math.PI * 2;
    g.setAttribute('aSize', new THREE.BufferAttribute(sizeArr, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    return new THREE.Points(g, pointsMaterial(far, alpha));
  }

  function randPoints(n, gen, palette, sMin, sMax){
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n);
    for(let i = 0; i < n; i++){
      const p = gen();
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      const c = palette[(Math.random() * palette.length) | 0];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      siz[i] = sMin + Math.random() * (sMax - sMin);
    }
    return [pos, col, siz];
  }

  const zones = [];
  const zoneAt = (z, build) => {
    const group = new THREE.Group();
    group.position.z = z;
    const api = build(group) || {};
    scene.add(group);
    zones.push({ z, group, update: api.update });
    return group;
  };

  const STAR_N = NARROW ? 650 : 1600;
  const starData = randPoints(
    STAR_N,
    () => [(Math.random() * 2 - 1) * 46, (Math.random() * 2 - 1) * 27, 25 - Math.random() * 420],
    [LILAC, VIOLET, CYAN, new THREE.Color(0xbfb8d9)],
    0.04, 0.13
  );
  scene.add(makePoints(...starData, 60, 0.8));

  zoneAt(0, group => {
    const BOUNDS = { x: 24, y: 14, z: 12 };
    const COUNT = Math.round(Math.min(NARROW ? 340 : 900, Math.max(200, (window.innerWidth * window.innerHeight) / 2600)));
    const HUBS = Math.min(90, COUNT);
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3),
          siz = new Float32Array(COUNT), vel = new Float32Array(COUNT * 3);
    const pal = [VIOLET, VIOLET, CYAN, LILAC];
    for(let i = 0; i < COUNT; i++){
      pos[i * 3] = (Math.random() * 2 - 1) * BOUNDS.x;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * BOUNDS.y;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * BOUNDS.z;
      const c = Math.random() < 0.12 ? PINK : pal[(Math.random() * pal.length) | 0];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      siz[i] = 0.05 + Math.random() * 0.11;
      vel[i * 3] = (Math.random() - 0.5) * 0.006;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    }
    group.add(makePoints(pos, col, siz, 38, 0.85));

    const seg = [];
    outer:
    for(let i = 0; i < HUBS; i++){
      for(let j = i + 1; j < HUBS; j++){
        const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        if(dx * dx + dy * dy + dz * dz < 10.9){
          seg.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
          if(seg.length >= 2520) break outer;
        }
      }
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    group.add(new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
      color: 0x8b5cf6, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false
    })));

    const wm = (hex, op) => new THREE.MeshBasicMaterial({ color: hex, wireframe: true, transparent: true, opacity: op });
    const a = new THREE.Mesh(new THREE.IcosahedronGeometry(6.5, 1), wm(0x8b5cf6, 0.07)); a.position.set(-15, 5, -9);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 1), wm(0x22d3ee, 0.06)); b.position.set(16, -5, -7);
    const c = new THREE.Mesh(new THREE.TorusKnotGeometry(3, 0.85, 120, 14), wm(0xf472b6, 0.05)); c.position.set(2, -1, -17);
    group.add(a, b, c);

    return { update(t){
      for(let i = HUBS; i < COUNT; i++){
        pos[i * 3] += vel[i * 3]; pos[i * 3 + 1] += vel[i * 3 + 1]; pos[i * 3 + 2] += vel[i * 3 + 2];
        if(pos[i * 3] > BOUNDS.x || pos[i * 3] < -BOUNDS.x) vel[i * 3] *= -1;
        if(pos[i * 3 + 1] > BOUNDS.y || pos[i * 3 + 1] < -BOUNDS.y) vel[i * 3 + 1] *= -1;
        if(pos[i * 3 + 2] > BOUNDS.z || pos[i * 3 + 2] < -BOUNDS.z) vel[i * 3 + 2] *= -1;
      }
      const attr = group.children[0].geometry.attributes.position;
      attr.needsUpdate = true;
      a.rotation.y = t * 0.06; a.rotation.x = t * 0.03;
      b.rotation.y = -t * 0.05; b.rotation.z = t * 0.04;
      c.rotation.x = t * 0.07; c.rotation.y = t * 0.09;
      group.rotation.y = Math.sin(t * 0.05) * 0.04;
    }};
  });

  zoneAt(-60, group => {
    const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 2),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.08 }));
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.11 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.05, 8, 90),
      new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.16 }));
    ring.rotation.x = Math.PI / 2.3;
    const ring2 = ring.clone();
    ring2.material = ring.material.clone(); ring2.material.color.set(0xf472b6);
    ring2.scale.setScalar(0.72); ring2.rotation.set(Math.PI / 1.7, 0.5, 0);
    group.add(outer, inner, ring, ring2);
    return { update(t){
      outer.rotation.y = t * 0.05; outer.rotation.x = Math.sin(t * 0.1) * 0.2;
      inner.rotation.y = -t * 0.22; inner.rotation.z = t * 0.08;
      ring.rotation.z = t * 0.04; ring2.rotation.z = -t * 0.06;
    }};
  });

  zoneAt(-120, group => {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.14 }));
    group.add(core);
    const kinds = [
      () => new THREE.TetrahedronGeometry(1),
      () => new THREE.OctahedronGeometry(1),
      () => new THREE.DodecahedronGeometry(0.95),
      () => new THREE.IcosahedronGeometry(0.95),
      () => new THREE.TorusKnotGeometry(0.55, 0.2, 80, 10)
    ];
    const colors = [0x8b5cf6, 0x22d3ee, 0xf472b6, 0xc4b5fd, 0x6366f1];
    const sats = [];
    for(let i = 0; i < 5; i++){
      const pivot = new THREE.Group();
      pivot.rotation.z = (i - 2) * 0.35;
      pivot.rotation.x = (i % 2 ? 1 : -1) * 0.25;
      const m = new THREE.Mesh(kinds[i](), new THREE.MeshBasicMaterial({
        color: colors[i], wireframe: true, transparent: true, opacity: 0.28
      }));
      m.position.x = 6.5 + i * 0.9;
      pivot.add(m);
      group.add(pivot);
      sats.push({ pivot, m, speed: 0.24 + i * 0.05, phase: i * 1.3 });
    }
    return { update(t){
      core.rotation.y = t * 0.2; core.rotation.x = t * 0.1;
      sats.forEach(s => {
        s.pivot.rotation.y = t * s.speed + s.phase;
        s.m.rotation.x = t * 0.5; s.m.rotation.y = t * 0.4;
      });
      group.rotation.y = Math.sin(t * 0.07) * 0.1;
    }};
  });

  zoneAt(-180, group => {
    const titles = ['🎓 Attendance', '🌐 Web Apps', '🐍 Py Tools', '⚡ Nexera', '🧬 Bahia AI'];
    const accents = ['#8b5cf6', '#22d3ee', '#f472b6', '#6366f1', '#c4b5fd'];
    const panels = [];
    titles.forEach((txt, i) => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 320;
      const x = cv.getContext('2d');
      x.fillStyle = 'rgba(22,16,39,0.92)';
      x.fillRect(0, 0, 512, 320);
      const grad = x.createLinearGradient(0, 0, 512, 320);
      grad.addColorStop(0, accents[i] + '33'); grad.addColorStop(1, 'transparent');
      x.fillStyle = grad; x.fillRect(0, 0, 512, 320);
      x.strokeStyle = accents[i]; x.lineWidth = 3;
      x.strokeRect(4, 4, 504, 312);
      x.font = '110px sans-serif'; x.textAlign = 'center';
      x.fillText(txt.split(' ')[0], 256, 165);
      x.font = '600 36px Sora, sans-serif'; x.fillStyle = '#f2eefc';
      x.fillText(txt.split(' ').slice(1).join(' '), 256, 255);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, 3.88),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
      );
      mesh.position.x = (i - 2) * 6.6;
      mesh.rotation.y = (i - 2) * -0.14;
      group.add(mesh);
      panels.push(mesh);
    });
    return { update(t){
      panels.forEach((p, i) => {
        p.position.y = Math.sin(t * 0.8 + i * 1.1) * 0.45;
        p.rotation.z = Math.sin(t * 0.5 + i) * 0.02;
      });
      group.rotation.y = Math.sin(t * 0.06) * 0.05;
    }};
  });

  zoneAt(-240, group => {
    const helixPts = [], dots = [];
    for(let i = 0; i <= 220; i++){
      const a = i / 220 * Math.PI * 6;
      const y = -9 + (i / 220) * 18;
      helixPts.push(new THREE.Vector3(Math.cos(a) * 4, y, Math.sin(a) * 4));
      if(i % 9 === 0){
        dots.push(Math.cos(a) * 4, y, Math.sin(a) * 4);
        dots.push(Math.cos(a + Math.PI) * 4, y, Math.sin(a + Math.PI) * 4);
      }
    }
    const hGeo = new THREE.BufferGeometry().setFromPoints(helixPts);
    group.add(new THREE.Line(hGeo, new THREE.LineBasicMaterial({
      color: 0x8b5cf6, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending
    })));
    const n = dots.length / 3;
    group.add(makePoints(new Float32Array(dots), new Float32Array(Array.from({ length: n }, (_, i) => {
      const c = i % 2 ? CYAN : PINK; return [c.r, c.g, c.b];
    }).flat()), new Float32Array(Array.from({ length: n }, () => 0.09)), 38, 0.9));
    return { update(t){ group.rotation.y = t * 0.16; } };
  });

  zoneAt(-300, group => {
    const shell = randPoints(
      NARROW ? 130 : 240,
      () => {
        const r = 4.5 + Math.random() * 2.2;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
      },
      [PINK, LILAC, VIOLET], 0.06, 0.14
    );
    group.add(makePoints(...shell, 38, 0.85));
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(2.4),
      new THREE.MeshBasicMaterial({ color: 0xc4b5fd, wireframe: true, transparent: true, opacity: 0.13 }));
    group.add(gem);
    return { update(t){
      gem.rotation.y = t * 0.25; gem.rotation.x = t * 0.12;
      gem.scale.setScalar(1 + Math.sin(t * 1.4) * 0.06);
      group.rotation.y = Math.sin(t * 0.05) * 0.12;
    }};
  });

  zoneAt(-360, group => {
    const ball = randPoints(150, () => {
      const r = 1.6 * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    }, [CYAN, LILAC], 0.07, 0.15);
    group.add(makePoints(...ball, 38, 1));
    const rings = [3, 4.6, 6.2].map((r, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 8, 90),
        new THREE.MeshBasicMaterial({
          color: [0x8b5cf6, 0x22d3ee, 0xf472b6][i], transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending
        }));
      group.add(m);
      return m;
    });
    return { update(t){
      rings.forEach((m, i) => {
        m.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.3;
        m.rotation.z = t * (0.1 + i * 0.06);
        m.scale.setScalar(1 + Math.sin(t * 1.6 + i * 2) * 0.05);
        m.material.opacity = 0.2 + 0.18 * Math.abs(Math.sin(t * 1.6 + i * 2 + 1));
      });
    }};
  });

  const pointer = { x: 0, y: 0 };
  let target = 0, cur = 0;

  function readScroll(){
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    target = Math.min(1, Math.max(0, window.scrollY / max));
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize(){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    G.uPR.value = renderer.getPixelRatio();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    G.uScale.value = window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  }
  resize();
  window.addEventListener('resize', () => { resize(); readScroll(); });
  readScroll();

  const TRAVEL = 360;
  const clock = new THREE.Clock();

  function tick(){
    const t = clock.getElapsedTime();
    G.uTime.value = t;
    cur += (target - cur) * (REDUCED ? 1 : 0.06);
    const cz = 16 - cur * TRAVEL;
    camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 1.1 - camera.position.y) * 0.04;
    camera.position.z = cz;
    camera.lookAt(pointer.x * 2.2, -pointer.y * 1.3, cz - 12);
    zones.forEach(zn => {
      zn.group.visible = Math.abs(cz - (zn.z + 16)) < 85;
      if(zn.group.visible && zn.update) zn.update(t);
    });
    renderer.render(scene, camera);
  }

  if(REDUCED){
    tick();
  } else {
    renderer.setAnimationLoop(tick);
  }
}

try { buildScene(); } catch(err){ console.error('WebGL journey failed', err); }

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
