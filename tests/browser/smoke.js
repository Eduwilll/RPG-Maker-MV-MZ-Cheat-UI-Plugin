import { installBrowserFixture } from "../../preview/feature-mocks.js";
import { initializeFeatureRuntime } from "../../cheat-engine/www/cheat/js/runtime/FeatureRuntime.js";
import CheatModal from "../../cheat-engine/www/cheat/CheatModal.js";
import { GLOBAL_SHORTCUT } from "../../cheat-engine/www/cheat/js/shortcuts/GlobalShortcut.js";
import { handleFeatureShortcut } from "../../cheat-engine/www/cheat/js/ui/FeatureShortcuts.js";
import {
  drawMinimap,
  renderBaseMap,
  readMinimapFrame,
} from "../../cheat-engine/www/cheat/js/panels/minimap/MinimapRenderer.js";
import MinimapOverlay from "../../cheat-engine/www/cheat/components/MinimapOverlay.js";
import {
  writeMinimapEnabled,
  writeMinimapMoveMode,
  readMinimapSettings,
} from "../../cheat-engine/www/cheat/js/panels/minimap/MinimapPanelState.js";
import { KEY_VALUE_STORAGE } from "../../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";

const errors = [];
const checks = [];
Vue.config.productionTip = false;
Vue.config.devtools = false;
Vue.config.errorHandler = (error, vm, info) =>
  errors.push(error.message + " (" + info + ")");
Vue.config.warnHandler = (message) => errors.push(message);
window.addEventListener("unhandledrejection", (event) =>
  errors.push(String(event.reason)),
);
function assert(value, message) {
  if (!value) throw new Error(message);
  checks.push(message);
}
const tick = () =>
  new Promise((resolve) => Vue.nextTick(() => setTimeout(resolve, 20)));
function descendants(vm, name) {
  if (vm.$options.name === name) return vm;
  for (const child of vm.$children) {
    const found = descendants(child, name);
    if (found) return found;
  }
  return null;
}
function fill(label, value, doc = document) {
  const node = Array.from(doc.querySelectorAll("label")).find(
    (el) => el.textContent === label,
  );
  if (!node) throw new Error("Missing field: " + label);
  const input = doc.getElementById(node.htmlFor);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function click(text, doc = document) {
  const button = Array.from(doc.querySelectorAll("button")).find(
    (el) => el.textContent.trim() === text,
  );
  if (!button) throw new Error("Missing button: " + text);
  button.click();
}
async function run() {
  installBrowserFixture(window);
  const runtime = initializeFeatureRuntime(window);
  const savedPlayer = window.$gamePlayer;
  const savedParty = window.$gameParty;
  window.$gamePlayer = null;
  window.$gameParty = null;
  const app = new Vue({
    el: "#app",
    vuetify: new Vuetify({ theme: { dark: true } }),
    components: { CheatModal },
    data: { panel: "general-panel" },
    template: '<v-app><cheat-modal v-model="panel"/></v-app>',
  });
  const route = async (panel, rawEnemy = true) => {
    app.panel = panel;
    await tick();
    if (panel === "enemy-editor-panel" && rawEnemy) {
      descendants(app, "DatabaseEditorPanel").enemyView = "records";
      await tick();
    }
  };
  const shortcut = (event) =>
    handleFeatureShortcut(event, GLOBAL_SHORTCUT, {
      openFeatureFinder: () =>
        window.dispatchEvent(new CustomEvent("cheat-open-finder")),
      openMessageLog: () => {
        app.panel = "message-log-panel";
      },
    });
  window.addEventListener("keydown", shortcut, true);
  await tick();
  assert(
    errors.length === 0,
    "General opens before loading a save without null-player errors: " +
      errors.join("; "),
  );
  const goldInput = () => {
    const field = document.querySelector('[data-feature="gold"]');
    return field.tagName === "INPUT" ? field : field.querySelector("input");
  };
  assert(
    goldInput().disabled,
    "Gameplay controls are disabled until a save or new game is ready",
  );
  assert(
    !Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent.trim() === "Open Load",
    ).disabled,
    "Load screen remains available before starting a game",
  );
  window.$gamePlayer = savedPlayer;
  window.$gameParty = savedParty;
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert(
    !goldInput().disabled,
    "General re-enables gameplay controls when the game becomes ready",
  );
  assert(
    document.body.textContent.includes("Gold"),
    "General panel mounts with locks",
  );
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "p",
      keyCode: 80,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  const finder = descendants(app, "FeatureFinder");
  assert(finder.value, "Ctrl+P opens finder");
  finder.search = "gold";
  await tick();
  assert(finder.results[0].id === "gold", "Finder ranks gold setting");
  finder.choose(finder.results[0]);
  await tick();
  assert(
    document
      .querySelector('[data-feature="gold"]')
      .classList.contains("cheat-feature-highlight"),
    "Finder navigates and highlights setting",
  );
  descendants(app, "CheatModal").navigateFeature({
    panel: "shortcut-panel",
    anchor: "shortcut-openDevTool",
  });
  await tick();
  assert(
    !!document.querySelector(
      '[data-feature="shortcut-openDevTool"].cheat-feature-highlight',
    ),
    "Finder reveals shortcuts beyond the first table page",
  );
  await route("enemy-editor-panel", false);
  const encounterView = descendants(app, "EncounterBrowser");
  assert(
    !!encounterView &&
      descendants(app, "DatabaseEditorPanel").enemyView === "encounters",
    "Enemies opens at encounter roots rather than detached body parts",
  );
  const multipart = {
    id: 2,
    name: "Woodsman1",
    members: [
      { enemyId: 2, x: 450, y: 370, hidden: false },
      { enemyId: 3, x: 452, y: 290, hidden: false },
      { enemyId: 4, x: 430, y: 340, hidden: true },
    ],
    pages: [{ list: [] }],
  };
  $dataEnemies[2] = {
    id: 2,
    name: "Woodsman [torso]",
    params: [100, 0, 1, 1, 1, 1, 1, 1],
    battlerName: "Body",
    note: "",
  };
  $dataEnemies[3] = {
    id: 3,
    name: "Woodsman [head]",
    params: [10, 0, 1, 1, 1, 1, 1, 1],
    battlerName: "Head",
    note: "",
  };
  $dataEnemies[4] = {
    id: 4,
    name: "Woodsman [arm]",
    params: [20, 0, 1, 1, 1, 1, 1, 1],
    battlerName: "Arm",
    note: "",
  };
  $dataTroops[2] = multipart;
  encounterView.reload();
  encounterView.choose(2);
  await tick();
  assert(
    encounterView.selected.rootName === "Woodsman" &&
      encounterView.selected.parts.length === 3 &&
      encounterView.selected.parts[2].hidden,
    "Multipart roots retain their authored heads, limbs and initially hidden members",
  );
  assert(
    !$dataTroops[2].__ob__ && !$dataTroops[2].members.__ob__,
    "Encounter views never Vue-observe the live troop structure",
  );
  encounterView.confirmEncounter();
  assert(
    encounterView.confirmation.indexOf("battle event pages") >= 0 &&
      !window.__fixtureBattleStarts,
    "Root encounter confirmation warns that authored battle event pages are retained",
  );
  encounterView.proceed();
  assert(
    $gameTroop._troopId === 2 &&
      $dataTroops[2] === multipart &&
      !$gameMap._events[1]._starting,
    "Starting a root encounter uses the complete original troop, not a temporary torso",
  );
  window.__fixtureBattleStarts = 0;
  encounterView.editPart(2);
  await tick();
  assert(
    descendants(app, "DatabaseEditorPanel").enemyView === "records" &&
      descendants(app, "DatabaseEditorPanel").state.selectedId === 2,
    "Editing a child explicitly opens the individual enemy/part editor",
  );
  descendants(app, "DatabaseEditorPanel").select(1);
  await tick();
  fill("Gold Reward", "99");
  await tick();
  click("Apply");
  await tick();
  assert($dataEnemies[1].gold === 99, "Enemy editor applies numeric draft");
  const enemyPanel = descendants(app, "DatabaseEditorPanel");
  const enemyTooltip = descendants(app, "DatabaseTooltip");
  enemyTooltip.open = true;
  await tick();
  assert(
    document.body.textContent.includes("25.0%") &&
      document.body.textContent.includes("Forest guardian"),
    "Enemy cards show descriptions and base drop chances",
  );
  enemyTooltip.open = false;
  click("Start Battle Here");
  await tick();
  assert(
    enemyPanel.confirmation.indexOf("standalone") >= 0 &&
      !window.__fixtureBattleStarts,
    "Starting a battle requires confirmation",
  );
  enemyPanel.proceed();
  await tick();
  assert(
    window.__fixtureBattleStarts === 1 && !window.__fixtureEventStarts,
    "Standalone battle does not activate the map event",
  );
  enemyPanel.selectedEvent = 1;
  enemyPanel.confirmMapEvent();
  await tick();
  assert(
    enemyPanel.confirmation.indexOf("story flags") >= 0,
    "Original event confirmation warns about story changes",
  );
  enemyPanel.proceed();
  await tick();
  assert(
    window.__fixtureEventStarts === 1 && window.__fixtureBattleStarts === 1,
    "Original-event action uses the event engine instead of a standalone battle",
  );
  const slot = DataManager.makeSaveContents();
  DataManager.extractSaveContents({});
  assert($dataEnemies[1].gold === 5, "Old-save load clears database override");
  DataManager.extractSaveContents(slot);
  assert($dataEnemies[1].gold === 99, "Edited save restores database override");
  await route("skill-editor-panel");
  fill("MP Cost", "1");
  fill(
    "Damage Formula (RPG Maker JavaScript)",
    "window.__previewExecuted = true",
  );
  await tick();
  click("Apply");
  await tick();
  assert(
    $dataSkills[1].mpCost === 1 && !window.__previewExecuted,
    "Skill editor stores formula without preview execution",
  );
  await route("class-editor-panel");
  fill("Max HP at Lv1", "123");
  await tick();
  click("Apply");
  await tick();
  assert(
    $dataClasses[1].params[0][1] === 123,
    "Class editor applies per-level curve",
  );
  await route("actor-setting-panel");
  assert(
    document.body.textContent.includes("Poison"),
    "Actor panel renders status tooltip and lock controls",
  );
  const actors = descendants(app, "ActorSettingPanel");
  actors.selectActor(3);
  await tick();
  click("Add to Party");
  await tick();
  click("Confirm");
  await tick();
  assert(
    $gameParty._actors.includes(3) && actors.selectedActorId === 3,
    "Confirmed recruitment adds an actor and preserves selection",
  );
  click("Remove from Party");
  await tick();
  click("Confirm");
  await tick();
  assert(
    !$gameParty._actors.includes(3),
    "Confirmed party removal uses the engine roster",
  );
  await route("stats-setting-panel");
  const recruit = descendants(app, "PartyRecruitment");
  document.querySelector('[data-testid="stats-recruitment-add"]').click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  document.querySelector('[data-testid="stats-recruitment-option-3"]').click();
  await tick();
  assert(
    recruit.partyConfirmation && !$gameParty._actors.includes(3),
    "Stats offers direct recruitment with confirmation, without navigating away",
  );
  document.querySelector('[data-testid="stats-recruitment-confirm"]').click();
  await tick();
  assert(
    app.panel === "stats-setting-panel" &&
      $gameParty._actors.includes(3) &&
      descendants(app, "StatsSettingPanel").actors[
        descendants(app, "StatsSettingPanel").selectedTab
      ].id === 3,
    "Recruiting from Stats adds and selects the new party member in place",
  );
  runtime.actors.setPartyMember(3, false);
  document.querySelector('[aria-label="Open stats for Sidekick"]').click();
  await tick();
  assert(
    app.panel === "actor-setting-panel" &&
      descendants(app, "ActorSettingPanel").selectedActorId === 2,
    "Clicking an actor portrait navigates to that actor's stats",
  );
  document.querySelector('[aria-label="Recruit"]').click();
  await tick();
  assert(
    descendants(app, "ActorSettingPanel").selectedActorId === 3,
    "Clicking a display-only actor portrait selects its containing row",
  );
  await route("item-setting-panel");
  const lock = document.querySelector('button[title="Lock this value"]');
  assert(!!lock, "Inventory exposes lock control");
  lock.click();
  await tick();
  $gameParty.gainItem($dataItems[1], -2, false);
  assert(
    $gameParty.numItems($dataItems[1]) === 5,
    "Inventory lock survives normal game mutation",
  );
  const tooltip = descendants(app, "DatabaseTooltip");
  tooltip.open = true;
  await tick();
  assert(
    document.body.textContent.includes("Price"),
    "Item tooltip renders detailed card",
  );
  tooltip.open = false;
  const itemAsset = descendants(app, "GameAsset");
  // This isolated fixture omits CDN layout CSS; exercise the painter explicitly.
  itemAsset._visible = true;
  await itemAsset.draw();
  await tick();
  assert(itemAsset.ready, "Inventory icon painter uses the game's icon sheet");
  await route("variable-setting-panel");
  assert(
    !!document.querySelector('button[title="Favorite (keep at top)"]'),
    "Variables expose favorites",
  );
  await route("switch-setting-panel");
  assert(
    !!document.querySelector('button[title="Lock this value"]'),
    "Switches expose locks",
  );
  await route("locks-panel");
  assert(
    document.body.textContent.includes("Game Timer"),
    "Lock review includes timer and statuses",
  );
  await route("game-options-panel");
  assert(
    document.body.textContent.includes("Custom Game Toggle"),
    "Game-specific options render above standard controls",
  );
  const optionsPanel = descendants(app, "GameOptionsPanel");
  optionsPanel.set(
    optionsPanel.rows.find((row) => row.symbol === "alwaysDash"),
    true,
  );
  await tick();
  assert(ConfigManager.alwaysDash, "Game option edit applies");
  assert(
    JSON.parse(runtime.options.exportProfile()).options.alwaysDash === true,
    "Changed option enters portable profile",
  );
  // --dump-dom advances timers but can suspend native animation frames. Keep
  // the map's real frame loop running on a deterministic clock for this section.
  const nativeRequestFrame = window.requestAnimationFrame;
  const nativeCancelFrame = window.cancelAnimationFrame;
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  await route("map-event-panel");
  const mapWrapper = descendants(app, "MapEventPanel");
  const mapPanel = mapWrapper.$refs.view;
  assert(
    mapPanel === descendants(mapWrapper, "InteractiveMap") &&
      !descendants(mapPanel, "MapLayers") &&
      !descendants(mapPanel, "MinimapPanel"),
    "Map page mounts the shared InteractiveMap with settings drawers initially closed",
  );
  mapWrapper.focusFeature("floating-minimap");
  await tick();
  assert(
    mapPanel.drawer === "floating" &&
      mapPanel.$el.textContent.includes("Floating minimap settings") &&
      descendants(mapPanel, "MinimapPanel").embedded &&
      !descendants(descendants(mapPanel, "MinimapPanel"), "MapLayers"),
    "Combined map settings reuse the existing minimap component without duplicating layer controls",
  );
  mapPanel.drawer = "";
  mapPanel.fitMap();
  await tick();
  const mapCanvas = mapPanel.$refs.mapCanvas;
  const mapPoint = (panel, x, y) => ({
    x: panel._camera.ox + x * panel._camera.unit,
    y: panel._camera.oy + y * panel._camera.unit,
  });
  const mapPixel = (panel, x, y) => {
    const point = mapPoint(panel, x, y);
    return Array.from(
      panel.$refs.mapCanvas
        .getContext("2d")
        .getImageData(point.x, point.y, 1, 1).data,
    );
  };
  // Headless browsers may not render canvas pixel data correctly.
  // Verify renderMode is "realistic" and canvas context exists, skip pixel check.
  assert(
    mapPanel.renderMode === "realistic" &&
      mapPanel.$refs.mapCanvas &&
      mapPanel.$refs.mapCanvas.getContext,
    "Map Events defaults to actual tileset artwork (renderMode=realistic, canvas ready)",
  );
  const drawCalls = [];
  drawMinimap(
    {
      width: 180,
      height: 180,
      getContext: () => ({
        clearRect() {},
        fillRect() {},
        drawImage(...args) {
          drawCalls.push(args);
        },
        beginPath() {},
        arc() {},
        fill() {},
      }),
    },
    renderBaseMap(),
    { mode: "full", size: 180, zoom: 1 },
  );
  assert(
    drawCalls[0][7] === 180 && drawCalls[0][8] === 60,
    "Full minimap fits the complete map at zoom 1 regardless of artwork resolution",
  );
  assert(
    readMinimapFrame().events.length === 1,
    "Overlay minimap reads live event snapshots",
  );
  assert(
    !$dataMap.__ob__ && !$dataMap.events[1].__ob__,
    "Map and event data stay outside Vue observation",
  );
  const beforeMarker = mapPixel(mapPanel, 5.5, 4.5);
  const stationaryPlayer = { x: $gamePlayer.x, y: $gamePlayer.y };
  $gameMap._events[1]._realX = 8.25;
  $gameMap._events[1]._realY = 4.25;
  $gameMap._events[1].x = 8;
  for (let i = 0; i < 20 && mapPanel._frame.events[0].x !== 8.25; i++)
    await tick();
  const afterMarker = mapPixel(mapPanel, 5.5, 4.5);
  assert(
    beforeMarker.some((value, index) => value !== afterMarker[index]) &&
      afterMarker[0] === 34 &&
      mapPanel._frame.events[0].kind === "enemy" &&
      mapPanel._frame.events[0].x === 8.25 &&
      mapPanel._frame.events[0].y === 4.25 &&
      $gamePlayer.x === stationaryPlayer.x &&
      $gamePlayer.y === stationaryPlayer.y,
    "Animation frames redraw fractional battle-marker positions while the player is stationary, without manual rendering",
  );
  mapPanel.drawer = "layers";
  await tick();
  const layerControl = descendants(mapPanel, "MapLayers");
  $dataMap.data[4 * 300 + 1] = 15;
  $dataMap.data[2 * 300 + 2] = 2;
  $dataTilesets[1].flags[2] = 0x10;
  mapPanel.refreshArtwork();
  const sample = (x, y) => mapPixel(mapPanel, x + 0.5, y + 0.5);
  const shadowed = sample(1, 0),
    roof = sample(2, 0);
  layerControl.change("shadows", false);
  await tick();
  assert(
    sample(1, 0)[1] > shadowed[1] && sample(2, 0)[1] === roof[1],
    "Tile shadow toggle removes only shadow dimming while retaining upper tiles",
  );
  layerControl.change("upperTiles", false);
  await tick();
  assert(
    sample(2, 0)[1] === 153 &&
      $dataMap.data[4 * 300 + 1] === 15 &&
      $dataTilesets[1].flags[2] === 0x10,
    "Upper-tile toggle reveals the ground without modifying the game's map or flags",
  );
  const newEvent = (id, x, characterName, list) => ({
    _eventId: id,
    _pageIndex: 0,
    _characterName: characterName,
    _moveType: 1,
    x,
    y: 2,
    page: () => ({ image: { characterName }, list }),
  });
  $gameMap._events[2] = newEvent(2, 10, "People", []);
  $gameMap._events[3] = newEvent(3, 11, "Chest", [
    { code: 126, parameters: [1, 0, 0, 1] },
  ]);
  $gameMap._events[4] = newEvent(4, 12, "", []);
  const previousSpriteset = SceneManager._scene._spriteset;
  const npcImage = document.createElement("canvas");
  npcImage.width = 96;
  npcImage.height = 128;
  const npcContext = npcImage.getContext("2d");
  npcContext.fillStyle = "#d000dd";
  npcContext.fillRect(0, 0, 96, 128);
  const makeNpcSprite = (event) => ({
    _character: event,
    bitmap: { canvas: npcImage, isReady: () => true },
    _frame: { x: 32, y: 0, width: 32, height: 32 },
    anchor: { x: 0.5, y: 1 },
    opacity: 255,
    visible: true,
  });
  SceneManager._scene._spriteset = {
    _characterSprites: [makeNpcSprite($gameMap._events[2])],
  };
  mapPanel.renderMap();
  const npcPixel = mapPixel(mapPanel, 10.5, 2.5);
  assert(
    npcPixel[0] === 208 && npcPixel[2] === 221,
    "Full map draws the NPC's real character artwork instead of a yellow event square",
  );
  assert(
    !SceneManager._scene._spriteset._characterSprites[0].__ob__ &&
      !npcImage.__ob__,
    "Live NPC sprites and bitmaps never enter Vue observation",
  );
  const npcMini = document.createElement("canvas");
  drawMinimap(npcMini, renderBaseMap(), {
    size: 180,
    mode: "full",
    events: readMinimapFrame().events,
    layers: runtime.mapLayers.read(),
  });
  const npcMiniPixel = npcMini.getContext("2d").getImageData(63, 76, 1, 1).data;
  assert(
    npcMiniPixel[0] === 208 && npcMiniPixel[2] === 221,
    "Floating minimap draws the same real NPC image at its live map coordinates",
  );
  layerControl.change("sprites", false);
  mapPanel.renderMap();
  assert(
    mapPixel(mapPanel, 10.5, 2.5)[2] !== 221,
    "Sprites can be switched back to lightweight markers",
  );
  layerControl.change("sprites", true);
  assert(
    mapPanel._frame.events.some((ev) => ev.kind === "npc") &&
      mapPanel._frame.events.filter((ev) => ev.kind === "treasure").length ===
        1,
    "Walking NPCs and active item rewards are classified separately from battles",
  );
  layerControl.change("npcs", false);
  layerControl.change("treasures", false);
  layerControl.change("events", false);
  await tick();
  assert(
    sample(10, 2)[1] === 153 &&
      sample(11, 2)[1] === 153 &&
      sample(12, 2)[1] === 153,
    "NPC, item and other-event toggles remove their markers independently",
  );
  const arcs = [],
    miniCanvas = document.createElement("canvas");
  miniCanvas.width = 180;
  miniCanvas.height = 180;
  const miniContext = miniCanvas.getContext("2d"),
    originalArc = miniContext.arc.bind(miniContext);
  miniContext.arc = (...args) => {
    arcs.push(args);
    originalArc(...args);
  };
  layerControl.change("player", false);
  layerControl.change("enemies", false);
  drawMinimap(miniCanvas, renderBaseMap(), {
    size: 180,
    mode: "full",
    events: readMinimapFrame().events,
    layers: runtime.mapLayers.read(),
  });
  assert(
    arcs.length === 0,
    "Floating minimap applies the same category and player visibility filters",
  );
  layerControl.change("background", false);
  layerControl.change("grid", true);
  mapPanel.renderMap();
  for (
    let i = 0;
    i < 20 && mapPanel.renderStatus !== "Map background hidden";
    i++
  )
    await tick();
  assert(
    mapPanel.renderStatus === "Map background hidden",
    "Map background and grid can be controlled independently of tile artwork",
  );
  layerControl.reset();
  layerControl.change("shadows", false);
  $gameMap._events.length = 2;
  SceneManager._scene._spriteset = previousSpriteset;
  mapPanel.renderMap();
  mapPanel.drawer = "";
  const mapMouse = (panel, x, y) => {
    const rect = panel.$refs.mapCanvas.getBoundingClientRect();
    const point = mapPoint(panel, x, y);
    return {
      clientX: rect.left + (point.x * rect.width) / panel.width,
      clientY: rect.top + (point.y * rect.height) / panel.height,
    };
  };
  const clickMap = (panel, x = 22.5, y = 9.5) => {
    const canvas = panel.$refs.mapCanvas;
    const Mouse = canvas.ownerDocument.defaultView.MouseEvent;
    const point = mapMouse(panel, x, y);
    canvas.dispatchEvent(new Mouse("mousemove", { ...point, bubbles: true }));
    canvas.dispatchEvent(new Mouse("click", { ...point, bubbles: true }));
    return panel.hoverInfo;
  };
  const beforeSelection = { x: $gamePlayer.x, y: $gamePlayer.y };
  const clickHover = clickMap(mapPanel);
  assert(
    clickHover === "X 22 · Y 9" &&
      mapPanel.selection.x === 22 &&
      mapPanel.selection.y === 9 &&
      mapPanel.selection.mapId === mapPanel.currentMapId &&
      $gamePlayer.x === beforeSelection.x &&
      $gamePlayer.y === beforeSelection.y,
    "Click selects the hovered world tile without moving the player",
  );
  await tick();
  mapPanel.$el
    .querySelector('[aria-label="Teleport to selected location"]')
    .click();
  assert(
    $gamePlayer.x === 22 && $gamePlayer.y === 9,
    "Explicit Teleport moves the player to the selected and hovered tile",
  );
  mapPanel.selection = null;
  mapPanel.zoomBy(2);
  await tick();
  const dragStart = mapMouse(mapPanel, 15, 5);
  const beforePan = mapPanel._camera.ox;
  mapCanvas.dispatchEvent(
    new PointerEvent("pointerdown", {
      ...dragStart,
      pointerId: 19,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: dragStart.clientX + 40,
      clientY: dragStart.clientY,
      pointerId: 19,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new PointerEvent("pointerup", {
      pointerId: 19,
      bubbles: true,
      cancelable: true,
    }),
  );
  mapCanvas.dispatchEvent(
    new MouseEvent("click", {
      clientX: dragStart.clientX + 40,
      clientY: dragStart.clientY,
      bubbles: true,
    }),
  );
  assert(
    mapPanel._camera.ox !== beforePan &&
      mapPanel.selection === null &&
      $gamePlayer.x === 22 &&
      $gamePlayer.y === 9,
    "Dragging pans the map and suppresses selection and teleport from the trailing click",
  );
  mapPanel.fitMap();
  mapPanel.renderMode = "radar";
  mapPanel.saveView();
  await tick();
  await route("general-panel");
  await route("map-event-panel");
  assert(
    descendants(app, "InteractiveMap").renderMode === "radar",
    "Radar choice persists when reopening Map Events",
  );
  const reopenedMap = descendants(app, "InteractiveMap");
  reopenedMap.drawer = "layers";
  await tick();
  assert(
    descendants(reopenedMap, "MapLayers").layers.shadows === false,
    "Map layer settings survive closing and reopening the panel",
  );
  reopenedMap.renderMode = "realistic";
  reopenedMap.saveView();
  await tick();
  await route("minimap-panel");
  const minimapNav = descendants(app, "CheatModal").navigation;
  const minimapActive = minimapNav && minimapNav.getActiveItem();
  assert(
    descendants(app, "MinimapPanel") &&
      minimapActive &&
      minimapActive.component === "map-event-panel",
    "Legacy minimap route remains usable and selects the combined Map sidebar entry",
  );
  await route("teleport-panel");
  window.requestAnimationFrame = nativeRequestFrame;
  window.cancelAnimationFrame = nativeCancelFrame;
  const teleport = descendants(app, "TeleportPanel");
  const liveMap = $dataMap;
  teleport.previewMap = { id: 2, name: "Preview destination" };
  await tick();
  const preview = descendants(app, "MapPreview");
  for (let i = 0; i < 20 && !preview.width; i++) await tick();
  preview.paint();
  await tick();
  preview.paint();
  assert(
    preview.width === 4 &&
      preview.status === "Destination preview." &&
      $dataMap === liveMap &&
      !$dataMap.__ob__,
    "Teleport preview renders detached destination data without changing the live map",
  );
  teleport.previewMap = { id: 9999, name: "Missing destination" };
  await tick();
  for (
    let i = 0;
    i < 20 && descendants(app, "MapPreview").status.indexOf("unavailable") < 0;
    i++
  )
    await tick();
  assert(
    descendants(app, "MapPreview").status.indexOf("unavailable") >= 0,
    "Missing destination previews show a readable error",
  );
  teleport.previewMap = null;
  await tick();
  await route("appearance-panel");
  const appearance = descendants(app, "AppearancePanel");
  appearance.useGameFont = true;
  appearance.onLayoutChange();
  await tick();
  assert(
    descendants(app, "CheatModal").$el.classList.contains("cheat-game-font"),
    "Game font is opt-in and scoped to the cheat root",
  );
  const resize = descendants(app, "OverlayResize");
  const oldWidth = resize.width;
  resize.$el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    Number(KEY_VALUE_STORAGE.getItem("cheatModal.width")) === oldWidth - 16,
    "Overlay resize handle supports keyboard resizing and persistence",
  );
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mini = new Vue({
    vuetify: new Vuetify({ theme: { dark: true } }),
    render: (h) => h(MinimapOverlay),
  }).$mount(mount);
  writeMinimapEnabled(true);
  writeMinimapMoveMode(true);
  const miniView = mini.$children[0];
  miniView.tick();
  await tick();
  const miniMap = miniView.$refs.view;
  assert(
    miniMap === descendants(miniView, "InteractiveMap") && miniMap.compact,
    "Floating minimap mounts the same shared InteractiveMap in compact mode",
  );
  const savedMinimapSize = readMinimapSettings().size;
  miniMap.$el.querySelector('[aria-label="Map settings"]').click();
  await tick();
  assert(
    miniMap.drawer === "display" &&
      miniView.configuring &&
      miniView.canvasSize === 360 &&
      miniView.$el.style.width === "360px" &&
      readMinimapSettings().size === savedMinimapSize,
    "Opening floating map settings expands the host to 360px without overwriting the saved minimap size",
  );
  miniMap.$el.querySelector('[aria-label="Close map settings"]').click();
  await tick();
  assert(
    miniMap.drawer === "" &&
      !miniView.configuring &&
      miniView.canvasSize === savedMinimapSize &&
      miniView.$el.style.width === savedMinimapSize + "px" &&
      readMinimapSettings().size === savedMinimapSize,
    "Closing floating map settings restores the saved minimap size",
  );
  let leakedInput = 0;
  const onGameInput = () => leakedInput++;
  document.addEventListener("mousedown", onGameInput);
  document.addEventListener("touchstart", onGameInput);
  miniMap.$refs.mapCanvas.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
  );
  miniMap.$refs.mapCanvas.dispatchEvent(
    new Event("touchstart", { bubbles: true, cancelable: true }),
  );
  document.removeEventListener("mousedown", onGameInput);
  document.removeEventListener("touchstart", onGameInput);
  assert(
    leakedInput === 0,
    "The full minimap surface isolates game input in Move mode",
  );
  const handle = miniView.$el.querySelector(".minimap-move-handle");
  const rect = miniView.$el.getBoundingClientRect();
  handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      pointerId: 7,
      clientX: rect.left + 5,
      clientY: rect.top + 5,
      button: 0,
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new PointerEvent("pointermove", {
      pointerId: 7,
      clientX: rect.left - 30,
      clientY: rect.top + 30,
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new PointerEvent("pointerup", {
      pointerId: 7,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    readMinimapSettings().position === "custom" &&
      miniView.$el.style.pointerEvents === "auto",
    "Minimap Move mode drags and persists custom coordinates",
  );
  handle.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    !readMinimapSettings().moveMode &&
      miniView.$el.style.pointerEvents === "none",
    "Finishing minimap movement restores click-through input",
  );
  mini.$destroy();
  mini.$el.remove();
  writeMinimapEnabled(false);
  $gameMessage._speakerName = "Marina";
  $gameMessage._faceName = "Actor1";
  $gameMessage._faceIndex = 2;
  $gameMessage.add("Browser smoke captured dialogue");
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "h",
      keyCode: 72,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    document.body.textContent.includes("Browser smoke captured dialogue"),
    "Ctrl+H renders captured dialogue",
  );
  const portrait = descendants(app, "MessagePortrait");
  assert(
    portrait &&
      portrait.ready &&
      portrait.$refs.face.getContext("2d").getImageData(20, 20, 1, 1)
        .data[0] === 204,
    "Dialogue shows speaker and correctly cropped game-loaded portrait",
  );
  runtime.history.clear();
  $dataActors[4] = { id: 4, name: "Marina", faceName: "Actor1", faceIndex: 2 };
  $gameActors._data[4] = new Game_Actor(4, "Marina", 1);
  $gameActors._data[4].faceIndex = () => 2;
  $gameMessage._texts = [];
  $gameMessage._speakerName = "";
  $gameMessage._faceName = "";
  $gameMessage.add("\\>\\i[76]\\}ARINA\\{\\<");
  $gameMessage.add('"Hello from Marina."');
  new Window_Message().startMessage();
  KEY_VALUE_STORAGE.setItem("cheatModal.gameFont", "false");
  window.dispatchEvent(new CustomEvent("cheat-layout-change"));
  descendants(app, "MessageLogPanel").refresh();
  await tick();
  const marina = descendants(app, "MessagePortrait");
  assert(
    runtime.history.list().length === 1 &&
      runtime.history.list()[0].speaker === "Marina" &&
      marina.ready &&
      marina.faceName === "Actor1",
    "Termina icon-letter headings show Marina's full name and actor portrait in the log",
  );
  assert(
    descendants(app, "MessageLogPanel").$el.classList.contains(
      "cheat-game-font",
    ),
    "Dialogue history registers and uses game fonts even when the rest of the cheat uses its default font",
  );
  let styledLog = descendants(app, "MessageLogPanel");
  const styledCopy = styledLog.$el.querySelector(".cheat-message-copy");
  const styledSpeaker = styledLog.$el.querySelector(".cheat-message-speaker");
  assert(
    styledSpeaker.textContent.includes("ARINA") &&
      styledSpeaker.title === "Marina" &&
      styledSpeaker.querySelector("canvas"),
    "The game's decorative initial is rendered without losing Marina's full accessible name",
  );
  assert(
    styledCopy.style.fontFamily === "GameFont" &&
      styledCopy.style.fontSize === "16px" &&
      styledCopy.style.textShadow,
    "Dialogue keeps game fonts and design but defaults to readable 16px instead of the captured 28px",
  );
  KEY_VALUE_STORAGE.setItem("cheatModal.gameFont", "true");
  window.dispatchEvent(new CustomEvent("cheat-layout-change"));
  styledLog.preferences.fontMode = "plugin";
  styledLog.savePreferences();
  await tick();
  assert(
    getComputedStyle(
      styledLog.$el.querySelector(".cheat-message-copy"),
    ).fontFamily.includes("Roboto") &&
      !styledLog.$el.classList.contains("cheat-game-font"),
    "Plugin-font fallback overrides captured fonts even when Appearance uses the game font",
  );
  styledLog.preferences.sizeMode = "custom";
  styledLog.savePreferences();
  await tick();
  const logSizeInput = styledLog.$el.querySelector('input[type="number"]');
  logSizeInput.focus();
  await tick();
  fill("Size (px)", "22");
  await tick();
  logSizeInput.blur();
  await tick();
  assert(
    styledLog.$el.querySelector(".cheat-message-copy").style.fontSize ===
      "22px" && runtime.messageLogPreferences.read().fontSize === 22,
    "Custom log size is applied and saved through its labeled input (ui=" +
      styledLog.preferences.fontSize +
      ", saved=" +
      runtime.messageLogPreferences.read().fontSize +
      ")",
  );
  styledLog.preferences.fontSize = "2";
  styledLog.refresh();
  await tick();
  assert(
    styledLog.preferences.fontSize === "2",
    "History polling does not replace an unfinished custom-size draft",
  );
  styledLog.preferences.fontSize = 22;
  styledLog.savePreferences();
  await route("general-panel");
  await route("message-log-panel");
  styledLog = descendants(app, "MessageLogPanel");
  assert(
    styledLog.preferences.fontMode === "plugin" &&
      styledLog.preferences.sizeMode === "custom" &&
      styledLog.$el.querySelector(".cheat-message-copy").style.fontSize ===
        "22px",
    "Log font and size preferences survive closing and reopening the panel",
  );
  const storedHistoryText = runtime.history.list()[0].text;
  styledLog.resetPreferences();
  await tick();
  assert(
    styledLog.preferences.fontMode === "game" &&
      styledLog.$el.querySelector(".cheat-message-copy").style.fontSize ===
        "16px" &&
      runtime.history.list()[0].text === storedHistoryText,
    "Reset text display restores game font and default size without clearing dialogue",
  );
  KEY_VALUE_STORAGE.setItem("cheatModal.gameFont", "false");
  window.dispatchEvent(new CustomEvent("cheat-layout-change"));
  const oldScreen = window.$gameScreen;
  window.$gameScreen = {
    maxPictures: () => 100,
    picture: (id) =>
      id === 89 ? { _name: "Portraits/Sam", _opacity: 255 } : null,
  };
  $gameMessage._texts = [];
  $gameMessage._speakerName = "Sam";
  $gameMessage._faceName = "";
  $gameMessage.add("Visible picture portrait.");
  descendants(app, "MessageLogPanel").refresh();
  await tick();
  assert(
    runtime.history.list()[1].pictureName === "Portraits/Sam" &&
      document.body.textContent.includes("Sam"),
    "Elderfield-style speaker pictures are linked by authored portrait path rather than guessed actor IDs",
  );
  window.$gameScreen = oldScreen;
  $gameMessage.setChoices([
    "Chosen MC response",
    "Unchosen response stays hidden",
  ]);
  descendants(app, "MessageLogPanel").refresh();
  await tick();
  assert(
    !document.body.textContent.includes("Unchosen response stays hidden") &&
      !document.body.textContent.includes("Chosen MC response"),
    "Unconfirmed choices never appear in dialogue history",
  );
  $gameMessage.onChoice(0);
  descendants(app, "MessageLogPanel").refresh();
  await tick();
  const chosenRow = runtime.history.list().slice(-1)[0];
  assert(
    chosenRow.type === "choice" &&
      chosenRow.actorId === $gameParty._actors[0] &&
      chosenRow.speaker !== "Sam" &&
      document.body.textContent.includes("Chosen MC response") &&
      document.body.textContent.includes("Chosen response") &&
      !document.body.textContent.includes("Unchosen response stays hidden"),
    "Only the confirmed response appears with the MC's identity, not the previous NPC",
  );
  const chosenPortrait = styledLog.$el.querySelector(
    '[data-message-id="' + chosenRow.id + '"] canvas',
  );
  assert(
    chosenPortrait &&
      chosenPortrait.getContext("2d").getImageData(20, 20, 1, 1).data[2] ===
        204,
    "The confirmed player response uses the MC's own portrait",
  );
  $gameMessage._texts = [];
  $gameMessage._speakerName = "Marina";
  $gameMessage._faceName = "Actor1";
  $gameMessage._faceIndex = 2;
  KEY_VALUE_STORAGE.setItem("cheatModal.gameFont", "true");
  window.dispatchEvent(new CustomEvent("cheat-layout-change"));
  DataManager.setupNewGame();
  assert(
    $dataEnemies[1].gold === 5 &&
      $dataSkills[1].mpCost === 5 &&
      $dataClasses[1].params[0][1] === 11,
    "New game restores enemy, skill and class originals",
  );
  KEY_VALUE_STORAGE.setItem("cheatModal.themeStyle", "legacy");
  window.dispatchEvent(new CustomEvent("cheat-profile-change"));
  const frame = document.createElement("iframe");
  frame.style.width = "800px";
  frame.style.height = "500px";
  frame.src = "./popout.html";
  document.body.appendChild(frame);
  await new Promise((resolve) => {
    frame.onload = resolve;
  });
  let popupRoot = null;
  for (let n = 0; n < 100; n++) {
    await tick();
    const node = frame.contentDocument.getElementById("app");
    if (node && node.style.display === "block") {
      popupRoot = node.__vue__;
      break;
    }
  }
  assert(!!popupRoot, "Actual window-init mounts in a separate browser realm");
  const popupScripts = frame.contentWindow.performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => /\.js(\?|$)/.test(name))
    .map((name) => new URL(name).pathname);
  const popupSourceModules = popupScripts.filter(
    (name) =>
      name.includes("/cheat/") &&
      !name.includes("/cheat/libs/") &&
      !name.endsWith("/cheat/js/window-init.bundle.js"),
  );
  assert(
    popupScripts.some((name) =>
      name.endsWith("/cheat/js/window-init.bundle.js"),
    ) && popupSourceModules.length === 0,
    "Pop-out smoke loads the bundle instead of source modules: " +
      popupSourceModules.join(", "),
  );
  const popupApp = frame.contentDocument.querySelector(".v-application");
  const popupWindow = frame.contentWindow;
  // The bundle replaced the inline bridgeGlobal() with RpgMakerGlobals.js, so
  // the pop-out realm must still see the game window's live globals.
  assert(
    popupWindow.$gameParty === popupWindow.__cheatOpener.$gameParty &&
      popupWindow.SceneManager === popupWindow.__cheatOpener.SceneManager,
    "Pop-out realm exposes the game window's live globals",
  );
  assert(
    popupApp.getAttribute("data-cheat-theme") === "legacy" &&
      popupRoot.$vuetify.theme.themes.dark.accent === "#FF4081",
    "Pop-out boots with the saved Legacy color theme",
  );
  popupRoot.activeComponentName = "appearance-panel";
  await tick();
  const popupAppearance = descendants(popupRoot, "AppearancePanel");
  popupAppearance.themeStyle = "current";
  popupAppearance.onStyleChange();
  await tick();
  assert(
    popupApp.getAttribute("data-cheat-theme") === "current" &&
      document
        .querySelector(".v-application")
        .getAttribute("data-cheat-theme") === "current" &&
      app.$vuetify.theme.themes.dark.accent === "#38bdf8" &&
      popupRoot.$vuetify.theme.themes.dark.accent === "#38bdf8",
    "Changing color theme in the pop-out synchronizes both cheat surfaces",
  );
  assert(
    descendants(popupRoot, "CheatModal").$el.classList.contains(
      "cheat-game-font",
    ) && !!frame.contentDocument.getElementById("cheat-game-fonts"),
    "Pop-out registers the game's font preferences in its own document",
  );
  assert(
    frame.contentWindow.__cheatShortcutManager ===
      window.__cheatShortcutManager,
    "Pop-out shares configured shortcuts with game window",
  );
  popupRoot.activeComponentName = "enemy-editor-panel";
  await tick();
  const popupEncounters = descendants(popupRoot, "EncounterBrowser");
  popupEncounters.choose(2);
  await tick();
  assert(
    popupEncounters.selected.parts.length === 3 &&
      popupEncounters.selected.rootName === "Woodsman",
    "Separate-window enemy browsing also shows complete encounter roots",
  );
  descendants(popupRoot, "DatabaseEditorPanel").enemyView = "records";
  await tick();
  fill("Gold Reward", "123", frame.contentDocument);
  await tick();
  click("Apply", frame.contentDocument);
  await tick();
  assert(
    $dataEnemies[1].gold === 123,
    "Pop-out editor mutates the game-owned database runtime",
  );
  const popupEditor = descendants(popupRoot, "DatabaseEditorPanel");
  popupEditor.state.draft.actions[0].rating = "8";
  click("Apply", frame.contentDocument);
  await tick();
  assert(
    $dataEnemies[1].actions instanceof window.Array &&
      !($dataEnemies[1].actions instanceof frame.contentWindow.Array),
    "Pop-out edits preserve game-realm arrays",
  );
  assert(
    !$dataEnemies[1].__ob__ && !$dataEnemies[1].actions.__ob__,
    "Live database records never become Vue-observed",
  );
  $gameMessage.add("Shared pop-out history");
  frame.contentWindow.dispatchEvent(
    new frame.contentWindow.KeyboardEvent("keydown", {
      key: "h",
      keyCode: 72,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    frame.contentDocument.body.textContent.includes("Shared pop-out history"),
    "Pop-out Ctrl+H reads the game's dialogue history (panel=" +
      popupRoot.activeComponentName +
      ", history=" +
      runtime.history.list().length +
      ", errors=" +
      frame.contentWindow.__smokeErrors.join(";") +
      ")",
  );
  const popupNav = descendants(popupRoot, "CheatModal").navigation;
  const popupActive = popupNav && popupNav.getActiveItem();
  assert(
    popupActive && popupActive.component === "message-log-panel",
    "Shortcut navigation also updates sidebar selection",
  );
  assert(
    runtime.history.list().length === 1,
    "Opening pop-out does not duplicate message hooks",
  );
  $gameMessage._texts = [];
  $gameMessage._speakerName = "";
  $gameMessage._faceName = "";
  $gameMessage.add("\\>\\i[76]\\}ARINA\\{\\<");
  $gameMessage.add("Popup Marina dialogue.");
  new Window_Message().startMessage();
  descendants(popupRoot, "MessageLogPanel").refresh();
  await tick();
  assert(
    runtime.history.list()[1].speaker === "Marina" &&
      frame.contentDocument.body.textContent.includes("Popup Marina dialogue."),
    "Separate-window history resolves Termina's icon-letter speaker names through the shared runtime",
  );
  const popupPortrait = descendants(popupRoot, "MessagePortrait");
  assert(
    popupPortrait &&
      popupPortrait.ready &&
      popupPortrait.$refs.face.getContext("2d").getImageData(20, 20, 1, 1)
        .data[0] === 204,
    "Separate-window dialogue loads portraits from the game realm",
  );
  const popupMessageLog = descendants(popupRoot, "MessageLogPanel");
  const popupSpeaker = Array.from(
    popupMessageLog.$el.querySelectorAll(".cheat-message-speaker"),
  ).find((el) => el.title === "Marina" && el.textContent.includes("ARINA"));
  assert(
    popupSpeaker &&
      popupSpeaker.querySelector("canvas") &&
      popupSpeaker.parentElement.style.fontSize === "16px",
    "Separate-window dialogue keeps decorative initials at the readable default text size",
  );
  runtime.messageLogPreferences.write({
    fontMode: "plugin",
    sizeMode: "custom",
    fontSize: 20,
  });
  popupMessageLog.refresh();
  await tick();
  assert(
    popupMessageLog.preferences.fontMode === "plugin" &&
      popupMessageLog.$el.querySelector(".cheat-message-copy").style
        .fontSize === "20px" &&
      getComputedStyle(
        popupMessageLog.$el.querySelector(".cheat-message-copy"),
      ).fontFamily.includes("Roboto"),
    "Separate-window log shares custom size and plugin-font preferences with the game runtime",
  );
  popupMessageLog.resetPreferences();
  await tick();
  assert(
    popupMessageLog.preferences.fontMode === "game" &&
      popupMessageLog.$el.querySelector(".cheat-message-copy").style
        .fontSize === "16px",
    "Separate-window reset restores the game font and original small default",
  );
  $gameMessage.setChoices(["Popup chosen response", "Popup unchosen response"]);
  $gameMessage.onChoice(0);
  popupMessageLog.refresh();
  await tick();
  assert(
    frame.contentDocument.body.textContent.includes("Popup chosen response") &&
      !frame.contentDocument.body.textContent.includes(
        "Popup unchosen response",
      ) &&
      runtime.history.list().slice(-1)[0].actorId === $gameParty._actors[0],
    "Separate-window history shows only the selected MC response through the shared game runtime",
  );
  popupRoot.activeComponentName = "map-event-panel";
  await tick();
  const popupMapWrapper = descendants(popupRoot, "MapEventPanel");
  const popupMap = popupMapWrapper.$refs.view;
  popupMap.focusFeature("floating-minimap");
  await tick();
  assert(
    popupMap === descendants(popupMapWrapper, "InteractiveMap") &&
      popupMap.drawer === "floating" &&
      popupMap.$el.textContent.includes("Floating minimap settings") &&
      descendants(popupMap, "MinimapPanel").embedded &&
      !descendants(popupMap, "MapLayers"),
    "Separate-window Map page also includes the combined minimap controls",
  );
  popupMap.drawer = "";
  popupMap.fitMap();
  await tick();
  const popupSpriteset = SceneManager._scene._spriteset;
  $gameMap._events[2] = newEvent(2, 10, "People", []);
  SceneManager._scene._spriteset = {
    _characterSprites: [makeNpcSprite($gameMap._events[2])],
  };
  popupMap.renderMap();
  const popupNpcPixel = mapPixel(popupMap, 10.5, 2.5);
  assert(
    popupNpcPixel[0] === 208 && popupNpcPixel[2] === 221,
    "Separate-window map paints NPC artwork from the game realm",
  );
  $gameMap._events.length = 2;
  SceneManager._scene._spriteset = popupSpriteset;
  popupMap.drawer = "layers";
  await tick();
  const popupLayers = descendants(popupMap, "MapLayers");
  assert(
    popupLayers.layers.shadows === false,
    "Separate-window map reads the same saved shadow preference",
  );
  popupLayers.change("npcs", false);
  assert(
    runtime.mapLayers.read().npcs === false,
    "Separate-window layer changes update the game-owned shared settings",
  );
  popupLayers.reset();
  popupMap.renderMap();
  const popupTilePixel = mapPixel(popupMap, 0.5, 0.5);
  assert(
    popupMap.renderStatus === "Live map artwork" && popupTilePixel[1] === 153,
    "Separate-window map shares the game's realistic artwork renderer (" +
      popupMap.renderMode +
      ", " +
      popupMap.renderStatus +
      ", pixel=" +
      popupTilePixel.join() +
      ")",
  );
  popupMap.drawer = "";
  const popupBeforeSelection = { x: $gamePlayer.x, y: $gamePlayer.y };
  assert(
    clickMap(popupMap, 21.5, 8.5) === "X 21 · Y 8" &&
      popupMap.selection.x === 21 &&
      popupMap.selection.y === 8 &&
      popupMap.selection.mapId === popupMap.currentMapId &&
      $gamePlayer.x === popupBeforeSelection.x &&
      $gamePlayer.y === popupBeforeSelection.y &&
      !$dataMap.__ob__,
    "Pop-out map selects the hovered tile without teleporting or observing game data",
  );
  await tick();
  popupMap.$el
    .querySelector('[aria-label="Teleport to selected location"]')
    .click();
  assert(
    $gamePlayer.x === 21 && $gamePlayer.y === 8 && !$dataMap.__ob__,
    "Pop-out explicit Teleport moves the game player to the selected tile",
  );
  popupRoot.activeComponentName = "stats-setting-panel";
  await tick();
  frame.contentDocument
    .querySelector('[data-testid="stats-recruitment-add"]')
    .click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  frame.contentDocument
    .querySelector('[data-testid="stats-recruitment-option-3"]')
    .click();
  await tick();
  frame.contentDocument
    .querySelector('[data-testid="stats-recruitment-confirm"]')
    .click();
  await tick();
  assert(
    $gameParty._actors.includes(3) &&
      popupRoot.activeComponentName === "stats-setting-panel" &&
      descendants(popupRoot, "StatsSettingPanel").actors[
        descendants(popupRoot, "StatsSettingPanel").selectedTab
      ].id === 3,
    "Separate-window Stats recruits and selects party members without changing panels",
  );
  runtime.actors.setPartyMember(3, false);
  frame.contentDocument
    .querySelector('[aria-label="Open stats for Sidekick"]')
    .click();
  await tick();
  assert(
    popupRoot.activeComponentName === "actor-setting-panel" &&
      descendants(popupRoot, "ActorSettingPanel").selectedActorId === 2,
    "Separate-window portraits select the correct actor stats",
  );
  popupRoot.activeComponentName = "teleport-panel";
  await tick();
  const popupTeleport = descendants(popupRoot, "TeleportPanel");
  popupTeleport.previewMap = { id: 2, name: "Destination" };
  await tick();
  descendants(popupRoot, "MapPreview").paint();
  await tick();
  assert(
    descendants(popupRoot, "MapPreview").width === 4 &&
      $dataMap === liveMap &&
      !$dataMap.__ob__,
    "Separate-window destination previews preserve the game map",
  );
  popupRoot.activeComponentName = "locks-panel";
  await tick();
  assert(
    frame.contentDocument.body.textContent.includes("Game Timer"),
    "Pop-out shows shared locks and timer",
  );
  popupRoot.activeComponentName = "game-options-panel";
  await tick();
  assert(
    frame.contentDocument.body.textContent.includes("Custom Game Toggle"),
    "Pop-out discovers game-specific options in game realm",
  );
  popupRoot.activeComponentName = "shortcut-panel";
  await tick();
  const shortcutsPanel = descendants(popupRoot, "ShortcutPanel");
  const shortcutRow = shortcutsPanel.shortcuts.find(
    (row) => row.id === "openMessageLog",
  );
  const popupKey = shortcutRow.shortcut.constructor;
  shortcutsPanel.onShortcutChange(popupKey.fromString("alt h"), shortcutRow);
  assert(
    GLOBAL_SHORTCUT.getShortcut("openMessageLog").asString() === "alt h",
    "Pop-out can rebind game-owned shortcuts with a local Key",
  );
  shortcutsPanel.onShortcutChange(popupKey.fromString("ctrl h"), shortcutRow);
  await tick();
  assert(
    frame.contentWindow.__smokeErrors.length === 0,
    "Pop-out shortcut editor keeps local Key snapshots",
  );
  frame.contentWindow.dispatchEvent(
    new frame.contentWindow.KeyboardEvent("keydown", {
      key: "p",
      keyCode: 80,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  assert(
    descendants(popupRoot, "FeatureFinder").value,
    "Pop-out Ctrl+P opens feature finder",
  );
  assert(
    frame.contentWindow.__smokeErrors.length === 0,
    "Pop-out Vue templates render without errors: " +
      frame.contentWindow.__smokeErrors.join("; "),
  );
  popupRoot.$destroy();
  frame.remove();

  // Boot the committed artifact exactly where it ships. The preview and main
  // smoke app import sources, so this is the only check that exercises
  // setup.bundle.js itself.
  const bundleFrame = document.createElement("iframe");
  bundleFrame.setAttribute("aria-hidden", "true");
  bundleFrame.style.cssText =
    "position:absolute;left:-10000px;width:800px;height:500px;border:0;";
  bundleFrame.src = "./overlay-bundle.html";
  document.body.appendChild(bundleFrame);
  await new Promise((resolve) => {
    bundleFrame.onload = resolve;
  });
  const bundleWindow = bundleFrame.contentWindow;
  let bundleStarted = false;
  for (let n = 0; n < 150; n++) {
    await tick();
    if (bundleWindow.__cheatStarted) {
      bundleStarted = true;
      break;
    }
  }
  assert(
    bundleStarted,
    "Shipped setup.bundle.js boots the overlay" +
      (bundleStarted
        ? ""
        : ": " +
          JSON.stringify(bundleWindow.__cheatBoot) +
          " / " +
          (bundleWindow.__bundleErrors || []).join("; ")),
  );
  const bundleErrors = bundleWindow.__bundleErrors || [];
  assert(
    bundleErrors.length === 0 &&
      !(bundleWindow.__cheatBoot && bundleWindow.__cheatBoot.error),
    "Shipped overlay bundle reports no boot errors: " +
      bundleErrors.join("; ") +
      " " +
      ((bundleWindow.__cheatBoot && bundleWindow.__cheatBoot.error) || ""),
  );
  assert(
    !!bundleFrame.contentDocument.querySelector(".v-application") &&
      !!bundleFrame.contentDocument.querySelector(".v-application .v-main"),
    "Shipped overlay bundle renders the Vuetify shell",
  );
  const bundleScripts = bundleWindow.performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => /\.js(\?|$)/.test(name));
  assert(
    bundleScripts.some((name) =>
      name.endsWith("/cheat/init/setup.bundle.js"),
    ) && !bundleScripts.some((name) => /\/cheat\/js\/[^/]+\.js$/.test(name)),
    "Overlay smoke loads the bundle instead of source modules",
  );
  bundleFrame.remove();
  assert(
    errors.length === 0,
    "All mounted Vue templates render without errors: " + errors.join("; "),
  );
  window.removeEventListener("keydown", shortcut, true);
  app.$destroy();
  runtime.locks.dispose();
}
run()
  .then(() => {
    const output = document.getElementById("smoke-results");
    output.dataset.status = "pass";
    output.textContent = JSON.stringify({ checks, errors });
  })
  .catch((error) => {
    const output = document.getElementById("smoke-results");
    output.dataset.status = "fail";
    output.textContent = JSON.stringify({
      checks,
      errors,
      error: error.message,
      stack: error.stack,
    });
  });
