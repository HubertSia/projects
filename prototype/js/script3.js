/**
 * Import Three.js library
 */
import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// Declare variables for the scene, camera, renderer, particles, and video elements
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;

// Declare the video variable globally
let video;

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
        transparent: true, // Allow transparency
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
 *Update the positions of the particles to create a vortex effect
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
 *Handle window resize events 
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