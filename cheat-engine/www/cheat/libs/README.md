# Vendored UI libraries

Everything in this folder ships with the plugin and is loaded directly by the
RPG Maker NW.js runtime. Nothing is requested from a CDN at runtime, so the
cheat UI works offline and never waits for Google Fonts or jsDelivr.

| File                          | Upstream                            | Version  |
| ----------------------------- | ----------------------------------- | -------- |
| `vue.js`                      | `vue@2` `dist/vue.min.js`           | 2.6.14   |
| `vuetify.js`                  | `vuetify@2` `dist/vuetify.min.js`   | 2.6.3    |
| `vuetify.min.css`             | `vuetify@2` `dist/vuetify.min.css`  | 2.6.3    |
| `axios.min.js`                | `axios` (pre-existing)              | bundled  |
| `mdi/materialdesignicons.min.css` | `@mdi/font@6` (subset)          | 6.9.96   |
| `mdi/fonts/materialdesignicons-webfont.woff2` | `@mdi/font@6` (subset) | 6.9.96 |
| `roboto.css` + `fonts/*`      | `@fontsource/roboto@5` (latin, latin-ext) | 5.3.0 |

`vue.js` and `vuetify.js` keep their historical filenames, but contain the
**production** (minified, no dev warnings) builds. That is what the plugin
ships; only the sizes changed.

## Material Design Icons subset

The upstream stylesheet and font cover ~7000 icons (~700 KB). The UI only
uses a small fraction, so `mdi/` is generated with
`tools/vendor/build-mdi-subset.py`, which keeps the icons referenced by the
cheat sources plus Vuetify's own icon defaults. Adding a new `mdi-*` name to a
panel requires regenerating the subset; `tests/unit/vendor-assets.test.mjs`
fails if a referenced icon is missing from the shipped CSS.

```bash
python -m pip install fonttools brotli
curl -L -o /tmp/mdi.css https://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/css/materialdesignicons.min.css
curl -L -o /tmp/mdi.woff2 https://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/fonts/materialdesignicons-webfont.woff2
python tools/vendor/build-mdi-subset.py --mdi-css /tmp/mdi.css --mdi-font /tmp/mdi.woff2
```

## Roboto

`roboto.css` is assembled from `@fontsource/roboto@5.3.0` `{100,300,400,500,
700,900}.css`, keeping the `latin` and `latin-ext` subsets (the ranges match
upstream `unicode-range`). Other scripts fall back to the system UI font,
which is what Vuetify's default font stack (`Roboto, sans-serif`) does anyway.

## Refreshing Vue / Vuetify

```bash
curl -L -o cheat-engine/www/cheat/libs/vue.js \
  https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js
curl -L -o cheat-engine/www/cheat/libs/vuetify.js \
  https://cdn.jsdelivr.net/npm/vuetify@2.6.3/dist/vuetify.min.js
curl -L -o cheat-engine/www/cheat/libs/vuetify.min.css \
  https://cdn.jsdelivr.net/npm/vuetify@2.6.3/dist/vuetify.min.css
```

Keep the JS and CSS Vuetify versions identical; the unit test checks the
version headers and the absence of remote asset URLs.
