/**
 * This class represents a single particle for visual effects
 */
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
}

// Global variables
let particles = [];
let handposeModel;
let poseNetModel;
let video;
let canvas, ctx;

// ===== GESTURE TIMING CONTROL =====
let openPalmTime = 0;
let closedPalmTime = 0;
let lastHandDetection = Date.now();
const GESTURE_HOLD_DURATION = 5000; // 5 seconds
const INACTIVITY_TIMEOUT = 60000;   // 60 seconds
const DETECTION_INTERVAL = 1000;    // Check once per second

// ===== LOADING SYSTEM =====
const loadingOverlay = document.createElement('div');
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;
document.body.appendChild(loadingOverlay);

function updateLoadingText(text) {
    loadingOverlay.textContent = text;
}

// ===== MODEL LOADING =====
async function loadModels() {
    try {
        // Load PoseNet first
        updateLoadingText("Loading PoseNet model...");
        poseNetModel = await posenet.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75
        });

        // Then load HandPose
        updateLoadingText("Loading HandPose model...");
        const handposeScript = document.createElement('script');
        handposeScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
        document.head.appendChild(handposeScript);
        
        // Wait for handpose to be available
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof handpose !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });

        handposeModel = await handpose.load();
        
        // Warm up models
        updateLoadingText("Warming up models...");
        await warmUpModels();
        
        loadingOverlay.style.display = 'none';
        return true;
    } catch (error) {
        console.error('Model loading failed:', error);
        updateLoadingText("Failed to load models. Using fallback...");
        setTimeout(() => loadingOverlay.style.display = 'none', 3000);
        return false;
    }
}

async function warmUpModels() {
    const warmUpCanvas = document.createElement('canvas');
    warmUpCanvas.width = 256;
    warmUpCanvas.height = 256;
    const warmUpCtx = warmUpCanvas.getContext('2d');
    warmUpCtx.fillStyle = 'rgb(100,100,100)';
    warmUpCtx.fillRect(0, 0, warmUpCanvas.width, warmUpCanvas.height);
    
    await poseNetModel.estimateSinglePose(warmUpCanvas);
    if (handposeModel) {
        await handposeModel.estimateHands(warmUpCanvas);
    }
}

// ===== PARTICLE SYSTEM =====
function createParticles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw(ctx);
        if (particle.size > 0.2) particle.size -= 0.05;
        if (particle.size <= 0.2) particles.splice(index, 1);
    });
}

// ===== GESTURE DETECTION =====
function isOpenHand(landmarks) {
    const tips = [4,8,12,16,20]; // Finger tips
    const wrist = landmarks[0];
    return tips.filter(i => {
        return Math.hypot(landmarks[i][0]-wrist[0], landmarks[i][1]-wrist[1]) > 100;
    }).length >= 3;
}

async function detectGestures() {
    if (!handposeModel) return;

    try {
        const predictions = await handposeModel.estimateHands(video);
        const now = Date.now();
        
        if (predictions.length > 0) {
            lastHandDetection = now;
            const handOpen = predictions.some(pred => isOpenHand(pred.landmarks));

            if (handOpen) {
                openPalmTime += DETECTION_INTERVAL;
                closedPalmTime = 0;
                
                if (openPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToRandomPage();
                }
            } else {
                closedPalmTime += DETECTION_INTERVAL;
                openPalmTime = 0;
                
                if (closedPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToIndex();
                }
            }
        } else {
            openPalmTime = 0;
            closedPalmTime = 0;
            
            if (now - lastHandDetection >= INACTIVITY_TIMEOUT) {
                navigateToIndex();
            }
        }
    } catch (error) {
        console.log('Detection error:', error);
    }
}

// ===== NAVIGATION =====
function navigateToRandomPage() {
    const pages = ['particle4.html', 'particle3.html'];
    window.location.href = pages[Math.floor(Math.random() * pages.length)];
}

function navigateToIndex() {
    window.location.href = 'index.html';
}

// ===== CAMERA SETUP =====
async function setupCamera() {
    try {
        video = document.createElement('video');
        video.width = 1920;
        video.height = 1080;
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 }, 
                height: { ideal: 1080 } 
            } 
        });
        
        video.srcObject = stream;
        await new Promise(resolve => video.onloadedmetadata = resolve);
        video.play();
        return video;
    } catch (error) {
        console.error('Camera error:', error);
        updateLoadingText("Camera access denied. Using fallback...");
        setTimeout(() => loadingOverlay.style.display = 'none', 3000);
        return null;
    }
}

// ===== POSE ESTIMATION =====
function drawKeypoints(keypoints) {
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            createParticles(keypoint.position.x, keypoint.position.y);
        }
    });
}

async function estimatePose() {
    if (!poseNetModel || !video) return;
    
    try {
        const pose = await poseNetModel.estimateSinglePose(video, { 
            flipHorizontal: false 
        });
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawKeypoints(pose.keypoints);
        updateParticles();
        
        requestAnimationFrame(estimatePose);
    } catch (error) {
        console.error('Pose estimation error:', error);
    }
}

// ===== MAIN INITIALIZATION =====
async function init() {
    // Setup canvas
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    // Setup camera
    video = await setupCamera();
    if (!video) {
        // Fallback animation if camera fails
        const fallbackAnimate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            createParticles(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                1
            );
            updateParticles();
            requestAnimationFrame(fallbackAnimate);
        };
        fallbackAnimate();
        return;
    }
    
    // Load models
    const modelsLoaded = await loadModels();
    
    // Start detection if models loaded successfully
    if (modelsLoaded) {
        estimatePose();
        setInterval(detectGestures, DETECTION_INTERVAL);
    } else {
        // Fallback animation if models fail to load
        const fallbackAnimate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            createParticles(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                2
            );
            updateParticles();
            requestAnimationFrame(fallbackAnimate);
        };
        fallbackAnimate();
    }
}

// Start the application when TensorFlow is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof tf !== 'undefined') {
        tf.ready().then(() => init());
    } else {
        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
        tfScript.onload = () => tf.ready().then(() => init());
        document.head.appendChild(tfScript);
    }
});