// @ts-check

// customize mv functions
import { MessageCheat } from "../js/CheatHelper.js";
import { IN_GAME_TRANSLATOR } from "../js/InGameTranslator.js";

/**
 * Apply runtime patches needed for the overlay to coexist with RPG Maker.
 *
 * @param {{ show: boolean }} mainComponent
 * @returns {void}
 */
export function customizeRPGMakerFunctions(mainComponent) {
  const touchInput = /** @type {MvTouchInputLike & MzTouchInputLike} */ (
    /** @type {any} */ (TouchInput)
  );

  if (Utils.RPGMAKER_NAME === "MV") {
    // WARN: directly changing engine code can be dangerous
    // remove preventDefault
    touchInput._onWheel = function () {
      const wheelEvent = /** @type {WheelEvent} */ (event);
      this._events.wheelX += wheelEvent.deltaX;
      this._events.wheelY += wheelEvent.deltaY;
    };

    // ignore click event when cheat modal shown and click inside cheat modal
    const TouchInput_onMouseDown = touchInput._onMouseDown;
    touchInput._onMouseDown = function (event) {
      if (mainComponent.show) {
        const bcr = document
          .querySelector("#cheat-modal")
          .getBoundingClientRect();
        if (
          bcr.left <= event.clientX &&
          event.clientX <= bcr.left + bcr.width &&
          bcr.top <= event.clientY &&
          event.clientY <= bcr.top + bcr.height
        ) {
          return;
        }
      }

      TouchInput_onMouseDown.call(this, event);
    };
  } else {
    // MZ Settings
    // WARN: directly changing engine code can be dangerous
    // remove preventDefault
    touchInput._onWheel = function () {
      const wheelEvent = /** @type {WheelEvent} */ (event);
      this._newState.wheelX += wheelEvent.deltaX;
      this._newState.wheelY += wheelEvent.deltaY;
    };

    // ignore click event when cheat modal shown and click inside cheat modal
    const TouchInput_onMouseDown = touchInput._onMouseDown;
    touchInput._onMouseDown = function (event) {
      if (mainComponent.show) {
        const bcr = document
          .querySelector("#cheat-modal")
          .getBoundingClientRect();
        if (
          bcr.left <= event.clientX &&
          event.clientX <= bcr.left + bcr.width &&
          bcr.top <= event.clientY &&
          event.clientY <= bcr.top + bcr.height
        ) {
          return;
        }
      }

      TouchInput_onMouseDown.call(this, event);
    };
  }

  MessageCheat.initialize();
  IN_GAME_TRANSLATOR.initialize();
}
