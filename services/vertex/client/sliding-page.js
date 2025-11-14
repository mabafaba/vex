// sliding-page.js - Page sliding animation utilities

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
