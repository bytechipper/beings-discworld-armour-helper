#!/usr/bin/env python3
"""Regenerate the offline catalogue from the local wiki snapshot."""
from pathlib import Path
from urllib.parse import unquote
import argparse, json, re, html
from bs4 import BeautifulSoup
from wiki_content import plain, clean_content, BASE
ROOT = Path(__file__).resolve().parent.parent

def generate(wiki):
    soup = BeautifulSoup((wiki/'Armours.html').read_text(), 'html.parser')
    tables = soup.select('#mw-content-text table')
    layers = {}
    for row in tables[1].find_all('tr'):
        c = row.find_all('td', recursive=False)
        if len(c) == 9:
            layers[plain(c[0])] = int(re.search(r'\d+', plain(c[1]))[0])
    records = []
    for row in tables[0].find_all('tr'):
        c = row.find_all('td', recursive=False)
        if len(c) != 24: continue
        for hidden in row.select('.hid'): hidden.decompose()
        title = c[0].select_one('span[title]')
        name = plain(title) if title else plain(c[0]); link = c[0].find('a')
        description = title.get('title','') if title else ''
        if not name: continue
        weight = plain(c[1]); numbers = weight.split()
        def rating(cell):
            m = re.search(r'\d+', plain(cell))
            return int(m[0]) if m else None
        pounds = float(numbers[0]) if "/" not in numbers[0] else 0
        if len(numbers)>1 and '/' in numbers[1]:
            a,b = numbers[1].split('/'); pounds += int(a)/int(b)
        elif '/' in numbers[0]:
            a,b = numbers[0].split('/'); pounds = int(a)/int(b)
        record = dict(name=name, weight=round(pounds,3), material=plain(c[3]).lower(),
            sharp=rating(c[4]), pierce=rating(c[5]), blunt=rating(c[6]),
            layers=plain(c[11]).split(), coverage=[plain(x).lower() for x in c[12:] if plain(x)],
            facts=dict(zip(['Weight (lb)','Thaums','Material','Sharp','Pierce','Blunt','Hit chance (%)','Ratio','Protection / weight','Protection / sqrt(weight)','Layer'],[plain(x) for x in c[1:12]])),
            article='', source=BASE+'Armours')
        if link:
            path = wiki/unquote(link['href'].split('#')[0])
            if path.is_file():
                page = BeautifulSoup(path.read_text(), 'html.parser')
                content = page.select_one('#mw-content-text')
                # Preserve infobox facts as well as the complete article.
                for r in content.select('.infobox tr'):
                    cells=r.find_all('td',recursive=False)
                    if len(cells)==2: record['facts'][plain(cells[0])] = plain(cells[1])
                record['article']=('<p>'+html.escape(description)+'</p>' if description else '')+clean_content(content)
                if not record['layers']:
                    record['layers']=record['facts'].get('Layer(s)','').split()
                record['source']=BASE+path.stem
        if not record['article']:
            record['article']='<p>'+name.replace('&','&amp;').replace('<','&lt;')+'</p>'
        records.append(record)
    return dict(armours=sorted(records,key=lambda r:r['name'].casefold()), layers=layers)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('wiki',type=Path); args=p.parse_args()
    data=generate(args.wiki)
    (ROOT/'ui/armours.js').write_text('window.ARMOUR_LIBRARY = '+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\n')
    print('Imported',len(data['armours']),'armours')
