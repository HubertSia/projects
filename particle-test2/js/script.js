import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// Declare variables for the scene, camera, renderer, particles, and video elements
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;

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
    document.body.appendChild(renderer.domElement);

    // Create a video element for capturing webcam footage
    const video = document.createElement('video');
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
    camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
    camera.updateProjectionMatrix(); // Update the camera projection matrix
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize the renderer
});

// Initialize the scene
init();
