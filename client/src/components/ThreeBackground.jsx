import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 12;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x312e81, 1.5); // Deep purple/indigo ambient
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 5, 30); // Indigo glow
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 4, 30); // Purple glow
    pointLight2.position.set(-5, -5, 3);
    scene.add(pointLight2);

    // 1. Floating 3D Cards / Ticket Objects
    const cards = [];
    const cardGeometry = new THREE.BoxGeometry(2, 3, 0.08);

    const cardCount = 4;
    for (let i = 0; i < cardCount; i++) {
      const cardMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x6366f1,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.3, // Soft glassmorphic transparency
        thickness: 0.5,
        opacity: 0.85,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(cardGeometry, cardMaterial);

      // Random initial position
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      );

      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Custom velocity and orbit rates
      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.005,
        rotSpeedY: (Math.random() - 0.5) * 0.005,
        rotSpeedZ: (Math.random() - 0.5) * 0.005,
        orbitSpeed: 0.0002 + Math.random() * 0.0003,
        orbitRadius: mesh.position.length(),
        orbitAngle: Math.atan2(mesh.position.y, mesh.position.x),
        floatOffset: Math.random() * Math.PI * 2,
      };

      scene.add(mesh);
      cards.push(mesh);
    }

    // 2. Particle Field
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 20;     // X
      particlePositions[i + 1] = (Math.random() - 0.5) * 15; // Y
      particlePositions[i + 2] = (Math.random() - 0.5) * 10; // Z
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Custom circular soft particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa5b4fc, // Soft indigo-purple color
      size: 0.15,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse Tracking for Parallax
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (event) => {
      // Normalize between -1 and 1
      mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Slow orbit and floating behavior for cards
      cards.forEach((card) => {
        const ud = card.userData;
        
        // 3D rotations
        card.rotation.x += ud.rotSpeedX;
        card.rotation.y += ud.rotSpeedY;
        card.rotation.z += ud.rotSpeedZ;

        // Slow Orbit
        ud.orbitAngle += ud.orbitSpeed;
        card.position.x = Math.cos(ud.orbitAngle) * ud.orbitRadius;
        card.position.y = Math.sin(ud.orbitAngle) * ud.orbitRadius;

        // Subtle vertical floating motion
        card.position.y += Math.sin(elapsedTime * 0.5 + ud.floatOffset) * 0.005;
      });

      // Slowly rotate particle field
      particles.rotation.y = elapsedTime * 0.02;
      particles.rotation.x = elapsedTime * 0.01;

      // Camera parallax lerp (limit max movement to keep it subtle)
      mouse.x += (mouse.targetX * 2 - mouse.x) * 0.05;
      mouse.y += (mouse.targetY * 2 - mouse.y) * 0.05;

      camera.position.x = mouse.x;
      camera.position.y = mouse.y;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Memory cleanup
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      cardGeometry.dispose();
      cards.forEach((card) => {
        card.material.dispose();
      });

      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
    />
  );
};

export default ThreeBackground;
