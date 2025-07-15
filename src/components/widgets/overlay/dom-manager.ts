// src/components/widgets/overlay/dom-manager.ts
export class DOMManager {
  /**
   * Get the overlay container, media wrapper and context text element from the DOM.
   * Returns an object with the overlay container, media wrapper and context text element.
   * The object also contains an `isValid` property that is `true` only if all the elements
   * are valid.
   * @returns {Object} Object with the overlay container, media wrapper and context text element.
   */
  static getOverlayElements() {
    const overlayContainer = document.getElementById('overlay-container') as HTMLDivElement;
    const mediaWrapper = document.getElementById('media-wrapper') as HTMLDivElement;
    const contextTextElement = document.getElementById('context-text') as HTMLDivElement;

    return {
      overlayContainer,
      mediaWrapper,
      contextTextElement,
      isValid: !!(overlayContainer && mediaWrapper && contextTextElement)
    };
  }

  static clearMediaWrapper(mediaWrapper: HTMLElement): void {
    mediaWrapper.innerHTML = '';
  }

  static setContextText(contextElement: HTMLElement, text: string): void {
    contextElement.textContent = text;
  }

  static showOverlayContainer(overlayContainer: HTMLElement): void {
    overlayContainer.style.display = 'flex';
  }

  static hideOverlayContainer(overlayContainer: HTMLElement): void {
    overlayContainer.style.display = 'none';
  }
}