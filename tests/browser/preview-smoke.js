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
    "Actual preview entry point boots its development bridge",
  );
  const preview = game.__cheatPreview,
    app = preview.app;
  assert(
    app.activeComponentName === "map-event-panel",
    "Preview accepts a panel from its URL",
  );
  assert(
    game.$gameMap.events().some((event) => event._characterName),
    "Preview includes real NPC graphics, not only trigger markers",
  );
  const map = child(app, "MapEventPanel");
  map.renderMap();
  assert(
    map.renderStatus === "Live map artwork",
    "Preview renders generated map tiles without game files",
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
    assert(child(app, "CheatModal").$refs.panel, "Preview mounts " + panel);
  }
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
    assert(
      child(mv.__cheatPreview.app, "CheatModal").$refs.panel,
      "MV preview mounts " + panel,
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
