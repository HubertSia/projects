import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// ===== PRELOADING SYSTEM =====
// Creates a loading indicator for hand tracking initialization
const loadingIndicator = document.createElement('div');
loadingIndicator.style.position = 'fixed';
loadingIndicator.style.bottom = '20px';
loadingIndicator.style.right = '20px';
loadingIndicator.style.color = 'white';
loadingIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
loadingIndicator.style.padding = '10px';
loadingIndicator.style.borderRadius = '5px';
loadingIndicator.style.zIndex = '1000';
loadingIndicator.textContent = 'Loading hand tracking...';
document.body.appendChild(loadingIndicator);

// ===== ORIGINAL VISUAL VARIABLES (UNCHANGED) =====
// Three.js scene, camera, renderer, and particle system variables
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;
let video, model; // Video element and handpose model

// ===== NEW COLOR VARIABLES =====
let colors; // Color attribute for particles (RGB values per particle)
const CENTER_COLOR = new THREE.Color(0xff5500); // Orange (center of particle system)
const OUTER_COLOR = new THREE.Color(0x0066ff); // Blue (outer edges)

// ===== GESTURE TIMING VARIABLES =====
// Timers and thresholds for gesture-based navigation
let openHandTimer = null; // Timer for open palm gesture
let noHandsTimer = null; // Timer for no hands detected
const OPEN_HAND_DURATION = 5000; // 5 seconds to trigger page change (open palm)
const NO_HANDS_DURATION = 60000; // 1 minute to return to homepage (no hands)
let lastGestureState = null; // Tracks the last detected gesture ('open', 'closed', or 'none')

// ===== OPTIMIZED HANDPOSE LOADING =====
/**
 * Preloads TensorFlow.js and Handpose model.
 * Displays progress in the loading indicator.
 * Falls back to mouse controls if hand tracking fails.
 */
async function preloadHandpose() {
    try {
        
        // Dynamically load TensorFlow.js if not available
        if (typeof tf === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Load Handpose model if not already loaded
        if (typeof handpose === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Load and warm up the model
        loadingIndicator.textContent = 'Loading model...';
        model = await handpose.load();
        
        // Hidden warm-up for better performance
        await warmUpModel(); 
        
        loadingIndicator.textContent = 'Hand tracking ready!';
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);
        return model;
    } catch (error) {
        console.error('Handpose loading failed:', error);
        loadingIndicator.textContent = 'Using mouse controls';
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);
        return null;
    }
}

/**
 * Warms up the Handpose model with a dummy canvas to avoid initial lag.
 */
async function warmUpModel() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await model.estimateHands(canvas);
}

// ===== GESTURE DETECTION FUNCTIONS =====
/**
 * Checks if landmarks represent an open hand (palm visible).
 */
function isOpenHand(landmarks) {
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

    const openThreshold = 100; // Pixel distance threshold for "open"
    const extendedFingers = [
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;

    return extendedFingers >= 3; // At least 3 fingers extended
}

/**
 * Checks if landmarks represent a closed hand (fist).
 * @param {Array} landmarks - Handpose landmarks array.
 * @returns {boolean} True if fingertips are close together.
 */
function isClosedHand(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Measure distances between fingertips
    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
    const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);

    // All fingers should be close together for a fist
    return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && 
            middleRingDistance < 30 && ringPinkyDistance < 30);
}

/**
 * Detects gestures and triggers page navigation based on timers.
 * Runs every second (setInterval in init()).
 */
async function detectGestures() {
    if (!model) return; // Skip if handpose failed to load

    try {
        const predictions = await model.estimateHands(video);
        let currentGestureState = null;
        
        if (predictions.length > 0) {
            const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));
            const atLeastOneClosed = predictions.some(prediction => isClosedHand(prediction.landmarks));

            if (atLeastOneOpen) {
                currentGestureState = 'open';
            } else if (atLeastOneClosed) {
                currentGestureState = 'closed';
            }
        } else {
            currentGestureState = 'none'; // No hands detected
        }

        // Reset timers only if gesture state changed
        if (currentGestureState !== lastGestureState) {
            clearTimeout(openHandTimer);
            clearTimeout(noHandsTimer);
            
            if (currentGestureState === 'open') {
                console.log('Open palm detected - starting 5 second timer');
                openHandTimer = setTimeout(() => {
                    const pages = ['spaceDust.html', 'planets.html'];
                    window.location.href = pages[Math.floor(Math.random() * pages.length)];
                }, OPEN_HAND_DURATION);
            } 
            else if (currentGestureState === 'closed') {
                console.log('Closed palm detected - starting 5 second timer');
                openHandTimer = setTimeout(() => {
                    window.location.href = 'index.html';
                }, OPEN_HAND_DURATION);
            }
            else if (currentGestureState === 'none') {
                console.log('No hands detected - starting 1 minute timer');
                noHandsTimer = setTimeout(() => {
                    window.location.href = 'index.html';
                }, NO_HANDS_DURATION);
            }
            
            lastGestureState = currentGestureState;
        }
    } catch (error) {
        console.log('Detection busy - skipping frame');
    }
}

// ===== MODIFIED VISUAL FUNCTIONS WITH COLOR GRADIENT =====
/**
 * Initializes Three.js scene, camera, particles, and hand tracking.
 * Called once on page load.
 */
function init() {
    // === Three.js Setup ===
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8; // Camera distance from particle system

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    // === Webcam Setup ===
    video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.play();

        // Start hand tracking after camera is ready
        preloadHandpose().then(() => {
            setInterval(detectGestures, 1000); // Check gestures every second
        });
    });

    // === Particle System Setup ===
    videoTexture = new THREE.VideoTexture(video); // Texture from webcam feed
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    const particleCount = 10000; // Total particles
    const geometry = new THREE.BufferGeometry();
    positions = new Float32Array(particleCount * 3); // XYZ positions
    const uvs = new Float32Array(particleCount * 2); // Texture coordinates
    colors = new Float32Array(particleCount * 3); // RGB colors per particle

    // Initialize particle positions and colors
    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 10; // Random radius from center (0-10)
        const angle = Math.random() * Math.PI * 2; // Random angle
        positions[i * 3] = Math.cos(angle) * radius || 0;
        positions[i * 3 + 1] = (Math.random() * 10 - 5) || 0; // Random Y position (-5 to 5)
        positions[i * 3 + 2] = Math.sin(angle) * radius || 0;

        uvs[i * 2] = Math.random(); // Random UVs for texture sampling
        uvs[i * 2 + 1] = Math.random();
        
        // Set initial color based on distance from center
        updateParticleColor(i);
    }

    // Assign attributes to geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // Enable vertex colors
    geometry.computeBoundingSphere();

    // Particle material with video texture and color blending
    const material = new THREE.PointsMaterial({
        size: 0.12, // Particle size
        map: videoTexture, // Webcam feed as texture
        transparent: true,
        vertexColors: true, // Use per-particle colors
        blending: THREE.AdditiveBlending, // Glow effect
        depthWrite: false // Better transparency
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    animate(); // Start animation loop
}

/**
 * Updates a particle's color based on its distance from the center.
 * Creates a gradient from CENTER_COLOR to OUTER_COLOR.
 * @param {number} index - Particle index in the buffer.
 */
function updateParticleColor(index) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    const z = positions[index * 3 + 2];
    
    // Distance from center (0,0,0)
    const distance = Math.sqrt(x*x + y*y + z*z);
    const normalizedDistance = Math.min(distance / 10, 1.0); // Normalize to 0-1
    
    // Interpolate between center and outer colors
    const color = new THREE.Color().copy(CENTER_COLOR).lerp(OUTER_COLOR, normalizedDistance);
    
    // Update color buffer
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
}

/**
 * Updates particle positions and colors each frame.
 * @param {number} time - Time in milliseconds since animation started.
 */
function updateParticles(time) {
    if (!videoCanvas || !videoContext || !videoTexture || !videoTexture.image || videoTexture.image.videoWidth === 0) return;

    // Update video texture canvas
    videoCanvas.width = 1920;
    videoCanvas.height = 1080;
    videoContext.save();
    videoContext.scale(1, -1); // Flip vertically
    videoContext.translate(0, -videoCanvas.height);
    videoContext.drawImage(videoTexture.image, 0, 0, videoCanvas.width, videoCanvas.height);
    videoContext.restore();

    const imageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
    const data = imageData.data;

    // Update each particle's position and color
    for (let i = 0; i < positions.length / 3; i++) {
        let x = positions[i * 3] || 0;
        let y = positions[i * 3 + 1] || 0;
        let z = positions[i * 3 + 2] || 0;

        // Apply gentle circular motion
        const radius = Math.sqrt(x * x + z * z) || 0;
        const angle = Math.atan2(z, x) + time * 0.0005; // Slow rotation over time

        positions[i * 3] = (Math.cos(angle) * radius || 0) + (Math.random() - 0.5) * 0.02;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.02 || 0;
        positions[i * 3 + 2] = (Math.sin(angle) * radius || 0) + (Math.random() - 0.5) * 0.02;

        // Map particle Y position to brightness from webcam
        const brightnessIndex = (Math.floor((y + 5) / 10 * videoCanvas.height) * videoCanvas.width + 
                              Math.floor((x + 5) / 10 * videoCanvas.width)) * 4;
        
        if (brightnessIndex >= 0 && brightnessIndex + 2 < data.length) {
            const brightness = (data[brightnessIndex] + data[brightnessIndex + 1] + data[brightnessIndex + 2]) / 3 / 255;
            positions[i * 3 + 1] = (brightness * 10 - 5) || 0; // Adjust Y position based on brightness
        }
        
        // Update color based on new position
        updateParticleColor(i);
    }

    // Flag Three.js to update buffers
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.computeBoundingSphere();
}

/**
 * Animation loop. Runs every frame.
 * @param {number} time - Time in milliseconds since animation started.
 */
function animate(time) {
    requestAnimationFrame(animate);
    updateParticles(time);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the application
init();