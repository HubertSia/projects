/* ================ LOADING SYSTEM ================ */
// This section handles all preloading and shows a progress bar

// Create full-screen loading overlay
const loadingContainer = document.createElement('div');
loadingContainer.id = 'loading-container';
loadingContainer.style.position = 'fixed';
loadingContainer.style.top = '0';
loadingContainer.style.left = '0';
loadingContainer.style.width = '100%';
loadingContainer.style.height = '100%';
loadingContainer.style.backgroundColor = '#000';
loadingContainer.style.display = 'flex';
loadingContainer.style.flexDirection = 'column';
loadingContainer.style.justifyContent = 'center';
loadingContainer.style.alignItems = 'center';
loadingContainer.style.zIndex = '1000'; // Ensure it's on top

// Loading text element
const loadingText = document.createElement('div');
loadingText.textContent = 'Loading interactive experience...';
loadingText.style.color = '#fff';
loadingText.style.fontFamily = 'Arial, sans-serif';
loadingText.style.fontSize = '24px';
loadingText.style.marginBottom = '20px';

// Progress bar container
const progressBar = document.createElement('div');
progressBar.style.width = '300px';
progressBar.style.height = '10px';
progressBar.style.backgroundColor = '#ffad33'; // Background of progress bar
progressBar.style.borderRadius = '5px';

// Progress fill element (green bar)
const progressFill = document.createElement('div');
progressFill.style.width = '0%';
progressFill.style.height = '100%';
progressFill.style.backgroundColor = '#4CAF50'; // Green progress color
progressFill.style.borderRadius = '5px';
progressFill.style.transition = 'width 0.3s'; // Smooth animation

// Assemble progress bar
progressBar.appendChild(progressFill);
loadingContainer.appendChild(loadingText);
loadingContainer.appendChild(progressBar);
document.body.appendChild(loadingContainer);

/* ================ MODEL LOADING ================ */
// Tracks which libraries have loaded
let tfLoaded = false;
let handposeLoaded = false;
let poseDetectionLoaded = false;

// Update progress bar (0-100)
function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
}

// Load TensorFlow.js core
async function loadTF() {
    if (typeof tf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
        script.onload = () => {
            tfLoaded = true;
            updateProgress(30); // 30% when TF loaded
        };
        document.head.appendChild(script);
    } else {
        tfLoaded = true;
        updateProgress(30);
    }
}

// Load Handpose model
async function loadHandpose() {
    if (typeof handpose === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
        script.onload = async () => {
            updateProgress(50); // 50% when handpose loaded
            handposeLoaded = true;
        };
        document.head.appendChild(script);
    } else {
        handposeLoaded = true;
        updateProgress(50);
    }
}

// Load Pose Detection model
async function loadPoseDetection() {
    if (typeof poseDetection === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection';
        script.onload = async () => {
            updateProgress(70); // 70% when pose loaded
            poseDetectionLoaded = true;
        };
        document.head.appendChild(script);
    } else {
        poseDetectionLoaded = true;
        updateProgress(70);
    }
}

// Start loading all required libraries
loadTF();
loadHandpose();
loadPoseDetection();

/* ================ THREE.JS GALAXY SCENE ================ */
// Main 3D scene configuration

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, // Field of view (degrees)
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Smoother edges
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000); // Black background
document.body.appendChild(renderer.domElement);

// Fullscreen canvas styling
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '1'; // Behind UI elements

// Camera position (adjust for zoom level)
camera.position.z = 1.5;

/* ================ GALAXY PARAMETERS ================ */
// Customize these values to change galaxy appearance
const parameters = {
    count: 100000,       // Number of stars/particles
    size: 0.01,          // Size of each particle
    radius: 5,           // Overall size of galaxy
    branches: 5,         // Number of spiral arms
    spin: 1,             // Twist/tightness of arms
    randomness: 0.7,     // How scattered stars are
    randomnessPower: 3,  // Controls distribution of randomness
    insideColor: 0xff6030, // Center color (orange)
    outsideColor: 0x1b3984 // Edge color (blue)
};

// Galaxy rendering variables
let geometry = null;
let material = null;
let points = null;

/* ================ GALAXY GENERATION ================ */
// Creates the particle galaxy
const generateGalaxy = () => {
    // Clean up previous galaxy if exists
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    // Create geometry and arrays for particle data
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3); // x,y,z for each particle
    const colors = new Float32Array(parameters.count * 3);    // r,g,b for each particle

    // Color setup
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    // Create each particle
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;
        
        // Position calculations
        const radius = Math.random() * parameters.radius;
        const spinAngle = radius * parameters.spin;
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

        // Random offsets (creates organic look)
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * 
                       (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * 
                       (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * 
                       (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        // Set positions
        positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        // Color gradient from center to edge
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / parameters.radius);

        // Set colors
        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    // Add attributes to geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create material for particles
    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,  // Particles get smaller with distance
        depthWrite: false,      // Better transparency handling
        blending: THREE.AdditiveBlending, // Brightens overlapping particles
        vertexColors: true      // Use our custom colors
    });

    // Create final particle system
    points = new THREE.Points(geometry, material);
    scene.add(points);
};

// Generate initial galaxy
generateGalaxy();

/* ================ ANIMATION LOOP ================ */
const clock = new THREE.Clock();
let userRotation = 0;
let targetRotation = 0;
const rotationSmoothing = 0.01; // Lower = smoother but slower rotation

function animate() {
    const elapsedTime = clock.getElapsedTime();
    
    // Smooth rotation towards target
    userRotation += (targetRotation - userRotation) * rotationSmoothing;
    
    // Combine automatic and user rotation
    points.rotation.y = elapsedTime * 0.03 + userRotation;
    
    // Render frame
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Start animation
animate();

/* ================ WINDOW RESIZING ================ */
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================ CONTROL SYSTEMS ================ */
// Mouse control (fallback)
const mousePosition = new THREE.Vector2();
let usingBodyTracking = false;

// Sensitivity settings (adjust these to change responsiveness)
const settings = {
    bodyRotationSensitivity: 0.8,  // How much body movement affects rotation
    cameraTiltSensitivity: 0.5,    // How much body movement tilts view
    mouseRotationSensitivity: 0.5, // Mouse rotation speed
    smoothingFactor: 0.1           // Camera movement smoothness
};

let targetCameraX = 0;
let targetCameraY = 0;

// Mouse movement handler
window.addEventListener('mousemove', (event) => {
    if (!usingBodyTracking) {
        // Normalize mouse position to -1 to 1 range
        mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Calculate targets based on sensitivity
        targetCameraX = mousePosition.x * settings.cameraTiltSensitivity;
        targetCameraY = mousePosition.y * settings.cameraTiltSensitivity;
        targetRotation = mousePosition.x * settings.mouseRotationSensitivity;

        // Smooth camera movement
        camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;
        camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;
        camera.lookAt(scene.position);
    }
});

/* ================ UI ELEMENTS ================ */
// Webcam feed element
const video = document.createElement('video');
video.id = 'webcam-feed';
video.width = 320;
video.height = 240;
video.style.position = 'absolute';
video.style.bottom = '10px';
video.style.right = '10px';
video.style.opacity = '0.7';
video.style.zIndex = '10'; // Above galaxy
document.body.appendChild(video);

// Instruction text
const output = document.createElement('div');
output.id = 'output';
output.style.position = 'absolute';
output.style.top = '10px';
output.style.left = '10px';
output.style.color = 'white';
output.style.fontFamily = 'Arial, sans-serif';
output.style.padding = '10px';
output.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
output.style.borderRadius = '5px';
output.style.zIndex = '10';
document.body.appendChild(output);

// Status display
const statusElement = document.createElement('div');
statusElement.id = 'tracking-status';
statusElement.style.position = 'absolute';
statusElement.style.top = '60px';
statusElement.style.left = '10px';
statusElement.style.color = 'white';
statusElement.style.fontFamily = 'Arial, sans-serif';
statusElement.style.padding = '10px';
statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
statusElement.style.borderRadius = '5px';
statusElement.style.zIndex = '10';
document.body.appendChild(statusElement);

/* ================ GESTURE CONTROL ================ */
// Gesture tracking variables
let gestureDetectionLocked = false;
let lastGestureTime = 0;
const gestureDelay = 2000; // 2 second cooldown between gestures
let lastGesture = 'none';
let gestureConfirmCounter = 0;
const requiredConfirmations = 5; // Need 5 consistent detections

// Pose tracking variables
let prevPoseX = 0;
let prevPoseY = 0;
const poseSmoothing = 0.2; // Lower = smoother but laggier tracking

// Model references
let handModel = null;
let poseModel = null;

/* ================ MODEL WARM-UP ================ */
// Prepares models by running dummy detection
async function warmUpModels() {
    if (!handModel || !poseModel) return;
    
    // Create blank canvas for warm-up
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Warm up hand model
    try {
        await handModel.estimateHands(canvas);
        console.log('Hand model warmed up');
    } catch (e) {
        console.warn('Hand model warm-up failed:', e);
    }
    
    // Warm up pose model
    try {
        await poseModel.estimatePoses(canvas);
        console.log('Pose model warmed up');
    } catch (e) {
        console.warn('Pose model warm-up failed:', e);
    }
}

/* ================ MODEL INITIALIZATION ================ */
async function initModels() {
    try {
        updateProgress(95);
        
        // Load hand tracking model
        handModel = await handpose.load();
        
        // Load body tracking model (using lightweight version)
        poseModel = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        
        // Warm up models for better initial performance
        await warmUpModels();
        
        // Complete loading
        updateProgress(100);
        
        // Fade out loading screen
        loadingContainer.style.transition = 'opacity 0.5s';
        loadingContainer.style.opacity = '0';
        setTimeout(() => {
            loadingContainer.style.display = 'none';
        }, 500);
        
        // Start webcam if available
        setupWebcam();
    } catch (error) {
        console.error('Model initialization failed:', error);
        loadingText.textContent = 'Using mouse controls (tracking failed to load)';
        
        // Still hide loading screen but with message
        setTimeout(() => {
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                loadingContainer.style.display = 'none';
            }, 500);
        }, 2000);
    }
}

/* ================ WEBCAM SETUP ================ */
function setupWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                video.srcObject = stream;
                video.play();
                usingBodyTracking = true;
                statusElement.textContent = 'Body and hand tracking active';
                trackUser();
            })
            .catch((error) => {
                console.error('Webcam error:', error);
                statusElement.textContent = 'Using mouse control (webcam access denied)';
                output.textContent = 'Webcam access denied. Using mouse controls.';
            });
    }
}

/* ================ USER TRACKING ================ */
async function trackUser() {
    if (!poseModel || !handModel) return;

    try {
        // Body pose detection
        const poses = await poseModel.estimatePoses(video);

        if (poses.length > 0) {
            const pose = poses[0];
            const nose = pose.keypoints.find(k => k.name === 'nose');

            if (nose && nose.score > 0.3) {
                // Normalize and smooth position
                const rawXPos = (nose.x / video.width) * 2 - 1;
                const rawYPos = (nose.y / video.height) * 2 - 1;

                const xPos = prevPoseX + (rawXPos - prevPoseX) * poseSmoothing;
                const yPos = prevPoseY + (rawYPos - prevPoseY) * poseSmoothing;

                prevPoseX = xPos;
                prevPoseY = yPos;

                // Apply to galaxy rotation and camera
                targetRotation = -xPos * settings.bodyRotationSensitivity;
                targetCameraX = xPos * settings.cameraTiltSensitivity;
                targetCameraY = -yPos * settings.cameraTiltSensitivity;

                camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;
                camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;
                camera.lookAt(scene.position);

                statusElement.textContent = 'Body tracking active - Move left/right to rotate galaxy';
            }
        }

        // Hand gesture detection
        if (!gestureDetectionLocked) {
            const handPredictions = await handModel.estimateHands(video);

            if (handPredictions.length > 0) {
                const landmarks = handPredictions[0].landmarks;
                let currentGesture = 'none';

                if (isOpenHand(landmarks)) {
                    currentGesture = 'open';
                    output.textContent = 'Hold open hand to navigate to psychedelic effect';
                } else {
                    currentGesture = 'none';
                    output.textContent = 'Move body to rotate galaxy | Open/close hand to navigate';
                    gestureConfirmCounter = 0;
                }

                // Gesture confirmation logic
                if (currentGesture !== 'none' && currentGesture === lastGesture) {
                    gestureConfirmCounter++;

                    // Show progress
                    if (gestureConfirmCounter > 0) {
                        output.textContent += ` (${gestureConfirmCounter}/${requiredConfirmations})`;
                    }

                    // Trigger action after enough confirmations
                    if (gestureConfirmCounter >= requiredConfirmations) {
                        gestureDetectionLocked = true;
                        lastGestureTime = Date.now();

                        if (currentGesture === 'open') {
                            setTimeout(() => {
                                const pages = ['particle6.html', 'particle4.html', 'particle3.html'];
                                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                                window.location.href = randomPage;
                            }, 6000);
                        }
                    }
                } else {
                    if (currentGesture !== lastGesture) {
                        gestureConfirmCounter = 0;
                    }
                }

                lastGesture = currentGesture;
            } else {
                output.textContent = 'Move body to rotate galaxy | Open/close hand to navigate';
                gestureConfirmCounter = 0;
            }
        } else {
            // Check if gesture lock should expire
            const currentTime = Date.now();
            if (currentTime - lastGestureTime > gestureDelay) {
                gestureDetectionLocked = false;
            }
        }
    } catch (error) {
        console.error('Tracking error:', error);
    }

    // Continue tracking
    requestAnimationFrame(trackUser);
}

/* ================ GESTURE DETECTION ================ */
function isOpenHand(landmarks) {
    // Get finger tip positions
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Calculate distances from fingertips to wrist
    const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
    const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
    const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
    const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
    const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

    // Threshold for considering a finger "extended"
    const openThreshold = 100; // Adjust this for sensitivity

    // Count how many fingers are extended
    const extendedFingers = [
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;

    // Consider hand open if at least 3 fingers extended
    return extendedFingers >= 3;
}

/* ================ INITIALIZATION ================ */
// Check every 100ms if all dependencies are loaded
const checkReady = setInterval(() => {
    if (tfLoaded && handposeLoaded && poseDetectionLoaded && typeof THREE !== 'undefined') {
        clearInterval(checkReady);
        initModels();
    }
}, 100);

/* ================ GLOBAL STYLES ================ */
const style = document.createElement('style');
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