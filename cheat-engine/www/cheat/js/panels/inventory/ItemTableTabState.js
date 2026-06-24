// @ts-check

import { getInventoryItemKind } from "./InventoryPanelState.js";

/**
 * @param {Array<any>} headers
 * @param {Array<any>} items
 * @param {(item: any) => any} asTableData
 */
export function readItemTableTabState(headers, items, asTableData) {
  const tableHeaders = headers.slice(0);
  tableHeaders.push({
    text: "Price",
    value: "price",
  });
  tableHeaders.push({
    text: "Amount",
    value: "amount",
  });

  const tableItems = items
    .filter((item) => !!item)
    .map((item) => {
      const gameItem = resolveInventoryTableItem(item);
      if (!gameItem) {
        return null;
      }

      const tableItem = asTableData(gameItem);
      tableItem._itemId = gameItem.id;
      tableItem._itemKind = getInventoryItemKind(gameItem);
      tableItem.amount = $gameParty.numItems(gameItem);

      return tableItem;
    })
    .filter((item) => !!item);

  return {
    tableHeaders,
    tableItems,
  };
}

/**
 * Resolve the live RPG Maker database object only when mutating inventory.
 * Keeping the object out of Vue state prevents cross-window prototype pollution
 * in older MV/NW.js games and Yanfly item category plugins.
 *
 * @param {{ _itemKind?: string, _itemId?: number }} tableItem
 * @returns {any}
 */
export function resolveInventoryTableItem(tableItem) {
  const id = Number(tableItem && tableItem._itemId) || 0;

  switch (tableItem && tableItem._itemKind) {
    case "item":
      return $dataItems && $dataItems[id];
    case "weapon":
      return $dataWeapons && $dataWeapons[id];
    case "armor":
      return $dataArmors && $dataArmors[id];
    default:
      return null;
  }
}
