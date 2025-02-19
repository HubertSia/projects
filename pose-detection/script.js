let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

let poseDetector, handDetector;
let handResults = [];

// MoveNet Body Keypoints Connections
const bodyConnections = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
    [5, 11], [6, 12], // Shoulders to Hips
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16] // Legs
];

// Hand connections (finger joints)
const handConnections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [5, 6], [6, 7], [7, 8], // Index
    [9, 10], [10, 11], [11, 12], // Middle
    [13, 14], [14, 15], [15, 16], // Ring
    [17, 18], [18, 19], [19, 20] // Pinky
];

// Setup Camera
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
    });
}

// Load Models
async function loadModels() {
    // Load MoveNet for body detection
    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
    });

    // Load MediaPipe Hands for finger tracking
    handDetector = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    handDetector.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Callback to store hand results
    handDetector.onResults((results) => {
        handResults = results.multiHandLandmarks || [];
    });

    console.log("Models Loaded");
}

// Detect Pose & Hands
async function detectPose() {
    if (!poseDetector) return;

    // Detect body keypoints
    const poses = await poseDetector.estimatePoses(video);
    // Process hand landmarks separately
    handDetector.send({ image: video });

    drawSkeleton(poses, handResults);
    requestAnimationFrame(detectPose);
}

// Draw Skeleton & Hands
function drawSkeleton(poses, handResults) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 🔹 Draw MoveNet body keypoints
    if (poses.length > 0) {
        let keypoints = poses[0].keypoints;

        // Draw body connections
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 3;
        bodyConnections.forEach(([p1, p2]) => {
            if (keypoints[p1].score > 0.4 && keypoints[p2].score > 0.4) {
                ctx.beginPath();
                ctx.moveTo(keypoints[p1].x, keypoints[p1].y);
                ctx.lineTo(keypoints[p2].x, keypoints[p2].y);
                ctx.stroke();
            }
        });

        // Draw body keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.4) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }
        });
    }

    //Draw Hand Landmarks
    handResults.forEach(hand => {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;

        // Draw hand connections
        handConnections.forEach(([p1, p2]) => {
            ctx.beginPath();
            ctx.moveTo(hand[p1].x * canvas.width, hand[p1].y * canvas.height);
            ctx.lineTo(hand[p2].x * canvas.width, hand[p2].y * canvas.height);
            ctx.stroke();
        });

        // Draw hand keypoints
        hand.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "green";
            ctx.fill();
        });
    });
}

// Start Everything
async function main() {
    await setupCamera();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    await loadModels();
    detectPose();
}

main();
