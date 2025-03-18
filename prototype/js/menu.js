// Galaxy Particle Animation with Three.js
// import * as THREE from 'three';
//import inside the document not working correctly, only global import in the index.html file

// Set up  scene, camera, and renderer
const scene = new THREE.Scene();  // Creates container to hold all 3D objects (To be added?)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);  // Creates camera with 75° field of view for now, aspect ratio, clipping planes
const renderer = new THREE.WebGLRenderer({ antialias: true });  // Creates a WebGL renderer + antialiasing = smoother edges for later
renderer.setSize(window.innerWidth, window.innerHeight);  // fill the entire browser window
renderer.setClearColor(0x000000);  // Sets background color to black 
document.body.appendChild(renderer.domElement);  // add canvas to page

// Camera position
camera.position.z = 1;  // adjustable to zoom, more zoomed in looks a bit nicer

// the specific parameters of the galaxy
const parameters = {
    count: 100000,  // Number of particles (stars) 
    size: 0.01,     // Size of each particle
    radius: 5,
    branches: 5,    // Number of arm thingies
    spin: 1,        // How much the arms twist
    randomness: 0.7,  // How much particles deviate from original spiral pattern, diffuse rate
    randomnessPower: 3,  // Controls concentration of random distribution, higher = more concentrated
    insideColor: 0xff6030,  // random orange/red color for galaxy center
    outsideColor: 0x1b3984  // random blueish color for galaxy edges
};

// Galaxy geometry and material
let geometry = null;  // hold the particle positions and colors
let material = null;  // define how particles look
let points = null;    // final rendered thing

const generateGalaxy = () => {
    // Dispose of old particles to not overload browser
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    // Geometry/shape
    //See attributes in ReadMe for source code!!!!!!
    geometry = new THREE.BufferGeometry();  // Create geometry container

    const positions = new Float32Array(parameters.count * 3);  // Array for XYZ positions, 3 per particle
    const colors = new Float32Array(parameters.count * 3);     // Array for RGB  

    const colorInside = new THREE.Color(parameters.insideColor);   // Center  color
    const colorOutside = new THREE.Color(parameters.outsideColor); // Outside color

    //Loopity loop to generate points
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;  // idk what this is, I pillaged it, but each particle needs 3 consecutive array elements

        // Positions, idk i pillaged the code for the shape, see attrubutes 
        const radius = Math.random() * parameters.radius;  // Random distance from center
        const spinAngle = radius * parameters.spin;  // Calculates twist 
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;  // Distributes particles among arms

        // Particles further from center = more randomness
        // Math.pow makes randomness distribution non-linear, idk what it actually does
        // Random < 0.5 randomly flips between positive/negative offsets, more variation
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        // Umm????
        positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;  // X position
        positions[i3 + 1] = randomY;  // Y position (only random offset, keeps galaxy relatively flat, CAN MODIFY)
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;  // Z position

        // Color
        const mixedColor = colorInside.clone();  // center color
        mixedColor.lerp(colorOutside, radius / parameters.radius);  // Blend to second based on distance

        // Store RGB in array
        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    // Attach position + color data to the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material, to be modified
    material = new THREE.PointsMaterial({
        size: parameters.size,         // Size 
        sizeAttenuation: true,         // Makes distant stars appear smaller
        depthWrite: false,             // Prevents particles blocking each other
        blending: THREE.AdditiveBlending,  // Makes overlapping particles brighten (like real stars yk)
        vertexColors: true             // Uses the colors we defined per vertex earlier
    });

    // Points
    points = new THREE.Points(geometry, material);  // Actually creates the particle system 
    scene.add(points);  // Adds the particles to the canvas
};

generateGalaxy();  // SPAWN BOIII

// Animation
const clock = new THREE.Clock();  // Track time for spin animation

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Rotate the galaxy
    points.rotation.y = elapsedTime * 0.05;  // Slowly rotates galaxy around Y axis (Maybe we should do a combo of x and y?)

    // Render new position
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

//Wndow resizing stuff
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;  // Apect ratio
    camera.updateProjectionMatrix();  // Updates camera
    renderer.setSize(window.innerWidth, window.innerHeight);  // Resize renderer
});

// Mighty mouse
const mousePosition = new THREE.Vector2();  // Stores coordinates
// Getting coordinates
window.addEventListener('mousemove', (event) => {
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;  // -1,1
    mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Move camera
    camera.position.x = mousePosition.x * 0.5; //0.5 sensitivity, seemed about right, doesnt give motion sickness
    camera.position.y = mousePosition.y * 0.5;
    camera.lookAt(scene.position);  // Keeps camera pointed at center of scene
});

// Animation loop
animate(); 