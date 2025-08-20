import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/*
  Game component: configura cena Three.js, player, árvores e UI.
  Controles: botões virtuais e teclado (WASD / setas)
  Movimento baseado em física simples (velocidade, gravidade).
  UPDATED: remoção de árvore por colisão com o jogador (ao colidir, a árvore some e outra nasce).
*/

const TREE_COUNT = 12;
const WORLD_RADIUS = 40;
const COLLIDE_DISTANCE = 1.4; // distância horizontal para considerar colisão (ajustável)

export default function Game(){
  const mountRef = useRef();
  const [hudText, setHudText] = useState("Bem-vindo!");
  const controlsRef = useRef({
    forward:false, back:false, left:false, right:false, jump:false
  });

  // refs for scene objects we need during UI actions
  const sceneRef = useRef();
  const cameraRef = useRef();
  const playerRef = useRef();
  const treesRef = useRef([]);
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(()=>{
    // Setup renderer, scene, camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87c6ff); // céu claro
    scene.fog = new THREE.FogExp2(0x87c6ff, 0.006);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.id = "three-canvas";
    mountRef.current.appendChild(renderer.domElement);

    // Camera (first-person attached to player)
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 200);
    cameraRef.current = camera;

    // Light
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5,10,2);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Ground
    const groundGeo = new THREE.PlaneGeometry(500,500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a6a2b, roughness:1, metalness:0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    scene.add(ground);

    // Player (invisible collider)
    const player = {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({visible:false})),
      velocity: new THREE.Vector3(),
      speed: 6,
      canJump: true
    };
    player.mesh.position.set(0,1.2,0);
    scene.add(player.mesh);
    playerRef.current = player;

    // Trees container
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    treesRef.current = [];
    function spawnTreeAt(x,z){
      const trunkGeo = new THREE.CylinderGeometry(0.25,0.35,1.6,8);
      const trunkMat = new THREE.MeshStandardMaterial({color:0x6b3f1f});
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x,0.8,z);

      const leavesGeo = new THREE.ConeGeometry(1.4,2.2,8);
      const leavesMat = new THREE.MeshStandardMaterial({color:0x1e8b3a});
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(x,2.0,z);

      const root = new THREE.Group();
      root.add(trunk);
      root.add(leaves);
      root.userData = { isTree:true, cutting:false };
      treeGroup.add(root);
      treesRef.current.push(root);
    }

    // spawn initial trees randomly
    for(let i=0;i<TREE_COUNT;i++){
      const angle = Math.random()*Math.PI*2;
      const radius = 6 + Math.random()*(WORLD_RADIUS-6);
      const x = Math.cos(angle)*radius + (Math.random()-0.5)*6;
      const z = Math.sin(angle)*radius + (Math.random()-0.5)*6;
      spawnTreeAt(x,z);
    }

    // helper: spawn new tree not too close to player
    function spawnNewTreeFar(){
      let tries = 0;
      while(tries < 50){
        const angle = Math.random()*Math.PI*2;
        const radius = 6 + Math.random()*(WORLD_RADIUS-6);
        const x = Math.cos(angle)*radius + (Math.random()-0.5)*6;
        const z = Math.sin(angle)*radius + (Math.random()-0.5)*6;
        const dist = Math.hypot(x - player.mesh.position.x, z - player.mesh.position.z);
        if(dist > 4){
          const existing = treesRef.current.find(t=>{
            const p = new THREE.Vector3(); t.getWorldPosition(p);
            return p.distanceTo(new THREE.Vector3(x,0, z)) < 2.2;
          });
          if(!existing){
            const trunkGeo = new THREE.CylinderGeometry(0.25,0.35,1.6,8);
            const trunkMat = new THREE.MeshStandardMaterial({color:0x6b3f1f});
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x,0.8,z);

            const leavesGeo = new THREE.ConeGeometry(1.4,2.2,8);
            const leavesMat = new THREE.MeshStandardMaterial({color:0x1e8b3a});
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.set(x,2.0,z);

            const root = new THREE.Group();
            root.add(trunk);
            root.add(leaves);
            root.userData = { isTree:true, cutting:false };
            treeGroup.add(root);
            treesRef.current.push(root);
            break;
          }
        }
        tries++;
      }
    }

    // add a subtle sky gradient (large sphere)
    const skyGeom = new THREE.SphereGeometry(120, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x99d7ff, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeom, skyMat);
    scene.add(sky);

    // camera initial position and orientation
    function updateCameraToPlayer(){
      const eyePos = player.mesh.position.clone().add(new THREE.Vector3(0,0.9,0));
      camera.position.copy(eyePos);
    }
    updateCameraToPlayer();

    // Controls: rotation by drag
    let isPointerDown = false;
    let lastX = 0, lastY = 0;
    const euler = new THREE.Euler(0,0,0,'YXZ'); // pitch then yaw
    let yaw = 0, pitch = 0;

    function onPointerDown(e){
      isPointerDown = true;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      lastY = (e.touches ? e.touches[0].clientY : e.clientY);
    }
    function onPointerMove(e){
      if(!isPointerDown) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const dx = (x - lastX);
      const dy = (y - lastY);
      lastX = x; lastY = y;
      const sensitivity = 0.002;
      yaw -= dx * sensitivity;
      pitch -= dy * sensitivity;
      pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch));
    }
    function onPointerUp(){ isPointerDown = false; }

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    renderer.domElement.addEventListener('touchstart', onPointerDown, {passive:false});
    window.addEventListener('touchmove', onPointerMove, {passive:false});
    window.addEventListener('touchend', onPointerUp);

    // Keyboard fallback
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

    // Jump logic
    function attemptJump(){
      if(player.canJump){
        player.velocity.y = 7;
        player.canJump = false;
        setHudText("Pulando!");
      }
    }

    // Animation loop
    let last = performance.now();
    const tmpPos = new THREE.Vector3();

    function animate(now){
      const dt = Math.min(0.05, (now - last)/1000);
      last = now;

      // update rotation from yaw/pitch
      euler.set(pitch, yaw, 0);
      camera.quaternion.setFromEuler(euler);

      // movement vector local to camera direction (but locked to ground)
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0;
      dir.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(new THREE.Vector3(0,1,0), dir).normalize();

      let move = new THREE.Vector3();
      if(controlsRef.current.forward) move.add(dir);
      if(controlsRef.current.back) move.sub(dir);
      if(controlsRef.current.left) move.sub(right);
      if(controlsRef.current.right) move.add(right);

      if(move.length() > 0){
        move.normalize();
        // accelerate toward direction
        const desired = move.multiplyScalar(player.speed);
        // simple smoothing
        player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, desired.x, 0.12);
        player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, desired.z, 0.12);
        setHudText("Andando...");
      } else {
        // slowdown
        player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, 0, 0.12);
        player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, 0, 0.12);
        if(player.canJump) setHudText("Parado");
      }

      // gravity and vertical movement
      player.velocity.y -= 9.8 * dt; // gravity
      player.mesh.position.addScaledVector(player.velocity, dt);

      // ground collision
      if(player.mesh.position.y < 1.2){
        player.mesh.position.y = 1.2;
        player.velocity.y = 0;
        player.canJump = true;
      }

      // cap world radius (soft bounds)
      const horiz = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z);
      if(horiz.length() > WORLD_RADIUS - 1){
        horiz.setLength(WORLD_RADIUS - 1);
        player.mesh.position.x = horiz.x;
        player.mesh.position.z = horiz.y;
        // slow velocity
        player.velocity.x *= 0.2;
        player.velocity.z *= 0.2;
      }

      // Collision detection: if player is close to any tree, "cut" it (no button needed)
      for(let i = treesRef.current.length - 1; i >= 0; i--){
        const tree = treesRef.current[i];
        if(!tree || tree.userData.cutting) continue;
        tree.getWorldPosition(tmpPos);
        const dist = tmpPos.distanceTo(player.mesh.position);
        if(dist <= COLLIDE_DISTANCE){
          // mark and animate removal
          tree.userData.cutting = true;
          const start = performance.now();
          const duration = 300;
          (function animateCut(targetTree, treeIndex){
            function step(nowCut){
              const t = Math.min(1, (nowCut - start)/duration);
              const s = 1 - t;
              targetTree.scale.setScalar(s);
              if(t < 1){
                requestAnimationFrame(step);
              } else {
                // final removal
                const parent = targetTree.parent;
                if(parent){
                  parent.remove(targetTree);
                }
                // remove from array safely
                const idx = treesRef.current.indexOf(targetTree);
                if(idx !== -1) treesRef.current.splice(idx, 1);
                // spawn a new tree somewhere else
                spawnNewTreeFar();
                setHudText("Árvore colidida e removida!");
              }
            }
            requestAnimationFrame(step);
          })(tree, i);
        }
      }

      // update camera to player pos
      const eye = player.mesh.position.clone().add(new THREE.Vector3(0,0.9,0));
      camera.position.copy(eye);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // resize
    function onResize(){
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h);
    }
    window.addEventListener('resize', onResize);

    // Expose functions to refs for UI callbacks (keep refs updated)
    cameraRef.current = camera;
    playerRef.current = player;
    // cleanup on unmount
    return ()=>{
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      renderer.domElement.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      mountRef.current.removeChild(renderer.domElement);
      // dispose three resources (lightweight cleanup)
    };
  },[]);

  // UI event handlers (touch friendly)
  function handleControlPress(name){
    controlsRef.current[name] = true;
    document.querySelector(`.btn-${name}`)?.classList.add('active');
  }
  function handleControlRelease(name){
    controlsRef.current[name] = false;
    document.querySelector(`.btn-${name}`)?.classList.remove('active');
  }

  function handleJumpPress(){
    document.querySelector('.jump-btn')?.classList.add('active');
    const p = playerRef.current;
    if(p) {
      if(p.canJump){
        p.velocity.y = 7;
        p.canJump = false;
        setHudText("Pulando!");
      }
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
            onTouchStart={(e)=>{ e.preventDefault(); handleControlPress('forward');}}
            onTouchEnd={(e)=>{ e.preventDefault(); handleControlRelease('forward');}}
            onMouseDown={()=> handleControlPress('forward')}
            onMouseUp={()=> handleControlRelease('forward')}
            onMouseLeave={()=> handleControlRelease('forward')}
          >Frente</div>

          <div
            className="ctrl-btn btn-back"
            onTouchStart={(e)=>{ e.preventDefault(); handleControlPress('back');}}
            onTouchEnd={(e)=>{ e.preventDefault(); handleControlRelease('back');}}
            onMouseDown={()=> handleControlPress('back')}
            onMouseUp={()=> handleControlRelease('back')}
            onMouseLeave={()=> handleControlRelease('back')}
          >Trás</div>

          <div
            className="ctrl-btn btn-left"
            onTouchStart={(e)=>{ e.preventDefault(); handleControlPress('left');}}
            onTouchEnd={(e)=>{ e.preventDefault(); handleControlRelease('left');}}
            onMouseDown={()=> handleControlPress('left')}
            onMouseUp={()=> handleControlRelease('left')}
            onMouseLeave={()=> handleControlRelease('left')}
          >Esq</div>

          <div
            className="ctrl-btn btn-right"
            onTouchStart={(e)=>{ e.preventDefault(); handleControlPress('right');}}
            onTouchEnd={(e)=>{ e.preventDefault(); handleControlRelease('right');}}
            onMouseDown={()=> handleControlPress('right')}
            onMouseUp={()=> handleControlRelease('right')}
            onMouseLeave={()=> handleControlRelease('right')}
          >Dir</div>
        </div>

        <div
          className="jump-btn"
          onTouchStart={(e)=>{ e.preventDefault(); handleJumpPress(); }}
          onMouseDown={(e)=>{ e.preventDefault(); handleJumpPress(); }}
        >
          PULAR
        </div>

        {/* Botão CORTAR removido — agora as árvores somem ao colidir com o jogador */}

      </div>
    </div>
  );
        }
