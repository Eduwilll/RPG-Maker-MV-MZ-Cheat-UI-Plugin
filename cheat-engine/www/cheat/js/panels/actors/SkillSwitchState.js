function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_\s\-.:()[\]]+/g, " ")
    .trim();
}

// Static evidence is not a prerequisite solver. Never execute game scripts.
export function createSkillSwitchTrace(game, skillId) {
  const skill = game && game.$dataSkills && game.$dataSkills[skillId];
  if (!skill) throw Error("Skill is no longer available.");
  const names = (game.$dataSystem && game.$dataSystem.switches) || [];
  const rows = new Map(),
    named = new Set(),
    visited = new Set(),
    scannedMaps = new Set();
  let limited = false;
  const term = normalized(skill.name);
  function valid(id) {
    return Number.isInteger(id) && id > 0 && id < names.length;
  }
  function add(id, link, evidence) {
    if (!valid(id)) return;
    if (!rows.has(id))
      rows.set(id, {
        id,
        name: String(names[id] || "Switch " + id),
        link,
        nameMatch: named.has(id),
        evidence: [],
        references: 0,
      });
    const row = rows.get(id);
    if (link === "event") row.link = link;
    if (evidence) {
      row.references++;
      const snapshot = Object.assign({}, evidence, { link });
      if (row.evidence.length < 4) row.evidence.push(snapshot);
      else if (link === "event") {
        const weaker = row.evidence.findIndex((item) => item.link !== "event");
        if (weaker >= 0) row.evidence.splice(weaker, 1, snapshot);
      }
    }
  }
  names.forEach((name, id) => {
    if (
      term &&
      (" " + normalized(name) + " ").indexOf(" " + term + " ") >= 0 &&
      valid(id)
    ) {
      named.add(id);
      add(id, "name");
    }
  });
  function records(list) {
    const stack = [];
    return (list || []).map((command, index) => {
      const indent = command.indent || 0,
        p = command.parameters || [];
      if (command.code === 411) {
        while (stack.length && stack[stack.length - 1].indent > indent)
          stack.pop();
        const frame = stack[stack.length - 1];
        if (frame && frame.indent === indent) {
          frame.key += ":else";
          if (frame.guard)
            frame.guard = { id: frame.guard.id, value: !frame.guard.value };
        }
      } else
        while (stack.length && stack[stack.length - 1].indent >= indent)
          stack.pop();
      const row = {
        command,
        index,
        p,
        path: stack.map((frame) => frame.key),
        guards: stack
          .filter((frame) => frame.guard)
          .map((frame) => Object.assign({}, frame.guard)),
      };
      if (
        command.code === 111 ||
        command.code === 402 ||
        command.code === 403 ||
        command.code === 112
      ) {
        const frame = {
          indent,
          key: String(index),
          guard:
            command.code === 111 && p[0] === 0
              ? { id: p[1], value: p[2] === 0 }
              : null,
        };
        stack.push(frame);
        row.childPath = row.path.concat(frame.key);
      }
      return row;
    });
  }
  const same = (a, b) =>
    a.length === b.length && a.every((key, i) => key === b[i]);
  const inside = (path, parent) =>
    parent.length <= path.length && parent.every((key, i) => key === path[i]);
  const isSkillReference = (command) => {
    const p = command.parameters || [];
    // Native 318: actor selector, actor/variable ID, operation, skill ID.
    return (
      (command.code === 318 && p[2] === 0 && p[3] === skillId) ||
      (command.code === 111 && p[0] === 4 && p[2] === 3 && p[3] === skillId)
    );
  };
  function scanList(list, source, direct, pageGuards, depth = 0) {
    const all = records(list),
      matches = all.filter((row) => isSkillReference(row.command));
    const linked = (row) =>
      direct ||
      matches.some((match) =>
        match.command.code === 111
          ? inside(row.path, match.childPath)
          : same(row.path, match.path) ||
            (row.command.code === 121 &&
              row.index < match.index &&
              inside(match.path, row.path)),
      );
    const evidence = (row, action) =>
      Object.assign({}, source, { command: row.index + 1, action });
    matches.forEach((match) => {
      (pageGuards || [])
        .concat(match.guards)
        .forEach((guard) =>
          add(
            guard.id,
            "event",
            evidence(
              match,
              guard.value
                ? "Learning path checks ON"
                : "Learning path checks OFF",
            ),
          ),
        );
    });
    if (direct)
      (pageGuards || []).forEach((guard) =>
        add(
          guard.id,
          "event",
          Object.assign({}, source, {
            action: guard.value
              ? "Learning path checks ON"
              : "Learning path checks OFF",
          }),
        ),
      );
    all.forEach((row) => {
      const p = row.p,
        isLinked = linked(row);
      if (
        row.command.code === 111 &&
        p[0] === 0 &&
        (isLinked || named.has(p[1]))
      ) {
        add(
          p[1],
          isLinked ? "event" : "name",
          evidence(row, p[2] === 0 ? "Checks ON" : "Checks OFF"),
        );
      }
      if (
        row.command.code === 121 &&
        Number.isInteger(p[0]) &&
        Number.isInteger(p[1])
      ) {
        const ids = new Set();
        if (isLinked && p[1] - p[0] >= 64) limited = true;
        if (isLinked)
          for (
            let id = Math.max(1, p[0]);
            id <= Math.min(p[1], p[0] + 63, names.length - 1);
            id++
          )
            ids.add(id);
        named.forEach((id) => {
          if (id >= p[0] && id <= p[1]) ids.add(id);
        });
        ids.forEach((id) =>
          add(
            id,
            isLinked ? "event" : "name",
            evidence(row, p[2] === 0 ? "Writes ON" : "Writes OFF"),
          ),
        );
      }
      if (row.command.code === 117 && isLinked)
        scanCommon(p[0], true, depth + 1);
    });
  }
  function scanCommon(id, direct, depth = 0) {
    const key = id + ":" + direct;
    if (visited.has(key)) return;
    if (depth > 32) {
      limited = true;
      return;
    }
    visited.add(key);
    const event = game.$dataCommonEvents && game.$dataCommonEvents[id];
    if (!event) return;
    if (
      !direct &&
      event.trigger > 0 &&
      event.switchId > 0 &&
      (event.list || []).some(isSkillReference)
    )
      add(event.switchId, "event", {
        source: "Common event #" + id,
        action: "Automatic trigger ON (not required by explicit calls)",
      });
    scanList(
      event.list,
      { source: "Common event #" + id + ": " + (event.name || "Unnamed") },
      direct,
      [],
      depth,
    );
  }
  function scanMap(data, mapId) {
    if (scannedMaps.has(mapId)) return;
    scannedMaps.add(mapId);
    ((data && data.events) || []).forEach((event) => {
      if (!event) return;
      (event.pages || []).forEach((page, index) => {
        const c = page.conditions || {},
          guards = [];
        if (c.switch1Valid) guards.push({ id: c.switch1Id, value: true });
        if (c.switch2Valid) guards.push({ id: c.switch2Id, value: true });
        const source = {
          source:
            "Map #" +
            mapId +
            " / " +
            (event.name || "Event " + event.id) +
            " / page " +
            (index + 1),
          mapId,
          eventId: event.id,
          page: index + 1,
        };
        guards.forEach((guard) => {
          if (named.has(guard.id))
            add(
              guard.id,
              "name",
              Object.assign({}, source, { action: "Page requires ON" }),
            );
        });
        scanList(page.list, source, false, guards);
      });
    });
  }
  (skill.effects || [])
    .filter((effect) => effect.code === 44)
    .forEach((effect) => scanCommon(effect.dataId, true));
  (game.$dataCommonEvents || []).forEach((event) => {
    if (event) scanCommon(event.id, false);
  });
  scanMap(
    game.$dataMap,
    game.$gameMap && game.$gameMap.mapId ? game.$gameMap.mapId() : 0,
  );
  return {
    scanMap,
    isLimited: () => limited,
    result() {
      return Array.from(rows.values())
        .sort(
          (a, b) =>
            (a.nameMatch ? 0 : 1) - (b.nameMatch ? 0 : 1) ||
            (a.link === "event" ? 0 : 1) - (b.link === "event" ? 0 : 1) ||
            a.id - b.id,
        )
        .map((row) =>
          Object.assign({}, row, {
            evidence: row.evidence.map((item) => Object.assign({}, item)),
            value: !!(game.$gameSwitches && game.$gameSwitches.value(row.id)),
          }),
        );
    },
  };
}

export function setSkillSwitchValue(game, id, value, expected) {
  const names = game && game.$dataSystem && game.$dataSystem.switches;
  if (
    !names ||
    !Number.isInteger(id) ||
    id < 1 ||
    id >= names.length ||
    typeof value !== "boolean" ||
    typeof expected !== "boolean" ||
    !game.$gameSwitches ||
    typeof game.$gameSwitches.setValue !== "function"
  )
    throw Error("Invalid switch change.");
  if (!!game.$gameSwitches.value(id) !== expected)
    throw Error(
      "This switch changed in the game. Refresh and review it again.",
    );
  game.$gameSwitches.setValue(id, value);
  return !!game.$gameSwitches.value(id);
}
