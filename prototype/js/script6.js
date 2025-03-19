// This class represents a single particle that will be used for visual effects.
class Particle {
    constructor(x, y) {
        // Initialize particle position
        this.x = x;
        this.y = y;

        // Randomly determine particle size within a range (2 to 7 pixels)
        this.size = Math.random() * 5 + 2;

        // Assign random speed for movement in both X and Y directions
        this.speedX = Math.random() * 2 - 1; // Range: -1 to 1
        this.speedY = Math.random() * 2 - 1; // Range: -1 to 1
    }

    // Update particle position based on speed
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    // Render the particle on the canvas
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // White with some transparency
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
}

// Array to store multiple particles
let particles = [];

// Function to create multiple particles at a given position
function createParticles(x, y) {
    // Generate 5 particles per call
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(x, y));
    }
}

// Function to update and render particles
function updateParticles(ctx) {
    particles.forEach((particle, index) => {
        // Move the particle
        particle.update();

        // Draw it on canvas
        particle.draw(ctx);

        // Gradually reduce particle size to create a fading effect
        if (particle.size > 0.2) particle.size -= 0.05;

        // Remove the particle from the array once it is too small
        if (particle.size <= 0.2) particles.splice(index, 1);
    });
}

// Asynchronously sets up the webcam and returns a video element
async function setupCamera() {
    // Create a video element
    const video = document.createElement('video');
    video.width = 640;
    video.height = 480;

    // Request access to user's webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    // Wait for the metadata to load before playing the video
    await new Promise(resolve => video.onloadedmetadata = resolve);
    video.play();

    // Return the video element
    return video;
}

// Loads the PoseNet model for pose estimation
async function loadPoseNet() {
    return await posenet.load({
        // Lightweight model for performance
        architecture: 'MobileNetV1',

        // Determines the spacing of the output grid
        outputStride: 16,

        // Input image resolution
        inputResolution: { width: 640, height: 480 },

        // Controls model size and performance
        multiplier: 0.75
    });
}

// Loads the HandPose model for hand gesture detection
let handposeModel;
async function loadHandPoseModel() {
    handposeModel = await handpose.load();
    console.log('HandPose model loaded.');
}

// Function to check if a hand is open based on landmarks
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

// Function to estimate human pose from the webcam feed and process the data
async function estimatePose(video, net) {
    const canvas = document.createElement('canvas'); // Create a canvas for drawing
    document.body.appendChild(canvas);
    canvas.width = video.width;
    canvas.height = video.height;
    const ctx = canvas.getContext('2d');

    // Flag to prevent multiple navigations
    let isNavigating = false;

    async function detect() {
        // Estimate the human pose from the video frame
        const pose = await net.estimateSinglePose(video, { flipHorizontal: false });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw skeleton on detected keypoints
        drawSkeleton(pose.keypoints, ctx);

        // Draw keypoints (joints)
        drawKeypoints(pose.keypoints, ctx);

        // Update and render particles
        updateParticles(ctx);

        // Hand gesture detection
        if (handposeModel && !isNavigating) {
            const predictions = await handposeModel.estimateHands(video);
            if (predictions.length > 0) {
                // Check if at least one hand has an open palm
                const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

                if (atLeastOneOpen) {
                    console.log('At Least One Open Palm Detected');
                    isNavigating = true; // Prevent multiple navigations

                    // Visual feedback
                    ctx.fillStyle = 'white';
                    ctx.font = '24px Arial';
                    ctx.fillText('Navigating in 3 seconds...', 10, 50);

                    // Navigate to a random HTML page after 3 seconds
                    setTimeout(() => {
                        const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
                        const randomPage = pages[Math.floor(Math.random() * pages.length)];
                        window.location.href = randomPage;
                    }, 3000); // 3-second delay
                } else {
                    console.log('Both Hands Closed: Navigating to index.html');
                    isNavigating = true; // Prevent multiple navigations

                    // Visual feedback
                    ctx.fillStyle = 'white';
                    ctx.font = '24px Arial';
                    ctx.fillText('Navigating to index.html in 10 seconds...', 10, 50);

                    // Navigate to index.html after 10 seconds
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 10000); // 10-second delay
                }
            } else {
                console.log('No Hands Detected');
            }
        }

        // Continuously detect poses
        requestAnimationFrame(detect);
    }
    detect();
}

// Function to draw detected keypoints (joints) on the canvas
function drawKeypoints(keypoints, ctx) {
    keypoints.forEach(keypoint => {
        // Only draw keypoints with a confidence score > 0.5
        if (keypoint.score > 0.5) {
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);

            // Keypoints appear as red dots
            ctx.fillStyle = 'red';
            ctx.fill();

            // Add particle effect
            createParticles(keypoint.position.x, keypoint.position.y);
        }
    });
}

// Function to draw a skeleton by connecting adjacent keypoints
function drawSkeleton(keypoints, ctx) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, 0.5);

    adjacentKeyPoints.forEach(([partA, partB]) => {
        ctx.beginPath();
        ctx.moveTo(partA.position.x, partA.position.y);
        ctx.lineTo(partB.position.x, partB.position.y);

        // Skeleton lines appear in blue
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Main function to initialize webcam, load PoseNet, and start pose detection
async function main() {
    // Initialize webcam
    const video = await setupCamera();
    document.body.appendChild(video);

    // Load PoseNet and HandPose models
    const net = await loadPoseNet();
    await loadHandPoseModel();

    // Start detecting poses
    estimatePose(video, net);
}

// Execute the main function
main();