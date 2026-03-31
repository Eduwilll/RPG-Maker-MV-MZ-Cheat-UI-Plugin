/**
 * InGameTranslator.js
 * 
 * Hooks into RPG Maker MV/MZ's text rendering pipeline to display
 * cached translations from the TranslationBank during gameplay.
 * 
 * All translation is CACHE-ONLY — no API calls happen during gameplay.
 * The user must run "Start Translation" first to populate the cache,
 * then this module patches game data and intercepts text rendering.
 */

import { TRANSLATION_BANK, TRANSLATE_SETTINGS } from './TranslateHelper.js'

class InGameTranslator {
    constructor() {
        this._initialized = false
        this._dataPatched = false
        this._originalData = new Map() // Backup original strings for undo
    }

    /**
     * Initialize all RPG Maker hooks. Called once during plugin setup.
     */
    initialize() {
        if (this._initialized) return
        this._initialized = true

        console.log('[InGameTranslator] Initializing in-game translation hooks...')

        this._hookWindowMessage()
        this._hookDrawText()
        this._hookDrawTextEx()
        this._hookDrawItemName()
        this._hookChoiceList()
        this._hookActorEnemyNames()
        this._hookBattleLog()
        this._hookScrollText()
        this._hookShopWindows()
        this._hookMenuCommands()

        // Listen for translation completion to patch game data
        window.addEventListener('cheat-translate-finish', () => {
            console.log('[InGameTranslator] Translation finished, patching game data...')
            this.applyTranslationsToGameData()
        })

        console.log('[InGameTranslator] All hooks installed.')
    }

    // ========================================================================
    // PHASE 1: Direct Data Patching
    // After "Start Translation" completes, write translations into $data* arrays
    // This makes ALL game menus, shops, battle screens show translated text
    // ========================================================================

    /**
     * Write cached translations directly into RPG Maker's data arrays.
     * This is the most reliable method because the engine reads these directly.
     */
    applyTranslationsToGameData() {
        if (!TRANSLATE_SETTINGS.isEnabled()) return

        const targets = TRANSLATE_SETTINGS.getTargets()
        let patchCount = 0

        // Helper to patch name + description on data arrays
        const patchDataArray = (dataArray, targetKey) => {
            if (!targets[targetKey] || !dataArray) return 0
            let count = 0
            for (const item of dataArray) {
                if (!item) continue

                // Patch name
                if (item.name && typeof item.name === 'string' && item.name.trim()) {
                    const cached = TRANSLATION_BANK.get(item.name)
                    if (cached) {
                        // Store original for undo
                        if (!item._originalName) {
                            item._originalName = item.name
                        }
                        item.name = cached.translated
                        count++
                    }
                }

                // Patch description
                if (item.description && typeof item.description === 'string' && item.description.trim()) {
                    const cached = TRANSLATION_BANK.get(item.description)
                    if (cached) {
                        if (!item._originalDescription) {
                            item._originalDescription = item.description
                        }
                        item.description = cached.translated
                        count++
                    }
                }

                // Patch nickname (for actors)
                if (item.nickname && typeof item.nickname === 'string' && item.nickname.trim()) {
                    const cached = TRANSLATION_BANK.get(item.nickname)
                    if (cached) {
                        if (!item._originalNickname) {
                            item._originalNickname = item.nickname
                        }
                        item.nickname = cached.translated
                        count++
                    }
                }

                // Patch profile (for actors)
                if (item.profile && typeof item.profile === 'string' && item.profile.trim()) {
                    const cached = TRANSLATION_BANK.get(item.profile)
                    if (cached) {
                        if (!item._originalProfile) {
                            item._originalProfile = item.profile
                        }
                        item.profile = cached.translated
                        count++
                    }
                }

                // Patch message1-4 (for skills - usage messages)
                for (let m = 1; m <= 4; m++) {
                    const msgKey = `message${m}`
                    if (item[msgKey] && typeof item[msgKey] === 'string' && item[msgKey].trim()) {
                        const cached = TRANSLATION_BANK.get(item[msgKey])
                        if (cached) {
                            if (!item[`_original_${msgKey}`]) {
                                item[`_original_${msgKey}`] = item[msgKey]
                            }
                            item[msgKey] = cached.translated
                            count++
                        }
                    }
                }
            }
            return count
        }

        // Patch all data arrays
        if (window.$dataItems) patchCount += patchDataArray(window.$dataItems, 'items')
        if (window.$dataWeapons) patchCount += patchDataArray(window.$dataWeapons, 'weapons')
        if (window.$dataArmors) patchCount += patchDataArray(window.$dataArmors, 'armors')
        if (window.$dataSkills) patchCount += patchDataArray(window.$dataSkills, 'skills')
        if (window.$dataStates) patchCount += patchDataArray(window.$dataStates, 'states')
        if (window.$dataClasses) patchCount += patchDataArray(window.$dataClasses, 'classes')
        if (window.$dataEnemies) patchCount += patchDataArray(window.$dataEnemies, 'enemies')

        // Patch actors
        if (window.$dataActors && targets.actors) {
            patchCount += patchDataArray(window.$dataActors, 'actors')
        }

        // Patch map display names
        if (window.$dataMapInfos && targets.maps) {
            for (const mapInfo of window.$dataMapInfos) {
                if (!mapInfo || !mapInfo.name) continue
                const cached = TRANSLATION_BANK.get(mapInfo.name)
                if (cached) {
                    if (!mapInfo._originalName) {
                        mapInfo._originalName = mapInfo.name
                    }
                    mapInfo.name = cached.translated
                    patchCount++
                }
            }
        }

        // Patch system terms (basic game vocabulary)
        if (window.$dataSystem && targets.system) {
            patchCount += this._patchSystemTerms()
        }

        // Patch variable/switch names (used only in debug/cheat display)
        if (window.$dataSystem) {
            if (targets.variables && window.$dataSystem.variables) {
                for (let i = 0; i < window.$dataSystem.variables.length; i++) {
                    const name = window.$dataSystem.variables[i]
                    if (name && typeof name === 'string' && name.trim()) {
                        const cached = TRANSLATION_BANK.get(name)
                        if (cached) {
                            if (!window.$dataSystem._originalVariables) {
                                window.$dataSystem._originalVariables = window.$dataSystem.variables.slice()
                            }
                            window.$dataSystem.variables[i] = cached.translated
                            patchCount++
                        }
                    }
                }
            }

            if (targets.switches && window.$dataSystem.switches) {
                for (let i = 0; i < window.$dataSystem.switches.length; i++) {
                    const name = window.$dataSystem.switches[i]
                    if (name && typeof name === 'string' && name.trim()) {
                        const cached = TRANSLATION_BANK.get(name)
                        if (cached) {
                            if (!window.$dataSystem._originalSwitches) {
                                window.$dataSystem._originalSwitches = window.$dataSystem.switches.slice()
                            }
                            window.$dataSystem.switches[i] = cached.translated
                            patchCount++
                        }
                    }
                }
            }
        }

        this._dataPatched = true
        console.log(`[InGameTranslator] Patched ${patchCount} game data strings`)

        // Dispatch event so UI panels refresh
        window.dispatchEvent(new CustomEvent('cheat-data-patched', { detail: { patchCount } }))
    }

    /**
     * Patch system terms (menu commands, battle messages, etc.)
     */
    _patchSystemTerms() {
        let count = 0
        const sys = window.$dataSystem

        // System terms - basic vocabulary
        if (sys.terms && sys.terms.basic) {
            if (!sys._originalTermsBasic) {
                sys._originalTermsBasic = sys.terms.basic.slice()
            }
            for (let i = 0; i < sys.terms.basic.length; i++) {
                const text = sys.terms.basic[i]
                if (text && typeof text === 'string' && text.trim()) {
                    const cached = TRANSLATION_BANK.get(text)
                    if (cached) {
                        sys.terms.basic[i] = cached.translated
                        count++
                    }
                }
            }
        }

        // System terms - commands (Fight, Escape, etc.)
        if (sys.terms && sys.terms.commands) {
            if (!sys._originalTermsCommands) {
                sys._originalTermsCommands = sys.terms.commands.slice()
            }
            for (let i = 0; i < sys.terms.commands.length; i++) {
                const text = sys.terms.commands[i]
                if (text && typeof text === 'string' && text.trim()) {
                    const cached = TRANSLATION_BANK.get(text)
                    if (cached) {
                        sys.terms.commands[i] = cached.translated
                        count++
                    }
                }
            }
        }

        // System terms - params (Max HP, Attack, etc.)
        if (sys.terms && sys.terms.params) {
            if (!sys._originalTermsParams) {
                sys._originalTermsParams = sys.terms.params.slice()
            }
            for (let i = 0; i < sys.terms.params.length; i++) {
                const text = sys.terms.params[i]
                if (text && typeof text === 'string' && text.trim()) {
                    const cached = TRANSLATION_BANK.get(text)
                    if (cached) {
                        sys.terms.params[i] = cached.translated
                        count++
                    }
                }
            }
        }

        // System terms - messages (battle messages like "%1 attacks!", "A critical hit!", etc.)
        if (sys.terms && sys.terms.messages) {
            if (!sys._originalTermsMessages) {
                sys._originalTermsMessages = Object.assign({}, sys.terms.messages)
            }
            for (const key in sys.terms.messages) {
                const text = sys.terms.messages[key]
                if (text && typeof text === 'string' && text.trim()) {
                    const cached = TRANSLATION_BANK.get(text)
                    if (cached) {
                        sys.terms.messages[key] = cached.translated
                        count++
                    }
                }
            }
        }

        // MZ uses different structure: sys.uiArea, etc.
        // Also handle gameTitle
        if (sys.gameTitle) {
            const cached = TRANSLATION_BANK.get(sys.gameTitle)
            if (cached) {
                if (!sys._originalGameTitle) sys._originalGameTitle = sys.gameTitle
                sys.gameTitle = cached.translated
                count++
            }
        }

        // Armor/weapon/skill types
        const typeArrays = ['armorTypes', 'weaponTypes', 'skillTypes', 'elements']
        for (const arrayName of typeArrays) {
            if (sys[arrayName]) {
                if (!sys[`_original_${arrayName}`]) {
                    sys[`_original_${arrayName}`] = sys[arrayName].slice()
                }
                for (let i = 0; i < sys[arrayName].length; i++) {
                    const text = sys[arrayName][i]
                    if (text && typeof text === 'string' && text.trim()) {
                        const cached = TRANSLATION_BANK.get(text)
                        if (cached) {
                            sys[arrayName][i] = cached.translated
                            count++
                        }
                    }
                }
            }
        }

        return count
    }

    /**
     * Revert all patched data back to original Japanese text.
     * Called when translation is disabled.
     */
    revertGameData() {
        const revertDataArray = (dataArray) => {
            if (!dataArray) return
            for (const item of dataArray) {
                if (!item) continue
                if (item._originalName) { item.name = item._originalName; delete item._originalName }
                if (item._originalDescription) { item.description = item._originalDescription; delete item._originalDescription }
                if (item._originalNickname) { item.nickname = item._originalNickname; delete item._originalNickname }
                if (item._originalProfile) { item.profile = item._originalProfile; delete item._originalProfile }
                for (let m = 1; m <= 4; m++) {
                    const key = `_original_message${m}`
                    if (item[key]) { item[`message${m}`] = item[key]; delete item[key] }
                }
            }
        }

        revertDataArray(window.$dataItems)
        revertDataArray(window.$dataWeapons)
        revertDataArray(window.$dataArmors)
        revertDataArray(window.$dataSkills)
        revertDataArray(window.$dataStates)
        revertDataArray(window.$dataClasses)
        revertDataArray(window.$dataEnemies)
        revertDataArray(window.$dataActors)

        // Revert map names
        if (window.$dataMapInfos) {
            for (const mapInfo of window.$dataMapInfos) {
                if (mapInfo && mapInfo._originalName) {
                    mapInfo.name = mapInfo._originalName
                    delete mapInfo._originalName
                }
            }
        }

        // Revert system terms
        if (window.$dataSystem) {
            const sys = window.$dataSystem
            if (sys._originalTermsBasic) { sys.terms.basic = sys._originalTermsBasic; delete sys._originalTermsBasic }
            if (sys._originalTermsCommands) { sys.terms.commands = sys._originalTermsCommands; delete sys._originalTermsCommands }
            if (sys._originalTermsParams) { sys.terms.params = sys._originalTermsParams; delete sys._originalTermsParams }
            if (sys._originalTermsMessages) { sys.terms.messages = sys._originalTermsMessages; delete sys._originalTermsMessages }
            if (sys._originalGameTitle) { sys.gameTitle = sys._originalGameTitle; delete sys._originalGameTitle }
            if (sys._originalVariables) { sys.variables = sys._originalVariables; delete sys._originalVariables }
            if (sys._originalSwitches) { sys.switches = sys._originalSwitches; delete sys._originalSwitches }

            const typeArrays = ['armorTypes', 'weaponTypes', 'skillTypes', 'elements']
            for (const arrayName of typeArrays) {
                if (sys[`_original_${arrayName}`]) {
                    sys[arrayName] = sys[`_original_${arrayName}`]
                    delete sys[`_original_${arrayName}`]
                }
            }
        }

        this._dataPatched = false
        console.log('[InGameTranslator] Game data reverted to original text')
    }

    // ========================================================================
    // PHASE 2: Runtime Hooks — Intercept text rendering for event dialogue
    // These use CACHE-ONLY lookups (no API calls during gameplay)
    // ========================================================================

    /**
     * Hook Window_Message to translate dialogue text before display.
     * This handles all "Show Text" event commands.
     */
    _hookWindowMessage() {
        const self = this
        const _Window_Message_startMessage = Window_Message.prototype.startMessage

        Window_Message.prototype.startMessage = function () {
            if (TRANSLATE_SETTINGS.isEnabled()) {
                // Translate each line of the dialogue
                const texts = $gameMessage._texts
                for (let i = 0; i < texts.length; i++) {
                    if (texts[i] && typeof texts[i] === 'string' && texts[i].trim()) {
                        // Strip escape codes for lookup, but preserve them for display
                        const plainText = self._stripEscapeCodes(texts[i])
                        const cached = TRANSLATION_BANK.get(plainText)
                        if (cached) {
                            texts[i] = cached.translated
                        } else {
                            // Try full text with escape codes
                            const cachedFull = TRANSLATION_BANK.get(texts[i])
                            if (cachedFull) {
                                texts[i] = cachedFull.translated
                            }
                        }
                    }
                }

                // Also translate the speaker name (face name display / name window)
                if ($gameMessage._speakerName) {
                    const cached = TRANSLATION_BANK.get($gameMessage._speakerName)
                    if (cached) {
                        $gameMessage._speakerName = cached.translated
                    }
                }
                // MZ has _speakerName, MV may use name window plugins differently
            }

            _Window_Message_startMessage.call(this)
        }
    }

    /**
     * Hook Window_Base.drawText to translate any remaining text drawn to screen.
     * This is a fallback catch-all for text not covered by data patching.
     */
    _hookDrawText() {
        const _Window_Base_drawText = Window_Base.prototype.drawText

        Window_Base.prototype.drawText = function (text, x, y, maxWidth, align) {
            if (TRANSLATE_SETTINGS.isEnabled() && typeof text === 'string' && text.trim()) {
                const cached = TRANSLATION_BANK.get(text)
                if (cached) {
                    text = cached.translated
                }
            }
            _Window_Base_drawText.call(this, text, x, y, maxWidth, align)
        }
    }

    /**
     * Hook Window_Base.drawTextEx to translate rich text (with escape codes).
     */
    _hookDrawTextEx() {
        const self = this
        const _Window_Base_drawTextEx = Window_Base.prototype.drawTextEx

        Window_Base.prototype.drawTextEx = function (text, x, y, width) {
            if (TRANSLATE_SETTINGS.isEnabled() && typeof text === 'string' && text.trim()) {
                const plainText = self._stripEscapeCodes(text)
                const cached = TRANSLATION_BANK.get(plainText)
                if (cached) {
                    text = cached.translated
                } else {
                    // Try full text with escape codes
                    const cachedFull = TRANSLATION_BANK.get(text)
                    if (cachedFull) {
                        text = cachedFull.translated
                    }
                }
            }
            return _Window_Base_drawTextEx.call(this, text, x, y, width)
        }
    }

    /**
     * Hook Window_Base.drawItemName to translate item/weapon/armor names
     * displayed with their icons in game menus.
     * Note: With data patching, this is mostly redundant but acts as a safety net.
     */
    _hookDrawItemName() {
        const _Window_Base_drawItemName = Window_Base.prototype.drawItemName

        Window_Base.prototype.drawItemName = function (item, x, y, width) {
            if (TRANSLATE_SETTINGS.isEnabled() && item && item.name) {
                const cached = TRANSLATION_BANK.get(item.name)
                if (cached && !item._originalName) {
                    // Temporarily swap for drawing if not already patched
                    const original = item.name
                    item.name = cached.translated
                    _Window_Base_drawItemName.call(this, item, x, y, width)
                    item.name = original
                    return
                }
            }
            _Window_Base_drawItemName.call(this, item, x, y, width)
        }
    }

    /**
     * Hook Window_ChoiceList to translate in-game choices.
     */
    _hookChoiceList() {
        const _Window_ChoiceList_makeCommandList = Window_ChoiceList.prototype.makeCommandList

        Window_ChoiceList.prototype.makeCommandList = function () {
            _Window_ChoiceList_makeCommandList.call(this)

            if (TRANSLATE_SETTINGS.isEnabled() && this._list) {
                for (const command of this._list) {
                    if (command.name && typeof command.name === 'string' && command.name.trim()) {
                        const cached = TRANSLATION_BANK.get(command.name)
                        if (cached) {
                            command.name = cached.translated
                        }
                    }
                }
            }
        }
    }

    /**
     * Hook Game_Actor and Game_Enemy name methods for battle display.
     */
    _hookActorEnemyNames() {
        // Game_Actor.prototype.name — already handled by $dataActors patching
        // but we add a safety net for runtime-created actors or name changes

        const _Game_Actor_name = Game_Actor.prototype.name
        Game_Actor.prototype.name = function () {
            const originalName = _Game_Actor_name.call(this)
            if (TRANSLATE_SETTINGS.isEnabled() && originalName) {
                const cached = TRANSLATION_BANK.get(originalName)
                if (cached) return cached.translated
            }
            return originalName
        }

        const _Game_Actor_nickname = Game_Actor.prototype.nickname
        if (_Game_Actor_nickname) {
            Game_Actor.prototype.nickname = function () {
                const originalNick = _Game_Actor_nickname.call(this)
                if (TRANSLATE_SETTINGS.isEnabled() && originalNick) {
                    const cached = TRANSLATION_BANK.get(originalNick)
                    if (cached) return cached.translated
                }
                return originalNick
            }
        }

        const _Game_Actor_profile = Game_Actor.prototype.profile
        if (_Game_Actor_profile) {
            Game_Actor.prototype.profile = function () {
                const originalProfile = _Game_Actor_profile.call(this)
                if (TRANSLATE_SETTINGS.isEnabled() && originalProfile) {
                    const cached = TRANSLATION_BANK.get(originalProfile)
                    if (cached) return cached.translated
                }
                return originalProfile
            }
        }

        // Enemy names
        const _Game_Enemy_name = Game_Enemy.prototype.name
        if (_Game_Enemy_name) {
            Game_Enemy.prototype.name = function () {
                const originalName = _Game_Enemy_name.call(this)
                if (TRANSLATE_SETTINGS.isEnabled() && originalName) {
                    const cached = TRANSLATION_BANK.get(originalName)
                    if (cached) return cached.translated
                }
                return originalName
            }
        }
    }

    /**
     * Hook Window_BattleLog for battle action messages.
     */
    _hookBattleLog() {
        // Hook addText to translate battle messages
        const _Window_BattleLog_addText = Window_BattleLog.prototype.addText

        Window_BattleLog.prototype.addText = function (text) {
            if (TRANSLATE_SETTINGS.isEnabled() && typeof text === 'string' && text.trim()) {
                const cached = TRANSLATION_BANK.get(text)
                if (cached) {
                    text = cached.translated
                }
            }
            _Window_BattleLog_addText.call(this, text)
        }
    }

    /**
     * Hook scroll text (story narration screens).
     */
    _hookScrollText() {
        const _Window_ScrollText_startMessage = Window_ScrollText.prototype.startMessage

        if (_Window_ScrollText_startMessage) {
            Window_ScrollText.prototype.startMessage = function () {
                if (TRANSLATE_SETTINGS.isEnabled()) {
                    const texts = $gameMessage._texts
                    for (let i = 0; i < texts.length; i++) {
                        if (texts[i] && typeof texts[i] === 'string' && texts[i].trim()) {
                            const cached = TRANSLATION_BANK.get(texts[i])
                            if (cached) {
                                texts[i] = cached.translated
                            }
                        }
                    }
                }
                _Window_ScrollText_startMessage.call(this)
            }
        }
    }

    /**
     * Hook shop windows to translate item prices / descriptions.
     */
    _hookShopWindows() {
        // Window_ShopStatus and Window_ShopBuy already use item.name/description
        // which we patch via data arrays. But we add hooks for any custom text.

        if (typeof Window_ShopBuy !== 'undefined') {
            const _Window_ShopBuy_makeItemList = Window_ShopBuy.prototype.makeItemList

            if (_Window_ShopBuy_makeItemList) {
                // Shop items are already patched via $data arrays, no extra work needed
                // This is here as a placeholder for future enhancements
            }
        }

        // Map display name (shows when entering a new map area)
        if (typeof Window_MapName !== 'undefined') {
            const _Window_MapName_refresh = Window_MapName.prototype.refresh

            if (_Window_MapName_refresh) {
                Window_MapName.prototype.refresh = function () {
                    // Map name comes from $dataMap.displayName or $gameMap.displayName()
                    // We hook displayName to translate it
                    _Window_MapName_refresh.call(this)
                }
            }
        }

        // Hook $gameMap.displayName for map name popups
        try {
            const _Game_Map_displayName = Game_Map.prototype.displayName
            Game_Map.prototype.displayName = function () {
                const name = _Game_Map_displayName.call(this)
                if (TRANSLATE_SETTINGS.isEnabled() && name) {
                    const cached = TRANSLATION_BANK.get(name)
                    if (cached) return cached.translated
                }
                return name
            }
        } catch (e) {
            // Game_Map may not be available yet during early init
        }
    }

    /**
     * Hook menu command windows to translate menu options.
     */
    _hookMenuCommands() {
        // Window_MenuCommand, Window_TitleCommand, Window_Options
        // These read from $dataSystem.terms.commands which we already patch.
        // Additional safety net for custom menu text:

        const hookCommandWindow = (WindowClass, label) => {
            if (typeof WindowClass === 'undefined') return

            const _makeCommandList = WindowClass.prototype.makeCommandList
            if (!_makeCommandList) return

            WindowClass.prototype.makeCommandList = function () {
                _makeCommandList.call(this)

                if (TRANSLATE_SETTINGS.isEnabled() && this._list) {
                    for (const command of this._list) {
                        if (command.name && typeof command.name === 'string' && command.name.trim()) {
                            const cached = TRANSLATION_BANK.get(command.name)
                            if (cached) {
                                command.name = cached.translated
                            }
                        }
                    }
                }
            }
        }

        // All major command windows
        try { hookCommandWindow(Window_MenuCommand, 'MenuCommand') } catch (e) {}
        try { hookCommandWindow(Window_TitleCommand, 'TitleCommand') } catch (e) {}
        try { hookCommandWindow(Window_Options, 'Options') } catch (e) {}
        try { hookCommandWindow(Window_GameEnd, 'GameEnd') } catch (e) {}
        try { hookCommandWindow(Window_PartyCommand, 'PartyCommand') } catch (e) {}
        try { hookCommandWindow(Window_ActorCommand, 'ActorCommand') } catch (e) {}
        try { hookCommandWindow(Window_SkillType, 'SkillType') } catch (e) {}
        try { hookCommandWindow(Window_EquipCommand, 'EquipCommand') } catch (e) {}
        try { hookCommandWindow(Window_ShopCommand, 'ShopCommand') } catch (e) {}
        try { hookCommandWindow(Window_ItemCategory, 'ItemCategory') } catch (e) {}
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Strip RPG Maker escape codes from text for translation bank lookup.
     * Escape codes: \C[n], \I[n], \V[n], \N[n], \G, \{, \}, etc.
     */
    _stripEscapeCodes(text) {
        if (!text || typeof text !== 'string') return text
        return text
            .replace(/\\C\[\d+\]/gi, '')
            .replace(/\\I\[\d+\]/gi, '')
            .replace(/\\V\[\d+\]/gi, '')
            .replace(/\\N\[\d+\]/gi, '')
            .replace(/\\P\[\d+\]/gi, '')
            .replace(/\\G/gi, '')
            .replace(/\\{/g, '')
            .replace(/\\}/g, '')
            .replace(/\\!/g, '')
            .replace(/\\\./g, '')
            .replace(/\\\|/g, '')
            .replace(/\\>/g, '')
            .replace(/\\</g, '')
            .replace(/\\\^/g, '')
            .replace(/\x1b[A-Za-z]\[\d+\]/g, '')
            .replace(/\x1b[A-Za-z]/g, '')
            .trim()
    }

    /**
     * Check if data has been patched with translations
     */
    isDataPatched() {
        return this._dataPatched
    }
}

// Singleton instance
export const IN_GAME_TRANSLATOR = new InGameTranslator()
