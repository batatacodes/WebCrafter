import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/*
  Game component (single-player):
  - Árvores e casinhas são obstáculos sólidos (colisão por raio simples).
  - Não há multiplayer, nem botão de cortar.
  - Controles: agora usam Pointer Events + listener global para garantir liberação.
*/

const TREE_COUNT = 30;
const HOUSE_COUNT = 6;
const WORLD_RADIUS = 40;
const PLAYER_RADIUS = 0.6;

export default function Game(){
  const mountRef = useRef();
  const [hudText, setHudText] = useState("Bem-vindo!");
  const controlsRef = useRef({ forward:false, back:false, left:false, right:false, jump:false });

  // three refs
  const sceneRef = useRef();
  const cameraRef = useRef();
  const playerRef = useRef();
  const treesRef = useRef([]);
  const housesRef = useRef([]);

  useEffect(()=>{
    // --- Three.js setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87c6ff);
    scene.fog = new THREE.FogExp2(0x87c6ff, 0.006);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.id = "three-canvas";
    mountRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 200);
    cameraRef.current = camera;

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5,10,2);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500,500),
      new THREE.MeshStandardMaterial({ color: 0x1a6a2b, roughness:1 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    scene.add(ground);

    // player collider (invisible)
    const player = {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(PLAYER_RADIUS, 8, 8), new THREE.MeshBasicMaterial({visible:false})),
      velocity: new THREE.Vector3(),
      speed: 6,
      canJump: true
    };
    player.mesh.position.set(0,1.2,0);
    scene.add(player.mesh);
    playerRef.current = player;

    // trees group
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);
    treesRef.current = [];

    function createTreeAt(x,z){
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.35,1.6,8), new THREE.MeshStandardMaterial({color:0x6b3f1f}));
      trunk.position.set(x,0.8,z);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.4,2.2,8), new THREE.MeshStandardMaterial({color:0x1e8b3a}));
      leaves.position.set(x,2.0,z);
      const root = new THREE.Group();
      root.add(trunk);
      root.add(leaves);
      root.userData = { isTree:true, collisionRadius: 1.2 };
      treeGroup.add(root);
      treesRef.current.push(root);
    }

    // spawn trees
    for(let i=0;i<TREE_COUNT;i++){
      const angle = Math.random()*Math.PI*2;
      const radius = 6 + Math.random()*(WORLD_RADIUS-8);
      const x = Math.cos(angle)*radius + (Math.random()-0.5)*6;
      const z = Math.sin(angle)*radius + (Math.random()-0.5)*6;
      createTreeAt(x,z);
    }

    // houses
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    housesRef.current = [];

    function createHouseAt(x,z){
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4,1.6,2.0), new THREE.MeshStandardMaterial({color:0xd9c6a6}));
      base.position.set(x,0.8,z);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6,1,4), new THREE.MeshStandardMaterial({color:0x8b3b2a}));
      roof.position.set(x,1.6,z);
      const grp = new THREE.Group();
      grp.add(base); grp.add(roof);
      grp.userData = { isHouse:true, collisionRadius: 1.5, boxCenter: new THREE.Vector3(x,0.8,z) };
      houseGroup.add(grp);
      housesRef.current.push(grp);
    }

    for(let i=0;i<HOUSE_COUNT;i++){
      const angle = Math.random()*Math.PI*2;
      const radius = 8 + Math.random()*(WORLD_RADIUS-12);
      const x = Math.cos(angle)*radius + (Math.random()-0.5)*6;
      const z = Math.sin(angle)*radius + (Math.random()-0.5)*6;
      createHouseAt(x,z);
    }

    // sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120,32,32), new THREE.MeshBasicMaterial({ color:0x99d7ff, side: THREE.BackSide }));
    scene.add(sky);

    // camera initial pos
    camera.position.copy(player.mesh.position.clone().add(new THREE.Vector3(0,0.9,0)));

    // mouse/touch rotation
    let isPointerDown = false;
    let lastX = 0, lastY = 0;
    const euler = new THREE.Euler(0,0,0,'YXZ');
    let yaw = 0, pitch = 0;
    function onPointerDownCamera(e){
      isPointerDown = true;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      lastY = (e.touches ? e.touches[0].clientY : e.clientY);
    }
    function onPointerMoveCamera(e){
      if(!isPointerDown) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const dx = x - lastX; const dy = y - lastY;
      lastX = x; lastY = y;
      const sensitivity = 0.002;
      yaw -= dx * sensitivity;
      pitch -= dy * sensitivity;
      pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch));
    }
    function onPointerUpCamera(){ isPointerDown = false; }

    renderer.domElement.addEventListener('pointerdown', onPointerDownCamera);
    window.addEventListener('pointermove', onPointerMoveCamera);
    window.addEventListener('pointerup', onPointerUpCamera);

    // keyboard fallback
    function onKeyDown(e){
      if(e.code === 'KeyW' || e.code === 'ArrowUp') controlsRef.current.forward = true;
      if(e.code === 'KeyS' || e.code === 'ArrowDown') controlsRef.current.back = true;
      if(e.code === 'KeyA' || e.code === 'ArrowLeft') controlsRef.current.left = true;
      if(e.code === 'KeyD' || e.code === 'ArrowRight') controlsRef.current.right = true;
      if(e.code === 'Space') attemptJump();
    }
    function onKeyUp(e){
      if(e.code === 'KeyW' || e.code === 'ArrowUp') controlsRef.current.forward = false;
      if(e.code === 'KeyS' || e.code === 'ArrowDown') controlsRef.current.back = false;
      if(e.code === 'KeyA' || e.code === 'ArrowLeft') controlsRef.current.left = false;
      if(e.code === 'KeyD' || e.code === 'ArrowRight') controlsRef.current.right = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function attemptJump(){
      if(player.canJump){
        player.velocity.y = 7;
        player.canJump = false;
        setHudText("Pulando!");
      }
    }

    // helper collision check (against trees and houses) — simple radius-based
    function collidesWithObjects(proposedPos){
      // trees
      for(const t of treesRef.current){
        const p = new THREE.Vector3(); t.getWorldPosition(p);
        const dx = proposedPos.x - p.x;
        const dz = proposedPos.z - p.z;
        const dist2 = dx*dx + dz*dz;
        const r = PLAYER_RADIUS + (t.userData.collisionRadius || 1.2);
        if(dist2 < r*r) return true;
      }
      // houses
      for(const h of housesRef.current){
        const p = new THREE.Vector3(); h.getWorldPosition(p);
        const dx = proposedPos.x - p.x;
        const dz = proposedPos.z - p.z;
        const r = PLAYER_RADIUS + (h.userData.collisionRadius || 1.5);
        if(dx*dx + dz*dz < r*r) return true;
      }
      return false;
    }

    // --- Animation loop ---
    let last = performance.now();
    function animate(now){
      const dt = Math.min(0.05, (now - last)/1000);
      last = now;

      // camera rotation from yaw/pitch
      euler.set(pitch, yaw, 0);
      camera.quaternion.setFromEuler(euler);

      // movement direction
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const right = new THREE.Vector3(); right.crossVectors(new THREE.Vector3(0,1,0), dir).normalize();

      let move = new THREE.Vector3();
      if(controlsRef.current.forward) move.add(dir);
      if(controlsRef.current.back) move.sub(dir);
      if(controlsRef.current.left) move.sub(right);
      if(controlsRef.current.right) move.add(right);

      if(move.length() > 0){
        move.normalize();
        const desired = move.multiplyScalar(player.speed);
        player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, desired.x, 0.12);
        player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, desired.z, 0.12);
        setHudText("Andando...");
      } else {
        player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, 0, 0.12);
        player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, 0, 0.12);
        if(player.canJump) setHudText("Parado");
      }

      // gravity
      player.velocity.y -= 9.8 * dt;
      // propose next position
      const proposed = player.mesh.position.clone().addScaledVector(player.velocity, dt);

      // ground collision
      if(proposed.y < 1.2){
        proposed.y = 1.2;
        player.velocity.y = 0;
        player.canJump = true;
      }

      // boundary
      const horiz = new THREE.Vector2(proposed.x, proposed.z);
      if(horiz.length() > WORLD_RADIUS - 1){
        horiz.setLength(WORLD_RADIUS - 1);
        proposed.x = horiz.x; proposed.z = horiz.y;
        player.velocity.x *= 0.2; player.velocity.z *= 0.2;
      }

      // collision check: if colliding, cancel horizontal movement this frame
      const collided = collidesWithObjects(proposed);
      if(collided){
        // keep vertical motion (fall/jump), but cancel horizontal
        proposed.x = player.mesh.position.x;
        proposed.z = player.mesh.position.z;
        player.velocity.x = 0;
        player.velocity.z = 0;
        setHudText("Colidiu com obstáculo");
      }

      // apply
      player.mesh.position.copy(proposed);

      // update camera position
      const eye = player.mesh.position.clone().add(new THREE.Vector3(0,0.9,0));
      camera.position.copy(eye);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // --- cleanup & resize ---
    function onResize(){
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix();
      renderer.setSize(w,h);
    }
    window.addEventListener('resize', onResize);

    // expose refs
    cameraRef.current = camera;

    // --- cleanup on unmount ---
    return ()=>{
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDownCamera);
      window.removeEventListener('pointermove', onPointerMoveCamera);
      window.removeEventListener('pointerup', onPointerUpCamera);
      if(mountRef.current && renderer.domElement.parentElement === mountRef.current){
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  },[]);

  // Release all movement controls (used by global pointerup)
  function releaseAllControls(){
    controlsRef.current.forward = false;
    controlsRef.current.back = false;
    controlsRef.current.left = false;
    controlsRef.current.right = false;
    // remove visual active classes
    document.querySelectorAll('.ctrl-btn.active').forEach(el=>el.classList.remove('active'));
  }

  // UI events (Pointer Events)
  function handleControlPointerDown(name, e){
    e.preventDefault?.();
    controlsRef.current[name] = true;
    const el = e.currentTarget || document.querySelector(`.btn-${name}`);
    el?.classList?.add('active');
  }
  function handleControlPointerUp(name, e){
    e.preventDefault?.();
    controlsRef.current[name] = false;
    const el = e.currentTarget || document.querySelector(`.btn-${name}`);
    el?.classList?.remove('active');
  }

  // Add a global pointerup listener to ensure release when pointer is lifted anywhere
  useEffect(()=>{
    function onGlobalPointerUp(){ releaseAllControls(); }
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);
    return ()=>{
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  },[]);

  function handleJumpPress(){
    document.querySelector('.jump-btn')?.classList.add('active');
    const p = playerRef.current;
    if(p && p.canJump){
      p.velocity.y = 7;
      p.canJump = false;
      setHudText("Pulando!");
    }
    setTimeout(()=>document.querySelector('.jump-btn')?.classList.remove('active'),120);
  }

  return (
    <div style={{width:'100%', height:'100%'}}>
      <div ref={mountRef} style={{width:'100%', height:'100%'}} />
      <div className="overlay-ui">
        <div className="hud-top">{hudText}</div>

        <div className="controls-left">
          <div
            className="ctrl-btn btn-forward"
            onPointerDown={(e)=> handleControlPointerDown('forward', e)}
            onPointerUp={(e)=> handleControlPointerUp('forward', e)}
            onPointerLeave={(e)=> handleControlPointerUp('forward', e)}
          >Frente</div>

          <div
            className="ctrl-btn btn-back"
            onPointerDown={(e)=> handleControlPointerDown('back', e)}
            onPointerUp={(e)=> handleControlPointerUp('back', e)}
            onPointerLeave={(e)=> handleControlPointerUp('back', e)}
          >Trás</div>

          <div
            className="ctrl-btn btn-left"
            onPointerDown={(e)=> handleControlPointerDown('left', e)}
            onPointerUp={(e)=> handleControlPointerUp('left', e)}
            onPointerLeave={(e)=> handleControlPointerUp('left', e)}
          >Esq</div>

          <div
            className="ctrl-btn btn-right"
            onPointerDown={(e)=> handleControlPointerDown('right', e)}
            onPointerUp={(e)=> handleControlPointerUp('right', e)}
            onPointerLeave={(e)=> handleControlPointerUp('right', e)}
          >Dir</div>
        </div>

        <div
          className="jump-btn"
          onPointerDown={(e)=>{ e.preventDefault(); handleJumpPress(); }}
        >
          PULAR
        </div>

      </div>
    </div>
  );
                                      }
