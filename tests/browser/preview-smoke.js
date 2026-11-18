const checks = [];
function assert(value, label) {
  if (!value) throw Error(label);
  checks.push(label);
}
const delay = () => new Promise((resolve) => setTimeout(resolve, 25));
function child(vm, name) {
  if (vm.$options.name === name) return vm;
  for (const candidate of vm.$children) {
    const found = child(candidate, name);
    if (found) return found;
  }
  return null;
}
async function run() {
  const game = document.getElementById("preview-frame").contentWindow;
  for (
    let i = 0;
    i < 120 && !(game.__cheatPreview && game.__cheatPreview.ready);
    i++
  )
    await delay();
  assert(
    game.__cheatPreview && game.__cheatPreview.ready,
    "Actual preview entry point boots its development bridge" +
      (!(game.__cheatPreview && game.__cheatPreview.ready)
        ? ": " +
          JSON.stringify(game.__previewErrors) +
          " / " +
          game.document.body.textContent.slice(0, 600)
        : ""),
  );
  const preview = game.__cheatPreview,
    app = preview.app;
  const nav = game.document.querySelector(".cheat-nav");
  assert(
    nav && nav.getBoundingClientRect().width <= 180,
    "Sidebar stays compact instead of reserving a fixed 204px column",
  );
  const content = game.document.querySelector(".cheat-content");
  assert(
    Math.abs(
      content.getBoundingClientRect().left - nav.getBoundingClientRect().right,
    ) <= 1,
    "Panel content starts immediately beside the sidebar",
  );
  function labelsFit() {
    return [...nav.querySelectorAll(".cheat-nav__item > span")].every(
      (label) => {
        if (!label.getClientRects().length) return true;
        const rect = label.getBoundingClientRect();
        return (
          label.scrollWidth <= label.clientWidth + 1 &&
          rect.right <= nav.getBoundingClientRect().right
        );
      },
    );
  }
  assert(
    labelsFit(),
    "Expanded sidebar labels remain readable without horizontal clipping",
  );
  const modal = child(app, "CheatModal");
  const groupToggles = [
    ...nav.querySelectorAll(".cheat-nav__parent[aria-expanded='true']"),
  ];
  assert(
    groupToggles.length > 0,
    "Sidebar groups start expanded so their children are reachable",
  );
  groupToggles.forEach((button) => button.click());
  await delay();
  assert(
    [...nav.querySelectorAll(".cheat-nav__parent")].every(
      (button) => button.getAttribute("aria-expanded") === "false",
    ),
    "Clicking a group header collapses its children",
  );
  assert(
    nav.getBoundingClientRect().width <= 180 && labelsFit(),
    "Collapsed sidebar groups keep their compact readable layout",
  );
  [...nav.querySelectorAll(".cheat-nav__parent")].forEach((button) =>
    button.click(),
  );
  await delay();
  const frame = document.getElementById("preview-frame");
  frame.style.width = "650px";
  await delay();
  await delay();
  assert(
    nav.getBoundingClientRect().width <= 180 && labelsFit(),
    "Compact sidebar also fits a narrower overlay",
  );
  frame.style.width = "1100px";
  await delay();
  const sidebarToggle = game.document.querySelector(
    ".cheat-shell__bar .cheat-icon-button",
  );
  assert(sidebarToggle, "Shell bar exposes a sidebar toggle button");
  sidebarToggle.click();
  await delay();
  assert(
    !game.document.querySelector(".cheat-nav"),
    "Sidebar toggle hides the navigation sidebar",
  );
  sidebarToggle.click();
  await delay();
  const reopenedNav = game.document.querySelector(".cheat-nav");
  assert(
    reopenedNav && reopenedNav.getBoundingClientRect().width > 0,
    "Sidebar toggle reopens the navigation sidebar after closing it",
  );
  assert(
    app.activeComponentName === "map-event-panel",
    "Preview accepts a panel from its URL",
  );
  assert(
    game.$gameMap.events().some((event) => event._characterName),
    "Preview includes real NPC graphics, not only trigger markers",
  );
  const map = child(app, "InteractiveMap");
  map.renderMap();
  assert(
    map.renderStatus === "Live map artwork",
    "Preview renders generated map tiles without game files",
  );
  assert(
    map.$el.querySelector('[aria-label="Map controls"]') &&
      map.$el.querySelector('[aria-label="Map navigation"]') &&
      !map.$el.querySelector(".v-expansion-panels"),
    "Unified map places compact controls on the artwork instead of below it",
  );
  map.$el.querySelector('[aria-label="Map layers"]').click();
  await delay();
  assert(child(map, "MapLayers").inline, "Layers open directly inside the map");
  child(map, "MapLayers").change("labels", true);
  map.drawer = "";
  map.fitMap();
  const cameraBeforeZoom = map._camera;
  map.$el.querySelector('[aria-label="Zoom in"]').click();
  await delay();
  assert(
    map._camera.unit > cameraBeforeZoom.unit,
    "On-map zoom controls change the shared camera",
  );
  map.$el.querySelector('[aria-label="Fit whole map"]').click();
  await delay();
  assert(
    map._camera.zoom === 1,
    "Fit whole map restores overview without changing game position",
  );
  assert(
    game.SceneManager._scene._spriteset._characterSprites.length >= 3,
    "Preview has loaded live sprite frames for map NPCs",
  );
  const currentMap = game.$dataMap;
  const currentPreview = await game.__cheatFeatures.previews.load(1);
  const destination = await game.__cheatFeatures.previews.load(2);
  assert(
    currentPreview.width === currentMap.width &&
      currentPreview.data !== currentMap.data &&
      destination.width === 6 &&
      game.$dataMap === currentMap,
    "Preview destinations load without accessing or replacing game files",
  );
  const panels = [...new Set(preview.panels.map((row) => row.value))];
  for (const panel of panels) {
    app.activeComponentName = panel;
    await delay();
    await delay();
    const mounted = child(app, "CheatModal").$refs.panel;
    assert(
      mounted && mounted.$options && typeof mounted.$options.name === "string",
      "Preview mounts " +
        panel +
        " as a real component (not an unknown element)",
    );
  }
  app.activeComponentName = "teleport-panel";
  await delay();
  await delay();
  const teleportTable = game.document.querySelector(".v-data-table");
  const teleportRows = teleportTable
    ? teleportTable.querySelectorAll("tbody tr")
    : [];
  assert(
    teleportTable &&
      teleportRows.length > 1 &&
      !teleportTable.querySelector(".v-data-table__empty-wrapper"),
    "Teleport lists the project maps instead of an empty table",
  );
  app.activeComponentName = "game-options-panel";
  await delay();
  await delay();
  const options = child(app, "GameOptionsPanel");
  const toggles = [...options.$el.querySelectorAll(".v-input--checkbox")];
  assert(
    toggles.length >= 3 &&
      toggles.every((toggle) => {
        // This harness omits CDN skins, so verify the sizing contract rather
        // than unstyled checkbox/label elements stacking in the fixture.
        const row = toggle.parentElement.parentElement;
        const slot = toggle.querySelector(".v-input__slot");
        const rowStyle = game.getComputedStyle(row);
        return (
          parseFloat(game.getComputedStyle(slot).minHeight) === 26 &&
          parseFloat(rowStyle.paddingTop) === 1 &&
          parseFloat(rowStyle.paddingBottom) === 1
        );
      }),
    "Game Options checkbox sizing overrides the shared text-field minimum",
  );
  const numericSlots = [
    ...options.$el.querySelectorAll(".v-text-field .v-input__slot"),
  ];
  assert(
    numericSlots.length >= 4 &&
      numericSlots.every(
        (slot) => parseFloat(game.getComputedStyle(slot).minHeight) >= 34,
      ),
    "Compact toggle spacing does not shrink numeric game-option fields",
  );
  const previousDash = options.rows.find(
    (row) => row.symbol === "alwaysDash",
  ).value;
  const dashLabel = toggles
    .find((toggle) => toggle.textContent.includes("Always Dash"))
    .querySelector("label");
  dashLabel.click();
  await delay();
  assert(
    options.rows.find((row) => row.symbol === "alwaysDash").value !==
      previousDash,
    "Compact checkbox labels still toggle their game option",
  );
  options.$el.querySelector('[data-feature="always-dash"] label').click();
  await delay();
  app.activeComponentName = "appearance-panel";
  await delay();
  await delay();
  const appearance = child(app, "AppearancePanel");
  const savedAccent = appearance.primaryColor;
  assert(
    !appearance.$el.querySelector(".cheat-accent-groups") &&
      appearance.$el.querySelectorAll('[role="radio"]').length === 12,
    "Appearance offers one palette without Theme/Original tabs",
  );
  appearance.$el.querySelector('[aria-label="Blue"]').click();
  await delay();
  assert(
    appearance.primaryColor === "#3B82F6",
    "Modern Blue remains available alongside the released default",
  );
  const defaultAccent = appearance.$el.querySelector('[aria-label="Default"]');
  assert(
    defaultAccent.textContent.trim() === "Default",
    "The released default has a visible label, not only a color swatch",
  );
  defaultAccent.click();
  await delay();
  assert(
    appearance.primaryColor === "#1976D2" &&
      app.$vuetify.theme.themes.dark.primary === "#1976D2" &&
      app.$vuetify.theme.themes.light.primary === "#1976D2",
    "Default restores the v1.8.0 accent for both themes",
  );
  app.activeComponentName = "general-panel";
  await delay();
  app.activeComponentName = "appearance-panel";
  await delay();
  const reopenedAppearance = child(app, "AppearancePanel");
  assert(
    reopenedAppearance.primaryColor === "#1976D2" &&
      reopenedAppearance.$el
        .querySelector('[aria-label="Default"]')
        .getAttribute("aria-checked") === "true",
    "Default stays selected after leaving and reopening Appearance",
  );
  reopenedAppearance.selectColor(savedAccent);
  const setStyle = async (value) => {
    const panel = child(app, "AppearancePanel");
    panel.$el.querySelector(".v-select .v-input__slot").click();
    await delay();
    await delay();
    const item = [
      ...game.document.querySelectorAll(".v-menu__content .v-list-item"),
    ].find((node) => node.textContent.trim() === value);
    assert(item, "Color theme menu offers " + value);
    item.click();
    await delay();
  };
  await setStyle("Legacy");
  const appRoot = game.document.querySelector(".v-application");
  const shell = game.document.querySelector(".cheat-shell");
  assert(
    appRoot.getAttribute("data-cheat-theme") === "legacy" &&
      game.getComputedStyle(shell).backgroundColor === "rgb(30, 30, 30)" &&
      app.$vuetify.theme.themes.dark.accent === "#FF4081" &&
      child(app, "AppearancePanel").primaryColor === savedAccent,
    "Legacy restores charcoal surfaces and Material colors without resetting the accent",
  );
  const legacyPanel = child(app, "AppearancePanel");
  legacyPanel.isDarkMode = false;
  legacyPanel.onThemeChange();
  await delay();
  assert(
    game.getComputedStyle(shell).backgroundColor === "rgb(250, 250, 250)" &&
      game.getComputedStyle(shell.querySelector(".cheat-shell__bar"))
        .backgroundImage === "none",
    "Legacy has neutral light surfaces as well as dark ones",
  );
  legacyPanel.isDarkMode = true;
  legacyPanel.onThemeChange();
  app.activeComponentName = "general-panel";
  await delay();
  app.activeComponentName = "appearance-panel";
  await delay();
  assert(
    child(app, "AppearancePanel").themeStyle === "legacy",
    "Legacy remains selected after reopening Appearance",
  );
  assert(
    JSON.parse(game.__cheatFeatures.options.exportProfile()).appearance
      .themeStyle === "legacy",
    "Portable settings include the selected color theme",
  );
  await setStyle("Current");
  assert(
    appRoot.getAttribute("data-cheat-theme") === "current" &&
      game.getComputedStyle(shell).backgroundColor === "rgb(11, 18, 32)" &&
      app.$vuetify.theme.themes.dark.accent === "#38bdf8",
    "Current restores the slate design after leaving Legacy",
  );
  app.activeComponentName = "message-log-panel";
  await delay();
  const log = child(app, "MessageLogPanel");
  assert(
    log.rows.some((row) => row.type === "choice") &&
      log.rows.some((row) => row.actorId > 0),
    "Preview seeds portraits and chosen responses for Message Log design",
  );
  assert(
    log.$el.querySelector(".cheat-message-copy").style.fontSize === "16px",
    "Standalone preview uses the current readable log defaults",
  );
  const history = log.$el.querySelector(".message-log__history");
  assert(
    history.scrollHeight > history.clientHeight + 40,
    "Preview seeds enough dialogue for the log to scroll",
  );
  const atBottom = () =>
    history.scrollHeight - history.clientHeight - history.scrollTop <= 2;
  assert(
    atBottom() && log.followLatest === true,
    "Message Log opens pinned to the newest line",
  );
  history.scrollTop = 120;
  history.dispatchEvent(new game.Event("scroll"));
  await delay();
  assert(
    log.followLatest === false,
    "Scrolling up stops the log from following the tail",
  );
  app.activeComponentName = "general-panel";
  await delay();
  app.activeComponentName = "message-log-panel";
  await delay();
  await delay();
  const reopenedLog = child(app, "MessageLogPanel");
  const reopenedHistory = reopenedLog.$el.querySelector(
    ".message-log__history",
  );
  assert(
    Math.abs(reopenedHistory.scrollTop - 120) <= 2 &&
      reopenedLog.followLatest === false,
    "Returning to the Message Log tab keeps the reading position",
  );
  reopenedHistory.scrollTop = reopenedHistory.scrollHeight;
  reopenedHistory.dispatchEvent(new game.Event("scroll"));
  await delay();
  assert(
    reopenedLog.followLatest === true,
    "Scrolling back to the tail resumes following new messages",
  );
  app.setScene("title");
  await delay();
  assert(
    game.SceneManager._scene instanceof game.Scene_Title,
    "Preview can simulate the title/no-save scene",
  );
  assert(
    !game.$gamePlayer &&
      !game.$gameParty &&
      child(app, "GeneralPanel").gameReady === false,
    "Title scenario disables gameplay controls until a demo session is available",
  );
  app.setScene("battle");
  await delay();
  assert(
    game.SceneManager._scene instanceof game.Scene_Battle,
    "Preview can simulate battle UI without a game",
  );
  app.setScene("map");
  await delay();
  assert(
    game.SceneManager._scene instanceof game.Scene_Map,
    "Preview can return to exploration",
  );
  assert(
    preview.errors.length === 0,
    "Preview panels render without Vue errors: " + preview.errors.join("; "),
  );
  assert(
    !game.$dataActors.__ob__ && !game.$dataMap.__ob__,
    "Preview keeps game data outside Vue observation",
  );
  const mvFrame = document.createElement("iframe");
  mvFrame.src =
    "/preview/index.html?testing=1&engine=MV&panel=message-log-panel";
  document.body.appendChild(mvFrame);
  for (
    let i = 0;
    i < 120 &&
    !(
      mvFrame.contentWindow.__cheatPreview &&
      mvFrame.contentWindow.__cheatPreview.ready
    );
    i++
  )
    await delay();
  const mv = mvFrame.contentWindow;
  assert(
    mv.__cheatPreview &&
      mv.__cheatPreview.ready &&
      mv.Utils.RPGMAKER_NAME === "MV",
    "Standalone preview also boots the MV UI branch without a game",
  );
  for (const panel of panels) {
    mv.__cheatPreview.app.activeComponentName = panel;
    await delay();
    const mvPanel = child(mv.__cheatPreview.app, "CheatModal").$refs.panel;
    assert(
      mvPanel && mvPanel.$options && typeof mvPanel.$options.name === "string",
      "MV preview mounts " + panel + " as a real component",
    );
  }
  assert(
    mv.__cheatPreview.errors.length === 0,
    "MV preview reports no Vue errors: " + mv.__cheatPreview.errors.join("; "),
  );
  return checks;
}
run()
  .then((checks) => {
    const output = document.getElementById("smoke-results");
    output.dataset.status = "pass";
    output.textContent = JSON.stringify({ checks, errors: [] });
  })
  .catch((error) => {
    const output = document.getElementById("smoke-results");
    output.dataset.status = "fail";
    output.textContent = JSON.stringify({
      checks,
      error: error.message,
      stack: error.stack,
    });
  });
