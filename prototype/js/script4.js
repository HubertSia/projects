const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

let videoStream;
let particles = [];
const cols = 100, rows = 50;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            videoStream = document.createElement("video");
            videoStream.srcObject = stream;
            videoStream.play();
        })
        .catch(err => console.error("Webcam access denied", err));
}

class Particle {
    constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.waveOffset = Math.random() * Math.PI * 2;
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
    }

    update(brightness) {
        let distortion = (brightness / 255) * 30;
        this.x = this.baseX + Math.sin(this.waveOffset + performance.now() * 0.002) * 20 + distortion;
        this.y = this.baseY + Math.cos(this.waveOffset + performance.now() * 0.002) * 10 - distortion;
        this.waveOffset += 0.02;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createParticles() {
    particles = [];
    const spacingX = canvas.width / cols;
    const spacingY = canvas.height / rows;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            particles.push(new Particle(x * spacingX, y * spacingY));
        }
    }
}

function getBrightness(x, y, imageData) {
    let index = (y * imageData.width + x) * 4;
    return (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
}

function processWebcamData() {
    if (videoStream && videoStream.readyState >= 2) {
        offscreenCanvas.width = 100;
        offscreenCanvas.height = 50;
        offscreenCtx.drawImage(videoStream, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        return offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    }
    return null;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let frame = processWebcamData();
    if (frame) {
        particles.forEach(p => {
            let x = Math.floor((p.x / canvas.width) * frame.width);
            let y = Math.floor((p.y / canvas.height) * frame.height);
            let brightness = getBrightness(x, y, frame);
            p.update(brightness);
            p.draw();
        });
    }
    requestAnimationFrame(animate);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
initWebcam();
animate();