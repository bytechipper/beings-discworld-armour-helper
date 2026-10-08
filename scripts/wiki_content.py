#!/usr/bin/env python3
"""Import a local Discworld wiki backup. Not needed to build the shipped archive."""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from bs4 import BeautifulSoup, Comment, Tag
import argparse
import json
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://dwwiki.mooo.com/wiki/'
ALLOWED = {'p','div','span','h1','h2','h3','h4','h5','ul','ol','li','dl','dt','dd','b','strong','i','em','code','tt','pre','br','hr','table','thead','tbody','tr','th','td','sup','sub','a','blockquote'}

def plain(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip()

def clean_content(content):
    soup = BeautifulSoup(str(content), 'html.parser')
    for node in soup.select('script, style, iframe, object, embed, form, input, button, .toc, .navbox, .mw-editsection, .hid, .tooltiptext, .tooltip-content, .infobox'):
        node.decompose()
    for node in soup.find_all(string=lambda s: isinstance(s, Comment)):
        node.extract()
    for node in list(soup.find_all(True)):
        if node.name not in ALLOWED:
            node.unwrap()
            continue
        attrs = {}
        if node.name in ('td','th'):
            for key in ('colspan','rowspan'):
                if str(node.get(key,'')).isdigit(): attrs[key] = node[key]
        if node.name == 'a':
            href = urljoin(BASE, node.get('href',''))
            parts = urlsplit(href)
            if parts.netloc == 'dwwiki.mooo.com' and parts.path.endswith('.html'):
                href = href.replace('.html', '', 1)
            if urlsplit(href).scheme in ('https','http'):
                attrs.update(href=href, target='_blank', rel='noopener noreferrer')
        # Keep chart colors and widths; discard arbitrary CSS and positioning.
        style = node.get('style','')
        safe = []
        for prop, value in re.findall(r'([\w-]+)\s*:\s*([^;]+)',style):
            if node.name == 'td' and prop == 'background-color' and value.strip().upper() in {'#FF0000','#FF3300','#FF6600','#FF9A00','#FFCD00','#FFFF00','#CDFF00','#9AFF00','#66FF00','#33FF00','#00FF00'}: safe.append(prop+':'+value.strip())
            if prop == 'width' and re.fullmatch(r'\d+(?:\.\d+)?px',value.strip()): safe.append(prop+':'+value.strip())
        if safe: attrs['style'] = ';'.join(safe)
        node.attrs = attrs
    return ''.join(str(x) for x in soup.contents)

