#!/usr/bin/env python3
"""Repository self-check for neon-tape-vn."""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MAIN_JS = ROOT / "js" / "main.js"
DATA_JS = ROOT / "js" / "data.js"


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"[OK] {message}")


def main() -> None:
    for path in [INDEX, MAIN_JS, DATA_JS]:
        if not path.exists():
            fail(f"missing required file: {path.relative_to(ROOT)}")

    html = INDEX.read_text(encoding="utf-8")
    main_js = MAIN_JS.read_text(encoding="utf-8")
    data_js = DATA_JS.read_text(encoding="utf-8")

    required_strings = [
        "NEON TAPE_017",
        "剧情日志（可回看）",
        "绫濑雾音｜企业联络官",
        "烬线｜街头黑客",
        "韩铬｜义体警探",
        "结局A",
        "结局B",
        "结局C",
    ]
    merged = html + "\n" + main_js + "\n" + data_js
    for token in required_strings:
        if token not in merged:
            fail(f"missing required string: {token}")
    ok("key strings present")

    scene_count = len(re.findall(r"\bs\d{2}\s*:\s*{", data_js))
    if scene_count < 12:
        fail(f"scene count too low: {scene_count} (expected >= 12)")
    ok(f"scene count >= 12 ({scene_count})")

    choice_count = len(re.findall(r"choices\s*:\s*\[", data_js))
    if choice_count < 6:
        fail(f"key choice points too low: {choice_count} (expected >= 6)")
    ok(f"choice points >= 6 ({choice_count})")

    endings = len(re.findall(r"结局[A-C]", main_js))
    if endings < 3:
        fail(f"ending markers too low: {endings} (expected >= 3)")
    ok(f"ending markers >= 3 ({endings})")

    keys = sorted(set(re.findall(r"neonTape_[a-zA-Z0-9_]*", merged)))
    if not keys or 'neonTape_' not in keys:
        fail("no save key markers found")
    ok(f"save key markers present ({', '.join(keys)})")

    if "data-save=\"slot1\"" not in html or "data-save=\"slot2\"" not in html or "data-save=\"slot3\"" not in html:
        fail("manual save slots < 3")
    ok("manual save slots >= 3")

    print("\nSelf-check passed.")


if __name__ == "__main__":
    main()
