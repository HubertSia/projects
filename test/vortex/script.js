const canvas = document.getElementById('vortexCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

// Set canvas size to full window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
let particles = [];
let personPosition = { x: centerX, y: centerY }; // Default position

// Particle class
class Particle {
  constructor() {
    this.angle = Math.random() * 360;
    this.radius = Math.random() * 200 + 50;
    this.speed = Math.random() * 2 + 0.5;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.angle += this.speed;
    this.radius -= 0.3; // Slowly spiral inward
    if (this.radius < 0) {
      this.radius = Math.random() * 200 + 50; // Reset when it reaches the center
    }
  }

  draw() {
    const x = personPosition.x + this.radius * Math.cos((this.angle * Math.PI) / 180);
    const y = personPosition.y + this.radius * Math.sin((this.angle * Math.PI) / 180);

    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 100, 150, ${1 - this.radius / 250})`;
    ctx.fill();
  }
}

// Create particles
function createParticles() {
  particles = [];
  for (let i = 0; i < 200; i++) {
    particles.push(new Particle());
  }
}

// Get webcam access
async function setupWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    console.log('Webcam access granted!');
  } catch (err) {
    console.error('Error accessing webcam:', err);
  }
}

// Load PoseNet and detect person position
async function setupPoseNet() {
  console.log('Loading PoseNet...');
  const net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: video.videoWidth, height: video.videoHeight },
    multiplier: 0.75,
  });
  console.log('PoseNet loaded!');

  async function detectPose() {
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Webcam feed not ready yet.');
      requestAnimationFrame(detectPose);
      return;
    }

    const pose = await net.estimateSinglePose(video, {
      flipHorizontal: false,
    });

    if (pose.keypoints) {
      const nose = pose.keypoints.find(k => k.part === 'nose');
      if (nose && nose.score > 0.5) {
        // Map nose position to canvas coordinates
        personPosition.x = (nose.position.x / video.videoWidth) * canvas.width;
        personPosition.y = (nose.position.y / video.videoHeight) * canvas.height;
        console.log('Person detected at:', personPosition);
      } else {
        console.log('No person detected.');
      }
    }

    requestAnimationFrame(detectPose);
  }

  detectPose();
}

// Animation loop
function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(particle => {
    particle.update();
    particle.draw();
  });

  requestAnimationFrame(animate);
}

// Initialize
async function init() {
  await setupWebcam();
  await setupPoseNet();
  createParticles();
  animate();
}

init();

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});