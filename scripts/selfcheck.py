#!/usr/bin/env python3
"""Repository self-check for neon-tape-vn."""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MAIN_JS = ROOT / "js" / "main.js"
DATA_JS = ROOT / "js" / "data.js"
STORY_JS = ROOT / "data" / "story.js"
CHAP1_JS = ROOT / "data" / "chapters" / "chap1.js"
CHAP2_JS = ROOT / "data" / "chapters" / "chap2.js"
DRINKS_JS = ROOT / "data" / "drinks.js"
DRINK_PANEL_JS = ROOT / "js" / "drink.js"
STATE_JS = ROOT / "js" / "state.js"
AUDIO_JS = ROOT / "js" / "audio.js"
STORY_VALIDATOR = ROOT / "tools" / "validate_story.js"
BALANCE_REPORT = ROOT / "tools" / "balance_report.js"
CI_YML = ROOT / ".github" / "workflows" / "ci.yml"


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"[OK] {message}")


def main() -> None:
    for path in [INDEX, MAIN_JS, DATA_JS, STORY_JS, CHAP1_JS, CHAP2_JS, DRINKS_JS, DRINK_PANEL_JS, STATE_JS, AUDIO_JS, STORY_VALIDATOR, BALANCE_REPORT, CI_YML]:
        if not path.exists():
            fail(f"missing required file: {path.relative_to(ROOT)}")

    html = INDEX.read_text(encoding="utf-8")
    main_js = MAIN_JS.read_text(encoding="utf-8")
    data_js = DATA_JS.read_text(encoding="utf-8")
    story_js = STORY_JS.read_text(encoding="utf-8")
    chap1_js = CHAP1_JS.read_text(encoding="utf-8")
    chap2_js = CHAP2_JS.read_text(encoding="utf-8")
    drinks_js = DRINKS_JS.read_text(encoding="utf-8")
    drink_panel_js = DRINK_PANEL_JS.read_text(encoding="utf-8")
    state_js = STATE_JS.read_text(encoding="utf-8")
    audio_js = AUDIO_JS.read_text(encoding="utf-8")

    ci_yml = CI_YML.read_text(encoding="utf-8")

    merged = "\n".join([html, main_js, data_js, story_js, chap1_js, chap2_js, drinks_js, drink_panel_js, state_js, audio_js])

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
        "drink-panel",
        "orderHistory",
        "orderDrafts",
        "线索板 / 档案",
        "archivePanelBtn",
        "endingPanelBtn",
        "结局档案馆",
        "流程图（仅展示该次通关路径，点击节点进入回放模式）",
        "setFlags",
        "clearFlags",
        "addItem",
        "removeItem",
        "relAtLeast",
        "Auto",
        "Skip",
        "History",
        "showAllBtn",
        "readTextHashes",
        "dialogueHistory",
        "historyPanel",
        "routeForecast",
        "routeDiagnosisList",
        "audioUnlockBtn",
        "masterVolume",
        "ambienceVolume",
        "sfxVolume",
        "audioSettings"
    ]
    for token in required_strings:
        if token not in merged:
            fail(f"missing required string: {token}")
    ok("key strings present")

    chapter_story = "\n".join([chap1_js, chap2_js])
    scene_count = len(re.findall(r"\bs\d{2}[A-C]?\s*:\s*{", chapter_story))
    if scene_count < 12:
        fail(f"scene count too low: {scene_count} (expected >= 12)")
    ok(f"scene count >= 12 ({scene_count})")

    order_scene_count = chapter_story.count("type: 'order'")
    if order_scene_count < 3:
        fail(f"order scenes too low: {order_scene_count} (expected >= 3)")
    ok(f"order scenes >= 3 ({order_scene_count})")

    drinks_count = len(re.findall(r"id:\s*'[^']+'", drinks_js.split("export const EXTRAS", 1)[0]))
    if drinks_count < 8:
        fail(f"drinks too low: {drinks_count} (expected >= 8)")
    ok(f"drink definitions >= 8 ({drinks_count})")

    endings = len(re.findall(r"结局[A-C]【", main_js))
    if endings < 3:
        fail(f"ending markers too low: {endings} (expected >= 3)")
    ok(f"ending markers >= 3 ({endings})")

    if "renderDrinkPanel" not in main_js or "buildOrderPayload" not in drink_panel_js:
        fail("drink panel hooks missing")
    ok("drink panel hooks present")

    important_flags = ["corpDeal", "hackerTrust", "policeWarrant", "memoryTape", "barShielded", "truthLeakDraft", "ghostHandshake"]
    for flag in important_flags:
        if flag not in chapter_story and flag not in story_js:
            fail(f"missing important flag: {flag}")
    ok("important story flags present")

    conditional_branches = chapter_story.count("if: {")
    if conditional_branches < 3:
        fail(f"conditional branches too low: {conditional_branches} (expected >= 3)")
    ok(f"conditional branches >= 3 ({conditional_branches})")


    for token in ["chapter1Scenes", "chapter2Scenes", "...chapter1Scenes", "...chapter2Scenes"]:
        if token not in (story_js + chap1_js + chap2_js):
            fail(f"missing chapter merge token: {token}")
    ok("chapter split + merged loading present")

    branch_scene_count = len(re.findall(r"\bs1[1-5]\s*:\s*{", chap2_js))
    if branch_scene_count < 4:
        fail(f"side-branch scenes too low: {branch_scene_count} (expected >= 4)")
    ok(f"side-branch scenes >= 4 ({branch_scene_count})")

    for token in ["flagsAll: ['corpDeal', 'truthLeakDraft']", "relAtLeast: { name: 'hacker', val: 1 }", "setFlags: ['ghostHandshake']"]:
        if token not in chap2_js:
            fail(f"missing side-branch trigger/effect token: {token}")
    ok("side-branch trigger by flags/relations + completion flag present")

    for token in ["st.flags.ghostHandshake", "sideQuestSuffix", "灰匣注释"]:
        if token not in (chap2_js + main_js):
            fail(f"missing ending variation token: {token}")
    ok("ending text variation for side-branch present")
    for token in ["PORTRAIT_SIZE", "PORTRAIT_PALETTE", "portraits:", "neutral:", "smile:", "angry:"]:
        if token not in data_js:
            fail(f"missing portrait token: {token}")
    ok("pixel portrait palette and expression variants present")

    if "data-save=\"slot1\"" not in html or "data-save=\"slot2\"" not in html or "data-save=\"slot3\"" not in html:
        fail("manual save slots < 3")
    ok("manual save slots >= 3")

    for token in ["sceneId", "tendency", "tendencies", "flags", "inventory", "relations", "log", "bgmEnabled", "bgmVolume", "audioSettings", "orderHistory", "orderDrafts", "pathHistory", "dialogueHistory", "readTextHashes", "clearedRuns"]:
        if token not in main_js:
            fail(f"missing save payload key indicator: {token}")
    ok("save payload includes required keys")

    for token in ["normalizeEffectVector", "tendencyDelta", "终章预测：代号"]:
        if token not in main_js:
            fail(f"missing route diagnosis token: {token}")
    ok("route diagnosis + pre-ending forecast tokens present")

    balance_report_js = BALANCE_REPORT.read_text(encoding="utf-8")
    for token in ["choice balance report", "imbalance hints", "top extreme choices"]:
        if token not in balance_report_js:
            fail(f"missing balance report token: {token}")
    ok("balance report tokens present")


    for token in ["setAmbienceForScene", "playSfx", "music", "ambience", "sfx"]:
        if token not in audio_js:
            fail(f"missing audio engine token: {token}")
    ok("3-track audio engine tokens present")


    history_limit_match = re.search(r"const\s+HISTORY_PANEL_LIMIT\s*=\s*(\d+)", main_js)
    if not history_limit_match:
        fail("missing HISTORY_PANEL_LIMIT")
    history_limit = int(history_limit_match.group(1))
    if history_limit < 30:
        fail(f"history panel limit too low: {history_limit} (expected >= 30)")
    ok(f"history panel limit >= 30 ({history_limit})")

    


    for token in ["python scripts/selfcheck.py", "node tools/validate_story.js", "pull_request"]:
        if token not in ci_yml:
            fail(f"CI workflow missing token: {token}")
    ok("CI workflow includes PR + selfcheck + story validator")

    validator_result = subprocess.run(["node", str(STORY_VALIDATOR)], cwd=ROOT, capture_output=True, text=True)
    if validator_result.returncode != 0:
        fail(f"story validator failed:\n{validator_result.stdout}{validator_result.stderr}")
    ok("story validator passed")

    print("\nSelf-check passed.")


if __name__ == "__main__":
    main()
