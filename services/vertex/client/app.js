// app.js - Main client-side entry point for VEX application

// Socket.io connection setup
const socket = io({
  transports: ['websocket'],
  autoConnect: false,
  path: '/vex-socket-io'
});

socket.connect();
socket.on('connect', () => {
  console.log('Socket connected');
});

VexList.socket = socket;
LiveModelElement.socket = VexList.socket;

/**
 * Get vex ID from URL parameters or fetch initial vertex
 * @returns {Promise<string>} The vex ID to use
 */
async function getVexId () {
  const urlParams = new URLSearchParams(window.location.search);
  let vexId = urlParams.get('id');
  if (!vexId) {
    console.warn('No vex id provided in the URL, fetching initial vertex');
    try {
      const response = await fetch('/vex/vertex/initial');
      if (response.ok) {
        const data = await response.json();
        vexId = data.id;
        console.log('Using initial vertex ID:', vexId);
      } else {
        console.error('Failed to fetch initial vertex, using fallback');
        vexId = '6898a5960723783a9ef8ca71'; // Keep fallback for safety
      }
    } catch (error) {
      console.error('Error fetching initial vertex:', error);
      vexId = '6898a5960723783a9ef8ca71'; // Keep fallback for safety
    }
  }
  return vexId;
}

/**
 * Slides the content of a container out to the left, then brings it back in from the right.
 * @param {HTMLElement} container - The container whose content will be animated.
 * @param {number} duration - Animation duration in ms.
 * @param {Function} onAway - Callback when sliding away
 * @param {Function} onFinish - Callback when animation finishes
 * @returns {Promise<void>}
 */
function slideNext (container, duration = 400, onAway = () => {}, onFinish = () => {}) {
  return new Promise((resolve) => {
    container.style.transition = `transform ${duration / 2}ms ease`;
    container.style.transform = 'translateX(-100%)';

    setTimeout(() => {
      onAway();
      container.style.transition = 'none';
      container.style.transform = 'translateX(100%)';

      // Force reflow to apply the transform immediately
      void container.offsetWidth;

      container.style.transition = `transform ${duration / 2}ms ease`;
      container.style.transform = 'translateX(0)';

      setTimeout(() => {
        container.style.transition = '';
        onFinish();
        resolve();
      }, duration / 2);
    }, duration / 2);
  });
}

/**
 * Slides the content of a container out to the right, then brings it back in from the left.
 * @param {HTMLElement} container - The container whose content will be animated.
 * @param {number} duration - Animation duration in ms.
 * @param {Function} onAway - Callback when sliding away
 * @param {Function} onFinish - Callback when animation finishes
 * @returns {Promise<void>}
 */
function slidePrev (container, duration = 400, onAway = () => {}, onFinish = () => {}) {
  return new Promise((resolve) => {
    container.style.transition = `transform ${duration / 2}ms ease`;
    container.style.transform = 'translateX(100%)';

    setTimeout(() => {
      onAway();
      container.style.transition = 'none';
      container.style.transform = 'translateX(-100%)';

      // Force reflow to apply the transform immediately
      void container.offsetWidth;

      container.style.transition = `transform ${duration / 2}ms ease`;
      container.style.transform = 'translateX(0)';

      setTimeout(() => {
        onFinish();
        container.style.transition = '';
        resolve();
      }, duration / 2);
    }, duration / 2);
  });
}

/**
 * Function to reload the main thread
 */
function reloadMainThread () {
  console.log('reloadMainThread');
  // update location picker dialog
  const locationPickerDialog = document.querySelector('location-picker-dialog');
  locationPickerDialog.loadCurrentLocation();
  // update main thread
  const slidingThreads = document.getElementById('main-sliding-threads');
  const currentVexId = slidingThreads.getAttribute('vex-id');
  // Re-set the vex-id to force a refresh
  slidingThreads.setAttribute('vex-id', '');
  setTimeout(() => {
    slidingThreads.setAttribute('vex-id', currentVexId);
  }, 0);
}

/**
 * Initialize the application
 */
async function initApp () {
  console.log('initApp');
  await checkUserLocation();
  // Initialize main UI structure
  const mainContainer = document.querySelector('.main-container');
  mainContainer.innerHTML = `
    <div class="thread-container">
      <vex-thread id="main-sliding-threads"></vex-thread>
    </div>`;

  // Get the vex ID and set it on the sliding threads
  const vexId = await getVexId();
  const slidingThreads = document.getElementById('main-sliding-threads');
  slidingThreads.setAttribute('vex-id', vexId);

  // Set up event listeners
  setupEventListeners(slidingThreads, mainContainer);

  // Initialize reactive state
  const state = reactive();
}

/**
 * Set up all event listeners
 */
function setupEventListeners (slidingThreads, mainContainer) {
  // vex-main-click listener
  slidingThreads.addEventListener('vex-main-click', (e) => {
    // do nothing if the vex is already open
    if (slidingThreads.getAttribute('vex-id') === e.detail.vexId) {
      return;
    }
    const vexId = e.detail.vexId;
    // Set the vex-id on the sliding threads
    slidingThreads.setAttribute('vex-id', vexId);
    // set vex id as ?id= in the url
    console.log('setting vex id in url', vexId);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('id', vexId);
    window.history.pushState({}, '', `?${urlParams.toString()}`);

    slideNext(mainContainer, 300, () => {
      // Animation callback
    });
  });

  // breadcrumb-click listener
  slidingThreads.addEventListener('breadcrumb-click', (e) => {
    console.log('Breadcrumb clicked:', e.detail);
    const vexId = e.detail.vexId;
    // Set the vex-id on the sliding threads
    slidePrev(slidingThreads, 400, () => {
      slidingThreads.setAttribute('vex-id', vexId);
    });
  });

  // login-success event on user-status should reload the page
  // same effect for registered-success
  document.addEventListener('login-success', () => {
    console.log('login success event listener in app.js');
    reloadMainThread();
  });
  document.addEventListener('registered-success', () => {
    console.log('registered success event listener in app.js');
    reloadMainThread();
  });

  // logout event should also reload the thread
  document.addEventListener('user-logout', () => {
    console.log('user logout event listener');
    reloadMainThread();
  });

  // Check for user location data after successful login
  document.addEventListener('login-success', async () => {
    console.log('login success event listener');
    try {
      const response = await fetch('/vex/user/me', {
        credentials: 'include'
      });
      const userData = await response.json();

      // Create location picker if it doesn't exist
      if (!document.querySelector('location-picker-dialog')) {
        const dialog = document.createElement('location-picker-dialog');
        document.querySelector('.user-status-container').appendChild(dialog);
      } else {
        console.log('location picker dialog already exists');
        const dialog = document.querySelector('location-picker-dialog');
        dialog.loadCurrentLocation();
      }
    } catch (error) {
      console.error('Error checking user location data:', error);
    }
  });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

async function checkUserLocation () {
  try {
    const response = await fetch('/vex/user/me', {
      credentials: 'include'
    });
    if (response.ok) {
      console.log('user logged in');
      const userData = await response.json();
      // Create location picker if it doesn't exist
      if (!document.querySelector('location-picker-dialog')) {
        const dialog = document.createElement('location-picker-dialog');
        document.querySelector('.user-status-container').appendChild(dialog);
        console.log('location picker dialog created');

        // Add event listener for location-saved event
        dialog.addEventListener('location-saved', () => {
          console.log('location saved event listener in app.js');
          // Refresh the main thread by triggering a re-render
          const slidingThreads = document.getElementById('main-sliding-threads');
          const currentVexId = slidingThreads.getAttribute('vex-id');
          // Re-set the vex-id to force a refresh
          slidingThreads.setAttribute('vex-id', '');
          setTimeout(() => {
            slidingThreads.setAttribute('vex-id', currentVexId);
          }, 0);
        });
      }
    } else {
      console.log('user not logged in');
    }
  } catch (error) {
    console.error('Error checking user location data:', error);
  }
}
