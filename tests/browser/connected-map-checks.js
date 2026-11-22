import { SAVED_LOCATIONS } from "../../cheat-engine/www/cheat/js/runtime/SavedLocations.js";

export async function connectedMapChecks({
  root,
  view,
  game,
  route,
  find,
  assert,
  tick,
  label,
}) {
  await route("teleport-panel");
  const teleport = find(root, "TeleportPanel");
  teleport.selectMap({ id: 2, name: "Destination" });
  await tick();
  const preview = find(root, "MapPreview");
  for (let i = 0; i < 30 && !preview.width; i++) await tick();
  for (let i = 0; i < 100 && !preview.ready; i++) {
    preview.paint();
    await tick();
  }
  await tick();
  preview.$el.querySelector('[aria-label="Zoom in preview"]').click();
  await tick();
  assert(
    preview.zoom > 1,
    label + ": destination map zoom controls are usable",
  );
  const canvas = preview.$refs.preview,
    rect = canvas.getBoundingClientRect(),
    v = preview._view;
  assert(!!v, label + ": selecting a map shows an inline preview");
  canvas.dispatchEvent(
    new view.MouseEvent("click", {
      bubbles: true,
      clientX: rect.left + ((v.ox + 2.5 * v.unit) * rect.width) / 480,
      clientY: rect.top + ((v.oy + 1.5 * v.unit) * rect.height) / 300,
    }),
  );
  await tick();
  assert(
    teleport.inputX === "2" && teleport.inputY === "1",
    label + ": clicking the map selects exact destination coordinates",
  );
  preview.$el.querySelector('[aria-label="Fit preview map"]').click();
  await tick();
  assert(preview.zoom === 1, label + ": Fit restores the destination overview");
  const originalTransfer = game.$gamePlayer.reserveTransfer;
  let centerTransfers = 0;
  game.$gamePlayer.reserveTransfer = () => centerTransfers++;
  teleport.selectMapCenter();
  await tick();
  game.$gamePlayer.reserveTransfer = originalTransfer;
  assert(
    centerTransfers === 0 &&
      Number(teleport.inputX) === Math.floor(preview.width / 2),
    label + ": Map center chooses a destination without teleporting",
  );
  preview.fit();
  teleport.selectMap({ id: 2, name: "Destination" });
  await tick();
  assert(
    teleport.validDestination,
    label + ": reselecting the same map keeps destination actions available",
  );
  const previousWidth = teleport.$el.style.width;
  teleport.$el.style.width = "1400px";
  await tick();
  const largeBounds = canvas.getBoundingClientRect();
  const proportional =
    Math.abs(
      largeBounds.width / largeBounds.height - canvas.width / canvas.height,
    ) < 0.01;
  teleport.$el.style.width = previousWidth;
  assert(
    proportional,
    label +
      ": wide-window previews preserve their coordinate-to-image proportions",
  );
  teleport.saving = true;
  await tick();
  const form = find(root, "SaveMapPoint");
  const originalCount = SAVED_LOCATIONS.read().length;
  assert(
    form.name === "",
    label + ": unnamed points begin with an empty editable name",
  );
  await form.save();
  await tick();
  const unnamed = SAVED_LOCATIONS.read().find(
    (row) =>
      row.name === "Saved point" &&
      row.mapId === 2 &&
      row.x === 2 &&
      row.y === 1,
  );
  assert(!!unnamed, label + ": saving without a name uses the default alias");
  SAVED_LOCATIONS.remove(unnamed.id);
  teleport.saving = true;
  await tick();
  const invalidForm = find(root, "SaveMapPoint");
  teleport.inputX = "999";
  await tick();
  await invalidForm.save();
  assert(
    SAVED_LOCATIONS.read().length === originalCount &&
      invalidForm.error.length > 0,
    label + ": saving coordinates outside the map is rejected",
  );
  teleport.inputX = "2";
  await tick();
  const namedForm = find(root, "SaveMapPoint");
  namedForm.name = label + " shop";
  namedForm.flags = ["Shop"];
  await namedForm.save();
  await tick();
  const saved = SAVED_LOCATIONS.read().find(
    (row) => row.name === label + " shop",
  );
  assert(
    saved &&
      saved.mapId === 2 &&
      saved.x === 2 &&
      saved.y === 1 &&
      saved.flags[0] === "Shop",
    label + ": saving from the preview persists its chosen point and tag",
  );
  await route("save-recall-panel");
  const locations = find(root, "SaveRecallPanel");
  assert(!!locations, label + ": saved locations panel opens");
  locations.select(saved);
  await tick();
  const recalled = find(root, "MapPreview");
  for (let i = 0; i < 20 && !recalled.width; i++) await tick();
  assert(
    recalled.mapId === 2 &&
      recalled.x === 2 &&
      recalled.y === 1 &&
      recalled.points.some((row) => row.id === saved.id),
    label + ": saved-location preview highlights the stored coordinates",
  );
  locations.choosePoint({ mapId: 2, x: 3, y: 1 });
  await tick();
  assert(
    !locations.selected.id &&
      SAVED_LOCATIONS.read().find((row) => row.id === saved.id).x === 2,
    label +
      ": choosing another tile creates a draft without changing the saved place",
  );
  locations.select(saved);
  await tick();

  const currentId = game.$gameMap.mapId(),
    oldPages = game.$dataMap.events[1].pages;
  const oldEvent = game.$gameMap.event,
    oldScroll = game.$dataMap.scrollType;
  const oldFacing = {
    direction: game.$gamePlayer.direction,
    roundXWithDirection: game.$gameMap.roundXWithDirection,
    roundYWithDirection: game.$gameMap.roundYWithDirection,
    eventsXy: game.$gameMap.eventsXy,
    record: game.$gameMap._events[1].event,
  };
  game.$gamePlayer.direction = () => 6;
  game.$gameMap.roundXWithDirection = (x) => x + 1;
  game.$gameMap.roundYWithDirection = (y) => y;
  game.$gameMap.eventsXy = () => [game.$gameMap._events[1]];
  game.$gameMap._events[1].event = () => game.$dataMap.events[1];
  game.$dataMap.scrollType = 0;
  game.$dataMap.events[1].pages = [
    {
      conditions: { switch1Valid: true, switch1Id: 1 },
      list: [
        { code: 122, indent: 0, parameters: [1, 1, 0, 0, 5] },
        { code: 0, indent: 0, parameters: [] },
      ],
    },
  ];
  game.$gameMap.event = (id) => game.$gameMap._events[id];
  const mapPoint = SAVED_LOCATIONS.add({
    name: label + " checkpoint",
    mapId: currentId,
    x: 15,
    y: 5,
    flags: ["Checkpoint"],
  });
  await route("map-event-panel");
  const map = find(root, "InteractiveMap");
  map._pointsTime = 0;
  map.renderMap();
  assert(
    map._selectionMarkers.some(
      (row) => row.id === mapPoint.id && row.kind === "saved",
    ),
    label + ": tagged saved points are included on the live map",
  );
  map.selection = { mapId: currentId, id: 1, kind: "event", x: 8, y: 4 };
  await tick();
  const actions = map.$el.querySelector(".interactive-map__selection-actions");
  assert(!!actions, label + ": map actions have a dedicated aligned toolbar");
  const buttons = Array.from(actions.querySelectorAll("button"));
  const bounds = buttons.map((button) => button.getBoundingClientRect());
  assert(
    bounds.every((rect) => Math.abs(rect.height - bounds[0].height) < 1),
    label + ": map action buttons have matching heights",
  );
  buttons.forEach((button) => {
    const icon = button.querySelector(".v-icon");
    if (!icon) return;
    const b = button.getBoundingClientRect(),
      i = icon.getBoundingClientRect();
    assert(
      Math.abs(i.top + i.height / 2 - b.top - b.height / 2) < 2,
      label + ": " + button.textContent.trim() + " icon is vertically centered",
    );
  });
  map.analyzeSelection();
  await tick();
  const analyzer = find(root, "EventAnalyzerPanel");
  for (let i = 0; i < 10 && analyzer && analyzer.selectedEventId !== 1; i++)
    await tick();
  assert(
    analyzer && analyzer.rootType === "map" && analyzer.selectedEventId === 1,
    label + ": Analyze opens the exact map event",
  );
  const context = find(root, "EventContext");
  context.refresh();
  assert(
    context.context.facingEvent && context.context.facingEvent.id === 1,
    label + ": Facing Event identifies the event to inspect",
  );
  analyzer.entryMode = "nearby";
  await tick();
  context.refresh();
  const distances = context.events.map((row) => row.distance);
  assert(
    context.events.length > 0 &&
      distances.every(
        (distance, index) => !index || distance >= distances[index - 1],
      ),
    label + ": Nearby events are populated and closest first",
  );
  const nearbyChoice = analyzer.$el.querySelector(
    ".event-context .event-choice",
  );
  assert(!!nearbyChoice, label + ": nearby events can be selected directly");
  nearbyChoice.click();
  await tick();
  analyzer.$el.querySelectorAll(".inspector-views button")[1].click();
  await tick();
  assert(
    analyzer.referenceRows.some(
      (row) => row.type === "variable" && row.id === 1 && row.eventId === 1,
    ),
    label + ": Analyzer shows editable references with their owning event",
  );
  assert(
    find(root, "EventReferenceTable").compact &&
      !view.document.querySelector(".event-context .v-data-table"),
    label +
      ": event values have one focused inspector instead of duplicate tables",
  );
  const table = find(root, "EventReferenceTable"),
    variable = analyzer.referenceRows.find((row) => row.type === "variable");
  variable.value = "99";
  table.change(variable);
  assert(
    game.$gameVariables.value(1) === 99,
    label + ": Analyzer writes variables as numbers, not concatenating strings",
  );
  analyzer.detailTab = "tree";
  await analyzer.trace();
  await tick();
  assert(
    analyzer.traceTree && analyzer.treeItems.length > 0,
    label + ": execution tracing remains available without running commands",
  );
  assert(
    !analyzer.executionUnlocked &&
      !analyzer.$el.querySelector(".event-analyzer__run"),
    label + ": command inspection hides Run actions until explicitly enabled",
  );
  analyzer.jumpToBattleEvent(1);
  await tick();
  assert(
    analyzer.rootType === "battle" && analyzer.detailTab === "tree",
    label + ": following a battle reference stays in the command view",
  );
  analyzer.setEntryMode("facing");
  await tick();
  assert(
    analyzer.rootType === "map" && analyzer.selectedEventId === 1,
    label + ": Facing returns from battle browsing to the current map event",
  );
  analyzer.db._commonEvents.set(900, {
    id: 900,
    name: "Conditional common",
    trigger: 2,
    switchId: 1,
    list: [{ code: 0, parameters: [] }],
  });
  analyzer.dbVersion++;
  analyzer.rootType = "common";
  analyzer.selectedCeId = 900;
  await tick();
  analyzer.refreshReferences();
  assert(
    analyzer.referenceRows.some((row) => row.type === "switch" && row.id === 1),
    label + ": common event activation switches are editable",
  );
  analyzer.db._battleTroops.set(900, {
    id: 900,
    name: "Conditional battle",
    pages: [
      {
        conditions: { switchValid: true, switchId: 2 },
        list: [{ code: 0, parameters: [] }],
      },
    ],
  });
  analyzer.dbVersion++;
  analyzer.rootType = "battle";
  analyzer.selectedTroopId = 900;
  await tick();
  analyzer.refreshReferences();
  assert(
    analyzer.referenceRows.some((row) => row.type === "switch" && row.id === 2),
    label + ": battle page activation switches are editable",
  );
  analyzer.setEntryMode("facing");
  await tick();
  analyzer.confirmExecution({
    eventKey: "map:" + currentId + ":1:0",
    commandIndex: 0,
  });
  await tick();
  assert(
    !!analyzer.pendingRun,
    label + ": running game commands requires an explicit confirmation",
  );
  analyzer.pendingRun = null;
  analyzer.showOnMap();
  await tick();
  let returned = find(root, "InteractiveMap");
  assert(
    returned && returned.selection && returned.selection.id === 1,
    label + ": Show on map returns to and selects the analyzed event",
  );
  returned.openActor();
  await tick();
  const nonParty = game.$dataActors
    .filter(Boolean)
    .find((row) => !game.$gameParty._actors.includes(row.id));
  assert(
    returned.actorPicker &&
      returned.actorChoices.length ===
        game.$dataActors.filter((row) => row && row.id > 0).length,
    label + ": NPC and enemy selections can browse every actor record",
  );
  assert(
    nonParty && returned.actorChoices.some((row) => row.id === nonParty.id),
    label + ": the map actor picker includes non-party characters",
  );
  returned.actorSearch = String(nonParty.name);
  await tick();
  const record = Array.from(
    view.document.querySelectorAll(".map-actor-picker__list .v-list-item"),
  ).find((node) => node.textContent.includes("#" + nonParty.id));
  assert(!!record, label + ": actor search filters the map picker");
  record.click();
  await tick();
  assert(
    find(root, "ActorSettingPanel").selectedActorId === nonParty.id,
    label +
      ": picking a non-party actor opens its editor without changing the event",
  );
  await route("map-event-panel");
  returned = find(root, "InteractiveMap");
  returned.renderMap();
  const actor = returned._selectionMarkers.find((row) => row.actorId);
  assert(!!actor, label + ": party markers carry confirmed actor identities");
  returned.selection = Object.assign({ mapId: currentId }, actor);
  returned.openActor();
  await tick();
  assert(
    find(root, "ActorSettingPanel").selectedActorId === actor.actorId,
    label + ": Open actor selects the party member's existing editor",
  );
  const actorPanel = find(root, "ActorSettingPanel"),
    oldLeader = game.$gameParty.leader,
    oldActors = actorPanel.actors;
  assert(
    !!actorPanel.selectedMapActor,
    label + ": visible party actor has a map return link",
  );
  game.$gameParty.leader = () => null;
  actorPanel.actors = oldActors.map((row) =>
    Object.assign({}, row, {
      isInParty: row.id === actor.actorId ? false : row.isInParty,
    }),
  );
  await tick();
  assert(
    !actorPanel.selectedMapActor,
    label + ": map return link updates after the party snapshot changes",
  );
  game.$gameParty.leader = oldLeader;
  actorPanel.actors = oldActors.slice();
  await tick();
  assert(
    !!actorPanel.selectedMapActor,
    label + ": map return link reappears after recruitment",
  );
  await route("watcher-panel");
  assert(
    !find(root, "EventContext") &&
      !view.document.body.textContent.includes("Nearby Map References"),
    label + ": Watch no longer duplicates map references",
  );
  SAVED_LOCATIONS.remove(saved.id);
  SAVED_LOCATIONS.remove(mapPoint.id);
  game.$dataMap.events[1].pages = oldPages;
  game.$gameMap.event = oldEvent;
  game.$dataMap.scrollType = oldScroll;
  game.$gamePlayer.direction = oldFacing.direction;
  game.$gameMap.roundXWithDirection = oldFacing.roundXWithDirection;
  game.$gameMap.roundYWithDirection = oldFacing.roundYWithDirection;
  game.$gameMap.eventsXy = oldFacing.eventsXy;
  game.$gameMap._events[1].event = oldFacing.record;
}
