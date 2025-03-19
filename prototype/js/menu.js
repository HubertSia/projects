// Galaxy Particle Animation with Three.js
// Set up scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Camera position
camera.position.z = 1;

// Galaxy parameters
const parameters = {
    count: 100000,
    size: 0.01,
    radius: 5,
    branches: 5,
    spin: 1,
    randomness: 0.7,
    randomnessPower: 3,
    insideColor: 0xff6030,
    outsideColor: 0x1b3984
};

// Galaxy geometry and material
let geometry = null;
let material = null;
let points = null;

const generateGalaxy = () => {
    // Dispose of old particles
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    // Geometry
    geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    // Generate points
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        const radius = Math.random() * parameters.radius;
        const spinAngle = radius * parameters.spin;
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        // Color
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / parameters.radius);

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    // Attach position + color data
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material
    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    });

    // Points
    points = new THREE.Points(geometry, material);
    scene.add(points);
};

generateGalaxy();

// Animation
const clock = new THREE.Clock();
let userRotation = 0; // User-controlled rotation
let targetRotation = 0; // Target rotation for smooth interpolation
const rotationSmoothing = 0.01; // Lower = slower, smoother transitions

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Smooth interpolation toward target rotation
    userRotation += (targetRotation - userRotation) * rotationSmoothing;

    // Base rotation + smoothed user controlled rotation
    points.rotation.y = elapsedTime * 0.03 + userRotation; // Reduced base rotation speed

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / window.innerHeight);
});

// Mouse control (fallback)
const mousePosition = new THREE.Vector2();
let usingBodyTracking = false;

// Sensitivity controls
const settings = {
    bodyRotationSensitivity: 0.5,  // Reduced from 3 to 0.8 (lower = less sensitive)
    cameraTiltSensitivity: 0.5,   // Reduced from 0.5 to 0.15
    mouseRotationSensitivity: 0.5, // Reduced from 2 to 0.5
    smoothingFactor: 0.1           // Added for position smoothing
};

// Tracking target camera positions for smooth movement
let targetCameraX = 0;
let targetCameraY = 0;

window.addEventListener('mousemove', (event) => {
    if (!usingBodyTracking) {
        mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Set target positions with reduced sensitivity
        targetCameraX = mousePosition.x * settings.cameraTiltSensitivity;
        targetCameraY = mousePosition.y * settings.cameraTiltSensitivity;
        targetRotation = mousePosition.x * settings.mouseRotationSensitivity;

        // Smooth camera movement
        camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;
        camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;
        camera.lookAt(scene.position);
    }
});

// Start animation
animate();

// DOM elements for webcam, output, and status
const video = document.createElement('video');
video.id = 'webcam-feed';
video.width = 320;
video.height = 240;
video.style.position = 'absolute';
video.style.bottom = '10px';
video.style.right = '10px';
video.style.opacity = '0.7';
document.body.appendChild(video);

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
document.body.appendChild(output);

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
document.body.appendChild(statusElement);

// Variables for gesture control
let gestureDetectionLocked = false;
let lastGestureTime = 0;
const gestureDelay = 2000; // 2 seconds cooldown between navigation events
let lastGesture = 'none';
let gestureConfirmCounter = 0;
const requiredConfirmations = 5; // Need to detect same gesture 5 times in a row

// Simple exponential moving average filter for pose positions
let prevPoseX = 0;
let prevPoseY = 0;
const poseSmoothing = 0.2; // Lower = more smoothing

// Load models
let handModel, poseModel;

// Initialize TensorFlow.js models
async function initModels() {
    try {
        // Load hand tracking model
        handModel = await handpose.load();
        console.log('HandPose model loaded.');

        // Load body tracking model
        poseModel = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log('PoseNet model loaded.');

        statusElement.textContent = 'Body and hand tracking active';
        usingBodyTracking = true;

        // Start tracking
        trackUser();
    } catch (error) {
        console.error('Error loading models:', error);
        statusElement.textContent = 'Error loading tracking. Using mouse control.';
        usingBodyTracking = false;
    }
}

// Track user's body and hands
async function trackUser() {
    if (!poseModel || !handModel) return;

    try {
        // Track body pose
        const poses = await poseModel.estimatePoses(video);

        if (poses.length > 0) {
            const pose = poses[0];

            // Get nose position (or any other keypoint you prefer)
            const nose = pose.keypoints.find(k => k.name === 'nose');

            if (nose && nose.score > 0.3) {
                // Map nose x position to rotation (center of screen = 0, left = negative, right = positive)
                // Apply smoothing filter to position
                const rawXPos = (nose.x / video.width) * 2 - 1;
                const rawYPos = (nose.y / video.height) * 2 - 1;

                // Apply smoothing filter to reduce jitter
                const xPos = prevPoseX + (rawXPos - prevPoseX) * poseSmoothing;
                const yPos = prevPoseY + (rawYPos - prevPoseY) * poseSmoothing;

                // Save for next frame
                prevPoseX = xPos;
                prevPoseY = yPos;

                // Set target rotation with reduced sensitivity
                targetRotation = -xPos * settings.bodyRotationSensitivity;

                // Update camera position targets with reduced sensitivity
                targetCameraX = xPos * settings.cameraTiltSensitivity;
                targetCameraY = -yPos * settings.cameraTiltSensitivity;

                // Smooth camera movement with interpolation
                camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;
                camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;
                camera.lookAt(scene.position);

                statusElement.textContent = 'Body tracking active - Move left/right to rotate galaxy';
            }
        }

        // Track hand gestures for navigation - with reduced frequency to prevent false triggers
        if (!gestureDetectionLocked) {
            const handPredictions = await handModel.estimateHands(video);

            if (handPredictions.length > 0) {
                const landmarks = handPredictions[0].landmarks;
                let currentGesture = 'none';

                // Detect gestures
                if (isClosedHand(landmarks)) {
                    currentGesture = 'closed';
                    output.textContent = 'Hold closed hand to navigate to smoke effect';
                } else if (isOpenHand(landmarks)) {
                    currentGesture = 'open';
                    output.textContent = 'Hold open hand to navigate to psychedelic effect';
                } else {
                    currentGesture = 'none';
                    output.textContent = 'Move body to rotate galaxy | Open/close hand to navigate';
                    gestureConfirmCounter = 0;
                }

                // Gesture confirmation logic - must detect same gesture multiple times in a row
                if (currentGesture !== 'none' && currentGesture === lastGesture) {
                    gestureConfirmCounter++;

                    // Visual feedback on gesture recognition progress
                    if (gestureConfirmCounter > 0) {
                        output.textContent += ` (${gestureConfirmCounter}/${requiredConfirmations})`;
                    }

                    // Only navigate after confirmed gesture with enough consistency
                    if (gestureConfirmCounter >= requiredConfirmations) {
                        gestureDetectionLocked = true;
                        lastGestureTime = Date.now();

                        // Navigate based on confirmed gesture
                        if (currentGesture === 'closed') {
                            output.textContent = 'Navigating to smoke effect...';
                            window.location.href = 'particle6.html';
                        } else if (currentGesture === 'open') {
                            output.textContent = 'Navigating to psychedelic effect...';
                            window.location.href = 'particle4.html';
                        }
                    }
                } else {
                    // Reset counter if gesture changed
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
            // Check if we should unlock gesture detection
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

// Gesture Detection Functions with more strict thresholds
function isClosedHand(landmarks) {
    // More precise closed hand detection
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const middleTip = landmarks[12]; // Middle finger tip
    const ringTip = landmarks[16]; // Ring finger tip
    const pinkyTip = landmarks[20]; // Pinky tip

    // Measure distances between fingertips and palm
    const palmBase = landmarks[0]; // Palm base

    // Check distances between thumb and index, and ensure other fingers are also closed
    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);

    // All fingers should be close together for a proper fist
    return thumbIndexDistance < 25 && indexMiddleDistance < 25;
}

function isOpenHand(landmarks) {
    // More precise open hand detection
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const middleTip = landmarks[12]; // Middle finger tip
    const wrist = landmarks[0]; // Wrist/palm base

    // Check if fingers are extended from the palm
    const indexExtended = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]) > 60;
    const middleExtended = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]) > 60;

    // Fingers should be spread apart
    const fingerSpread = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]) > 30;

    // For open hand, we need extended fingers that are spread apart
    return indexExtended && middleExtended && fingerSpread;
}

// Access the webcam
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
            initModels(); // Load models after webcam starts
        })
        .catch((error) => {
            console.error('Error accessing the webcam:', error);
            statusElement.textContent = 'Using mouse control (webcam access denied)';
            output.textContent = 'Webcam access denied. Using mouse controls.';
        });
} else {
    console.error('getUserMedia is not supported in this browser.');
    statusElement.textContent = 'Using mouse control (webcam not supported)';
    output.textContent = 'Your browser does not support webcam access. Using mouse controls.';
}