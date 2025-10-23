/* ================ LOADING SYSTEM ================ */
// Handles preloading of dependencies and displays a progress bar overlay.

const loadingContainer = document.createElement("div");
loadingContainer.id = "loading-container";
loadingContainer.style.position = "fixed";
loadingContainer.style.top = "0";
loadingContainer.style.left = "0";
loadingContainer.style.width = "100%";
loadingContainer.style.height = "100%";
loadingContainer.style.backgroundColor = "#000";
loadingContainer.style.display = "flex";
loadingContainer.style.flexDirection = "column";
loadingContainer.style.justifyContent = "center";
loadingContainer.style.alignItems = "center";
loadingContainer.style.zIndex = "1000";

const loadingText = document.createElement("div");
loadingText.textContent = "Loading interactive experience...";
loadingText.style.color = "#fff";
loadingText.style.fontFamily = "Arial, sans-serif";
loadingText.style.fontSize = "24px";
loadingText.style.marginBottom = "20px";

const progressBar = document.createElement("div");
progressBar.style.width = "300px";
progressBar.style.height = "10px";
progressBar.style.backgroundColor = "#333";
progressBar.style.borderRadius = "5px";

const progressFill = document.createElement("div");
progressFill.style.width = "0%";
progressFill.style.height = "100%";
progressFill.style.backgroundColor = "#4CAF50";
progressFill.style.borderRadius = "5px";
progressFill.style.transition = "width 0.3s";

progressBar.appendChild(progressFill);
loadingContainer.appendChild(loadingText);
loadingContainer.appendChild(progressBar);
document.body.appendChild(loadingContainer);

/* ================ MODEL LOADING ================ */
// Load TensorFlow.js and Pose Detection model for body motion control.

let tfLoaded = false;
let poseDetectionLoaded = false;

// Update progress bar percentage (0–100)
function updateProgress(percent) {
  progressFill.style.width = `${percent}%`;
}

// Load TensorFlow Core
async function loadTF() {
  if (typeof tf === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs";
    script.onload = () => {
      tfLoaded = true;
      updateProgress(30); // Reaches 30% once TensorFlow loads
    };
    document.head.appendChild(script);
  } else {
    tfLoaded = true;
    updateProgress(30);
  }
}

// Load Pose Detection Library
async function loadPoseDetection() {
  if (typeof poseDetection === "undefined") {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection";
    script.onload = async () => {
      poseDetectionLoaded = true;
      updateProgress(70); // 70% once Pose model is available
    };
    document.head.appendChild(script);
  } else {
    poseDetectionLoaded = true;
    updateProgress(70);
  }
}

// Start library loading
loadTF();
loadPoseDetection();

/* ================ THREE.JS GALAXY SCENE ================ */
// Creates a stunning galaxy of 100,000 points with color gradients.

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000 // Far clipping plane
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000); // Black background for cosmic look
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.zIndex = "1";

camera.position.z = 1.5;

// Galaxy appearance parameters
const parameters = {
  count: 100000,
  size: 0.01,
  radius: 5,
  branches: 5,
  spin: 1,
  randomness: 0.7,
  randomnessPower: 3,
  insideColor: 0xff6030, // Warm orange center
  outsideColor: 0x1b3984, // Cool blue edges
};

let geometry = null;
let material = null;
let points = null;

/* ================ GALAXY GENERATION ================ */
// Builds a spiral galaxy composed of Points with color and spatial randomness.

const generateGalaxy = () => {
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  }

  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

    // Random spread to add organic chaos
    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
};

// Build initial galaxy
generateGalaxy();

/* ================ ANIMATION LOOP ================ */
// Renders each frame and applies rotation according to tracking or mouse movement.

const clock = new THREE.Clock();
let userRotation = 0;
let targetRotation = 0;
const rotationSmoothing = 0.01;

function animate() {
  const elapsedTime = clock.getElapsedTime();
  userRotation += (targetRotation - userRotation) * rotationSmoothing;
  points.rotation.y = elapsedTime * 0.03 + userRotation;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Begin rendering
animate();

/* ================ WINDOW RESIZING ================ */
// Ensures correct aspect ratio on browser resize.

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================ CONTROL SYSTEMS ================ */
// Allows rotation via mouse or body (pose) tracking.

const mousePosition = new THREE.Vector2();
let usingBodyTracking = false;

const settings = {
  bodyRotationSensitivity: 0.8,
  cameraTiltSensitivity: 0.5,
  mouseRotationSensitivity: 0.5,
  smoothingFactor: 0.1,
};

let targetCameraX = 0;
let targetCameraY = 0;

// Fallback mouse control
window.addEventListener("mousemove", (event) => {
  if (!usingBodyTracking) {
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

    targetCameraX = mousePosition.x * settings.cameraTiltSensitivity;
    targetCameraY = mousePosition.y * settings.cameraTiltSensitivity;
    targetRotation = mousePosition.x * settings.mouseRotationSensitivity;

    camera.position.x +=
      (targetCameraX - camera.position.x) * settings.smoothingFactor;
    camera.position.y +=
      (targetCameraY - camera.position.y) * settings.smoothingFactor;
    camera.lookAt(scene.position);
  }
});

/* ================ UI ELEMENTS ================ */
// Adds webcam feed and informational text to the screen.

const video = document.createElement("video");
video.id = "webcam-feed";
video.width = 320;
video.height = 240;
video.style.position = "absolute";
video.style.bottom = "10px";
video.style.right = "10px";
video.style.opacity = "0.7";
video.style.zIndex = "10";
document.body.appendChild(video);

const output = document.createElement("div");
output.id = "output";
output.style.position = "absolute";
output.style.top = "10px";
output.style.left = "10px";
output.style.color = "white";
output.style.fontFamily = "Arial, sans-serif";
output.style.padding = "10px";
output.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
output.style.borderRadius = "5px";
output.style.zIndex = "10";
document.body.appendChild(output);

const statusElement = document.createElement("div");
statusElement.id = "tracking-status";
statusElement.style.position = "absolute";
statusElement.style.top = "60px";
statusElement.style.left = "10px";
statusElement.style.color = "white";
statusElement.style.fontFamily = "Arial, sans-serif";
statusElement.style.padding = "10px";
statusElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
statusElement.style.borderRadius = "5px";
statusElement.style.zIndex = "10";
document.body.appendChild(statusElement);

/* ================ RANDOM NAVIGATION SYSTEM ================ */
// Automatically transitions to another random cosmic scene after 60 seconds.

function startRandomNavigation() {
  const AUTO_NAV_DURATION = 60000; // One minute
  setTimeout(() => {
    const pages = ["blackHole.html", "planets.html", "spaceDust.html"];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${randomPage}`);
    window.location.href = randomPage;
  }, AUTO_NAV_DURATION);
}

/* ================ POSE TRACKING ================ */
// Uses Pose Detection to track user nose position to rotate galaxy.

let poseModel = null;
let prevPoseX = 0;
let prevPoseY = 0;
const poseSmoothing = 0.2;

// Warm up pose model for faster runtime
async function warmUpModel() {
  if (!poseModel) return;
  const dummyCanvas = document.createElement("canvas");
  dummyCanvas.width = 256;
  dummyCanvas.height = 256;
  await poseModel.estimatePoses(dummyCanvas).catch(() => {});
}

// Initialize Pose Model
async function initModels() {
  try {
    updateProgress(95);
    poseModel = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    await warmUpModel();
    updateProgress(100);

    // Fade out loading overlay
    loadingContainer.style.transition = "opacity 0.5s";
    loadingContainer.style.opacity = "0";
    setTimeout(() => (loadingContainer.style.display = "none"), 500);

    startExperience();
  } catch (error) {
    console.error("Model initialization failed:", error);
    loadingText.textContent = "Mouse controls enabled (tracking unavailable)";
    setTimeout(() => {
      loadingContainer.style.opacity = "0";
      setTimeout(() => (loadingContainer.style.display = "none"), 500);
    }, 2000);
  }
}

/* ================ WEBCAM SETUP ================ */
// Activates webcam feed for body tracking.

function setupWebcam() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        video.play();
        usingBodyTracking = true;
        statusElement.textContent = "Body tracking active — move left/right!";
        trackUser();
      })
      .catch((err) => {
        console.error("Webcam error:", err);
        statusElement.textContent = "Using mouse control (no webcam)";
        output.textContent = "Webcam access denied. Using mouse controls.";
      });
  }
}

/* ================ BODY TRACKING LOOP ================ */
// Continuously estimates nose position and links it to galaxy rotation.

async function trackUser() {
  if (!poseModel) return;
  try {
    const poses = await poseModel.estimatePoses(video);
    if (poses.length > 0) {
      const nose = poses[0].keypoints.find((k) => k.name === "nose");
      if (nose && nose.score > 0.3) {
        const rawX = (nose.x / video.width) * 2 - 1;
        const rawY = (nose.y / video.height) * 2 - 1;
        const x = prevPoseX + (rawX - prevPoseX) * poseSmoothing;
        const y = prevPoseY + (rawY - prevPoseY) * poseSmoothing;
        prevPoseX = x;
        prevPoseY = y;

        // Map motion to scene rotation and tilt
        targetRotation = -x * settings.bodyRotationSensitivity;
        targetCameraX = x * settings.cameraTiltSensitivity;
        targetCameraY = -y * settings.cameraTiltSensitivity;

        camera.position.x +=
          (targetCameraX - camera.position.x) * settings.smoothingFactor;
        camera.position.y +=
          (targetCameraY - camera.position.y) * settings.smoothingFactor;
        camera.lookAt(scene.position);
      }
    }
  } catch (err) {
    console.error("Tracking error:", err);
  }
  requestAnimationFrame(trackUser);
}

/* ================ START EXPERIENCE ================ */
// Starts both webcam tracking and random scene navigation timer.

function startExperience() {
  setupWebcam();
  startRandomNavigation();
}

/* ================ INITIALIZATION CHECK ================ */
// Wait until all dependencies (TensorFlow, Pose Detection, and Three.js) are ready.

const checkReady = setInterval(() => {
  if (tfLoaded && poseDetectionLoaded && typeof THREE !== "undefined") {
    clearInterval(checkReady);
    initModels();
  }
}, 100);

/* ================ GLOBAL STYLES ================ */
// Removes scrollbars and ensures fullscreen rendering.

const style = document.createElement("style");
style.textContent = `
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
  }
`;
document.head.appendChild(style);