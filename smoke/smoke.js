window.onload = function () {
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
    const smokeTexture = textureLoader.load("smoke.png", () => {
        console.log("Texture loaded successfully");
    }, undefined, (err) => {
        console.error("Texture loading failed", err);
        // Fallback texture or color
        material.uniforms.texture.value = new THREE.TextureLoader().load("fallback.png");
    });

    // Create shader material with simplified shaders
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
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Solid red color
            }
        `,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Animation loop
    function animate(t) {
        requestAnimationFrame(animate);
        material.uniforms.time.value = t * 0.001;
        const posArray = geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            posArray[i * 3 + 1] += velocities[i * 3 + 1];
            if (posArray[i * 3 + 1] > 5) posArray[i * 3 + 1] = -5;
        }
        geometry.attributes.position.needsUpdate = true;
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