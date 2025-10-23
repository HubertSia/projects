// ===== PARTICLE CLASS (OPTIMIZED) =====
// Each particle is now drawn using a pre-rendered gradient sprite for performance.

class Particle {
  constructor(x, y, jointId) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2; // Random initial radius
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.jointId = jointId;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.size -= 0.05; // Fade-out over time
  }
}

/* ===== GLOBAL STATE ===== */
let particles = [];
let poseNetModel;
let video;
let canvas, ctx;
let jointClusters = {};

/* ===== CONSTANTS ===== */
const AUTO_NAV_TIMEOUT = 60000; // 60 seconds before auto-redirect
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;

/* ===== LOADING OVERLAY ===== */
const loadingOverlay = document.createElement("div");
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;
document.body.appendChild(loadingOverlay);

function updateLoadingText(text) {
  loadingOverlay.textContent = text;
}

/* ===== PRE-RENDERED PARTICLE SPRITE =====
   Instead of creating gradients for every particle each frame,
   we draw one small gradient onto an offscreen canvas and reuse it.
*/
const particleCanvas = document.createElement("canvas");
particleCanvas.width = particleCanvas.height = 32;
const pctx = particleCanvas.getContext("2d");

const g = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
g.addColorStop(0, "rgba(0,150,255,1)");
g.addColorStop(0.7, "rgba(0,150,255,0.6)");
g.addColorStop(1, "rgba(255,255,0,0)");
pctx.fillStyle = g;
pctx.beginPath();
pctx.arc(16, 16, 16, 0, Math.PI * 2);
pctx.fill();

/**
 * Draws a pre-rendered particle sprite with appropriate scaling.
 * Highly performance-efficient vs. creating gradients per frame.
 */
function drawParticleFast(p) {
  const scale = p.size / 16;
  ctx.drawImage(
    particleCanvas,
    p.x - p.size,
    p.y - p.size,
    particleCanvas.width * scale,
    particleCanvas.height * scale
  );
}

/* ===== MODEL LOADING ===== */
async function loadPoseNet() {
  try {
    updateLoadingText("Loading PoseNet model...");
    poseNetModel = await posenet.load({
      architecture: "MobileNetV1",
      outputStride: 16,
      inputResolution: { width: 480, height: 360 }, // ⚙️ Reduced for performance
      multiplier: 0.75,
    });

    updateLoadingText("PoseNet ready!");
    setTimeout(() => (loadingOverlay.style.display = "none"), 2000);
    return true;
  } catch (error) {
    console.error("PoseNet loading failed:", error);
    updateLoadingText("Failed to load PoseNet. Using fallback...");
    setTimeout(() => (loadingOverlay.style.display = "none"), 3000);
    return false;
  }
}

/* ===== PARTICLE SYSTEM =====
   Now uses:
   - capped particle count per joint
   - reusable glow drawing
   - optimized array update (no splice inside loop)
*/
function createParticles(x, y, jointId, count = 3) {
  // Limit number of particles to avoid overpopulation
  if (particles.length > 1500) return;

  if (!jointClusters[jointId]) {
    jointClusters[jointId] = {
      centerX: x,
      centerY: y,
      lastUpdated: Date.now(),
      radius: 50, // Initial cluster glow radius
    };
  } else {
    jointClusters[jointId].centerX = x;
    jointClusters[jointId].centerY = y;
    jointClusters[jointId].lastUpdated = Date.now();
  }

  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, jointId));
  }
}

/**
 * Updates particle positions and draws glowing joint regions.
 * Uses array filtering instead of splice for efficiency.
 */
function updateParticles() {
  const now = Date.now();

  // ⚙️ Remove inactive clusters (> 2 seconds old)
  for (const jointId in jointClusters) {
    if (now - jointClusters[jointId].lastUpdated > 2000) {
      delete jointClusters[jointId];
    }
  }

  // ⚙️ Semi-transparent fade instead of full black clear
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";

  // ⚙️ Draw smooth glowing background circles
  for (const id in jointClusters) {
    const cluster = jointClusters[id];
    const gradient = ctx.createRadialGradient(
      cluster.centerX,
      cluster.centerY,
      0,
      cluster.centerX,
      cluster.centerY,
      cluster.radius
    );
    gradient.addColorStop(0, "rgba(255, 117, 67, 0.83)");
    gradient.addColorStop(1, "rgba(198, 54, 255, 0.16)");

    ctx.beginPath();
    ctx.arc(cluster.centerX, cluster.centerY, cluster.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    cluster.radius = Math.min(cluster.radius + 0.3, 80);
  }

  // ⚙️ Efficient particle update & draw
  const next = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const cluster = jointClusters[p.jointId];
    p.update();
    if (p.size > 0.3 && cluster) {
      drawParticleFast(p);
      next.push(p);
    }
  }
  particles = next; // Replace array instead of splicing

  ctx.globalCompositeOperation = "source-over";
}

/* ===== CAMERA SETUP ===== */
async function setupCamera() {
  try {
    video = document.createElement("video");
    video.width = CAMERA_WIDTH;
    video.height = CAMERA_HEIGHT;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });

    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    await video.play();
    return video;
  } catch (error) {
    console.error("Camera error:", error);
    updateLoadingText("Camera access denied. Using fallback...");
    setTimeout(() => (loadingOverlay.style.display = "none"), 3000);
    return null;
  }
}

/* ===== POSE ESTIMATION =====
   - Only runs ~15 times per second to save CPU/GPU
   - Draws simple keypoints and spawns limited particles
*/
let lastPoseTime = 0;
async function estimatePose() {
  const now = performance.now();
  if (now - lastPoseTime < 66) {
    // Limit PoseNet inference to 15fps
    requestAnimationFrame(estimatePose);
    return;
  }
  lastPoseTime = now;

  if (!poseNetModel || !video) return;
  try {
    const pose = await poseNetModel.estimateSinglePose(video, {
      flipHorizontal: true,
    });

    // Draw PoseNet keypoints
    pose.keypoints.forEach((keypoint, index) => {
      if (keypoint.score > 0.5) {
        const jointId = `joint_${keypoint.part}_${index}`;
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();

        // Fewer particles per frame for smoother performance
        createParticles(keypoint.position.x, keypoint.position.y, jointId, 2);
      }
    });

    // Update particle system
    updateParticles();
  } catch (error) {
    console.error("Pose estimation error:", error);
  }
  requestAnimationFrame(estimatePose);
}

/* ===== AUTO NAVIGATION ===== */
function startAutoNavigation() {
  setTimeout(() => {
    const pages = ["blackHole.html", "spaceDust.html", "index.html"];
    const target = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${target}`);
    window.location.href = target;
  }, AUTO_NAV_TIMEOUT);
}

/* ===== MAIN INITIALIZATION ===== */
async function init() {
  canvas = document.createElement("canvas");
  canvas.width = CAMERA_WIDTH;
  canvas.height = CAMERA_HEIGHT;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");

  video = await setupCamera();

  if (!video) {
    // Fallback animation (no PoseNet)
    const fallbackAnimate = () => {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      createParticles(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        `fallback_${Date.now()}`,
        1
      );
      updateParticles();
      requestAnimationFrame(fallbackAnimate);
    };
    fallbackAnimate();
    return;
  }

  const poseLoaded = await loadPoseNet();
  if (poseLoaded) {
    const mySound = new Audio("assets/spaceFinal.wav");
    mySound.volume = 0.5;
    mySound.play();
    console.log("Playing background sound...");
    estimatePose();
    startAutoNavigation();
  } else {
    const fallbackAnimate = () => {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      createParticles(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        `fallback_${Date.now()}`,
        2
      );
      updateParticles();
      requestAnimationFrame(fallbackAnimate);
    };
    fallbackAnimate();
  }
}

/* ===== START APPLICATION ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof tf !== "undefined") {
    tf.ready().then(() => init());
  } else {
    const tfScript = document.createElement("script");
    tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs";
    tfScript.onload = () => tf.ready().then(() => init());
    document.head.appendChild(tfScript);
  }
});