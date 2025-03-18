const video = document.getElementById('webcam-feed');
const output = document.getElementById('output');

// Load HandPose model
let model;

async function loadHandPoseModel() {
    model = await handpose.load();
    console.log('HandPose model loaded.');
    detectGestures();
}

// Detect gestures in real-time
async function detectGestures() {
    if (!model) return;

    // Get hand predictions
    const predictions = await model.estimateHands(video);
    if (predictions.length > 0) {
        const landmarks = predictions[0].landmarks;

        // Detect gestures
        if (isClosedHand(landmarks)) {
            output.textContent = 'Detected Gesture: Closed Hand';
            window.location.href = 'particle6.html'; // Navigate to test-smoke
        } else if (isOpenHand(landmarks)) {
            output.textContent = 'Detected Gesture: Open Hand';
            window.location.href = 'particle4.html'; // Navigate to test-psychedelic
        } else if (isPeaceSign(landmarks)) {
            output.textContent = 'Detected Gesture: Peace Sign';
            window.location.href = 'particle3.html'; // Navigate to test-vortex
        } else if (isThumbsUp(landmarks)) {
            output.textContent = 'Detected Gesture: Thumbs Up';
            window.location.href = 'particle1.html'; // Navigate to test-idle
        }
    } else {
        output.textContent = 'Detected Gesture: None';
    }

    // Repeat detection
    requestAnimationFrame(detectGestures);
}

// Gesture Detection Functions
function isClosedHand(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const distance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    return distance < 30; // Closed hand if thumb and index finger are close
}

function isOpenHand(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const distance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    return distance > 50; // Open hand if thumb and index finger are far apart
}

function isPeaceSign(landmarks) {
    const indexTip = landmarks[8]; // Index finger tip
    const middleTip = landmarks[12]; // Middle finger tip
    const ringTip = landmarks[16]; // Ring finger tip
    const pinkyTip = landmarks[20]; // Pinky finger tip

    // Check if index and middle fingers are extended, while ring and pinky are closed
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);
    return indexMiddleDistance < 30 && ringPinkyDistance < 30;
}

function isThumbsUp(landmarks) {
    const thumbTip = landmarks[4]; // Thumb tip
    const indexTip = landmarks[8]; // Index finger tip
    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);

    // Check if thumb is extended and index finger is closed
    return thumbIndexDistance > 50;
}

// Access the webcam
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
            loadHandPoseModel(); // Load model after webcam starts
        })
        .catch((error) => {
            console.error('Error accessing the webcam:', error);
            alert('Unable to access the webcam. Please ensure you have granted permission.');
        });
} else {
    console.error('getUserMedia is not supported in this browser.');
    alert('Your browser does not support webcam access.');
}