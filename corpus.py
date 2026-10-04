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

def representative(passages,limit=6):
    # Round-robin over works, evenly spread within each work.
    groups={}
    for p in passages:groups.setdefault(p['work_id'],[]).append(p)
    queues=[]
    for group in groups.values():
        indices=list(dict.fromkeys([0,len(group)//2,len(group)-1]+list(range(len(group)))))
        queues.append([group[i] for i in indices])
    out=[]
    while len(out)<limit and any(queues):
        for q in queues:
            if q and len(out)<limit:out.append(q.pop(0))
    return out
