// THE NEBULA - No Handpose Version
// Automatically navigates after 1 min of runtime

// Setup
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Create offscreen canvas for webcam processing
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

// Hidden canvas for motion detection
const motionCanvas = document.createElement("canvas");
const motionCtx = motionCanvas.getContext("2d");

let videoStream;
let particles = [];
const cols = 60,
  rows = 60;

let prevFrame = null;

// -------------------- PARTICLE CLASS --------------------
class Particle {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.waveOffset = Math.random() * Math.PI * 2;
    this.gradientPosition = y / canvas.height;

    const sizeCategory = Math.floor(Math.random() * 3);
    this.radius = [3, 6, 9][sizeCategory];

    this.baseOpacity = 0.6 + Math.random() * 0.4;
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.mass = this.radius;
    this.friction = 0.92;
    this.maxSpeed = 15;
    this.attracted = false;
    this.motionStrength = 0;
  }

  applyForce(forceX, forceY, motionValue) {
    const fx = forceX / this.mass;
    const fy = forceY / this.mass;
    this.acceleration.x += fx;
    this.acceleration.y += fy;
    this.motionStrength = Math.min(1, motionValue / 100);
    this.attracted = motionValue > 10;
  }

  update(brightness, motionValue) {
    const waveStrength = 0.5;
    const waveX =
      Math.sin(this.waveOffset + performance.now() * 0.001) * waveStrength;
    const waveY =
      Math.cos(this.waveOffset + performance.now() * 0.001) * waveStrength;
    this.waveOffset += 0.01;

    const distanceX = this.baseX - this.x;
    const distanceY = this.baseY - this.y;
    const springStrength = 0.01;
    const springX = distanceX * springStrength;
    const springY = distanceY * springStrength;

    this.acceleration.x += springX;
    this.acceleration.y += springY;

    this.velocity.x += this.acceleration.x;
    this.velocity.y += this.acceleration.y;
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );
    if (speed > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
    }

    this.x += this.velocity.x + waveX;
    this.y += this.velocity.y + waveY;

    this.acceleration.x = 0;
    this.acceleration.y = 0;
    this.gradientPosition = this.y / canvas.height;

    const pulseStrength = Math.max(this.motionStrength, (brightness / 255) * 0.5);
    this.currentRadius = this.attracted
      ? this.radius * (1 + pulseStrength * 0.5)
      : this.radius;
  }

  draw() {
    const color = getGradientColor(this.gradientPosition);
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.currentRadius || this.radius
    );

    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return;

    const finalOpacity = this.attracted
      ? Math.min(1, this.baseOpacity + this.motionStrength * 0.4)
      : this.baseOpacity;

    ctx.globalCompositeOperation = "lighter";

    gradient.addColorStop(
      0,
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity})`
    );
    gradient.addColorStop(
      0.6,
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity * 0.6})`
    );
    gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius || this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  }
}

// -------------------- PARTICLE UTILITIES --------------------

function getGradientColor(position) {
  position = Math.max(0, Math.min(1, position));

  const inside = { r: 255, g: 66, b: 48 };
  const outside = { r: 27, g: 57, b: 132 };

  const r = Math.floor(inside.r + position * (outside.r - inside.r));
  const g = Math.floor(inside.g + position * (outside.g - inside.g));
  const b = Math.floor(inside.b + position * (outside.b - inside.b));

  return `rgb(${r}, ${g}, ${b})`;
}

function createParticles() {
  particles = [];
  const spacingX = canvas.width / cols;
  const spacingY = canvas.height / rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = new Particle(x * spacingX + spacingX / 2, y * spacingY + spacingY / 2);
      particles.push(p);
    }
  }
}

function getBrightness(x, y, imageData) {
  x = Math.max(0, Math.min(x, imageData.width - 1));
  y = Math.max(0, Math.min(y, imageData.height - 1));
  const i = (y * imageData.width + x) * 4;
  return (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
}

// -------------------- MOTION DETECTION --------------------
function detectMotion(currentFrame) {
  if (!prevFrame || !currentFrame) {
    prevFrame = currentFrame;
    return null;
  }

  const motionData = motionCtx.createImageData(currentFrame.width, currentFrame.height);

  for (let i = 0; i < currentFrame.data.length; i += 4) {
    const diff =
      Math.abs(currentFrame.data[i] - prevFrame.data[i]) +
      Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]) +
      Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);
    const motionIntensity = diff / 3;
    const threshold = 10;
    const finalIntensity = motionIntensity > threshold ? motionIntensity * 2 : 0;

    motionData.data[i] = finalIntensity;
    motionData.data[i + 1] = finalIntensity;
    motionData.data[i + 2] = finalIntensity;
    motionData.data[i + 3] = 255;
  }

  motionCtx.putImageData(motionData, 0, 0);
  prevFrame = currentFrame;
  return motionData;
}

// -------------------- WEBCAM PROCESSING --------------------
function processWebcamData() {
  if (videoStream && videoStream.readyState >= 2) {
    offscreenCanvas.width = cols;
    offscreenCanvas.height = rows;
    offscreenCtx.save();
    offscreenCtx.scale(-1, 1);
    offscreenCtx.drawImage(
      videoStream,
      -offscreenCanvas.width,
      0,
      offscreenCanvas.width,
      offscreenCanvas.height
    );
    offscreenCtx.restore();
    const currentFrame = offscreenCtx.getImageData(
      0,
      0,
      offscreenCanvas.width,
      offscreenCanvas.height
    );
    const motionFrame = detectMotion(currentFrame);
    return { current: currentFrame, motion: motionFrame };
  }
  return null;
}

// -------------------- INITIALIZATION --------------------

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  motionCanvas.width = cols;
  motionCanvas.height = rows;
  createParticles();
}

function initWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    .then((stream) => {
      videoStream = document.createElement("video");
      videoStream.srcObject = stream;
      videoStream.play();
    })
    .catch((err) => console.error("Webcam access denied", err));
}

// -------------------- ANIMATION LOOP --------------------

function animate() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const frameData = processWebcamData();

  if (frameData) {
    const currentFrame = frameData.current;
    const motionFrame = frameData.motion;

    particles.forEach((p) => {
      const gridX = Math.floor((p.baseX / canvas.width) * cols);
      const gridY = Math.floor((p.baseY / canvas.height) * rows);
      const brightness = getBrightness(gridX, gridY, currentFrame);

      if (motionFrame) {
        const motionValue = getBrightness(gridX, gridY, motionFrame);
        const centerX = cols / 2;
        const centerY = rows / 2;
        const forceX = (gridX - centerX) * (motionValue / 50);
        const forceY = (gridY - centerY) * (motionValue / 50);
        p.applyForce(forceX, forceY, motionValue);
      }

      p.update(brightness, motionFrame ? getBrightness(gridX, gridY, motionFrame) : 0);
      p.draw();
    });
  } else {
    particles.forEach((p) => {
      p.update(100, 0);
      p.draw();
    });
  }

  requestAnimationFrame(animate);
}

// -------------------- AUTO NAVIGATION --------------------

function startAutoNavigation() {
  const AUTO_NAV_DURATION = 60000; // 1 minute
  setTimeout(() => {
    const pages = ["blackHole.html", "planets.html"];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    console.log(`Auto redirecting to ${randomPage}`);
    window.location.href = randomPage;
  }, AUTO_NAV_DURATION);
}

// -------------------- MAIN --------------------

window.addEventListener("load", () => {
  console.log("Window loaded, initializing...");
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  initWebcam();
  animate();
  startAutoNavigation();
});

if (document.readyState === "complete") {
  console.log("Document already loaded, initializing immediately...");
  resizeCanvas();
  initWebcam();
  animate();
  startAutoNavigation();
}