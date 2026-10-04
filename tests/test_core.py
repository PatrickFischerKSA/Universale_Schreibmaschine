import unittest,sys,io,zipfile,json,tempfile,os
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from corpus import extract,segment,retrieve,representative,tokens
import server

class CorpusTests(unittest.TestCase):
 def test_text_offsets_and_no_loss(self):
  text=('Ein Kind wartet am Fenster.\n\n'*800)+'Ende.'
  units,_=extract('a.txt',text.encode());parts=segment(units,'work')
  self.assertGreater(len(parts),2)
  for p in parts:self.assertEqual(p['text'],units[0]['text'][p['start']:p['end']])
  self.assertEqual(tokens(text),tokens(' '.join(p['text'] for p in parts)))
 def test_pdf_pages(self):
  from reportlab.pdfgen.canvas import Canvas
  b=io.BytesIO();c=Canvas(b);c.drawString(40,700,'The first page has enough words to test this extraction safely.');c.showPage();c.drawString(40,700,'The second page has enough words to preserve the page reference.');c.save()
  units,w=extract('x.pdf',b.getvalue());self.assertEqual(units[1]['location'],'PDF-Seite 2');self.assertIn('second',units[1]['text'])
 def test_epub_spine(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   z.writestr('META-INF/container.xml','<container><rootfile full-path="OPS/content.opf"/></container>')
   z.writestr('OPS/content.opf','<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>')
   for k in ['a','b']:z.writestr('OPS/'+k+'.xhtml','<html><p>'+k+' Eins zwei drei vier fünf sechs sieben acht neun zehn.</p><script>SECRET</script></html>')
  units,_=extract('x.epub',b.getvalue());self.assertEqual(units[0]['location'],'EPUB-Abschnitt b');self.assertNotIn('SECRET',str(units))
 def test_retrieval_and_author_isolation(self):
  a=segment([{'location':'test','text':'Regen Regen Regen Fenster'}],'a');b=segment([{'location':'test','text':'Sonne Blumen Sommer'}],'b')
  self.assertEqual(retrieve(a+b,'Regen')[0]['work_id'],'a');self.assertEqual(retrieve(b,'Regen'),[])
 def test_prompts_feedback_and_provenance(self):
  ps=segment([{'location':'Textdatei','text':'Der Regen strich gegen das Fenster. Das Kind sah hinaus und schwieg.'}],'w')
  a={'id':'a','name':'Testautor','works':[{'title':'Werk','passages':ps}],'profiles':[{'text':'Profil mit Belegen'}],'feedback':[{'active':True,'rule':'Dialog konkret halten'},{'active':False,'rule':'IGNORIEREN'}]}
  p=server.make_prompt(a,'write',{'task':'Ein Kind im Regen','length':800})
  self.assertIn('Dialog konkret halten',p['text']);self.assertNotIn('IGNORIEREN',p['text']);self.assertIn(ps[0]['id'],p['text']);self.assertEqual(p['profile_version'],1)
 def test_api_key_missing(self):
  with self.assertRaisesRegex(ValueError,'API-Schlüssel'):server.generate('text','model','')
 def test_api_output_and_request(self):
  class Response:
   def __enter__(self):return io.StringIO(json.dumps({'status':'completed','output':[{'type':'reasoning'},{'type':'message','content':[{'type':'output_text','text':'Antwort'}]}]}))
   def __exit__(self,*args):pass
  with patch('server.urlopen',return_value=Response()) as call:
   r=server.generate('Prompt','configured-model','test-key');self.assertEqual(r['text'],'Antwort')
   request=call.call_args.args[0];body=json.loads(request.data);self.assertFalse(body['store']);self.assertEqual(body['input'],'Prompt');self.assertEqual(request.full_url,'https://api.openai.com/v1/responses')
 def test_atomic_save(self):
  with tempfile.TemporaryDirectory() as d,patch.object(server,'DATA',Path(d)):
   server.save({'version':1,'authors':[]});self.assertEqual(server.load()['authors'],[])

if __name__=='__main__':unittest.main()
