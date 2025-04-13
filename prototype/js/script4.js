// // Get the main canvas element and its 2D rendering context
// const canvas = document.getElementById("canvas");
// const ctx = canvas.getContext("2d");

// // Create an offscreen canvas and its 2D rendering context for processing the webcam feed
// const offscreenCanvas = document.createElement("canvas");
// const offscreenCtx = offscreenCanvas.getContext("2d");

// // Variables to store the webcam stream and particle array
// let videoStream;
// let particles = [];
// // Define the grid size for particles (100 columns and 50 rows)
// const cols = 100, rows = 100;

// // Load HandPose model
// let model;

// async function loadHandPoseModel() {
//     model = await handpose.load();
//     console.log('HandPose model loaded.');
// }

// // Function to check if a palm is open or closed
// function isOpenHand(landmarks) {
//     const thumbTip = landmarks[4]; // Thumb tip
//     const indexTip = landmarks[8]; // Index finger tip
//     const middleTip = landmarks[12]; // Middle finger tip
//     const ringTip = landmarks[16]; // Ring finger tip
//     const pinkyTip = landmarks[20]; // Pinky finger tip

//     // Calculate distances from fingertips to the wrist
//     const wrist = landmarks[0]; // Wrist (base of the palm)
//     const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
//     const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
//     const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
//     const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
//     const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

//     // Thresholds for open palm
//     const openThreshold = 100; // Adjust based on testing

//     // Check if most fingers are extended (open palm)
//     const extendedFingers = [
//         thumbDistance > openThreshold,
//         indexDistance > openThreshold,
//         middleDistance > openThreshold,
//         ringDistance > openThreshold,
//         pinkyDistance > openThreshold,
//     ].filter(Boolean).length;

//     // If at least 3 fingers are extended, consider the palm open
//     return extendedFingers >= 3;
// }

// function isClosedHand(landmarks) {
//     // More precise closed hand detection
//     const thumbTip = landmarks[4]; // Thumb tip
//     const indexTip = landmarks[8]; // Index finger tip
//     const middleTip = landmarks[12]; // Middle finger tip
//     const ringTip = landmarks[16]; // Ring finger tip
//     const pinkyTip = landmarks[20]; // Pinky tip

//     // Measure distances between fingertips and palm
//     const palmBase = landmarks[0]; // Palm base

//     // Check distances between thumb and index, and ensure other fingers are also closed
//     const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
//     const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
//     const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);
//     const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);

//     // All fingers should be close together for a proper fist
//     return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && middleRingDistance < 30 && ringPinkyDistance < 30);
// }


// // Function to detect hands and gestures
// async function detectGestures() {
//     if (!model) return;

//     // Get hand predictions
//     const predictions = await model.estimateHands(videoStream);
//     if (predictions.length > 0) {
//         // Check if at least one hand has an open palm
//         const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));
//         const atLeastOneClosed = predictions.some(prediction => isClosedHand(prediction.landmarks));

//         if (atLeastOneOpen) {
//             console.log('At Least One Open Palm Detected');
//             // Randomly navigate to one of the pages after 3 seconds
//             setTimeout(() => {
//                 const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
//                 const randomPage = pages[Math.floor(Math.random() * pages.length)];
//                 window.location.href = randomPage;
//             }, 3000);
//         } else if (atLeastOneClosed) {
//             setTimeout(() => {
//                 window.location.href = 'index.html';
//             }, 3000);
//         }
//         else {
//             console.log('Both Hands Closed: Waiting 10 Seconds...');
//             // Navigate to index.html after 10 seconds
//             setTimeout(() => {
//                 window.location.href = 'prototype/index.html';
//             }, 10000);
//         }
//     }
// }

// /**
//  * Function to resize the canvas to fit the window and regenerate particles
//  */
// function resizeCanvas() {
//     canvas.width = window.innerWidth;  // Set canvas width to window width
//     canvas.height = window.innerHeight;  // Set canvas height to window height
//     createParticles();  // Recreate particles to fit the new canvas size
// }

// /**
//  * Function to initialize the webcam
//  */
// function initWebcam() {
//     // Request access to the user's webcam
//     navigator.mediaDevices.getUserMedia({ video: true })
//         .then(stream => {
//             // Create a video element to stream the webcam feed
//             videoStream = document.createElement("video");
//             videoStream.srcObject = stream;  // Set the video source to the webcam stream
//             videoStream.play();  // Start playing the video

//             // Load HandPose model after webcam starts
//             loadHandPoseModel().then(() => {
//                 // Add a 1-minute delay before starting gesture detection
//                /** setTimeout(() => {
//                     console.log("Hand detection is now active!"); */
//                     // Start detecting gestures every second after the delay
//                     setInterval(detectGestures, 1000);
//                // }, 60000); // 60,000 milliseconds = 1 minute
//             });
//         })
//         .catch(err => console.error("Webcam access denied", err));  // Log errors if webcam access is denied
// }

// /**
//  * Particle class to define the behavior and appearance of each particle
//  */
// class Particle {
//     constructor(x, y) {
//         this.baseX = x;  // Original x position
//         this.baseY = y;  // Original y position
//         this.x = x;  // Current x position
//         this.y = y;  // Current y position
//         this.waveOffset = Math.random() * Math.PI * 2;  // Random offset for wave-like motion
//         this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;  // Random HSL color
//     }

//     /**
//      * Update the particle's position based on brightness
//      */
//     update(brightness) {
//         // Calculate distortion based on brightness (brighter areas cause more movement)
//         let distortion = (brightness / 255) * 30;
//         // Update x and y positions with wave-like motion and distortion
//         this.x = this.baseX + Math.sin(this.waveOffset + performance.now() * 0.002) * 20 + distortion;
//         this.y = this.baseY + Math.cos(this.waveOffset + performance.now() * 0.002) * 10 - distortion;
//         this.waveOffset += 0.01;  // Increment wave offset for smooth animation
//     }

//     /**
//      * Draw the particle on the canvas
//      */
//     draw() {
//         ctx.fillStyle = this.color;  // Set particle color
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);  // Draw particle as a circle
//         ctx.fill();
//     }
// }

// /**
//  * Function to create a grid of particles
//  */
// function createParticles() {
//     particles = [];  // Clear existing particles
//     // Calculate spacing between particles based on canvas size and grid dimensions
//     const spacingX = canvas.width / cols;
//     const spacingY = canvas.height / rows;
//     // Loop through rows and columns to create particles
//     for (let y = 0; y < rows; y++) {
//         for (let x = 0; x < cols; x++) {
//             particles.push(new Particle(x * spacingX, y * spacingY));  // Add new particle to the array
//         }
//     }
// }

// /**
//  * Function to calculate the brightness of a pixel at (x, y) in the webcam feed
//  */
// function getBrightness(x, y, imageData) {
//     // Calculate the index of the pixel in the image data array
//     let index = (y * imageData.width + x) * 4;
//     // Return the average of the red, green, and blue channels as brightness
//     return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
// }

// /**
//  * Function to process the webcam feed and return pixel data
//  */
// function processWebcamData() {
//     // Check if the webcam stream is ready
//     if (videoStream && videoStream.readyState >= 2) {
//         // Set offscreen canvas size to a lower resolution for performance
//         offscreenCanvas.width = 100;
//         offscreenCanvas.height = 50;
//         // Draw the webcam feed onto the offscreen canvas
//         offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
//         // Return the pixel data of the downsampled image
//         return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
//     }
//     return null;  // Return null if the webcam stream is not ready
// }

// /**
//  * Animation loop to update and draw particles
//  */
// function animate() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas
//     let frame = processWebcamData();  // Process the webcam feed
//     if (frame) {
//         // Loop through all particles
//         particles.forEach(p => {
//             // Map particle position to the downsampled webcam feed
//             let x = Math.floor((p.x / canvas.width) * frame.width);
//             let y = Math.floor((p.y / canvas.height) * frame.height);
//             // Get the brightness of the corresponding pixel
//             let brightness = getBrightness(x, y, frame);
//             p.update(brightness);  // Update particle position based on brightness
//             p.draw();  // Draw the particle
//         });
//     }
//     requestAnimationFrame(animate);  // Request the next animation frame
// }

// // Add event listener to resize the canvas when the window is resized
// window.addEventListener("resize", resizeCanvas);

// // Initialize the canvas, webcam, and start the animation loop
// resizeCanvas();
// initWebcam();
// animate();







// Get main canvas element + 2D rendering context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Create an offscreen canvas and its 2D rendering context for processing the webcam feed
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

// Create another canvas for motion detection
const motionCanvas = document.createElement("canvas");
const motionCtx = motionCanvas.getContext("2d");

// Variables to store the webcam stream and particle array
let videoStream;
let particles = [];
// Define the grid size for particles
const cols = 60, rows = 60; // CHANGE DENSITY AS NEEDED!!!!

// Store previous frame for motion detection
let prevFrame = null;

// Load HandPose model
//var
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
    const openThreshold = 100; // ADJUST BASED ON DEVICE!!!!

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
                const pages = ['particle6.html', 'particle4.html', 'particle3.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000);
        } else if (atLeastOneClosed) {
            //if fist, then go back to the homepage, 3 second delay again
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
        else {
            console.log('Both Hands Closed: Waiting 10 Seconds...');
            // Navigate to index.html after 3 minutes
            setTimeout(() => {
                window.location.href = 'prototype/index.html';
            }, 180000);
        }
    }
}

/**
 * Function to resize the canvas to fit the window and regenerate particles
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;  // Set canvas width to window width
    canvas.height = window.innerHeight;  // Set canvas height to window height
    // same thing for motion detection canvas
    motionCanvas.width = cols;
    motionCanvas.height = rows;

    createParticles();  // Recreate particles to fit the new size
}

/**
 * Function to initialize the webcam
 */
function initWebcam() {
    // Request access to the user's webcam
    navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    })
    .then(stream => {
        // Create a video element to stream the feed
        videoStream = document.createElement("video");
        videoStream.srcObject = stream;
        videoStream.play();

        // Load HandPose model after webcam starts
        loadHandPoseModel().then(() => {
            console.log("Hand detection will activate in 1 minute...");
            
            // Countdown in console
            let secondsLeft = 60;
            const countdown = setInterval(() => {
                secondsLeft--;
                if (secondsLeft > 0) {
                    console.log(`Starting hand detection in ${secondsLeft} seconds...`);
                } else {
                    clearInterval(countdown);
                    console.log("Hand detection is now active!");
                    // Start detecting gestures every second
                    setInterval(detectGestures, 1000);
                }
            }, 1000);
        });
    })
    .catch(err => console.error("Webcam access denied", err));
}

/**
 * Function to interpolate between two colors based on a gradient position
 * @param {number} position - Position in the gradient (0 to 1)
 * @returns {string} - RGB color string
 */
function getGradientColor(position) {
    // Ensure position is between 0 and 1
    position = Math.max(0, Math.min(1, position));

    // Orange RGB (255, 165, 0) to Blue RGB (0, 0, 255)
    const r = Math.floor(255 - position * 255);
    const g = Math.floor(165 - position * 165);
    const b = Math.floor(position * 255);

    return `rgb(${r}, ${g}, ${b})`;
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

        // Determine gradient position based on y position (top to bottom, orange to blue)
        this.gradientPosition = y / canvas.height;

        // Assign three sizes randomly
        const sizeCategory = Math.floor(Math.random() * 3);
        if (sizeCategory === 0) {
            this.radius = 3; // Small
        } else if (sizeCategory === 1) {
            this.radius = 6; // Medium
        } else {
            this.radius = 9; // Big boy
        }

        // Base opacity
        this.baseOpacity = 0.6 + Math.random() * 0.4; // Between 0.6 and 1.0

        // Properties for move response
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.mass = this.radius; // Big bois have more mass
        this.friction = 0.92; // Friction to gradually slow down particles
        this.maxSpeed = 15; // Max speed limit
        this.attracted = false; // track if particle is affected
        this.motionStrength = 0; // How much ia this particle is affected
    }

    /**
     * Apply force yeeeeeeee
     */
    applyForce(forceX, forceY, motionValue) {
        // Small particles move more
        const fx = forceX / this.mass;
        const fy = forceY / this.mass;

        // Apply the force to acceleration
        this.acceleration.x += fx;
        this.acceleration.y += fy;

        // Track motion strength for effect
        this.motionStrength = Math.min(1, motionValue / 100);

        // Flag as attracted if motion is detected
        this.attracted = motionValue > 10;
    }

    /**
     * Update the particle's position based on motion and brightness
     */
    update(brightness, motionValue) {
        // Apply subtle wave movement all the time, similar to original Hubert code
        const waveStrength = 0.5;
        const waveX = Math.sin(this.waveOffset + performance.now() * 0.001) * waveStrength;
        const waveY = Math.cos(this.waveOffset + performance.now() * 0.001) * waveStrength;
        this.waveOffset += 0.01;

        // Calculate force towards original position (stronger when far from base)
        const distanceX = this.baseX - this.x;
        const distanceY = this.baseY - this.y;
        const springStrength = 0.01;
        const springX = distanceX * springStrength;
        const springY = distanceY * springStrength;

        // Apply spring force to gradually return to original position, idk i stole all this
        this.acceleration.x += springX;
        this.acceleration.y += springY;

        // Update velocity with acceleration and friction I think
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // constrain max speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }

        // Update position
        this.x += this.velocity.x + waveX;
        this.y += this.velocity.y + waveY;

        // Reset acceleration for next frame
        this.acceleration.x = 0;
        this.acceleration.y = 0;

        // Update gradient position based on current y position
        this.gradientPosition = this.y / canvas.height;

        // Size pulsing effect based on motion and brightness again
        const pulseStrength = Math.max(this.motionStrength, brightness / 255 * 0.5);
        if (this.attracted) {
            this.currentRadius = this.radius * (1 + pulseStrength * 0.5);
        } else {
            this.currentRadius = this.radius;
        }
    }

    /**
     * Draw the particle on the canvas with the opacity gradient
     */
    draw() {
        // Get the current color based on position
        const color = getGradientColor(this.gradientPosition);

        // Create gradient
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentRadius || this.radius
        );

        // Extract RGB values from the color string
        const rgb = color.match(/\d+/g); //???????
        if (!rgb || rgb.length < 3) return; // Safety check

        // Calculate final opacity based on where it is in the motion path
        const finalOpacity = this.attracted ?
            Math.min(1, this.baseOpacity + this.motionStrength * 0.4) :
            this.baseOpacity;

        // Add color stops with decreasing opacity towards the edge, glow effect
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity})`);
        gradient.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

        // Draw the particle with the gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius || this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Function to create a grid of particles
 */
function createParticles() {
    particles = [];  // Clear existing particles

    // Calculate spacing
    const spacingX = canvas.width / cols;
    const spacingY = canvas.height / rows;

    // Loop through rows and columns to create particles, PLZ WORK ISTG 
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const particle = new Particle(
                x * spacingX + spacingX / 2,
                y * spacingY + spacingY / 2
            );
            particles.push(particle);
        }
    }
}

/**
 * Function to calculate the brightness 
 */
function getBrightness(x, y, imageData) {
    // Ensure x and y are within bounds
    x = Math.max(0, Math.min(x, imageData.width - 1));
    y = Math.max(0, Math.min(y, imageData.height - 1));

    // Calculate the index
    let index = (y * imageData.width + x) * 4;
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
}

/**
 * Detect motion between current and previous frame
 * @returns {ImageData} Motion data where brighter pixels indicate more movement
 */
function detectMotion(currentFrame) {
    if (!prevFrame || !currentFrame) {
        // If this is the first frame, save it
        prevFrame = currentFrame;
        return null;
    }

    // Create new ImageData for the motion result from the webcam
    const motionData = motionCtx.createImageData(currentFrame.width, currentFrame.height);

    // Compare each pixel between frames to detect motion
    for (let i = 0; i < currentFrame.data.length; i += 4) {
        const rDiff = Math.abs(currentFrame.data[i] - prevFrame.data[i]);
        const gDiff = Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]);
        const bDiff = Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);

        // Calculate motion intensity 
        const motionIntensity = (rDiff + gDiff + bDiff) / 3;

        // Apply threshold to reduce noise, increase for less sensitivity
        const threshold = 10;
        const finalIntensity = motionIntensity > threshold ? motionIntensity * 2 : 0;

        // Set all channels to the motion intensity value
        motionData.data[i] = finalIntensity;     // R
        motionData.data[i + 1] = finalIntensity; // G
        motionData.data[i + 2] = finalIntensity; // B
        motionData.data[i + 3] = 255;           // opaque
    }

    // Draw motion data to the motion canvas, DEBUGGING!!!
    motionCtx.putImageData(motionData, 0, 0);

    // Update previous frame for next comparing round
    prevFrame = currentFrame;

    return motionData;
}

/**
 * Function to process the webcam feed
 */
function processWebcamData() {
    if (videoStream && videoStream.readyState >= 2) {
        // Set offscreen canvas size to matchthe particle grid
        offscreenCanvas.width = cols;
        offscreenCanvas.height = rows;

        // Draw the webcam feed on the offscreen canvas
        offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Get the data
        const currentFrame = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Detect motion between frames
        const motionFrame = detectMotion(currentFrame);

        return {
            current: currentFrame,
            motion: motionFrame
        };
    }
    return null;  // if the webcam stream is not ready
}

/**
 * Animation loop to update and draw particles
 */
function animate() {
    // Clear the canvas with a very slight transparency for trail effect thingy
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // More transparency for longer trails
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Process the webcam feed
    const frameData = processWebcamData();

    // If we have video data, update and draw particles
    if (frameData) {
        const currentFrame = frameData.current;
        const motionFrame = frameData.motion;

        // Loop
        particles.forEach(p => {
            // Calculate position for given particle
            const gridX = Math.floor((p.baseX / canvas.width) * cols);
            const gridY = Math.floor((p.baseY / canvas.height) * rows);

            // Get the brightness of the corresponding pixel
            const brightness = getBrightness(gridX, gridY, currentFrame);

            // If we have motion data, apply forces needed
            if (motionFrame) {
                const motionValue = getBrightness(gridX, gridY, motionFrame);

                // Calculate force direction
                // This creates a "repulsion" effect where particles move away from motion
                const centerX = cols / 2;
                const centerY = rows / 2;
                const forceX = (gridX - centerX) * (motionValue / 50);
                const forceY = (gridY - centerY) * (motionValue / 50);

                // Apply the force
                p.applyForce(forceX, forceY, motionValue);
            }

            // Update and draw the particle
            p.update(brightness, motionFrame ? getBrightness(gridX, gridY, motionFrame) : 0);
            p.draw();
        });
    } else {
        // If no video data, just update and draw particles with default values
        particles.forEach(p => {
            p.update(100, 0);
            p.draw();
        });
    }

    // Request the next animation frame
    requestAnimationFrame(animate);
}

// Initialize everything
window.addEventListener("load", () => {
    console.log("Window loaded, initializing...");

    // Add event listener to resize the canvas when the window is resized
    window.addEventListener("resize", resizeCanvas);

    // Initialize the canvas, webcam, and start the animation loop
    resizeCanvas();
    initWebcam();

    // Start animation after a short delay to ensure everything is set up
    setTimeout(() => {
        console.log("Starting animation...");
        animate();
    }, 500);
});

// Make sure the code runs even if the load event already fired
if (document.readyState === "complete") {
    console.log("Document already loaded, initializing immediately...");
    resizeCanvas();
    initWebcam();
    animate();
}
