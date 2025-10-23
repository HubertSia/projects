// ===== PARTICLE CLASS =====

class Particle {
  constructor(x, y, jointId) {
    this.x = x;          // Current x-position (updated each frame)
    this.y = y;          // Current y-position (updated each frame)
    this.size = Math.random() * 5 + 2;  // Random size between 2-7 pixels
    this.speedX = Math.random() * 2 - 1; // Horizontal movement speed (-1 to 1 px/frame)
    this.speedY = Math.random() * 2 - 1; // Vertical movement speed (-1 to 1 px/frame)
    this.jointId = jointId; // ID linking particle to its body joint cluster
    this.originalX = x;  // Initial x-position for distance calculations
    this.originalY = y;  // Initial y-position for distance calculations
  }

  /**
   * Updates particle position based on its velocity
   */
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
  }

  /**
   * Draws the particle with a radial gradient effect
   * @param {CanvasRenderingContext2D} ctx - Canvas drawing context
   */
  draw(ctx) {
    // Create a radial gradient that fades from blue to yellow
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,          // Gradient center (particle position)
      this.x, this.y, this.size   // Gradient extends to particle edge
    );
    gradient.addColorStop(0, 'rgba(0, 150, 255, 1)');    // Opaque blue at center
    gradient.addColorStop(0.7, 'rgba(0, 150, 255, 0.6)'); // Semi-transparent blue
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');    // Fully transparent yellow edge

    // Draw the particle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

/* ===== GLOBAL STATE ===== */
let particles = [];         // Array of all active particles
let poseNetModel;           // Loaded PoseNet model for body tracking
let video;                  // Webcam video element
let canvas, ctx;            // Main canvas and its 2D context
let jointClusters = {};     // Tracks active joint clusters with metadata

/* ===== NAVIGATION TIMING ===== */
const AUTO_NAV_TIMEOUT = 60000;  // 60 seconds before auto-redirect
const CAMERA_WIDTH = 1920;       // Camera width preference
const CAMERA_HEIGHT = 1080;      // Camera height preference

/* ===== LOADING SYSTEM ===== */
// Overlay displayed while camera/model initializes
const loadingOverlay = document.createElement('div');
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;
document.body.appendChild(loadingOverlay);

/**
 * Updates the loading screen text
 * @param {string} text - Message to display
 */
function updateLoadingText(text) {
  loadingOverlay.textContent = text;
}

/* ===== MODEL LOADING ===== */
/**
 * Loads PoseNet model with progress feedback.
 * Returns true if model initializes successfully.
 */
async function loadPoseNet() {
  try {
    updateLoadingText("Loading PoseNet model...");
    poseNetModel = await posenet.load({
      // Optimized for real-time use
      architecture: 'MobileNetV1',

      // Balance of speed vs accuracy
      outputStride: 16,

      inputResolution: { width: 640, height: 480 },

      // Smaller = faster but less precise (Don’t want to turn into a power point presentation)
      multiplier: 0.75
    });

    // Model ready feedback
    updateLoadingText("PoseNet ready!");
    setTimeout(() => (loadingOverlay.style.display = 'none'), 2000);
    return true;
  } catch (error) {
    console.error('PoseNet loading failed:', error);
    updateLoadingText("Failed to load PoseNet. Using fallback...");
    setTimeout(() => (loadingOverlay.style.display = 'none'), 3000);
    return false;
  }
}

/* ===== PARTICLE SYSTEM ===== */
/**
 * Creates new particles associated with a specific body joint.
 * Multiple small moving points cluster around each PoseNet keypoint.
 */
// Particles that connect to the joints
function createParticles(x, y, jointId, count = 5) {
  // Create or update metadata for an active joint cluster
  if (!jointClusters[jointId]) {
    jointClusters[jointId] = {
      centerX: x,
      centerY: y,
      lastUpdated: Date.now(),
      radius: 50 // Initial radius for glowing background
    };
  } else {
    // Update cluster position each frame for smooth tracking
    jointClusters[jointId].centerX = x;
    jointClusters[jointId].centerY = y;
    jointClusters[jointId].lastUpdated = Date.now();
  }

  // Generate new particles at the joint position
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, jointId));
  }
}

/**
 * Updates particle physics and draws clusters
 * - Deletes expired clusters after 2s inactivity
 * - Expands cluster glow radius slowly outward
 */
function updateParticles() {
  const now = Date.now();

  // Remove stale joint clusters (>2 seconds old)
  Object.keys(jointClusters).forEach(jointId => {
    if (now - jointClusters[jointId].lastUpdated > 2000) {
      delete jointClusters[jointId];
    }
  });

  // Render gradient glow for each active joint
  Object.keys(jointClusters).forEach(jointId => {
    const cluster = jointClusters[jointId];

    // Create orange-to-purple radial gradient
    const gradient = ctx.createRadialGradient(
      cluster.centerX, cluster.centerY, 0,
      cluster.centerX, cluster.centerY, cluster.radius
    );

    // Vibrant orange center
    gradient.addColorStop(0, 'rgba(255, 117, 67, 0.83)');
    // Faded purple edge
    gradient.addColorStop(1, 'rgba(198, 54, 255, 0.16)');

    // Draw glowing cluster background
    ctx.beginPath();
    ctx.arc(cluster.centerX, cluster.centerY, cluster.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Slowly expand glow radius for ambient pulse effect
    cluster.radius += 0.7;
  });

  // Update and render each particle
  particles.forEach((particle, index) => {
    particle.update();

    // Only draw particles that still belong to active clusters
    if (jointClusters[particle.jointId]) {
      particle.draw(ctx);
    }

    // Shrink and eventually remove particles
    if (particle.size > 0.2) particle.size -= 0.05;
    if (particle.size <= 0.2) particles.splice(index, 1);
  });
}

/* ===== CAMERA SETUP ===== */
/**
 * Initializes webcam video stream.
 * Returns a Video element or null if access is denied.
 */
async function setupCamera() {
  try {
    video = document.createElement('video');
    video.width = CAMERA_WIDTH;
    video.height = CAMERA_HEIGHT;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    video.srcObject = stream;
    await new Promise(resolve => (video.onloadedmetadata = resolve));
    await video.play();
    return video;
  } catch (error) {
    console.error('Camera error:', error);
    updateLoadingText("Camera access denied. Using fallback...");
    setTimeout(() => (loadingOverlay.style.display = 'none'), 3000);
    return null;
  }
}

/* ===== POSE ESTIMATION ===== */
/**
 * Draws PoseNet keypoints onto the canvas and spawns particles at each joint.
 * @param {Array} keypoints - List of detected PoseNet keypoints
 */
function drawKeypoints(keypoints) {
  keypoints.forEach((keypoint, index) => {
    if (keypoint.score > 0.5) { // Only high-confidence joints
      const jointId = `joint_${keypoint.part}_${index}`;

      // Draw red dot for each keypoint
      ctx.beginPath();
      ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

      // Spawn a few glowing particles at this joint
      createParticles(keypoint.position.x, keypoint.position.y, jointId);
    }
  });
}

/**
 * Estimates the pose from each video frame, visualizes keypoints,
 * updates particles, and loops the animation.
 */
async function estimatePose() {
  if (!poseNetModel || !video) return;

  try {
    const pose = await poseNetModel.estimateSinglePose(video, {
      flipHorizontal: true // Mirror mode for more intuitive interaction
    });

    // Clear canvas with a fresh black background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw PoseNet keypoints + animate particles
    drawKeypoints(pose.keypoints);
    updateParticles();

    // Keep the animation running each frame
    requestAnimationFrame(estimatePose);
  } catch (error) {
    console.error('Pose estimation error:', error);
  }
}

/* ===== AUTO NAVIGATION ===== */
/**
 * Automatically redirects to a random page after 60 seconds.
 * Replaces the original hand gesture navigation system.
 */
function startAutoNavigation() {
  setTimeout(() => {
    const pages = ['blackHole.html', 'spaceDust.html','index.html'];
    const target = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${target}`);
    window.location.href = target;
  }, AUTO_NAV_TIMEOUT);
}

/* ===== MAIN INITIALIZATION ===== */
/**
 * Initializes the program logic:
 * 1. Creates and attaches canvas
 * 2. Initializes webcam
 * 3. Loads PoseNet model
 * 4. Starts body tracking and particle effects
 */
async function init() {
  // 1. Create full HD canvas
  canvas = document.createElement('canvas');
  canvas.width = CAMERA_WIDTH;
  canvas.height = CAMERA_HEIGHT;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  // 2. Initialize webcam
  video = await setupCamera();
  if (!video) {
    // Fallback animation if webcam unavailable
    const fallbackAnimate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // 3. Load the PoseNet model
  const poseLoaded = await loadPoseNet();

  // 4. Start the particle animation and sound
  if (poseLoaded) {
    const mySound = new Audio('assets/spaceFinal.wav');
    mySound.play();
    mySound.volume = 0.5;
    console.log('playing sound');
    estimatePose();
    startAutoNavigation();
  } else {
    // Fallback mode with random clusters
    const fallbackAnimate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
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

/* ===== STARTAPPLICATION ===== */
// Wait until TensorFlow.js is ready before initializing
document.addEventListener('DOMContentLoaded', () => {
  if (typeof tf !== 'undefined') {
    tf.ready().then(() => init());
  } else {
    // Dynamically load TensorFlow.js if not already available
    const tfScript = document.createElement('script');
    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
    tfScript.onload = () => tf.ready().then(() => init());
    document.head.appendChild(tfScript);
  }
});