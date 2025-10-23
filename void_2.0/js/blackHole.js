import * as THREE from "https://unpkg.com/three@0.136.0/build/three.module.js";

/* ====== BLACKHOLE */

// ===== Create a container if missing =====
let container = document.getElementById("threejs-container");
if (!container) {
  container = document.createElement("div");
  container.id = "threejs-container";
  document.body.appendChild(container);
}

// ===== DEBUG STATUS BOX =====
const loadingIndicator = document.createElement("div");
Object.assign(loadingIndicator.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  color: "white",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "8px",
  borderRadius: "6px",
  zIndex: "9999",
});
loadingIndicator.textContent = "Initializing cosmic field...";
document.body.appendChild(loadingIndicator);

// ===== GLOBALS =====
let scene, camera, renderer;
let particles, video, videoCanvas, videoContext, videoTexture;
let positions, colors, noiseOffsets;

const CENTER_COLOR = new THREE.Color(0xff5500);
const OUTER_COLOR = new THREE.Color(0x0066ff);
const clock = new THREE.Clock();

/* ======= MAIN INITIALIZATION  */
function init() {
  // === SCENE SETUP ===
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  // === RENDERER ===
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // === VIDEO SETUP ===
  video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      video.play();

      const ambient = new Audio("assets/spaceFinal.wav");
      ambient.volume = 0.5;
      ambient.play().catch(() => {});

      createParticles();
      loadingIndicator.textContent = "Ready!";
      setTimeout(() => (loadingIndicator.style.display = "none"), 1500);
    })
    .catch((err) => {
      console.warn("Webcam unavailable:", err);
      loadingIndicator.textContent = "Running in fallback mode...";
      createParticles(true);
      setTimeout(() => (loadingIndicator.style.display = "none"), 1500);
    });

  startAutoNavigation();
}

/* ================= CREATE PARTICLE SYSTEM  */
function createParticles(useFallback = false) {
  const count = 3000; // optimized count
  const geometry = new THREE.BufferGeometry();

  positions = new Float32Array(count * 3);
  colors = new Float32Array(count * 3);
  noiseOffsets = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const radius = Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const y = Math.random() * 10 - 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.set([x, y, z], i * 3);
    noiseOffsets.set(
      [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2],
      i * 3
    );
    updateParticleColor(i);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  // Smaller internal webcam buffer
  videoCanvas = document.createElement("canvas");
  videoCanvas.width = 64;
  videoCanvas.height = 64;
  videoContext = videoCanvas.getContext("2d");

  videoTexture = useFallback
    ? new THREE.TextureLoader().load("assets/fallbackTexture.jpg")
    : new THREE.VideoTexture(videoCanvas);

  const material = new THREE.PointsMaterial({
    size: 0.08,
    map: videoTexture,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Start animation loop
  animate();
}

/* ====  UPDATE COLOR BASED ON DISTANCE */
function updateParticleColor(i) {
  const x = positions[i * 3];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];
  const dist = Math.sqrt(x * x + y * y + z * z);
  const t = Math.min(dist / 10, 1);
  const c = CENTER_COLOR.clone().lerp(OUTER_COLOR, t);
  colors.set([c.r, c.g, c.b], i * 3);
}

/* ========= PER-FRAME PARTICLE UPDATE */
function updateParticles(time) {
  // 1️⃣ Draw webcam (or fallback) frame at low resolution
  if (!videoContext) return;
  try {
    if (video.readyState >= 2) {
      videoContext.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
      videoTexture.needsUpdate = true;
    }
  } catch (e) {
    // Safety catch for Safari or missing video feed
  }

  // 2️⃣ Extract pixel brightness data
  const imageData = videoContext.getImageData(
    0,
    0,
    videoCanvas.width,
    videoCanvas.height
  );
  const data = imageData.data;
  const width = videoCanvas.width;
  const height = videoCanvas.height;

  // 3️⃣ Adjust each particle
  for (let i = 0; i < positions.length / 3; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const z = positions[idx + 2];
    const radius = Math.sqrt(x * x + z * z);

    // Smooth rotation
    const angle = Math.atan2(z, x) + time * 0.1;
    positions[idx] = Math.cos(angle) * radius + noiseOffsets[idx] * 0.01;
    positions[idx + 2] = Math.sin(angle) * radius + noiseOffsets[idx + 2] * 0.01;

    // Brightness-driven height variation
    const u = Math.floor(((x + 7) / 14) * (width - 1));
    const v = Math.floor(((z + 7) / 14) * (height - 1));
    const bi = (v * width + u) * 4;
    const brightness =
      (data[bi] + data[bi + 1] + data[bi + 2]) / (3 * 255) || 0.5;

    positions[idx + 1] =
      noiseOffsets[idx + 1] * 0.3 + Math.sin(time + i) * 0.02 + (brightness - 0.5) * 4;
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

/* =========  RENDER LOOP */
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  updateParticles(time);
  renderer.render(scene, camera);
}

/* =========== AUTO NAVIGATION TIMER */
function startAutoNavigation() {
  const duration = 60000; // 60s
  setTimeout(() => {
    const pages = ["spaceDust.html", "planets.html", "index.html"];
    const next = pages[Math.floor(Math.random() * pages.length)];
    console.log("Auto redirecting to:", next);
    window.location.href = next;
  }, duration);
}

/* ======= HANDLE RESIZING */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();