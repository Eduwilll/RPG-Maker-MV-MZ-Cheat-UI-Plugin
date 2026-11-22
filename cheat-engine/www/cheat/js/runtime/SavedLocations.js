import { KEY_VALUE_STORAGE } from "../storage/KeyValueStorage.js";
import { createLocationStore } from "../panels/map/SavedLocationState.js";
export const SAVED_LOCATIONS = createLocationStore(KEY_VALUE_STORAGE, () => {
  window.dispatchEvent(new CustomEvent("cheat-locations-change"));
});
