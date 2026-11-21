import test from "node:test";
import assert from "node:assert/strict";
import { rewriteDependencyCss } from "../../cheat-engine/www/cheat/js/runtime/DependencyResources.js";

test("cached CSS can reference verified fonts, not remote or unknown files", () => {
  assert.equal(
    rewriteDependencyCss('src:url("fonts/icon.woff2?v=1")', "mdi/icons.css", {
      "mdi/fonts/icon.woff2": "blob:verified-font",
    }),
    'src:url("blob:verified-font")',
  );
  assert.throws(() =>
    rewriteDependencyCss("src:url(https://evil.example/font)", "style.css", {}),
  );
  assert.throws(() =>
    rewriteDependencyCss(
      '@import "https://evil.example/style";',
      "style.css",
      {},
    ),
  );
  assert.throws(() =>
    rewriteDependencyCss("src:url(../missing.woff2)", "style.css", {}),
  );
});
