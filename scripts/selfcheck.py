#!/usr/bin/env python3
"""Basic repository self-check for neon-tape-vn."""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"[OK] {message}")


def main() -> None:
    if not INDEX.exists():
        fail("index.html not found")

    html = INDEX.read_text(encoding="utf-8")

    required_strings = [
        "neonTape_",
        "const scenes = [",
        "renderScene",
        "结局A",
        "结局B",
        "结局C",
    ]
    for token in required_strings:
        if token not in html:
            fail(f"missing required string: {token}")
    ok("key strings present")

    scene_block = re.search(r"const scenes\s*=\s*\[(.*?)\];", html, flags=re.S)
    if not scene_block:
        fail("cannot locate scenes block")

    scene_count = len(re.findall(r"title\s*:", scene_block.group(1)))
    if scene_count < 3:
        fail(f"scene count too low: {scene_count} (expected >= 3)")
    ok(f"scene count >= 3 ({scene_count})")

    ending_count = len(re.findall(r"结局[A-Z]", html))
    if ending_count < 3:
        fail(f"ending markers too low: {ending_count} (expected >= 3)")
    ok(f"ending markers >= 3 ({ending_count})")

    save_keys = re.findall(r"neonTape_[a-zA-Z0-9_]+", html)
    if not save_keys:
        fail("no save key markers found")
    ok(f"save key markers present ({', '.join(sorted(set(save_keys)))})")

    print("\nSelf-check passed.")


if __name__ == "__main__":
    main()
