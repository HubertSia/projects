import * as THREE from 'https://unpkg.com/three@0.136.0/build/three.module.js';

// ===== PRELOADING SYSTEM =====
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

// ===== ORIGINAL VISUAL VARIABLES (UNCHANGED) =====
let scene, camera, renderer, particles, videoTexture, videoCanvas, videoContext, positions;
let video, model;

// ===== GESTURE TIMING VARIABLES =====
let openHandTimer = null;
let noHandsTimer = null;
const OPEN_HAND_DURATION = 5000; // 5 seconds for open palm
const NO_HANDS_DURATION = 60000; // 1 minute for no hands
let lastGestureState = null; // Track the last detected gesture state

// ===== OPTIMIZED HANDPOSE LOADING =====
async function preloadHandpose() {
    try {
        // Load TensorFlow.js first if not already loaded
        if (typeof tf === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Load Handpose model
        if (typeof handpose === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Start loading the model
        loadingIndicator.textContent = 'Loading model (30%)...';
        model = await handpose.load();
        
        // Warm up the model (hidden from user)
        await warmUpModel();
        
        loadingIndicator.textContent = 'Hand tracking ready!';
        setTimeout(() => loadingIndicator.style.display = 'none', 2000);
        return model;
    } catch (error) {
        console.error('Handpose loading failed:', error);
        loadingIndicator.textContent = 'Using mouse controls';
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

// ===== GESTURE DETECTION FUNCTIONS =====
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

    // Measure distances between fingertips
    const thumbIndexDistance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
    const indexMiddleDistance = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
    const middleRingDistance = Math.hypot(middleTip[0] - ringTip[0], middleTip[1] - ringTip[1]);
    const ringPinkyDistance = Math.hypot(ringTip[0] - pinkyTip[0], ringTip[1] - pinkyTip[1]);

    // All fingers should be close together for a proper fist
    return (thumbIndexDistance < 30 && indexMiddleDistance < 30 && 
            middleRingDistance < 30 && ringPinkyDistance < 30);
}

async function detectGestures() {
    if (!model) return;

    try {
        const predictions = await model.estimateHands(video);
        
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

        // Only reset timers if gesture state has changed
        if (currentGestureState !== lastGestureState) {
            clearTimeout(openHandTimer);
            clearTimeout(noHandsTimer);
            
            if (currentGestureState === 'open') {
                console.log('Open palm detected - starting 5 second timer');
                openHandTimer = setTimeout(() => {
                    const pages = ['particle6.html', 'particle4.html'];
                    window.location.href = pages[Math.floor(Math.random() * pages.length)];
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
                    window.location.href = 'index.html';
                }, NO_HANDS_DURATION);
            }
            
            lastGestureState = currentGestureState;
        }
    } catch (error) {
        console.log('Detection busy - skipping frame');
    }
}

// ===== ORIGINAL VISUAL FUNCTIONS (UNCHANGED) =====
function init() {
    // === ORIGINAL VISUAL SETUP ===
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8; // Original camera position

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.play();

        // Start preloading immediately
        preloadHandpose().then(() => {
            setInterval(detectGestures, 1000);
        });
    });

    videoTexture = new THREE.VideoTexture(video);
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    const particleCount = 10000;
    const geometry = new THREE.BufferGeometry();
    positions = new Float32Array(particleCount * 3);
    const uvs = new Float32Array(particleCount * 2);

    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius || 0;
        positions[i * 3 + 1] = (Math.random() * 10 - 5) || 0;
        positions[i * 3 + 2] = Math.sin(angle) * radius || 0;

        uvs[i * 2] = Math.random();
        uvs[i * 2 + 1] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();

    // Original particle material settings
    const material = new THREE.PointsMaterial({
        size: 0.08, // Original size
        map: videoTexture,
        transparent: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    animate();
}

function updateParticles(time) {
    if (!videoCanvas || !videoContext || !videoTexture || !videoTexture.image || videoTexture.image.videoWidth === 0) return;

    videoCanvas.width = 1920;
    videoCanvas.height = 1080;

    videoContext.save();
    videoContext.scale(1, -1);
    videoContext.translate(0, -videoCanvas.height);
    videoContext.drawImage(videoTexture.image, 0, 0, videoCanvas.width, videoCanvas.height);
    videoContext.restore();

    const imageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < positions.length / 3; i++) {
        let x = positions[i * 3] || 0;
        let y = positions[i * 3 + 1] || 0;
        let z = positions[i * 3 + 2] || 0;

        const radius = Math.sqrt(x * x + z * z) || 0;
        const angle = Math.atan2(z, x) + time * 0.0005;

        positions[i * 3] = (Math.cos(angle) * radius || 0) + (Math.random() - 0.5) * 0.02;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.02 || 0;
        positions[i * 3 + 2] = (Math.sin(angle) * radius || 0) + (Math.random() - 0.5) * 0.02;

        const brightnessIndex = (Math.floor((y + 5) / 10 * videoCanvas.height) * videoCanvas.width + 
                              Math.floor((x + 5) / 10 * videoCanvas.width)) * 4;
        
        if (brightnessIndex >= 0 && brightnessIndex + 2 < data.length) {
            const brightness = (data[brightnessIndex] + data[brightnessIndex + 1] + data[brightnessIndex + 2]) / 3 / 255;
            positions[i * 3 + 1] = (brightness * 10 - 5) || 0; // Original brightness multiplier
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.computeBoundingSphere();
}

function animate(time) {
    requestAnimationFrame(animate);
    updateParticles(time);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();