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
            mouse: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    document.body.appendChild(video);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Webcam access denied', error);
    }

    // Motion detection
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.width;
    canvas.height = video.height;

    function updateParticles() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let motion = 0;
        for (let i = 0; i < frame.data.length; i += 4) {
            motion += Math.abs(frame.data[i] - frame.data[i + 4] || 0);
        }
        motion /= frame.data.length / 4;
        motion = Math.min(motion, 50) * 0.01; // Scale motion effect

        const posArray = geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            posArray[i * 3 + 1] += (velocities[i * 3 + 1] + motion * 0.5); // Stronger motion response
            if (posArray[i * 3 + 1] > 5) posArray[i * 3 + 1] = -5;
        }
        geometry.attributes.position.needsUpdate = true;
    }

    // Animation loop
    function animate(t) {
        requestAnimationFrame(animate);
        material.uniforms.time.value = t * 0.001;
        updateParticles();
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
