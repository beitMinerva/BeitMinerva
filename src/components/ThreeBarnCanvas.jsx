import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBarnCanvas({
  barnAreas = [],
  goats = [],
  selectedPenId,
  onSelectPen
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 320;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. Camera Setup (Perspective top-angled view)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 9.5, 9.5);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 5. Barn Ground Base
    const groundGeo = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xecfdf5, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Overlay
    const gridHelper = new THREE.GridHelper(10, 10, 0xa7f3d0, 0xe2e8f0);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 6. 3D Pen Positions (3x2 Grid)
    const penPositions = [
      { id: 'area-1', letter: 'A', x: -2.2, z: -2.4, color: 0x10b981 },
      { id: 'area-2', letter: 'B', x: 2.2, z: -2.4, color: 0x059669 },
      { id: 'area-3', letter: 'C', x: -2.2, z: 0.0, color: 0x047857 },
      { id: 'area-4', letter: 'D', x: 2.2, z: 0.0, color: 0x065f46 },
      { id: 'area-5', letter: 'E', x: -2.2, z: 2.4, color: 0x0d9488 },
      { id: 'area-6', letter: 'F', x: 2.2, z: 2.4, color: 0x0284c7 },
    ];

    const penMeshes = [];

    penPositions.forEach((pen) => {
      const isSelected = pen.id === selectedPenId;
      const penGroup = new THREE.Group();
      penGroup.position.set(pen.x, 0, pen.z);
      penGroup.userData = { penId: pen.id, letter: pen.letter };

      // Pen Floor Pad
      const padGeo = new THREE.BoxGeometry(3.6, 0.1, 2.0);
      const padMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x059669 : pen.color,
        roughness: 0.4,
        metalness: 0.1
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = 0.05;
      pad.receiveShadow = true;
      pad.castShadow = true;
      penGroup.add(pad);

      // Wooden Fence Rails around Pen
      const fenceMat = new THREE.MeshStandardMaterial({ color: isSelected ? 0x065f46 : 0x475569 });

      // Left & Right posts
      [-1.75, 1.75].forEach((px) => {
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6);
        const postMesh = new THREE.Mesh(postGeo, fenceMat);
        postMesh.position.set(px, 0.3, 0);
        postMesh.castShadow = true;
        penGroup.add(postMesh);
      });

      // 3D Letter Marker (Box Plaque)
      const plaqueGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffffff : 0xffffff,
        roughness: 0.2
      });
      const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaque.position.set(0, 0.5, 0);
      plaque.castShadow = true;
      penGroup.add(plaque);

      scene.add(penGroup);
      penMeshes.push(pad); // Add clickable floor pad mesh
      pad.userData = { penId: pen.id };
    });

    // 7. Raycaster Mouse/Touch Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(penMeshes);

      if (intersects.length > 0) {
        const clickedPenId = intersects[0].object.userData.penId;
        if (clickedPenId && onSelectPen) {
          onSelectPen(clickedPenId);
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);

    // 8. Orbit Animation Loop (Smooth gentle rotation around 3D barn)
    let animationFrameId;
    let angle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = Math.sin(angle) * 11;
      camera.position.z = Math.cos(angle) * 11;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedPenId, onSelectPen]);

  return (
    <div className="three-canvas-container" mount-ref="true" ref={mountRef}>
      <div className="three-controls-hint">
        3D Barn View • Tap any 3D Pen (A–F)
      </div>
    </div>
  );
}
