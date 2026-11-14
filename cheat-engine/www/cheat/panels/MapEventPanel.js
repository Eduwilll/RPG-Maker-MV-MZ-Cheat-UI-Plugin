/**
 * MapEventPanel.js
 * Original feature from Justype fork (https://github.com/Justype/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
 * 2024-03-20
 */
import { coercePanelNumber } from "../js/panels/PanelGameState.js";
import {
  renderBaseMap,
  getMinimapStatus,
  clearMinimapCache,
} from "../js/panels/minimap/MinimapRenderer.js";
import { mapViewport, tileAtPointer } from "../js/panels/map/MapViewport.js";
import MapLayers from "../components/MapLayers.js";
import { readMapLayers } from "../js/panels/map/MapLayersState.js";
import {
  readMapMarkers,
  markerVisible,
  drawMapGrid as drawLayerGrid,
} from "../js/panels/map/MapMarkers.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { getMapCharacters } from "../js/panels/map/MapCharacters.js";
import MinimapPanel from "./MinimapPanel.js";

export default {
  name: "MapEventPanel",
  components: { MapLayers, MinimapPanel },

  template: `
<v-card flat class="ma-0 pa-0" color="transparent">
    <v-row class="ma-0 pa-0" justify="center">
        <v-col cols="12" class="pa-0">
            <div class="d-flex justify-center grey darken-4" style="min-height: 200px; width: 100%;">
                <canvas
                    ref="mapCanvas"
                    :width="canvasWidth"
                    :height="canvasHeight"
                    :style="canvasStyle"
                    :class="{ 'cheat-canvas-crosshair': clickToTeleportEnabled }"
                    @click="onCanvasClick"
                    @mousemove="onCanvasMouseMove"
                    @mouseleave="onCanvasMouseLeave">
                </canvas>
            </div>
        </v-col>
    </v-row>
    
    <v-row class="ma-0 pa-1">
        <v-col cols="12">
            <div class="d-flex flex-wrap">
                <v-chip v-if="renderMode === 'radar'" x-small color="grey" class="ma-1">Grey: Walkable</v-chip>
                <v-chip v-if="renderMode === 'radar'" x-small color="grey darken-3" class="ma-1">Dark: Blocked</v-chip>
                <v-chip x-small color="red" class="ma-1">Red: Player</v-chip>
                <v-chip x-small color="yellow" text-color="black" class="ma-1">Yellow: NPC / Event</v-chip>
                <v-chip v-if="renderMode === 'radar'" x-small color="white" text-color="black" class="ma-1">White: Border</v-chip>
                <v-chip x-small color="orange" class="ma-1">Orange: Enemy</v-chip>
                <v-chip x-small color="blue" class="ma-1">Blue: Treasure</v-chip>
            </div>
            <div v-if="hoverInfo" class="text-caption mt-0 mb-1 blue--text font-weight-bold ml-1">
                {{ hoverInfo }}
            </div>
        </v-col>
    </v-row>

    <v-divider></v-divider>
    <map-layers @change="renderMap"/>
    <v-expansion-panels v-model="minimapSection" flat class="my-2"><v-expansion-panel data-feature="floating-minimap"><v-expansion-panel-header>Floating minimap settings</v-expansion-panel-header><v-expansion-panel-content><minimap-panel embedded/></v-expansion-panel-content></v-expansion-panel></v-expansion-panels>

    <v-row class="ma-0 pa-2" align="center">
        <v-col cols="8" class="py-1"><v-select v-model="renderMode" :items="[{text: 'Realistic (live tiles)', value: 'realistic'}, {text: 'Radar (passability)', value: 'radar'}]" label="Map display" dense outlined hide-details/></v-col>
        <v-col cols="4" class="py-1"><v-btn x-small text @click="refreshArtwork">Refresh artwork</v-btn></v-col>
        <v-col v-if="renderMode === 'realistic'" cols="12" class="py-0 caption grey--text" role="status">{{ renderStatus }}</v-col>
    </v-row>

    <v-row class="ma-0 pa-2" align="center">
        <v-col cols="12" sm="6" class="py-1">
            <v-switch
                v-model="limitedView"
                label="25x25 View"
                color="primary"
                dense
                hide-details>
            </v-switch>
        </v-col>
        <v-col cols="12" sm="6" class="py-1">
            <v-switch
                v-model="clickToTeleportEnabled"
                label="Click to Teleport"
                color="success"
                dense
                hide-details>
            </v-switch>
        </v-col>
    </v-row>

    <v-row class="ma-0 pa-2" align="center">
        <v-col cols="12" sm="4" class="py-1">
            <v-slider
                v-if="limitedView"
                v-model="baseCellSize"
                label="Zoom"
                min="8"
                max="48"
                dense
                hide-details
                @input="onZoomChange">
            </v-slider>
        </v-col>
        <v-col cols="6" sm="4" class="py-1">
            <v-text-field
                v-model="currentMapId"
                label="Map ID"
                dense
                readonly
                background-color="grey darken-3"
                hide-details
                outlined>
            </v-text-field>
        </v-col>
        <v-col cols="6" sm="4" class="py-1">
            <v-text-field
                v-model="readInterval"
                label="Interval (ms)"
                dense
                type="number"
                background-color="grey darken-3"
                hide-details
                outlined>
            </v-text-field>
        </v-col>
    </v-row>
</v-card>
    `,

  data() {
    return {
      minimapSection: null,
      renderMode:
        this.loadSetting("mapEventPanel_renderMode", "realistic") === "radar"
          ? "radar"
          : "realistic",
      renderStatus: "Loading map artwork...",
      limitedView: this.loadSetting("mapEventPanel_limitedView", true), // 25x25 view when true, full map when false
      clickToTeleportEnabled: this.loadSetting(
        "mapEventPanel_clickToTeleport",
        true,
      ), // Toggle for click-to-teleport functionality
      currentMapId: 0,
      canvasWidth: 550,
      canvasHeight: 550,
      cellSize: 14, // Size of each grid cell in pixels (dynamic for full view)
      baseCellSize: this.loadSetting("mapEventPanel_baseCellSize", 14), // Original cellSize for limited view mode

      mapData: null,
      mapEvents: [],
      regularEvents: [], // Filtered events list excluding enemies and treasure boxes
      playerPosition: { x: 0, y: 0 },
      enemies: [], // Track enemy positions and movement
      treasureBoxes: [], // Track treasure box positions

      // Map rendering properties
      viewOffsetX: 0,
      viewOffsetY: 0,
      maxViewSize: 25, // For 25x25 limited view

      // Track last known map ID to detect map changes
      lastKnownMapId: 0,

      // Hover info
      hoverInfo: "",
      lastRenderState: "",

      // Visibility and runtime control
      isCanvasVisible: false, // whether the canvas is currently visible in viewport
      visibilityObserver: null, // IntersectionObserver instance (if any)
      renderIntervalId: null, // id returned from setInterval for periodic updates
      readInterval: this.loadSetting("mapEventPanel_readInterval", 500), // Interval in ms for reading game data
    };
  },

  created() {
    this.initializeMapDisplay();
  },

  mounted() {
    this.$nextTick(() => {
      // Start observing canvas visibility and do an initial render only if visible
      this.setupCanvasVisibilityObserver();
      this.updateCanvasSize();
      if (this.isCanvasVisible) this.renderMap();

      // Add global resize listener to handle dynamic panel resizing
      window.addEventListener("resize", this.onWindowResize);
    });
  },

  activated() {
    // Redraw when the tab/panel becomes active (if using keep-alive)
    this.updateCanvasSize();
    if (this.isCanvasVisible) this.renderMap();
  },

  watch: {
    renderMode(value) {
      this.saveSetting("mapEventPanel_renderMode", value);
      this.$nextTick(() => this.renderMap());
    },
    limitedView(newValue) {
      // Save setting to localStorage
      this.saveSetting("mapEventPanel_limitedView", newValue);

      // Update canvas size when switching between limited and full view
      this.updateCanvasSize();

      // Force re-render on next tick to ensure canvas is properly updated
      this.$nextTick(() => {
        if (this.isCanvasVisible) this.renderMap();
      });
    },

    clickToTeleportEnabled(newValue) {
      // Save setting to localStorage
      this.saveSetting("mapEventPanel_clickToTeleport", newValue);
    },
    readInterval(newValue) {
      // Validate interval (100-1000ms)
      const valid = coercePanelNumber(newValue, {
        fallback: this.readInterval,
        integer: true,
        min: 100,
        max: 1000,
      });
      if (valid !== this.readInterval) {
        this.readInterval = valid;
      }
      // Save setting
      this.saveSetting("mapEventPanel_readInterval", valid);
      // Reset interval
      if (this.renderIntervalId) {
        clearInterval(this.renderIntervalId);
        this.renderIntervalId = null;
      }
      // Start new interval with validated value
      this.renderIntervalId = setInterval(() => {
        this.checkForMapChange();
        this.updatePlayerPosition();
        this.updateEnemyPositions();
        if (this.isCanvasVisible) {
          this.renderMap();
        }
      }, valid);
    },
  },

  beforeDestroy() {
    // Clean up resize listener
    window.removeEventListener("resize", this.onWindowResize);

    // Clean up observer and interval when component is destroyed
    try {
      if (
        this.visibilityObserver &&
        typeof this.visibilityObserver.disconnect === "function"
      ) {
        this.visibilityObserver.disconnect();
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this.renderIntervalId) {
        clearInterval(this.renderIntervalId);
        this.renderIntervalId = null;
      }
    } catch (e) {
      // ignore
    }
  },

  computed: {
    displayMapWidth() {
      if (!this.mapData) return 0;
      return this.limitedView
        ? Math.min(this.maxViewSize, this.mapData.width)
        : this.mapData.width;
    },

    displayMapHeight() {
      if (!this.mapData) return 0;
      return this.limitedView
        ? Math.min(this.maxViewSize, this.mapData.height)
        : this.mapData.height;
    },

    canvasStyle() {
      return {
        border: "1px solid #555",
        backgroundColor: "#000",
        width: "100%",
        maxWidth: "600px",
        height: "auto",
        display: "block",
        imageRendering: "pixelated", // Keep it sharp
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      };
    },
  },

  methods: {
    focusFeature(anchor) {
      if (anchor === "floating-minimap") this.minimapSection = 0;
    },
    drawCharacter(ctx, marker, startX, startY) {
      return !!(
        this._characters &&
        this._characters.draw(ctx, marker, {
          unit: this.cellSize,
          ox: -startX * this.cellSize,
          oy: -startY * this.cellSize,
          scale: this._layers.markerScale,
        })
      );
    },
    // localStorage helper methods
    loadSetting(key, defaultValue) {
      try {
        const saved = localStorage.getItem(key);
        return saved !== null ? JSON.parse(saved) : defaultValue;
      } catch (error) {
        console.warn("Failed to load setting:", key, error);
        return defaultValue;
      }
    },

    saveSetting(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn("Failed to save setting:", key, error);
      }
    },

    initializeMapDisplay() {
      this.updateCurrentMapData();
      this.updatePlayerPosition();
      this.updateMapEvents(); // Now handles all event classification in one pass
      this.lastKnownMapId = this.currentMapId;

      // Update every readInterval to reflect real-time changes
      // store interval id so we can clear it when component is destroyed
      this.renderIntervalId = setInterval(() => {
        this.checkForMapChange();
        this.updatePlayerPosition();
        this.updateEnemyPositions(); // Only update enemy positions, not full classification

        // Only perform expensive canvas rendering when visible
        if (this.isCanvasVisible) {
          this.renderMap();
        }
      }, this.readInterval);
    },

    updateCurrentMapData() {
      try {
        this.currentMapId = $gameMap.mapId();
        // Vue must never observe the game's live map/event command objects.
        this._sourceMap = $dataMap;
        this.mapData = $dataMap
          ? { width: $dataMap.width, height: $dataMap.height }
          : null;

        if (this.mapData) {
          this.updateCanvasSize();
        }
      } catch (error) {
        console.warn("Could not get current map data:", error);
      }
    },

    updateCanvasSize() {
      if (!this.mapData) return;

      // Force re-render on next renderMap call (canvas is cleared when resized)
      this.lastRenderState = "";

      if (this.limitedView) {
        // For limited view, use base cellSize and calculate canvas size
        this.cellSize = Math.min(this.baseCellSize, 600 / this.maxViewSize);
        this.canvasWidth =
          Math.min(this.mapData.width, this.maxViewSize) * this.cellSize;
        this.canvasHeight =
          Math.min(this.mapData.height, this.maxViewSize) * this.cellSize;
      } else {
        // For full view, dynamically adjust cellSize to fit the map within 600px
        const maxCanvasSize = 600;
        const scaleX = maxCanvasSize / this.mapData.width;
        const scaleY = maxCanvasSize / this.mapData.height;

        // Use the smaller scale to ensure the entire map fits
        const dynamicCellSize = Math.max(
          1,
          Math.floor(Math.min(scaleX, scaleY)),
        );

        // Update cellSize for full view rendering
        this.cellSize = dynamicCellSize;

        // Calculate actual canvas size based on dynamic cellSize
        this.canvasWidth = this.mapData.width * this.cellSize;
        this.canvasHeight = this.mapData.height * this.cellSize;
      }
    },

    onZoomChange() {
      this.saveSetting("mapEventPanel_baseCellSize", this.baseCellSize);
      this.updateCanvasSize();
      if (this.isCanvasVisible) this.renderMap();
    },

    onWindowResize() {
      // Re-calculate layout when window/panel is resized
      this.updateCanvasSize();
      if (this.isCanvasVisible) this.renderMap();
    },

    onCanvasMouseMove(event) {
      if (!this.mapData || !this.$refs.mapCanvas) return;
      const tile = tileAtPointer(event, this.$refs.mapCanvas, this.viewport());
      if (!tile) {
        this.hoverInfo = "";
        return;
      }
      const mapX = tile.x,
        mapY = tile.y;

      if (
        mapX < 0 ||
        mapX >= this.mapData.width ||
        mapY < 0 ||
        mapY >= this.mapData.height
      ) {
        this.hoverInfo = "";
        return;
      }

      // Check for events at this position
      let info = `Pos: (${mapX}, ${mapY})`;
      const layers = readMapLayers();

      // Passability info
      const isWalkable = this.isTilePassable(mapX, mapY);
      info += isWalkable ? " | Walkable" : " | Blocked";

      // Check player
      if (
        layers.player &&
        mapX === Math.round(this.playerPosition.x) &&
        mapY === Math.round(this.playerPosition.y)
      ) {
        info += ` | Player`;
      }

      // Check enemies
      const enemy = this.enemies.find(
        (e) =>
          markerVisible(e, layers) &&
          Math.round(e.x) === mapX &&
          Math.round(e.y) === mapY,
      );
      if (enemy) {
        info += ` | Enemy: ${enemy.characterName || "Unknown"} (ID: ${enemy.id})`;
      }

      // Check treasures
      const treasure = this.treasureBoxes.find(
        (t) =>
          markerVisible(t, layers) &&
          Math.round(t.x) === mapX &&
          Math.round(t.y) === mapY,
      );
      if (treasure) {
        info += ` | Treasure: ${treasure.name || "Unknown"} (ID: ${treasure.id})`;
      }

      // Check regular events
      const regEvent = this.regularEvents.find(
        (e) =>
          markerVisible(e, layers) &&
          Math.round(e.x) === mapX &&
          Math.round(e.y) === mapY,
      );
      if (regEvent) {
        const name = regEvent.name || "Event";
        info += ` | ${name} (ID: ${regEvent.id})`;
      }

      this.hoverInfo = info;
    },

    onCanvasMouseLeave() {
      this.hoverInfo = "";
    },

    // Visibility observer setup: use IntersectionObserver when available,
    // otherwise fall back to listening to window scroll/resize and checking
    // bounding rect intersection.
    setupCanvasVisibilityObserver() {
      const canvas = this.$refs.mapCanvas;
      if (!canvas) return;

      // If IntersectionObserver is available, prefer it (efficient)
      if (typeof IntersectionObserver !== "undefined") {
        try {
          this.visibilityObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                this.setCanvasVisible(
                  entry.isIntersecting && entry.intersectionRatio > 0,
                );
              }
            },
            { root: null, threshold: 0.01 },
          );

          this.visibilityObserver.observe(canvas);
          return;
        } catch (e) {
          // fall through to fallback
        }
      }

      // Fallback: recalculate visibility on scroll/resize at low frequency
      const checkVisibility = () => {
        const rect = canvas.getBoundingClientRect();
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const vh = window.innerHeight || document.documentElement.clientHeight;

        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.left <= vw &&
          rect.top <= vh;

        this.setCanvasVisible(isVisible);
      };

      // Throttle fallback checks
      let timeout = null;
      const throttledCheck = () => {
        if (timeout) return;
        timeout = setTimeout(() => {
          timeout = null;
          checkVisibility();
        }, 200);
      };

      window.addEventListener("scroll", throttledCheck, true);
      window.addEventListener("resize", throttledCheck);

      // store observer-like object so beforeDestroy can cleanup listeners
      this.visibilityObserver = {
        disconnect() {
          window.removeEventListener("scroll", throttledCheck, true);
          window.removeEventListener("resize", throttledCheck);
        },
      };

      // initial check
      checkVisibility();
    },

    setCanvasVisible(visible) {
      if (this.isCanvasVisible === visible) return;
      this.isCanvasVisible = visible;
      // When it becomes visible, trigger an immediate render to update canvas
      if (visible) {
        this.$nextTick(() => {
          if (this.mapData) this.renderMap();
        });
      }
    },

    updatePlayerPosition() {
      try {
        if ($gamePlayer) {
          this.playerPosition = {
            x: Number.isFinite($gamePlayer._realX)
              ? $gamePlayer._realX
              : $gamePlayer.x,
            y: Number.isFinite($gamePlayer._realY)
              ? $gamePlayer._realY
              : $gamePlayer.y,
          };
        }
      } catch (error) {
        console.warn("Could not get player position:", error);
      }
    },

    updateMapEvents() {
      try {
        const rows = readMapMarkers(getGameWindow());
        this.mapEvents = rows;
        this.enemies = rows.filter((row) => row.kind === "enemy");
        this.treasureBoxes = rows.filter((row) => row.kind === "treasure");
        this.regularEvents = rows.filter(
          (row) => row.kind === "npc" || row.kind === "event",
        );
      } catch (error) {
        console.warn("Could not get map events:", error);
      }
    },

    updateEnemyPositions() {
      // Refresh active pages too: looted chests and changing NPCs must not stay stale.
      this.updateMapEvents();
    },

    checkForMapChange() {
      try {
        const currentMapId = $gameMap.mapId();

        // If map has changed, update all map-related data
        if (
          currentMapId !== this.lastKnownMapId ||
          this._sourceMap !== $dataMap
        ) {
          console.log(
            `Map changed from ${this.lastKnownMapId} to ${currentMapId}`,
          );
          this.updateCurrentMapData();
          this.updateMapEvents(); // Handles all event classification in one pass
          this.lastKnownMapId = currentMapId;

          // Force immediate re-render after map change
          this.$nextTick(() => {
            if (this.isCanvasVisible) this.renderMap();
          });
        }
      } catch (error) {
        console.warn("Could not check for map change:", error);
      }
    },

    viewport() {
      return mapViewport(
        this.mapData.width,
        this.mapData.height,
        this.playerPosition.x,
        this.playerPosition.y,
        this.limitedView,
        this.maxViewSize,
      );
    },

    refreshArtwork() {
      clearMinimapCache();
      this.renderMap();
    },

    renderMap() {
      if (!this.mapData || !this.$refs.mapCanvas) return;

      const canvas = this.$refs.mapCanvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const layers = readMapLayers();
      this._layers = layers;
      this._characters = layers.sprites ? getMapCharacters() : null;
      if (this._characters) this._characters.beginFrame();

      const { startX, startY, endX, endY } = this.viewport();
      const base =
        layers.background && this.renderMode === "realistic"
          ? renderBaseMap()
          : null;
      if (!layers.background) {
        ctx.fillStyle = "#0a0a12";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (base) {
        const scale = base.width / this.mapData.width;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          base,
          startX * scale,
          startY * scale,
          (endX - startX) * scale,
          (endY - startY) * scale,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else {
        const key = [
          this.currentMapId,
          startX,
          startY,
          endX,
          endY,
          canvas.width,
          canvas.height,
        ].join(":");
        // Cache expensive passability scans; marker redraws remain live.
        if (
          !this._radarCache ||
          this._radarCache.key !== key ||
          this._radarCache.map !== this._sourceMap ||
          Date.now() - this._radarCache.time > 1000
        ) {
          const grid = document.createElement("canvas");
          grid.width = canvas.width;
          grid.height = canvas.height;
          this.drawMapGrid(grid.getContext("2d"), startX, startY, endX, endY);
          this._radarCache = {
            key,
            map: this._sourceMap,
            time: Date.now(),
            canvas: grid,
          };
        }
        ctx.drawImage(this._radarCache.canvas, 0, 0);
      }
      if (this.renderMode === "realistic")
        this.renderStatus = layers.background
          ? getMinimapStatus().detail
          : "Map background hidden";

      if (layers.grid)
        drawLayerGrid(ctx, endX - startX, endY - startY, this.cellSize, 0, 0);

      this.drawMapEvents(ctx, startX, startY);

      if (layers.treasures) this.drawTreasureBoxes(ctx, startX, startY);

      if (layers.enemies) this.drawEnemies(ctx, startX, startY);

      if (layers.player) this.drawPlayer(ctx, startX, startY);
      if (layers.labels) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        this.regularEvents
          .concat(this.enemies, this.treasureBoxes)
          .forEach((event) => {
            if (
              markerVisible(event, layers) &&
              event.x >= startX &&
              event.x < endX &&
              event.y >= startY &&
              event.y < endY
            )
              ctx.fillText(
                event.name + " #" + event.id,
                (event.x - startX + 0.5) * this.cellSize + 4,
                (event.y - startY) * this.cellSize,
              );
          });
      }
    },

    isTooLargeToDrawWalkableBoundaries(width, height) {
      // Limit to 50 tiles for performance reasons
      return width > 50 && height > 50;
    },

    drawMapGrid(ctx, startX, startY, endX, endY) {
      // First pass: Draw basic grid with simple passability colors
      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          const canvasX = (x - startX) * this.cellSize;
          const canvasY = (y - startY) * this.cellSize;

          // Check if any movement is possible from this tile using canPass
          let canMove = this.isTilePassable(x, y);

          // Simple color scheme based on movement possibility
          if (canMove) {
            // Light grey for tiles where movement is possible
            ctx.fillStyle = "#888888";
          } else {
            // Dark grey for tiles where no movement is possible
            ctx.fillStyle = "#333333";
          }

          ctx.fillRect(canvasX, canvasY, this.cellSize, this.cellSize);
        }
      }

      // Second pass: Draw walkable area boundaries using canPass with directions
      if (
        !this.isTooLargeToDrawWalkableBoundaries(endX - startX, endY - startY)
      ) {
        this.drawWalkableBoundaries(ctx, startX, startY, endX, endY);
      }

      // Third pass: Draw grid lines
      ctx.strokeStyle = "#444444";
      ctx.lineWidth = 0.5;
      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          const canvasX = (x - startX) * this.cellSize;
          const canvasY = (y - startY) * this.cellSize;
          ctx.strokeRect(canvasX, canvasY, this.cellSize, this.cellSize);
        }
      }
    },

    isTilePassable(x, y) {
      try {
        // Check if coordinates are within bounds first
        if (!this.isWithinMapBounds(x, y)) {
          return false;
        }

        // Fallback: Check passability using RPG Maker's basic method
        if ($gameMap && typeof $gameMap.isPassable === "function") {
          // Check all 4 directions to see if any direction is passable
          return (
            $gameMap.isPassable(x, y, 2) ||
            $gameMap.isPassable(x, y, 4) ||
            $gameMap.isPassable(x, y, 6) ||
            $gameMap.isPassable(x, y, 8)
          );
        }

        return true; // Default to passable if can't determine
      } catch (error) {
        console.warn("Error checking passability:", error);
        return true;
      }
    },

    drawWalkableBoundaries(ctx, startX, startY, endX, endY) {
      ctx.strokeStyle = "#FFFFFF"; // white for non-walkable boundaries
      ctx.lineWidth = 2;

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          if (!this.isTilePassable(x, y)) continue;

          const canvasX = (x - startX) * this.cellSize;
          const canvasY = (y - startY) * this.cellSize;

          // Use canPass to check movement in each direction
          if ($gamePlayer && typeof $gamePlayer.canPass === "function") {
            // Check if player can move from this tile in each direction
            const canMoveLeft = $gamePlayer.canPass(x, y, 4); // direction 4 = left
            const canMoveRight = $gamePlayer.canPass(x, y, 6); // direction 6 = right
            const canMoveUp = $gamePlayer.canPass(x, y, 8); // direction 8 = up
            const canMoveDown = $gamePlayer.canPass(x, y, 2); // direction 2 = down

            // Draw boundary lines where movement is blocked
            ctx.beginPath();

            if (!canMoveLeft) {
              // Draw left border - can't move left from this tile
              ctx.moveTo(canvasX, canvasY);
              ctx.lineTo(canvasX, canvasY + this.cellSize);
            }

            if (!canMoveRight) {
              // Draw right border - can't move right from this tile
              ctx.moveTo(canvasX + this.cellSize, canvasY);
              ctx.lineTo(canvasX + this.cellSize, canvasY + this.cellSize);
            }

            if (!canMoveUp) {
              // Draw top border - can't move up from this tile
              ctx.moveTo(canvasX, canvasY);
              ctx.lineTo(canvasX + this.cellSize, canvasY);
            }

            if (!canMoveDown) {
              // Draw bottom border - can't move down from this tile
              ctx.moveTo(canvasX, canvasY + this.cellSize);
              ctx.lineTo(canvasX + this.cellSize, canvasY + this.cellSize);
            }

            ctx.stroke();
          }
        }
      }
    },

    isWithinMapBounds(x, y) {
      try {
        // Method 1: Use RPG Maker's built-in validation
        if ($gameMap && typeof $gameMap.isValid === "function") {
          return $gameMap.isValid(x, y);
        }

        // Method 2: Use RPG Maker's width/height methods
        if ($gameMap) {
          const width = $gameMap.width();
          const height = $gameMap.height();
          return x >= 0 && x < width && y >= 0 && y < height;
        }

        // Method 3: Fallback to map data
        if (this.mapData) {
          return (
            x >= 0 &&
            x < this.mapData.width &&
            y >= 0 &&
            y < this.mapData.height
          );
        }

        return false;
      } catch (error) {
        console.warn("Could not check map bounds:", error);
        return false;
      }
    },

    drawMapEvents(ctx, startX, startY) {
      // Only draw regular events (excluding enemies and treasure boxes)
      this.regularEvents.forEach((event) => {
        if (!markerVisible(event, this._layers || readMapLayers())) return;
        if (
          event.x >= startX &&
          event.x < startX + this.displayMapWidth &&
          event.y >= startY &&
          event.y < startY + this.displayMapHeight
        ) {
          if (this.drawCharacter(ctx, event, startX, startY)) return;
          const canvasX = (event.x - startX) * this.cellSize;
          const canvasY = (event.y - startY) * this.cellSize;

          // Draw yellow background for event
          ctx.fillStyle = "#FFD700";
          const size =
            this.cellSize * ((this._layers && this._layers.markerScale) || 1);
          ctx.fillRect(
            canvasX + (this.cellSize - size) / 2,
            canvasY + (this.cellSize - size) / 2,
            size,
            size,
          );
        }
      });
    },

    drawEnemies(ctx, startX, startY) {
      this.enemies.forEach((enemy) => {
        if (enemy.erased) return;
        if (
          enemy.x >= startX &&
          enemy.x < startX + this.displayMapWidth &&
          enemy.y >= startY &&
          enemy.y < startY + this.displayMapHeight
        ) {
          if (this.drawCharacter(ctx, enemy, startX, startY)) return;
          const canvasX = (enemy.x - startX) * this.cellSize;
          const canvasY = (enemy.y - startY) * this.cellSize;

          // Draw orange circle for enemy
          ctx.fillStyle = "#FF8C00"; // Dark orange
          ctx.beginPath();
          ctx.arc(
            canvasX + this.cellSize / 2,
            canvasY + this.cellSize / 2,
            Math.max(3, this.cellSize / 3) *
              ((this._layers && this._layers.markerScale) || 1),
            0,
            2 * Math.PI,
          );
          ctx.fill();

          // Add a small black outline for better visibility
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.stroke();

          // If enemy is moving, add a small indicator
          if (enemy.moving) {
            // Draw a small triangle to indicate movement direction
            const centerX = canvasX + this.cellSize / 2;
            const centerY = canvasY + this.cellSize / 2;
            const size =
              Math.max(2, this.cellSize / 6) *
              ((this._layers && this._layers.markerScale) || 1);

            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();

            // Direction: 2=down, 4=left, 6=right, 8=up
            switch (enemy.direction) {
              case 2: // down
                ctx.moveTo(centerX, centerY + size);
                ctx.lineTo(centerX - size / 2, centerY);
                ctx.lineTo(centerX + size / 2, centerY);
                break;
              case 4: // left
                ctx.moveTo(centerX - size, centerY);
                ctx.lineTo(centerX, centerY - size / 2);
                ctx.lineTo(centerX, centerY + size / 2);
                break;
              case 6: // right
                ctx.moveTo(centerX + size, centerY);
                ctx.lineTo(centerX, centerY - size / 2);
                ctx.lineTo(centerX, centerY + size / 2);
                break;
              case 8: // up
                ctx.moveTo(centerX, centerY - size);
                ctx.lineTo(centerX - size / 2, centerY);
                ctx.lineTo(centerX + size / 2, centerY);
                break;
              default:
                // Default direction indicator
                ctx.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
            }

            ctx.closePath();
            ctx.fill();
          }
        }
      });
    },

    drawTreasureBoxes(ctx, startX, startY) {
      this.treasureBoxes.forEach((treasure) => {
        if (treasure.erased) return;
        if (
          treasure.x >= startX &&
          treasure.x < startX + this.displayMapWidth &&
          treasure.y >= startY &&
          treasure.y < startY + this.displayMapHeight
        ) {
          if (this.drawCharacter(ctx, treasure, startX, startY)) return;
          const canvasX = (treasure.x - startX) * this.cellSize;
          const canvasY = (treasure.y - startY) * this.cellSize;

          // Draw blue square for treasure box
          ctx.fillStyle = "#0066FF"; // Blue
          // fill the square
          const size =
            this.cellSize * ((this._layers && this._layers.markerScale) || 1);
          const left = canvasX + (this.cellSize - size) / 2,
            top = canvasY + (this.cellSize - size) / 2;
          ctx.fillRect(left, top, size, size);

          // Add a small black outline for better visibility
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            left + size / 8,
            top + size / 8,
            (size * 3) / 4,
            (size * 3) / 4,
          );

          // Optional: Add a small highlight to make it look more like a chest
          ctx.fillStyle = "#66AAFF"; // Lighter blue for highlight
          ctx.fillRect(
            left + (size * 3) / 8,
            top + size / 4,
            size / 4,
            size / 4,
          );
        }
      });
    },

    drawPlayer(ctx, startX, startY) {
      const playerCanvasX = (this.playerPosition.x - startX) * this.cellSize;
      const playerCanvasY = (this.playerPosition.y - startY) * this.cellSize;

      // Only draw if player is within view
      if (
        this.playerPosition.x >= startX &&
        this.playerPosition.x < startX + this.displayMapWidth &&
        this.playerPosition.y >= startY &&
        this.playerPosition.y < startY + this.displayMapHeight
      ) {
        // Draw red circle for player
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(
          playerCanvasX + this.cellSize / 2,
          playerCanvasY + this.cellSize / 2,
          Math.max(3, this.cellSize / 3) *
            ((this._layers && this._layers.markerScale) || 1),
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
    },

    onCanvasClick(event) {
      if (
        !this.clickToTeleportEnabled ||
        !this.mapData ||
        !this.$refs.mapCanvas
      )
        return;

      const tile = tileAtPointer(event, this.$refs.mapCanvas, this.viewport());
      if (!tile) return;
      const mapX = tile.x,
        mapY = tile.y;

      // Validate coordinates are within map bounds
      if (
        mapX >= 0 &&
        mapX < this.mapData.width &&
        mapY >= 0 &&
        mapY < this.mapData.height
      ) {
        this.teleportPlayerTo(mapX, mapY);
      } else {
        console.warn(
          `Click coordinates (${mapX}, ${mapY}) are outside map bounds`,
        );
      }
    },

    teleportPlayerTo(targetX, targetY) {
      try {
        if ($gamePlayer) {
          // Use direct positioning for instant teleport
          $gamePlayer.setPosition(targetX, targetY);
          $gamePlayer.center(targetX, targetY);
          $gamePlayer.makeEncounterCount();

          console.log(`Teleported player to (${targetX}, ${targetY})`);
        }
      } catch (error) {
        console.warn("Could not teleport player:", error);
      }
    },
  },
};
