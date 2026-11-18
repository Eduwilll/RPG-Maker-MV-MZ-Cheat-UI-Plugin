/**
 * Troops define encounters. The troop itself is the unit of artwork: games may
 * split one creature across torso/head/limb enemy records, so the browser
 * composites every member at its authored battle position instead of guessing
 * a single "representative" record. `primaryId` only points the editor at the
 * first member that counts; it is never used as the encounter's portrait.
 */
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
    // Keep authored order and duplicate members. Prefer the first member that
    // actually represents the encounter; skip only members explicitly flagged
    // as hidden or not counting. Never rank by body-part names.
    const lead =
      parts.find(
        (part) =>
          !part.missing && !part.encyclopediaHidden && !part.doesntCount,
      ) ||
      parts.find((part) => !part.missing) ||
      parts[0];
    const name = String(troop.name || "");
    const displayName = name.trim()
      ? name
      : lead.name + " (Troop #" + troopId + ")";
    rows.push({
      troopId,
      name,
      displayName,
      rootName: lead.name.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || lead.name,
      primaryId: lead.enemyId,
      parts,
      memberCount: parts.length,
      hiddenCount: parts.filter((part) => part.hidden).length,
      // Precomputed once per snapshot so filtering stays cheap while typing.
      searchText: (
        troopId +
        " " +
        displayName +
        " " +
        lead.name +
        " " +
        parts.map((part) => part.name).join(" ")
      ).toLowerCase(),
      pageCount: Array.isArray(troop.pages) ? troop.pages.length : 0,
    });
    return rows;
  }, []);
}
