window.onload = async function () {
    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create particle system
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        velocities[i * 3 + 1] = Math.random() * 0.02; // Rising effect
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const smokeTexture = textureLoader.load("smoke.png");

    // Create shader material
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            texture: { value: smokeTexture },
            time: { value: 0 },
            userPosition: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: `
            uniform vec2 userPosition;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                mvPosition.xy += userPosition * 0.1;
                gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = 10.0;
            }
        `,
        fragmentShader: `
            void main() {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
        `,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Webcam setup
    const video = document.createElement('video');
    video.width = 320;
    video.height = 240;
    video.autoplay = true;
    video.style.transform = "scaleX(-1)"; // Mirror effect
    document.body.appendChild(video);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Webcam access denied', error);
    }

    // Motion tracking setup
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.width;
    canvas.height = video.height;

    function trackUserMovement() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sumX = 0, sumY = 0, count = 0;
        
        for (let i = 0; i < frame.data.length; i += 4 * 10) { // Reduce sampling for performance
            const brightness = frame.data[i] + frame.data[i + 1] + frame.data[i + 2];
            if (brightness > 200) { // Detect bright areas (user movement)
                const index = i / 4;
                const x = (index % canvas.width) / canvas.width - 0.5;
                const y = (Math.floor(index / canvas.width) / canvas.height - 0.5) * -1;
                sumX += x;
                sumY += y;
                count++;
            }
        }
        
        if (count > 0) {
            material.uniforms.userPosition.value.set(sumX / count, sumY / count);
        }
    }

    // Animation loop
    function animate(t) {
        requestAnimationFrame(animate);
        material.uniforms.time.value = t * 0.001;
        trackUserMovement();
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resizing
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
};
