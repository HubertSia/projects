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
const cols = 60, rows = 60;

// Store previous frame for motion detection
let prevFrame = null;

// Handpose model and gesture tracking variables
let model;
let openHandTimer = null;
let noHandsTimer = null;
const OPEN_HAND_DURATION = 5000; // 5 seconds for open palm
const NO_HANDS_DURATION = 60000; // 1 minute for no hands
let lastGestureState = null; // Track the last detected gesture state

// Loading indicator for handpose model
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

/**
 * Particle class to define the behavior and appearance of each particle
 */
class Particle {
        constructor(x, y) {
            this.baseX = x;
            this.baseY = y;
            this.x = x;
            this.y = y;
            this.waveOffset = Math.random() * Math.PI * 2;
            this.gradientPosition = y / canvas.height;
    
            // Assign three sizes randomly
            const sizeCategory = Math.floor(Math.random() * 3);
            if (sizeCategory === 0) {
                this.radius = 3;
            } else if (sizeCategory === 1) {
                this.radius = 6;
            } else {
                this.radius = 9;
            }
    
            this.baseOpacity = 0.6 + Math.random() * 0.4;
            this.velocity = { x: 0, y: 0 };
            this.acceleration = { x: 0, y: 0 };
            this.mass = this.radius;
            this.friction = 0.92;
            this.maxSpeed = 15;
            this.attracted = false;
            this.motionStrength = 0;
        }

    applyForce(forceX, forceY, motionValue) {
        const fx = forceX / this.mass;
        const fy = forceY / this.mass;
        this.acceleration.x += fx;
        this.acceleration.y += fy;
        this.motionStrength = Math.min(1, motionValue / 100);
        this.attracted = motionValue > 10;
    }

    update(brightness, motionValue) {
        const waveStrength = 0.5;
        const waveX = Math.sin(this.waveOffset + performance.now() * 0.001) * waveStrength;
        const waveY = Math.cos(this.waveOffset + performance.now() * 0.001) * waveStrength;
        this.waveOffset += 0.01;

        const distanceX = this.baseX - this.x;
        const distanceY = this.baseY - this.y;
        const springStrength = 0.01;
        const springX = distanceX * springStrength;
        const springY = distanceY * springStrength;

        this.acceleration.x += springX;
        this.acceleration.y += springY;

        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }

        this.x += this.velocity.x + waveX;
        this.y += this.velocity.y + waveY;

        this.acceleration.x = 0;
        this.acceleration.y = 0;
        this.gradientPosition = this.y / canvas.height;

        const pulseStrength = Math.max(this.motionStrength, brightness / 255 * 0.5);
        if (this.attracted) {
            this.currentRadius = this.radius * (1 + pulseStrength * 0.5);
        } else {
            this.currentRadius = this.radius;
        }
    }

    draw() {
        const color = getGradientColor(this.gradientPosition);
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentRadius || this.radius
        );

        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return;

        const finalOpacity = this.attracted ?
            Math.min(1, this.baseOpacity + this.motionStrength * 0.4) :
            this.baseOpacity;

        // Set the composite operation to make particles brighter when they overlap
        ctx.globalCompositeOperation = 'lighter';

        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity})`);
        gradient.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${finalOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius || this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset composite operation for other rendering
        ctx.globalCompositeOperation = 'source-over';
    }
}

function getGradientColor(position) {
    position = Math.max(0, Math.min(1, position));
    
    // Convert hex colors to RGB components
    // Inside color: 0xff6030 (orange)
    const insideR = 255;
    const insideG = 66;
    const insideB = 48;
    
    // Outside color: 0x1b3984 (blue)
    const outsideR = 27;
    const outsideG = 57;
    const outsideB = 132;
    
    // Linear interpolation between the two colors
    const r = Math.floor(insideR + position * (outsideR - insideR));
    const g = Math.floor(insideG + position * (outsideG - insideG));
    const b = Math.floor(insideB + position * (outsideB - insideB));
    
    return `rgb(${r}, ${g}, ${b})`;
}

function createParticles() {
    particles = [];
    const spacingX = canvas.width / cols;
    const spacingY = canvas.height / rows;

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

function getBrightness(x, y, imageData) {
    x = Math.max(0, Math.min(x, imageData.width - 1));
    y = Math.max(0, Math.min(y, imageData.height - 1));
    let index = (y * imageData.width + x) * 4;
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
}

function detectMotion(currentFrame) {
    if (!prevFrame || !currentFrame) {
        prevFrame = currentFrame;
        return null;
    }

    const motionData = motionCtx.createImageData(currentFrame.width, currentFrame.height);

    for (let i = 0; i < currentFrame.data.length; i += 4) {
        const rDiff = Math.abs(currentFrame.data[i] - prevFrame.data[i]);
        const gDiff = Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]);
        const bDiff = Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);

        const motionIntensity = (rDiff + gDiff + bDiff) / 3;
        const threshold = 10;
        const finalIntensity = motionIntensity > threshold ? motionIntensity * 2 : 0;

        motionData.data[i] = finalIntensity;
        motionData.data[i + 1] = finalIntensity;
        motionData.data[i + 2] = finalIntensity;
        motionData.data[i + 3] = 255;
    }

    motionCtx.putImageData(motionData, 0, 0);
    prevFrame = currentFrame;
    return motionData;
}

function processWebcamData() {
    if (videoStream && videoStream.readyState >= 2) {
        offscreenCanvas.width = cols;
        offscreenCanvas.height = rows;
        offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const currentFrame = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const motionFrame = detectMotion(currentFrame);
        return { current: currentFrame, motion: motionFrame };
    }
    return null;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    motionCanvas.width = cols;
    motionCanvas.height = rows;
    createParticles();
}

async function loadHandPoseModel() {
    try {
        if (typeof tf === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        if (typeof handpose === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        loadingIndicator.textContent = 'Loading model...';
        model = await handpose.load();
        
        await warmUpModel();
        
        loadingIndicator.textContent = 'Hand tracking ready!';
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);
        return model;
    } catch (error) {
        console.error('Handpose loading failed:', error);
        loadingIndicator.textContent = 'Hand tracking not available';
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);
        return null;
    }
}

async function warmUpModel() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await model.estimateHands(canvas);
}

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

function isClosedHand(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
    const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);

    return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && middleRingDistance < 30 && ringPinkyDistance < 30);
}

async function detectGestures() {
    if (!model) return;

    const predictions = await model.estimateHands(videoStream);
    
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
        currentGestureState = 'none';
    }

    if (currentGestureState !== lastGestureState) {
        clearTimeout(openHandTimer);
        clearTimeout(noHandsTimer);
        
        if (currentGestureState === 'open') {
            console.log('Open palm detected - starting 5 second timer');
            openHandTimer = setTimeout(() => {
                const pages = ['particle6.html', 'particle4.html', 'particle3.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
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
                window.location.href = 'prototype/index.html';
            }, NO_HANDS_DURATION);
        }
        
        lastGestureState = currentGestureState;
    }
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    })
    .then(stream => {
        videoStream = document.createElement("video");
        videoStream.srcObject = stream;
        videoStream.play();

        loadHandPoseModel().then(() => {
            console.log("Starting hand detection");
            setInterval(detectGestures, 1000);
        });
    })
    .catch(err => console.error("Webcam access denied", err));
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frameData = processWebcamData();

    if (frameData) {
        const currentFrame = frameData.current;
        const motionFrame = frameData.motion;

        particles.forEach(p => {
            const gridX = Math.floor((p.baseX / canvas.width) * cols);
            const gridY = Math.floor((p.baseY / canvas.height) * rows);
            const brightness = getBrightness(gridX, gridY, currentFrame);

            if (motionFrame) {
                const motionValue = getBrightness(gridX, gridY, motionFrame);
                const centerX = cols / 2;
                const centerY = rows / 2;
                const forceX = (gridX - centerX) * (motionValue / 50);
                const forceY = (gridY - centerY) * (motionValue / 50);
                p.applyForce(forceX, forceY, motionValue);
            }

            p.update(brightness, motionFrame ? getBrightness(gridX, gridY, motionFrame) : 0);
            p.draw();
        });
    } else {
        particles.forEach(p => {
            p.update(100, 0);
            p.draw();
        });
    }

    requestAnimationFrame(animate);
}

// Initialize everything
window.addEventListener("load", () => {
    console.log("Window loaded, initializing...");
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    initWebcam();
    animate();
});

if (document.readyState === "complete") {
    console.log("Document already loaded, initializing immediately...");
    resizeCanvas();
    initWebcam();
    animate();
}