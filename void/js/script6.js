/**
 * This class represents a single particle with visual effects and movement behavior.
 * Each particle belongs to a joint cluster and has a unique gradient appearance.
 */
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
let particles = [];       // Array of all active particles
let handposeModel;        // Loaded Handpose model for finger tracking
let poseNetModel;         // Loaded PoseNet model for body tracking
let video;                // Webcam video element
let canvas, ctx;          // Main canvas and its 2D context
let jointClusters = {};   // Tracks active joint clusters with metadata

/* ===== GESTURE TIMING ===== */
let openPalmTime = 0;     // Accumulated time (ms) of open palm gesture
let closedPalmTime = 0;   // Accumulated time (ms) of closed fist gesture
let lastHandDetection = Date.now();  // Timestamp of last hand detection
const GESTURE_HOLD_DURATION = 5000;  // 5 seconds to trigger navigation
const INACTIVITY_TIMEOUT = 60000;    // 60 seconds to return to homepage
const DETECTION_INTERVAL = 1000;     // Check gestures every 1 second

/* ===== LOADING SYSTEM ===== */
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
 * Loads PoseNet and Handpose models with progress feedback
 * @returns {Promise<boolean>} True if models loaded successfully
 */
async function loadModels() {
    try {
        //Load PoseNet (body pose estimation)
        updateLoadingText("Loading PoseNet model...");
        poseNetModel = await posenet.load({
            
             // Optimized for real-time use
            architecture: 'MobileNetV1', 
            
            // Balance of speed vs accuracy
            outputStride: 16,
            
            inputResolution: { width: 640, height: 480 },
            
            // Smaller = faster but less precise (Don't want to turn in to a power point presentation)
            multiplier: 0.75              
        });

        // Dynamically load Handpose library
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

        // Initialize Handpose model
        handposeModel = await handpose.load();
        
        // Warm up models with dummy data
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

/**
 * Performs initial "warm-up" inference to prevent first-run lag
 */
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

/* ===== PARTICLE SYSTEM ===== */
/**
 * Creates new particles associated with a specific body joint
 * @param {number} x - X position for new particles
 * @param {number} y - Y position for new particles
 * @param {string} jointId - Unique identifier for the joint cluster
 * @param {number} [count=5] - Number of particles to create
 */
function createParticles(x, y, jointId, count = 5) {
    // Create or update joint cluster metadata
    if (!jointClusters[jointId]) {
        jointClusters[jointId] = {
            centerX: x,
            centerY: y,
            lastUpdated: Date.now(),
            radius: 50  // Initial radius for cluster gradient
        };
    } else {
        // Update existing cluster position and timestamp
        jointClusters[jointId].centerX = x;
        jointClusters[jointId].centerY = y;
        jointClusters[jointId].lastUpdated = Date.now();
    }

    // Generate new particles
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, jointId));
    }
}

/**
 * Updates and renders all particles with cluster-based effects
 */
function updateParticles() {
    const now = Date.now();
    
    // Remove stale joint clusters (>2 seconds old)
    Object.keys(jointClusters).forEach(jointId => {
        if (now - jointClusters[jointId].lastUpdated > 2000) {
            delete jointClusters[jointId];
        }
    });
    
    // Group particles by their joint clusters
    const clusterParticles = {};
    particles.forEach(particle => {
        if (!clusterParticles[particle.jointId]) {
            clusterParticles[particle.jointId] = [];
        }
        clusterParticles[particle.jointId].push(particle);
    });
    
    // Render each active cluster's gradient background
    Object.keys(jointClusters).forEach(jointId => {
        const cluster = jointClusters[jointId];
        
        // Create orange-to-blue radial gradient
        const gradient = ctx.createRadialGradient(
            cluster.centerX, cluster.centerY, 0,
            cluster.centerX, cluster.centerY, cluster.radius
        );
        
        // Vibrant orange center
        gradient.addColorStop(0, 'rgba(255, 117, 67, 0.83)');  
        
        // Faded purple edge
        gradient.addColorStop(1, 'rgba(198, 54, 255, 0.16)');  
        
        // Draw the cluster background
        ctx.beginPath();
        ctx.arc(cluster.centerX, cluster.centerY, cluster.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Animate cluster expansion
        cluster.radius += 0.7;
    });
    
    // Update and render individual particles
    particles.forEach((particle, index) => {
        particle.update();
        
        // Only draw particles from active clusters
        if (jointClusters[particle.jointId]) {
            particle.draw(ctx);
        }
        
        // Shrink particles over time
        if (particle.size > 0.2) particle.size -= 0.05;
        
        // Remove tiny particles
        if (particle.size <= 0.2) particles.splice(index, 1);
    });
}

/* ===== GESTURE DETECTION ===== */
/**
 * Detects open palm gesture from hand landmarks
 *  Array of 21 hand landmark positions
 *  True if at least 3 fingers are extended
 */
function isOpenHand(landmarks) {
    
     // Indices of fingertip landmarks
    const tips = [4, 8, 12, 16, 20]; 
    
    // Wrist landmark position
    const wrist = landmarks[0];    
    
    return tips.filter(i => {
        return Math.hypot(landmarks[i][0]-wrist[0], landmarks[i][1]-wrist[1]) > 100;
    }).length >= 3;  // Require ≥3 extended fingers
}

/**
 * Main gesture detection loop (runs every second)
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
                
                // Trigger navigation after 5 seconds
                if (openPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToRandomPage();
                }
            } else {
                closedPalmTime += DETECTION_INTERVAL;
                openPalmTime = 0;
                
                // Return home after 5 seconds closed fist
                if (closedPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToIndex();
                }
            }
        } else {
            openPalmTime = 0;
            closedPalmTime = 0;
            
            // Return home after 60 seconds inactivity
            if (now - lastHandDetection >= INACTIVITY_TIMEOUT) {
                navigateToIndex();
            }
        }
    } catch (error) {
        console.log('Detection error:', error);
    }
}

/* ===== NAVIGATION ===== */
/**
 * Navigates to a random page from the predefined list
 */
function navigateToRandomPage() {
    const pages = ['particle4.html', 'particle3.html'];
    window.location.href = pages[Math.floor(Math.random() * pages.length)];
}

/**
 * Returns to the homepage
 */
function navigateToIndex() {
    window.location.href = 'index.html';
}

/* ===== CAMERA SETUP ===== */
/**
 * Initializes webcam with preferred resolution
 * @returns {Promise<HTMLVideoElement|null>} Video element or null if failed
 */
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

/* ===== POSE ESTIMATION ===== */
/**
 * Renders body keypoints and spawns associated particles
 * @param {Array} keypoints - PoseNet keypoints array
 */
function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint, index) => {
        if (keypoint.score > 0.5) {  // Only high-confidence keypoints
            const jointId = `joint_${keypoint.part}_${index}`;
            
            // Draw the joint marker
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            
            // Spawn particles for this joint
            createParticles(keypoint.position.x, keypoint.position.y, jointId);
        }
    });
}

/**
 * Main pose estimation and rendering loop
 */
async function estimatePose() {
    if (!poseNetModel || !video) return;
    
    try {
        const pose = await poseNetModel.estimateSinglePose(video, { 
            flipHorizontal: true  // Mirror mode for more intuitive interaction
        });
        
        // Clear canvas with black background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw keypoints and particles
        drawKeypoints(pose.keypoints);
        updateParticles();
        
        // Continue the animation loop
        requestAnimationFrame(estimatePose);
    } catch (error) {
        console.error('Pose estimation error:', error);
    }
}

/* ===== MAIN INITIALIZATION ===== */
/**
 * Initializes the entire application:
 * 1. Sets up canvas
 * 2. Initializes camera
 * 3. Loads ML models
 * 4. Starts detection loops
 */
async function init() {
    // 1. Create full HD canvas
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    // 2. Initialize webcam
    video = await setupCamera();
    if (!video) {
        // Fallback mode with random particles
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
    
    // 3. Load ML models
    const modelsLoaded = await loadModels();
    
    // 4. Start detection if models loaded successfully
    if (modelsLoaded) {
        estimatePose();  // Start pose estimation loop
        setInterval(detectGestures, DETECTION_INTERVAL);  // Start gesture detection
    } else {
        // Fallback mode with webcam and random particles
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

// Start application when TensorFlow.js is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof tf !== 'undefined') {
        tf.ready().then(() => init());
    } else {
        
        // Dynamically load TensorFlow.js if needed
        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
        tfScript.onload = () => tf.ready().then(() => init());
        document.head.appendChild(tfScript);
    }
});