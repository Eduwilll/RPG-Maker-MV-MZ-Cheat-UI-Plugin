// @ts-check

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

import { TRANSLATION_BANK, TRANSLATE_SETTINGS } from "./TranslateHelper.js";
import {
  applyTranslationsToGameData,
  revertGameData,
} from "./InGameTranslationData.js";
import { translateCommandListNames } from "./InGameTranslationLists.js";
import { findCachedTranslatedText } from "./InGameTranslationText.js";

class InGameTranslator {
  constructor() {
    /** @type {boolean} */
    this._initialized = false;
    /** @type {boolean} */
    this._dataPatched = false;
    /** @type {Map<string, string>} */
    this._originalData = new Map(); // Backup original strings for undo
  }

  /**
   * Initialize all RPG Maker hooks. Called once during plugin setup.
   */
  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    console.log("[InGameTranslator] Initializing in-game translation hooks...");

    this._hookWindowMessage();
    this._hookDrawText();
    this._hookDrawTextEx();
    this._hookDrawItemName();
    this._hookChoiceList();
    this._hookActorEnemyNames();
    this._hookBattleLog();
    this._hookScrollText();
    this._hookShopWindows();
    this._hookMenuCommands();

    // Listen for translation completion to patch game data
    window.addEventListener("cheat-translate-finish", () => {
      console.log(
        "[InGameTranslator] Translation finished, patching game data...",
      );
      this.applyTranslationsToGameData();
    });

    console.log("[InGameTranslator] All hooks installed.");
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
    if (!TRANSLATE_SETTINGS.isEnabled()) return;
    const patchCount = applyTranslationsToGameData();
    this._dataPatched = true;
    console.log(`[InGameTranslator] Patched ${patchCount} game data strings`);
  }

  /**
   * Revert all patched data back to original Japanese text.
   * Called when translation is disabled.
   */
  revertGameData() {
    revertGameData();
    this._dataPatched = false;
    console.log("[InGameTranslator] Game data reverted to original text");
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
    const _Window_Message_startMessage = Window_Message.prototype.startMessage;

    Window_Message.prototype.startMessage = function () {
      const gameMessage = /** @type {any} */ ($gameMessage);

      if (TRANSLATE_SETTINGS.isEnabled()) {
        // Translate each line of the dialogue
        const texts = gameMessage._texts;
        for (let i = 0; i < texts.length; i++) {
          if (texts[i] && typeof texts[i] === "string" && texts[i].trim()) {
            texts[i] = findCachedTranslatedText(texts[i], TRANSLATION_BANK);
          }
        }

        // Also translate the speaker name (face name display / name window)
        if (gameMessage._speakerName) {
          const cached = TRANSLATION_BANK.get(gameMessage._speakerName);
          if (cached) {
            gameMessage._speakerName = cached.translated;
          }
        }
        // MZ has _speakerName, MV may use name window plugins differently
      }

      _Window_Message_startMessage.call(this);
    };
  }

  /**
   * Hook Window_Base.drawText to translate any remaining text drawn to screen.
   * This is a fallback catch-all for text not covered by data patching.
   */
  _hookDrawText() {
    const _Window_Base_drawText = Window_Base.prototype.drawText;

    Window_Base.prototype.drawText = function (text, x, y, maxWidth, align) {
      if (
        TRANSLATE_SETTINGS.isEnabled() &&
        typeof text === "string" &&
        text.trim()
      ) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          text = cached.translated;
        }
      }
      _Window_Base_drawText.call(this, text, x, y, maxWidth, align);
    };
  }

  /**
   * Hook Window_Base.drawTextEx to translate rich text (with escape codes).
   */
  _hookDrawTextEx() {
    const _Window_Base_drawTextEx = Window_Base.prototype.drawTextEx;

    Window_Base.prototype.drawTextEx = function (text, x, y, width) {
      if (
        TRANSLATE_SETTINGS.isEnabled() &&
        typeof text === "string" &&
        text.trim()
      ) {
        text = findCachedTranslatedText(text, TRANSLATION_BANK);
      }
      return _Window_Base_drawTextEx.call(this, text, x, y, width);
    };
  }

  /**
   * Hook Window_Base.drawItemName to translate item/weapon/armor names
   * displayed with their icons in game menus.
   * Note: With data patching, this is mostly redundant but acts as a safety net.
   */
  _hookDrawItemName() {
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;

    Window_Base.prototype.drawItemName = function (item, x, y, width) {
      if (TRANSLATE_SETTINGS.isEnabled() && item && item.name) {
        const cached = TRANSLATION_BANK.get(item.name);
        if (cached && !item._originalName) {
          // Temporarily swap for drawing if not already patched
          const original = item.name;
          item.name = cached.translated;
          _Window_Base_drawItemName.call(this, item, x, y, width);
          item.name = original;
          return;
        }
      }
      _Window_Base_drawItemName.call(this, item, x, y, width);
    };
  }

  /**
   * Hook Window_ChoiceList to translate in-game choices.
   */
  _hookChoiceList() {
    const _Window_ChoiceList_makeCommandList =
      Window_ChoiceList.prototype.makeCommandList;

    Window_ChoiceList.prototype.makeCommandList = function () {
      _Window_ChoiceList_makeCommandList.call(this);

      if (TRANSLATE_SETTINGS.isEnabled() && this._list) {
        translateCommandListNames(this._list, TRANSLATION_BANK);
      }
    };
  }

  /**
   * Hook Game_Actor and Game_Enemy name methods for battle display.
   */
  _hookActorEnemyNames() {
    // Game_Actor.prototype.name — already handled by $dataActors patching
    // but we add a safety net for runtime-created actors or name changes

    const _Game_Actor_name = Game_Actor.prototype.name;
    Game_Actor.prototype.name = function () {
      const originalName = _Game_Actor_name.call(this);
      if (TRANSLATE_SETTINGS.isEnabled() && originalName) {
        const cached = TRANSLATION_BANK.get(originalName);
        if (cached) return cached.translated;
      }
      return originalName;
    };

    const _Game_Actor_nickname = Game_Actor.prototype.nickname;
    if (_Game_Actor_nickname) {
      Game_Actor.prototype.nickname = function () {
        const originalNick = _Game_Actor_nickname.call(this);
        if (TRANSLATE_SETTINGS.isEnabled() && originalNick) {
          const cached = TRANSLATION_BANK.get(originalNick);
          if (cached) return cached.translated;
        }
        return originalNick;
      };
    }

    const _Game_Actor_profile = Game_Actor.prototype.profile;
    if (_Game_Actor_profile) {
      Game_Actor.prototype.profile = function () {
        const originalProfile = _Game_Actor_profile.call(this);
        if (TRANSLATE_SETTINGS.isEnabled() && originalProfile) {
          const cached = TRANSLATION_BANK.get(originalProfile);
          if (cached) return cached.translated;
        }
        return originalProfile;
      };
    }

    // Enemy names
    const _Game_Enemy_name = Game_Enemy.prototype.name;
    if (_Game_Enemy_name) {
      Game_Enemy.prototype.name = function () {
        const originalName = _Game_Enemy_name.call(this);
        if (TRANSLATE_SETTINGS.isEnabled() && originalName) {
          const cached = TRANSLATION_BANK.get(originalName);
          if (cached) return cached.translated;
        }
        return originalName;
      };
    }
  }

  /**
   * Hook Window_BattleLog for battle action messages.
   */
  _hookBattleLog() {
    // Hook addText to translate battle messages
    const _Window_BattleLog_addText = Window_BattleLog.prototype.addText;

    Window_BattleLog.prototype.addText = function (text) {
      if (
        TRANSLATE_SETTINGS.isEnabled() &&
        typeof text === "string" &&
        text.trim()
      ) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          text = cached.translated;
        }
      }
      _Window_BattleLog_addText.call(this, text);
    };
  }

  /**
   * Hook scroll text (story narration screens).
   */
  _hookScrollText() {
    const _Window_ScrollText_startMessage =
      Window_ScrollText.prototype.startMessage;

    if (_Window_ScrollText_startMessage) {
      Window_ScrollText.prototype.startMessage = function () {
        const gameMessage = /** @type {any} */ ($gameMessage);

        if (TRANSLATE_SETTINGS.isEnabled()) {
          const texts = gameMessage._texts;
          for (let i = 0; i < texts.length; i++) {
            if (texts[i] && typeof texts[i] === "string" && texts[i].trim()) {
              const cached = TRANSLATION_BANK.get(texts[i]);
              if (cached) {
                texts[i] = cached.translated;
              }
            }
          }
        }
        _Window_ScrollText_startMessage.call(this);
      };
    }
  }

  /**
   * Hook shop windows to translate item prices / descriptions.
   */
  _hookShopWindows() {
    // Window_ShopStatus and Window_ShopBuy already use item.name/description
    // which we patch via data arrays. But we add hooks for any custom text.

    if (typeof Window_ShopBuy !== "undefined") {
      const _Window_ShopBuy_makeItemList =
        Window_ShopBuy.prototype.makeItemList;

      if (_Window_ShopBuy_makeItemList) {
        // Shop items are already patched via $data arrays, no extra work needed
        // This is here as a placeholder for future enhancements
      }
    }

    // Map display name (shows when entering a new map area)
    if (typeof Window_MapName !== "undefined") {
      const _Window_MapName_refresh = Window_MapName.prototype.refresh;

      if (_Window_MapName_refresh) {
        Window_MapName.prototype.refresh = function () {
          // Map name comes from $dataMap.displayName or $gameMap.displayName()
          // We hook displayName to translate it
          _Window_MapName_refresh.call(this);
        };
      }
    }

    // Hook $gameMap.displayName for map name popups
    try {
      const _Game_Map_displayName = Game_Map.prototype.displayName;
      Game_Map.prototype.displayName = function () {
        const name = _Game_Map_displayName.call(this);
        if (TRANSLATE_SETTINGS.isEnabled() && name) {
          const cached = TRANSLATION_BANK.get(name);
          if (cached) return cached.translated;
        }
        return name;
      };
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
      if (typeof WindowClass === "undefined") return;

      const _makeCommandList = WindowClass.prototype.makeCommandList;
      if (!_makeCommandList) return;

      WindowClass.prototype.makeCommandList = function () {
        _makeCommandList.call(this);

        if (TRANSLATE_SETTINGS.isEnabled() && this._list) {
          translateCommandListNames(this._list, TRANSLATION_BANK);
        }
      };
    };

    // All major command windows
    try {
      hookCommandWindow(Window_MenuCommand, "MenuCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_TitleCommand, "TitleCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_Options, "Options");
    } catch (e) {}
    try {
      hookCommandWindow(Window_GameEnd, "GameEnd");
    } catch (e) {}
    try {
      hookCommandWindow(Window_PartyCommand, "PartyCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_ActorCommand, "ActorCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_SkillType, "SkillType");
    } catch (e) {}
    try {
      hookCommandWindow(Window_EquipCommand, "EquipCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_ShopCommand, "ShopCommand");
    } catch (e) {}
    try {
      hookCommandWindow(Window_ItemCategory, "ItemCategory");
    } catch (e) {}
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Check if data has been patched with translations
   */
  isDataPatched() {
    return this._dataPatched;
  }
}

// Singleton instance
export const IN_GAME_TRANSLATOR = new InGameTranslator();
