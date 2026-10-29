import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import llm_engine as engine
import server


def label(index):
    return dict(id=index, sentimento='neutro', intencoes=['humor'],
                assuntos=['cotidiano'], sinal_compra=False, perguntas=[],
                depende_contexto=False, justificativa='Reage com risada.')


class Response:
    def __init__(self, rows):
        self.rows = rows
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self):
        return json.dumps({'message': {'content': json.dumps({'comentarios': self.rows})}}).encode()


class BackendTests(unittest.TestCase):
    def test_batches_and_context(self):
        calls = []
        def respond(request, timeout):
            body = json.loads(request.data)
            payload = json.loads(body['messages'][1]['content'])
            self.assertEqual(payload['contexto_post'], 'Meme de trabalho')
            self.assertFalse(body['think'])
            self.assertEqual(request.full_url, 'http://127.0.0.1:11434/api/chat')
            calls.append(payload)
            return Response([label(row['id']) for row in reversed(payload['comentarios'])])
        with patch.object(engine, 'urlopen', respond):
            result = engine.classify_comments(['KKK', 'Haha', 'Sou eu'], context='Meme de trabalho')
        self.assertEqual(len(calls), 2)
        self.assertEqual([row['id'] for row in result['classificacoes']], [0, 1, 2])
        self.assertEqual(result['classificacoes'][2]['texto'], 'Sou eu')
        self.assertEqual(result['intencoes'], {'humor': 3})
        self.assertEqual(result['schema_version'], 3)

    def test_rejects_invalid_model_output(self):
        invalid = [
            [label(0), label(0)],
            [label(0)],
            [{**label(0), 'sentimento': 'inventado'}, label(1)],
        ]
        for rows in invalid:
            with self.subTest(rows=rows), patch.object(engine, 'urlopen', return_value=Response(rows)):
                with self.assertRaises(RuntimeError):
                    engine.classify_batch(['a', 'b'])

    def test_normalizes_derived_purchase_flag_without_aborting(self):
        rows = [
            {**label(0), 'intencoes': ['pergunta', 'interesse_compra'], 'sinal_compra': False,
             'justificativa': 'Busca uma forma de comprar.'},
            {**label(1), 'sinal_compra': True,
             'justificativa': 'Elogia o vídeo, mas não há menção a interesse em compra.'},
        ]
        with patch.object(engine, 'urlopen', return_value=Response(rows)):
            result = engine.classify_comments(['Onde comprar?', 'Amei o vídeo'])
        a, b = result['classificacoes']
        self.assertTrue(a['sinal_compra'])
        self.assertFalse(b['sinal_compra'])
        self.assertEqual(result['normalizacoes_comerciais'], 2)
        self.assertEqual(b['justificativa'], 'Elogia o vídeo.')

    def test_api_validation_and_context(self):
        handler = server.Handler.__new__(server.Handler)
        handler.path = '/api/llm/classify'
        def call(payload):
            body = json.dumps(payload).encode()
            handler.headers = {'Content-Length': str(len(body))}
            handler.rfile = io.BytesIO(body)
            result = []
            handler.send_json = lambda obj, status=200: result.append((status, obj))
            handler.do_POST()
            return result[0]
        with patch.object(engine, 'classify_comments', return_value={'total': 1}) as classifier:
            self.assertEqual(call({'comments': ['Oi'], 'context': 'Meme'})[0], 200)
            classifier.assert_called_once_with(['Oi'], context='Meme')
        self.assertEqual(call({'comments': []})[0], 400)
        self.assertEqual(call({'comments': ['Oi'], 'context': 'x' * 4001})[0], 400)
        self.assertEqual(call([])[0], 400)

    def test_recommendations_grounded_in_existing_ids(self):
        row = label(0)
        row['texto'] = 'Faz uma parte 2!'
        rec = {'titulo':'Uma continuação com novos exemplos',
               'proposta':'Produza uma parte 2 com outros exemplos do tema.',
               'motivo':'O comentário pede explicitamente uma continuação.',
               'evidencias_ids':[0]}
        class RecommendationResponse:
            def __enter__(self): return self
            def __exit__(self, *args): return None
            def read(self):
                return json.dumps({'message':{'content':json.dumps({'recomendacoes':[rec]})}}).encode()
        with patch.object(engine, 'urlopen', return_value=RecommendationResponse()) as mocked:
            result = engine.generate_recommendations([row], context='Vídeo educativo')
        self.assertEqual(result['recommendations'][0]['evidencias_ids'], [0])
        body = json.loads(mocked.call_args.args[0].data)
        self.assertEqual(body['model'], 'qwen3:4b')
        self.assertFalse(body['think'])
        rec['evidencias_ids'] = [99]
        with patch.object(engine, 'urlopen', return_value=RecommendationResponse()):
            with self.assertRaisesRegex(RuntimeError, 'não foram fornecidos'):
                engine.generate_recommendations([row])

    def test_recommendations_api_validation(self):
        handler = server.Handler.__new__(server.Handler)
        handler.path = '/api/llm/recommend'
        def call(payload):
            body = json.dumps(payload).encode()
            handler.headers = {'Content-Length':str(len(body))}
            handler.rfile = io.BytesIO(body)
            result=[]
            handler.send_json = lambda obj,status=200:result.append((status,obj))
            handler.do_POST()
            return result[0]
        with patch.object(engine, 'generate_recommendations',return_value={'recommendations':[]}) as gen:
            self.assertEqual(call({'classificacoes':[label(0)],'context':'meme'})[0],200)
            gen.assert_called_once()
        self.assertEqual(call({'classificacoes':[]})[0],400)
        self.assertEqual(call({'classificacoes':[label(0)],'context':'x'*4001})[0],400)

    def test_collection_preserves_authors(self):
        result = server.analyze([
            {'text': 'Igual', 'ownerUsername': 'ana'},
            {'text': 'Igual', 'owner': {'username': 'bia'}},
        ])
        self.assertEqual(result['total'], 2)
        self.assertEqual([r['username'] for r in result['commentRecords']], ['ana', 'bia'])
        self.assertEqual(result['comments'], ['Igual', 'Igual'])


if __name__ == '__main__':
    unittest.main()
