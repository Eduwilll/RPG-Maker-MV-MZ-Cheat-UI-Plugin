import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";
export function readLocksState() {
  const runtime = getFeatureRuntime();
  return runtime ? runtime.locks.list() : [];
}
export function favoriteSort(rows, targetForRow) {
  const runtime = getFeatureRuntime();
  return runtime ? runtime.locks.sortFavorites(rows, targetForRow) : rows;
}
export function sortWithFavorites(rows, sortBy, sortDesc, targetForRow) {
  const sorted = rows.slice();
  if (sortBy && sortBy.length)
    sorted.sort((left, right) => {
      for (let i = 0; i < sortBy.length; i++) {
        const a = left[sortBy[i]],
          b = right[sortBy[i]];
        const value =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a === undefined ? "" : a).localeCompare(
                String(b === undefined ? "" : b),
                undefined,
                { numeric: true, sensitivity: "base" },
              );
        if (value) return sortDesc && sortDesc[i] ? -value : value;
      }
      return 0;
    });
  return favoriteSort(sorted, targetForRow);
}
