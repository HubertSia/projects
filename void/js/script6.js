/**
 * This class represents a single particle for visual effects
 */
class Particle {
    constructor(x, y) {
        this.x = x;          // X position
        this.y = y;          // Y position
        this.size = Math.random() * 5 + 2;  // Random size (2-7 pixels)
        this.speedX = Math.random() * 2 - 1; // Random horizontal speed (-1 to 1)
        this.speedY = Math.random() * 2 - 1; // Random vertical speed (-1 to 1)
    }

    update() {
        this.x += this.speedX;  // Move particle horizontally
        this.y += this.speedY;  // Move particle vertically
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';  // White with 80% opacity
        ctx.fill();
    }
}

// ===== GLOBAL VARIABLES =====
let particles = [];       // Array to store active particles
let handposeModel;        // Handpose model (finger tracking)
let poseNetModel;         // PoseNet model (body tracking)
let video;                // Webcam video element
let canvas, ctx;          // Canvas and its 2D context



// ===== GESTURE TIMING CONTROL =====
let openPalmTime = 0;     // Tracks duration of open palm gesture (ms)
let closedPalmTime = 0;   // Tracks duration of closed fist gesture (ms)
let lastHandDetection = Date.now();  // Last time a hand was detected
const GESTURE_HOLD_DURATION = 5000;  // 5s to trigger navigation
const INACTIVITY_TIMEOUT = 60000;    // 60s timeout to return to homepage
const DETECTION_INTERVAL = 1000;     // Check gestures every 1s




// ===== LOADING SYSTEM =====

// Create a loading UI with a div
const loadingOverlay = document.createElement('div');

// Styles the loading overlay
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center;
  align-items: center; z-index: 1000; color: white; font-size: 24px;
`;

// Adds the overlay to the page
document.body.appendChild(loadingOverlay);



/**
 * Updates the loading screen text.
 */
function updateLoadingText(text) {
    
    // Update loading screen text
    loadingOverlay.textContent = text;  
}




// ===== MODEL LOADING =====
/**
 * Loads TensorFlow.js models (PoseNet + Handpose) and warms them up.
 */
async function loadModels() {
    try {
        
        /**
         * Load PoseNet (body keypoints)
         */
        // Load the in-text message
        updateLoadingText("Loading PoseNet model...");
        // Load PoseNet with the configuration
        poseNetModel = await posenet.load({
            
            // Lightweight model
            architecture: 'MobileNetV1',  
            
             // Balance between speed/accuracy
            outputStride: 16,
            
            // Input resolution
            inputResolution: { width: 640, height: 480 },
            
            // Smaller = faster but less accurate (Don't want to become a power point presentation)
            multiplier: 0.75
        });

        
        /**
         * Load Handpose (finger tracking)
         */
        updateLoadingText("Loading HandPose model...");
        
        // Dynamically load Handpose from CDN (extermnal link)
        const handposeScript = document.createElement('script');
        handposeScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
        document.head.appendChild(handposeScript);
        
        // Wait for Handpose to load
        await new Promise(resolve => {
            const check = setInterval(() => {
                
                // Check if Handpose is loaded
                if (typeof handpose !== 'undefined') {
                    
                    // Stop checking
                    clearInterval(check);
                    
                    // Go!!!
                    resolve();
                }
                
                // Check every 100ms
            }, 100);
        });

        // Initialize handpose
        handposeModel = await handpose.load();
        
    
        /**
         * Warm up models (avoid initial lag)
         */
        updateLoadingText("Warming up models...");
        await warmUpModels();
        
         // Hide loading screen
        loadingOverlay.style.display = 'none'; 
        
        // Good to go!!!
        return true;
        
    }
    // Error logs
    catch (error) {
        
        //Log the error
        console.error('Model loading failed:', error);
        
        //Show the error
        updateLoadingText("Failed to load models. Using fallback...");
        
        // Hade after 3 sec
        setTimeout(() => loadingOverlay.style.display = 'none', 3000);
        
        // Fallback mode
        return false;  
    }
}


/**
 * Warm up models with dummy data
 */
async function warmUpModels() {
    
    //Create a small canvas for warming up
    const warmUpCanvas = document.createElement('canvas');
    
    // Small resolution
    warmUpCanvas.width = 256;
    warmUpCanvas.height = 256;
    const warmUpCtx = warmUpCanvas.getContext('2d');
    
    //Fill with grey
    warmUpCtx.fillStyle = 'rgb(100,100,100)';
    warmUpCtx.fillRect(0, 0, warmUpCanvas.width, warmUpCanvas.height);
    
    // Warm up PoseNet
    await poseNetModel.estimateSinglePose(warmUpCanvas);
    
    // Warm up Handpose (if loaded)
    if (handposeModel) {
        await handposeModel.estimateHands(warmUpCanvas);
    }
}

// ===== PARTICLE SYSTEM =====
/**
 * Creates new particles at (x,y).
 * (This is where the visual begins)
 */
function createParticles(x, y, count = 5) {
    
    // Loop to creat "count" particles
    for (let i = 0; i < count; i++) {
        
        // Add new particle to array
        particles.push(new Particle(x, y));
    }
}

/**
 * Updates and draws all particles.
 * Removes particles smaller than 0.2px.
 */
function updateParticles() {
    
    // Loop through particles
    particles.forEach((particle, index) => {
        
        // Update position
        particle.update();
        
        // Draw on canvas
        particle.draw(ctx);
        
        // Shrink particle
        if (particle.size > 0.2) particle.size -= 0.05;
        
        // Remove tiny particles
        if (particle.size <= 0.2) particles.splice(index, 1);
    });
}

// ===== GESTURE DETECTION =====
/**
 * Checks if landmarks represent an open hand.
 */
function isOpenHand(landmarks) {
    
    // Indices of fingertips in landmarks
    const tips = [4, 8, 12, 16, 20];
    
    // Wrist position
    const wrist = landmarks[0];  
    
    // Filter extended fingertips
    return tips.filter(i => {
        
        // Calculate distance from wrist to fingertip
        return Math.hypot(landmarks[i][0] - wrist[0],
            landmarks[i][1] - wrist[1]) > 100;
       
        // At least 3 extended fingers
    }).length >= 3;  
}

/**
 * Detects gestures and triggers navigation based on timers.
 * Runs every `DETECTION_INTERVAL` (1 sec).
 */
async function detectGestures() {
    
    // Skip if Handpose isn't loaded
    if (!handposeModel) return;

    try {
        
        // Detect hands
        const predictions = await handposeModel.estimateHands(video);
        
        // Current timestamp
        const now = Date.now();
        
        // If hands detected
        if (predictions.length > 0) {
            
            // Update last detection time
            lastHandDetection = now;
            
            // Check for open palm
            const handOpen = predictions.some(pred => isOpenHand(pred.landmarks));

            
            if (handOpen) {
                
                 // Accumulate open palm time
                openPalmTime += DETECTION_INTERVAL;
                
                // Reset closed palm time
                closedPalmTime = 0;
                
                // Navigate to a random page after 5s of open palm
                if (openPalmTime >= GESTURE_HOLD_DURATION) {
                    navigateToRandomPage();

                }
                
                 // Closed fist
            } else {
                
                // Accumulate closed palm time
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
/**
 * Navigates to a random page from a predefined list.
 */
function navigateToRandomPage() {
    
    //List of the pages
    const pages = ['particle4.html', 'particle3.html'];  
    
     // Random selection
    window.location.href = pages[Math.floor(Math.random() * pages.length)];
                        console.log('Open palm detected - starting 5 second timer');

}

/**
 * Navigates back to the homepage.
 */
function navigateToIndex() {
    
   // Redirect to homepage 
    window.location.href = 'index.html';  
}

// ===== CAMERA SETUP =====
/**
 * Initializes the webcam.
 */
async function setupCamera() {
    try {
        // Create video element
        video = document.createElement('video');
        
        // Set width and height
        video.width = 1920;
        video.height = 1080;
        
                
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
           
            //Preferred resolution
            video: { 
                width: { ideal: 1920 },  
                height: { ideal: 1080 } 
            } 
        });
        
        // Attach stream to video
        video.srcObject = stream;
        
        // Wait for metadata
        await new Promise(resolve => video.onloadedmetadata = resolve);
        
        // Start video playback
        video.play();
        
        // Return video element
        return video;
    } catch (error) {
        
        // Log error
        console.error('Camera error:', error);
        
        // Show message
        updateLoadingText("Camera access denied. Using fallback...");
        
        // Hide after 3s
        setTimeout(() => loadingOverlay.style.display = 'none', 3000);
        
        // Fallback mode
        return null;  
    }
}

// ===== POSE ESTIMATION =====
/**
 * Draws body keypoints and spawns particles at each joint.
 */
function drawKeypoints(keypoints) {
    
    // Loop through keypoints
    keypoints.forEach(keypoint => {
        
        // Only high-confidence keypoints
        if (keypoint.score > 0.5) {  
            
            // Start drawing
            ctx.beginPath();
            
            // Draw circle
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            
            // Set control color
            ctx.fillStyle = 'red';
            
            // Fill circle
            ctx.fill();
            
            // Spawn particles
            createParticles(keypoint.position.x, keypoint.position.y);  // Spawn particles
        }
    });
}

/**
 * Main pose estimation loop: draws webcam feed, keypoints, and particles.
 */
async function estimatePose() {
    
    // Skip if models/video aren't ready
    if (!poseNetModel || !video) return;
    
    try {
        const pose = await poseNetModel.estimateSinglePose(video, { 
            
           // Non-mirrored mode
            flipHorizontal: false
        });
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawKeypoints(pose.keypoints);
        updateParticles();
        
        requestAnimationFrame(estimatePose);  // Loop
    } catch (error) {
        console.error('Pose estimation error:', error);
    }
}

// ===== MAIN INITIALIZATION =====
async function init() {
    //Setup canvas (full HD resolution)
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    //Setup camera
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
    
    //Load models
    const modelsLoaded = await loadModels();
    
    // Start detection if models loaded
    if (modelsLoaded) {
        
         // Start pose estimation loop
        estimatePose(); 
        
        // Start gesture detection
        setInterval(detectGestures, DETECTION_INTERVAL);
    } else {
        
        // Fallback animation if models fail
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