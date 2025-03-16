document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('fragmentationCanvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('webcam');

  // Offscreen canvas
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  // Set canvas size to full window
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;

  // Vortex center
  const vortexCenter = { x: canvas.width / 2, y: canvas.height / 2 };

  // Fragment settings
  const fragmentSize = 30; // Size of each fragment
  const fragments = [];

  // Get webcam access
  async function setupWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      video.srcObject = stream;
      console.log('Webcam access granted!');
    } catch (err) {
      console.error('Error accessing webcam:', err);
    }
  }

  // Create fragments to fill the entire screen
  function createFragments() {
    for (let y = 0; y < canvas.height; y += fragmentSize) {
      for (let x = 0; x < canvas.width; x += fragmentSize) {
        fragments.push({
          x,
          y,
          width: fragmentSize,
          height: fragmentSize,
          rotation: Math.random() * 360, // Random rotation
          scale: 0.5 + Math.random(), // Random scale
          brightness: Math.random() * 100, // Random brightness
          opacity: Math.random(), // Random opacity
          angle: Math.random() * 360, // Random starting angle for spiral motion
          radius: Math.hypot(x - vortexCenter.x, y - vortexCenter.y), // Distance from center
          speed: Math.random() * 2 + 0.5, // Random speed
        });
      }
    }
    console.log('Fragments created:', fragments.length);
  }

  // Draw fragments
  function drawFragments() {
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Webcam feed not ready yet.');
      return;
    }

    // Draw the video frame on the offscreen canvas
    offscreenCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    fragments.forEach(fragment => {
      // Calculate the fragment's position in the image data array
      const index = (Math.floor(fragment.y) * canvas.width + Math.floor(fragment.x)) * 4;
      const brightness = imageData[index]; // Extract brightness from red channel

      // Update fragment properties based on brightness
      fragment.speed = brightness / 255 * 2; // Speed is affected by brightness
      fragment.angle += fragment.speed; // Move in a spiral
      fragment.radius -= 0.3; // Slowly spiral inward

      // Reset fragment if it reaches the center
      if (fragment.radius < 0) {
        fragment.radius = Math.hypot(fragment.x - vortexCenter.x, fragment.y - vortexCenter.y);
        fragment.angle = Math.random() * 360;
      }

      // Calculate new position based on spiral motion
      fragment.x = vortexCenter.x + fragment.radius * Math.cos((fragment.angle * Math.PI) / 180);
      fragment.y = vortexCenter.y + fragment.radius * Math.sin((fragment.angle * Math.PI) / 180);

      // Save the current canvas state
      ctx.save();

      // Move to the fragment's center
      ctx.translate(fragment.x + fragment.width / 2, fragment.y + fragment.height / 2);

      // Apply transformations
      ctx.rotate((fragment.rotation * Math.PI) / 180);
      ctx.scale(fragment.scale, fragment.scale);

      // Adjust brightness and opacity
      ctx.globalAlpha = fragment.opacity;
      ctx.filter = `brightness(${fragment.brightness}%)`;

      // Draw the fragment
      ctx.drawImage(
        video,
        fragment.x, fragment.y, fragment.width, fragment.height, // Source rectangle
        -fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height // Destination rectangle
      );

      // Restore the canvas state
      ctx.restore();
    });
  }

  // Animation loop with frame rate limiter
  let lastTime = 0;
  const frameRate = 30; // Target frame rate
  const frameDelay = 1000 / frameRate;

  function animate(timestamp) {
    if (timestamp - lastTime >= frameDelay) {
      lastTime = timestamp;
      drawFragments();
    }
    requestAnimationFrame(animate);
  }

  // Initialize
  async function init() {
    await setupWebcam();
    await video.play(); // Ensure the video is playing
    createFragments();
    animate();
  }

  init();

  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    fragments.length = 0; // Clear fragments
    createFragments(); // Recreate fragments for new canvas size
  });
});