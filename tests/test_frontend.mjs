import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {parseFile, normalizeRecords, normalizeComments, recoverAuthors, classify, summarize} from '../assets/analysis.js';
import {icon as I} from '../assets/icons.js';
import {commentMarkup, intentNames, labelChip} from '../assets/conversation.js';
import {buildIntelligence, evidenceFor} from '../assets/intelligence.js';
import {buildRadar, radarView, briefingText} from '../assets/radar.js';
import {studioView, scriptText} from '../assets/content-studio.js';
import {insightsView, recommendationsView, opportunitiesView} from '../assets/intelligence-view.js';

const records=parseFile('\uFEFFownerUsername;text\nana;"Oi; tudo bem?"\nbia;"Oi; tudo bem?"\nana;"Linha 1\nLinha 2"','arquivo.csv');
assert.equal(records.length,3);
assert.equal(records[0].username,'ana');
assert.equal(records[1].username,'bia');
assert.equal(records[2].text,'Linha 1\nLinha 2');
assert.equal(normalizeRecords([{text:'Olá',owner:{username:'real.user'}}])[0].username,'real.user');
assert.equal(normalizeRecords([{text:'Olá',username:'ana'},{text:'Olá',username:'bia'}]).length,2);
assert.throws(()=>parseFile('username,text\nana,"incompleto','a.csv'),/aspas/);
assert.throws(()=>parseFile('username,likes\nana,10','a.csv'),/coluna/);
assert.equal(parseFile('Um comentário\nOutro comentário','a.txt')[0].username,'');
assert.equal(parseFile('[{"text":"Oi","ownerUsername":"user"}]','a.json')[0].username,'user');
const post={id:'x',title:'Teste',date:'Hoje',comments:['KKKK sou eu','Faz parte 2'],commentMeta:[{username:'ana'},{}],context:''};
const recovered=recoverAuthors({comments:['Oi','Outra'],commentMeta:[{},{}]},[{text:'Outra',ownerUsername:'bia'},{text:'Oi',ownerUsername:'ana'}]);
assert.deepEqual(recovered.meta.map(x=>x.username),['ana','bia']);
assert.equal(recovered.updated,2);
assert.throws(()=>recoverAuthors({comments:['Não existe']},[{text:'Oi',username:'ana'}]),/Nenhum/);
const label={id:0,texto:post.comments[0],sentimento:'neutro',intencoes:['humor','identificacao'],justificativa:'Ri e se reconhece.',depende_contexto:false};
const html=commentMarkup(post,post.comments[0],0,label);
assert(html.includes('@ana')&&html.includes('audience-quote')&&html.includes('ai-reading'));
assert(html.includes('Humor')&&html.includes('Identificação'));
assert(commentMarkup(post,post.comments[1],1).includes('Autor não informado'));
const escaped=commentMarkup({commentMeta:[{username:'<img src=x onerror=1>'}]},'<script>alert(1)</script>',0,{...label,justificativa:'<iframe>'});
assert(!escaped.includes('<script>')&&!escaped.includes('<iframe>')&&!escaped.includes('<img src=x'));
const state=new Map();const nodes={'#app':{innerHTML:'',addEventListener(){}},'#main':{innerHTML:''}};
const sandbox={I,insightsView,recommendationsView,opportunitiesView,buildRadar,radarView,briefingText,studioView,scriptText,parseFile,normalizeRecords,normalizeComments,recoverAuthors,classify,summarize,commentMarkup,intentNames,labelChip,crypto:webcrypto,localStorage:{getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v)},document:{querySelector:k=>nodes[k]||null},setTimeout,clearTimeout,window:{scrollTo(){}}};
vm.createContext(sandbox);
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
vm.runInContext(app,sandbox);
assert(nodes['#main'].innerHTML.includes('Olá, Rick.'));
assert(nodes['#main'].innerHTML.includes('CRIE ROTEIROS PARA'));
assert(nodes['#main'].innerHTML.includes('Instagram'));
assert(nodes['#main'].innerHTML.includes('TikTok'));
assert(nodes['#main'].innerHTML.includes('YouTube'));
assert(nodes['#main'].innerHTML.includes('social-marquee-track'));
for (const name of ['instagram','tiktok','youtube']) {
  assert(nodes['#main'].innerHTML.includes(`./assets/logos/${name}-wordmark.png`));
  assert(fs.readFileSync(new URL(`../assets/logos/${name}-wordmark.png`,import.meta.url)).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
}
assert(!nodes['#main'].innerHTML.includes('<svg viewBox='));
assert.equal((nodes['#main'].innerHTML.match(/class="social-marquee-group"/g)||[]).length,8);
assert.equal((nodes['#main'].innerHTML.match(/class="social-marquee-group" aria-hidden="true"/g)||[]).length,7);
assert(nodes['#app'].innerHTML.includes('Biblioteca'));
assert(nodes['#app'].innerHTML.includes('Nova análise'));
assert(!nodes['#app'].innerHTML.includes('>Relatórios</button>'));
vm.runInContext("page='posts';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('backup-library'));
assert(nodes['#main'].innerHTML.includes('restore-library'));
vm.runInContext("page='home';renderMain();",sandbox);

sandbox.postFixture=post;sandbox.labelFixture=label;
vm.runInContext("posts=[postFixture];selected='x';page='detail';detailTab='ai';posts[0].ai={total:1,schema_version:3,intencoes:{humor:1},assuntos:{},classificacoes:[labelFixture]};renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Análise concluída'));
assert(nodes['#main'].innerHTML.includes('Validar resultados'));
assert(nodes['#main'].innerHTML.includes('Explorar todas as categorias e assuntos'));
assert(nodes['#main'].innerHTML.includes('ai-clean-facts'));
assert(nodes['#main'].innerHTML.includes('Adequada'));
assert(nodes['#main'].innerHTML.includes('Incorreta'));
assert(nodes['#main'].innerHTML.includes('Exportar relatório'));
vm.runInContext("detailTab='insights';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('data-insight="topics"'));
vm.runInContext("detailTab='ideas';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('data-idea="opportunities"'));
vm.runInContext("detailTab='ai';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Recuperar autores'));
vm.runInContext("posts[0].aiError='Ollama indisponível';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Resultados de uma análise anterior'));
assert(nodes['#main'].innerHTML.includes('Ollama indisponível'));
vm.runInContext("posts[0].aiError='';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('@ana'));
vm.runInContext("aiFilter='pergunta';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Nenhuma classificação corresponde'));
vm.runInContext("detailTab='comments';filter='humor';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('1 comentário(s) exibido(s)'));
assert.equal(classify('Amei, mas ficou ruim').sentiment,'misto');
const fixture={schema_version:3,classificacoes:[
 {id:0,texto:'KKK sou eu',sentimento:'positivo',intencoes:['humor','identificacao'],depende_contexto:false,justificativa:'Ri e se reconhece.'},
 {id:1,texto:'Faz parte 2',sentimento:'neutro',intencoes:['pedido_conteudo'],depende_contexto:false,justificativa:'Solicita continuação.'},
 {id:2,texto:'Onde está o tutorial?',sentimento:'neutro',intencoes:['pergunta'],depende_contexto:true,justificativa:'Pergunta sobre tutorial.'}
 ],assuntos:{tutorial:1}};
const computed=buildIntelligence(fixture);
assert.equal(computed.total,3);
assert.equal(computed.uncertain,1);
assert.equal(computed.categories.find(c=>c.key==='pedido_conteudo').count,1);
assert.equal(computed.sentiment.neutro,2);
assert.equal(evidenceFor(fixture,[1,99])[0].text,'Faz parte 2');
const samplePost={...post,comments:fixture.classificacoes.map(r=>r.texto),ai:fixture};
assert(insightsView(samplePost).includes('Sentimento da comunidade'));
assert(insightsView(samplePost).includes('intel-segmented-bar'));
assert(insightsView(samplePost).includes('Explorar assuntos mencionados'));
assert(recommendationsView(samplePost).includes('Descobrir ideias'));
assert(opportunitiesView(samplePost).includes('Sinais que podem virar conteúdo'));
vm.runInContext("posts=[postFixture];posts[0].ai=fixtureFromTest;selected='x';detailTab='insights';renderMain();",Object.assign(sandbox,{fixtureFromTest:fixture}));
assert(nodes['#main'].innerHTML.includes('Sentimento da comunidade'));
vm.runInContext("detailTab='ideas';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Descobrir ideias'));
vm.runInContext("detailTab='opportunities';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Sinais que podem virar conteúdo'));
console.log('PASS: inteligência, recomendações, oportunidades, parser, autoria, texto multilinha, escape HTML, renderização, filtros e compatibilidade.');
// v5.4: deletion is available in recent posts and library; removal persists.
vm.runInContext("posts=[{id:'delete-me',title:'Post temporário',date:'Hoje',comments:['Olá']},{id:'keep-me',title:'Manter',date:'Hoje',comments:['Teste']}];page='home';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('data-delete-post="delete-me"'));
assert(nodes['#main'].innerHTML.includes('data-delete-post="keep-me"'));
vm.runInContext("page='posts';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('data-delete-post="delete-me"'));
sandbox.document.createElement=()=>({className:'',setAttribute(){},remove(){},textContent:''});
sandbox.document.body={appendChild(){}};
assert.equal(vm.runInContext("deletePostById('delete-me')",sandbox),true);
assert.equal(JSON.parse(state.get('sensivo_studio_premium_v1')).length,1);
assert.equal(JSON.parse(state.get('sensivo_studio_premium_v1'))[0].id,'keep-me');
assert.equal(vm.runInContext("deletePostById('not-found')",sandbox),false);
console.log('PASS: exclusão individual preserva as outras publicações.');

// Radar: cross-publication evidence, no double count and no untrusted HTML injection.
const radarPosts=[
 {id:'p1',title:'Vídeo A',comments:['Faz um tutorial!'],commentMeta:[{username:'ana'}],ai:{classificacoes:[{id:0,texto:'Faz um tutorial!',intencoes:['pedido_conteudo','pergunta'],assuntos:['tutorial','tutorial']}] }},
 {id:'p2',title:'Vídeo B',comments:['Mostra tutorial <script>alert(1)</script>'],commentMeta:[{username:'bia'}],ai:{classificacoes:[{id:0,texto:'Mostra tutorial <script>alert(1)</script>',intencoes:['pedido_conteudo'],assuntos:['tutorial']}]}}
];
const radar=buildRadar(radarPosts);
assert.equal(radar.analyzed,2);
assert.equal(radar.classified,2);
const request=radar.opportunities.find(o=>o.id==='pedido_conteudo::tutorial');
assert.equal(request.count,2);
assert.equal(request.postCount,2);
assert.equal(request.evidence.length,2);
assert(briefingText(request).includes('Vídeo A'));
const rendered=radarView(radar,request.id,[]);
assert(rendered.includes('Sensivo') || rendered.includes('SENSIVO'));
assert(rendered.includes('data-radar-plan'));
assert(!rendered.includes('<script>alert(1)</script>'));
assert(radarView(buildRadar([]),null,[]).includes('Seu Radar começa'));
vm.runInContext("posts=radarFixture;page='radar';radarSelection=null;renderMain();",Object.assign(sandbox,{radarFixture:radarPosts}));
assert(nodes['#main'].innerHTML.includes('Oportunidades identificadas'));
vm.runInContext("page='home';renderMain();",sandbox);
assert(nodes['#main'].innerHTML.includes('Explorar Radar'));
console.log('PASS: Sensivo Radar — recorrência entre publicações, evidências, briefing e renderização.');

const studio=studioView(request,{platform:'tiktok',duration:30,tone:'divertido'});
assert(studio.includes('AI CONTENT STUDIO'));
assert(studio.includes('data-studio-platform="tiktok"'));
assert(studio.includes('studio-generate'));
const draft={platform:'reels',duration:45,script:{titulo:'Teste',gancho:'Comece aqui',cenas:[{ordem:1,visual:'Câmera',fala:'Olá',texto_tela:'Texto'}],legenda:'Legenda',cta:'Comente',dica_plataforma:'Texto claro',observacao:'Revisar',evidencias_ids:[0]}};
assert(scriptText(draft).includes('Instagram Reels'));
assert(!studioView(request,undefined,{...draft,script:{...draft.script,titulo:'<img src=x onerror=1>'}}).includes('<img'));
assert(radarView(radar,request.id,[],{settings:{platform:'reels',duration:45,tone:'natural'}}).includes('AI CONTENT STUDIO'));
console.log('PASS: AI Content Studio — plataformas, roteiro e proteção HTML.');
