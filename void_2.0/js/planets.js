/**
 * BODY TRACKING PARTICLE SYSTEM (PoseNet only)
 * - Keeps body pose detection using PoseNet
 * - Removes hand gesture detection
 * - Auto-redirects after 60 seconds
 */

// ===== PARTICLE CLASS =====
class Particle {
  constructor(x, y, jointId) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.jointId = jointId;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
  }

  draw(ctx) {
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size
    );
    gradient.addColorStop(0, "rgba(0, 150, 255, 1)");
    gradient.addColorStop(0.7, "rgba(0, 150, 255, 0.6)");
    gradient.addColorStop(1, "rgba(255, 255, 0, 0)");

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

/* ===== GLOBAL STATE ===== */
let particles = [];
let poseNetModel;
let video;
let canvas, ctx;
let jointClusters = {};

/* ===== TIMING ===== */
const AUTO_NAV_TIMEOUT = 60000; // 1 minute
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;

/* ===== LOADING OVERLAY ===== */
const loadingOverlay = document.createElement("div");
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;
loadingOverlay.textContent = "Loading PoseNet model...";
document.body.appendChild(loadingOverlay);

/**
 * Updates the overlay text
 */
function updateLoadingText(text) {
  loadingOverlay.textContent = text;
}

/* ===== MODEL LOADING ===== */
async function loadPoseNet() {
  try {
    updateLoadingText("Loading PoseNet...");
    poseNetModel = await posenet.load({
      architecture: "MobileNetV1",
      outputStride: 16,
      inputResolution: { width: 640, height: 480 },
      multiplier: 0.75,
    });

    updateLoadingText("PoseNet loaded!");
    setTimeout(() => (loadingOverlay.style.display = "none"), 2000);
    return true;
  } catch (error) {
    console.error("PoseNet loading failed:", error);
    updateLoadingText("Failed to load PoseNet.");
    setTimeout(() => (loadingOverlay.style.display = "none"), 3000);
    return false;
  }
}

/* ===== PARTICLE SYSTEM ===== */
function createParticles(x, y, jointId, count = 5) {
  if (!jointClusters[jointId]) {
    jointClusters[jointId] = {
      centerX: x,
      centerY: y,
      lastUpdated: Date.now(),
      radius: 50,
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

function updateParticles() {
  const now = Date.now();

  Object.keys(jointClusters).forEach((jointId) => {
    if (now - jointClusters[jointId].lastUpdated > 2000) {
      delete jointClusters[jointId];
    }
  });

  Object.keys(jointClusters).forEach((jointId) => {
    const cluster = jointClusters[jointId];

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

    cluster.radius += 0.5;
  });

  particles.forEach((particle, index) => {
    particle.update();

    if (jointClusters[particle.jointId]) {
      particle.draw(ctx);
    }

    if (particle.size > 0.2) particle.size -= 0.05;
    if (particle.size <= 0.2) particles.splice(index, 1);
  });
}

/* ===== CAMERA SETUP ===== */
async function setupCamera() {
  try {
    video = document.createElement("video");
    video.width = CAMERA_WIDTH;
    video.height = CAMERA_HEIGHT;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    });

    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    await video.play();
    return video;
  } catch (error) {
    console.error("Camera error:", error);
    updateLoadingText("Camera access denied.");
    setTimeout(() => (loadingOverlay.style.display = "none"), 3000);
    return null;
  }
}

/* ===== POSE DETECTION ===== */
function drawKeypoints(keypoints) {
  keypoints.forEach((keypoint, index) => {
    if (keypoint.score > 0.5) {
      const jointId = `joint_${keypoint.part}_${index}`;

      ctx.beginPath();
      ctx.arc(
        keypoint.position.x,
        keypoint.position.y,
        5,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "red";
      ctx.fill();

      createParticles(
        keypoint.position.x,
        keypoint.position.y,
        jointId,
        3
      );
    }
  });
}

async function estimatePose() {
  if (!poseNetModel || !video) return;

  try {
    const pose = await poseNetModel.estimateSinglePose(video, {
      flipHorizontal: true,
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawKeypoints(pose.keypoints);
    updateParticles();

    requestAnimationFrame(estimatePose);
  } catch (error) {
    console.error("Pose estimation error:", error);
  }
}

/* ===== AUTO NAVIGATION ===== */
function startAutoNavigation() {
  setTimeout(() => {
    const pages = ["blackHole.html", "spaceDust.html"];
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
    console.warn("Using fallback animation (no camera).");
    fallbackAnimate();
    startAutoNavigation();
    return;
  }

  const poseLoaded = await loadPoseNet();
  if (poseLoaded) {
    const sound = new Audio("assets/spaceFinal.wav");
    sound.volume = 0.5;
    sound.play();

    estimatePose();
    startAutoNavigation();
  } else {
    fallbackAnimate();
    startAutoNavigation();
  }
}

/* ===== FALLBACK ANIMATION (if PoseNet fails) ===== */
function fallbackAnimate() {
  const fallbackLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    createParticles(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      `fallback_${Date.now()}`,
      2
    );
    updateParticles();
    requestAnimationFrame(fallbackLoop);
  };
  fallbackLoop();
}

/* ===== START EVERYTHING ===== */
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