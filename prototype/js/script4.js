// Get the main canvas element and its 2D rendering context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Create an offscreen canvas and its 2D rendering context for processing the webcam feed
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

// Variables to store the webcam stream and particle array
let videoStream;
let particles = [];
// Define the grid size for particles (100 columns and 50 rows)
const cols = 100, rows = 100;

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
    const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);

    // All fingers should be close together for a proper fist
    return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && middleRingDistance < 30 && ringPinkyDistance < 30);
}


// Function to detect hands and gestures
async function detectGestures() {
    if (!model) return;

    // Get hand predictions
    const predictions = await model.estimateHands(videoStream);
    if (predictions.length > 0) {
        // Check if at least one hand has an open palm
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));
        const atLeastOneClosed = predictions.some(prediction => isClosedHand(prediction.landmarks));

        if (atLeastOneOpen) {
            console.log('At Least One Open Palm Detected');
            // Randomly navigate to one of the pages after 3 seconds
            setTimeout(() => {
                const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000);
        } else if (atLeastOneClosed) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
        else {
            console.log('Both Hands Closed: Waiting 10 Seconds...');
            // Navigate to index.html after 10 seconds
            setTimeout(() => {
                window.location.href = 'prototype/index.html';
            }, 10000);
        }
    }
}

/**
 * Function to resize the canvas to fit the window and regenerate particles
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;  // Set canvas width to window width
    canvas.height = window.innerHeight;  // Set canvas height to window height
    createParticles();  // Recreate particles to fit the new canvas size
}

/**
 * Function to initialize the webcam
 */
function initWebcam() {
    // Request access to the user's webcam
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            // Create a video element to stream the webcam feed
            videoStream = document.createElement("video");
            videoStream.srcObject = stream;  // Set the video source to the webcam stream
            videoStream.play();  // Start playing the video

            // Load HandPose model after webcam starts
            loadHandPoseModel().then(() => {
                // Add a 1-minute delay before starting gesture detection
               /** setTimeout(() => {
                    console.log("Hand detection is now active!"); */
                    // Start detecting gestures every second after the delay
                    setInterval(detectGestures, 1000);
               // }, 60000); // 60,000 milliseconds = 1 minute
            });
        })
        .catch(err => console.error("Webcam access denied", err));  // Log errors if webcam access is denied
}

/**
 * Particle class to define the behavior and appearance of each particle
 */
class Particle {
    constructor(x, y) {
        this.baseX = x;  // Original x position
        this.baseY = y;  // Original y position
        this.x = x;  // Current x position
        this.y = y;  // Current y position
        this.waveOffset = Math.random() * Math.PI * 2;  // Random offset for wave-like motion
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;  // Random HSL color
    }

    /**
     * Update the particle's position based on brightness
     */
    update(brightness) {
        // Calculate distortion based on brightness (brighter areas cause more movement)
        let distortion = (brightness / 255) * 30;
        // Update x and y positions with wave-like motion and distortion
        this.x = this.baseX + Math.sin(this.waveOffset + performance.now() * 0.002) * 20 + distortion;
        this.y = this.baseY + Math.cos(this.waveOffset + performance.now() * 0.002) * 10 - distortion;
        this.waveOffset += 0.01;  // Increment wave offset for smooth animation
    }

    /**
     * Draw the particle on the canvas
     */
    draw() {
        ctx.fillStyle = this.color;  // Set particle color
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);  // Draw particle as a circle
        ctx.fill();
    }
}

/**
 * Function to create a grid of particles
 */
function createParticles() {
    particles = [];  // Clear existing particles
    // Calculate spacing between particles based on canvas size and grid dimensions
    const spacingX = canvas.width / cols;
    const spacingY = canvas.height / rows;
    // Loop through rows and columns to create particles
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            particles.push(new Particle(x * spacingX, y * spacingY));  // Add new particle to the array
        }
    }
}

/**
 * Function to calculate the brightness of a pixel at (x, y) in the webcam feed
 */
function getBrightness(x, y, imageData) {
    // Calculate the index of the pixel in the image data array
    let index = (y * imageData.width + x) * 4;
    // Return the average of the red, green, and blue channels as brightness
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
}

/**
 * Function to process the webcam feed and return pixel data
 */
function processWebcamData() {
    // Check if the webcam stream is ready
    if (videoStream && videoStream.readyState >= 2) {
        // Set offscreen canvas size to a lower resolution for performance
        offscreenCanvas.width = 100;
        offscreenCanvas.height = 50;
        // Draw the webcam feed onto the offscreen canvas
        offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        // Return the pixel data of the downsampled image
        return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    }
    return null;  // Return null if the webcam stream is not ready
}

/**
 * Animation loop to update and draw particles
 */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas
    let frame = processWebcamData();  // Process the webcam feed
    if (frame) {
        // Loop through all particles
        particles.forEach(p => {
            // Map particle position to the downsampled webcam feed
            let x = Math.floor((p.x / canvas.width) * frame.width);
            let y = Math.floor((p.y / canvas.height) * frame.height);
            // Get the brightness of the corresponding pixel
            let brightness = getBrightness(x, y, frame);
            p.update(brightness);  // Update particle position based on brightness
            p.draw();  // Draw the particle
        });
    }
    requestAnimationFrame(animate);  // Request the next animation frame
}

// Add event listener to resize the canvas when the window is resized
window.addEventListener("resize", resizeCanvas);

// Initialize the canvas, webcam, and start the animation loop
resizeCanvas();
initWebcam();
animate();
