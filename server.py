"""Sensivo local MVP: Instagram post URL -> Apify comments -> explainable insights.

Python 3.10+. A classificação LLM local requer Pydantic 2 no llm_engine.py.

"""

import mimetypes

import json

import os

import re

import threading

import uuid

from collections import Counter

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pathlib import Path

from urllib.error import HTTPError

from urllib.request import Request, urlopen



ROOT = Path(__file__).resolve().parent

PORT = int(os.getenv('PORT', '8765'))

TOKEN = os.getenv('APIFY_TOKEN', '').strip()

JOBS = {}

LOCK = threading.Lock()

POST_RE = re.compile(
    r'^https?://(?:www\.)?instagram\.com/(?:p|reel|tv)/'
    r'([A-Za-z0-9_-]+)(?:[/?#].*)?$',
    re.I,
)

STOPWORDS = set('a o os as um uma uns umas de da do dos das e é em no na nos nas que com para por se eu você voces vocês meu minha seus suas seu sua esse essa isso isto mas como não nao sim ja já só muito mais foi ser ter tem tinha onde quando qual quais porque pq pra pro pelo pela ao aos à às ele ela eles elas nós nos me te isso aqui ali todos todo toda todas mesmo bem ainda também tambem entre depois antes sobre até ate quando quem quanto quantos queria quero gostaria faz fazer esse dessa desse deste desta uma'.split())

QUESTIONS = ('?', 'como ', 'qual ', 'quais ', 'onde ', 'quando ', 'quanto ', 'por que', 'porque ', 'alguém sabe', 'alguem sabe', 'me indica', 'pode explicar', 'how ', 'what ', 'where ', 'why ', 'can you ', 'does ', 'is it ')

BUY = ('preço','preco','valor','quanto custa','comprar','onde compra','onde vende','link','cupom','desconto','vende','tem loja','encomendar','price','buy','purchase','discount','shop')

POS = ('amei','adorei','ótimo','otimo','perfeito','maravilhoso','incrível','incrivel','lindo','excelente','top','love','amazing','great','awesome','perfect')

NEG = ('odiei','péssimo','pessimo','ruim','horrível','horrivel','decepcionado','caro demais','terrível','terrivel','hate','awful','bad','disappointed')



def clean_text(value):

    return re.sub(r'\s+', ' ', str(value or '')).strip()



def extract_comment(obj):

    if isinstance(obj, str): return clean_text(obj)

    if not isinstance(obj, dict): return ''

    for k in ('text','comment','commentText','content','body'):

        v = obj.get(k)

        if isinstance(v, str) and v.strip(): return clean_text(v)

    return ''



def analyze(items, origin='apify'):

    seen = set()
    comments = []
    records = []
    for obj in items:
        text = extract_comment(obj)
        if not text:
            continue
        username = ''
        source_id = ''
        if isinstance(obj, dict):
            username = str(obj.get('ownerUsername') or obj.get('username') or obj.get('authorUsername') or '')
            if not username:
                for field in ('owner', 'author', 'user'):
                    nested = obj.get(field)
                    if isinstance(nested, dict) and isinstance(nested.get('username'), str):
                        username = nested['username']
                        break
            source_id = str(obj.get('id') or obj.get('commentId') or '')
        identity = (source_id, username, text)
        if identity in seen:
            continue
        seen.add(identity)
        comments.append(text)
        records.append({'text': text, 'username': username, 'sourceId': source_id})

    terms=Counter()

    for c in comments:

        for w in re.findall(r"[^\W\d_]+",c.casefold(),re.U):

            if len(w)>=4 and w not in STOPWORDS: terms[w]+=1

    questions=[c for c in comments if any(x in c.casefold() for x in QUESTIONS)]

    buyer=[c for c in comments if any(x in c.casefold() for x in BUY)]

    pos=[c for c in comments if any(x in c.casefold() for x in POS)]

    neg=[c for c in comments if any(x in c.casefold() for x in NEG)]

    n=len(comments)

    top=[{'term':t,'count':v} for t,v in terms.most_common(15)]

    ideas=[]

    if questions: ideas.append({'title':'Responda às dúvidas mais frequentes','reason':f'{len(questions)} comentários com sinais de perguntas','evidence':questions[:2]})

    if buyer: ideas.append({'title':'Crie um conteúdo com informações de compra','reason':f'{len(buyer)} comentários mencionam compra, preço ou links','evidence':buyer[:2]})

    if top: ideas.append({'title':f'Explore o assunto “{top[0]["term"]}”','reason':f'A palavra aparece em {top[0]["count"]} comentários (pode incluir contextos diferentes)','evidence':[c for c in comments if top[0]['term'] in c.casefold()][:2]})

    return {'source':origin,'total':n,'questions':len(questions),'buySignals':len(buyer),'positiveKeywordMatches':len(pos),'negativeKeywordMatches':len(neg),'topWords':top,'ideas':ideas,'comments':comments[:1000], 'commentRecords':records[:1000], 'note':'Resultados baseados em regras simples e palavras-chave, não classificação por IA. Contagens podem se sobrepor; sem dedução de gênero, idade ou dados privados.'}



def worker(jobid, url, limit):

    try:

        if not TOKEN: raise ValueError('Configure APIFY_TOKEN no terminal antes de analisar o Instagram.')

        endpoint='https://api.apify.com/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items'

        body=json.dumps({'directUrls':[url], 'resultsLimit':limit}).encode()

        request=Request(endpoint,data=body,headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json','Accept':'application/json'},method='POST')

        try:

            with urlopen(request,timeout=280) as response:

                data=json.loads(response.read().decode('utf-8'))

        except HTTPError as e:

            detail=e.read(1500).decode('utf-8','replace')

            raise RuntimeError(f'Apify retornou HTTP {e.code}: {detail[:450]}')

        if not isinstance(data,list): raise RuntimeError('Apify não retornou uma lista de comentários. Confira os limites da conta e o resultado da execução no console.')

        result=analyze(data)

        result['postUrl']=url

        result['requestedLimit']=limit

        result['returnedRows']=len(data)

        result['warning']='Os comentários obtidos podem ser incompletos; resultados dependem de disponibilidade e acesso ao post.' if data else 'Nenhum comentário disponível: postagem restrita, execução vazia ou falha de coleta.'

        with LOCK: JOBS[jobid]={'status':'done','result':result}

    except (ValueError,RuntimeError,URLError,TimeoutError,Exception) as e:

        with LOCK: JOBS[jobid]={'status':'error','message':str(e)[:650]}



class Handler(BaseHTTPRequestHandler):

    def log_message(self,fmt,*args):

        print('%s - %s'%(self.address_string(),fmt%args))

    def send_json(self,obj,status=200):

        raw=json.dumps(obj,ensure_ascii=False).encode()

        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)

    def do_GET(self):

        if self.path.startswith('/assets/'):

            target=(ROOT/self.path.lstrip('/')).resolve()

            if not target.is_file() or ROOT not in target.parents: return self.send_error(404)

            raw=target.read_bytes()

            self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(str(target))[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

        elif self.path=='/' or self.path=='/index.html':

            raw=(ROOT/'index.html').read_bytes()

            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

        elif self.path == '/api/config':
            self.send_json({
                'tokenConfigured': bool(TOKEN),
                'llmProvider': 'ollama',
                'llmModel': 'qwen3:4b',
            })

        elif self.path.startswith('/api/jobs/'):

            key=self.path.split('/')[-1]

            with LOCK: data=JOBS.get(key)

            self.send_json(data or {'error':'Job não encontrado'},200 if data else 404)

        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()

        else: self.send_error(404)

    def do_POST(self):

        try:

            size=int(self.headers.get('Content-Length','0'))

            if size < 0 or size>3_000_000: return self.send_json({'error':'Arquivo grande demais para este MVP (máx. 3 MB).'},413)

            payload=json.loads(self.rfile.read(size).decode())
            if not isinstance(payload, dict):
                return self.send_json({'error': 'O corpo JSON precisa ser um objeto.'}, 400)

            if self.path=='/api/llm/classify':

                comments=payload.get('comments', [])

                if not isinstance(comments,list) or not 1 <= len(comments) <= 100:

                    return self.send_json({'error':'Selecione de 1 a 100 comentários.'},400)

                if any(not isinstance(c,str) or len(c)>2000 or not c.strip() for c in comments):

                    return self.send_json({'error':'Cada comentário precisa ter texto de 1 a 2000 caracteres.'},400)

                try:

                    from llm_engine import classify_comments

                    context = payload.get('context', '')
                    if not isinstance(context, str) or len(context) > 4000:
                        return self.send_json({'error': 'O contexto precisa ter até 4000 caracteres.'}, 400)
                    return self.send_json({'result':classify_comments(comments, context=context)})

                except ImportError:

                    return self.send_json({'error':'Confira llm_engine.py e instale Pydantic 2: python -m pip install pydantic>=2,<3'},503)

                except Exception as ex:

                    return self.send_json({'error':'Falha na classificação LLM: '+str(ex)[:220]},502)

            if self.path == '/api/llm/script':
                try:
                    from content_studio import generate_script
                    return self.send_json({'result':generate_script(payload)})
                except (ValueError, KeyError) as ex:
                    return self.send_json({'error':str(ex)[:250]},400)
                except Exception as ex:
                    return self.send_json({'error':'Falha ao gerar roteiro: '+str(ex)[:220]},502)

            if self.path == '/api/llm/recommend':
                try:
                    from llm_engine import generate_recommendations
                    rows = payload.get('classificacoes', [])
                    context = payload.get('context', '')
                    if not isinstance(rows, list) or not 1 <= len(rows) <= 100:
                        return self.send_json({'error':'Envie de 1 a 100 classificações.'}, 400)
                    if not isinstance(context, str) or len(context) > 4000:
                        return self.send_json({'error':'Contexto inválido.'}, 400)
                    return self.send_json({'result':generate_recommendations(rows, context=context)})
                except (ValueError, KeyError) as ex:
                    return self.send_json({'error':str(ex)[:250]}, 400)
                except Exception as ex:
                    return self.send_json({'error':'Falha ao gerar recomendações: '+str(ex)[:220]}, 502)

            if self.path=='/api/analyze':

                url=str(payload.get('url','')).strip().split('?')[0].rstrip('/')+'/'

                if not POST_RE.match(url): return self.send_json({'error':'Insira o link completo de um post ou Reel público do instagram.com.'},400)

                try:limit=int(payload.get('limit',100))

                except:limit=100

                limit=max(1,min(500,limit))

                jid=str(uuid.uuid4())

                with LOCK: JOBS[jid]={'status':'running'}

                threading.Thread(target=worker,args=(jid,url,limit),daemon=True).start()

                return self.send_json({'jobId':jid},202)

            if self.path=='/api/import':

                rows=payload.get('comments',[])

                if not isinstance(rows,list) or len(rows)>5000: return self.send_json({'error':'Até 5.000 comentários por importação.'},400)

                return self.send_json({'result':analyze(rows,'csv')})

            return self.send_json({'error':'Rota não encontrada'},404)

        except Exception as e: return self.send_json({'error':str(e)[:500]},400)



if __name__=='__main__':

    print(f'Sensivo aberto em http://localhost:{PORT} — Token Apify:', 'configurado' if TOKEN else 'não configurado')

    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
