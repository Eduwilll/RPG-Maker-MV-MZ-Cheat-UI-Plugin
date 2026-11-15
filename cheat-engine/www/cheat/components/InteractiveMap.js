import MapLayers from "./MapLayers.js";
import MinimapPanel from "../panels/MinimapPanel.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";
import { readMapLayers } from "../js/panels/map/MapLayersState.js";
import { markerVisible } from "../js/panels/map/MapMarkers.js";
import {
  readMinimapFrame,
  renderBaseMap,
  getMinimapStatus,
  clearMinimapCache,
} from "../js/panels/minimap/MinimapRenderer.js";
import {
  mapCamera,
  panCamera,
  zoomCamera,
  worldAtPoint,
} from "../js/panels/map/MapCamera.js";
import {
  createMapScene,
  MAP_MARKER_STYLES,
} from "../js/panels/map/MapScene.js";
import { startMapFrames } from "../js/panels/map/MapFrames.js";
import {
  selectMapPoint,
  teleportMapSelection,
} from "../js/panels/map/MapSelection.js";
import { startPointerDrag } from "../js/ui/LayoutGeometry.js";
import {
  readMinimapSettings,
  writeMinimapZoom,
  writeMinimapMode,
} from "../js/panels/minimap/MinimapPanelState.js";

function storedView() {
  try {
    const saved = JSON.parse(
      KEY_VALUE_STORAGE.getItem("map.interactiveView") || "null",
    );
    return {
      zoom:
        saved && Number.isFinite(saved.zoom)
          ? Math.max(1, Math.min(64, saved.zoom))
          : 1,
      follow: !saved || saved.follow !== false,
      mode: saved && saved.mode === "radar" ? "radar" : "realistic",
    };
  } catch (error) {
    return { zoom: 1, follow: true, mode: "realistic" };
  }
}

export default {
  name: "InteractiveMap",
  components: { MapLayers, MinimapPanel },
  props: { compact: Boolean, active: { type: Boolean, default: true } },
  data() {
    const saved = storedView();
    return {
      zoom: saved.zoom,
      follow: saved.follow,
      renderMode: saved.mode,
      interactionEnabled: !this.compact,
      drawer: "",
      search: "",
      searchRows: [],
      selection: null,
      hoverInfo: "",
      mapName: "Map",
      currentMapId: 0,
      renderStatus: "Loading map artwork...",
      onMap: false,
      surfaceHeight: 380,
      width: 600,
      height: 380,
      playerLabel: "",
      message: "",
      markerStyles: MAP_MARKER_STYLES,
      legend: false,
    };
  },
  watch: {
    drawer(value) {
      this.$emit("tools-open", !!value);
    },
    active(value) {
      if (value)
        this.$nextTick(() => {
          this.measure();
          this.renderMap();
        });
    },
  },
  template: `
<section class="interactive-map" :class="{ 'interactive-map--compact': compact, 'interactive-map--locked': !interactionEnabled }" :style="{height: compact ? '100%' : surfaceHeight + 'px'}"
 @keydown.stop @keyup.stop @mousedown.stop @mouseup.stop @touchstart.stop @touchend.stop @click.stop @contextmenu.prevent.stop>
  <canvas ref="mapCanvas" class="interactive-map__canvas" :width="width" :height="height" tabindex="0" aria-label="Interactive game map. Drag or use arrow keys to pan; plus and minus zoom. Click to inspect a location."
   :style="{pointerEvents: interactionEnabled ? 'auto' : 'none'}" @pointerdown.stop.prevent="startPan" @wheel.stop.prevent="wheelZoom" @click="onCanvasClick" @mousemove="onCanvasMouseMove" @mouseleave="hoverInfo = ''" @keydown.prevent="mapKey"/>
  <div class="interactive-map__heading"><v-icon small>mdi-map-outline</v-icon><span>{{mapName}}</span><span class="interactive-map__live" v-if="onMap">LIVE</span></div>
  <div class="interactive-map__tools" role="toolbar" aria-label="Map controls" @pointerdown.stop>
    <button v-if="compact" type="button" class="map-tool" :class="{'is-active': interactionEnabled}" :aria-pressed="String(interactionEnabled)" aria-label="Interact with minimap" title="Enable pan and selection; off lets clicks reach the game" @click="interactionEnabled = !interactionEnabled"><v-icon small>mdi-cursor-default-outline</v-icon></button>
    <button type="button" class="map-tool" :class="{'is-active': drawer === 'find'}" aria-label="Find map event" title="Find NPC, enemy, item or event" @click="openDrawer('find')"><v-icon small>mdi-magnify</v-icon></button>
    <button type="button" class="map-tool" :class="{'is-active': drawer === 'layers'}" aria-label="Map layers" title="Layers and markers" @click="openDrawer('layers')"><v-icon small>mdi-layers-outline</v-icon></button>
    <button type="button" class="map-tool" :class="{'is-active': drawer === 'display'}" aria-label="Map settings" title="Map and minimap settings" @click="openDrawer('display')"><v-icon small>mdi-tune</v-icon></button>
  </div>
  <div class="interactive-map__navigation" role="toolbar" aria-label="Map navigation" @pointerdown.stop>
    <button type="button" class="map-tool" aria-label="Zoom in" title="Zoom in (+)" @click="zoomBy(1.3)"><v-icon small>mdi-plus</v-icon></button>
    <button type="button" class="map-tool" aria-label="Zoom out" title="Zoom out (-)" @click="zoomBy(1/1.3)"><v-icon small>mdi-minus</v-icon></button>
    <span class="map-tool__divider"></span>
    <button type="button" class="map-tool" :class="{'is-active': follow}" :aria-pressed="String(follow)" aria-label="Follow player" title="Follow player (F)" @click="followPlayer"><v-icon small>mdi-navigation</v-icon></button>
    <button type="button" class="map-tool" aria-label="Fit whole map" title="Fit whole map (0)" @click="fitMap"><v-icon small>mdi-fit-to-screen-outline</v-icon></button>
  </div>
  <aside v-if="drawer" class="interactive-map__drawer" :aria-label="drawer === 'layers' ? 'Map layers' : drawer === 'find' ? 'Find on map' : 'Map settings'" @pointerdown.stop @wheel.stop>
    <header><strong>{{drawer === 'layers' ? 'Layers & markers' : drawer === 'find' ? 'Find on map' : drawer === 'floating' ? 'Floating minimap settings' : 'Map settings'}}</strong><button type="button" class="map-tool" aria-label="Close map settings" @click="drawer = ''"><v-icon small>mdi-close</v-icon></button></header>
    <map-layers v-if="drawer === 'layers'" inline @change="renderMap"/>
    <div v-else-if="drawer === 'find'" class="map-settings">
      <v-text-field v-model="search" label="Name or event ID" dense outlined hide-details @input="updateSearch"/>
      <button v-for="row in searchRows" :key="row.id" type="button" class="map-result" @click="selectEvent(row)"><span class="map-result__kind" :style="{color: markerStyles[row.kind].color}">{{markerStyles[row.kind].label}}</span><strong>{{row.name}}</strong><small>#{{row.id}} · {{Math.floor(row.x)}}, {{Math.floor(row.y)}}</small></button>
      <p v-if="!searchRows.length" class="caption">No visible events match. Hidden layers are excluded.</p>
    </div>
    <minimap-panel v-else-if="drawer === 'floating'" embedded/>
    <div v-else class="map-settings">
      <v-select v-model="renderMode" :items="[{text:'Game artwork',value:'realistic'},{text:'Radar / passability',value:'radar'}]" label="Map display" outlined dense hide-details @change="saveView"/>
      <button type="button" class="map-settings__link" @click="drawer = 'floating'" data-feature="floating-minimap"><v-icon small>mdi-picture-in-picture-bottom-right-outline</v-icon> Floating minimap settings <v-icon small>mdi-chevron-right</v-icon></button>
      <button type="button" class="map-settings__link" @click="legend = !legend"><v-icon small>mdi-map-legend</v-icon> {{legend ? 'Hide' : 'Show'}} marker legend</button>
      <button type="button" class="map-settings__link" @click="refreshArtwork"><v-icon small>mdi-refresh</v-icon> Refresh artwork</button>
      <p class="caption">Drag to pan · Scroll to zoom · F to follow · 0 to fit. Click to inspect; use Teleport to move.</p>
      <p class="caption" role="status">{{renderStatus}}</p>
    </div>
  </aside>
  <div v-if="legend && !drawer" class="interactive-map__legend"><span v-for="(style,kind) in markerStyles" :key="kind"><i :style="{background:style.color}"></i>{{style.label}}</span></div>
  <div v-if="selection && !drawer" class="interactive-map__selection" @pointerdown.stop>
    <div><span class="map-result__kind">{{selection.kind === 'location' ? 'Location' : markerStyles[selection.kind].label}}</span><strong>{{selection.name}}</strong><small>X {{selection.x}} · Y {{selection.y}}<template v-if="selection.id"> · #{{selection.id}}</template></small></div>
    <button type="button" class="map-teleport" @click="teleportSelection" aria-label="Teleport to selected location"><v-icon small>mdi-map-marker</v-icon> Teleport</button>
    <button type="button" class="map-tool" aria-label="Clear map selection" @click="selection = null"><v-icon small>mdi-close</v-icon></button>
  </div>
  <div class="interactive-map__status" aria-live="off"><span>{{onMap ? (hoverInfo || playerLabel) : 'No active map'}}</span><span v-if="!compact">{{Math.round(zoom*100)}}%</span></div>
  <div v-if="message" class="interactive-map__message" role="status">{{message}}</div>
</section>`,
  mounted() {
    this._scene = createMapScene(this.$refs.mapCanvas);
    this._game = getGameWindow();
    this._reducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)");
    this._resize = () => this.measure();
    window.addEventListener("resize", this._resize);
    window.addEventListener("cheat-layout-change", this._resize);
    if (window.ResizeObserver) {
      this._observer = new window.ResizeObserver(this._resize);
      this._observer.observe(this.$el.parentElement);
    }
    this.measure();
    this.renderMap();
    this._stopFrames = startMapFrames(window, (time) => {
      if (!this.active) return;
      if (
        !this._observer &&
        (!this._measureTime || time - this._measureTime > 250)
      ) {
        this._measureTime = time;
        this.measure();
      }
      this.renderMap(time);
    });
  },
  beforeDestroy() {
    if (this._stopFrames) this._stopFrames();
    if (this._stopPan) this._stopPan();
    if (this._observer) this._observer.disconnect();
    window.removeEventListener("resize", this._resize);
    window.removeEventListener("cheat-layout-change", this._resize);
  },
  methods: {
    measure() {
      if (!this.$el) return;
      if (!this.compact) {
        const content = this.$el.closest(".cheat-content");
        this.surfaceHeight = content
          ? Math.max(260, content.clientHeight - 36)
          : 380;
      }
      const rect = this.$el.getBoundingClientRect();
      this.width = Math.max(1, Math.round(rect.width || 600));
      this.height = Math.max(
        1,
        Math.round(this.compact ? rect.height || 176 : this.surfaceHeight),
      );
    },
    saveView() {
      if (this.compact) return;
      try {
        KEY_VALUE_STORAGE.setItem(
          "map.interactiveView",
          JSON.stringify({
            zoom: this.zoom,
            follow: this.follow,
            mode: this.renderMode,
          }),
        );
      } catch (error) {
        /* Session remains usable. */
      }
    },
    renderMap(time) {
      if (!this._scene || !this._game || !this.$el.getClientRects().length)
        return;
      const frame = readMinimapFrame();
      this._frame = frame;
      if (!frame.onMap) {
        this.onMap = false;
        return;
      }
      const game = this._game,
        map = game.$dataMap;
      if (!map) return;
      const id = game.$gameMap.mapId();
      const changed = this.currentMapId !== id || this._mapIdentity !== map;
      if (changed) {
        this.currentMapId = id;
        this._mapIdentity = map;
        this._mapGeneration = (this._mapGeneration || 0) + 1;
        this._center = null;
        this.selection = null;
        this.searchRows = [];
        this._scene.invalidate();
      }
      const settings = this.compact ? readMinimapSettings() : null;
      const follow = settings ? settings.mode === "follow" : this.follow;
      const zoom = settings
        ? settings.zoom *
          (follow ? Math.max(1, map.width / 35, map.height / 35) : 1)
        : this.zoom;
      if (this.compact) this.follow = follow;
      const center =
        follow || !this._center
          ? { x: frame.playerX + 0.5, y: frame.playerY + 0.5 }
          : this._center;
      this._camera = mapCamera({
        mapWidth: map.width,
        mapHeight: map.height,
        width: this.width,
        height: this.height,
        x: center.x,
        y: center.y,
        zoom,
      });
      const layers = readMapLayers();
      this._visibleEvents =
        settings && !settings.showEvents ? [] : frame.events;
      const base =
        layers.background && this.renderMode === "realistic"
          ? renderBaseMap()
          : null;
      this._scene.draw(base, {
        game,
        camera: this._camera,
        mode: base || !layers.background ? this.renderMode : "radar",
        layers,
        markers: this._visibleEvents,
        player: {
          x: frame.playerX,
          y: frame.playerY,
          direction: frame.direction,
        },
        selection: this.selection,
        time: time || 0,
        reducedMotion: !!(this._reducedMotion && this._reducedMotion.matches),
      });
      if (changed || !this._metaTime || Date.now() - this._metaTime > 100) {
        this._metaTime = Date.now();
        this.onMap = true;
        this.mapName = String(
          (game.$dataMapInfos &&
            game.$dataMapInfos[id] &&
            game.$dataMapInfos[id].name) ||
            "Map " + id,
        );
        this.playerLabel =
          "You · X " +
          Math.floor(frame.playerX) +
          " · Y " +
          Math.floor(frame.playerY);
        this.renderStatus = !layers.background
          ? "Map background hidden"
          : this.renderMode === "radar"
            ? "Passability radar"
            : base
              ? "Live map artwork"
              : getMinimapStatus().detail || "Loading artwork; radar shown";
        if (this.message && Date.now() > this._messageUntil) this.message = "";
      }
    },
    refreshArtwork() {
      clearMinimapCache();
      if (this._scene) this._scene.invalidate();
      this.renderMap();
    },
    openDrawer(name) {
      this.drawer = this.drawer === name ? "" : name;
      if (name === "find") this.updateSearch();
    },
    focusFeature(anchor) {
      this.drawer = anchor === "floating-minimap" ? "floating" : "display";
    },
    updateSearch() {
      const frame = this._frame,
        query = this.search.toLowerCase().trim();
      const layers = readMapLayers();
      this.searchRows = frame
        ? (this._visibleEvents || [])
            .filter(
              (row) =>
                markerVisible(row, layers) &&
                (!query ||
                  (row.name + " #" + row.id).toLowerCase().includes(query)),
            )
            .slice(0, 40)
            .map((row) =>
              Object.assign({}, row, {
                mapId: this.currentMapId,
                mapRevision: this._mapGeneration,
              }),
            )
        : [];
    },
    selectEvent(row) {
      if (
        row.mapId !== this.currentMapId ||
        row.mapRevision !== this._mapGeneration
      )
        return;
      if (
        !this._game ||
        this._game.$dataMap !== this._mapIdentity ||
        this._game.$gameMap.mapId() !== row.mapId
      ) {
        this.searchRows = [];
        return;
      }
      const layers = readMapLayers(),
        frame = readMinimapFrame();
      const current =
        frame.onMap &&
        frame.events.find(
          (event) => event.id === row.id && markerVisible(event, layers),
        );
      if (!current || (this.compact && !readMinimapSettings().showEvents))
        return;
      this.selection = selectMapPoint(
        { x: current.x + 0.5, y: current.y + 0.5 },
        [current],
        layers,
        this.currentMapId,
      );
      this.follow = false;
      this._center = { x: current.x + 0.5, y: current.y + 0.5 };
      if (this.compact) {
        writeMinimapZoom(Math.max(2, this._camera ? this._camera.zoom : 1));
        writeMinimapMode("full");
      }
      this.zoom = Math.max(this.zoom, 2);
      this.drawer = "";
      this.saveView();
      this.renderMap();
    },
    point(event) {
      const rect = this.$refs.mapCanvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) * this.width) / rect.width,
        y: ((event.clientY - rect.top) * this.height) / rect.height,
      };
    },
    onCanvasMouseMove(event) {
      if (!this._camera) return;
      const p = this.point(event),
        tile = worldAtPoint(this._camera, p.x, p.y);
      this.hoverInfo = tile
        ? "X " + Math.floor(tile.x) + " · Y " + Math.floor(tile.y)
        : "";
    },
    onCanvasClick(event) {
      if (
        !this.interactionEnabled ||
        !this._camera ||
        Date.now() < this._suppressClickUntil
      )
        return;
      const p = this.point(event),
        tile = worldAtPoint(this._camera, p.x, p.y);
      if (tile)
        this.selection = selectMapPoint(
          tile,
          this._visibleEvents || [],
          readMapLayers(),
          this.currentMapId,
        );
      this.drawer = "";
    },
    teleportSelection() {
      const moved = teleportMapSelection(this._game, this.selection);
      this.message = moved
        ? "Teleported to X " + this.selection.x + ", Y " + this.selection.y
        : "Location unavailable; select a location on the current map.";
      this._messageUntil = Date.now() + 2200;
      this.renderMap();
    },
    startPan(event) {
      if (!this.interactionEnabled || !this._camera || event.button !== 0)
        return;
      if (this._stopPan) this._stopPan();
      this.$refs.mapCanvas.focus();
      const start = this._camera;
      let moved = false;
      this._stopPan = startPointerDrag(
        event,
        (dx, dy) => {
          if (Math.abs(dx) + Math.abs(dy) < 4 && !moved) return;
          if (!moved && this.compact) {
            writeMinimapMode("full");
            writeMinimapZoom(start.zoom);
          }
          moved = true;
          this.follow = false;
          const next = panCamera(start, dx, dy);
          this._center = { x: next.x, y: next.y };
          this.renderMap();
        },
        () => {
          if (moved) this._suppressClickUntil = Date.now() + 350;
          this.saveView();
        },
      );
    },
    applyCamera(next) {
      this.follow = false;
      this.zoom = next.zoom;
      this._center = { x: next.x, y: next.y };
      if (this.compact) {
        writeMinimapMode("full");
        writeMinimapZoom(next.zoom);
      }
      this.saveView();
      this.renderMap();
    },
    zoomBy(factor, point) {
      if (this._camera)
        this.applyCamera(zoomCamera(this._camera, factor, point));
    },
    wheelZoom(event) {
      if (this.interactionEnabled)
        this.zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, this.point(event));
    },
    fitMap() {
      this.zoom = 1;
      this.follow = false;
      if (this._camera)
        this._center = {
          x: this._camera.mapWidth / 2,
          y: this._camera.mapHeight / 2,
        };
      if (this.compact) {
        writeMinimapMode("full");
        writeMinimapZoom(1);
      }
      this.saveView();
      this.renderMap();
    },
    followPlayer() {
      this.follow = true;
      if (this.compact) {
        if (this._camera && readMinimapSettings().mode !== "follow") {
          const base = Math.max(
            1,
            this._camera.mapWidth / 35,
            this._camera.mapHeight / 35,
          );
          writeMinimapZoom(Math.max(1, this._camera.zoom / base));
        }
        writeMinimapMode("follow");
      } else if (this._camera)
        this.zoom = Math.max(
          this.zoom,
          this._camera.mapWidth / 25,
          this._camera.mapHeight / 25,
        );
      this.saveView();
      this.renderMap();
    },
    mapKey(event) {
      if (!this.interactionEnabled) return;
      if (event.key === "+" || event.key === "=") this.zoomBy(1.3);
      else if (event.key === "-") this.zoomBy(1 / 1.3);
      else if (event.key === "0") this.fitMap();
      else if (event.key.toLowerCase() === "f") this.followPlayer();
      else if (event.key === "Escape") {
        this.drawer = "";
        this.selection = null;
      } else if (
        this._camera &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        this.applyCamera(
          panCamera(
            this._camera,
            event.key === "ArrowLeft"
              ? 40
              : event.key === "ArrowRight"
                ? -40
                : 0,
            event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0,
          ),
        );
    },
  },
};
