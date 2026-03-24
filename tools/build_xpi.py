#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
INCLUDE_FILES = [
    "manifest.json",
    "bootstrap.js",
    "semantic-search-core.js",
    "semantic-search-settings.js",
    "semantic-search-plugin.js",
    "semantic-search-window.js",
    "semantic-search-settings-window.js",
    "semantic-search.xhtml",
    "semantic-search.css",
    "semantic-search-settings.xhtml",
    "semantic-search-preferences.xhtml",
    "semantic-search-settings.css",
    "icons/semantic-search.svg",
]


def iter_payload_files() -> list[Path]:
    files = [ROOT / relative_path for relative_path in INCLUDE_FILES]
    files.extend(sorted((ROOT / "locale").rglob("*")))
    return [path for path in files if path.is_file()]


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    addon_name = f"semantic-library-search-{version}.xpi"

    DIST.mkdir(exist_ok=True)
    target = DIST / addon_name

    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in iter_payload_files():
            archive.write(path, path.relative_to(ROOT).as_posix())

    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    print(f"Built: {target}")
    print(f"SHA256: {digest}")


if __name__ == "__main__":
    main()
