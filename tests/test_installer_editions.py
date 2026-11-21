import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest import mock

from tools.installer import core, presentation

MANIFEST = json.loads((Path(__file__).parent / "fixtures/dependencies/manifest.json").read_text())


def compact_archive(directory, engine="MV", edition="offline", version="1.9.4"):
    path = Path(directory) / f"rpg-{engine.lower()}-cheat-{version}{'-online' if edition == 'online' else ''}-core.tar.gz"
    prefix = "www/" if engine == "MV" else ""
    metadata = {"version": version, "schema": 2, "layout": "compact", "engine": engine, "edition": edition, "dependencySet": MANIFEST["id"]}
    contents = {"cheat/init/import.js": "// loader", "cheat/cheat-bundle.js": "// UI",
                "cheat/cheat-bundle.css": "/* styles */", "cheat/window.html": "<!doctype html>",
                "cheat/dependencies.json": json.dumps(MANIFEST),
                "cheat-version-description.json": json.dumps(metadata),
                "js/main.js": "// cheat/init/import.js"}
    with tarfile.open(path, "w:gz") as archive:
        for name, body in contents.items():
            data = body.encode()
            info = tarfile.TarInfo(prefix + name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return path


class InstallerEditionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.game = self.root / "Game"
        self.content = self.game / "www"
        (self.content / "js").mkdir(parents=True)
        (self.content / "js/rpg_core.js").write_text("// engine")
        (self.content / "js/main.js").write_text("// original game")

    def test_selects_edition_before_version_and_preserves_metadata_override(self):
        offline = compact_archive(self.root)
        online = compact_archive(self.root, edition="online", version="2.0.0")
        selected = presentation.inspect_game(self.game, search_dirs=[self.root], edition="offline").source
        self.assertEqual(selected.path, str(offline))
        self.assertEqual(selected.edition, "offline")
        self.assertEqual(presentation.inspect_game(self.game, search_dirs=[self.root], edition="online").source.path, str(online))
        result = core.install_from_archive(self.game, offline, version="11", edition="offline")
        metadata = json.loads((self.content / "cheat-version-description.json").read_text())
        self.assertEqual(metadata["version"], "v11")
        self.assertEqual(metadata["edition"], "offline")
        self.assertEqual(metadata["dependencySet"], MANIFEST["id"])
        self.assertEqual(core.get_status(self.game)["edition"], "offline")
        core.uninstall(self.game)
        self.assertEqual((self.content / "js/main.js").read_text(), "// original game")
        self.assertFalse((self.content / "cheat").exists())

    def test_wrong_edition_and_metadata_disagreement_are_rejected(self):
        offline = compact_archive(self.root)
        with self.assertRaises(ValueError):
            core.install_from_archive(self.game, offline, edition="online")
        self.assertEqual((self.content / "js/main.js").read_text(), "// original game")
        with self.assertRaises(ValueError):
            presentation.archive_source(offline, "MZ", edition="offline")
        wrong_name = offline.with_name("rpg-mv-cheat-1.9.4-online-core.tar.gz")
        offline.rename(wrong_name)
        with self.assertRaises(ValueError):
            presentation.archive_source(wrong_name, "MV", edition="offline")

    def test_cache_failure_precedes_backups_settings_cleanup_and_replacement(self):
        archive = compact_archive(self.root, edition="online")
        (self.content / "cheat").mkdir()
        (self.content / "cheat/keep.txt").write_text("old plugin")
        (self.content / "cheat-settings").mkdir()
        (self.content / "cheat-settings/keep.json").write_text("preferences")
        with mock.patch.object(core, "prepare_dependencies", side_effect=OSError("network unavailable")):
            with self.assertRaisesRegex(OSError, "network unavailable"):
                core.install_from_archive(self.game, archive, edition="online", clean_settings=True)
        self.assertEqual((self.content / "cheat/keep.txt").read_text(), "old plugin")
        self.assertEqual((self.content / "cheat-settings/keep.json").read_text(), "preferences")
        self.assertFalse((self.content / "cheat-installer-backups").exists())
        self.assertEqual((self.content / "js/main.js").read_text(), "// original game")


if __name__ == "__main__":
    unittest.main()
