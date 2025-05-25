// swipepageanimation.js

/**
 * Slides the content of a container out to the left, then brings it back in from the right.
 * @param {HTMLElement} container - The container whose content will be animated.
 * @param {number} duration - Animation duration in ms.
 * @returns {Promise<void>}
 */
export function slideNext (container, duration = 400) {
  return new Promise((resolve) => {
    container.style.transition = `transform ${duration / 2}ms ease`;
    container.style.transform = 'translateX(-100%)';

    setTimeout(() => {
      container.style.transition = 'none';
      container.style.transform = 'translateX(100%)';

      // Force reflow to apply the transform immediately
      void container.offsetWidth;

      container.style.transition = `transform ${duration / 2}ms ease`;
      container.style.transform = 'translateX(0)';

      setTimeout(() => {
        container.style.transition = '';
        resolve();
      }, duration / 2);
    }, duration / 2);
  });
}

/**
 * Slides the content of a container out to the right, then brings it back in from the left.
 * @param {HTMLElement} container - The container whose content will be animated.
 * @param {number} duration - Animation duration in ms.
 * @returns {Promise<void>}
 */
export function slidePrev (container, duration = 400) {
  return new Promise((resolve) => {
    container.style.transition = `transform ${duration / 2}ms ease`;
    container.style.transform = 'translateX(100%)';

    setTimeout(() => {
      container.style.transition = 'none';
      container.style.transform = 'translateX(-100%)';

      // Force reflow to apply the transform immediately
      void container.offsetWidth;

      container.style.transition = `transform ${duration / 2}ms ease`;
      container.style.transform = 'translateX(0)';

      setTimeout(() => {
        container.style.transition = '';
        resolve();
      }, duration / 2);
    }, duration / 2);
  });
}
