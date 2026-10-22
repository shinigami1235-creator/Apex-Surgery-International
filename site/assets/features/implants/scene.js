/* The 3D view for the implant viewers: one canvas drawing one or two panes of the same model side by
   side (before and after, or two implants), turned together by dragging. three.js loads at runtime. */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function createScene(host, opts = {}){
  const THREE = await import(opts.threeUrl || THREE_URL);
  const canvas = document.createElement('canvas');
  canvas.className = 'im-gl'; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  host.append(canvas);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, preserveDrawingBuffer:true, powerPreference:'low-power'});
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a1a58, .65));
  const key = new THREE.DirectionalLight(0xfff6ee, 2.8); key.position.set(-2.5, 3, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9c8ff, .7); fill.position.set(3, .5, 2.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc9a2ff, 2.4); rim.position.set(2.5, 2, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(opts.fov || 24, 1, .05, 200);

  const skin = new THREE.MeshStandardMaterial({color:0xffffff, vertexColors:true, roughness:.62, metalness:0});
  // a soft sheen at grazing angles so the shape reads against the dark stage
  skin.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
      `#include <dithering_fragment>
       float fr = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
       gl_FragColor.rgb += vec3(.55, .42, .78) * fr * .35;`);
  };
  const capMat = new THREE.MeshStandardMaterial({color:0x4a2a66, roughness:.85, metalness:0});
  const ghostMat = new THREE.MeshBasicMaterial({color:0xE3B85C, transparent:true, opacity:.42, depthTest:false, depthWrite:false, side:THREE.DoubleSide});
  const ghostLine = new THREE.LineBasicMaterial({color:0xF6D58C, transparent:true, opacity:.9, depthTest:false});

  const panes = [];
  let model = null;
  /* model: {pos Float32Array, idx Uint16Array, colors Float32Array, capStart?} */
  function setModel(m, count = 2){
    model = m;
    panes.forEach(p => { scene.remove(p.group); p.geo.dispose(); });
    panes.length = 0;
    for (let k = 0; k < count; k++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.pos), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.pos.length), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.colors), 3));
      geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
      if (m.capStart != null) { geo.addGroup(0, m.capStart * 3, 0); geo.addGroup(m.capStart * 3, m.idx.length - m.capStart * 3, 1); }
      const mesh = new THREE.Mesh(geo, m.capStart != null ? [skin, capMat] : skin);
      const group = new THREE.Group(); group.add(mesh);
      group.visible = false;
      scene.add(group);
      panes.push({geo, mesh, group, ghosts:[]});
    }
  }
  function setPositions(k, P, N){
    const p = panes[k]; if (!p) return;
    p.geo.attributes.position.array.set(P); p.geo.attributes.position.needsUpdate = true;
    if (N) { p.geo.attributes.normal.array.set(N); p.geo.attributes.normal.needsUpdate = true; }
    else p.geo.computeVertexNormals();
    p.geo.computeBoundingSphere();
  }
  function setColors(k, c){
    const p = panes[k]; if (!p) return;
    p.geo.attributes.color.array.set(c); p.geo.attributes.color.needsUpdate = true; render();
  }
  /* see-through implants: list of {pos, idx} lenses in model space */
  function setGhosts(k, list){
    const p = panes[k]; if (!p) return;
    p.ghosts.forEach(g => { p.group.remove(g); g.geometry.dispose(); });
    p.ghosts = (list || []).map(s => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(s.pos, 3));
      g.setIndex(new THREE.BufferAttribute(s.idx, 1));
      const m = s.line ? new THREE.Line(g, ghostLine) : new THREE.Mesh(g, ghostMat);
      m.renderOrder = 5;
      p.group.add(m);
      return m;
    });
  }

  /* camera: orbit around a target; yaw turns the model, pitch tilts the view */
  const view = {yaw:0, pitch:0, zoom:1, target:[0, 0, 0], dist:5, active:2, split:true};
  function frame(target, dist){ view.target = target; view.dist = dist; render(); }
  function setView(yaw, pitch){ view.yaw = clamp(yaw, -1.95, 1.95); if (pitch != null) view.pitch = clamp(pitch, -.45, .45); render(); }
  function setZoom(z){ view.zoom = clamp(z, .55, 1.6); render(); }

  let w = 1, h = 1, raf = 0, ro = null;
  function size(){
    const r = host.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    render();
  }
  function render(){
    if (raf) return;
    raf = requestAnimationFrame(draw);
  }
  function draw(){
    raf = 0;
    if (!panes.length) return;
    const n = view.split ? Math.min(view.active, panes.length) : 1;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, w, h); renderer.setViewport(0, 0, w, h); renderer.clear();
    // two panes side by side, or one above the other when the stage is tall and narrow
    const stack = n === 2 && w / h < .8;
    if (stack !== view.stacked) { view.stacked = stack; opts.onLayout && opts.onLayout(stack); }
    const pw = stack ? w : w / n, ph = stack ? h / n : h;
    const [tx, ty, tz] = view.target, d = view.dist / view.zoom;
    camera.position.set(tx + Math.sin(view.yaw) * Math.cos(view.pitch) * d, ty + Math.sin(view.pitch) * d, tz + Math.cos(view.yaw) * Math.cos(view.pitch) * d);
    camera.lookAt(tx, ty, tz);
    camera.aspect = pw / ph;
    // keep the subject the same size on a narrow pane: widen the view instead of cropping
    camera.fov = Math.min(70, (opts.fov || 24) * Math.max(1, (opts.fit || .78) / camera.aspect));
    camera.updateProjectionMatrix();
    // the lights follow the camera, so the model stays lit from the viewer's front-left
    const yaw = view.yaw;
    key.position.set(-3.5 * Math.cos(yaw) + 3.2 * Math.sin(yaw), 3, 3.2 * Math.cos(yaw) + 3.5 * Math.sin(yaw));
    rim.position.set(2.5 * Math.cos(yaw) - 4 * Math.sin(yaw), 2, -4 * Math.cos(yaw) - 2.5 * Math.sin(yaw));
    fill.position.set(3 * Math.cos(yaw) + 2.5 * Math.sin(yaw), .5, 2.5 * Math.cos(yaw) - 3 * Math.sin(yaw));
    const first = view.split ? 0 : panes.length - 1;
    for (let k = 0; k < panes.length; k++) panes[k].group.visible = false;
    for (let i = 0; i < n; i++) {
      const p = panes[first + i]; p.group.visible = true;
      const x = stack ? 0 : i * pw, y = stack ? (n - 1 - i) * ph : 0;
      renderer.setScissor(x, y, pw, ph); renderer.setViewport(x, y, pw, ph);
      renderer.render(scene, camera);
      p.group.visible = false;
    }
    renderer.setScissorTest(false);
  }

  /* dragging turns the model, pinch and wheel zoom */
  const pts = new Map(); let base = null;
  canvas.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    base = {yaw:view.yaw, pitch:view.pitch, zoom:view.zoom, pts:new Map(pts)};
    opts.onTouch && opts.onTouch();
  });
  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !base) return;
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (pts.size === 1) {
      const s = base.pts.get(e.pointerId); if (!s) return;
      setView(base.yaw + (e.clientX - s.x) / Math.max(240, w * .5) * 2.2, base.pitch + (e.clientY - s.y) / h * 1.2);
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()], [a0, b0] = [...base.pts.values()];
      if (a0 && b0) setZoom(base.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(20, Math.hypot(a0.x - b0.x, a0.y - b0.y)));
    }
    opts.onChange && opts.onChange(view);
  });
  const up = e => { pts.delete(e.pointerId); base = pts.size ? {yaw:view.yaw, pitch:view.pitch, zoom:view.zoom, pts:new Map(pts)} : null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(view.zoom * Math.exp(-e.deltaY * .0012)); opts.onChange && opts.onChange(view); }, {passive:false});
  canvas.addEventListener('keydown', e => {
    const k = {ArrowLeft:[-.15, 0], ArrowRight:[.15, 0], ArrowUp:[0, -.08], ArrowDown:[0, .08]}[e.key];
    if (k) { e.preventDefault(); setView(view.yaw + k[0], view.pitch + k[1]); opts.onChange && opts.onChange(view); }
    if (e.key === '+' || e.key === '=') setZoom(view.zoom * 1.1);
    if (e.key === '-') setZoom(view.zoom / 1.1);
  });
  canvas.style.touchAction = 'none';

  if ('ResizeObserver' in window) { ro = new ResizeObserver(size); ro.observe(host); } else window.addEventListener('resize', size);
  size();

  /* the current panes as an image, for saving */
  function snapshot(width, height){
    const prev = [w, h];
    renderer.setPixelRatio(1); renderer.setSize(width, height, false); w = width; h = height;
    draw();
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    [w, h] = prev; size();
    return c;
  }
  return {
    THREE, canvas, view, setModel, setPositions, setColors, setGhosts, frame, setView, setZoom, render, snapshot,
    setSplit(on, active){ view.split = !!on; if (active) view.active = active; render(); },
    destroy(){ cancelAnimationFrame(raf); ro && ro.disconnect(); panes.forEach(p => p.geo.dispose()); renderer.dispose(); canvas.remove(); },
  };
}
