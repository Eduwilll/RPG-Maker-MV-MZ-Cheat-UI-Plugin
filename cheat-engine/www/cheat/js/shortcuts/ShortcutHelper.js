import { MAX_KEY_CODE, UNASSIGNED_KEY_CODE } from "../KeyCodes.js";

export class ShortcutMap {
  constructor() {
    this.actionTable = new Array(2 * 2 * 2 * 2 * (MAX_KEY_CODE + 1));
  }

  static toInt(booleanVar) {
    return booleanVar === true ? 1 : 0;
  }

  static tableIndex(key) {
    return (
      this.toInt(key.ctrl) +
      2 * this.toInt(key.alt) +
      4 * this.toInt(key.shift) +
      8 * this.toInt(key.meta) +
      16 * key.code
    );
  }

  register(key, value, enterAction, repeatAction, leaveAction) {
    if (!key || key.isEmpty()) {
      return;
    }

    this.actionTable[ShortcutMap.tableIndex(key)] = {
      value: value,
      enterAction: enterAction,
      repeatAction: repeatAction,
      leaveAction: leaveAction,
    };
  }

  remove(key) {
    if (!key || key.isEmpty()) {
      return null;
    }

    const idx = ShortcutMap.tableIndex(key);
    const removed = this.actionTable[idx];

    this.actionTable[idx] = null;

    if (removed) {
      return removed.value;
    }

    return null;
  }

  getValue(key) {
    const item = this.getItem(key);

    if (item) {
      return item.value;
    }

    return null;
  }

  runEnterAction(key) {
    const item = this.getItem(key);

    if (item) {
      item.enterAction();
      return true;
    }

    return false;
  }

  runRepeatAction(key) {
    const item = this.getItem(key);

    if (item) {
      item.repeatAction();
      return true;
    }

    return false;
  }

  runLeaveAction(key) {
    const item = this.getItem(key);

    if (item) {
      item.leaveAction();
      return true;
    }

    return false;
  }

  getItem(key) {
    const index = ShortcutMap.tableIndex(key);

    if (index < this.actionTable.length && this.actionTable[index]) {
      return this.actionTable[index];
    }

    return null;
  }
}
