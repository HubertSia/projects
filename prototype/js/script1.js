// Get references to the video and canvas elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Array to store particle objects
let particles = [];
const numParticles = 1200; // Adjusted for better performance on mobile

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
    const predictions = await model.estimateHands(video);
    if (predictions.length > 0) {
        // Check if at least one hand has an open palm
        const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

        if (atLeastOneOpen) {
            console.log('At Least One Open Palm Detected');
            // Navigate to a random HTML page after 3 seconds
            setTimeout(() => {
                const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                window.location.href = randomPage;
            }, 3000); // 3-second delay
        } else {
            console.log('Both Hands Closed: Navigating to index.html');
            // Navigate to index.html after 10 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 10000); // 10-second delay
        }
    } else {
        console.log('No Hands Detected');
    }
}

/**
 * Function to resize the canvas dynamically to fit the screen
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Listen for window resize events to adjust the canvas size
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Set initial size

/**
 * Access the user's webcam and stream the video
 */
navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
    .then(stream => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            startParticles(); // Start particles once video is loaded
            loadHandPoseModel().then(() => {
                // Add a 1-minute delay before starting gesture detection
                //setTimeout(() => {
                   // console.log("Hand detection is now active!");
                    // Start detecting gestures every second after the delay
                    setInterval(detectGestures, 1000); // Check for gestures every second
                //}, 60000); // 60,000 milliseconds = 1 minute
            });
        });
    })
    .catch(err => console.error("Webcam access denied!", err));

/**
 * Function to initialize and create particle objects
 */
function startParticles() {
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    animate(); // Start animation loop
}

/**
 * Particle class to define properties and behaviors of individual particles
 */
class Particle {
    constructor(x, y) {
        this.x = x; // X position
        this.y = y; // Y position
        this.vx = Math.random() * 2 - 1; // Random velocity in X direction
        this.vy = Math.random() * 2 - 1; // Random velocity in Y direction
        this.size = Math.random() * 5 + 2; // Random size for variation (2px - 7px)
    }

    /**
     * Update the particle's position based on brightness from video feed
     */
    update(brightness) {
        let speed = brightness / 255 * 2; // Speed is affected by brightness of the video pixel
        this.x += this.vx * speed;
        this.y += this.vy * speed;

        // Reverse direction if hitting canvas boundaries
        if (this.x > canvas.width || this.x < 0) this.vx *= -1;
        if (this.y > canvas.height || this.y < 0) this.vy *= -1;
    }

    // Draw the particle on the canvas
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`; // White particles with slight transparency
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Function to animate the particles based on the webcam video feed
 */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for each frame

    // Draw the video frame on the canvas to extract brightness data
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Update and draw each particle
    for (let p of particles) {
        let index = (Math.floor(p.y) * canvas.width + Math.floor(p.x)) * 4; // Get pixel index
        let brightness = imageData[index]; // Extract brightness from red channel
        p.update(brightness);
        p.draw();
    }

    requestAnimationFrame(animate); // Keep the animation running
}