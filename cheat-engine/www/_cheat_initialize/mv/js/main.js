//=============================================================================
// main.js
//=============================================================================

PluginManager.setup($plugins);

// import cheat js file
PluginManager._path = "js/plugins/";
try {
  PluginManager.loadScript("../../cheat/init/import.js");
} catch (e) {
  if (typeof console !== "undefined" && console.error) {
    console.error("[Cheat] Failed to load ../../cheat/init/import.js");
  }
  throw e;
}

window.onload = function () {
  SceneManager.run(Scene_Boot);
};
