// THE NEBULA
// 2/3 of navigable interactive environments 

// Setup
const canvas = document.getElementById("canvas");  // Selects the HTML canvas element
const ctx = canvas.getContext("2d");  // Getting the 2D rendering context for drawing

// Create offscreen canvas for processing the webcam feed
const offscreenCanvas = document.createElement("canvas");  // Creates a new canvas that won't be displayed
const offscreenCtx = offscreenCanvas.getContext("2d");

// Yet another hidden canvas for motion detection
const motionCanvas = document.createElement("canvas");
const motionCtx = motionCanvas.getContext("2d");

// Variables to store the webcam stream and particle array
let videoStream;  // Cam video storage
let particles = [];  // Array for particles
// Define the grid size for the particles (Best size for both performance and aesthetics, but we could increase it to look more like stars at the expense of performance)
const cols = 60, rows = 60;  // Creates a 60x60 grid

// Store the previous frame for motion detection, to compare current to previous 
let prevFrame = null;

// Handpose model and gesture tracking variables
let model;  // TensorFlow.js handpose storage
let openHandTimer = null;  // Timer for detecting open hand gestures, null for now
let noHandsTimer = null;  // Timer for detecting no hands
const OPEN_HAND_DURATION = 5000;  // 5 seconds threshold before accepting gestures
const NO_HANDS_DURATION = 60000;  // 1 minute threshold to go back to the menu screen
let lastGestureState = null;  // Tracks the last gesture for comparison

// Loading indicator for handpose model, pillaged from the planets script
const loadingIndicator = document.createElement('div');  // Creates a div to show status
loadingIndicator.style.position = 'fixed';  // Positions it fixed on screen
loadingIndicator.style.bottom = '20px';  // 20px from bottom
loadingIndicator.style.right = '20px';  // 20px from right
loadingIndicator.style.color = 'white';  // White text
loadingIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';  // Semi trans black background
loadingIndicator.style.padding = '10px';  // Padding around the text
loadingIndicator.style.borderRadius = '5px';  // Rounded corners
loadingIndicator.style.zIndex = '1000';  // Ensures it appears above other elements
loadingIndicator.textContent = 'Loading hand tracking...';  // Initial text
document.body.appendChild(loadingIndicator);  // Adds to the screen

/**
 * class to define the behavior and appearance of each particle
 */
class Particle {
    constructor(x, y) {  // Initializes particle at position (x and y)
        this.baseX = x;  // Original x
        this.baseY = y;  // Original y
        this.x = x;  // Current x 
        this.y = y;  // Current y 
        this.waveOffset = Math.random() * Math.PI * 2;  // Random offset for the idle wave motion
        this.gradientPosition = y / canvas.height;  // Vertical position for the color gradient later

        // Assign three sizes randomly
        const sizeCategory = Math.floor(Math.random() * 3);  // Random number 0, 1, 2
        if (sizeCategory === 0) {
            this.radius = 3;  // Smol boi 
        } else if (sizeCategory === 1) {
            this.radius = 6;  // normal 
        } else {
            this.radius = 9;  // Big boi
        }

        this.baseOpacity = 0.6 + Math.random() * 0.4;  // Random opacity between 0.6 (minimum) and 1.0 for aesthetics because it looks nice
        this.velocity = { x: 0, y: 0 };  // Initial velocity vector (no movement)
        this.acceleration = { x: 0, y: 0 };  // Initial acceleration vector (None)
        this.mass = this.radius;  // Mass proportional to that random radius
        this.friction = 0.92;  // Friction coefficient to slow down particles
        this.maxSpeed = 15;  // Maximum speed for interaction
        this.attracted = false;  // Flag for whether particle overlaps person
        this.motionStrength = 0;  // Strength of the motion effect, 0 for now
    }

    applyForce(forceX, forceY, motionValue) {  // calclating the forces appplied to the particles
        const fx = forceX / this.mass;  // Force divided by mass (Newton yeeeeeee) in x to calculate force applied
        const fy = forceY / this.mass;  // Same thing but in y
        this.acceleration.x += fx;  // Add to acceleration x 
        this.acceleration.y += fy;  // Same but y 
        this.motionStrength = Math.min(1, motionValue / 100);  // Normalize motion strength with cap at 1
        this.attracted = motionValue > 10;  // Set attraction (overlap) flag if camera motion is above the threshold (adjust as needed depending on how it looks in the holodeck)
    }

    update(brightness, motionValue) {  // Making stuff move
        const waveStrength = 0.5;  // Strength of wave motion (seems about right?)
        const waveX = Math.sin(this.waveOffset + performance.now() * 0.001) * waveStrength;  // X component of wave, don't ask idk how it works but it works bruh
        const waveY = Math.cos(this.waveOffset + performance.now() * 0.001) * waveStrength;  // Y
        this.waveOffset += 0.01;  // Increment wave offset for animation over time

        // Apply spring force to return particle to original position
        const distanceX = this.baseX - this.x;  // X distance from the original position
        const distanceY = this.baseY - this.y;  // Y distance
        const springStrength = 0.01;  // Spring constant
        const springX = distanceX * springStrength;  // x component of spring force
        const springY = distanceY * springStrength;  // y 

        this.acceleration.x += springX;  // Add spring force to acceleration X
        this.acceleration.y += springY;  // same but Y

        this.velocity.x += this.acceleration.x;  // Update velocity with acceleration X
        this.velocity.y += this.acceleration.y;  // Y
        this.velocity.x *= this.friction;  // Apply friction to slow down in X
        this.velocity.y *= this.friction;  // Y

        // Cap speed at maximum
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);  // Calculate current speed, I pillaged this again
        if (speed > this.maxSpeed) {  // If exceeding max speed
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;  // bring down X velocity
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;  // Y
        }

        // Update the position with velocity and the wave movement
        this.x += this.velocity.x + waveX;  // Move in X, incrementing 
        this.y += this.velocity.y + waveY;  // Y

        this.acceleration.x = 0;  // Reset acceleration X
        this.acceleration.y = 0;  // Y
        this.gradientPosition = this.y / canvas.height;  // Update gradient position based on new Y so the colors stay consistent

        // Calculate pulse effect based on motion and brightness
        const pulseStrength = Math.max(this.motionStrength, brightness / 255 * 0.5);  // Stronger of motion or brightness effect
        if (this.attracted) {
            this.currentRadius = this.radius * (1 + pulseStrength * 0.5);  // Grow radius if attracted
        } else {
            this.currentRadius = this.radius;  // Use base radius otherwise
        }
    }

    draw() {  //render each particle
        const color = getGradientColor(this.gradientPosition);  // Get color
        const gradient = ctx.createRadialGradient(  // Create radial gradient for each particle
            this.x, this.y, 0,  // Inner circle at particle center
            this.x, this.y, this.currentRadius || this.radius  // Outer circle at particle radius
        );

        const rgb = color.match(/\d+/g);  // Extract RGB values from color string
        if (!rgb || rgb.length < 3) return;  // Safety check, do we need this? idk, i'm not touching it

        // Calculate final opacity based on attraction and base opacity
        const finalOpacity = this.attracted ?
            Math.min(1, this.baseOpacity + this.motionStrength * 0.4) :  // Increase opacity when mothion is detected 
            this.baseOpacity;  // Use base opacity otherwise

        // Set blending mode to make overlapping particles brighter
        ctx.globalCompositeOperation = 'lighter';  // Additive blending for white glow effect 

        // Define the gradient colors from center to edge of each individual circle
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity})`);  // Center color
        gradient.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity * 0.6})`);  // Middle color
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);  // Edge color (transparent, fade out)

        ctx.fillStyle = gradient;  // Set fill style to our gradient
        ctx.beginPath();  // Start a new path
        ctx.arc(this.x, this.y, this.currentRadius || this.radius, 0, Math.PI * 2);  // Draw circle
        ctx.fill();  // Fill the circle

        // Reset blending mode for other rendering
        ctx.globalCompositeOperation = 'source-over';  // Back to default
    }
}

function getGradientColor(position) {  //Get color based on vertical position for the gradient
    position = Math.max(0, Math.min(1, position));  // Clamp position between 0 and 1

    // Convert hex colors from the other script to RGB components, idk why i did this, i should have just used hex smh
    // Inside color: 0xff6030 (orange)
    const insideR = 255;  // Red component of inside color
    const insideG = 66;   // Green
    const insideB = 48;   // Blue

    // Outside color: 0x1b3984 (blue)
    const outsideR = 27;  // Red component of outside color
    const outsideG = 57;  // Green
    const outsideB = 132; // Blue 

    // Linear progression between the two colors based on position
    const r = Math.floor(insideR + position * (outsideR - insideR));  // Calculate red
    const g = Math.floor(insideG + position * (outsideG - insideG));  // Green
    const b = Math.floor(insideB + position * (outsideB - insideB));  // Blue

    return `rgb(${r}, ${g}, ${b})`;  // Return as RGB string to use
}

function createParticles() {  // Initialize particle grid
    particles = [];  // Clear existing particles if any
    const spacingX = canvas.width / cols;  // X spacing between particles
    const spacingY = canvas.height / rows;  // Y

    // Loop through grid to create particles
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const particle = new Particle(
                x * spacingX + spacingX / 2,  // X position (centered in grid cell, symmetric)
                y * spacingY + spacingY / 2   // Y
            );
            particles.push(particle);  // Add to the array
        }
    }
}

function getBrightness(x, y, imageData) {  // Get brightness at pixel coordinates, using brightness as the defining element of motion
    x = Math.max(0, Math.min(x, imageData.width - 1));  // Constrain X to the image bounds
    y = Math.max(0, Math.min(y, imageData.height - 1));  // Constrain Y
    let index = (y * imageData.width + x) * 4;  // Calculate position in data array (RGBA = 4 values per pixel)
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;  // Average? there's probably a better way 
}

function detectMotion(currentFrame) {  // Detect motion between frames
    if (!prevFrame || !currentFrame) {  // Safety check
        prevFrame = currentFrame;  // Store current frame for next comparison
        return null;  // Return null if no motion can be detected yet
    }

    // Create empty image data for motion frame, i'm tired of commenting...why didn't I do this earlier
    const motionData = motionCtx.createImageData(currentFrame.width, currentFrame.height);

    // Compare each pixel
    for (let i = 0; i < currentFrame.data.length; i += 4) {  // Loop through pixels (4 values per pixel)
        const rDiff = Math.abs(currentFrame.data[i] - prevFrame.data[i]);  // Difference in Red
        const gDiff = Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]);  // Green
        const bDiff = Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);  // Blue

        const motionIntensity = (rDiff + gDiff + bDiff) / 3;  // Average color difference
        const threshold = 10;  // Minimum difference to consider it moving, adjust as needed if it is detecting background stuff
        const finalIntensity = motionIntensity > threshold ? motionIntensity * 2 : 0;  // Amplify motion above threshold

        // Set motion pixel color (white with varying intensity)
        motionData.data[i] = finalIntensity;      // Red
        motionData.data[i + 1] = finalIntensity;  // Green
        motionData.data[i + 2] = finalIntensity;  // Blue
        motionData.data[i + 3] = 255;             // Opaque, white
    }

    motionCtx.putImageData(motionData, 0, 0);  // Write motion data to its canvas
    prevFrame = currentFrame;  // Update previous frame
    return motionData;
}

function processWebcamData() {  // Process webcam feed
    if (videoStream && videoStream.readyState >= 2) {  // Check if camera is ready
        offscreenCanvas.width = cols;  // Set offscreen canvas width to match the grid
        offscreenCanvas.height = rows;  // Height
        // Flip the camera horizontally by using a transform to fix mirroring issue from feedback
        offscreenCtx.save();
        offscreenCtx.scale(-1, 1); // Flip horizontally
        // Draw webcam to offscreen canvas
        offscreenCtx.drawImage(videoStream, -offscreenCanvas.width, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.restore();
        const currentFrame = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);  // Get pixel data
        const motionFrame = detectMotion(currentFrame);  // Detect motion
        return { current: currentFrame, motion: motionFrame };  // Return both frames
    }
    return null;  // Return null if webcam not ready
}

function resizeCanvas() {  // Function to handle window resize to fix responsive design across devices
    canvas.width = window.innerWidth;   // Set canvas width to window width
    canvas.height = window.innerHeight;  // Set canvas height to window height
    motionCanvas.width = cols;   // Set motion canvas width to grid width
    motionCanvas.height = rows;  // Set motion canvas height to grid height
    createParticles();  // Recreate particles for new dimensions
}

async function loadHandPoseModel() {  // Load TensorFlow hand tracking model for navigation
    try {
        // Load TensorFlow.js if not already loaded, just in case
        if (typeof tf === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
                script.onload = resolve;  // Resolve promise when loaded
                document.head.appendChild(script);
            });
        }

        // Load handpose model if not already loaded
        if (typeof handpose === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        loadingIndicator.textContent = 'Loading model...';  // Update loading text
        model = await handpose.load();  // Load the handpose model

        await warmUpModel();  // Warm up model with test prediction

        loadingIndicator.textContent = 'Hand tracking ready!';  // Update text, should we remove the text altogether in the UI?
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);  // Hide indicator after 2 seconds
        return model;  // Return the loaded model
    } catch (error) {
        console.error('Handpose loading failed:', error);  // Log error
        loadingIndicator.textContent = 'Hand tracking not available';  // Update text
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);  // Hide indicator 
        return null;  // Return null on failure
    }
}

async function warmUpModel() {  // Function to initialize model with a test run
    const canvas = document.createElement('canvas');  // test canvas
    canvas.width = 128;  // Set width
    canvas.height = 128;  // Height
    const ctx = canvas.getContext('2d');  // Get context
    ctx.fillStyle = 'rgb(100,100,100)';  // Set fill color, random idk it doesn't matter
    ctx.fillRect(0, 0, canvas.width, canvas.height); // fill
    await model.estimateHands(canvas);  // Run test prediction
}

//All the hand detection stuff, taken from other scripts

function isOpenHand(landmarks) {  // Function to detect open palm, taken from other script
    const thumbTip = landmarks[4];   // Thumb tip coordinates
    const indexTip = landmarks[8];   // Index finger tip coordinates
    const middleTip = landmarks[12];  // Middle finger tip coordinates
    const ringTip = landmarks[16];    // Ring finger tip coordinates
    const pinkyTip = landmarks[20];   // Pinky tip coordinates
    const wrist = landmarks[0];       // Wrist coordinates

    // Calculate distance from each fingertip to wrist
    const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);  // Thumb distance
    const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);  // Index distance
    const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);  // Middle distance
    const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);  // Ring distance
    const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);  // Pinky distance

    const openThreshold = 100;  // Threshold for considering a finger extended, adjust if the detection gives us trouble in the demo
    const extendedFingers = [  // Count extended fingers
        thumbDistance > openThreshold,
        indexDistance > openThreshold,
        middleDistance > openThreshold,
        ringDistance > openThreshold,
        pinkyDistance > openThreshold,
    ].filter(Boolean).length;  // Count true values

    return extendedFingers >= 3;  // Consider open if at least 3 fingers extended
}

function isClosedHand(landmarks) {  // Function to detect closed hand gesture
    const thumbTip = landmarks[4];    // Thumb tip coordinates
    const indexTip = landmarks[8];    // Index finger tip coordinates
    const middleTip = landmarks[12];  // Middle finger tip coordinates
    const ringTip = landmarks[16];    // Ring finger tip coordinates
    const pinkyTip = landmarks[20];   // Pinky tip coordinates

    // Calculate distances between adjacent fingers
    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);  // Thumb to index
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);  // Index to middle
    const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);  // Middle to ring
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);  // Ring to pinky

    // All fingertips close together indicates closed hand, tell users to spread fingers plzzzzzzzzzzzzzz
    return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && middleRingDistance < 30 && ringPinkyDistance < 30);
}

async function detectGestures() {  // Function to detect hand gestures from webcam
    if (!model) return;  // Exit if model doesn't loaded

    const predictions = await model.estimateHands(videoStream);  // Get hand predictions

    let currentGestureState = null;  // Initialize with no hand detected

    if (predictions.length > 0) {  // If hands detected
        // Check for open or closed hand gestures
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));  // Check for open hand
        const atLeastOneClosed = predictions.some(prediction => isClosedHand(prediction.landmarks));  // Check for closed hand

        if (atLeastOneOpen) {
            currentGestureState = 'open';  // Set state to open
        } else if (atLeastOneClosed) {
            currentGestureState = 'closed';  //closed
        }
    } else {
        currentGestureState = 'none';  // No hands detected
    }

    if (currentGestureState !== lastGestureState) {  // If gesture changed
        clearTimeout(openHandTimer);  // Clear open hand timer, reset
        clearTimeout(noHandsTimer);   // Clear no hands timer

        if (currentGestureState === 'open') {  // If open hand
            console.log('Open palm detected - starting 5 second timer');  // Log detection, shuld we put this on screen??
            openHandTimer = setTimeout(() => {  // Start timer
                const pages = ['blackHole.html', 'planets.html'];  // Possible redirects, random
                const randomPage = pages[Math.floor(Math.random() * pages.length)];  // Pick random page
                window.location.href = randomPage;  // Redirect after timeout
            }, OPEN_HAND_DURATION);
        }
        else if (currentGestureState === 'closed') {  // If closed hand
            console.log('Closed palm detected - starting 5 second timer');  // Log 
            openHandTimer = setTimeout(() => {  // Start timer
                window.location.href = 'index.html';  // Redirect to menu after timeout
            }, OPEN_HAND_DURATION);
        }
        else if (currentGestureState === 'none') {  // If no hands
            console.log('No hands detected - starting 1 minute timer');  // Log detection
            noHandsTimer = setTimeout(() => {  // Start timer
                window.location.href = 'index.html';  // Redirect to menu after timeout
            }, NO_HANDS_DURATION);
        }

        lastGestureState = currentGestureState;  // Update last gesture state
    }
}

function initWebcam() {  // Initialize webcam
    navigator.mediaDevices.getUserMedia({  // Request webcam access from person
        video: {
            width: { ideal: 1280 },  // Preferred width
            height: { ideal: 720 }   // Preferred height
        }
    })
        .then(stream => {  // On success
            videoStream = document.createElement("video");  // Create video element
            videoStream.srcObject = stream;  // Set source to webcam stream
            videoStream.play();  // play

            loadHandPoseModel().then(() => {  // Load model
                console.log("Starting hand detection");  // Log start
                setInterval(detectGestures, 1000);  // Check for gestures every 1 second
            });
        })
        .catch(err => console.error("Webcam access denied", err));  // Log error if webcam access denied
}

function animate() {  // Animation loop function
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';  // Semi-transparent black for fade effect?
    ctx.fillRect(0, 0, canvas.width, canvas.height);  // Fill canvas with semi-transparent black, why did we do this?

    const frameData = processWebcamData();  // Process webcam data

    if (frameData) {  // If webcam data available
        const currentFrame = frameData.current;  // Current frame
        const motionFrame = frameData.motion;    // Motion frame

        particles.forEach(p => {  // Update each particle
            // Get pixel brightness at particle's grid position
            const gridX = Math.floor((p.baseX / canvas.width) * cols);  // Convert to grid X
            const gridY = Math.floor((p.baseY / canvas.height) * rows);  // Same but Y
            const brightness = getBrightness(gridX, gridY, currentFrame);  // Get brightness

            if (motionFrame) {  // If motion data available
                const motionValue = getBrightness(gridX, gridY, motionFrame);  // Get motion value
                const centerX = cols / 2;  // Grid center X
                const centerY = rows / 2;  // Y
                const forceX = (gridX - centerX) * (motionValue / 50);  // Calculate X force
                const forceY = (gridY - centerY) * (motionValue / 50);  // Y
                p.applyForce(forceX, forceY, motionValue);  // Apply force
            }

            p.update(brightness, motionFrame ? getBrightness(gridX, gridY, motionFrame) : 0);  // Update particle
            p.draw();  // Draw particle visually
        });
    } else {  // If no input
        particles.forEach(p => {  // Update each particle with default values
            p.update(100, 0);  // Update with medium brightness, no motion
            p.draw();  // particle
        });
    }

    requestAnimationFrame(animate);  // Request next animation frame
}

// Initialize and run everything
window.addEventListener("load", () => {  // When window loads
    console.log("Window loaded, initializing...");  // Log initialization
    window.addEventListener("resize", resizeCanvas);  // Add resize event listener
    resizeCanvas();  // Initial canvas resize
    initWebcam();  // Initialize webcam
    animate();  // Start animation loop
});

if (document.readyState === "complete") {  // If document already loaded
    console.log("Document already loaded, initializing immediately...");  // Log immediate initialization
    resizeCanvas();
    initWebcam();
    animate();
}