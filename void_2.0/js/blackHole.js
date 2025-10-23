import * as THREE from "https://unpkg.com/three@0.136.0/build/three.module.js";

// ===== PRELOADING SYSTEM =====
// A simple floating status box for debugging and initial load feedback.
const loadingIndicator = document.createElement("div");
loadingIndicator.style.position = "fixed";
loadingIndicator.style.bottom = "20px";
loadingIndicator.style.right = "20px";
loadingIndicator.style.color = "white";
loadingIndicator.style.backgroundColor = "rgba(0,0,0,0.5)";
loadingIndicator.style.padding = "10px";
loadingIndicator.style.borderRadius = "5px";
loadingIndicator.style.zIndex = "1000";
loadingIndicator.textContent = "Initializing cosmic field..."; // Initial hint
document.body.appendChild(loadingIndicator);

// ===== THREE.JS SCENE VARIABLES =====
// Fundamental 3D world variables
let scene, camera, renderer;

// Particle field data and visuals
let particles, videoTexture, videoCanvas, videoContext, positions;

// Video input (webcam)
let video;

// Storage for per-vertex color blending
let colors;

// Two main color gradients — inner (orange) and outer (blue)
const CENTER_COLOR = new THREE.Color(0xff5500); // Orange (core)
const OUTER_COLOR = new THREE.Color(0x0066ff); // Deep blue (edge tone)

// ===== MAIN INITIALIZATION FUNCTION =====
// This function handles the entire setup process: 3D scene, webcam, audio, etc.
function init() {
  // === Stage 1: Three.js Environment Configuration ===
  scene = new THREE.Scene();

  // Camera with 75° field-of-view, positioned to gaze toward scene origin (z=0)
  camera = new THREE.PerspectiveCamera(
    75, // FOV (wide so it feels spacious)
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping (smallest visible distance)
    1000 // Far clipping (largest visible range)
  );
  camera.position.z = 8; // Step back slightly for correct framing

  // Renderer setup: draws the 3D scene onto screen
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("threejs-container").appendChild(renderer.domElement);

  // === Stage 2: Webcam Feed Setup ===
  // Create hidden HTML5 <video> element for camera feed
  video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true; // for iOS Safari support

  // Ask for webcam access
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      // When camera stream becomes available
      video.srcObject = stream;
      video.play(); // Ensure it plays automatically

      // Ambient background sound (space music / hum)
      const mySound = new Audio("assets/spaceFinal.wav");
      mySound.volume = 0.5;
      mySound.play();
      console.log("Ambient sound played successfully.");

      // Build the particle system after webcam is ready
      createParticles();

      // Update loading text and hide the status box
      loadingIndicator.textContent = "Ready!";
      setTimeout(() => (loadingIndicator.style.display = "none"), 2000);
    })
    .catch((err) => {
      console.error("Webcam access denied or not available:", err);
      loadingIndicator.textContent =
        "Webcam error: Using default cosmic background...";
      setTimeout(() => (loadingIndicator.style.display = "none"), 2000);
    });

  // Start the timed auto-redirect system
  startAutoNavigation();
}

/**
 * === CREATE PARTICLE SYSTEM FUNCTION ===
 * Initializes the particle field, creating geometry, materials, color gradients,
 * and texture links between webcam feed and scene.
 */
function createParticles() {
  // Generate a live dynamic texture from webcam input for subtle modulation
  videoTexture = new THREE.VideoTexture(video);
  videoCanvas = document.createElement("canvas"); // hidden analyzer canvas
  videoContext = videoCanvas.getContext("2d");

  // Define point cloud size
  const particleCount = 1000; // total particles (larger = more intense visuals)
  const geometry = new THREE.BufferGeometry(); // stores geometry data for GPU

  // Allocate data arrays for vertex attributes
  positions = new Float32Array(particleCount * 3); // [X, Y, Z] per particle
  const uvs = new Float32Array(particleCount * 2); // [U, V] for potential texture sampling
  colors = new Float32Array(particleCount * 3); // [R, G, B] per particle

  // Loop through and populate each particle with random values
  for (let i = 0; i < particleCount; i++) {
    const radius = Math.random() * 10; // distance from center of the field
    const angle = Math.random() * Math.PI * 2; // random orbital angle

    // Position particles in a loose spherical "galactic" shape
    positions[i * 3] = Math.cos(angle) * radius || 0;
    positions[i * 3 + 1] = Math.random() * 10 - 5 || 0; // Y between -5 and +5
    positions[i * 3 + 2] = Math.sin(angle) * radius || 0;

    // Random UV mapping coordinates
    uvs[i * 2] = Math.random();
    uvs[i * 2 + 1] = Math.random();

    // Assign color gradient based on spatial distance (center vs outer)
    updateParticleColor(i);
  }

  // === Apply geometry attribute arrays into Three.js buffers ===
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere(); // precompute radius for culling optimization

  // === Define particle material ===
  /**
   * PointsMaterial is used for rendering many small circular sprites (“points”)
   * efficiently. Combined with additive blending, we get a nice glowing dust field.
   */
  const material = new THREE.PointsMaterial({
    size: 0.12, // visible size of each particle
    map: videoTexture, // webcam output used as pixel pattern
    transparent: true,
    vertexColors: true, // use colors from geometry (custom gradients)
    blending: THREE.AdditiveBlending, // makes overlapping points glow brighter
    depthWrite: false, // required for transparent effect layering
  });

  // Build the full particle system (geometry + material)
  particles = new THREE.Points(geometry, material);

  // Add the particle field to the 3D scene
  scene.add(particles);

  // Start the animation loop for motion
  animate();
}

/**
 * === PARTICLE COLOR GRADIENT FUNCTION ===
 * Creates a continuous color blend per particle based on its distance from
 * the center of the scene — a soft transition from warm orange to cool blue.
 */
function updateParticleColor(index) {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  const z = positions[index * 3 + 2];

  // Compute distance from galactic core to assign color
  const distance = Math.sqrt(x * x + y * y + z * z);
  const normalizedDistance = Math.min(distance / 10, 1.0); // clamp 0→1

  // Linear interpolation between two colors
  const color = new THREE.Color()
    .copy(CENTER_COLOR)
    .lerp(OUTER_COLOR, normalizedDistance);

  // Write RGB values into color attribute array
  colors[index * 3] = color.r;
  colors[index * 3 + 1] = color.g;
  colors[index * 3 + 2] = color.b;
}

/**
 * === PARTICLE MOTION UPDATE FUNCTION ===
 * Called every animation frame — recalculates each particle’s position and color.
 * Influences include: mild rotational orbiting, noise-based jitter, and
 * webcam brightness reacting as vertical displacement (brightness → Y height).
 */
function updateParticles(time) {
  // Sanity check to prevent null references
  if (
    !videoCanvas ||
    !videoContext ||
    !videoTexture ||
    !videoTexture.image ||
    videoTexture.image.videoWidth === 0
  )
    return;

  // Copy current webcam frame → hidden canvas
  videoCanvas.width = 1920;
  videoCanvas.height = 1080;
  videoContext.save();
  // Mirror vertically for correct orientation
  videoContext.scale(1, -1);
  videoContext.translate(0, -videoCanvas.height);
  videoContext.drawImage(
    videoTexture.image,
    0,
    0,
    videoCanvas.width,
    videoCanvas.height
  );
  videoContext.restore();

  // Extract webcam pixel data for brightness analysis
  const imageData = videoContext.getImageData(
    0,
    0,
    videoCanvas.width,
    videoCanvas.height
  );
  const data = imageData.data; // contains [R,G,B,A,R,G,B,A...]

  // === Loop through every particle and calculate new behavior ===
  for (let i = 0; i < positions.length / 3; i++) {
    let x = positions[i * 3];
    let y = positions[i * 3 + 1];
    let z = positions[i * 3 + 2];

    // Slight orbital rotation to simulate cosmic swirl
    const radius = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x) + time * 0.0005;

    positions[i * 3] =
      Math.cos(angle) * radius + (Math.random() - 0.5) * 0.02; // ± random drift on X
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.02; // gentle pulse on Y
    positions[i * 3 + 2] =
      Math.sin(angle) * radius + (Math.random() - 0.5) * 0.02; // drift on Z

    // Map particle Y height ↔ webcam pixel brightness
    const brightnessIndex =
      (Math.floor(((y + 5) / 10) * videoCanvas.height) * videoCanvas.width +
        Math.floor(((x + 5) / 10) * videoCanvas.width)) *
      4;

    // Adjust Y based on averaged RGB brightness value
    if (brightnessIndex >= 0 && brightnessIndex + 2 < data.length) {
      const brightness =
        (data[brightnessIndex] +
          data[brightnessIndex + 1] +
          data[brightnessIndex + 2]) /
        3 /
        255;
      positions[i * 3 + 1] = brightness * 10 - 5; // 0→1 brightness → -5→+5 Y offset
    }

    // Refresh particle gradient (keeps glow dynamic)
    updateParticleColor(i);
  }

  // Reflag geometry attributes → Three.js updates on GPU next render pass
  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
  particles.geometry.computeBoundingSphere(); // necessary for frustum culling
}

/**
 * === ANIMATION LOOP ===
 * Using requestAnimationFrame, this continuously refreshes our:
 * 1. Particle position updates.
 * 2. Scene rendering from the camera’s perspective.
 */
function animate(time) {
  requestAnimationFrame(animate);
  updateParticles(time); // recalculate point positions per frame
  renderer.render(scene, camera); // draw the frame
}

/**
 * === AUTO NAVIGATION TIMER ===
 * Automatically transitions to another environment page after 1 minute.
 * Plays nicely with your multi-scene installation (e.g., planets / nebula).
 */
function startAutoNavigation() {
  const AUTO_NAV_DURATION = 60000; // 60 seconds
  setTimeout(() => {
    const pages = ["spaceDust.html", "planets.html", "index.html"]; // potential destinations
    const nextPage = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${nextPage}`);
    window.location.href = nextPage;
  }, AUTO_NAV_DURATION);
}

/**
 * === RESPONSIVENESS HANDLER ===
 * Keeps the renderer’s aspect ratio updated whenever window resizes.
 */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // recalibrate internal projection
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === INITIATE IT ALL ===
// Launch the cosmic dust field once DOM is ready.
init();