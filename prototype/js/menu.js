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

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Base rotation + user controlled rotation
    points.rotation.y = elapsedTime * 0.02 + userRotation;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse control (fallback)
const mousePosition = new THREE.Vector2();
let usingBodyTracking = false;

window.addEventListener('mousemove', (event) => {
    if (!usingBodyTracking) {
        mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Move camera and rotate galaxy based on mouse position
        camera.position.x = mousePosition.x * 0.5;
        camera.position.y = mousePosition.y * 0.5;
        userRotation = mousePosition.x * 2; // Mouse controls rotation
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
                const xPos = (nose.x / video.width) * 2 - 1;
                userRotation = -xPos * 3; // Negative to make movement intuitive (move left, galaxy rotates right)

                // Update camera position for tilt effect
                camera.position.x = xPos * 0.5;

                // Get y position for vertical tilt
                const yPos = (nose.y / video.height) * 2 - 1;
                camera.position.y = -yPos * 0.3; // Inverted to make it intuitive

                camera.lookAt(scene.position);

                statusElement.textContent = 'Body tracking active - Move left/right to rotate galaxy';
            }
        }

        // Track hand gestures for navigation
        const handPredictions = await handModel.estimateHands(video);

        if (handPredictions.length > 0) {
            const landmarks = handPredictions[0].landmarks;

            // Detect gestures for navigation
            if (isClosedHand(landmarks)) {
                output.textContent = 'Detected Gesture: Closed Hand';
                window.location.href = 'particle6.html'; // Navigate to test-smoke
            } else if (isOpenHand(landmarks)) {
                output.textContent = 'Detected Gesture: Open Hand';
                window.location.href = 'particle4.html'; // Navigate to test-psychedelic
            } else {
                output.textContent = 'Hand detected - use open/closed hand to navigate';
            }
        } else {
            output.textContent = 'Move body to rotate galaxy';
        }
    } catch (error) {
        console.error('Tracking error:', error);
    }

    // Continue tracking
    requestAnimationFrame(trackUser);
}

// Gesture Detection Functions
function isClosedHand(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const distance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    return distance < 30; // Closed hand if thumb and index finger are close
}

function isOpenHand(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const distance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    return distance > 50; // Open hand if thumb and index finger are far apart
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