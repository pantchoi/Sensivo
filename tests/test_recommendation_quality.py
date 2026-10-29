import json
import unittest
from unittest.mock import patch
from test_backend import label
import llm_engine as engine

class QualityTests(unittest.TestCase):
    def test_duplicate_titles_and_shared_evidence(self):
        a={'titulo':'Onde encontrar coxinhas em Jaguariúna', 'evidencias_ids':[1,2]}
        b={'titulo':'Melhores coxinhas de Jaguariúna para conhecer', 'evidencias_ids':[1,2]}
        self.assertTrue(engine._similar_idea(a,b))
        c={'titulo':'Como preparar bolo de chocolate em casa','evidencias_ids':[3]}
        self.assertFalse(engine._similar_idea(a,c))

    def test_weak_evidence_is_not_a_recipe_request(self):
        by_id={1:{'texto':'A coxinha estava deliciosa!', 'assuntos':['coxinha'], 'intencoes':['elogio']}}
        recipe={'titulo':'Tutorial de receita de coxinha caseira','evidencias_ids':[1]}
        self.assertFalse(engine._has_support(recipe,by_id,''))
        unrelated={'titulo':'Guia de pedágios para motocicletas','evidencias_ids':[1]}
        self.assertFalse(engine._has_support(unrelated,by_id,''))

    def test_model_can_return_fewer_than_four(self):
        rows=[]
        for idx,text in enumerate(['Coxinha deliciosa em Jaguariúna', 'Adoro a coxinha de Jaguariúna']):
            r=label(idx);r['texto']=text;r['assuntos']=['coxinha','Jaguariúna'];rows.append(r)
        recs=[
          {'titulo':'Coxinhas deliciosas em Jaguariúna','proposta':'Conte sobre a coxinha citada pela audiência.', 'motivo':'Os comentários elogiam as coxinhas locais.', 'evidencias_ids':[0,1]},
          {'titulo':'Melhores coxinhas em Jaguariúna','proposta':'Mostre o que as pessoas gostam nas coxinhas.', 'motivo':'As falas mencionam coxinhas da região.', 'evidencias_ids':[0,1]},
          {'titulo':'Como economizar com pedágios','proposta':'Ensine rotas para não pagar pedágio.', 'motivo':'Os comentários falam de pedágios.', 'evidencias_ids':[0]},
        ]
        class Resp:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return json.dumps({'message':{'content':json.dumps({'recomendacoes':recs})}}).encode()
        with patch.object(engine,'urlopen',return_value=Resp()):
            result=engine.generate_recommendations(rows)
        self.assertEqual(len(result['recommendations']),1)
        self.assertEqual(result['rejected'],{'similar':1,'weak_evidence':1})

if __name__=='__main__':unittest.main()
