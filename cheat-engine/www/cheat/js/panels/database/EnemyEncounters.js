function rootRank(part) {
  if (part.missing) return 100;
  const excluded = part.encyclopediaHidden || part.doesntCount ? 10 : 0;
  if (/\b(torso|body)\b/i.test(part.name)) return excluded;
  if (/\b(head|arms?|legs?|hands?|feet|appendage)\b/i.test(part.name))
    return excluded + 2;
  return excluded + 1;
}

/** Troops define encounters; root ranking is a display heuristic, not a plugin API. */
export function readEnemyEncounters(game) {
  const troops = game && game.$dataTroops;
  const enemies = game && game.$dataEnemies;
  if (!Array.isArray(troops) || !enemies) return [];
  return troops.reduce((rows, troop, index) => {
    if (!troop || !Array.isArray(troop.members)) return rows;
    const troopId =
      Number.isInteger(troop.id) && troop.id > 0 ? troop.id : index;
    if (troopId < 1) return rows;
    const parts = troop.members.reduce((members, member, memberIndex) => {
      if (!member || !Number.isInteger(member.enemyId) || member.enemyId < 1)
        return members;
      const enemy = enemies[member.enemyId];
      const note = String((enemy && enemy.note) || "");
      members.push(
        Object.assign(JSON.parse(JSON.stringify(member)), {
          index: memberIndex,
          name: String((enemy && enemy.name) || "Enemy #" + member.enemyId),
          hidden: !!member.hidden,
          encyclopediaHidden: /<\s*cgmzencyclopediahide\s*>/i.test(note),
          doesntCount: /<\s*doesntcount\s*>/i.test(note),
          missing: !enemy,
        }),
      );
      return members;
    }, []);
    if (!parts.length || parts.every((part) => part.missing)) return rows;
    // Keep authored order and duplicate members; only the representative artwork changes.
    const root = parts.reduce((best, part) =>
      rootRank(part) < rootRank(best) ? part : best,
    );
    const name = String(troop.name || "");
    rows.push({
      troopId,
      name,
      displayName: name.trim() ? name : root.name + " (Troop #" + troopId + ")",
      rootName: root.name.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || root.name,
      primaryId: root.enemyId,
      parts,
      pageCount: Array.isArray(troop.pages) ? troop.pages.length : 0,
    });
    return rows;
  }, []);
}
