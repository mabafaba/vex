// filepath: services/vertex/client/sliding-page.js
class PageSlider extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.animationDuration = 200; // in milliseconds
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }
        .container {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform ${this.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1);
          will-change: transform;
        }

        slider-page {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
          display: flex;

        }

        ::slotted {
            flex: 0 0 100%;
          width: 100%;
          height: 100%;
        }
        ::slotted(slider-page) {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
        }
      </style>
      <div class="container">
        <slot></slot>
      </div>
    `;
    this.currentIndex = 0;
  }

  connectedCallback () {
    this.updatePages();
    // Add a MutationObserver to update pages when children change
    if (!this._observer) {
      this._observer = new MutationObserver(() => this.updatePages());
      this._observer.observe(this, { childList: true });
    }
  }

  updatePages () {
    this._pages = Array.from(this.children).filter(child => child.tagName.toLowerCase() === 'slider-page');
    // Clamp currentIndex to valid range
    if (this.currentIndex >= this._pages.length) {
      this.currentIndex = this._pages.length - 1;
    }
    if (this.currentIndex < 0) {
      this.currentIndex = 0;
    }
    this.slideTo(this.currentIndex);
  }

  slideTo (index) {
    if (index < 0 || index >= this._pages.length) {
      return;
    }
    this.currentIndex = index;
    this.shadowRoot.querySelector('.container').style.transform = `translateX(-${index * 100}%)`;
  }

  next () {
    if (this.currentIndex < this._pages.length - 1) {
      this.slideTo(this.currentIndex + 1);
    }
  }

  back () {
    if (this.currentIndex > 0) {
      // Remove the current page before going back
      const prevIndex = this.currentIndex - 1;
      const pageToRemove = this._pages[this.currentIndex];
      this.slideTo(prevIndex);
      if (pageToRemove && pageToRemove.parentNode === this) {
        // wait for the animation to finish before removing
        setTimeout(() => {
          this.removeChild(pageToRemove);
          this.updatePages();
        }, this.animationDuration);
        // updatePages will be triggered by MutationObserver
        // Clamp index to previous page
        this.currentIndex = prevIndex;
      } else {
        // this.slideTo(prevIndex);
      }
    }
  }

  /**
   * Remove a page element without animating.
   * If no element is given, removes the current page.
   */
  removePage (element = this._pages[this.currentIndex]) {
    const container = this.shadowRoot.querySelector('.container');
    const prevTransition = container.style.transition;
    container.style.transition = 'none';
    if (!element || element.parentNode !== this) {
      return;
    }
    this.removeChild(element);
    this.updatePages();
    // Force reflow to apply transform instantly
    void container.offsetWidth;
    // Restore transition
    container.style.transition = prevTransition;
  }
}

class SliderPage extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
        }
        .content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('page-slider', PageSlider);
customElements.define('slider-page', SliderPage);
