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

// Function to detect hands and gestures
async function detectGestures() {
    if (!model) return;

    // Get hand predictions
    const predictions = await model.estimateHands(videoStream);
    if (predictions.length > 0) {
        // Check if at least one hand has an open palm
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

        if (atLeastOneOpen) {
            console.log('At Least One Open Palm Detected');
            // Randomly navigate to one of the pages after 3 seconds
            setTimeout(() => {
                const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000);
        } else {
            console.log('Both Hands Closed: Waiting 10 Seconds...');
            // Navigate to index.html after 10 seconds
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
                // Start detecting gestures
                setInterval(detectGestures, 1000); // Check for gestures every second
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

// // Get the main canvas element and its 2D rendering context
// const canvas = document.getElementById("canvas");
// const ctx = canvas.getContext("2d");

// // Create an offscreen canvas and its 2D rendering context for processing the webcam feed
// const offscreenCanvas = document.createElement("canvas");
// const offscreenCtx = offscreenCanvas.getContext("2d");

// // Variables to store the webcam stream and particle array
// let videoStream;
// let particles = [];
// // Define the grid size for particles
// const cols = 200, rows = 100; // Increased density

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

// // Function to detect hands and gestures
// async function detectGestures() {
//     if (!model) return;

//     // Get hand predictions
//     const predictions = await model.estimateHands(videoStream);
//     if (predictions.length > 0) {
//         // Check if at least one hand has an open palm
//         const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

//         if (atLeastOneOpen) {
//             console.log('At Least One Open Palm Detected');
//             // Randomly navigate to one of the pages after 3 seconds
//             setTimeout(() => {
//                 const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
//                 const randomPage = pages[Math.floor(Math.random() * pages.length)];
//                 window.location.href = randomPage;
//             }, 3000);
//         } else {
//             console.log('Both Hands Closed: Waiting 10 Seconds...');
//             // Navigate to index.html after 10 seconds
//             setTimeout(() => {
//                 window.location.href = 'index.html';
//             }, 10000);
//         }
//     } else {
//         console.log('No Hands Detected');
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
//                 // Start detecting gestures
//                 setInterval(detectGestures, 1000); // Check for gestures every second
//             });
//         })
//         .catch(err => console.error("Webcam access denied", err));  // Log errors if webcam access is denied
// }

// /**
//  * Enhanced Particle class with glow and size variations
//  */
// class Particle {
//     constructor(x, y) {
//         this.baseX = x;  // Original x position
//         this.baseY = y;  // Original y position
//         this.x = x;  // Current x position
//         this.y = y;  // Current y position
//         this.waveOffset = Math.random() * Math.PI * 2;  // Random offset for wave-like motion

//         // Random size for variety (smaller particles are more numerous)
//         this.sizeMultiplier = Math.random();
//         this.size = this.sizeMultiplier < 0.7 ?
//             Math.random() * 3 + 1 : // 70% small particles
//             Math.random() * 8 + 4;  // 30% larger particles

//         // Slightly varied blue shades
//         const blueHue = 190 + Math.random() * 30; // Range from 190-220 (blue spectrum)
//         const saturation = 70 + Math.random() * 30; // Varied saturation
//         const lightness = 60 + Math.random() * 20; // Varied lightness
//         this.color = `hsl(${blueHue}, ${saturation}%, ${lightness}%)`;

//         // Opacity variation for depth effect
//         this.baseOpacity = 0.2 + Math.random() * 0.8;
//         this.opacity = this.baseOpacity;

//         // Movement speed variation
//         this.speedFactor = 0.001 + Math.random() * 0.002;

//         // Added z-index simulation for parallax effect
//         this.z = Math.random() * 10;
//     }

//     /**
//      * Update the particle's position and appearance based on brightness
//      */
//     update(brightness) {
//         // Calculate distortion based on brightness (brighter areas cause more movement)
//         let distortion = (brightness / 255) * 20;

//         // Wave motion with varying amplitudes
//         const timeNow = performance.now() * this.speedFactor;
//         const waveX = Math.sin(this.waveOffset + timeNow) * (10 + this.z * 2);
//         const waveY = Math.cos(this.waveOffset + timeNow * 1.5) * (5 + this.z);

//         // Update positions with z-based parallax effect
//         this.x = this.baseX + waveX + distortion * (1 + this.z * 0.1);
//         this.y = this.baseY + waveY - distortion * (1 + this.z * 0.05);

//         // Pulsating size and opacity for glow effect
//         const pulseFactor = (Math.sin(timeNow * 2) + 1) * 0.15;
//         this.opacity = this.baseOpacity * (0.85 + pulseFactor);

//         // Increment wave offset for continuous animation
//         this.waveOffset += 0.003;
//     }

//     /**
//      * Draw the particle with glow effect
//      */
//     draw() {
//         // Create glow effect
//         ctx.save();
//         ctx.globalAlpha = this.opacity * 0.5;

//         // Outer glow
//         const gradient = ctx.createRadialGradient(
//             this.x, this.y, this.size * 0.2,
//             this.x, this.y, this.size * 2.5
//         );
//         gradient.addColorStop(0, this.color);
//         gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

//         ctx.fillStyle = gradient;
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.restore();

//         // Core of the particle
//         ctx.globalAlpha = this.opacity;
//         ctx.fillStyle = this.color;
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
//         ctx.fill();

//         // Highlight/sparkle in the center for some particles
//         if (this.size > 4) {
//             ctx.globalAlpha = this.opacity * 0.8;
//             ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
//             ctx.beginPath();
//             ctx.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
//             ctx.fill();
//         }

//         ctx.globalAlpha = 1; // Reset alpha
//     }
// }

// /**
//  * Function to create particles with a balanced distribution
//  */
// function createParticles() {
//     particles = [];  // Clear existing particles

//     // Calculate spacing between particles based on canvas size and grid dimensions
//     const spacingX = canvas.width / cols;
//     const spacingY = canvas.height / rows;

//     // Create a grid of particles with some random offset
//     for (let y = 0; y < rows; y++) {
//         for (let x = 0; x < cols; x++) {
//             // Add random offset to position
//             const offsetX = (Math.random() - 0.5) * spacingX * 0.8;
//             const offsetY = (Math.random() - 0.5) * spacingY * 0.8;

//             // Only add particles with 80% probability for more organic look
//             if (Math.random() < 0.8) {
//                 particles.push(new Particle(
//                     x * spacingX + offsetX,
//                     y * spacingY + offsetY
//                 ));
//             }
//         }
//     }

//     // Add some extra random particles for more natural distribution
//     const extraParticles = Math.floor(rows * cols * 0.1); // 10% extra
//     for (let i = 0; i < extraParticles; i++) {
//         particles.push(new Particle(
//             Math.random() * canvas.width,
//             Math.random() * canvas.height
//         ));
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
//     // Clear the canvas with a dark transparent overlay for motion blur effect
//     ctx.fillStyle = "rgba(10, 10, 20, 0.2)";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     // Process the webcam feed
//     let frame = processWebcamData();

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
//     } else {
//         // If no webcam data, just animate the particles with default values
//         particles.forEach(p => {
//             p.update(128);  // Medium brightness
//             p.draw();
//         });
//     }

//     requestAnimationFrame(animate);  // Request the next animation frame
// }

// // Set the initial background to dark
// document.body.style.backgroundColor = "#0a0a14";
// canvas.style.background = "linear-gradient(to bottom, #0a0a14, #121236)";

// // Add event listener to resize the canvas when the window is resized
// window.addEventListener("resize", resizeCanvas);

// // Initialize the canvas, webcam, and start the animation loop
// resizeCanvas();
// initWebcam();
// animate();




// // Get the main canvas element and its 2D rendering context
// const canvas = document.getElementById("canvas");
// const ctx = canvas.getContext("2d");

// // Create an offscreen canvas and its 2D rendering context for processing the webcam feed
// const offscreenCanvas = document.createElement("canvas");
// const offscreenCtx = offscreenCanvas.getContext("2d");

// // Variables to store the webcam stream and particle array
// let videoStream;
// let particles = [];
// // Define the grid size for particles (more particles for smoother waves)
// const cols = 50, rows = 50;

// // Wave parameters
// const waveCount = 5;  // Number of waves
// const waveColors = [
//     { h: 190, s: 100, l: 60 },  // Blue like Image 1
//     { h: 320, s: 90, l: 65 }    // Pink like Image 2
// ];
// let currentColorIndex = 0;
// let colorTransitionValue = 0;

// // Load HandPose model
// let model;

// async function loadHandPoseModel() {
//     model = await handpose.load();
//     console.log('HandPose model loaded.');
// }

// // Function to check if a palm is open or closed (unchanged)
// function isOpenHand(landmarks) {
//     const thumbTip = landmarks[4];
//     const indexTip = landmarks[8];
//     const middleTip = landmarks[12];
//     const ringTip = landmarks[16];
//     const pinkyTip = landmarks[20];

//     const wrist = landmarks[0];
//     const thumbDistance = Math.hypot(thumbTip[0] - wrist[0], thumbTip[1] - wrist[1]);
//     const indexDistance = Math.hypot(indexTip[0] - wrist[0], indexTip[1] - wrist[1]);
//     const middleDistance = Math.hypot(middleTip[0] - wrist[0], middleTip[1] - wrist[1]);
//     const ringDistance = Math.hypot(ringTip[0] - wrist[0], ringTip[1] - wrist[1]);
//     const pinkyDistance = Math.hypot(pinkyTip[0] - wrist[0], pinkyTip[1] - wrist[1]);

//     const openThreshold = 100;

//     const extendedFingers = [
//         thumbDistance > openThreshold,
//         indexDistance > openThreshold,
//         middleDistance > openThreshold,
//         ringDistance > openThreshold,
//         pinkyDistance > openThreshold,
//     ].filter(Boolean).length;

//     return extendedFingers >= 3;
// }

// // Function to detect hands and gestures (unchanged)
// async function detectGestures() {
//     if (!model) return;

//     const predictions = await model.estimateHands(videoStream);
//     if (predictions.length > 0) {
//         const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

//         if (atLeastOneOpen) {
//             console.log('At Least One Open Palm Detected');
//             setTimeout(() => {
//                 const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
//                 const randomPage = pages[Math.floor(Math.random() * pages.length)];
//                 window.location.href = randomPage;
//             }, 3000);
//         } else {
//             console.log('Both Hands Closed: Waiting 10 Seconds...');
//             setTimeout(() => {
//                 window.location.href = 'index.html';
//             }, 10000);
//         }
//     } else {
//         console.log('No Hands Detected');
//     }
// }

// /**
//  * Function to resize the canvas to fit the window and regenerate particles
//  */
// function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
//     createParticles();
// }

// /**
//  * Function to initialize the webcam (unchanged)
//  */
// function initWebcam() {
//     navigator.mediaDevices.getUserMedia({ video: true })
//         .then(stream => {
//             videoStream = document.createElement("video");
//             videoStream.srcObject = stream;
//             videoStream.play();

//             loadHandPoseModel().then(() => {
//                 setInterval(detectGestures, 1000);
//             });
//         })
//         .catch(err => console.error("Webcam access denied", err));
// }

// /**
//  * Enhanced Particle class to create wave-like formations
//  */
// class Particle {
//     constructor(x, y) {
//         this.baseX = x;
//         this.baseY = y;
//         this.x = x;
//         this.y = y;
//         // Assign each particle to a specific wave
//         this.waveGroup = Math.floor(Math.random() * waveCount);
//         this.size = Math.random() * 4 + 2; // Varied particle sizes
//         this.speed = Math.random() * 0.02 + 0.01;
//         this.brightness = 0;
//         this.alpha = 0.6 + Math.random() * 0.4; // Varied transparency
//     }

//     /**
//      * Update the particle's position to form wave patterns
//      */
//     update(brightness, time) {
//         this.brightness = brightness;

//         // Create wave patterns based on particle's wave group
//         const waveAmplitude = 40 + (brightness / 255) * 60; // Larger amplitude for brighter areas
//         const waveFrequency = 0.003 + (this.waveGroup * 0.0005); // Different frequencies for each wave
//         const wavePhase = time * 0.0005 + this.waveGroup * Math.PI / waveCount;

//         // Calculate wave position with natural flow
//         const noiseX = (Math.sin(this.baseX * 0.01 + time * 0.0002) +
//             Math.cos(this.baseY * 0.01 + time * 0.0003)) * 15;
//         const noiseY = (Math.sin(this.baseY * 0.01 + time * 0.0002) +
//             Math.cos(this.baseX * 0.01 + time * 0.0004)) * 10;

//         // Combination of wave and noise for natural flow
//         this.x = this.baseX +
//             Math.sin(this.baseY * waveFrequency + wavePhase) * waveAmplitude +
//             noiseX;
//         this.y = this.baseY +
//             Math.cos(this.baseX * waveFrequency + wavePhase) * (waveAmplitude * 0.6) +
//             noiseY;

//         // Increase size slightly in brighter areas
//         this.currentSize = this.size + (brightness / 255) * 3;
//     }

//     /**
//      * Draw the particle with enhanced visual appearance
//      */
//     draw(time) {
//         // Interpolate between two wave colors based on transition value
//         const nextColorIndex = (currentColorIndex + 1) % waveColors.length;
//         const color1 = waveColors[currentColorIndex];
//         const color2 = waveColors[nextColorIndex];

//         // Calculate interpolated color values
//         const h = color1.h + (color2.h - color1.h) * colorTransitionValue;
//         const s = color1.s + (color2.s - color1.s) * colorTransitionValue;
//         const l = color1.l + (color2.l - color1.l) * colorTransitionValue;

//         // Adjust lightness based on brightness from webcam
//         const brightnessAdjust = Math.min(30, this.brightness / 5);
//         const adjustedL = Math.min(90, l + brightnessAdjust);

//         // Set particle color with proper opacity
//         ctx.fillStyle = `hsla(${h}, ${s}%, ${adjustedL}%, ${this.alpha})`;

//         // Draw particle with glow effect
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
//         ctx.fill();

//         // Add subtle glow effect for brighter particles
//         if (this.brightness > 100) {
//             ctx.save();
//             ctx.filter = `blur(${this.currentSize * 1.5}px)`;
//             ctx.globalAlpha = this.alpha * 0.5;
//             ctx.beginPath();
//             ctx.arc(this.x, this.y, this.currentSize * 2, 0, Math.PI * 2);
//             ctx.fill();
//             ctx.restore();
//         }
//     }
// }

// /**
//  * Function to create a grid of particles
//  */
// function createParticles() {
//     particles = [];
//     // Create particles in a grid pattern
//     const spacingX = canvas.width / cols;
//     const spacingY = canvas.height / rows;

//     for (let y = 0; y < rows; y++) {
//         for (let x = 0; x < cols; x++) {
//             // Add some randomness to grid positions for more natural look
//             const randX = (x + (Math.random() * 0.8 - 0.4)) * spacingX;
//             const randY = (y + (Math.random() * 0.8 - 0.4)) * spacingY;
//             particles.push(new Particle(randX, randY));
//         }
//     }
// }

// /**
//  * Function to calculate the brightness of a pixel at (x, y) in the webcam feed (unchanged)
//  */
// function getBrightness(x, y, imageData) {
//     let index = (y * imageData.width + x) * 4;
//     return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
// }

// /**
//  * Function to process the webcam feed and return pixel data (unchanged)
//  */
// function processWebcamData() {
//     if (videoStream && videoStream.readyState >= 2) {
//         offscreenCanvas.width = cols;
//         offscreenCanvas.height = rows;
//         offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
//         return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
//     }
//     return null;
// }

// /**
//  * Enhanced animation loop to update and draw particles with wave effects
//  */
// function animate() {
//     // Get current time for animations
//     const time = performance.now();

//     // Clear canvas with a dark background
//     ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     // Gradually transition between colors
//     colorTransitionValue += 0.002;
//     if (colorTransitionValue >= 1) {
//         colorTransitionValue = 0;
//         currentColorIndex = (currentColorIndex + 1) % waveColors.length;
//     }

//     // Process webcam data
//     let frame = processWebcamData();

//     if (frame) {
//         // Sort particles by Y position for proper layering
//         particles.sort((a, b) => a.y - b.y);

//         // Update and draw all particles
//         particles.forEach(p => {
//             let x = Math.floor((p.baseX / canvas.width) * frame.width);
//             let y = Math.floor((p.baseY / canvas.height) * frame.height);
//             let brightness = getBrightness(x, y, frame);
//             p.update(brightness, time);
//             p.draw(time);
//         });
//     }

//     requestAnimationFrame(animate);
// }

// // Add event listener to resize the canvas when the window is resized
// window.addEventListener("resize", resizeCanvas);

// // Initialize the canvas, webcam, and start the animation loop
// resizeCanvas();
// initWebcam();
// animate();