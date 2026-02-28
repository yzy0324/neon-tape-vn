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
        "路线锁定",
        "结局A【玻璃停火】",
        "结局B【霓虹燃烧】",
        "结局C【磁带群星】",
        "Tape Archive / 存档总线",
        "schemaVersion",
        "saveTransferText",
    ]
    merged = html + "\n" + main_js + "\n" + data_js
    for token in required_strings:
        if token not in merged:
            fail(f"missing required string: {token}")
    ok("key strings present")

    scene_count = len(re.findall(r"\bs\d{2}[A-C]?\s*:\s*{", data_js))
    if scene_count < 13:
        fail(f"scene count too low: {scene_count} (expected >= 13)")
    ok(f"scene count >= 13 ({scene_count})")

    endings = len(re.findall(r"结局[A-C]【", main_js))
    if endings < 3:
        fail(f"ending markers too low: {endings} (expected >= 3)")
    ok(f"ending markers >= 3 ({endings})")

    route_finals = len(re.findall(r"s10[A-C]", data_js))
    if route_finals < 3:
        fail(f"route specific final scenes too low: {route_finals} (expected >= 3)")
    ok(f"route specific final scenes >= 3 ({route_finals})")

    keys = sorted(set(re.findall(r"neonTape_[a-zA-Z0-9_]*", merged)))
    if not keys or 'neonTape_' not in keys:
        fail("no save key markers found")
    ok(f"save key markers present ({', '.join(keys)})")

    if "data-save=\"slot1\"" not in html or "data-save=\"slot2\"" not in html or "data-save=\"slot3\"" not in html:
        fail("manual save slots < 3")
    ok("manual save slots >= 3")

    for token in ["routeLock", "choiceHistory", "AUTO_SLOT", "sceneId", "unlockedEndings", "bgmEnabled", "bgmVolume", "SAVE_SCHEMA_VERSION"]:
        if token not in main_js:
            fail(f"missing save payload key indicator: {token}")
    ok("save payload includes route and review keys")

    for token in ["data-export=\"slot1\"", "data-import=\"slot1\"", "data-export=\"auto\"", "data-import=\"auto\""]:
        if token not in html:
            fail(f"missing import/export control: {token}")
    ok("import/export controls present")

    print("\nSelf-check passed.")


if __name__ == "__main__":
    main()
