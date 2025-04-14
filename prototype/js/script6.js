/**
 * This class represents a single particle for visual effects
 */
class Particle {
    constructor(x, y, jointId) {
        this.x = x;          // X position
        this.y = y;          // Y position
        this.size = Math.random() * 5 + 2;  // Random size (2-7 pixels)
        this.speedX = Math.random() * 2 - 1; // Random horizontal speed (-1 to 1)
        this.speedY = Math.random() * 2 - 1; // Random vertical speed (-1 to 1)
        this.jointId = jointId; // ID to group particles from same joint
        this.originalX = x;  // Store original position to calculate distance from center
        this.originalY = y;
    }

    update() {
        this.x += this.speedX;  // Move particle horizontally
        this.y += this.speedY;  // Move particle vertically
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, 'rgba(0, 150, 255, 1)');    // bright blue center
        gradient.addColorStop(0.7, 'rgba(0, 150, 255, 0.6)'); // still blue at 70%
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');     // yellow at the edge, faded

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// ===== GLOBAL VARIABLES =====
let particles = [];       // Array to store active particles
let handposeModel;        // Handpose model (finger tracking)
let poseNetModel;         // PoseNet model (body tracking)
let video;                // Webcam video element
let canvas, ctx;          // Canvas and its 2D context
let jointClusters = {};   // Object to track active joint clusters

// ===== GESTURE TIMING CONTROL =====
let openPalmTime = 0;     // Tracks duration of open palm gesture (ms)
let closedPalmTime = 0;   // Tracks duration of closed fist gesture (ms)
let lastHandDetection = Date.now();  // Last time a hand was detected
const GESTURE_HOLD_DURATION = 5000;  // 5s to trigger navigation
const INACTIVITY_TIMEOUT = 60000;    // 60s timeout to return to homepage
const DETECTION_INTERVAL = 1000;     // Check gestures every 1s

// ===== LOADING SYSTEM =====
const loadingOverlay = document.createElement('div');
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;
document.body.appendChild(loadingOverlay);

function updateLoadingText(text) {
    loadingOverlay.textContent = text;  // Update loading screen text
}

// ===== MODEL LOADING =====
async function loadModels() {
    try {
        // 1. Load PoseNet (body keypoints)
        updateLoadingText("Loading PoseNet model...");
        poseNetModel = await posenet.load({
            architecture: 'MobileNetV1',  // Lightweight model
            outputStride: 16,             // Balance between speed/accuracy
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75              // Smaller = faster but less accurate
        });

        // 2. Load Handpose (finger tracking)
        updateLoadingText("Loading HandPose model...");
        const handposeScript = document.createElement('script');
        handposeScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
        document.head.appendChild(handposeScript);
        
        // Wait for Handpose to load
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof handpose !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });

        handposeModel = await handpose.load();
        
        // 3. Warm up models (avoid initial lag)
        updateLoadingText("Warming up models...");
        await warmUpModels();
        
        loadingOverlay.style.display = 'none';  // Hide loading screen
        return true;
    } catch (error) {
        console.error('Model loading failed:', error);
        updateLoadingText("Failed to load models. Using fallback...");
        setTimeout(() => loadingOverlay.style.display = 'none', 3000);
        return false;  // Fallback mode
    }
}

// Warm up models with dummy data
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
/**
 * Creates new particles at (x,y) for a specific joint.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} jointId - Unique ID for the joint
 * @param {number} count - Number of particles (default: 5)
 */
function createParticles(x, y, jointId, count = 5) {
    // Track this joint cluster
    if (!jointClusters[jointId]) {
        jointClusters[jointId] = {
            centerX: x,
            centerY: y,
            lastUpdated: Date.now(),
            radius: 50  // Initial radius of the cluster gradient
        };
    } else {
        // Update existing cluster
        jointClusters[jointId].centerX = x;
        jointClusters[jointId].centerY = y;
        jointClusters[jointId].lastUpdated = Date.now();
    }

    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, jointId));
    }
}

/**
 * Updates and draws all particles with cluster gradients.
 * Removes particles smaller than 0.2px and old clusters.
 */
function updateParticles() {
    // First remove old joint clusters (more than 2 seconds old)
    const now = Date.now();
    Object.keys(jointClusters).forEach(jointId => {
        if (now - jointClusters[jointId].lastUpdated > 2000) {
            delete jointClusters[jointId];
        }
    });
    
    // Group particles by jointId
    const clusterParticles = {};
    particles.forEach(particle => {
        if (!clusterParticles[particle.jointId]) {
            clusterParticles[particle.jointId] = [];
        }
        clusterParticles[particle.jointId].push(particle);
    });
    
    // For each active cluster, draw the gradient first
    Object.keys(jointClusters).forEach(jointId => {
        const cluster = jointClusters[jointId];
        
        // Create orange to blue radial gradient for the entire cluster
        const gradient = ctx.createRadialGradient(
            cluster.centerX, cluster.centerY, 0, 
            cluster.centerX, cluster.centerY, cluster.radius
        );
        gradient.addColorStop(0, 'rgba(255, 117, 67, 0.83)');  // Orange at center
        gradient.addColorStop(1, 'rgba(198, 54, 255, 0.16)');  // Faded blue at edge
        
        // Draw the cluster gradient
        ctx.beginPath();
        ctx.arc(cluster.centerX, cluster.centerY, cluster.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Slowly expand the cluster radius
        cluster.radius += 0.7;
    });
    
    // Update and draw individual particles
    particles.forEach((particle, index) => {
        particle.update();
        
        // If the cluster still exists, draw the particle
        if (jointClusters[particle.jointId]) {
            particle.draw(ctx);
        }
        
        // Shrink particles over time
        if (particle.size > 0.2) particle.size -= 0.05;
        
        // Remove tiny particles
        if (particle.size <= 0.2) particles.splice(index, 1);
    });
}

// ===== GESTURE DETECTION =====
/**
 * Checks if landmarks represent an open hand.
 * @param {Array} landmarks - Handpose landmarks array
 * @returns {boolean} True if ≥3 fingertips are far from the wrist.
 */
function isOpenHand(landmarks) {
    const tips = [4,8,12,16,20];  // Indices of fingertips in landmarks
    const wrist = landmarks[0];    // Wrist position
    return tips.filter(i => {
        return Math.hypot(landmarks[i][0]-wrist[0], landmarks[i][1]-wrist[1]) > 100;
    }).length >= 3;  // At least 3 extended fingers
}

/**
 * Detects gestures and triggers navigation based on timers.
 * Runs every `DETECTION_INTERVAL` ms.
 */
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
                
                // Navigate after 5s of open palm
                if (openPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToRandomPage();
                }
            } else {
                closedPalmTime += DETECTION_INTERVAL;
                openPalmTime = 0;
                
                // Return to homepage after 5s of closed fist
                if (closedPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToIndex();
                    console.log('Close palm detected - starting 5 second timer');
                }
            }
        } else {
            openPalmTime = 0;
            closedPalmTime = 0;
            
            // Return to homepage after 60s of inactivity
            if (now - lastHandDetection >= INACTIVITY_TIMEOUT) {
                navigateToIndex();
                console.log('No hands detected - starting 1 minute timer');
            }
        }
    } catch (error) {
        console.log('Detection error:', error);
    }
}

// ===== NAVIGATION =====
function navigateToRandomPage() {
    const pages = ['particle4.html', 'particle3.html'];  // Add/remove pages here
    window.location.href = pages[Math.floor(Math.random() * pages.length)];
    console.log('Open palm detected - starting 5 second timer');
}

function navigateToIndex() {
    window.location.href = 'index.html';  // Change to your homepage path
    console.log('Open palm detected - starting 5 second timer');
}

// ===== CAMERA SETUP =====
async function setupCamera() {
    try {
        video = document.createElement('video');
        video.width = 1920;
        video.height = 1080;
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 },  // Lower for better performance
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
        return null;  // Fallback mode
    }
}

// ===== POSE ESTIMATION =====
/**
 * Draws body keypoints and spawns particles at each joint.
 * @param {Array} keypoints - PoseNet keypoints array
 */
function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint, index) => {
        if (keypoint.score > 0.5) {  // Only high-confidence keypoints
            // Create a unique ID for this keypoint
            const jointId = `joint_${keypoint.part}_${index}`;
            
            // Draw the keypoint
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            
            // Spawn particles with the joint ID
            createParticles(keypoint.position.x, keypoint.position.y, jointId);
        }
    });
}

/**
 * Main pose estimation loop.
 * Draws webcam feed, keypoints, and particles.
 */
async function estimatePose() {
    if (!poseNetModel || !video) return;
    
    try {
        const pose = await poseNetModel.estimateSinglePose(video, { 
            flipHorizontal: false  // Mirror the video (set `true` for mirror mode)
        });
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawKeypoints(pose.keypoints);
        updateParticles();
        
        requestAnimationFrame(estimatePose);  // Loop
    } catch (error) {
        console.error('Pose estimation error:', error);
    }
}

// ===== MAIN INITIALIZATION =====
async function init() {
    // 1. Setup canvas (full HD resolution)
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    // 2. Setup camera
    video = await setupCamera();
    if (!video) {
        // Fallback animation if camera fails
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
    
    // 3. Load models
    const modelsLoaded = await loadModels();
    
    // 4. Start detection if models loaded
    if (modelsLoaded) {
        estimatePose();  // Start pose estimation loop
        setInterval(detectGestures, DETECTION_INTERVAL);  // Start gesture detection
    } else {
        // Fallback animation if models fail
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

// Start when TensorFlow.js is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof tf !== 'undefined') {
        tf.ready().then(() => init());
    } else {
        // Load TF.js if not already loaded
        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
        tfScript.onload = () => tf.ready().then(() => init());
        document.head.appendChild(tfScript);
    }
});