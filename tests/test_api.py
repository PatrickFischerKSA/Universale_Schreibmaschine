import io,json,unittest
from unittest.mock import patch
from urllib.error import HTTPError
import server
class APITests(unittest.TestCase):
 def test_incomplete_preserves_status(self):
  result={'status':'incomplete','incomplete_details':{'reason':'max_output_tokens'},'output':[{'type':'message','content':[{'type':'output_text','text':'Teilantwort'}]}]}
  with patch('server.urlopen',return_value=io.StringIO(json.dumps(result))):
   answer=server.generate('test','model','test-key')
  self.assertEqual(answer['status'],'incomplete');self.assertEqual(answer['incomplete_reason'],'max_output_tokens')
 def test_failed_rejected(self):
  with patch('server.urlopen',return_value=io.StringIO(json.dumps({'status':'failed','output':[]}))):
   with self.assertRaisesRegex(ValueError,'nicht abgeschlossen'):server.generate('test','model','test-key')
 def test_unauthorized_does_not_echo_credentials(self):
  with patch('server.urlopen',side_effect=HTTPError('https://api.openai.com',401,'secret',{},None)):
   with self.assertRaisesRegex(ValueError,'API-Schlüssel ungültig'):server.generate('test','model','test-key')
