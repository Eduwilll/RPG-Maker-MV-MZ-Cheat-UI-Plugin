const checks = [];
const errors = [];
const edition =
  new URLSearchParams(location.search).get("edition") || "offline";
const engine = new URLSearchParams(location.search).get("engine") || "MZ";
function assert(value, message) {
  if (!value) throw new Error(message);
  checks.push(message);
}
async function until(test, label) {
  const deadline = Date.now() + 20000;
  while (!test()) {
    if (Date.now() > deadline) throw new Error("Timed out: " + label);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
function observe(view) {
  view.addEventListener("error", (e) => errors.push(e.message));
  view.addEventListener("unhandledrejection", (e) =>
    errors.push(String(e.reason)),
  );
}
async function run() {
  const gameFrame = document.createElement("iframe");
  gameFrame.width = "1000";
  gameFrame.height = "650";
  gameFrame.src =
    "./compact-view.html?edition=" + edition + "&engine=" + engine;
  document.body.appendChild(gameFrame);
  gameFrame.addEventListener("load", () => observe(gameFrame.contentWindow));
  await until(
    () =>
      gameFrame.contentWindow.__cheatStarted ||
      (gameFrame.contentWindow.__cheatBoot &&
        gameFrame.contentWindow.__cheatBoot.error),
    "overlay startup",
  );
  const game = gameFrame.contentWindow;
  assert(
    game.__cheatStarted,
    "Compact " +
      edition +
      " overlay starts: " +
      JSON.stringify(game.__cheatBoot),
  );
  assert(
    game.__cheatFeatures.database === game.__cheatSaveRuntime,
    "Overlay reuses early save runtime",
  );
  await game.document.fonts.load('16px "Material Design Icons"');
  assert(
    game.document.fonts.check('16px "Material Design Icons"'),
    "Icon font loads from bundled or verified bytes",
  );
  game.GeneralCheat.openCheatModal("watcher-panel");
  await until(
    () => game.document.querySelector(".cheat-shell"),
    "overlay shell",
  );
  assert(
    !game.document.querySelector("#cheat-boot-warning"),
    "Overlay has no boot warning",
  );
  const popupFrame = document.createElement("iframe");
  popupFrame.width = "1000";
  popupFrame.height = "650";
  popupFrame.src = "/output/runtime/" + edition + "/cheat/window.html";
  popupFrame.addEventListener("load", () => {
    const popup = popupFrame.contentWindow;
    observe(popup);
    setTimeout(() => {
      popup.__cheatOpener = game;
    }, 100);
  });
  document.body.appendChild(popupFrame);
  await until(
    () =>
      popupFrame.contentWindow.__cheatStarted ||
      (popupFrame.contentWindow.__cheatBoot &&
        popupFrame.contentWindow.__cheatBoot.error),
    "popout startup",
  );
  const popup = popupFrame.contentWindow;
  assert(
    popup.__cheatStarted,
    "Compact popout waits for its explicit game reference: " +
      JSON.stringify(popup.__cheatBoot),
  );
  assert(
    popup.document.querySelector(".cheat-window-ready"),
    "Popout reveals the rendered Vue root",
  );
  assert(
    popup.__cheatOpener.__cheatFeatures === game.__cheatFeatures,
    "Popout shares the game runtime",
  );
  assert(popup.$dataMap === game.$dataMap, "Popout bridges live game globals");
  assert(
    errors.length === 0,
    "No compact startup errors: " + errors.join("; "),
  );
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
