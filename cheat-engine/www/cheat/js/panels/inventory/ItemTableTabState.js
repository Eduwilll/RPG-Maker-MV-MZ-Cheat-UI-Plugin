// @ts-check

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
      const tableItem = asTableData(item);
      tableItem._item = item;
      tableItem.amount = $gameParty.numItems(item);

      return tableItem;
    });

  return {
    tableHeaders,
    tableItems,
  };
}
