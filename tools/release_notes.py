"""Validate release metadata and turn the matching public changelog into notes."""

import argparse
import json
from pathlib import Path
import re


def build_release_notes(changelog, tag, package_version):
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", tag):
        raise ValueError("Release tag must be a semantic version prefixed with v")
    version = tag[1:]
    if version != package_version:
        raise ValueError("Release tag and package.json version do not match")
    heading = re.search(r"^## " + re.escape(tag) + r"(?: - Latest)?\s*$", changelog, re.MULTILINE)
    if not heading:
        raise ValueError("The release needs a matching changelog entry")
    body = changelog[heading.end():].split("\n## ", 1)[0].strip()
    body = re.sub(r"\n?---\s*$", "", body).strip()
    if not body:
        raise ValueError("The release changelog entry is empty")
    return (
        f"## What's New in {tag}\n\n{body}\n\n---\n\n"
        "### Installation\n\n"
        f"Download `RPGMakerCheatInstaller-v{version}-windows.zip`, extract it, "
        "run `RPGMakerCheatInstaller.exe`, and select your MV/MZ game folder. "
        "Keep the bundled archives beside the EXE. Close the game before installing.\n\n"
        "Choose **Offline** (everything included) or **Online (cached)** "
        "(downloads verified dependencies once, then works offline).\n\n"
        "Manual packages:\n"
        f"- `rpg-mv-cheat-{version}-core.tar.gz` for RPG Maker MV, Offline.\n"
        f"- `rpg-mz-cheat-{version}-core.tar.gz` for RPG Maker MZ, Offline.\n"
        f"- `rpg-mv-cheat-{version}-online-core.tar.gz` for RPG Maker MV, Online.\n"
        f"- `rpg-mz-cheat-{version}-online-core.tar.gz` for RPG Maker MZ, Online.\n"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
    notes = build_release_notes((root / "docs/guide/meta/changelog.md").read_text(encoding="utf-8"), args.tag, version)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(notes, encoding="utf-8")
    print(f"Validated {args.tag}; release notes: {args.output}")


if __name__ == "__main__":
    main()
