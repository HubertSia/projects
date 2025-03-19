/**
 * Import Three.js library
 */
import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// Declare variables for the scene, camera, renderer, particles, and video elements
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;

// Declare the video variable globally
let video;

// Load HandPose model
let model;

async function loadHandPoseModel() {
    model = await handpose.load();
    console.log('HandPose model loaded.');
}

// Function to check if a palm is open or closed
function isOpenHand(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const middleTip = landmarks[12]; // Middle finger tip
    const ringTip = landmarks[16]; // Ring finger tip
    const pinkyTip = landmarks[20]; // Pinky finger tip

    // Calculate distances from fingertips to the wrist
    const wrist = landmarks[0]; // Wrist (base of the palm)
    const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
    const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
    const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
    const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
    const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

    // Thresholds for open palm
    const openThreshold = 100; // Adjust based on testing

    // Check if most fingers are extended (open palm)
    const extendedFingers = [
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;

    // If at least 3 fingers are extended, consider the palm open
    return extendedFingers >= 3;
}

// Function to detect hands and gestures
async function detectGestures() {
    if (!model) return;

    // Get hand predictions
    const predictions = await model.estimateHands(video);
    if (predictions.length > 0) {
        // Check if at least one hand has an open palm
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

        if (atLeastOneOpen) {
            console.log('At Least One Open Palm Detected');
            // Navigate to a random HTML page after 3 seconds
            setTimeout(() => {
                const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000); // 3-second delay
        } else {
            console.log('Both Hands Closed: Navigating to index.html');
            // Navigate to index.html after 10 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 10000); // 10-second delay
        }
    } else {
        console.log('No Hands Detected');
    }
}

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

        // Load HandPose model after webcam starts
        loadHandPoseModel().then(() => {
            // Start detecting gestures
            setInterval(detectGestures, 1000); // Check for gestures every second
        });
    });

    // Create a texture from the video element
    videoTexture = new THREE.VideoTexture(video);
    
    // Create a canvas for processing video frames
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    // Define the number of particles and create a buffer geometry for them
    const particleCount = 10000; // Increased particle count
    const geometry = new THREE.BufferGeometry();
    positions = new Float32Array(particleCount * 3);
    const uvs = new Float32Array(particleCount * 2);

    /**
     * Randomly position the particles and assign UV coordinates
     */
    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 10; // Random radius for spiral distribution
        const angle = Math.random() * Math.PI * 2; // Random angle around the Y-axis
        positions[i * 3] = Math.cos(angle) * radius; // X position
        positions[i * 3 + 1] = Math.random() * 10 - 5; // Y position (random height)
        positions[i * 3 + 2] = Math.sin(angle) * radius; // Z position

        uvs[i * 2] = Math.random(); // Random UV coordinates for texture mapping
        uvs[i * 2 + 1] = Math.random();
    }

    // Add positions and UVs as attributes to the buffer geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Create a material for the particles using the video texture
    const material = new THREE.PointsMaterial({
        size: 0.08, // Size of each particle
        map: videoTexture, // Use the video as a texture
        transparent: true, // Allow transparency,
    });

    // Create the particle system and add it to the scene
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Start the animation loop
    animate();
}

/**
 * Update the positions of the particles to create a vortex effect with slower particle movement
 */
function updateParticles(time) {
    if (!videoCanvas || !videoContext || !videoTexture.image || videoTexture.image.videoWidth === 0) return;

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

    /**
     * Update the positions of the particles to create a vortex effect
     */
    for (let i = 0; i < positions.length / 3; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];

        // Calculate the angle and radius for the vortex effect
        const radius = Math.sqrt(x * x + z * z); // Distance from the center (X-Z plane)
        const angle = Math.atan2(z, x) + time * 0.0005; // Adjust rotation speed (slower with smaller multiplier)

        // Update the particle positions
        positions[i * 3] = Math.cos(angle) * radius; // New X position
        positions[i * 3 + 2] = Math.sin(angle) * radius; // New Z position

        // Add slower random movement to the particles
        positions[i * 3] += (Math.random() - 0.5) * 0.02; // Slower random X movement
        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.02; // Slower random Y movement
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.02; // Slower random Z movement

        // Update the Y position based on the brightness of the video
        const brightnessIndex = (Math.floor((y + 5) / 10 * videoCanvas.height) * videoCanvas.width + Math.floor((x + 5) / 10 * videoCanvas.width)) * 4;
        if (brightnessIndex >= 0 && brightnessIndex + 2 < data.length) {
            const brightness = (data[brightnessIndex] + data[brightnessIndex + 1] + data[brightnessIndex + 2]) / 3 / 255;
            positions[i * 3 + 1] = brightness * 10 - 5; // Adjust Y position based on brightness
        }
    }

    // Mark the position attribute as needing an update
    particles.geometry.attributes.position.needsUpdate = true;
}

/**
 * Animate the scene by updating particles and rendering 
 */
function animate(time) {
    requestAnimationFrame(animate); // Request the next animation frame
    updateParticles(time); // Update particle positions
    renderer.render(scene, camera); // Render the scene
}

/**
 * Handle window resize events 
 */
window.addEventListener('resize', () => {
    // Update Three.js renderer and camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize the scene
async function main() {
    init();
}

main();