
// new file to take care of audio persistence across pages, unsused, for future applications

// Create a singleton audio controller, see attributes
const AudioController = (function () {
    let instance;
    let audio;
    let isInitialized = false;

    function createInstance() {
        // Check if audio was already playing before page navigation
        const wasPlaying = sessionStorage.getItem('audioPlaying') === 'true';

        // Create the audio object
        audio = new Audio('assets/spaceFinal.wav');
        audio.volume = 0.5;
        audio.loop = true; // Make it loop

        // If it was playing before, try to resume it, might not work
        if (wasPlaying) {
            const playPromise = audio.play();

            // Handle autoplay restrictions
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio resumed after page navigation');
                    })
                    .catch(error => {
                        console.log('Autoplay prevented by browser, waiting for user interaction');
                        // need user interaction to play later
                    });
            }
        }

        return {
            play: function () {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            sessionStorage.setItem('audioPlaying', 'true');
                            console.log('playing sound');
                        })
                        .catch(error => {
                            console.error('Audio play failed:', error);
                        });
                }
            },
            pause: function () {
                audio.pause();
                sessionStorage.setItem('audioPlaying', 'false');
            },
            setVolume: function (volume) {
                audio.volume = volume;
            },
            isPlaying: function () {
                return !audio.paused;
            }
        };
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
                isInitialized = true;
            }
            return instance;
        },
        isInitialized: function () {
            return isInitialized;
        }
    };
})();

// Export the controller to the global scope
window.AudioController = AudioController;