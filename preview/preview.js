/**
 * Preview Entry Point (Updated)
 * This bridges the standalone browser environment with the RPG Maker Cheat components.
 */

// Import the main modal component
import CheatModal from '../cheat-engine/www/cheat/CheatModal.js';

console.log("🚀 Initializing UI Preview Bridge...");

// --- Translation System Mocks ---
// These ensure that panels using the translation system don't crash in preview
window.TRANSLATOR = {
    getAvailableTranslators: () => Promise.resolve([
        { id: 'google', name: 'Google Translate', items: ['en', 'pt', 'ja'] },
        { id: 'bing', name: 'Bing Translate', items: ['en', 'pt'] }
    ]),
    translate: (text, from, to) => Promise.resolve(text + " [translated]"),
};

window.TRANSLATE_SETTINGS = {
    isVariableTranslateEnabled: () => false,
    isSwitchTranslateEnabled: () => false,
    isItemTranslateEnabled: () => false,
    getAutoTranslate: () => false,
    getTargets: () => ({ items: false, weapons: false, armors: false }),
};

window.TRANSLATION_BANK = {
    get: () => null,
    save: () => {},
};

window.TRANSLATE_PROGRESS = {
    isTranslating: () => false,
    getProgress: () => 0,
};

// --- Basic Alert system for browser ---
window.Alert = {
    success: (msg) => console.log('%c[SUCCESS] ' + msg, 'color: #4CAF50; font-weight: bold;'),
    error: (msg) => console.log('%c[ERROR] ' + msg, 'color: #F44336; font-weight: bold;'),
    info: (msg) => console.log('%c[INFO] ' + msg, 'color: #2196F3; font-weight: bold;'),
    warn: (msg) => console.log('%c[WARNING] ' + msg, 'color: #FF9800; font-weight: bold;'), 
};

// Catch unhandled promise rejections (often from missing mocks in async code)
window.onunhandledrejection = event => {
    console.error('Unhandled Rejection:', event.reason);
};

// Initialize Vue
new Vue({
    el: '#app',
    vuetify: new Vuetify({
        theme: { dark: true },
    }),
    components: {
        CheatModal
    },
    data: {
        activeComponentName: 'general-panel'
    },
    mounted() {
        console.log("✅ UI Preview Mounted Successfully");
    }
});
