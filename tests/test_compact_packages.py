import json
from pathlib import Path
import tempfile
import unittest

from deploy.main import build_release_packages
from tools.installer import build_windows
from tools.installer.package_layout import inspect_archive
from tests.test_installer_editions import MANIFEST


class CompactPackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.runtime = self.root / "output/runtime"
        for edition in ("offline", "online"):
            directory = self.runtime / edition
            for name in ("init/import.js", "cheat-bundle.js", "cheat-bundle.css", "window.html"):
                path = directory / "cheat" / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("// compact payload")
            (directory / "cheat/dependencies.json").write_text(json.dumps(MANIFEST))
            (directory / "runtime-layout.json").write_text(json.dumps({"schema": 2, "layout": "compact", "edition": edition, "dependencySet": MANIFEST["id"]}))
            (directory / "cheat/should-not-ship.js").write_text("// stale source")
        for engine in ("mv", "mz"):
            path = self.root / f"cheat-engine/www/_cheat_initialize/{engine}/js/main.js"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// cheat/init/import.js")
        self.sentinel = self.root / "tmp/browser-smoke/sentinel.txt"
        self.sentinel.parent.mkdir(parents=True)
        self.sentinel.write_text("keep diagnostics")

    def test_four_minimal_archives_and_installer_catalog(self):
        paths = build_release_packages("1.9.4", project_root=self.root)
        self.assertEqual(len(paths), 4)
        for engine in ("mv", "mz"):
            for edition in ("offline", "online"):
                path = build_windows.get_release_archive_path(str(self.root / "output"), engine, "1.9.4", edition)
                metadata = inspect_archive(path, engine.upper(), edition)
                self.assertEqual(metadata["edition"], edition)
                import tarfile
                with tarfile.open(path) as archive:
                    self.assertFalse(any("should-not-ship" in member.name or "cheat-settings" in member.name for member in archive))
        build_windows.ensure_release_archives(str(self.root / "output"), "1.9.4")
        self.assertEqual(self.sentinel.read_text(), "keep diagnostics")

    def test_failed_build_never_removes_shared_tmp_diagnostics(self):
        (self.runtime / "online/cheat/dependencies.json").write_text("{}")
        with self.assertRaises(ValueError):
            build_release_packages("1.9.4", project_root=self.root)
        self.assertEqual(self.sentinel.read_text(), "keep diagnostics")


if __name__ == "__main__":
    unittest.main()
