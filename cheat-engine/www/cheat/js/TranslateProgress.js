// @ts-check

export const TRANSLATE_PROGRESS = {
  isTranslating: false,
  progress: 0,
  text: "",
  callbacks: [],

  /**
   * @param {boolean} isTranslating
   * @param {number} progress
   * @param {string} text
   * @returns {void}
   */
  update(isTranslating, progress, text) {
    this.isTranslating = isTranslating;
    this.progress = progress;
    this.text = text;
    this.callbacks.forEach((cb) => cb(this));
  },

  /**
   * @param {(state: typeof TRANSLATE_PROGRESS) => void} cb
   * @returns {void}
   */
  subscribe(cb) {
    this.callbacks.push(cb);
  },

  /**
   * @param {(state: typeof TRANSLATE_PROGRESS) => void} cb
   * @returns {void}
   */
  unsubscribe(cb) {
    this.callbacks = this.callbacks.filter((candidate) => candidate !== cb);
  },
};
