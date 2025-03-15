import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// Set TensorFlow.js backend to WebGL
tf.setBackend('webgl').then(() => {
    console.log("TensorFlow.js backend set to WebGL");
});

// Declare variables for the scene, camera, renderer, particles, and video elements
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;

// Pose and Hand Detection Variables
let video, overlayCanvas, overlayCtx;
let poseDetector, handDetector;
let handResults = [];

// MoveNet Body Keypoints Connections
const bodyConnections = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
    [5, 11], [6, 12], // Shoulders to Hips
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16] // Legs
];

// Hand connections (finger joints)
const handConnections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [5, 6], [6, 7], [7, 8], // Index
    [9, 10], [10, 11], [11, 12], // Middle
    [13, 14], [14, 15], [15, 16], // Ring
    [17, 18], [18, 19], [19, 20] // Pinky
];

// Initialize the Three.js scene and set up the camera and renderer
function init() {
    // Create a new scene
    scene = new THREE.Scene();
    
    // Set up the camera with a field of view, aspect ratio, and near/far clipping plane
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8; // Position the camera

    // Set up the WebGL renderer and add it to the document
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    // Create a video element for capturing webcam footage
    video = document.createElement('video');
    video.autoplay = true; // Automatically play the video
    video.muted = true; // Mute the video
    video.playsInline = true; // Ensure the video plays inline on mobile devices
    
    // Get user media (webcam) and set it as the video source
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.play();
    });

    // Create a texture from the video element
    videoTexture = new THREE.VideoTexture(video);
    
    // Create a canvas for processing video frames
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    // Initialize the overlay canvas for pose and hand detection
    overlayCanvas = document.getElementById('overlayCanvas');
    overlayCtx = overlayCanvas.getContext('2d');
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    // Define the number of particles and create a buffer geometry for them
    const particleCount = 10000; // Increased particle count
    const geometry = new THREE.BufferGeometry();
    positions = new Float32Array(particleCount * 3);
    const uvs = new Float32Array(particleCount * 2);

    // Randomly position the particles and assign UV coordinates
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 25;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 25;

        uvs[i * 2] = Math.random();
        uvs[i * 2 + 1] = Math.random();
    }

    // Add positions and UVs as attributes to the buffer geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Create a material for the particles using the video texture
    const material = new THREE.PointsMaterial({
        size: 0.08,
        map: videoTexture,
        transparent: true,
    });

    // Create the particle system and add it to the scene
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Start the animation loop
    animate();
}

// Load Models for Pose and Hand Detection
async function loadModels() {
    // Load MoveNet for body detection
    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
    });

    // Load MediaPipe Hands for finger tracking
    handDetector = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    handDetector.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    // Callback to store hand results
    handDetector.onResults((results) => {
        handResults = results.multiHandLandmarks || [];
    });

    console.log("Models Loaded");
}

// Detect Pose & Hands
async function detectPose() {
    if (!poseDetector) return;

    // Detect body keypoints
    const poses = await poseDetector.estimatePoses(video);
    // Process hand landmarks separately
    handDetector.send({ image: video });

    drawSkeleton(poses, handResults);
    requestAnimationFrame(detectPose);
}

// Draw Skeleton & Hands
function drawSkeleton(poses, handResults) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // 🔹 Draw MoveNet body keypoints
    if (poses.length > 0) {
        let keypoints = poses[0].keypoints;

        // Draw body connections
        overlayCtx.strokeStyle = "cyan";
        overlayCtx.lineWidth = 3;
        bodyConnections.forEach(([p1, p2]) => {
            if (keypoints[p1].score > 0.4 && keypoints[p2].score > 0.4) {
                overlayCtx.beginPath();
                overlayCtx.moveTo(keypoints[p1].x, keypoints[p1].y);
                overlayCtx.lineTo(keypoints[p2].x, keypoints[p2].y);
                overlayCtx.stroke();
            }
        });

        // Draw body keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.4) {
                overlayCtx.beginPath();
                overlayCtx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
                overlayCtx.fillStyle = "red";
                overlayCtx.fill();
            }
        });
    }

    // 🔹 Draw Hand Landmarks
    handResults.forEach(hand => {
        overlayCtx.strokeStyle = "blue";
        overlayCtx.lineWidth = 2;

        // Draw hand connections
        handConnections.forEach(([p1, p2]) => {
            overlayCtx.beginPath();
            overlayCtx.moveTo(hand[p1].x * overlayCanvas.width, hand[p1].y * overlayCanvas.height);
            overlayCtx.lineTo(hand[p2].x * overlayCanvas.width, hand[p2].y * overlayCanvas.height);
            overlayCtx.stroke();
        });

        // Draw hand keypoints
        hand.forEach(point => {
            overlayCtx.beginPath();
            overlayCtx.arc(point.x * overlayCanvas.width, point.y * overlayCanvas.height, 3, 0, 2 * Math.PI);
            overlayCtx.fillStyle = "green";
            overlayCtx.fill();
        });
    });
}

// Update the positions of the particles based on the video brightness
function updateParticles() {
    if (!videoCanvas || !videoContext) return;

    // Set the size of the video canvas
    videoCanvas.width = 1920;
    videoCanvas.height = 1080;

    // Draw the video frame onto the canvas, flipping it vertically
    videoContext.save();
    videoContext.scale(1, -1); // Flip vertically
    videoContext.translate(0, -videoCanvas.height);
    videoContext.drawImage(videoTexture.image, 0, 0, videoCanvas.width, videoCanvas.height);
    videoContext.restore();

    // Get the pixel data from the canvas
    const imageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
    const data = imageData.data;

    // Update the Z position of the particles based on the brightness of the video
    for (let i = 0; i < positions.length / 3; i++) {
        const x = Math.floor((positions[i * 3] + 5) / 10 * videoCanvas.width);
        const y = Math.floor((positions[i * 3 + 1] + 5) / 10 * videoCanvas.height);
        const index = (y * videoCanvas.width + x) * 4;
        const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3 / 255;

        positions[i * 3 + 2] = brightness * 4 - 2;
    }

    // Mark the position attribute as needing an update
    particles.geometry.attributes.position.needsUpdate = true;
}

// Animate the scene by updating particles and rendering
function animate() {
    requestAnimationFrame(animate); // Request the next animation frame
    updateParticles(); // Update particle positions
    renderer.render(scene, camera); // Render the scene
}

// Handle window resize events
window.addEventListener('resize', () => {
    // Update Three.js renderer and camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update overlay canvas size
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
});

// Initialize the scene and load models
async function main() {
    init();
    await loadModels();
    detectPose();
}

main();