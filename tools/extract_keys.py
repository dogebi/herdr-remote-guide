#!/usr/bin/env python3
"""Extract the Korean source locale from index.html into i18n/ko.json.

Walks every element carrying data-i18n (textContent) or data-i18n-html
(innerHTML), so the markup stays the single place the Korean copy is written.
Keys the DOM cannot carry (meta description, copy-button states, theme labels)
are appended from EXTRA below.
"""
import html as htmlmod
import json
import os
import re

PAGE = "index.html"
OUT = "i18n/ko.json"

EXTRA = {
    "meta.description": "패널을 나누고 원격 호스트에 접속한 뒤 에이전트가 남긴 결과를 검토합니다.",
    "ui.copied": "복사됨",
    "ui.copyFail": "복사 실패",
    "ui.theme.toDark": "다크",
    "ui.theme.toLight": "라이트",
    "ui.theme.toDarkAria": "다크 모드로 전환",
    "ui.theme.toLightAria": "라이트 모드로 전환",
}

s = open(PAGE, encoding="utf-8").read()
tag_re = re.compile(r"<(/)?([a-zA-Z][\w:-]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/)?>", re.S)
attr_re = re.compile(r'data-i18n(?:-html)?="([^"]+)"')


def inner(start, tag):
    """Inner HTML of the element that starts at `start`, by tag-depth counting."""
    depth, lower = 1, tag.lower()
    for m in tag_re.finditer(s, start):
        name, closing, selfclose = m.group(2).lower(), m.group(1), m.group(4)
        if name != lower:
            continue
        if closing:
            depth -= 1
            if depth == 0:
                return s[start:m.start()]
        elif not selfclose:
            depth += 1
    raise SystemExit(f"unclosed <{tag}> at {start}")


text_keys, html_keys = {}, {}
for m in re.finditer(r"<([a-zA-Z][\w:-]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/)?>", s):
    am = attr_re.search(m.group(2) or "")
    if not am:
        continue
    key, raw = am.group(1), inner(m.end(), m.group(1))
    if am.group(0).startswith("data-i18n-html"):
        html_keys.setdefault(key, re.sub(r"\s+", " ", raw).strip())
    else:
        plain = re.sub(r"<[^>]+>", "", raw)
        text_keys.setdefault(key, re.sub(r"\s+", " ", htmlmod.unescape(plain)).strip())

dup = set(text_keys) & set(html_keys)
if dup:
    raise SystemExit(f"same key used as text and html: {sorted(dup)}")

ko = dict(sorted(text_keys.items()))
ko.update(dict(sorted(html_keys.items())))
for k, v in EXTRA.items():
    ko.setdefault(k, v)

os.makedirs("i18n", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(ko, fh, ensure_ascii=False, indent=1)

empty = [k for k, v in ko.items() if not str(v).strip()]
print(f"{OUT}: {len(ko)} keys (text {len(text_keys)} / html {len(html_keys)} / extra {len(EXTRA)})")
print("empty values:", empty or "none")
