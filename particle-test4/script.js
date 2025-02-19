import * as THREE from 'three';

let scene, camera, renderer;
let particles, particleSystem;
let video, canvas, ctx;
let movementData = [];

init();
animate();

function init() {
    // Create Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create Particles
    const particleCount = 1000;
    particles = new THREE.BufferGeometry();
    let positions = new Float32Array(particleCount * 3);
    let velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        velocities[i * 3] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const particleMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Setup Webcam
    video = document.createElement('video');
    video.width = 320;
    video.height = 240;
    video.autoplay = true;
    
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
    });

    canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    ctx = canvas.getContext('2d');
}

function detectMovement() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let totalX = 0, totalY = 0, count = 0;
    
    for (let i = 0; i < frame.data.length; i += 4) {
        let brightness = (frame.data[i] + frame.data[i + 1] + frame.data[i + 2]) / 3;
        if (brightness > 128) {  // Adjust brightness threshold
            let index = i / 4;
            let x = index % canvas.width;
            let y = Math.floor(index / canvas.width);
            totalX += x;
            totalY += y;
            count++;
        }
    }
    
    if (count > 0) {
        movementData = [(totalX / count / canvas.width) * 10 - 5, (totalY / count / canvas.height) * -10 + 5];
    }
}

function animate() {
    requestAnimationFrame(animate);
    detectMovement();

    let positions = particles.attributes.position.array;
    let velocities = particles.attributes.velocity.array;

    for (let i = 0; i < positions.length / 3; i++) {
        let dx = movementData[0] - positions[i * 3];
        let dy = movementData[1] - positions[i * 3 + 1];
        velocities[i * 3] += dx * 0.01;
        velocities[i * 3 + 1] += dy * 0.01;
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        velocities[i * 3] *= 0.95;
        velocities[i * 3 + 1] *= 0.95;
    }

    particles.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}
