import * as THREE from "https://unpkg.com/three@0.136.0/build/three.module.js";

// ===== SIMPLE LOADING INDICATOR =====
const loadingIndicator = document.createElement("div");
loadingIndicator.style.position = "fixed";
loadingIndicator.style.bottom = "20px";
loadingIndicator.style.right = "20px";
loadingIndicator.style.color = "white";
loadingIndicator.style.backgroundColor = "rgba(0,0,0,0.5)";
loadingIndicator.style.padding = "10px";
loadingIndicator.style.borderRadius = "5px";
loadingIndicator.style.zIndex = "1000";
loadingIndicator.textContent = "Initializing...";
document.body.appendChild(loadingIndicator);

// ===== THREE.JS VARIABLES =====
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;
let video;
let colors;

const CENTER_COLOR = new THREE.Color(0xff5500); // Orange
const OUTER_COLOR = new THREE.Color(0x0066ff); // Blue

// ===== INIT FUNCTION =====
function init() {
  // === Three.js Setup ===
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("threejs-container").appendChild(renderer.domElement);

  // === Webcam Setup ===
  video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      video.play();

      // Play ambient sound after camera starts
      const mySound = new Audio("assets/spaceFinal.wav");
      mySound.volume = 0.5;
      mySound.play();

      // Initialize the particle system
      createParticles();

      // Remove loading indicator after everything ready
      loadingIndicator.textContent = "Ready!";
      setTimeout(() => (loadingIndicator.style.display = "none"), 2000);
    })
    .catch((err) => {
      console.error("Webcam access denied", err);
      loadingIndicator.textContent = "Webcam error";
    });

  // Start automatic page change timer
  startAutoNavigation();
}

// ===== CREATE PARTICLE SYSTEM =====
function createParticles() {
  videoTexture = new THREE.VideoTexture(video);
  videoCanvas = document.createElement("canvas");
  videoContext = videoCanvas.getContext("2d");

  const particleCount = 10000;
  const geometry = new THREE.BufferGeometry();

  positions = new Float32Array(particleCount * 3);
  const uvs = new Float32Array(particleCount * 2);
  colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const radius = Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius || 0;
    positions[i * 3 + 1] = Math.random() * 10 - 5 || 0;
    positions[i * 3 + 2] = Math.sin(angle) * radius || 0;

    uvs[i * 2] = Math.random();
    uvs[i * 2 + 1] = Math.random();

    updateParticleColor(i);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    size: 0.12,
    map: videoTexture,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
  animate();
}

// ===== COLOR GRADIENT PER PARTICLE =====
function updateParticleColor(index) {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  const z = positions[index * 3 + 2];

  const distance = Math.sqrt(x * x + y * y + z * z);
  const normalizedDistance = Math.min(distance / 10, 1.0);

  const color = new THREE.Color()
    .copy(CENTER_COLOR)
    .lerp(OUTER_COLOR, normalizedDistance);

  colors[index * 3] = color.r;
  colors[index * 3 + 1] = color.g;
  colors[index * 3 + 2] = color.b;
}

// ===== PARTICLE UPDATE LOOP =====
function updateParticles(time) {
  if (
    !videoCanvas ||
    !videoContext ||
    !videoTexture ||
    !videoTexture.image ||
    videoTexture.image.videoWidth === 0
  )
    return;

  videoCanvas.width = 1920;
  videoCanvas.height = 1080;
  videoContext.save();

  // Flip vertically for correct orientation
  videoContext.scale(1, -1);
  videoContext.translate(0, -videoCanvas.height);
  videoContext.drawImage(videoTexture.image, 0, 0, videoCanvas.width, videoCanvas.height);
  videoContext.restore();

  const imageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < positions.length / 3; i++) {
    let x = positions[i * 3];
    let y = positions[i * 3 + 1];
    let z = positions[i * 3 + 2];

    const radius = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x) + time * 0.0005;

    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.02;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.02;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.02;

    const brightnessIndex =
      (Math.floor(((y + 5) / 10) * videoCanvas.height) * videoCanvas.width +
        Math.floor(((x + 5) / 10) * videoCanvas.width)) *
      4;

    if (brightnessIndex >= 0 && brightnessIndex + 2 < data.length) {
      const brightness =
        (data[brightnessIndex] +
          data[brightnessIndex + 1] +
          data[brightnessIndex + 2]) /
        3 /
        255;
      positions[i * 3 + 1] = brightness * 10 - 5;
    }

    updateParticleColor(i);
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
  particles.geometry.computeBoundingSphere();
}

// ===== ANIMATION LOOP =====
function animate(time) {
  requestAnimationFrame(animate);
  updateParticles(time);
  renderer.render(scene, camera);
}

// ===== AUTO NAVIGATION =====
function startAutoNavigation() {
  const AUTO_NAV_DURATION = 60000; // 1 minute = 60,000 ms
  setTimeout(() => {
    const pages = ["spaceDust.html", "planets.html"];
    const nextPage = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${nextPage}`);
    window.location.href = nextPage;
  }, AUTO_NAV_DURATION);
}

// ===== WINDOW RESIZE HANDLER =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== START EVERYTHING =====
init();