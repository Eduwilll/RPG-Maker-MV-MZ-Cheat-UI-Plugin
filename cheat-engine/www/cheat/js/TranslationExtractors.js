// @ts-check

import { getGameDataDir, isDesktopRuntime } from "./RuntimeEnv.js";

/**
 * @returns {string[]}
 */
export function extractSystemTerms() {
  const texts = [];
  const sys = window.$dataSystem;
  if (!sys) return texts;

  if (sys.terms && sys.terms.basic) {
    texts.push(
      ...sys.terms.basic.filter(
        (text) => text && typeof text === "string" && text.trim(),
      ),
    );
  }

  if (sys.terms && sys.terms.commands) {
    texts.push(
      ...sys.terms.commands.filter(
        (text) => text && typeof text === "string" && text.trim(),
      ),
    );
  }

  if (sys.terms && sys.terms.params) {
    texts.push(
      ...sys.terms.params.filter(
        (text) => text && typeof text === "string" && text.trim(),
      ),
    );
  }

  if (sys.terms && sys.terms.messages) {
    for (const key in sys.terms.messages) {
      const text = sys.terms.messages[key];
      if (text && typeof text === "string" && text.trim()) {
        texts.push(text);
      }
    }
  }

  const typeArrays = ["armorTypes", "weaponTypes", "skillTypes", "elements"];
  for (const arrayName of typeArrays) {
    if (sys[arrayName]) {
      texts.push(
        ...sys[arrayName].filter(
          (text) => text && typeof text === "string" && text.trim(),
        ),
      );
    }
  }

  if (sys.gameTitle) texts.push(sys.gameTitle);

  return texts;
}

/**
 * @param {Array<any> | undefined | null} commands
 * @returns {string[]}
 */
export function extractEventCommandTexts(commands) {
  const texts = [];
  if (!commands || !Array.isArray(commands)) return texts;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!cmd || !cmd.parameters) continue;

    switch (cmd.code) {
      case 401:
      case 405:
        if (
          cmd.parameters[0] &&
          typeof cmd.parameters[0] === "string" &&
          cmd.parameters[0].trim()
        ) {
          texts.push(cmd.parameters[0]);
        }
        break;
      case 102:
        if (Array.isArray(cmd.parameters[0])) {
          for (const choice of cmd.parameters[0]) {
            if (choice && typeof choice === "string" && choice.trim()) {
              texts.push(choice);
            }
          }
        }
        break;
      case 320:
      case 324:
      case 325:
        if (
          cmd.parameters[1] &&
          typeof cmd.parameters[1] === "string" &&
          cmd.parameters[1].trim()
        ) {
          texts.push(cmd.parameters[1]);
        }
        break;
      case 356:
        break;
    }
  }

  return texts;
}

/**
 * @returns {string[]}
 */
export function extractCommonEventTexts() {
  const texts = [];
  if (!window.$dataCommonEvents) return texts;

  for (const event of window.$dataCommonEvents) {
    if (!event || !event.list) continue;
    texts.push(...extractEventCommandTexts(event.list));

    if (event.name && typeof event.name === "string" && event.name.trim()) {
      texts.push(event.name);
    }
  }

  console.log(
    `[Translator] Extracted ${texts.length} strings from Common Events`,
  );
  return texts;
}

/**
 * @param {{ update(isTranslating: boolean, progress: number, text: string): void }} progress
 * @returns {Promise<string[]>}
 */
export async function extractAllEventDialogues(progress) {
  const allTexts = [];

  if (!isDesktopRuntime()) {
    console.warn(
      "[Translator] Event dialogue extraction requires NW.js (desktop game)",
    );
    return allTexts;
  }

  try {
    const fs = require("fs");
    const path = require("path");
    const dataDir = path.join(getGameDataDir());

    if (!fs.existsSync(dataDir)) {
      console.warn(`[Translator] Data directory not found: ${dataDir}`);
      return allTexts;
    }

    const files = fs.readdirSync(dataDir);
    const mapFiles = files.filter((fileName) =>
      /^Map\d+\.json$/i.test(fileName),
    );

    console.log(`[Translator] Found ${mapFiles.length} map files to scan`);

    for (let fileIdx = 0; fileIdx < mapFiles.length; fileIdx++) {
      const mapFile = mapFiles[fileIdx];
      progress.update(
        true,
        0,
        `Scanning ${mapFile} (${fileIdx + 1}/${mapFiles.length})...`,
      );

      try {
        const filePath = path.join(dataDir, mapFile);
        const mapData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        if (
          mapData.displayName &&
          typeof mapData.displayName === "string" &&
          mapData.displayName.trim()
        ) {
          allTexts.push(mapData.displayName);
        }

        if (mapData.events) {
          for (const event of mapData.events) {
            if (!event || !event.pages) continue;
            for (const page of event.pages) {
              if (!page || !page.list) continue;
              allTexts.push(...extractEventCommandTexts(page.list));
            }
          }
        }
      } catch (err) {
        console.warn(`[Translator] Failed to read ${mapFile}:`, err.message);
      }
    }

    try {
      const troopsPath = path.join(dataDir, "Troops.json");
      if (fs.existsSync(troopsPath)) {
        const troopsData = JSON.parse(fs.readFileSync(troopsPath, "utf-8"));
        for (const troop of troopsData) {
          if (!troop || !troop.pages) continue;
          for (const page of troop.pages) {
            if (!page || !page.list) continue;
            allTexts.push(...extractEventCommandTexts(page.list));
          }
        }
        console.log("[Translator] Also scanned Troops.json for battle events");
      }
    } catch (err) {
      console.warn("[Translator] Failed to scan Troops.json:", err.message);
    }

    console.log(
      `[Translator] Extracted ${allTexts.length} dialogue strings from ${mapFiles.length} maps`,
    );
  } catch (err) {
    console.error("[Translator] Failed to scan map files:", err);
  }

  return allTexts;
}

/**
 * @param {Record<string, boolean>} targets
 * @param {{ update(isTranslating: boolean, progress: number, text: string): void }} progress
 * @returns {Promise<Array<{ type: string, list: string[] }>>}
 */
export async function collectTranslationTargets(targets, progress) {
  /** @type {Array<{ type: string, list: string[] }>} */
  const toTranslate = [];

  if (targets.variables && window.$dataSystem && window.$dataSystem.variables) {
    toTranslate.push({
      type: "Variables",
      list: window.$dataSystem.variables.slice(),
    });
  }
  if (targets.switches && window.$dataSystem && window.$dataSystem.switches) {
    toTranslate.push({
      type: "Switches",
      list: window.$dataSystem.switches.slice(),
    });
  }
  if (targets.maps && window.$dataMapInfos) {
    const rawNames = window.$dataMapInfos.map((mapInfo) =>
      mapInfo ? mapInfo.name : "",
    );
    toTranslate.push({ type: "Maps", list: rawNames });
  }

  const extractText = (arr) =>
    arr
      .filter((item) => item)
      .flatMap((item) => [item.name, item.description].filter(Boolean));

  const extractTextFull = (arr) =>
    arr
      .filter((item) => item)
      .flatMap((item) => {
        const texts = [
          item.name,
          item.description,
          item.nickname,
          item.profile,
        ];
        for (let m = 1; m <= 4; m++) {
          if (item[`message${m}`]) texts.push(item[`message${m}`]);
        }
        return texts.filter(Boolean);
      });

  if (targets.items && window.$dataItems) {
    toTranslate.push({ type: "Items", list: extractText(window.$dataItems) });
  }
  if (targets.weapons && window.$dataWeapons) {
    toTranslate.push({
      type: "Weapons",
      list: extractText(window.$dataWeapons),
    });
  }
  if (targets.armors && window.$dataArmors) {
    toTranslate.push({ type: "Armors", list: extractText(window.$dataArmors) });
  }
  if (targets.skills && window.$dataSkills) {
    toTranslate.push({
      type: "Skills",
      list: extractTextFull(window.$dataSkills),
    });
  }
  if (targets.states && window.$dataStates) {
    toTranslate.push({
      type: "States",
      list: extractTextFull(window.$dataStates),
    });
  }
  if (targets.classes && window.$dataClasses) {
    toTranslate.push({
      type: "Classes",
      list: extractText(window.$dataClasses),
    });
  }
  if (targets.enemies && window.$dataEnemies) {
    toTranslate.push({
      type: "Enemies",
      list: extractText(window.$dataEnemies),
    });
  }
  if (targets.actors && window.$dataActors) {
    toTranslate.push({
      type: "Actors",
      list: extractTextFull(window.$dataActors),
    });
  }

  if (targets.system && window.$dataSystem) {
    const systemTexts = extractSystemTerms();
    if (systemTexts.length > 0) {
      toTranslate.push({ type: "System Terms", list: systemTexts });
    }
  }

  if (targets.dialogues) {
    progress.update(true, 0, "Scanning map files...");
    const dialogueTexts = await extractAllEventDialogues(progress);
    if (dialogueTexts.length > 0) {
      toTranslate.push({ type: "Dialogues", list: dialogueTexts });
    }
  }

  if (targets.dialogues && window.$dataCommonEvents) {
    const commonEventTexts = extractCommonEventTexts();
    if (commonEventTexts.length > 0) {
      toTranslate.push({ type: "Common Events", list: commonEventTexts });
    }
  }

  return toTranslate;
}
