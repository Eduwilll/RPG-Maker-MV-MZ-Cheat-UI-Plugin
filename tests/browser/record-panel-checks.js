export async function recordPanelChecks({
  root,
  view,
  route,
  find,
  assert,
  tick,
  label,
}) {
  const visible = (node) => !!node && node.getClientRects().length > 0;
  const button = (panel, text) =>
    Array.from(panel.$el.querySelectorAll("button")).find(
      (node) => visible(node) && node.textContent.trim() === text,
    );
  const switchView = async (panel, text) => {
    const node = button(panel, text);
    assert(!!node, label + ": " + text + " is reachable");
    node.click();
    await tick();
  };
  await route("actor-setting-panel");
  const actor = find(root, "ActorSettingPanel");
  const first = actor.actors[0];
  actor.actorSearch = String(first.id);
  await tick();
  assert(
    actor.actorRows.some((row) => row.id === first.id),
    label + ": actor search includes exact ID",
  );
  actor.actorSearch = "no-such-actor-999999";
  await tick();
  assert(
    !actor.actorRows.length && !!actor.$el.querySelector(".workspace-empty"),
    label + ": actor finder has a useful empty state",
  );
  actor.actorSearch = "";
  await switchView(actor, "Party");
  assert(
    actor.actorRows.every((row) => row.isInParty),
    label + ": Party filter excludes other actors",
  );
  await switchView(actor, "All");
  actor.selectActor(first.id);
  await tick();
  for (const section of ["Parameters", "Skills", "Status", "Overview"])
    await switchView(actor, section);
  assert(
    actor.selectedActorId === first.id &&
      visible(actor.$el.querySelector('[aria-label="Identity and vitals"]')),
    label + ": actor sections retain exact-ID selection",
  );
  const nameLabel = Array.from(actor.$el.querySelectorAll("label")).find(
    (node) => node.textContent === "Name",
  );
  const nameInput = view.document.getElementById(nameLabel.htmlFor);
  const originalName = actor.detail.name;
  nameInput.focus();
  await tick();
  nameInput.value = originalName + " test";
  nameInput.dispatchEvent(new view.Event("input", { bubbles: true }));
  await tick();
  nameInput.blur();
  await tick();
  assert(
    actor.liveActor().name() === originalName + " test" &&
      actor.selectedActorId === first.id,
    label +
      ": identity field edits the selected live actor " +
      JSON.stringify({
        originalName,
        draft: actor.detail.name,
        actual: actor.liveActor().name(),
        selected: actor.selectedActorId,
        expectedId: first.id,
        setter: typeof actor.liveActor().setName,
      }),
  );
  nameInput.focus();
  await tick();
  nameInput.value = originalName;
  nameInput.dispatchEvent(new view.Event("input", { bubbles: true }));
  await tick();
  nameInput.blur();
  await tick();

  for (const [panelId, section] of [
    ["skill-editor-panel", "Damage"],
    ["class-editor-panel", "Progression"],
    ["enemy-editor-panel", "Actions & traits"],
  ]) {
    await route(panelId);
    const panel = find(root, "DatabaseEditorPanel");
    if (panel.kind === "enemy") {
      panel.enemyView = "records";
      await tick();
    }
    const selected = panel.state.selectedId;
    const key =
      panel.kind === "skill"
        ? "mpCost"
        : panel.kind === "enemy"
          ? "gold"
          : null;
    if (key)
      panel.state.draft[key] = Number(panel.state.original[key] || 0) + 1;
    else panel.setCurve(0, Number(panel.state.original.params[0][1]) + 1);
    await tick();
    assert(
      panel.hasDraftChanges &&
        panel.$el.textContent.includes("Unapplied changes"),
      label + ": " + panel.kind + " marks unapplied edits",
    );
    await switchView(panel, section);
    assert(
      panel.hasDraftChanges && panel.state.selectedId === selected,
      label + ": " + panel.kind + " section navigation preserves draft",
    );
    const other = panel.state.rows.find((row) => row.id !== selected);
    if (other) {
      panel.choose(other.id);
      await tick();
      assert(
        !!panel.confirmation &&
          panel.state.selectedId === selected &&
          panel.hasDraftChanges,
        label + ": " + panel.kind + " changing record protects unapplied edits",
      );
      const cancel = Array.from(
        view.document.querySelectorAll(".v-dialog button"),
      ).find((node) => visible(node) && node.textContent.trim() === "Cancel");
      assert(!!cancel, label + ": discard confirmation can be cancelled");
      cancel.click();
      await tick();
      assert(
        !panel.confirmation &&
          panel.state.selectedId === selected &&
          panel.hasDraftChanges,
        label + ": cancellation keeps original draft and selection",
      );
    }
    panel.search = null;
    await tick();
    assert(
      panel.rows.length === panel.state.rows.length,
      label + ": " + panel.kind + " clear search restores records",
    );
    await switchView(panel, "Discard Draft");
    assert(
      !panel.hasDraftChanges,
      label + ": " + panel.kind + " discards only the draft",
    );
    const apply = button(panel, "Apply");
    assert(
      apply.disabled,
      label + ": " + panel.kind + " Apply is disabled without changes",
    );
    if (panel.kind === "skill") {
      panel.state.draft.mpCost = "not a number";
      await tick();
      await switchView(panel, "Apply");
      assert(
        !!panel.error && !!panel.$el.querySelector('[role="alert"]'),
        label + ": invalid draft shows an announced error",
      );
      panel.discard();
      await tick();
    }
    const content = panel.$el.querySelector(".record-workspace");
    assert(
      content.scrollWidth <= content.clientWidth + 2,
      label +
        ": " +
        panel.kind +
        " inspector does not overflow (" +
        content.clientWidth +
        "/" +
        content.scrollWidth +
        ")",
    );
    panel.state = null;
    panel.error = "Game runtime was not ready.";
    await tick();
    await switchView(panel, "Retry loading");
    assert(
      !!panel.state && !!panel.state.draft && !panel.error,
      label +
        ": " +
        panel.kind +
        " initialization can recover without leaving the panel",
    );
  }
  const enemies = find(root, "DatabaseEditorPanel");
  enemies.enemyView = "encounters";
  await tick();
  const encounter = find(root, "EncounterBrowser");
  encounter.search = null;
  await tick();
  assert(
    encounter.rows.length === encounter.encounters.length,
    label + ": clearing troop search is safe",
  );
  await switchView(encounter, "Map events");
  assert(
    visible(
      encounter.$el.querySelector('[aria-label="Original map events"]'),
    ) && !visible(encounter.$el.querySelector('[aria-label="Troop members"]')),
    label + ": troop events are separated from composition",
  );
  const memberButton = Array.from(
    encounter.$el.querySelectorAll(".inspector-views button"),
  )[0];
  memberButton.click();
  await tick();
  assert(
    visible(encounter.$el.querySelector('[aria-label="Troop members"]')),
    label + ": troop composition remains reachable",
  );
}
