"""Provenance-preserving extraction and local retrieval. No model training."""
import io, re, hashlib, zipfile, posixpath, math
from collections import Counter
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

def tokens(text):
    return re.findall(r"[^\W_]+(?:[’'-][^\W_]+)*", text.lower(), re.UNICODE)

def clean(text):
    return text.replace('\r\n','\n').replace('\r','\n').replace('\x00','').replace('\u00ad','').strip()

class HTMLText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','div','br','h1','h2','h3','li'): self.parts.append('\n\n')
    def handle_endtag(self,tag):
        if tag in ('script','style') and self.skip: self.skip-=1
        if tag in ('p','div','h1','h2','h3','li'): self.parts.append('\n\n')
    def handle_data(self,data):
        if not self.skip:self.parts.append(data)

def extract(name,raw):
    ext=name.rsplit('.',1)[-1].lower(); warnings=[]; units=[]
    if ext in ('txt','md'):
        try: text=raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            text=raw.decode('cp1252');warnings.append('Als Windows-1252 gelesen. Umlaute und Sonderzeichen kontrollieren.')
        units=[{'location':'Textdatei','text':clean(text)}]
    elif ext=='pdf':
        from pypdf import PdfReader
        reader=PdfReader(io.BytesIO(raw))
        if reader.is_encrypted and not reader.decrypt(''):raise ValueError('Das PDF ist passwortgeschützt.')
        for i,page in enumerate(reader.pages):
            text=clean(page.extract_text() or '')
            units.append({'location':f'PDF-Seite {i+1}','text':text})
            if len(tokens(text))<10 and len(warnings)<20:warnings.append(f'PDF-Seite {i+1}: wenig oder kein Text erkannt; Scan oder Leerseite prüfen.')
        warnings.append('PDF-Seiten sind Dateiseiten, nicht zwingend die gedruckte Paginierung. Keine OCR; Lesereihenfolge und Trennstriche prüfen.')
    elif ext=='epub':
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            if sum(i.file_size for i in z.infolist())>120_000_000:raise ValueError('Entpacktes EPUB ist zu gross.')
            root=ET.fromstring(z.read('META-INF/container.xml'))
            opf=next(e.attrib['full-path'] for e in root.iter() if e.tag.endswith('rootfile'))
            root=ET.fromstring(z.read(opf));base=posixpath.dirname(opf)
            manifest={e.attrib['id']:e.attrib for e in root.iter() if e.tag.endswith('}item')}
            for e in root.iter():
                if not e.tag.endswith('}itemref'):continue
                ref=manifest.get(e.attrib.get('idref'),{})
                if 'html' not in ref.get('media-type',''):continue
                path=posixpath.normpath(posixpath.join(base,ref['href'].split('#')[0]))
                from urllib.parse import unquote
                parser=HTMLText();parser.feed(z.read(unquote(path)).decode('utf-8-sig'))
                text=re.sub(r'\n\s*\n+', '\n\n', ''.join(parser.parts))
                units.append({'location':'EPUB-Abschnitt '+ref.get('id',path),'text':clean(text)})
            warnings.append('EPUB-Lesereihenfolge übernommen. Kapitelüberschriften und Verlagsmaterial kontrollieren.')
    else:raise ValueError('Unterstützt werden TXT, Markdown, EPUB und PDFs mit Textebene.')
    if sum(len(tokens(u['text'])) for u in units)<10:raise ValueError('Kein brauchbarer Volltext gefunden. Bei Scans zuerst eine OCR-Textebene erstellen.')
    return units,warnings

def segment(units,work_id):
    result=[]
    for unit in units:
        text=unit['text']; matches=list(re.finditer(r'\S+',text));start=0
        while start<len(matches):
            end=min(start+550,len(matches))
            if end<len(matches):
                # Prefer paragraph endings in the last 150 words, without dropping text.
                for candidate in range(end,start+400,-1):
                    if '\n\n' in text[matches[candidate-1].end():matches[candidate].start()]:end=candidate;break
            a=matches[start].start();b=matches[end-1].end();snippet=text[a:b]
            ident=hashlib.sha256((work_id+unit['location']+str(a)).encode()).hexdigest()[:16]
            result.append({'id':ident,'work_id':work_id,'location':unit['location'],'start':a,'end':b,'text':snippet,'words':len(tokens(snippet))})
            start=end
    return result

def metrics(passages):
    text='\n\n'.join(p['text'] for p in passages);ts=tokens(text)
    sentences=[s for s in re.split(r'[.!?]+(?:\s|$)',text) if tokens(s)]
    return {'words':len(ts),'passages':len(passages),'mean_sentence':round(sum(len(tokens(s)) for s in sentences)/max(1,len(sentences)),1),'paragraphs':len([p for p in re.split(r'\n\s*\n',text) if p.strip()]),'frequent':Counter(t for t in ts if len(t)>4).most_common(12),'method':'Grobe Wort- und Satzsegmentierung; keine literarische Bewertung.'}

def retrieve(passages,query,limit=6):
    terms=set(tokens(query)); docs=[Counter(tokens(p['text'])) for p in passages];n=len(docs)
    if not n:return []
    avg=sum(sum(d.values()) for d in docs)/n
    df={t:sum(t in d for d in docs) for t in terms}
    scored=[]
    for p,d in zip(passages,docs):
        size=sum(d.values());score=0
        for t in terms:
            f=d[t]
            if f:score+=math.log(1+(n-df[t]+.5)/(df[t]+.5))*f*2.2/(f+1.2*(.25+.75*size/max(avg,1)))
        if not terms or score>0:scored.append({**p,'score':round(score,4)})
    return sorted(scored,key=lambda p:p['score'],reverse=True)[:limit]

def exclusion_reason(p):
    text=p['text'];lines=[x.strip() for x in text.splitlines() if x.strip()]
    headings=sum(bool(re.search(r'\b(kapitel|chapter|inhaltsverzeichnis|contents)\b',x,re.I)) and len(tokens(x))<=8 for x in lines)
    if re.search(r'\b(inhaltsverzeichnis|table of contents)\b',text,re.I) or (headings>=4 and headings/max(1,len(lines))>=.35):
        return 'Inhaltsverzeichnis oder Kapitelübersicht'
    if len(tokens(text))<45:return 'Sehr kurzer Text oder Titelblatt'
    if re.search(r'\b(isbn|impressum|copyright|alle rechte vorbehalten)\b',text,re.I) and len(tokens(text))<180:
        return 'Verlagsangaben'
    return ''

def representative(passages,limit=6):
    # Transparent stratified sample; never claim semantic representativeness.
    groups={}
    for p in passages:
        if not exclusion_reason(p):groups.setdefault(p['work_id'],[]).append(p)
    queues=[]
    for group in groups.values():
        count=min(limit,len(group))
        indices=[min(len(group)-1,int((i+.5)*len(group)/count)) for i in range(count)]
        queues.append([group[i] for i in indices])
    out=[]
    while len(out)<limit and any(queues):
        for q in queues:
            if q and len(out)<limit:out.append(q.pop(0))
    return out


def complete_excerpt(work, passage, limit=4000):
    """Build a sentence-bounded excerpt across source units; retain exact spans."""
    units=work.get('units') or [{'location':passage['location'],'text':passage['text']}]
    index=next((i for i,u in enumerate(units) if u['location']==passage['location']),None)
    if index is None:raise ValueError('Fundstelle des Ausschnitts nicht gefunden.')
    # At most three neighbouring pages on each side; no fabricated continuation.
    lo=max(0,index-3);hi=min(len(units),index+4);parts=[];spans=[];offset=0
    for i in range(lo,hi):
        text=units[i]['text'];spans.append((i,offset,offset+len(text)));parts.append(text);offset+=len(text)+2
    text='\n\n'.join(parts);base=next(a for i,a,b in spans if i==index)
    start0=base+(passage.get('start',0) if work.get('units') else 0)
    end0=base+(passage.get('end',len(passage['text'])) if work.get('units') else len(passage['text']))
    boundaries=[]
    abbreviations={'dr','prof','bzw','usw','z','b','u','a','d','h','mr','mrs','st','nr','abb','vgl'}
    for m in re.finditer(r'[.!?…]+[»”"’\')\]]*(?=\s|$)',text):
        prefix=text[:m.start()];word=re.search(r'([\w]+)$',prefix)
        if m.group()=='.' and word and (word[1].lower() in abbreviations or word[1].isdigit()):continue
        boundaries.append(m.end())
    before=[b for b in boundaries if b<=start0]
    start=before[-1] if before else (0 if lo==0 else next((b for b in boundaries if b>=start0),len(text)))
    while start<len(text) and text[start].isspace():start+=1
    ends=[b for b in boundaries if start<b<=start+limit]
    end=next((b for b in ends if b>=end0),ends[-1] if ends else None)
    if end is None:raise ValueError('Kein vollständiger Satz innerhalb des Ausschnittlimits gefunden. Eine andere Passage wählen.')
    sources=[{'location':units[i]['location'],'start':max(start,a)-a,'end':min(end,b)-a} for i,a,b in spans if max(start,a)<min(end,b)]
    label='; '.join(f"{v['location']} · Zeichen {v['start']}–{v['end']}" for v in sources)
    return {**passage,'text':text[start:end],'sources':sources,'location':' / '.join(v['location'] for v in sources),'source_label':label}
