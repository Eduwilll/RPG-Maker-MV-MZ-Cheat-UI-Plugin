/**
 * Separate Window Initialization (Fixed)
 * Connects this standalone window to the main game window context.
 */

// Error logging helper
function showError(msg, err) {
    const display = document.getElementById('error-display');
    const status = document.getElementById('status-text');
    if (display) {
        display.textContent = msg + (err ? "\n\nDetails: " + err.stack || err : "");
        display.style.display = 'block';
    }
    if (status) {
        status.textContent = "Initialization Failed";
        status.style.color = "#ff5252";
    }
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    showError("Global Script Error: " + msg, error);
    return false;
};

async function init() {
    const status = document.getElementById('status-text');
    
    if (!window.opener) {
        showError("Error: Game window not found. Please open the cheat from within the game.");
        return;
    }

    const opener = window.opener;

    // --- 1. Proxy RPG Maker Globals IMMEDIATELY ---
    // We do this before importing anything because the imports might 
    // try to access these globals during evaluation.
    const globals = [
        '$gameParty', '$gamePlayer', '$gameSystem', '$gameVariables', 
        '$gameSwitches', '$gameTemp', '$gameActors', '$gameMap', 
        '$gameTroop', '$gameMessage', '$gameEnemies', '$gameData',
        'SceneManager', 'DataManager', 'Utils', 'ImageManager', 
        'SoundManager', 'TextManager', 'Graphics', 'Input', 'TouchInput',
        'Game_Actor', 'Scene_Base', 'Scene_Map', 'Scene_Battle', 'Scene_Title',
        'Scene_Save', 'Scene_Load', 'Scene_Debug', 'BattleManager',
        // Database
        '$dataActors', '$dataClasses', '$dataSkills', '$dataItems', 
        '$dataWeapons', '$dataArmors', '$dataEnemies', '$dataTroops', 
        '$dataStates', '$dataAnimations', '$dataTilesets', 
        '$dataCommonEvents', '$dataSystem', '$dataMapInfos', '$dataMap'
    ];
    
    globals.forEach(g => {
        if (opener[g]) {
            window[g] = opener[g];
        }
    });

    // Provide a mocked/proxied Alert system
    if (opener.GeneralCheat) {
        window.GeneralCheat = opener.GeneralCheat;
    }
    
    // Crucial: Load the Alert Helper from the opener or local
    // Most components use 'Alert.warn' etc.
    try {
        const { Alert } = await import('./AlertHelper.js');
        window.Alert = Alert;
    } catch (e) {
        console.warn("Could not load local AlertHelper, trying to use opener's", e);
        if (opener.Alert) window.Alert = opener.Alert;
    }

    status.textContent = "Loading Components...";

    // --- 2. Dynamic Imports ---
    // Now that globals are ready, we can load the components
    try {
        const CheatModal = (await import('../CheatModal.js')).default;
        const AlertSnackbar = (await import('../components/AlertSnackbar.js')).default;

        status.textContent = "Mounting UI...";

        // --- 3. Setup Vue App ---
        new Vue({
            el: '#app',
            vuetify: new Vuetify({
                theme: { dark: true },
            }),
            components: {
                CheatModal,
                AlertSnackbar
            },
            data: {
                activeComponentName: null
            },
            mounted() {
                // Success! Hide the overlay
                document.getElementById('status-overlay').style.display = 'none';
                document.getElementById('app').style.display = 'block';
            }
        });

    } catch (err) {
        showError("Failed to load Vue components", err);
        throw err;
    }

    console.log("Cheat Window Initialized & Linked to Game Context");
    
    // Notify opener that we are ready
    if (opener.GeneralCheat) {
        opener.GeneralCheat.__cheatWindow = window;
    }
}

// Start initialization
init().catch(err => {
    console.error("Critical Init Error:", err);
});
