import {commentMarkup, intentNames, labelChip} from './conversation.js';
import {insightsView, recommendationsView, opportunitiesView} from './intelligence-view.js';
import {icon as I} from './icons.js';
import {buildRadar, radarView, briefingText} from './radar.js';
import {scriptText} from './content-studio.js';

import {parseFile,normalizeComments,normalizeRecords,recoverAuthors,summarize,classify} from './analysis.js';

const STORE='sensivo_studio_premium_v1';
const PROFILE_STORE='sensivo_profile_name_v1';
const RADAR_STORE='sensivo_radar_planning_v1';
function readRadarPlan(){try{const ids=JSON.parse(localStorage.getItem(RADAR_STORE)||'[]');return Array.isArray(ids)?ids.filter(id=>typeof id==='string').slice(0,100):[]}catch{return []}}
let radarSaved=readRadarPlan(),radarSelection=null;
let studioSettings={platform:'reels',duration:45,tone:'natural'},studioResult=null,studioError='',studioBusy=false;
function readProfileName(){
  try { return (localStorage.getItem(PROFILE_STORE)||'Rick').trim().slice(0,32)||'Rick'; }
  catch { return 'Rick'; }
}
let profileName=readProfileName();
const initials=()=>profileName.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toLocaleUpperCase('pt-BR')||'').join('');


const app=document.querySelector('#app');

let posts=load(),page='home',selected=null,detailTab='comments',insightSection='insights',ideaSection='ideas',reviewExpanded=false,search='',filter='all',busy=false,stage=0,file=null,toastTimer=null,jobTimer=null,aiSearch='',aiFilter='all',progressLabel='Analisando sua audiência';

const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function load(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v.filter(p=>Array.isArray(p.comments)):[]}catch{return []}}

function persist(){try{localStorage.setItem(STORE,JSON.stringify(posts));return true}catch{notify('Armazenamento local cheio. O post está disponível nesta sessão.');return false}}

function notify(m){const old=document.querySelector('.toast');if(old)old.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=m;document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),4700)}

const nav=[['home','grid','Visão geral'],['posts','layers','Biblioteca'],['analyze','plus','Nova análise']];

function navBtn(n,cls){return `<button type="button" class="${cls} ${page===n[0]?'active':''}" data-page="${n[0]}" title="${n[2]}" aria-label="${n[2]}" aria-current="${page===n[0]?'page':'false'}">${cls==='rail-btn'?I(n[1]):cls==='mobile-btn'?I(n[1])+`<span>${n[2]}</span>`:esc(n[2])}</button>`}

function frame(){app.innerHTML=`<div class="app"><aside class="rail"><div class="brand-symbol">${I('activity',25)}</div><div class="rail-items">${nav.map(n=>navBtn(n,'rail-btn')).join('')}</div></aside><div class="shell"><header class="header"><div class="brand">sensivo<i>.</i></div><nav class="topnav" aria-label="Navegação principal">${nav.map(n=>navBtn(n,'topnav-btn')).join('')}</nav><div class="header-right"><button type="button" class="avatar profile-trigger" id="edit-profile" aria-label="Editar seu nome" title="Editar nome">${esc(initials())}</button></div></header><main class="main" id="main"></main><footer class="footnote">SENSIVO STUDIO · Análises exploratórias baseadas nos comentários disponíveis. Dados individuais e conclusões demográficas não são inferidos.</footer></div><nav class="mobile-nav" aria-label="Navegação móvel">${nav.map(n=>navBtn(n,'mobile-btn')).join('')}</nav></div>${busy?progressMarkup():''}`;renderMain()}

function title(kicker,title,sub,cta=''){return `<div class="hero"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${sub}</p></div>${cta}</div>`}

function stat(label,num,ico,featured=false){return `<article class="card stat ${featured?'featured':''}"><span class="stat-icon">${I(ico,20)}</span><div><strong>${num.toLocaleString('pt-BR')}</strong><span>${label}</span></div></article>`}

function totals(){const c=posts.flatMap(p=>p.comments);const s=summarize(c);return {posts:posts.length,...s}}

function cover(p){return `<div class="cover alt${p.id.charCodeAt(0)%3}">${p.cover?`<img src="${esc(p.cover)}" alt="Capa da publicação"/>`:`<span class="symbol">S</span>`}<span class="tag">${p.url?'Instagram':'Arquivo importado'}</span></div>`}

function postCard(p){return `<article class="post-card post-card-manage"><button type="button" class="post-card-open" data-post="${esc(p.id)}" aria-label="Abrir publicação ${esc(p.title)}">${cover(p)}<div class="post-info"><h3>${esc(p.title)}</h3><p>${esc(p.date)} · Análise de comentários</p><div class="post-foot"><span class="post-count">${p.comments.length} comentários</span>${I('arrow',18)}</div></div></button><button type="button" class="post-delete" data-delete-post="${esc(p.id)}" aria-label="Excluir publicação ${esc(p.title)}" title="Excluir publicação">${I('trash',17)}</button></article>`}

function deletePostById(id){
  const index=posts.findIndex(p=>p.id===id);
  if(index<0)return false;
  const original=posts;
  posts=posts.filter(p=>p.id!==id);
  try{localStorage.setItem(STORE,JSON.stringify(posts));}
  catch{posts=original;notify('Não foi possível salvar a exclusão. Tente novamente.');return false;}
  if(selected===id){selected=null;page='posts';}
  frame();notify('Publicação excluída da biblioteca.');return true;
}
function requestPostDeletion(id){
  const post=posts.find(p=>p.id===id);
  if(!post||document.querySelector('#delete-post-dialog'))return;
  const dialog=document.createElement('dialog');dialog.id='delete-post-dialog';dialog.className='delete-post-dialog';
  dialog.innerHTML=`<div class="delete-dialog-content"><div class="delete-dialog-icon">${I('trash',21)}</div><h2>Excluir esta publicação?</h2><p>Você está prestes a excluir <strong>${esc(post.title)}</strong> e seus ${post.comments.length} comentários, classificações e ideias salvas.</p><p class="delete-dialog-warning">Essa ação não pode ser desfeita. As outras publicações serão mantidas.</p><div class="delete-dialog-actions"><button type="button" class="btn pale" id="cancel-post-deletion">Cancelar</button><button type="button" class="btn danger" id="confirm-post-deletion">Excluir publicação</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('#cancel-post-deletion').addEventListener('click',()=>dialog.close());
  dialog.querySelector('#confirm-post-deletion').addEventListener('click',()=>{dialog.close();deletePostById(id)});
  dialog.showModal();dialog.querySelector('#cancel-post-deletion').focus();
}


function empty(){return `<div class="empty"><div class="empty-icon">${I('layers',29)}</div><h3>Sua biblioteca começa aqui</h3><p>Importe comentários ou analise uma publicação para criar seu primeiro painel de inteligência.</p><button class="btn" data-page="analyze">${I('plus',17)} Adicionar primeiro post</button></div>`}

// Roteiros oferecidos no AI Content Studio — não significa integração de coleta automática.
// Carrossel contínuo, sem controles manuais ou preferências salvas.
function socialPlatformMarquee(){
  const platforms=[
    ['instagram-wordmark.png','Instagram Reels'],
    ['tiktok-wordmark.png','TikTok'],
    ['youtube-wordmark.png','YouTube Shorts']
  ];
  const items=platforms.map(([file,label])=>`<span class="social-platform-item"><img class="social-wordmark" src="./assets/logos/${file}" alt="${label}" decoding="async"></span>`).join('');
  // Oito grupos idênticos: o deslocamento de 1/8 do trilho coincide exatamente com a largura de um grupo.
  const groups=Array.from({length:8},(_,i)=>`<div class="social-marquee-group"${i?' aria-hidden="true"':''}>${items}</div>`).join('');
  return `<section class="social-platforms" aria-label="Plataformas para criação de roteiros">
    <div class="social-platforms-heading"><span class="social-platforms-line"></span><span>CRIE ROTEIROS PARA</span><span class="social-platforms-line"></span></div>
    <div class="social-marquee is-animated"><div class="social-marquee-track">${groups}</div></div>
  </section>`;
}

function home(){const s=totals();return title('Bem-vindo ao Sensivo',`Olá, ${esc(profileName)}.`, 'Sua audiência tem muito a dizer. Descubra o que importa e transforme conversas em novas ideias.',`<div class="hero-actions"><button type="button" id="edit-profile-home" class="edit-name-link" aria-label="Editar seu nome">${I('edit',14)} Editar nome</button><button class="btn copper" data-page="analyze">${I('plus')} Nova análise</button></div>`)+socialPlatformMarquee()+`<section class="stats">${stat('Publicações analisadas',s.posts,'layers')}${stat('Comentários organizados',s.total,'message')}${stat('Perguntas · regras',s.questions,'target')}${stat('Reações positivas · regras',s.positiveCount,'sparkle',true)}</section><section class="section-title"><h2>Publicações recentes</h2><button class="btn pale small" data-page="posts">Ver biblioteca ${I('arrow',15)}</button></section>${posts.length?`<section class="grid">${posts.slice(0,3).map(postCard).join('')}</section>`:empty()}<section class="radar-home-card"><div><span class="eyebrow">SENSIVO RADAR</span><h2>Sua próxima ideia já está nos comentários.</h2><p>Descubra oportunidades recorrentes entre suas publicações e crie um briefing com evidências.</p></div><button class="btn copper" data-page="radar">${I('target',17)} Explorar Radar</button></section>`}

function radarPage(){return radarView(buildRadar(posts),radarSelection,radarSaved,{settings:studioSettings,result:studioResult,error:studioError})}
function library(){return title('Sua biblioteca','Cada post, uma história.','Seus conteúdos analisados, organizados e sempre acessíveis.',`<button class="btn copper" data-page="analyze">${I('plus')} Adicionar publicação</button>`)+`<div class="library-tools"><button class="btn outline small" id="backup-library">${I('download',15)} Backup da biblioteca</button><label class="btn pale small" for="restore-library">${I('upload',15)} Restaurar backup</label><input id="restore-library" type="file" accept=".json,application/json" hidden></div>`+(posts.length?`<section class="grid">${posts.map(postCard).join('')}</section>`:empty())}

function analyzePage(){return title('Nova análise','Ouça o que importa.','Importe um arquivo ou cole um link para começar a entender sua audiência.')+`<div class="bottom-grid" style="grid-template-columns:1fr 1fr;align-items:start"><section class="card"><div class="card-head"><h2>${I('upload',19)} Importar comentários</h2><span class="chip">Sem custo</span></div><form class="import-form" id="csv-form"><div class="field"><label for="csv">Arquivo CSV, TXT ou JSON</label><input class="file-input" id="csv" type="file" accept=".csv,.txt,.json,text/csv,application/json" required/><div class="smalltxt muted" id="csv-selected">Suporta coluna text, comment, comentário e arquivos da Apify.</div></div><div id="csv-feedback" aria-live="polite"></div><button type="submit" class="btn copper" id="import-button">${I('sparkle')} Analisar arquivo ${I('arrow',16)}</button></form></section><section class="card"><div class="card-head"><h2>${I('link',19)} Instagram</h2><span class="chip warm">Apify</span></div><form class="import-form" id="url-form"><div class="field"><label for="url">Link do post ou Reel público</label><input class="input" id="url" type="url" placeholder="https://www.instagram.com/reel/..." required/></div><div class="field"><label for="limit">Máximo de comentários solicitados</label><select id="limit"><option value="20">20 comentários</option><option value="50">50 comentários</option><option value="100">100 comentários</option><option value="200">200 comentários</option></select></div><div id="url-feedback" aria-live="polite"></div><button class="btn" type="submit">${I('search')} Analisar publicação ${I('arrow',16)}</button></form><p class="smalltxt muted">A coleta exige servidor Python e token Apify. Pode consumir créditos e falhar em posts restritos.</p></section></div>`}

function chosen(){return posts.find(p=>p.id===selected)||null}

function details(){const p=chosen();if(!p){page='posts';return library()}const s=summarize(p.comments);const tabs=[['comments','Comentários'],['insights','Insights'],['ideas','Ideias'],['ai','Inteligência IA']];return `<button class="back" data-page="posts">${I('back',17)} Voltar à biblioteca</button><article class="card detail-top">${cover(p)}<div><div class="eyebrow">Publicação selecionada</div><h2>${esc(p.title)}</h2><p class="smalltxt muted">${p.comments.length} comentários · ${esc(p.date)} ${p.url?`· <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--sea)">Abrir publicação ${I('external',13)}</a>`:''}</p><div class="detail-actions"><label class="btn pale small" for="cover-file">${I('image',15)} Adicionar capa</label><input id="cover-file" accept="image/png,image/jpeg,image/webp" type="file" hidden/>${p.commentMeta?.some(m=>!m?.username)||!p.commentMeta?`<label class="btn outline small" for="authors-file">${I('users',15)} Recuperar autores</label><input id="authors-file" type="file" accept=".csv,.json,text/csv,application/json" hidden/>`:''}<button class="btn outline small" id="export-report">${I('download',15)} Exportar relatório</button></div></div></article><section class="stats" style="margin-top:20px">${stat('Comentários',s.total,'message')}${stat('Perguntas',s.questions,'target')}</section><nav class="tabs" aria-label="Ferramentas do post">${tabs.map(t=>`<button type="button" class="tab ${detailTab===t[0]?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</nav><div id="details-content">${detailContent(p,s)}</div>`}

function detailContent(p,s){
  if(detailTab==='ai')return aiPanel(p);
  if(detailTab==='insights')return `<div class="section-switch" role="group" aria-label="Explorar insights"><button class="${insightSection==='insights'?'active':''}" data-insight="insights">Panorama</button><button class="${insightSection==='topics'?'active':''}" data-insight="topics">Tópicos</button></div>`+(insightSection==='topics'?topicsView(s):insightsView(p));
  if(detailTab==='ideas')return `<div class="section-switch" role="group" aria-label="Explorar ideias"><button class="${ideaSection==='ideas'?'active':''}" data-idea="ideas">Recomendações</button><button class="${ideaSection==='opportunities'?'active':''}" data-idea="opportunities">Oportunidades</button></div>`+(ideaSection==='opportunities'?opportunitiesView(p):recommendationsView(p));
  if(detailTab==='opportunities')return opportunitiesView(p);
  if(detailTab==='comments'){
    const rows=p.comments.map((text,id)=>({text,id,label:p.ai?.classificacoes?.find(r=>r.id===id)})).filter(({text,id,label})=>{
      const c=classify(text);
      const match=!search||text.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))||(p.commentMeta?.[id]?.username||'').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
      return match&&(filter==='all'||(filter==='questions'&&(label?label.intencoes.includes('pergunta'):c.question))||(filter==='positive'&&(label?label.sentimento==='positivo':c.sentiment==='positivo'))||(filter==='humor'&&label?.intencoes.includes('humor'))||(filter==='pedido_conteudo'&&label?.intencoes.includes('pedido_conteudo')));
    });
    return `<div class="conversation-heading"><div><div class="eyebrow">Vozes da comunidade</div><h2>Uma conversa por vez.</h2></div><span class="chip gray">${p.ai?'Com leitura da IA':'Classificação por regras'}</span></div>
      <div class="filter-row"><input class="input" type="search" placeholder="Buscar texto ou username…" id="comment-search" value="${esc(search)}" aria-label="Pesquisar comentários"/>
      ${[['all','Todos'],['questions','Perguntas'],['positive','Positivos'],...(p.ai?[['humor','Humor'],['pedido_conteudo','Pedidos de conteúdo']]:[])].map(([v,t])=>`<button class="tab ${filter===v?'active':''}" data-filter="${v}">${t}</button>`).join('')}</div>
      <div class="smalltxt muted result-count">${rows.length} comentário(s) exibido(s). Autores aparecem apenas quando informados pela fonte.</div>
      <div class="comments">${rows.map(({text,id,label})=>commentMarkup(p,text,id,label)).join('')||'<div class="notice info">Nenhum comentário corresponde aos filtros.</div>'}</div>`;
  }
if(detailTab==='topics')return topicsView(s);


return '<div class="notice info">Ferramenta indisponível.</div>';
}

function topicsView(s){return `<section class="card"><div class="card-head"><h2>Termos mais recorrentes</h2><span class="chip">Frequência de palavras</span></div>${s.terms.length?s.terms.map(([word,count])=>`<div class="barrow"><strong>${esc(word)}</strong><div class="bar"><div style="width:${100*count/s.terms[0][1]}%"></div></div><span>${count}</span></div>`).join(''):'<p class="muted">Poucos dados disponíveis.</p>'}</section>`;}

function aiPanel(p){
  const a=p.ai;
  const isOld=Boolean(a && a.schema_version!==3);
  const rows=(a?.classificacoes||[]).filter(r=>(!aiSearch||(r.texto||'').toLocaleLowerCase('pt-BR').includes(aiSearch.toLocaleLowerCase('pt-BR'))||(p.commentMeta?.[r.id]?.username||'').toLocaleLowerCase('pt-BR').includes(aiSearch.toLocaleLowerCase('pt-BR')))&&(aiFilter==='all'||(r.intencoes||[]).includes(aiFilter)));
  const available=[...new Set((a?.classificacoes||[]).flatMap(r=>r.intencoes||[]))];
  const classifiedAt=p.aiAt?new Date(p.aiAt).toLocaleString('pt-BR'):'';
  return `<section class="card ai-panel"><div class="ai-panel-heading"><div><div class="eyebrow">Audience intelligence</div><h2>Entenda a conversa por inteiro.</h2><p class="smalltxt muted">Humor, perguntas, relatos e pedidos. Uma leitura que acompanha o tema do seu conteúdo.</p></div><span class="local-indicator">${I('activity',14)} IA local</span></div>
    <details class="context-editor" ${p.context?'open':''}><summary>${I('book',16)} Contexto do post <span>Opcional</span></summary><label for="post-context">Legenda ou breve descrição do que acontece no conteúdo</label><textarea id="post-context" maxlength="4000" rows="3" placeholder="Ex.: meme sobre chegar atrasado ao trabalho; o vídeo mostra uma pessoa correndo para pegar o ônibus.">${esc(p.context||'')}</textarea><p class="smalltxt muted">O modelo recebe este texto e os comentários. Ele não assiste ao vídeo nem vê a imagem.</p></details>
    <div class="ai-action-row"><button class="btn copper" id="run-llm">${I('sparkle')} ${a?'Analisar novamente':'Analisar conversas'}</button><p class="smalltxt muted">Até 100 comentários · modelo local · sem chamada à OpenAI</p></div><div id="ai-feedback" aria-live="polite">${p.aiError?`<div class="notice error" role="alert">${I('info',15)} ${esc(p.aiError)}. ${a?'Os resultados anteriores continuam visíveis abaixo.':''}</div>`:''}</div>
    ${a?`<div class="analysis-status ${p.aiError||isOld?'analysis-outdated':''}" role="status">${I(p.aiError||isOld?'info':'check',17)} <div><strong>${p.aiError||isOld?'Resultados de uma análise anterior':'Análise concluída'}</strong><span>${a.total} comentários classificados${classifiedAt?' · '+esc(classifiedAt):''}. ${p.aiError?'A tentativa mais recente falhou.':isOld?'Reanalise para usar a versão atual.':'Revise interpretações ambíguas.'}</span></div></div>${isOld?'<div class="notice info">As justificativas antigas ainda podem mencionar compras em posts não comerciais. Clique em Analisar novamente para atualizar.</div>':''}
      <div class="ai-clean-overview">
        <div class="ai-clean-facts"><div><strong>${a.total}</strong><span>Comentários analisados</span></div><div><strong>${a.intencoes?.pergunta||0}</strong><span>Perguntas</span></div><div><strong>${a.intencoes?.pedido_conteudo||0}</strong><span>Pedidos de conteúdo</span></div></div>
        <div class="ai-clean-category"><div class="intel-clean-heading"><h3>Como a audiência interage</h3><span>Até 3 categorias em destaque</span></div>
        <div class="category-counts">${Object.entries(a.intencoes||{}).sort((x,y)=>y[1]-x[1]).slice(0,3).map(([k,v])=>`<span class="category-count">${labelChip(k)}<strong>${v}</strong></span>`).join('')||'<span class="smalltxt muted">Nenhuma categoria identificada.</span>'}</div>
        </div>
        <details class="intel-more ai-extra-insights"><summary>Explorar todas as categorias e assuntos</summary>
          <h3>Todas as interações</h3><div class="category-counts">${Object.entries(a.intencoes||{}).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`<span class="category-count">${labelChip(k)}<strong>${v}</strong></span>`).join('')}</div>
          <h3>Assuntos mencionados</h3><div class="ai-tags">${Object.entries(a.assuntos||{}).slice(0,12).map(([k,v])=>`<span class="topic-tag">${esc(k)} <b>${v}</b></span>`).join('')||'<span class="smalltxt muted">Sem assuntos explícitos suficientes.</span>'}</div>
          ${a.normalizacoes_comerciais?`<p class="smalltxt muted">Nota técnica: ${a.normalizacoes_comerciais} indicador(es) comercial(is) harmonizado(s) pela classificação.</p>`:''}
        </details>
      </div>
      <div class="conversation-heading"><div><div class="eyebrow">Texto original + interpretação</div><h3>Classificações e evidências</h3></div></div>
      <div class="ai-filter-row"><input class="input" id="ai-search" type="search" placeholder="Buscar comentário ou username…" aria-label="Buscar classificações" value="${esc(aiSearch)}"/><select id="ai-filter" aria-label="Filtrar tipo de interação"><option value="all">Todas as interações</option>${available.map(v=>`<option value="${esc(v)}" ${aiFilter===v?'selected':''}>${esc(intentNames[v]||v)}</option>`).join('')}</select></div>
      <div class="smalltxt muted result-count">${rows.length} de ${a.total} comentários · etiquetas indicam sentimento e tipo de interação</div>
      <div class="comments">${rows.map(r=>commentMarkup(p,r.texto,r.id,r)).join('')||'<div class="notice info">Nenhuma classificação corresponde aos filtros.</div>'}</div>${reviewPanel(p)}<p class="smalltxt muted ai-disclaimer">${esc(a.disclaimer||'Interpretações automáticas sujeitas a revisão humana.')}</p></div>`:'<div class="ai-empty"><span class="empty-icon">'+I('message',25)+'</span><h3>Cada comentário tem um contexto.</h3><p>Inicie a análise para explorar sentimentos, tipos de interação e temas da comunidade.</p></div>'}</section>`;
}

async function runLLM(){const p=chosen();if(!p||busy)return;const contextInput=document.getElementById('post-context');if(contextInput){p.context=contextInput.value;persist()}showProgress('Análise com Sensivo Intelligence');try{await yieldPaint();progressStep(1);const resp=await apiJson('/api/llm/classify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({comments:p.comments.slice(0,100),context:p.context||''})});progressStep(3);p.ai=resp.result;p.review={};p.aiAt=new Date().toISOString();p.aiRecommendations=null;p.recError='';p.aiError='';aiSearch='';aiFilter='all';persist();closeProgress();renderMain();notify('Classificação LLM concluída.')}catch(err){closeProgress();p.aiError=err.message||'Falha ao classificar.';persist();renderMain();}}

async function generateRecommendations(){
  const p=chosen();if(!p?.ai?.classificacoes?.length||busy)return;
  const sourceAt=p.aiAt;
  showProgress('Criando ideias com Sensivo Intelligence');
  try{
    await yieldPaint();progressStep(1);
    const response=await apiJson('/api/llm/recommend',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({classificacoes:p.ai.classificacoes,context:p.context||''})
    });
    if(p.aiAt!==sourceAt)throw Error('A análise foi atualizada. Gere as ideias novamente.');
    p.aiRecommendations={...response.result,generatedFor:sourceAt};p.recError='';
    persist();closeProgress();renderMain();notify('Novas recomendações do Qwen prontas.');
  }catch(error){closeProgress();p.recError=error.message||'Não foi possível gerar recomendações.';persist();renderMain();}
}

async function generateStudioScript(){
  if(studioBusy)return;
  const item=buildRadar(posts).opportunities.find(o=>o.id===radarSelection);
  if(!item)return;
  const requestedId=item.id, settings={...studioSettings};
  studioBusy=true;studioError='';
  const button=document.querySelector('#studio-generate');
  if(button){button.disabled=true;button.textContent='Gerando roteiro com Qwen…';}
  try{
    const resp=await apiJson('/api/llm/script',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      title:item.title,topic:item.topic,platform:settings.platform,duration:settings.duration,tone:settings.tone,
      evidence:item.evidence.map(e=>({text:e.text,postTitle:e.postTitle}))
    })});
    if(radarSelection===requestedId && JSON.stringify(studioSettings)===JSON.stringify(settings)){
      studioResult=resp.result;studioError='';notify('Seu roteiro está pronto para revisão.');
    }
  }catch(err){if(radarSelection===requestedId){studioError=err.message||'Não foi possível gerar o roteiro.';}}
  finally{studioBusy=false;if(page==='radar')renderMain();}
}
function renderMain(){const el=document.querySelector('#main');el.innerHTML=({home,posts:library,analyze:analyzePage,detail:details,radar:radarPage}[page]||home)();}

function navigate(next){if(busy)return;page=next;if(next!=='detail'&&next!=='intelligence'){search='';filter='all'}frame();window.scrollTo({top:0,behavior:'instant'})}

function addPost(comments,title,url=''){const records=normalizeRecords(comments);const clean=records.map(r=>r.text);if(!clean.length)throw Error('Nenhum comentário válido encontrado. Confira a coluna de texto do arquivo.');const p={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,url,cover:'',date:new Date().toLocaleDateString('pt-BR'),comments:clean,commentMeta:records.map(r=>({username:r.username,sourceId:r.sourceId})),context:''};posts.unshift(p);selected=p.id;detailTab='comments';search='';filter='all';persist();page='detail';frame();notify(`${clean.length} comentários importados com sucesso.`)}

function showProgress(label='Analisando sua audiência'){
  progressLabel=label;busy=true;stage=0;
  document.body.insertAdjacentHTML('beforeend',progressMarkup(label));
  document.querySelector('.overlay')?.focus();
}
function progressMarkup(label='Analisando sua audiência'){
  const isIdeas=/recomendações|ideias|Qwen/i.test(label);
  const isImport=/arquivo|comentários|Buscando|publicação/i.test(label)&&!/IA local/i.test(label);
  const headline=isIdeas?'Preparando suas próximas ideias':isImport?'Organizando as conversas':'Analisando sua audiência';
  const description=isIdeas?'A Sensivo está transformando comentários em oportunidades de conteúdo.':isImport?'Reunindo os comentários da publicação.':'Interpretando as conversas para identificar temas e comportamentos.';
  return `<div class="overlay progress-overlay" role="dialog" aria-modal="true" aria-label="Análise em andamento" tabindex="-1">
    <div class="progress-panel progress-simple">
      <div class="progress-mark" aria-hidden="true">${I('sparkle',28)}</div>
      <div class="progress-brand">SENSIVO INTELLIGENCE</div>
      <h2>${esc(headline)}</h2>
      <p>${esc(description)}</p>
      <div class="progress-current" role="status" aria-live="polite" aria-atomic="true">
        <span class="progress-current-icon" aria-hidden="true">${I('activity',16)}</span>
        <span id="progress-current-label">Preparando análise…</span>
      </div>
      <p class="progress-hint">O tempo depende da quantidade de comentários e do processamento local.</p>
    </div>
  </div>`;
}
function progressStep(n){
  stage=Math.max(0,Math.min(3,n));
  const el=document.querySelector('#progress-current-label');
  if(!el)return;
  const isIdeas=/recomendações|ideias|Qwen/i.test(progressLabel);
  const isImport=/arquivo|comentários|Buscando|publicação/i.test(progressLabel)&&!/IA local/i.test(progressLabel);
  const labels=isIdeas?['Preparando análise…','Gerando ideias…','Gerando ideias…','Concluindo…']:isImport?['Preparando coleta…','Lendo comentários…','Organizando comentários…','Finalizando…']:['Preparando análise…','Classificando comentários…','Classificando comentários…','Finalizando…'];
  el.textContent=labels[stage];
}
function closeProgress(){busy=false;document.querySelector('.progress-overlay')?.remove()}

function feedback(id,message,isError=true){const el=document.getElementById(id);if(el)el.innerHTML=`<div class="notice ${isError?'error':'info'}" role="alert">${esc(message)}</div>`}

const yieldPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

async function importCSV(){const input=document.getElementById('csv'),f=input?.files?.[0];if(!f){feedback('csv-feedback','Selecione um arquivo antes de analisar.');return}if(f.size>3_000_000){feedback('csv-feedback','O arquivo excede 3 MB.');return}showProgress('Lendo seus comentários');try{await yieldPaint();progressStep(1);const raw=await f.text();const comments=parseFile(raw,f.name);if(!comments.length)throw Error('O arquivo não contém comentários válidos.');progressStep(2);const title=f.name.replace(/\.[^/.]+$/,'').replace(/[-_]/g,' ')||'Publicação importada';progressStep(3);closeProgress();addPost(comments,title)}catch(err){closeProgress();feedback('csv-feedback',err?.message||'Não foi possível importar o arquivo.')}}

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function apiJson(url,options){const res=await fetch(url,options);const type=res.headers.get('content-type')||'';if(!type.includes('application/json'))throw Error('Servidor indisponível. Abra em http://localhost:8765 com python server.py em execução.');const j=await res.json();if(!res.ok)throw Error(j.error||j.message||`Erro ${res.status}`);return j}

async function importLink(){const url=document.getElementById('url').value.trim();const limit=Number(document.getElementById('limit').value);if(!/^https:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(url)){feedback('url-feedback','Informe uma URL válida de post ou Reel do Instagram.');return}showProgress('Buscando sua publicação');try{await yieldPaint();progressStep(1);const started=await apiJson('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,limit})});let data;for(let attempt=0;attempt<100;attempt++){await sleep(1600);data=await apiJson(`/api/jobs/${encodeURIComponent(started.jobId)}`);if(data.status==='error')throw Error(data.message||'A coleta falhou.');if(data.status==='done')break;if(attempt===5)progressStep(2)}if(!data||data.status!=='done')throw Error('A coleta excedeu o tempo de espera. Tente um limite menor.');progressStep(3);const comments=data.result?.commentRecords||data.result?.comments||[];if(!comments.length)throw Error('A coleta terminou sem comentários disponíveis.');closeProgress();addPost(comments,`Instagram · ${url.split('/').filter(Boolean).pop()}`,url)}catch(err){closeProgress();feedback('url-feedback',err.message||'Não foi possível coletar o post.')}}

async function authorsUpload(input){
  const p=chosen(),f=input.files?.[0];if(!p||!f)return;
  if(f.size>3_000_000){notify('Arquivo muito grande (máximo 3 MB).');return}
  try{
    const records=parseFile(await f.text(),f.name);
    const result=recoverAuthors(p,records);
    p.commentMeta=result.meta;persist();renderMain();
    notify(`${result.updated} autor(es) recuperado(s) de ${result.matched} comentários correspondentes.`);
  }catch(err){notify(err.message||'Não foi possível recuperar os autores.');}
}

async function coverUpload(input){const f=input.files[0],p=chosen();if(!p||!f)return;if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>1_200_000){notify('Selecione uma imagem JPG, PNG ou WebP de até 1,2 MB.');return}const reader=new FileReader();reader.onload=()=>{p.cover=String(reader.result);persist();frame();notify('Capa atualizada.');};reader.readAsDataURL(f)}

function backupLibrary(){
  const data={format:'sensivo-library',version:1,exportedAt:new Date().toISOString(),posts};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='sensivo-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify('Backup exportado. Guarde o arquivo em local seguro.');
}
async function restoreLibrary(input){
  const file=input.files?.[0];if(!file)return;
  if(file.size>15_000_000){notify('Backup muito grande. Limite: 15 MB.');return;}
  try{
    const data=JSON.parse(await file.text());
    if(data?.format!=='sensivo-library'||data.version!==1||!Array.isArray(data.posts)||data.posts.length>1000)throw new Error('Arquivo de backup inválido.');
    if(!data.posts.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string'&&Array.isArray(p.comments)&&p.comments.every(t=>typeof t==='string')&&p.comments.length<=10000))throw new Error('O backup contém registros inválidos.');
    const byId=new Map(posts.map(p=>[p.id,p]));
    for(const post of data.posts)byId.set(post.id,post);
    const merged=[...byId.values()];
    const old=posts;posts=merged;
    if(!persist()){posts=old;throw new Error('Sem espaço no navegador. Nenhum dado foi substituído.');}
    frame();notify('Biblioteca restaurada. Posts existentes com o mesmo ID foram atualizados.');
  }catch(err){notify('Não foi possível restaurar: '+(err.message||'arquivo inválido'));}
}
function downloadReport(){
  const p=chosen();if(!p){notify('Abra uma publicação antes de exportar.');return;}
  const ai=p.ai, review=p.review||{}, rows=ai?.classificacoes||[];
  const reviewed=rows.filter(r=>review[r.id]?.status==='correct'||review[r.id]?.status==='incorrect');
  const correct=reviewed.filter(r=>review[r.id]?.status==='correct').length;
  const report={
    produto:'Sensivo',versao:'5.3',gerado_em:new Date().toISOString(),
    publicacao:{titulo:p.title,origem:p.url||'Arquivo importado',data:p.date,comentarios:p.comments.length,contexto:p.context||''},
    metodologia:{classificacao:ai?'LLM local via Ollama':'Sem classificação LLM',modelo:ai?.model||null,analisados:ai?.total||0,limite_por_analise:100},
    resultados:ai?{sentimentos:ai.sentimentos,intencoes:ai.intencoes,assuntos:ai.assuntos}:null,
    revisao_humana:{avaliados:reviewed.length,corretos:correct,incorretos:reviewed.length-correct,taxa_concordancia:reviewed.length?Number((100*correct/reviewed.length).toFixed(1)):null,observacao:'Concordância da revisão humana dos exemplos marcados, não é acurácia de referência sem amostragem representativa.'},
    comentarios:p.comments.map((texto,id)=>({id,username:p.commentMeta?.[id]?.username||null,texto,classificacao:rows.find(r=>r.id===id)||null,revisao:review[id]||null})),
    limites:'Dados amostrais. A classificação é automática e pode conter erros. Autores só aparecem quando presentes na fonte.'
  };
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='sensivo-relatorio-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Relatório JSON exportado.');
}
function reviewPanel(p){
  if(!p.ai?.classificacoes?.length)return '';
  const labels=p.ai.classificacoes,review=p.review||{};
  const evaluated=labels.filter(r=>['correct','incorrect'].includes(review[r.id]?.status));
  const correct=evaluated.filter(r=>review[r.id].status==='correct').length;
  return `<details class="review-panel" ${reviewExpanded?'open':''}><summary>${I('check',16)} Validar resultados <span>${evaluated.length} de ${labels.length} revisados</span></summary>
    <p class="smalltxt muted">Compare o sentimento e as categorias com o comentário original. Marque cada classificação como adequada ou incorreta. A taxa representa apenas os comentários revisados.</p>
    <div class="review-summary"><strong>${evaluated.length?Math.round(correct/evaluated.length*100)+'%':'—'}</strong><span>Concordância na amostra revisada (${correct}/${evaluated.length})</span></div>
    <div class="review-items">${labels.map(r=>`<div class="review-item"><div><strong>${esc(p.commentMeta?.[r.id]?.username?'@'+p.commentMeta[r.id].username:'#'+(r.id+1))}</strong><p>${esc(r.texto)}</p><small>${esc(r.sentimento)} · ${(r.intencoes||[]).map(x=>esc(intentNames[x]||x)).join(', ')}</small></div><div class="review-actions"><button type="button" data-review="${r.id}" data-verdict="correct" class="${review[r.id]?.status==='correct'?'selected':''}" aria-pressed="${review[r.id]?.status==='correct'}">Adequada</button><button type="button" data-review="${r.id}" data-verdict="incorrect" class="${review[r.id]?.status==='incorrect'?'selected':''}" aria-pressed="${review[r.id]?.status==='incorrect'}">Incorreta</button></div></div>`).join('')}</div>
  </details>`;
}
function downloadCSV(){
  const p=chosen()||posts[0];if(!p)return;
  const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const csv='username,text\r\n'+p.comments.map((text,id)=>[p.commentMeta?.[id]?.username||'',text].map(cell).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sensivo-comentarios.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function openProfileEditor(){
  if(document.querySelector('#profile-dialog'))return;
  const dialog=document.createElement('dialog');
  dialog.id='profile-dialog';dialog.className='profile-dialog';
  dialog.innerHTML=`<form id="profile-form" class="profile-form" method="dialog">
    <div class="profile-dialog-kicker">PERSONALIZAÇÃO</div>
    <h2>Como podemos chamar você?</h2>
    <p>Esse nome aparece na sua página inicial. Você pode alterá-lo quando quiser.</p>
    <label for="profile-name">Seu nome</label>
    <input id="profile-name" class="input" type="text" maxlength="32" autocomplete="nickname" required value="${esc(profileName)}" />
    <div class="profile-error" id="profile-error" aria-live="polite"></div>
    <div class="profile-actions">
      <button type="button" class="btn pale" id="profile-cancel">Cancelar</button>
      <button type="submit" class="btn copper">Salvar nome</button>
    </div>
  </form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('#profile-cancel').addEventListener('click',()=>dialog.close());
  dialog.querySelector('#profile-form').addEventListener('submit',e=>{
    e.preventDefault();
    const input=dialog.querySelector('#profile-name');
    const next=input.value.trim().replace(/\\s+/g,' ');
    if(!next){dialog.querySelector('#profile-error').textContent='Digite um nome para continuar.';input.focus();return;}
    profileName=next.slice(0,32);
    try{localStorage.setItem(PROFILE_STORE,profileName)}catch{notify('Nome alterado nesta sessão. O navegador não permitiu salvá-lo.')}
    dialog.close();frame();
  });
  dialog.showModal();
  dialog.querySelector('#profile-name').focus();
  dialog.querySelector('#profile-name').select();
}

app.addEventListener('click',e=>{
  const pick=e.target.closest('[data-radar-select]');
  if(pick){radarSelection=pick.dataset.radarSelect;studioResult=null;studioError='';renderMain();return}
  const platform=e.target.closest('[data-studio-platform]');
  if(platform){studioSettings.platform=platform.dataset.studioPlatform;studioResult=null;studioError='';renderMain();return}
  if(e.target.closest('#studio-generate')){generateStudioScript();return}
  if(e.target.closest('#studio-copy')){if(studioResult){if(navigator?.clipboard?.writeText)navigator.clipboard.writeText(scriptText(studioResult)).then(()=>notify('Roteiro copiado.')).catch(()=>notify('Não foi possível copiar.'));else notify('Cópia indisponível neste navegador.')}return}
  const plan=e.target.closest('[data-radar-plan]');
  if(plan){const id=plan.dataset.radarPlan;radarSaved=radarSaved.includes(id)?radarSaved.filter(x=>x!==id):[...radarSaved,id].slice(-100);try{localStorage.setItem(RADAR_STORE,JSON.stringify(radarSaved))}catch{notify('Não foi possível salvar o planejamento neste navegador.')}renderMain();return}
  const copy=e.target.closest('[data-radar-copy]');
  if(copy){const item=buildRadar(posts).opportunities.find(o=>o.id===copy.dataset.radarCopy);if(item){const value=briefingText(item);if(navigator?.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>notify('Briefing copiado.')).catch(()=>notify('Não foi possível copiar.'))}else notify('Cópia indisponível neste navegador.')}return}
if(e.target.closest('#edit-profile, #edit-profile-home')){openProfileEditor();return}const p=e.target.closest('[data-page]');if(p){navigate(p.dataset.page);return}const deleteButton=e.target.closest('[data-delete-post]');if(deleteButton){requestPostDeletion(deleteButton.dataset.deletePost);return}const post=e.target.closest('[data-post]');if(post){selected=post.dataset.post;page='detail';reviewExpanded=false;detailTab='comments';search='';filter='all';frame();return}const insight=e.target.closest('[data-insight]');if(insight){insightSection=insight.dataset.insight;renderMain();return}const idea=e.target.closest('[data-idea]');if(idea){ideaSection=idea.dataset.idea;renderMain();return}const tab=e.target.closest('[data-tab]');if(tab){reviewExpanded=false;detailTab=tab.dataset.tab;renderMain();return}const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;renderMain();return}const reviewBtn=e.target.closest('[data-review]');if(reviewBtn){reviewExpanded=true;const post=chosen();if(post){post.review ||= {};const id=Number(reviewBtn.dataset.review);const status=reviewBtn.dataset.verdict;post.review[id]?.status===status?delete post.review[id]:post.review[id]={status};persist();renderMain();}return}if(e.target.closest('#run-llm')){runLLM();return}if(e.target.closest('#generate-recommendations')){generateRecommendations();return}if(e.target.closest('#backup-library')){backupLibrary();return}if(e.target.closest('#export-report')){downloadReport();return}if(e.target.closest('#export-csv'))downloadCSV();if(e.target.closest('#print'))window.print()});

app.addEventListener('submit',e=>{if(e.target.id==='csv-form'){e.preventDefault();if(!busy)importCSV()}if(e.target.id==='url-form'){e.preventDefault();if(!busy)importLink()}});

app.addEventListener('change',e=>{
  if(e.target.id==='studio-duration'){studioSettings.duration=Number(e.target.value);studioResult=null;studioError='';renderMain();return}
  if(e.target.id==='studio-tone'){studioSettings.tone=e.target.value;studioResult=null;studioError='';renderMain();return}
  if(e.target.id==='post-context'){const p=chosen();if(p){p.context=e.target.value;persist()}}
  if(e.target.id==='ai-filter'){aiFilter=e.target.value;renderMain()}
});
app.addEventListener('input',e=>{
  if(e.target.id==='ai-search'){
    const pos=e.target.selectionStart;aiSearch=e.target.value;
    const p=chosen(),contextInput=document.getElementById('post-context');if(p&&contextInput)p.context=contextInput.value;
    renderMain();const input=document.getElementById('ai-search');input.focus();input.setSelectionRange(pos,pos);
  }
});

app.addEventListener('change',e=>{if(e.target.id==='csv'){file=e.target.files?.[0];document.querySelector('#csv-selected').textContent=file?`${file.name} · ${(file.size/1024).toFixed(1)} KB`:'Selecione um arquivo.'}if(e.target.id==='restore-library')restoreLibrary(e.target);if(e.target.id==='cover-file')coverUpload(e.target);if(e.target.id==='authors-file')authorsUpload(e.target)});

app.addEventListener('input',e=>{if(e.target.id==='comment-search'){const pos=e.target.selectionStart;search=e.target.value;const el=document.querySelector('#details-content');const p=chosen();if(p&&el){el.innerHTML=detailContent(p,summarize(p.comments));const input=el.querySelector('#comment-search');input.focus();input.setSelectionRange(pos,pos)}}});

frame();
