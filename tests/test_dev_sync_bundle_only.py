"""Regression tests for the dev-sync bundle-only flag."""

import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "deploy"))

from deploy import dev


def write(path, body="// fixture"):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


class BundleOnlySyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)

        # Minimal MV game.
        self.game = self.root / "Game"
        write(self.game / "www/js/rpg_core.js")
        write(
            self.game / "www/js/main.js",
            "PluginManager.loadScript('../../cheat/init/import.js');",
        )

        # Minimal cheat source tree laid out like cheat-engine/www.
        self.source_root = self.root / "cheat-engine/www"
        source_cheat = self.source_root / "cheat"
        for name in [
            "init/import.js",
            "init/setup.js",
            "init/setup.bundle.js",
            "init/customize_functions.js",
            "CheatModal.js",
            "MainComponent.js",
            "window.html",
            "js/window-init.js",
            "js/runtime/FeatureRuntime.js",
            "panels/GeneralPanel.js",
            "libs/vue.js",
            "css/main.css",
        ]:
            write(source_cheat / name)
        write(
            self.source_root / "_cheat_initialize/mv/js/main.js",
            "PluginManager.loadScript('../../cheat/init/import.js');",
        )
        write(
            self.source_root / "_cheat_initialize/mz/js/main.js",
            "// MZ bootstrap fixture",
        )

        # DevPaths derives the cheat source root from deploy/dev.py's own
        # location. Point that module location at the fixture so no real game or
        # junction is touched.
        self._real_dev_file = dev.__file__
        dev.__file__ = str(self.root / "deploy/dev.py")

    def tearDown(self):
        dev.__file__ = self._real_dev_file
        self.temp.cleanup()

    def target_cheat(self):
        return self.game / "www/cheat"

    def run_sync(self, bundle_only):
        dev.setup_dev_sync(
            str(self.game),
            version="vTEST",
            bundle_only=bundle_only,
        )

    def test_default_sync_junctions_the_source_entry(self):
        self.run_sync(bundle_only=False)
        target_cheat = self.target_cheat()
        self.assertTrue((target_cheat / "init/setup.js").exists())
        self.assertTrue((target_cheat / "init/setup.bundle.js").exists())

    def test_bundle_only_sync_excludes_source_modules(self):
        self.run_sync(bundle_only=True)
        target_cheat = self.target_cheat()

        # Gone: overlay source entry and inlined source modules.
        self.assertFalse((target_cheat / "init/setup.js").exists())
        self.assertFalse((target_cheat / "CheatModal.js").exists())
        self.assertFalse((target_cheat / "MainComponent.js").exists())
        self.assertFalse((target_cheat / "panels/GeneralPanel.js").exists())
        self.assertFalse((target_cheat / "js/runtime/FeatureRuntime.js").exists())

        # Kept: bundle, bootstrap, hook, pop-out, vendored libs/css.
        self.assertTrue((target_cheat / "init/setup.bundle.js").exists())
        self.assertTrue((target_cheat / "init/import.js").exists())
        self.assertTrue((target_cheat / "init/customize_functions.js").exists())
        self.assertTrue((target_cheat / "window.html").exists())
        self.assertTrue((target_cheat / "js/window-init.js").exists())
        self.assertTrue((target_cheat / "libs/vue.js").exists())
        self.assertTrue((target_cheat / "css/main.css").exists())

    def test_bundle_only_validate_rejects_a_tree_without_the_bundle(self):
        self.run_sync(bundle_only=True)
        (self.target_cheat() / "init/setup.bundle.js").unlink()
        with self.assertRaises(FileNotFoundError):
            dev.validate_dev_sync_install(
                dev.DevPaths(str(self.game)),
                require_source_entry=False,
            )

    def test_default_validate_requires_the_source_entry(self):
        self.run_sync(bundle_only=False)
        (self.target_cheat() / "init/setup.js").unlink()
        with self.assertRaises(FileNotFoundError):
            dev.validate_dev_sync_install(dev.DevPaths(str(self.game)))


if __name__ == "__main__":
    unittest.main()