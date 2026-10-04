"""Integration tests against a running isolated QA instance."""
import urllib.request,json,re,base64
BASE='http://127.0.0.1:18871'
html=urllib.request.urlopen(BASE).read().decode();token=re.search(r'name="workshop-token" content="([^"]+)"',html)[1]
def call(path,data=None):
 req=urllib.request.Request(BASE+'/api/'+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','X-Workshop-Token':token})
 with urllib.request.urlopen(req) as r:return json.load(r)
backup=call('backup');a=backup['authors'][0];assert a['works'] and a['profiles'] and a['drafts'] and a['feedback']
r=call('restore',{'library':backup});assert r['count']==len(backup['authors'])
new=call('library')['authors'][-1];assert new['id']!=a['id'];assert new['works'][0]['passages'][0]['text']==a['works'][0]['passages'][0]['text']
other=call('authors',{'name':'Zweiter isolierter Testautor'})
assert call('search',{'author_id':other['id'],'query':'Regen'})['passages']==[]
raw=open('/private/tmp/schreibmaschine-beispiel.txt','rb').read()
try:call('import',{'author_id':a['id'],'filename':'duplicate.txt','content':base64.b64encode(raw).decode()})
except urllib.error.HTTPError as e:assert e.code==400
else:raise AssertionError('Duplicate accepted')
try:urllib.request.urlopen(BASE+'/api/library')
except urllib.error.HTTPError as e:assert e.code==403
else:raise AssertionError('Missing token accepted')
assert 'test-key' not in json.dumps(call('backup'))
print('PASS: backup/restore, author isolation, duplicates, local access guard, no saved API key')
