/**
 * Preview Entry Point
 * This bridges the standalone browser environment with the RPG Maker Cheat components.
 */

// Import the main modal component
import CheatModal from '../cheat-engine/www/cheat/CheatModal.js';

// Setup Mock for KeyValueStorage and Alert 
// Since these are imported in CheatHelper.js, we should ideally mock them before
// However, since CheatModal.js imports panels which import CheatHelper, 
// and modules are evaluated only once, we need to ensure the mocks are global.

// Define basic Alert system for browser
window.Alert = {
    success: (msg) => console.log('%c[SUCCESS] ' + msg, 'color: #4CAF50; font-weight: bold;'),
    error: (msg) => console.log('%c[ERROR] ' + msg, 'color: #F44336; font-weight: bold;'),
    info: (msg) => console.log('%c[INFO] ' + msg, 'color: #2196F3; font-weight: bold;'),
    warning: (msg) => console.log('%c[WARNING] ' + msg, 'color: #FF9800; font-weight: bold;'),
};

new Vue({
    el: '#app',
    vuetify: new Vuetify({
        theme: {
            dark: true,
        },
    }),
    components: {
        CheatModal
    },
    data: {
        activeComponentName: 'general-panel'
    }
});
