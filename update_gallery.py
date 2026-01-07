import html
import json
import os
import re
import sys
from pathlib import Path


def slugify(s: str) -> str:
    out: list[str] = []
    last_dash = False
    for ch in str(s).lower():
        if ch.isalnum():
            out.append(ch)
            last_dash = False
        else:
            if not last_dash:
                out.append("-")
                last_dash = True
    slug = "".join(out).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "item"


def ymd_to_iso(ymd: str) -> str:
    if len(ymd) == 8 and ymd.isdigit():
        return f"{ymd[0:4]}-{ymd[4:6]}-{ymd[6:8]}"
    return "1970-01-01"


REPLACEMENTS: list[tuple[str, str]] = [
    ("银发蓝眼仙女", "Silver-Haired Blue-Eyed Fairy"),
    ("银发蓝眼男子", "Silver-Haired Blue-Eyed Man"),
    ("白发蓝眼战士", "White-Haired Blue-Eyed Warrior"),
    ("白发蓝眼动作", "White-Haired Blue-Eyed Action"),
    ("好莱坞白发蓝眼", "Hollywood White Hair, Blue Eyes"),
    ("银发精灵召唤仪式", "Silver-Haired Elf Summoning Ritual"),
    ("龙与决斗者", "Dragon and Duelist"),
    ("闪电中的骑士", "Knight in Lightning"),
    ("骑士与巨龙", "Knight and Great Dragon"),
    ("三头龙与闪电", "Three-Headed Dragon and Lightning"),
    ("闪电中的三头龙", "Three-Headed Dragon in Lightning"),
    ("闪电背景巨龙", "Dragon in Lightning Backdrop"),
    ("巨龙护卫少女", "Great Dragon Protecting a Girl"),
    ("银龙闪电背景", "Silver Dragon with Lightning Backdrop"),
    ("银龙星空咆哮", "Silver Dragon Roaring Under Stars"),
    ("银甲龙咆哮", "Armored Silver Dragon Roar"),
    ("银色龙之守护", "Silver Dragon Guardian"),
    ("银色巨龙降临", "Arrival of the Silver Great Dragon"),
    ("好莱坞龙之怒", "Hollywood Dragon's Wrath"),
    ("好莱坞龙之觉醒", "Hollywood Dragon Awakening"),
    ("好莱坞龙之崛起", "Hollywood Dragon Rising"),
    ("好莱坞龙之威", "Hollywood Dragon's Might"),
    ("好莱坞龙之霸气", "Hollywood Dragon Dominance"),
    ("好莱坞金属龙", "Hollywood Metal Dragon"),
    ("好莱坞金属飞龙", "Hollywood Metal Wyvern"),
    ("好莱坞梦幻巨龙", "Hollywood Dreamlike Great Dragon"),
    ("好莱坞科幻飞龙", "Hollywood Sci-Fi Wyvern"),
    ("好莱坞科幻巨龙", "Hollywood Sci-Fi Great Dragon"),
    ("好莱坞科幻场景", "Hollywood Sci-Fi Scene"),
    ("好莱坞星空洞穴", "Hollywood Starry Cave"),
    ("好莱坞拍摄场景", "Hollywood Live-Action Set"),
    ("好莱坞风格重现", "Hollywood Style Reenactment"),
    ("好莱坞风格拍摄", "Hollywood Style Shooting"),
    ("好莱坞风格银龙", "Hollywood Style Silver Dragon"),
    ("好莱坞风格幻想龙", "Hollywood Style Fantasy Dragon"),
    ("好莱坞风格巨龙", "Hollywood Style Great Dragon"),
    ("好莱坞风格龙形", "Hollywood Style Dragon Form"),
    ("好莱坞风格龙", "Hollywood Style Dragon"),
    ("好莱坞质感龙角色", "Hollywood Dragon Character Study"),
    ("好莱坞奇幻龙", "Hollywood Fantasy Dragon"),
    ("好莱坞奇幻生物", "Hollywood Fantasy Creature"),
    ("好莱坞场景重构", "Hollywood Scene Rebuild"),
    ("好莱坞风石碑", "Hollywood Stone Monolith"),
    ("好莱坞式真实再现", "Hollywood Realistic Reenactment"),
    ("好莱坞式真实场景", "Hollywood Real-World Scene"),
    ("好莱坞真实拍摄", "Hollywood Live-Action Shot"),
    ("真实好莱坞拍摄", "Real Hollywood Shooting"),
    ("好莱坞奇幻巨龙", "Hollywood Fantasy Dragon"),
    ("好莱坞巨龙对峙", "Epic Dragon Standoff"),
    ("好莱坞巨龙场景", "Hollywood Dragon Setpiece"),
    ("好莱坞英雄对决", "Hollywood Hero Duel"),
    ("好莱坞幻想场景", "Hollywood Fantasy Set"),
    ("好莱坞动作场景", "Hollywood Action Scene"),
    ("动作电影场景", "Action Movie Scene"),
    ("好莱坞风格特效", "Hollywood VFX Showcase"),
    ("好莱坞风格怪物", "Hollywood Creature Feature"),
    ("好莱坞风格龙景", "Hollywood Dragon Vista"),
    ("好莱坞风格龙舞", "Dragon Dance"),
    ("好莱坞风格角色", "Hollywood Character Study"),
    ("武术战士火焰力量", "Martial Warrior: Flame Power"),
    ("武术动作场景", "Martial Arts Action"),
    ("火焰武士对决", "Flame Warrior Duel"),
    ("勇者与火焰巨龙", "Hero vs. Flame Dragon"),
    ("神秘女性与龙", "Mystery Woman and Dragon"),
    ("冰龙喷射寒冰", "Ice Dragon Breath"),
]

TOKENS: list[tuple[str, str]] = [
    ("银发蓝眼", "Silver-Haired Blue-Eyed"),
    ("白发蓝眼", "White-Haired Blue-Eyed"),
    ("蓝眼", "Blue-Eyed"),
    ("银发", "Silver-Haired"),
    ("白发", "White-Haired"),
    ("精灵", "Elf"),
    ("仙女", "Fairy"),
    ("男子", "Man"),
    ("少女", "Girl"),
    ("骑士", "Knight"),
    ("决斗者", "Duelist"),
    ("三头龙", "Three-Headed Dragon"),
    ("银龙", "Silver Dragon"),
    ("银色", "Silver"),
    ("银甲", "Silver Armored"),
    ("金属", "Metal"),
    ("闪电", "Lightning"),
    ("喷火", "Fire Breath"),
    ("咆哮", "Roar"),
    ("守护", "Guardian"),
    ("降临", "Arrival"),
    ("觉醒", "Awakening"),
    ("崛起", "Rise"),
    ("之怒", "Wrath"),
    ("之威", "Might"),
    ("霸气", "Dominance"),
    ("星空", "Starry"),
    ("洞穴", "Cave"),
    ("石碑", "Monolith"),
    ("黄金之梦", "Golden Dream"),
    ("梦幻", "Dreamlike"),
    ("重构", "Rebuild"),
    ("科幻", "Sci-Fi"),
    ("飞龙", "Wyvern"),
    ("巨龙", "Great Dragon"),
    ("亚洲女战士", "Asian Female Warrior"),
    ("女战士", "Female Warrior"),
    ("好莱坞风格", "Hollywood Style"),
    ("好莱坞风", "Hollywood Style"),
    ("武器掌握者", "Weapon Wielder"),
    ("武器持握", "Weapon Grip"),
    ("持武器", "Holding Weapon"),
    ("好莱坞", "Hollywood"),
    ("风格", "Style"),
    ("风", "Style"),
    ("转换", "Transform"),
    ("肖像", "Portrait"),
    ("亚洲", "Asian"),
    ("奇幻", "Fantasy"),
    ("幻想", "Fantasy"),
    ("角色", "Character"),
    ("武器", "Weapon"),
    ("持握", "Grip"),
    ("掌握", "Mastery"),
    ("掌握者", "Wielder"),
    ("持", "Holding"),
    ("巨龙", "Great Dragon"),
    ("冰龙", "Ice Dragon"),
    ("火焰", "Flame"),
    ("寒冰", "Frost"),
    ("喷射", "Breath"),
    ("武术", "Martial Arts"),
    ("武士", "Warrior"),
    ("战士", "Warrior"),
    ("勇者", "Hero"),
    ("对决", "Duel"),
    ("对峙", "Standoff"),
    ("怪物", "Creature"),
    ("特效", "VFX"),
    ("场景", "Scene"),
    ("神秘", "Mystery"),
    ("女性", "Woman"),
    ("女", "Woman"),
    ("龙", "Dragon"),
]


def title_case(s: str) -> str:
    parts = [p for p in re.split(r"\s+", s.strip()) if p]
    words: list[str] = []
    last = ""
    for p in parts:
        w = p[:1].upper() + p[1:].lower()
        if last and w.lower() == last.lower():
            continue
        words.append(w)
        last = w
    return " ".join(words)


def english_title_from_prompt(prompt: str, hm: str) -> str:
    raw = (prompt or "").strip()
    if not raw:
        return f"Frame {hm}" if hm else "Frame"
    for k, v in REPLACEMENTS:
        if k in raw:
            return v
    built = raw
    for k, v in TOKENS:
        built = built.replace(k, f" {v} ")
    built = built.replace("的", " ")
    built = re.sub(r"[_\-]+", " ", built)
    built = re.sub(r"[\u4e00-\u9fff]+", " ", built)
    built = re.sub(r"[^A-Za-z0-9 ]+", " ", built)
    built = re.sub(r"\s+", " ", built).strip()
    if re.search(r"[A-Za-z]", built):
        return title_case(built)
    return f"Frame {hm}" if hm else "Frame"


def build_article(category: str, entry_title: str, prompt: str) -> str:
    safe_category = html.escape(category or "")
    safe_title = html.escape(entry_title or "")
    safe_prompt = html.escape(english_title_from_prompt(prompt, ""))
    return (
        f"<h3>Concept</h3>"
        f"<p><strong>{safe_category}</strong> is curated as grouped variations from a single title prompt. "
        f"Each set explores mood, camera, and lighting while keeping the core idea consistent.</p>"
        f"<h3>Visual Direction</h3>"
        f"<p>This entry focuses on <strong>{safe_title}</strong>. The prompt cue is: <em>{safe_prompt}</em>. "
        f"Variations prioritize readable silhouettes, controlled highlights, and cinematic depth.</p>"
        f"<h3>Narrative</h3>"
        f"<p>Viewed together, the sequence reads like a short montage: setup, impact, and aftermath without locking "
        f"into one literal storyline.</p>"
    )


def same_dir(a: Path, b: Path) -> bool:
    try:
        return a.samefile(b)
    except Exception:
        return os.path.normcase(str(a.resolve())) == os.path.normcase(str(b.resolve()))


def main(argv: list[str]) -> int:
    root = Path.cwd().resolve()
    gallery_path = root / "gallery.json"
    if not gallery_path.exists():
        print("gallery.json not found", file=sys.stderr)
        return 1

    folders = [Path(x).expanduser().resolve() for x in argv[1:] if str(x).strip()]
    if not folders:
        return 0

    with gallery_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items")
    if not isinstance(items, list):
        print("gallery.json: items missing or not list", file=sys.stderr)
        return 1

    id_set = {str(it.get("id")) for it in items if it.get("id")}

    assets_dir = (root / "assets").resolve()
    img_ext = {".png", ".jpg", ".jpeg", ".webp"}
    rx = re.compile(
        r"(?P<ymd>\d{8})_(?P<hm>\d{4})_(?P<prompt>.*?)_remix_.*\.(png|jpg|jpeg|webp)$",
        re.IGNORECASE,
    )

    summary: list[tuple[str, int, int]] = []

    for folder_path in folders:
        if not folder_path.exists() or not folder_path.is_dir():
            print(f"Folder not found: {folder_path}", file=sys.stderr)
            return 1

        if not same_dir(folder_path.parent, assets_dir):
            print(f"Folder must be under assets: {assets_dir}", file=sys.stderr)
            return 1

        category = folder_path.name
        items = [it for it in items if it.get("category") != category]

        files = [p for p in folder_path.iterdir() if p.is_file() and p.suffix.lower() in img_ext]
        files.sort(key=lambda p: p.name)

        groups: dict[tuple[str, str, str], list[Path]] = {}
        for p in files:
            m = rx.match(p.name)
            if m:
                key = (m.group("ymd"), m.group("hm"), m.group("prompt"))
            else:
                key = ("00000000", "0000", p.stem)
            groups.setdefault(key, []).append(p)

        keys = sorted(groups.keys())
        added = 0
        prefix = slugify(category)

        for idx, (ymd, hm, prompt) in enumerate(keys, start=1):
            group_files = groups[(ymd, hm, prompt)]
            rels = [str(Path("assets") / category / p.name).replace("\\", "/") for p in group_files]
            rels = sorted(rels)
            if not rels:
                continue

            seq = f"{idx:03d}"
            base_id = slugify(f"{prefix}-{ymd}-{hm}-{seq}")
            final_id = base_id
            n = 2
            while final_id in id_set:
                final_id = f"{base_id}-{n}"
                n += 1
            id_set.add(final_id)

            title_part = english_title_from_prompt(prompt, hm)
            entry_title = f"{category}: {title_part}"

            items.append(
                {
                    "id": final_id,
                    "title": entry_title,
                    "category": category,
                    "date": ymd_to_iso(ymd),
                    "src": rels[0],
                    "thumb": rels[0],
                    "images": rels,
                    "article": build_article(category, title_part, prompt),
                }
            )
            added += 1

        summary.append((category, added, len(files)))

    items.sort(key=lambda it: (str(it.get("date", "")), str(it.get("title", ""))), reverse=True)
    data["items"] = items

    with gallery_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("Updated gallery.json")
    for cat, groups_added, file_count in summary:
        print(f"{cat}: {groups_added} groups, {file_count} images")
    print("Total items:", len(items))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
