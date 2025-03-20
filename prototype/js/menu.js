// Galaxy Particle Animation with Three.js
// import * as THREE from 'three';
//import inside the document not working correctly, only global import in the index.html file
const scene = new THREE.Scene();   // Creates container to hold all 3D objects (To be added?)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);  // Creates camera with 75° field of view for now, aspect ratio, clipping planes
const renderer = new THREE.WebGLRenderer({ antialias: true });  // Creates a WebGL renderer + antialiasing = smoother edges for later
renderer.setSize(window.innerWidth, window.innerHeight);  // fill the entire browser window
renderer.setClearColor(0x000000);  // Sets background to black
document.body.appendChild(renderer.domElement);   // add canvas to page

// Set renderer to full screen
renderer.domElement.style.position = 'fixed';  // Uses fixed positioning for the canvas
renderer.domElement.style.top = '0';  // Places canvas at the top edge
renderer.domElement.style.left = '0';  // left edge
renderer.domElement.style.width = '100%';  //full width
renderer.domElement.style.height = '100%';  // height
renderer.domElement.style.zIndex = '1';  // layer purposes just in case

// Camera position
camera.position.z = 1.5;  // adjustable zoom, more zoomed in looks a bit better

// Galaxy parameters
const parameters = {
    count: 100000,  // Number of particles (stars)
    size: 0.01,  // Size of each particle
    radius: 5,
    branches: 5,  // Number of arm thingies
    spin: 1,  // How much the arms spin
    randomness: 0.7,  // How random particle positions are
    randomnessPower: 3,  // control concentration of random distribution
    insideColor: 0xff6030,  // Orange color for inner particles
    outsideColor: 0x1b3984  // Blue color for outer particles
};

// Galaxy geometry and material
let geometry = null;  // hold particle positions and colors
let material = null;  // Control how particles look
let points = null;  // Final render

const generateGalaxy = () => {
    // Dispose of old particles
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    // Geometry
    geometry = new THREE.BufferGeometry();  // Creates new empty geometry

    const positions = new Float32Array(parameters.count * 3);  //array for x,y,z positions
    const colors = new Float32Array(parameters.count * 3);  //array for r,g,b colors

    const colorInside = new THREE.Color(parameters.insideColor);  // Inner color
    const colorOutside = new THREE.Color(parameters.outsideColor);  // Outer color

    //Loopity loop to generate points
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;  // idk what this is, I pillaged it, but each particle needs 3 consecutive array elements

        // Positions, idk i pillaged the code for the shape, see attributes 
        const radius = Math.random() * parameters.radius;  // Random distance from center
        const spinAngle = radius * parameters.spin;  // calculates twist
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;  // Distributes particles into arms

        // Particles further from center = more randomness
        // Math.pow makes randomness distribution non-linear, idk what it actually does
        // Random < 0.5 randomly flips between positive/negative offsets, more variation
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        // Umm????
        positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;  // x position
        positions[i3 + 1] = randomY;  // Y position (only random offset, keeps galaxy relatively flat, CAN MODIFY)
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;  // z position

        // Color
        const mixedColor = colorInside.clone();  // inner color
        mixedColor.lerp(colorOutside, radius / parameters.radius);  // Blend to outer color based on radius

        colors[i3] = mixedColor.r;  // Red 
        colors[i3 + 1] = mixedColor.g;  // Green
        colors[i3 + 2] = mixedColor.b;  // Blue
    }

    // Attach position + color data
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));  // Add positions to geometry
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));  // Add colors to geometry

    // Material, to be modified
    material = new THREE.PointsMaterial({  // Creates material for particles
        size: parameters.size,  // Size 
        sizeAttenuation: true,  // Makes distant particles smaller
        depthWrite: false,    // Prevents particles blocking each other
        blending: THREE.AdditiveBlending,  // Makes overlapping particles brighten (like real stars yk)
        vertexColors: true   // Uses the colors we defined per vertex earlier
    });

    // Points
    points = new THREE.Points(geometry, material);  // Creates the systenm
    scene.add(points);  // Adds particles to canvas
};

generateGalaxy();  // spawn everything

// Animation
const clock = new THREE.Clock();  // Track time for spin animation
let userRotation = 0;  // User controlled rotation amount
let targetRotation = 0;  // Target rotation for smoothness
const rotationSmoothing = 0.01;  // Lower = slower, smoother transitions

function animate() {  // Animation loop
    const elapsedTime = clock.getElapsedTime();  // Gets time since start

    // Smooth interpolation toward target rotation
    userRotation += (targetRotation - userRotation) * rotationSmoothing;  // Gradually moves toward target

    // Base rotation + smoothed user controlled rotation
    points.rotation.y = elapsedTime * 0.03 + userRotation;  // Combines automatic and user rotation, rotates around y axis by default

    renderer.render(scene, camera);  // Renders the scene
    requestAnimationFrame(animate);  // Continues loop
}

// Window resizing stuff
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;  // Updates aspect ratio
    camera.updateProjectionMatrix();  // Updates camera 
    renderer.setSize(window.innerWidth, window.innerHeight);  // resize
});

// Mouse control (fallback)
const mousePosition = new THREE.Vector2();  // Tracks position
let usingBodyTracking = false;  // Flag for whether body tracking is active, only activates if not

// Sensitivity controls, ALLVALUES TO BE ADJUSTED!!
const settings = {
    bodyRotationSensitivity: 0.8,  // How much body movement affects the rotation
    cameraTiltSensitivity: 0.5,   // How much body movement tilts camera (Up/down)
    mouseRotationSensitivity: 0.5,  // How much mouse movement affects galaxy rotation
    smoothingFactor: 0.1           // How quickly camera moves to new positions
};

// Tracking target camera positions (Added for smoothing again)
let targetCameraX = 0;
let targetCameraY = 0;

window.addEventListener('mousemove', (event) => {  // Mouse movement fallback controls
    if (!usingBodyTracking) {  // Only use mouse if not using body tracking
        mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;  // Normalize x position to -1 to 1
        mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;  // Normalize y position to -1 to 1

        // Set camera target positions with reduced sensitivity
        targetCameraX = mousePosition.x * settings.cameraTiltSensitivity;  // x target
        targetCameraY = mousePosition.y * settings.cameraTiltSensitivity;  // y target
        targetRotation = mousePosition.x * settings.mouseRotationSensitivity;  // Sets rotation target

        // Smooth camera movement
        camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;  // Gradually moves camera x
        camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;  // Gradually moves camera y
        camera.lookAt(scene.position);  // Makes camera look at the center of the galaxy
    }
});

// Start animation
animate();

// DOM elements for webcam, output, and status, Set higher z-index to appear over galaxy
const video = document.createElement('video');  // Creates video element
video.id = 'webcam-feed';  // Sets ID for potential CSS styling
video.width = 320;
video.height = 240;
video.style.position = 'absolute';
video.style.bottom = '10px';
video.style.right = '10px';
video.style.opacity = '0.7';  // Makes partially transparent??
video.style.zIndex = '10';  // Ensures it appears above galaxy
document.body.appendChild(video);  // Adds

const output = document.createElement('div');  // Creates element for gesture messages
output.id = 'output';  // Sets ID
output.style.position = 'absolute';
output.style.top = '10px';  // 10px from top
output.style.left = '10px';  // 10px from left
output.style.color = 'white';  // Sets text color
output.style.fontFamily = 'Arial, sans-serif';  // Sets font
output.style.padding = '10px';
output.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';  // Semi-transparent background
output.style.borderRadius = '5px';
output.style.zIndex = '10';  // Ensures it appears above galaxy
document.body.appendChild(output);  // Adds

const statusElement = document.createElement('div');  // Creates element for tracking status
statusElement.id = 'tracking-status';  // Sets ID
// Similar styling to output element
statusElement.style.position = 'absolute';
statusElement.style.top = '60px';  // Positioned below output
statusElement.style.left = '10px';
statusElement.style.color = 'white';
statusElement.style.fontFamily = 'Arial, sans-serif';
statusElement.style.padding = '10px';
statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
statusElement.style.borderRadius = '5px';
statusElement.style.zIndex = '10';
document.body.appendChild(statusElement);

// Variables for gesture control
let gestureDetectionLocked = false;  // Prevents instant detection
let lastGestureTime = 0;  // Tracks when last gesture was detected
const gestureDelay = 2000;  // 2 seconds cooldown between events
let lastGesture = 'none';  // Tracks previous gesture
let gestureConfirmCounter = 0;  // Counter for consistent gesture detection
const requiredConfirmations = 5;  // Need to detect same gesture 5 times in a row for confirmation

//Pose positions
let prevPoseX = 0;  // Previous smoothed x position
let prevPoseY = 0;  // Previous smoothed y position
const poseSmoothing = 0.2;  // Lower = more smoothing

// Load models
let handModel, poseModel;  // models for hand and pose detection

// Initialize TensorFlow.js models
async function initModels() {
    try {
        // Load hand tracking model
        handModel = await handpose.load();
        console.log('HandPose model loaded.');

        // Load body tracking model
        poseModel = await poseDetection.createDetector(  //pose detection model
            poseDetection.SupportedModels.MoveNet,  // Uses MoveNet model
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }  // Uses lightning variant for speed
        );
        console.log('PoseNet model loaded.');

        statusElement.textContent = 'Body and hand tracking active';  // Updates status
        usingBodyTracking = true;  // Sets flag for body tracking

        // Start tracking
        trackUser();
    } catch (error) {
        console.error('Error loading models:', error);
        statusElement.textContent = 'Error loading tracking. Using mouse control.';  // Error message
        usingBodyTracking = false;  // Falls back to mouse control
    }
}

// Track user's body and hands
async function trackUser() {
    if (!poseModel || !handModel) return;  // Exits if models aren't loaded

    try {
        // Track body pose
        const poses = await poseModel.estimatePoses(video);  // Get data from webcam

        if (poses.length > 0) {  // If a pose is detected
            const pose = poses[0];  // Gets the first (main) pose

            // Get nose position for now, we can change it???
            const nose = pose.keypoints.find(k => k.name === 'nose');

            if (nose && nose.score > 0.3) {  // If nose is detected > 30%
                // Map nose x position to rotation (center of screen = 0, left = negative, right = positive)
                // Apply smoothing filter to position
                const rawXPos = (nose.x / video.width) * 2 - 1;  // Normalizes x position to -1 to 1
                const rawYPos = (nose.y / video.height) * 2 - 1;  // Normalizes y position to -1 to 1

                // Apply smoothing filter to reduce jitter
                const xPos = prevPoseX + (rawXPos - prevPoseX) * poseSmoothing;
                const yPos = prevPoseY + (rawYPos - prevPoseY) * poseSmoothing;

                // Save for next frame
                prevPoseX = xPos;
                prevPoseY = yPos;

                // Set target rotation
                targetRotation = -xPos * settings.bodyRotationSensitivity;  // Sets rotation target based on body position

                // Update camera position targets
                targetCameraX = xPos * settings.cameraTiltSensitivity;
                targetCameraY = -yPos * settings.cameraTiltSensitivity;

                // Smooth camera movement
                camera.position.x += (targetCameraX - camera.position.x) * settings.smoothingFactor;  // Gradually moves camera x
                camera.position.y += (targetCameraY - camera.position.y) * settings.smoothingFactor;  // Gradually moves camera y
                camera.lookAt(scene.position);  // Makes camera look at center

                statusElement.textContent = 'Body tracking active - Move left/right to rotate galaxy';
            }
        }

        // Track hand gestures for navigation
        if (!gestureDetectionLocked) {  // Only if not in cooldown
            const handPredictions = await handModel.estimateHands(video);  // Gets hand data from webcam

            if (handPredictions.length > 0) {  // If hands detected
                const landmarks = handPredictions[0].landmarks;  // Gets hand landmarks
                let currentGesture = 'none';  // Default gesture

                // Detect gestures
                if (isOpenHand(landmarks)) {  // Checks for open hand
                    currentGesture = 'open';  // Sets current gesture
                    output.textContent = 'Hold open hand to navigate to psychedelic effect';  // Updates instruction
                } else {
                    currentGesture = 'none';  // No recognized gesture
                    output.textContent = 'Move body to rotate galaxy | Open/close hand to navigate';  // Default instruction
                    gestureConfirmCounter = 0;  // Resets confirmation counter
                }

                // Gesture confirmation logic, must detect same gesture multiple times in a row
                if (currentGesture !== 'none' && currentGesture === lastGesture) {  // If same not none gesture detected again
                    gestureConfirmCounter++;  // Increment counter

                    // Visual feedback on gesture recognition progress, not rlly working tbh
                    if (gestureConfirmCounter > 0) {
                        output.textContent += ` (${gestureConfirmCounter}/${requiredConfirmations})`;  // Shows progress
                    }

                    // Only navigate after confirmed gesture
                    if (gestureConfirmCounter >= requiredConfirmations) {  // If gesture confirmed enough times
                        gestureDetectionLocked = true;  // Locks detection to prevent instant triggers
                        lastGestureTime = Date.now();  // Records time for cooldown

                        // Navigate based on confirmed gesture
                        if (currentGesture === 'open') {  // If open hand gesture
                            setTimeout(() => {
                                // Randomly navigate to one of the pages
                                const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];  // Possible destinations
                                const randomPage = pages[Math.floor(Math.random() * pages.length)];  // Picks random page
                                window.location.href = randomPage;  // Navigates to that page
                            }, 6000);  // 6-second delay
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
                output.textContent = 'Move body to rotate galaxy | Open/close hand to navigate';  // Default instruction
                gestureConfirmCounter = 0;  // Resets counter when no hands detected
            }
        } else {

            const currentTime = Date.now();
            if (currentTime - lastGestureTime > gestureDelay) {
                gestureDetectionLocked = false;
            }
        }
    } catch (error) {
        console.error('Tracking error:', error);  // Logs errors
    }

    // Continue tracking
    requestAnimationFrame(trackUser);
}

// Gesture Detection Functions
function isOpenHand(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Calculate distances from fingertips to the wrist
    const wrist = landmarks[0];
    const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
    const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
    const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
    const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
    const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

    // Thresholds for open palm, can be adjusted
    const openThreshold = 100;

    // Check if most fingers are extended (open palm)
    const extendedFingers = [
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;  // Count how many fingers are extended

    // If at least 3 fingers are extended, consider the palm open
    return extendedFingers >= 3;  // Returns true if 3+ fingers extended
}

// Access the webcam
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {  // Checks if webcam API available
    navigator.mediaDevices.getUserMedia({ video: true })  // Requests webcam access
        .then((stream) => {
            video.srcObject = stream;  // Sets webcam stream as video source
            video.play();  // Starts playing webcam feed
            initModels();  // Loads models after webcam starts
        })
        .catch((error) => {
            console.error('Error accessing the webcam:', error);  // Logs error
            statusElement.textContent = 'Using mouse control (webcam access denied)';  // Updates status
            output.textContent = 'Webcam access denied. Using mouse controls.';  // Updates instructions
        });
} else {
    console.error('getUserMedia is not supported in this browser.');  // Logs browser compatibility error
    statusElement.textContent = 'Using mouse control (webcam not supported)';  // Updates status
    output.textContent = 'Your browser does not support webcam access. Using mouse controls.';  // Updates instructions
}

// Add CSS for fill purposes, could be in a stylesheet but whatever for now
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
