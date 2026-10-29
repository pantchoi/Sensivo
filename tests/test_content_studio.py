import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import content_studio
import server

SCRIPT={
 'titulo':'Respondendo uma dúvida muito comum',
 'gancho':'Você também ficou com essa dúvida depois do vídeo?',
 'cenas':[
  {'ordem':i,'visual':f'Mostrar o exemplo {i} na tela','fala':f'Explicação detalhada da etapa {i}.','texto_tela':f'Etapa {i}'} for i in range(1,4)
 ],
 'legenda':'Aqui está a resposta para a dúvida da comunidade.',
 'cta':'Conta nos comentários qual sua próxima dúvida.',
 'dica_plataforma':'Use texto legível e uma abertura visual clara.',
 'evidencias_ids':[0],
 'observacao':'Verifique os detalhes antes de gravar.'
}
class Response:
 def __init__(self,script):self.script=script
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def read(self):return json.dumps({'message':{'content':json.dumps(self.script)}}).encode()

PAYLOAD={'title':'Responda uma dúvida recorrente','topic':'tutorial','platform':'reels','duration':45,'tone':'natural',
         'evidence':[{'text':'Faz um tutorial, por favor!','postTitle':'Vídeo A'}]}

class StudioTests(unittest.TestCase):
 def test_generates_schema_validated_platform_script(self):
  with patch.object(content_studio,'urlopen',return_value=Response(SCRIPT)) as mock:
   result=content_studio.generate_script(PAYLOAD)
  self.assertEqual(result['platform'],'reels')
  self.assertEqual(result['script']['evidencias_ids'],[0])
  request=json.loads(mock.call_args.args[0].data)
  self.assertEqual(request['model'],'qwen3:4b')
  self.assertEqual(json.loads(request['messages'][1]['content'])['plataforma'],'reels')
  self.assertFalse(request['think'])
 def test_platform_specific_prompt(self):
  for platform in ('reels','tiktok','shorts'):
   with self.subTest(platform=platform),patch.object(content_studio,'urlopen',return_value=Response(SCRIPT)) as mock:
    content_studio.generate_script({**PAYLOAD,'platform':platform})
    user=json.loads(json.loads(mock.call_args.args[0].data)['messages'][1]['content'])
    self.assertEqual(user['plataforma'],platform)
    self.assertIn(platform,content_studio.PLATFORMS)
 def test_rejects_fabricated_evidence_and_invalid_input(self):
  with patch.object(content_studio,'urlopen',return_value=Response({**SCRIPT,'evidencias_ids':[99]})):
   with self.assertRaisesRegex(RuntimeError,'evidências inexistentes'):
    content_studio.generate_script(PAYLOAD)
  with patch.object(content_studio,'urlopen',return_value=Response({**SCRIPT,'cenas':[dict(SCRIPT['cenas'][0],ordem=2),*SCRIPT['cenas'][1:]]})):
   with self.assertRaisesRegex(RuntimeError,'sequência'):
    content_studio.generate_script(PAYLOAD)
  for bad in ({**PAYLOAD,'platform':'instagram'},{**PAYLOAD,'duration':200},{**PAYLOAD,'evidence':[]}):
   with self.assertRaises(ValueError):content_studio.generate_script(bad)
 def test_route(self):
  handler=server.Handler.__new__(server.Handler)
  handler.path='/api/llm/script'
  def call(payload):
   raw=json.dumps(payload).encode()
   handler.headers={'Content-Length':str(len(raw))}
   handler.rfile=io.BytesIO(raw)
   results=[]
   handler.send_json=lambda obj,status=200:results.append((status,obj))
   handler.do_POST()
   return results[0]
  with patch.object(content_studio,'generate_script',return_value={'script':SCRIPT}) as mock:
   self.assertEqual(call(PAYLOAD)[0],200)
   mock.assert_called_once_with(PAYLOAD)
  self.assertEqual(call({**PAYLOAD,'platform':'wrong'})[0],400)

if __name__=='__main__':unittest.main()
