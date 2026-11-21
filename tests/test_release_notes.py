import unittest

from tools.release_notes import build_release_notes


class ReleaseNotesTests(unittest.TestCase):
    def test_extracts_only_requested_release_and_adds_installation_assets(self):
        changelog = "# Changelog\n\n## v1.9.0 - Latest\n\n### Features\n- Interactive map.\n\n---\n\n## v1.8.0\n- Older feature.\n"
        notes = build_release_notes(changelog, "v1.9.0", "1.9.0")
        self.assertIn("Interactive map.", notes)
        self.assertNotIn("Older feature", notes)
        self.assertNotIn("Edit this section", notes)
        self.assertIn("RPGMakerCheatInstaller-v1.9.0-windows.zip", notes)
        self.assertIn("rpg-mv-cheat-1.9.0-core.tar.gz", notes)
        self.assertIn("rpg-mz-cheat-1.9.0-core.tar.gz", notes)
        self.assertIn("rpg-mv-cheat-1.9.0-online-core.tar.gz", notes)
        self.assertIn("rpg-mz-cheat-1.9.0-online-core.tar.gz", notes)

    def test_rejects_missing_empty_or_mismatched_release(self):
        for changelog, tag, package in [
            ("## v1.8.0\n- Older", "v1.9.0", "1.9.0"),
            ("## v1.9.0\n\n---\n", "v1.9.0", "1.9.0"),
            ("## v1.9.0\n- Feature", "v1.9.0", "1.8.0"),
            ("", "v1.9.0;echo bad", "1.9.0"),
        ]:
            with self.subTest(tag=tag, package=package):
                with self.assertRaises(ValueError):
                    build_release_notes(changelog, tag, package)


if __name__ == "__main__":
    unittest.main()
