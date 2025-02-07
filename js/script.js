// Get references to the video and canvas elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Array to store particle objects
let particles = [];
const numParticles = 1200; // Adjusted for better performance on mobile

// Function to resize the canvas dynamically to fit the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Listen for window resize events to adjust the canvas size
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Set initial size

// Access the user's webcam and stream the video
navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
    .then(stream => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", startParticles); // Start particles once video is loaded
    })
    .catch(err => console.error("Webcam access denied!", err));

// Function to initialize and create particle objects
function startParticles() {
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    animate(); // Start animation loop
}

// Particle class to define properties and behaviors of individual particles
class Particle {
    constructor(x, y) {
        this.x = x; // X position
        this.y = y; // Y position
        this.vx = Math.random() * 2 - 1; // Random velocity in X direction
        this.vy = Math.random() * 2 - 1; // Random velocity in Y direction
        this.size = Math.random() * 5 + 2; // Random size for variation (2px - 7px)
    }

    // Update the particle's position based on brightness from video feed
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

// Function to animate the particles based on the webcam video feed
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
