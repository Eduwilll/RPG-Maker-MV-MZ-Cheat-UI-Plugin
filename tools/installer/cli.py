import argparse
import json

from core import get_status, install_from_archive, install_from_source, uninstall


def main():
    parser = argparse.ArgumentParser(
        description="Install or restore the RPG Maker MV/MZ Cheat UI plugin."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    install_parser = subparsers.add_parser("install", help="Install the plugin")
    install_parser.add_argument("--game-path", required=True, help="Path to the game folder")
    install_parser.add_argument(
        "--source-root",
        help="Path to cheat-engine/www. Defaults to this repository source tree.",
    )
    install_parser.add_argument(
        "--archive",
        help="Path to a packaged rpg-mv-cheat or rpg-mz-cheat .tar.gz archive.",
    )
    install_parser.add_argument("--version", help="Version to write into cheat-version-description.json")
    install_parser.add_argument(
        "--clean-settings",
        action="store_true",
        help="Delete existing cheat-settings in the target game during install.",
    )

    status_parser = subparsers.add_parser("status", help="Show current install status")
    status_parser.add_argument("--game-path", required=True, help="Path to the game folder")

    uninstall_parser = subparsers.add_parser("uninstall", help="Restore the latest installer backup")
    uninstall_parser.add_argument("--game-path", required=True, help="Path to the game folder")
    uninstall_parser.add_argument("--backup-path", help="Specific backup folder to restore")

    args = parser.parse_args()

    if args.command == "install":
        if args.archive:
            result = install_from_archive(
                args.game_path,
                args.archive,
                version=args.version,
                clean_settings=args.clean_settings,
            )
        else:
            result = install_from_source(
                args.game_path,
                source_root=args.source_root,
                version=args.version,
                clean_settings=args.clean_settings,
            )

        target = result["target"]
        print("Install complete")
        print(f"Game type: {target.game_type.value}")
        print(f"Install root: {target.root_path}")
        print(f"Version: {result['version'] or 'archive default'}")
        print(f"Backup: {result['backup_path']}")
        return

    if args.command == "status":
        print(json.dumps(get_status(args.game_path), indent=2))
        return

    if args.command == "uninstall":
        result = uninstall(args.game_path, backup_path=args.backup_path)
        print("Restore complete")
        print(f"Install root: {result['target'].root_path}")
        print(f"Backup: {result['backup_path']}")


if __name__ == "__main__":
    main()
