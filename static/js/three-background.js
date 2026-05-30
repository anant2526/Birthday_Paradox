/**
 * Three.js Paradox-Themed Interactive 3D Background
 * Creates a beautiful, high-performance particle network of nested,
 * counter-rotating spheres with dynamic linkages and mouse parallax.
 * Colors are carefully mapped to the CSS theme (Cyan/Pink).
 */

(function () {
  let scene, camera, renderer, container;
  let particles1, particles2, lines;
  let mouseX = 0, mouseY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;

  const particleCount = 250; // Balanced for excellent performance & visual richness
  const connectionDistance = 90;

  function init() {
    container = document.createElement('div');
    container.id = 'threeCanvasContainer';
    // Style to position fixed behind everything
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '-2';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.style.background = 'radial-gradient(circle at 50% 50%, #0c0e18 0%, #06070a 100%)';
    document.body.appendChild(container);

    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.0015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 400;

    // 2. Generate a glowing soft particle texture
    const particleTexture = createCircularTexture();

    // 3. Create two groups of particles (Nested spheres representing colliding birthday sets)
    const geom1 = new THREE.BufferGeometry();
    const geom2 = new THREE.BufferGeometry();

    const positions1 = [];
    const positions2 = [];
    const velocities1 = [];
    const velocities2 = [];

    // Sphere 1: Cyan (representing Set A)
    for (let i = 0; i < particleCount; i++) {
      // Golden spiral distribution on sphere for beautiful regularity
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const radius = 160;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions1.push(x, y, z);
      // Small random drift velocities
      velocities1.push(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      );
    }

    // Sphere 2: Pink/Purple (representing Set B)
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi + Math.PI / 4; // offset
      const radius = 130; // nested inside

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions2.push(x, y, z);
      velocities2.push(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
    }

    geom1.setAttribute('position', new THREE.Float32BufferAttribute(positions1, 3));
    geom2.setAttribute('position', new THREE.Float32BufferAttribute(positions2, 3));

    // Particle Materials matching CSS vars (--cyan: #00f2fe, --pink: #f857a6)
    const mat1 = new THREE.PointsMaterial({
      size: 5,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x00f2fe
    });

    const mat2 = new THREE.PointsMaterial({
      size: 4,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xf857a6
    });

    particles1 = new THREE.Points(geom1, mat1);
    particles2 = new THREE.Points(geom2, mat2);

    scene.add(particles1);
    scene.add(particles2);

    // 4. Line Connections (dynamic linkages representing matching pairs)
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    const lineColors = [];

    // Initialize line buffers (allocate max capacity to avoid re-allocating memory)
    const maxConnections = 600;
    for (let i = 0; i < maxConnections * 2; i++) {
      linePositions.push(0, 0, 0);
      lineColors.push(0, 0, 0);
    }

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.25,
      depthWrite: false
    });

    lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Store velocities on the objects
    particles1.userData = { velocities: velocities1, initialPositions: positions1.slice() };
    particles2.userData = { velocities: velocities2, initialPositions: positions2.slice() };

    // 5. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // 6. Listeners
    document.addEventListener('mousemove', onDocumentMouseMove);
    window.addEventListener('resize', onWindowResize);
  }

  // Generate smooth, glowing circular canvas texture
  function createCircularTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  function onDocumentMouseMove(event) {
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function render() {
    const time = Date.now() * 0.0001;

    // 1. Slow, elegant rotations of the two spheres in opposite directions
    particles1.rotation.y = time * 0.15;
    particles1.rotation.x = time * 0.08;

    particles2.rotation.y = -time * 0.2;
    particles2.rotation.z = time * 0.1;

    // 2. Animate particle drift & bounding box bounds (pulsing quantum paradox effect)
    const p1 = particles1.geometry.attributes.position.array;
    const v1 = particles1.userData.velocities;
    const init1 = particles1.userData.initialPositions;

    const p2 = particles2.geometry.attributes.position.array;
    const v2 = particles2.userData.velocities;
    const init2 = particles2.userData.initialPositions;

    const driftScale = 15 * Math.sin(time * 2);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      // Drift particles slightly around their initial spherical distribution
      p1[idx] = init1[idx] + Math.sin(time + i) * driftScale * v1[idx];
      p1[idx + 1] = init1[idx + 1] + Math.cos(time + i) * driftScale * v1[idx + 1];
      p1[idx + 2] = init1[idx + 2] + Math.sin(time * 0.5 + i) * driftScale * v1[idx + 2];

      p2[idx] = init2[idx] + Math.cos(time * 0.8 + i) * driftScale * v2[idx];
      p2[idx + 1] = init2[idx + 1] + Math.sin(time * 0.8 + i) * driftScale * v2[idx + 1];
      p2[idx + 2] = init2[idx + 2] + Math.cos(time * 0.4 + i) * driftScale * v2[idx + 2];
    }
    particles1.geometry.attributes.position.needsUpdate = true;
    particles2.geometry.attributes.position.needsUpdate = true;

    // 3. Update Dynamic Linkages between close-by elements (cyan and pink intersections)
    const linePositions = lines.geometry.attributes.position.array;
    const lineColors = lines.geometry.attributes.color.array;
    let lineCount = 0;
    const maxLines = 600;

    // Get absolute world positions for accurate distance checking
    const sphere1Positions = [];
    const sphere2Positions = [];
    
    // We apply current rotations to coordinates for collision line calculations
    const rotY1 = particles1.rotation.y, rotX1 = particles1.rotation.x;
    const rotY2 = particles2.rotation.y, rotZ2 = particles2.rotation.z;

    const cy1 = Math.cos(rotY1), sy1 = Math.sin(rotY1);
    const cx1 = Math.cos(rotX1), sx1 = Math.sin(rotX1);

    const cy2 = Math.cos(rotY2), sy2 = Math.sin(rotY2);
    const cz2 = Math.cos(rotZ2), sz2 = Math.sin(rotZ2);

    for (let i = 0; i < particleCount; i += 2) { // Step by 2 to speed up checks & improve layout spacing
      const idx = i * 3;

      // Transform particle 1 coordinates
      let x1 = p1[idx], y1 = p1[idx + 1], z1 = p1[idx + 2];
      // Y rotation
      let tx = x1 * cy1 - z1 * sy1;
      let tz = x1 * sy1 + z1 * cy1;
      x1 = tx; z1 = tz;
      // X rotation
      let ty = y1 * cx1 - z1 * sx1;
      tz = y1 * sx1 + z1 * cx1;
      y1 = ty; z1 = tz;

      sphere1Positions.push({ x: x1, y: y1, z: z1, color: { r: 0.0, g: 0.95, b: 1.0 } }); // Cyan

      // Transform particle 2 coordinates
      let x2 = p2[idx], y2 = p2[idx + 1], z2 = p2[idx + 2];
      // Y rotation
      tx = x2 * cy2 - z2 * sy2;
      tz = x2 * sy2 + z2 * cy2;
      x2 = tx; z2 = tz;
      // Z rotation
      tx = x2 * cz2 - y2 * sz2;
      ty = x2 * sz2 + y2 * cz2;
      x2 = tx; y2 = ty;

      sphere2Positions.push({ x: x2, y: y2, z: z2, color: { r: 1.0, g: 0.34, b: 0.65 } }); // Pink
    }

    // Connect close points (Sphere 1 <-> Sphere 2 intersections: "collisions")
    for (let i = 0; i < sphere1Positions.length; i++) {
      if (lineCount >= maxLines) break;
      const pt1 = sphere1Positions[i];

      for (let j = 0; j < sphere2Positions.length; j++) {
        const pt2 = sphere2Positions[j];
        const dx = pt1.x - pt2.x;
        const dy = pt1.y - pt2.y;
        const dz = pt1.z - pt2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < connectionDistance) {
          const alpha = 1.0 - (dist / connectionDistance);
          const lineIdx = lineCount * 6;

          // Set line vertex positions
          linePositions[lineIdx] = pt1.x;
          linePositions[lineIdx + 1] = pt1.y;
          linePositions[lineIdx + 2] = pt1.z;

          linePositions[lineIdx + 3] = pt2.x;
          linePositions[lineIdx + 4] = pt2.y;
          linePositions[lineIdx + 5] = pt2.z;

          // Set vertex colors (blend gradient)
          lineColors[lineIdx] = pt1.color.r * alpha;
          lineColors[lineIdx + 1] = pt1.color.g * alpha;
          lineColors[lineIdx + 2] = pt1.color.b * alpha;

          lineColors[lineIdx + 3] = pt2.color.r * alpha;
          lineColors[lineIdx + 4] = pt2.color.g * alpha;
          lineColors[lineIdx + 5] = pt2.color.b * alpha;

          lineCount++;
          if (lineCount >= maxLines) break;
        }
      }
    }

    // Reset remaining buffer entries to prevent ghost lines
    for (let i = lineCount * 6; i < maxLines * 6; i++) {
      linePositions[i] = 0;
      lineColors[i] = 0;
    }

    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;

    // 4. Parallax Camera motion based on mouse coordinates (lagged interpolation for buttery smoothness)
    camera.position.x += (mouseX * 0.15 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.15 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  // Wait for Three.js script to be fully parsed before starting
  function checkThreeLoaded() {
    if (typeof THREE !== 'undefined') {
      init();
      animate();
    } else {
      setTimeout(checkThreeLoaded, 50);
    }
  }

  document.addEventListener('DOMContentLoaded', checkThreeLoaded);
})();
