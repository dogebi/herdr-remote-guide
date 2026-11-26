#!/usr/bin/env python3
"""Inline i18n/{ko,zh,ja}.json into index.html.

The page ships as one file with no runtime requests, so the dictionaries are
injected between /*I18N_START*/ and /*I18N_END*/. Validation refuses to write
when locale key sets diverge, when a value is empty, when HTML tags were
dropped, or when Hangul survives in a non-Korean locale.
"""
import json
import re
import sys

PAGE = "index.html"
LANGS = ["ko", "zh", "ja"]
START, END = "/*I18N_START*/", "/*I18N_END*/"
HANGUL = re.compile(r"[\uac00-\ud7a3]")
TAG = re.compile(r"<[^>]+>")


def load(lang):
    with open(f"i18n/{lang}.json", encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    dicts = {lang: load(lang) for lang in LANGS}
    base = dicts["ko"]
    errors = []

    for lang in LANGS[1:]:
        other = dicts[lang]
        missing = sorted(set(base) - set(other))
        extra = sorted(set(other) - set(base))
        if missing or extra:
            errors.append(f"{lang}: missing={missing[:6]} extra={extra[:6]}")

    for lang, d in dicts.items():
        for key, value in d.items():
            if not str(value).strip():
                errors.append(f"{lang}.{key}: empty")
            base_tags = len(TAG.findall(str(base.get(key, ""))))
            if len(TAG.findall(str(value))) != base_tags:
                errors.append(f"{lang}.{key}: html tag count {len(TAG.findall(str(value)))} != {base_tags}")
            if lang != "ko" and HANGUL.search(str(value)):
                errors.append(f"{lang}.{key}: Hangul residue")

    if errors:
        print("i18n validation failed:")
        for line in errors[:20]:
            print("  -", line)
        return 1

    html = open(PAGE, encoding="utf-8").read()
    if START not in html or END not in html:
        print(f"markers {START} … {END} not found in {PAGE}")
        return 1

    payload = json.dumps(dicts, ensure_ascii=False, separators=(",", ":"))
    head, rest = html.split(START, 1)
    _, tail = rest.split(END, 1)
    out = f"{head}{START}{payload}{END}{tail}"
    open(PAGE, "w", encoding="utf-8").write(out)

    size = len(payload.encode("utf-8"))
    print(f"injected {len(dicts)} locales, {len(base)} keys each, {size / 1024:.1f} KB of JSON")
    print(f"{PAGE}: {len(html) / 1024:.1f} KB -> {len(out) / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
