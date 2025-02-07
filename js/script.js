  const video = document.getElementById("webcam");
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");

        let particles = [];
        const numParticles = 1200; // Adjusted for better performance on mobile

        // Resize canvas dynamically
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas(); // Initial size

        // Set up webcam with responsive settings
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
            .then(stream => {
                video.srcObject = stream;
                video.addEventListener("loadeddata", startParticles);
            })
            .catch(err => console.error("Webcam access denied!", err));

        function startParticles() {
            for (let i = 0; i < numParticles; i++) {
                particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
            }
            animate();
        }

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = Math.random() * 2 - 1;
                this.vy = Math.random() * 2 - 1;
                this.size = Math.random() * 5 + 2; // Larger for better visibility
            }

            update(brightness) {
                let speed = brightness / 255 * 2; // Scales speed based on brightness
                this.x += this.vx * speed;
                this.y += this.vy * speed;

                if (this.x > canvas.width || this.x < 0) this.vx *= -1;
                if (this.y > canvas.height || this.y < 0) this.vy *= -1;
            }

            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw video frame to extract brightness
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (let p of particles) {
                let index = (Math.floor(p.y) * canvas.width + Math.floor(p.x)) * 4;
                let brightness = imageData[index];
                p.update(brightness);
                p.draw();
            }

            requestAnimationFrame(animate);
        }