// @ts-check

import { getGameDataDir } from "../../runtime/RuntimeEnv.js";

// ─────────────────────────────────────────────────────────────────────────────
// EventDatabase — normalizes RPG Maker MV/MZ data into a queryable registry.
//
// Data sources:
//   $dataCommonEvents  — always available once the game starts
//   $dataTroops        — always available
//   $dataMapInfos      — list of all maps (names/ids, no event data)
//   $dataMap           — the *current* map's full event data (changes on transfer)
//   Map<NNN>.json      — other maps, loaded on demand via fs (NW.js) or XHR
// ─────────────────────────────────────────────────────────────────────────────

export class EventDatabase {
  constructor() {
    /** @type {Map<number, any>} ceId → CommonEvent data */
    this._commonEvents = new Map();

    /** @type {Map<string, any>} `${mapId}:${eventId}` → Event data */
    this._mapEvents = new Map();

    /** @type {Map<number, any>} troopId → Troop data */
    this._battleTroops = new Map();

    /** @type {Set<number>} mapIds whose events we have fully loaded */
    this._loadedMaps = new Set();

    /** @type {Map<number, string>} mapId → mapName */
    this._mapInfos = new Map();

    /** @type {number} */
    this._currentMapId = 0;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * Populate the database from live RPG Maker globals.
   * Safe to call multiple times (re-loads current map).
   */
  loadFromGlobals() {
    this._loadCommonEvents();
    this._loadBattleTroops();
    this._loadMapInfos();
    this._loadCurrentMap();
  }

  _loadCommonEvents() {
    const data = window.$dataCommonEvents;
    if (!Array.isArray(data)) return;
    for (const ce of data) {
      if (ce && ce.id) this._commonEvents.set(ce.id, ce);
    }
  }

  _loadBattleTroops() {
    const data = window.$dataTroops;
    if (!Array.isArray(data)) return;
    for (const troop of data) {
      if (troop && troop.id) this._battleTroops.set(troop.id, troop);
    }
  }

  _loadMapInfos() {
    const data = window.$dataMapInfos;
    if (!Array.isArray(data)) return;
    for (const info of data) {
      if (info && info.id) {
        this._mapInfos.set(info.id, info.name || `Map ${info.id}`);
      }
    }
  }

  _loadCurrentMap() {
    const dataMap = window.$dataMap;
    const gameMap = window.$gameMap;
    if (!dataMap || !Array.isArray(dataMap.events)) return;

    const mapId =
      gameMap && typeof gameMap.mapId === "function" ? gameMap.mapId() : 0;
    this._currentMapId = mapId;

    for (const event of dataMap.events) {
      if (event && event.id) {
        this._mapEvents.set(`${mapId}:${event.id}`, event);
      }
    }

    if (mapId) this._loadedMaps.add(mapId);
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  /** @param {number} id */
  getCommonEvent(id) {
    return this._commonEvents.get(id) || null;
  }

  /**
   * @param {number} mapId
   * @param {number} eventId
   */
  getMapEvent(mapId, eventId) {
    return this._mapEvents.get(`${mapId}:${eventId}`) || null;
  }

  /**
   * All events loaded for a given map, sorted by id.
   * @param {number} mapId
   * @returns {any[]}
   */
  getMapEvents(mapId) {
    const events = [];
    for (const [key, event] of this._mapEvents) {
      if (key.startsWith(`${mapId}:`)) events.push(event);
    }
    return events.sort((a, b) => a.id - b.id);
  }

  /** @param {number} troopId */
  getBattleTroop(troopId) {
    return this._battleTroops.get(troopId) || null;
  }

  /** @returns {{ id: number, name: string }[]} */
  getAllCommonEvents() {
    return [...this._commonEvents.values()]
      .map((ce) => ({ id: ce.id, name: ce.name || `Common Event ${ce.id}` }))
      .sort((a, b) => a.id - b.id);
  }

  /** @returns {{ id: number, name: string }[]} */
  getAllBattleTroops() {
    return [...this._battleTroops.values()]
      .map((t) => ({ id: t.id, name: t.name || `Troop ${t.id}` }))
      .sort((a, b) => a.id - b.id);
  }

  /** @returns {{ id: number, name: string }[]} (only maps whose events are loaded) */
  getAllLoadedMaps() {
    return [...this._loadedMaps]
      .map((id) => ({ id, name: this._mapInfos.get(id) || `Map ${id}` }))
      .sort((a, b) => a.id - b.id);
  }

  /** @returns {{ id: number, name: string }[]} (all maps known from $dataMapInfos) */
  getAllMapInfos() {
    return [...this._mapInfos.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.id - b.id);
  }

  /** @returns {number} */
  getCurrentMapId() {
    return this._currentMapId;
  }

  /** @param {number} mapId */
  isMapLoaded(mapId) {
    return this._loadedMaps.has(mapId);
  }

  // ── Async map loading ────────────────────────────────────────────────────────

  /**
   * Load a single map's event data from disk (NW.js) or XHR.
   * @param {number} mapId
   * @returns {Promise<boolean>} true if newly loaded or already loaded
   */
  async loadMap(mapId) {
    if (this._loadedMaps.has(mapId)) return true;

    const mapData = await this._fetchMapData(mapId);
    if (!mapData || !Array.isArray(mapData.events)) return false;

    for (const event of mapData.events) {
      if (event && event.id) {
        this._mapEvents.set(`${mapId}:${event.id}`, event);
      }
    }

    this._loadedMaps.add(mapId);
    return true;
  }

  /**
   * Load all maps listed in $dataMapInfos, calling onProgress after each.
   * @param {(loaded: number, total: number, mapName: string) => void} [onProgress]
   */
  async loadAllMaps(onProgress) {
    const allMaps = this.getAllMapInfos().filter((m) => m.id > 0);
    let loaded = 0;

    for (const mapInfo of allMaps) {
      if (!this._loadedMaps.has(mapInfo.id)) {
        if (onProgress) onProgress(loaded, allMaps.length, mapInfo.name);
        try {
          await this.loadMap(mapInfo.id);
        } catch (e) {
          console.warn(`[EventAnalyzer] Failed to load map ${mapInfo.id}`, e);
        }
      }
      loaded++;
    }

    if (onProgress) onProgress(loaded, allMaps.length, "");
  }

  /**
   * Fetch map JSON by ID.
   * Tries NW.js fs first, falls back to XHR.
   * @param {number} mapId
   * @returns {Promise<any | null>}
   */
  _fetchMapData(mapId) {
    const mapIdText = String(mapId).padStart(3, "0");

    if (typeof Utils !== "undefined" && Utils.isNwjs()) {
      try {
        const fs = require("fs");
        const path = require("path");
        const dataDir = getGameDataDir();
        const filePath = path.join(dataDir, `Map${mapIdText}.json`);
        if (!fs.existsSync(filePath)) return Promise.resolve(null);
        return Promise.resolve(JSON.parse(fs.readFileSync(filePath, "utf-8")));
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    // XHR fallback (browser / web deploy)
    return new Promise((resolve) => {
      const isCheatWindow =
        window.location.pathname.includes("/cheat/") ||
        window.location.pathname.includes("\\cheat\\");
      const prefix = isCheatWindow ? "../data/" : "data/";
      const url = `${prefix}Map${mapIdText}.json`;

      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.overrideMimeType("application/json");
      xhr.onload = () => {
        if (xhr.status < 400) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (_) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      xhr.onerror = () => resolve(null);
      xhr.send();
    });
  }
}
