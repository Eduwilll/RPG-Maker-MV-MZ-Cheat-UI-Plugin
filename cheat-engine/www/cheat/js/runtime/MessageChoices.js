import { decodeMessage, playerMessageMetadata } from "./MessageText.js";
import { captureMessageStyle } from "./MessagePresentation.js";

/** Observe confirmed engine choices; never replace or invoke the event callback. */
export function createMessageChoices(game, capture) {
  const pending = new WeakMap();
  return {
    clear(queue) {
      if (queue) pending.delete(queue);
    },
    install(proto) {
      const setChoices = proto.setChoices;
      const onChoice = proto.onChoice;
      if (typeof setChoices !== "function" || typeof onChoice !== "function")
        return;
      proto.setChoices = function (values) {
        const result = setChoices.apply(this, arguments);
        pending.delete(this);
        try {
          const actual =
            typeof this.choices === "function" ? this.choices() : values;
          if (Array.isArray(actual))
            pending.set(
              this,
              actual.map((raw) => ({
                raw: String(raw),
                decoded: decodeMessage(game, raw),
              })),
            );
        } catch (error) {
          /* Optional history must not prevent a choice prompt. */
        }
        return result;
      };
      proto.onChoice = function (index) {
        const options = pending.get(this);
        pending.delete(this);
        let selected;
        let commit;
        try {
          if (
            (!game.$gameMessage || this === game.$gameMessage) &&
            options &&
            Number.isInteger(index) &&
            index >= 0 &&
            index < options.length
          ) {
            const scene = game.SceneManager && game.SceneManager._scene;
            const messageWindow = scene && scene._messageWindow;
            selected = Object.assign({}, options[index], {
              metadata: playerMessageMetadata(game),
              textStyle: captureMessageStyle(
                messageWindow && messageWindow._choiceWindow,
              ),
            });
          }
        } catch (error) {
          /* Preserve the normal callback even if metadata fails. */
        }
        if (selected) {
          try {
            commit = capture(this, selected);
          } catch (error) {
            /* History cannot block the callback. */
          }
        }
        const result = onChoice.apply(this, arguments);
        if (commit) {
          try {
            commit();
          } catch (error) {
            /* Never interrupt event execution. */
          }
        }
        return result;
      };
    },
  };
}
