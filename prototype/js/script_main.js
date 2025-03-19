// const video = document.getElementById('webcam-feed');
// const output = document.getElementById('output');

// // Load HandPose model
// let model;

// async function loadHandPoseModel() {
//     model = await handpose.load();
//     console.log('HandPose model loaded.');
//     detectGestures();
// }

// Detect gestures in real-time
// async function detectGestures() {
//     if (!model) return;

//     // Get hand predictions
//     const predictions = await model.estimateHands(video);
//     if (predictions.length > 0) {
//         // Check if at least one hand has an open palm
//         const atLeastOneOpen = predictions.some(prediction => isOpenHand(prediction.landmarks));

//         if (atLeastOneOpen) {
//             output.textContent = 'At Least One Open Palm Detected';
//             console.log('At Least One Open Palm Detected');

//             // Set a timer before navigating
//             setTimeout(() => {
//                 // Randomly navigate to one of the pages
//                 const pages = ['particle6.html', 'particle4.html', 'particle3.html', 'particle1.html'];
//                 const randomPage = pages[Math.floor(Math.random() * pages.length)];
//                 window.location.href = randomPage;
//             }, 6000); // 3-second delay

//             // Remove the display content after 2 seconds
//             setTimeout(() => {
//                 output.textContent = ''; // Clear the output div
//             }, 4000); // 2-second delay
//         } else {
//             output.textContent = 'No Open Palms Detected';
//             console.log('No Open Palms Detected');
//         }
//     } else {
//         output.textContent = 'No Hands Detected';
//         console.log('No Hands Detected');
//     }

//     // Repeat detection
//     requestAnimationFrame(detectGestures);
// }

// // Gesture Detection Functions
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

// // Access the webcam
// if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//     navigator.mediaDevices.getUserMedia({ video: true })
//         .then((stream) => {
//             video.srcObject = stream;
//             video.play();
//             loadHandPoseModel(); // Load model after webcam starts
//         })
//         .catch((error) => {
//             console.error('Error accessing the webcam:', error);
//             alert('Unable to access the webcam. Please ensure you have granted permission.');
//         });
// } else {
//     console.error('getUserMedia is not supported in this browser.');
//     alert('Your browser does not support webcam access.');
// }