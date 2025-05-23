


// Get the main canvas element and its 2D rendering context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Create an offscreen canvas and its 2D rendering context for processing the webcam feed
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

// Variables to store the webcam stream and particle array
let videoStream;
let particles = [];
// Define the grid size for particles (more particles for smoother waves)
const cols = 20, rows = 30;

// Wave parameters
const waveCount = 5;  // Number of waves
const waveColors = [
    { h: 190, s: 100, l: 60 },  // Blue like Image 1
    { h: 320, s: 90, l: 65 }    // Pink like Image 2
];
let currentColorIndex = 0;
let colorTransitionValue = 0;

// Load HandPose model
let model;

async function loadHandPoseModel() {
    model = await handpose.load();
    console.log('HandPose model loaded.');
}

// Function to check if a palm is open or closed (unchanged)
function isOpenHand(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const wrist = landmarks[0];
    const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
    const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
    const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
    const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
    const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

    const openThreshold = 100;

    const extendedFingers = [
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;

    return extendedFingers >= 3;
}

/**
 * Function to detect hands and gestures (unchanged)
 */
async function detectGestures() {
    if (!model) return;

    const predictions = await model.estimateHands(videoStream);
    if (predictions.length > 0) {
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

        if (atLeastOneOpen) {
            console.log('At Least One Open Palm Detected');
            setTimeout(() => {
                const pages = ['particle6.html', 'particle3.html', 'particle1.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000);
        } else {
            console.log('Both Hands Closed: Waiting 10 Seconds...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 10000);
        }
    } else {
        console.log('No Hands Detected');
    }
}

/**
 * Function to resize the canvas to fit the window and regenerate particles
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
}

/**
 * Function to initialize the webcam (unchanged)
 */
function initWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            videoStream = document.createElement("video");
            videoStream.srcObject = stream;
            videoStream.play();

            loadHandPoseModel().then(() => {
                setInterval(detectGestures, 1000);
            });
        })
        .catch(err => console.error("Webcam access denied", err));
}

/**
 * Enhanced Particle class to create wave-like formations
 */
class Particle {
    constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        // Assign each particle to a specific wave
        this.waveGroup = Math.floor(Math.random() * waveCount);
        this.size = Math.random() * 4 + 2; // Varied particle sizes
        this.speed = Math.random() * 0.02 + 0.01;
        this.brightness = 0;
        this.alpha = 0.6 + Math.random() * 0.4; // Varied transparency
    }

    /**
     * Update the particle's position to form wave patterns
     */
    update(brightness, time) {
        this.brightness = brightness;

        // Create wave patterns based on particle's wave group
        const waveAmplitude = 40 + (brightness / 255) * 60; // Larger amplitude for brighter areas
        const waveFrequency = 0.003 + (this.waveGroup * 0.0005); // Different frequencies for each wave
        const wavePhase = time * 0.0005 + this.waveGroup * Math.PI / waveCount;

        // Calculate wave position with natural flow
        const noiseX = (Math.sin(this.baseX * 0.01 + time * 0.0002) +
            Math.cos(this.baseY * 0.01 + time * 0.0003)) * 15;
        const noiseY = (Math.sin(this.baseY * 0.01 + time * 0.0002) +
            Math.cos(this.baseX * 0.01 + time * 0.0004)) * 10;

        // Combination of wave and noise for natural flow
        this.x = this.baseX +
            Math.sin(this.baseY * waveFrequency + wavePhase) * waveAmplitude +
            noiseX;
        this.y = this.baseY +
            Math.cos(this.baseX * waveFrequency + wavePhase) * (waveAmplitude * 0.6) +
            noiseY;

        // Increase size slightly in brighter areas
        this.currentSize = this.size + (brightness / 255) * 3;
    }

    /**
     * Draw the particle with enhanced visual appearance
     */
    draw(time) {
        // Interpolate between two wave colors based on transition value
        const nextColorIndex = (currentColorIndex + 1) % waveColors.length;
        const color1 = waveColors[currentColorIndex];
        const color2 = waveColors[nextColorIndex];

        // Calculate interpolated color values
        const h = color1.h + (color2.h - color1.h) * colorTransitionValue;
        const s = color1.s + (color2.s - color1.s) * colorTransitionValue;
        const l = color1.l + (color2.l - color1.l) * colorTransitionValue;

        // Adjust lightness based on brightness from webcam
        const brightnessAdjust = Math.min(30, this.brightness / 5);
        const adjustedL = Math.min(90, l + brightnessAdjust);

        // Set particle color with proper opacity
        ctx.fillStyle = `hsla(${h}, ${s}%, ${adjustedL}%, ${this.alpha})`;

        // Draw particle with glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
        ctx.fill();

        // Add subtle glow effect for brighter particles
        if (this.brightness > 100) {
            ctx.save();
            ctx.filter = `blur(${this.currentSize * 1.5}px)`;
            ctx.globalAlpha = this.alpha * 0.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.currentSize * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

/**
 * Function to create a grid of particles
 */
function createParticles() {
    particles = [];
    // Create particles in a grid pattern
    const spacingX = canvas.width / cols;
    const spacingY = canvas.height / rows;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Add some randomness to grid positions for more natural look
            const randX = (x + (Math.random() * 0.8 - 0.4)) * spacingX;
            const randY = (y + (Math.random() * 0.8 - 0.4)) * spacingY;
            particles.push(new Particle(randX, randY));
        }
    }
}

/**
 * Function to calculate the brightness of a pixel at (x, y) in the webcam feed (unchanged)
 */
function getBrightness(x, y, imageData) {
    let index = (y * imageData.width + x) * 4;
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
}

/**
 * Function to process the webcam feed and return pixel data (unchanged)
 */
function processWebcamData() {
    if (videoStream && videoStream.readyState >= 2) {
        offscreenCanvas.width = cols;
        offscreenCanvas.height = rows;
        offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    }
    return null;
}

/**
 * Enhanced animation loop to update and draw particles with wave effects
 */
function animate() {
    // Get current time for animations
    const time = performance.now();

    // Clear canvas with a dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradually transition between colors
    colorTransitionValue += 0.002;
    if (colorTransitionValue >= 1) {
        colorTransitionValue = 0;
        currentColorIndex = (currentColorIndex + 1) % waveColors.length;
    }

    // Process webcam data
    let frame = processWebcamData();

    if (frame) {
        // Sort particles by Y position for proper layering
        particles.sort((a, b) => a.y - b.y);

        // Update and draw all particles
        particles.forEach(p => {
            let x = Math.floor((p.baseX / canvas.width) * frame.width);
            let y = Math.floor((p.baseY / canvas.height) * frame.height);
            let brightness = getBrightness(x, y, frame);
            p.update(brightness, time);
            p.draw(time);
        });
    }

    requestAnimationFrame(animate);
}

// Add event listener to resize the canvas when the window is resized
window.addEventListener("resize", resizeCanvas);

// Initialize the canvas, webcam, and start the animation loop
resizeCanvas();
initWebcam();
animate();
