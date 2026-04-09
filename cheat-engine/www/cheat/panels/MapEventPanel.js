/**
 * MapEventPanel.js
 * Original feature from Justype fork (https://github.com/Justype/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
 * 2024-03-20
 */
import { coercePanelNumber } from "../js/panels/PanelGameState.js";

export default {
  name: "MapEventPanel",

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
                <v-chip x-small color="grey" class="ma-1">Grey: Walkable</v-chip>
                <v-chip x-small color="grey darken-3" class="ma-1">Dark: Blocked</v-chip>
                <v-chip x-small color="red" class="ma-1">Red: Player</v-chip>
                <v-chip x-small color="yellow" text-color="black" class="ma-1">EV: Event</v-chip>
                <v-chip x-small color="white" text-color="black" class="ma-1">White: Border</v-chip>
                <v-chip x-small color="orange" class="ma-1">Orange: Enemy</v-chip>
                <v-chip x-small color="blue" class="ma-1">Blue: Treasure</v-chip>
            </div>
            <div v-if="hoverInfo" class="text-caption mt-0 mb-1 blue--text font-weight-bold ml-1">
                {{ hoverInfo }}
            </div>
        </v-col>
    </v-row>

    <v-divider></v-divider>

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
    // Pre-compiled regex patterns for better performance (non-reactive)
    this.treasureNamePattern =
      /treasure|chest|box|gold|coin|money|gem|jewel|diamond|ruby|emerald|loot|reward|prize|vault|safe|宝箱|宝物|金币|金钱|珠宝|财宝|奖励|宝石|钻石|红宝石|绿宝石|たからばこ|たからもの|きんか|きんせん|ほうせき|しゅほう|おうごん|ゴールド|コイン|マネー|ジェム|ジュエル|ダイヤモンド|ルビー|エメラルド|トレジャー|チェスト|ボックス|リワード|プライズ/i;
    this.treasureImageNamePattern =
      /chest|box|treasure|gold|coin|gem|jewel|crystal|orb|artifact|vault|safe|money|diamond|ruby|emerald|宝箱|宝物|金币|金钱|珠宝|财宝|钻石|红宝石|绿宝石|宝石|たからばこ|たからもの|きんか|きんせん|ほうせき|ダイヤモンド|ルビー|エメラルド|ゴールド|コイン|ジェム|ジュエル|クリスタル|トレジャー|チェスト|ボックス/i;
    this.treasureTextPattern =
      /found|obtained|received|gained|treasure|gold|coin|item|reward|loot|prize|discovered|acquired|collected|发现|获得|得到|找到|宝物|金币|收集|获取|奖励|战利品|發見|入手|取得|みつけた|てにいれた|えた|かくとく|ほうしゅう|あいてむ|たからもの|きんか|ゴールド|アイテム|リワード|トレジャー|コイン|しゅうしゅう|はっけん/i;
    this.enemyCommentPattern =
      /enemy|敌人|monster|hostile|boss|guard|soldier|bandit|thief|assassin|villain|criminal|mercenary|outlaw|warrior|knight|敵|モンスター|敵対|ボス|ガード|兵士|盗賊|暗殺者|悪|魔物|魔獣|デーモン|鬼|妖怪|悪役|犯罪者|傭兵|戦士|騎士|アウトロー/i;
    this.enemyImageNamePattern =
      /enemy|monster|evil|demon|beast|soldier|guard|bandit|thief|assassin|mercenary|outlaw|criminal|villain|boss|captain|samurai|ninja|ronin|hunter|archer|swordsman|mage|wizard|witch|sorcerer|priest|cleric|warrior|knight|man|woman|person|human|people|npc|char|character|sprite|敌人|敵|怪物|魔物|士兵|守卫|强盗|小偷|刺客|雇佣兵|罪犯|恶棍|老板|队长|武士|忍者|猎人|弓箭手|剑士|法师|巫师|祭司|战士|骑士|人|角色|モンスター|悪|デーモン|魔獣|兵士|ガード|盗賊|暗殺者|傭兵|犯罪者|悪役|ボス|キャプテン|サムライ|ニンジャ|浪人|ハンター|アーチャー|ソードマン|メイジ|ウィザード|魔女|ソーサラー|プリースト|クレリック|戦士|騎士|人間|キャラクター|スプライト/i;

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
        cursor: this.clickToTeleportEnabled ? "crosshair" : "default",
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
        this.mapData = $dataMap;

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
        this.cellSize = this.baseCellSize;
        const maxSize = this.maxViewSize;
        this.canvasWidth = Math.min(600, maxSize * this.cellSize);
        this.canvasHeight = Math.min(600, maxSize * this.cellSize);
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

      const canvas = this.$refs.mapCanvas;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);

      const cellX = Math.floor(x / this.cellSize);
      const cellY = Math.floor(y / this.cellSize);

      let mapX, mapY;
      if (this.limitedView) {
        const startX = Math.max(
          0,
          this.playerPosition.x - Math.floor(this.maxViewSize / 2),
        );
        const startY = Math.max(
          0,
          this.playerPosition.y - Math.floor(this.maxViewSize / 2),
        );
        const endX = Math.min(this.mapData.width, startX + this.maxViewSize);
        const endY = Math.min(this.mapData.height, startY + this.maxViewSize);
        const realStartX =
          endX - startX < this.maxViewSize
            ? Math.max(0, endX - this.maxViewSize)
            : startX;
        const realStartY =
          endY - startY < this.maxViewSize
            ? Math.max(0, endY - this.maxViewSize)
            : startY;
        mapX = realStartX + cellX;
        mapY = realStartY + cellY;
      } else {
        mapX = cellX;
        mapY = cellY;
      }

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

      // Passability info
      const isWalkable = this.isTilePassable(mapX, mapY);
      info += isWalkable ? " | Walkable" : " | Blocked";

      // Check player
      if (mapX === this.playerPosition.x && mapY === this.playerPosition.y) {
        info += ` | Player`;
      }

      // Check enemies
      const enemy = this.enemies.find((e) => e.x === mapX && e.y === mapY);
      if (enemy) {
        info += ` | Enemy: ${enemy.characterName || "Unknown"} (ID: ${enemy.id})`;
      }

      // Check treasures
      const treasure = this.treasureBoxes.find(
        (t) => t.x === mapX && t.y === mapY,
      );
      if (treasure) {
        info += ` | Treasure: ${treasure.name || "Unknown"} (ID: ${treasure.id})`;
      }

      // Check regular events
      const regEvent = this.regularEvents.find(
        (e) => e.x === mapX && e.y === mapY,
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
            x: $gamePlayer.x,
            y: $gamePlayer.y,
          };
        }
      } catch (error) {
        console.warn("Could not get player position:", error);
      }
    },

    updateMapEvents() {
      try {
        // Clear all event arrays
        this.mapEvents = [];
        this.enemies = [];
        this.treasureBoxes = [];
        this.regularEvents = [];

        if (!$dataMap || !$dataMap.events) return;

        // Single pass through events - classify each one
        for (let i = 1; i < $dataMap.events.length; i++) {
          const event = $dataMap.events[i];
          if (!event || event.x === undefined || event.y === undefined)
            continue;

          // Add to main events list
          this.mapEvents.push(event);

          // Get corresponding game event for dynamic data
          const gameEvent = $gameMap._events[i];

          // Check if it's an enemy first
          if (gameEvent && this.isEnemyEvent(gameEvent)) {
            this.enemies.push({
              id: gameEvent._eventId || i,
              x: gameEvent._x !== undefined ? gameEvent._x : event.x,
              y: gameEvent._y !== undefined ? gameEvent._y : event.y,
              direction: gameEvent._direction || 2,
              moving: gameEvent._moveType > 0,
              characterName: gameEvent._characterName || "",
              characterIndex: gameEvent._characterIndex || 0,
            });
          }
          // If not enemy, check if it's a treasure
          else if (this.isTreasureEvent(event)) {
            this.treasureBoxes.push({
              x: event.x,
              y: event.y,
              id: event.id,
              name: event.name,
            });
          }
          // If neither enemy nor treasure, add to regular events
          else {
            this.regularEvents.push(event);
          }
        }

        console.log(
          `Events processed: ${this.enemies.length} enemies, ${this.treasureBoxes.length} treasures, ${this.regularEvents.length} regular events`,
        );
      } catch (error) {
        console.warn("Could not get map events:", error);
      }
    },

    isEnemyEvent(event) {
      try {
        const hasMovement = event._moveType > 0; // 1=random, 2=approach, 3=custom
        const hasCharacterGraphic =
          event._characterName && event._characterName !== "";
        const notPlayer = event._eventId !== $gamePlayer._eventId;

        // Moving characters are likely enemies
        if (hasMovement && notPlayer) {
          return true;
        }

        if (!hasCharacterGraphic) {
          return false;
        }

        // Look for enemy-related patterns in event pages
        if (event._pages) {
          for (const page of event._pages) {
            if (page && page.list) {
              for (const command of page.list) {
                // Check for battle processing command (code 301)
                if (command.code === 301) return true;
                // Check for common enemy event patterns
                if (command.code === 108 || command.code === 408) {
                  const comment = command.parameters[0] || "";

                  // Use pre-compiled regex for efficient multi-language enemy pattern matching
                  if (this.enemyCommentPattern.test(comment)) {
                    return true;
                  }
                }
              }
            }
          }
        }

        // Check character filename patterns using pre-compiled regex
        if (this.enemyImageNamePattern.test(event._characterName)) {
          return true;
        }

        return false;
      } catch (error) {
        return false;
      }
    },

    isTreasureEvent(event) {
      try {
        // Check if event name contains treasure-related keywords using pre-compiled regex
        if (event.name && this.treasureNamePattern.test(event.name)) {
          return true;
        }

        // Check if event has treasure-like graphics using pre-compiled regex
        if (
          event._characterName &&
          this.treasureImageNamePattern.test(event._characterName)
        ) {
          return true;
        }

        // Check event pages for treasure-related commands
        if (event.pages) {
          for (const page of event.pages) {
            if (!page) continue;
            if (
              page.image &&
              page.image.characterName &&
              this.treasureImageNamePattern.test(page.image.characterName)
            ) {
              return true;
            }
            if (page && page.list) {
              for (const command of page.list) {
                if (command && command.parameters) {
                  // Check for item/gold gain commands
                  if (
                    command.code === 125 || // Change Gold
                    command.code === 126 || // Change Items
                    command.code === 127 || // Change Weapons
                    command.code === 128
                  ) {
                    // Change Armors
                    return true;
                  }

                  // Check for treasure-related text in messages using pre-compiled regex
                  if (command.code === 101 || command.code === 401) {
                    // Show Text
                    const text = command.parameters[0] || "";

                    // Use pre-compiled regex for efficient multi-language treasure pattern matching
                    if (this.treasureTextPattern.test(text)) {
                      return true;
                    }
                  }
                }
              }
            }
          }
        }

        return false;
      } catch (error) {
        return false;
      }
    },

    updateEnemyPositions() {
      try {
        // Only update positions of existing enemies, don't reclassify
        this.enemies.forEach((enemy) => {
          const gameEvent = $gameMap._events[enemy.id];
          if (gameEvent) {
            enemy.x = gameEvent._x;
            enemy.y = gameEvent._y;
            enemy.direction = gameEvent._direction || 2;
            enemy.moving = gameEvent._moveType > 0;
          }
        });
      } catch (error) {
        console.warn("Could not update enemy positions:", error);
      }
    },

    checkForMapChange() {
      try {
        const currentMapId = $gameMap.mapId();

        // If map has changed, update all map-related data
        if (currentMapId !== this.lastKnownMapId) {
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

    renderMap() {
      if (!this.mapData || !this.$refs.mapCanvas) return;

      // Performance optimization: check if state has changed since last render
      const currentState = `${this.currentMapId}-${this.playerPosition.x}-${this.playerPosition.y}-${this.cellSize}-${this.limitedView}-${this.enemies.length}-${this.treasureBoxes.length}`;
      if (this.lastRenderState === currentState) return;
      this.lastRenderState = currentState;

      const canvas = this.$refs.mapCanvas;
      const ctx = canvas.getContext("2d");

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate view bounds
      let startX = 0,
        startY = 0,
        endX = this.mapData.width,
        endY = this.mapData.height;

      if (this.limitedView) {
        // Center the view around the player
        startX = Math.max(
          0,
          this.playerPosition.x - Math.floor(this.maxViewSize / 2),
        );
        startY = Math.max(
          0,
          this.playerPosition.y - Math.floor(this.maxViewSize / 2),
        );
        endX = Math.min(this.mapData.width, startX + this.maxViewSize);
        endY = Math.min(this.mapData.height, startY + this.maxViewSize);

        // Adjust start positions if we hit the map boundaries
        if (endX - startX < this.maxViewSize) {
          startX = Math.max(0, endX - this.maxViewSize);
        }
        if (endY - startY < this.maxViewSize) {
          startY = Math.max(0, endY - this.maxViewSize);
        }
      }

      this.drawMapGrid(ctx, startX, startY, endX, endY);

      this.drawMapEvents(ctx, startX, startY);

      this.drawTreasureBoxes(ctx, startX, startY);

      this.drawEnemies(ctx, startX, startY);

      this.drawPlayer(ctx, startX, startY);
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
        if (
          event.x >= startX &&
          event.x < startX + this.displayMapWidth &&
          event.y >= startY &&
          event.y < startY + this.displayMapHeight
        ) {
          const canvasX = (event.x - startX) * this.cellSize;
          const canvasY = (event.y - startY) * this.cellSize;

          // Draw yellow background for event
          ctx.fillStyle = "#FFD700";
          ctx.fillRect(canvasX, canvasY, this.cellSize, this.cellSize);

          // Draw "EV" text
          ctx.fillStyle = "#000000";
          ctx.font = `${Math.max(8, this.cellSize - 4)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "EV",
            canvasX + this.cellSize / 2,
            canvasY + this.cellSize / 2,
          );
        }
      });
    },

    drawEnemies(ctx, startX, startY) {
      this.enemies.forEach((enemy) => {
        if (
          enemy.x >= startX &&
          enemy.x < startX + this.displayMapWidth &&
          enemy.y >= startY &&
          enemy.y < startY + this.displayMapHeight
        ) {
          const canvasX = (enemy.x - startX) * this.cellSize;
          const canvasY = (enemy.y - startY) * this.cellSize;

          // Draw orange circle for enemy
          ctx.fillStyle = "#FF8C00"; // Dark orange
          ctx.beginPath();
          ctx.arc(
            canvasX + this.cellSize / 2,
            canvasY + this.cellSize / 2,
            Math.max(3, this.cellSize / 3),
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
            const size = Math.max(2, this.cellSize / 6);

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
        if (
          treasure.x >= startX &&
          treasure.x < startX + this.displayMapWidth &&
          treasure.y >= startY &&
          treasure.y < startY + this.displayMapHeight
        ) {
          const canvasX = (treasure.x - startX) * this.cellSize;
          const canvasY = (treasure.y - startY) * this.cellSize;

          // Draw blue square for treasure box
          ctx.fillStyle = "#0066FF"; // Blue
          // fill the square
          ctx.fillRect(canvasX, canvasY, this.cellSize, this.cellSize);

          // Add a small black outline for better visibility
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            canvasX + this.cellSize / 8,
            canvasY + this.cellSize / 8,
            (this.cellSize * 3) / 4,
            (this.cellSize * 3) / 4,
          );

          // Optional: Add a small highlight to make it look more like a chest
          ctx.fillStyle = "#66AAFF"; // Lighter blue for highlight
          ctx.fillRect(
            canvasX + (this.cellSize * 3) / 8,
            canvasY + this.cellSize / 4,
            this.cellSize / 4,
            this.cellSize / 4,
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
          Math.max(3, this.cellSize / 3),
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

      // Get canvas bounds and click position with scaling accounts
      const canvas = this.$refs.mapCanvas;
      const rect = canvas.getBoundingClientRect();
      const clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
      const clickY = (event.clientY - rect.top) * (canvas.height / rect.height);

      // Calculate which grid cell was clicked
      const cellX = Math.floor(clickX / this.cellSize);
      const cellY = Math.floor(clickY / this.cellSize);

      // Calculate actual map coordinates based on current view
      let mapX, mapY;

      if (this.limitedView) {
        // For limited view, calculate offset from player position
        const startX = Math.max(
          0,
          this.playerPosition.x - Math.floor(this.maxViewSize / 2),
        );
        const startY = Math.max(
          0,
          this.playerPosition.y - Math.floor(this.maxViewSize / 2),
        );

        // Adjust start positions if we hit map boundaries
        const endX = Math.min(this.mapData.width, startX + this.maxViewSize);
        const endY = Math.min(this.mapData.height, startY + this.maxViewSize);

        if (endX - startX < this.maxViewSize) {
          const adjustedStartX = Math.max(0, endX - this.maxViewSize);
          mapX = adjustedStartX + cellX;
        } else {
          mapX = startX + cellX;
        }

        if (endY - startY < this.maxViewSize) {
          const adjustedStartY = Math.max(0, endY - this.maxViewSize);
          mapY = adjustedStartY + cellY;
        } else {
          mapY = startY + cellY;
        }
      } else {
        // For full view, direct mapping
        mapX = cellX;
        mapY = cellY;
      }

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
