import {studioView} from './content-studio.js';
import {icon as I} from './icons.js';

const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {
  pedido_conteudo: {label:'Pedido de conteúdo',title:'Atenda um pedido da comunidade',format:'Vídeo de resposta ou parte 2',hook:'Vocês pediram — aqui está a resposta.'},
  pergunta: {label:'Dúvida recorrente',title:'Responda a uma dúvida da audiência',format:'Tutorial curto ou perguntas e respostas',hook:'Essa dúvida apareceu nos comentários. Vamos resolver?'},
  sugestao: {label:'Sugestão',title:'Teste uma sugestão da comunidade',format:'Teste ou demonstração',hook:'Uma sugestão de vocês virou conteúdo.'},
  critica: {label:'Ponto de atenção',title:'Esclareça uma crítica recorrente',format:'Explicação com contexto',hook:'Vamos conversar sobre um ponto que vocês levantaram.'},
  reclamacao: {label:'Reclamação',title:'Investigue uma dificuldade recorrente',format:'Resposta transparente',hook:'Vi essa dificuldade nos comentários. Vamos entender.'},
  identificacao: {label:'Identificação',title:'Crie conteúdo a partir de uma situação comum',format:'História ou sketch',hook:'Mais alguém já passou por isso?'},
  humor: {label:'Humor',title:'Explore um tema que gerou humor',format:'Vídeo curto bem-humorado',hook:'Vocês se divertiram com isso — tem mais.'},
  relato_pessoal: {label:'Relato pessoal',title:'Abra espaço para histórias da comunidade',format:'Storytelling',hook:'Quero ouvir a história de vocês.'},
  interesse_compra: {label:'Dúvida comercial',title:'Esclareça uma dúvida de compra',format:'Vídeo explicativo',hook:'Vocês perguntaram sobre isso. Aqui estão os detalhes.'}
};
const stop = new Set(['vídeo','video','post','conteúdo','conteudo','produto','comentário','comentario','pessoa','pessoas','assunto','coisa','gente','muito','mais','legal','bom','boa','sim','não','nao','eu','você','voce']);
const norm = s => String(s ?? '').normalize('NFKC').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ').slice(0,65);
const topicFor = row => {
  const topics=Array.isArray(row.assuntos)?row.assuntos:[];
  return [...new Set(topics.map(norm).filter(t=>t.length>=4&&!stop.has(t)))].slice(0,3);
};
const important = new Set(['pedido_conteudo','pergunta','sugestao','critica','reclamacao']);
// Uma mesma classificação pode trazer vários assuntos. Para o Radar, cada
// comentário contribui para UMA oportunidade por intenção — nunca para uma
// oportunidade por palavra-chave. Isso evita cards duplicados como
// "crítica: custo", "crítica: gastar dinheiro", "crítica: marketing".
// Títulos editoriais: o assunto é o protagonista, não um prefixo técnico.
// O tipo de interação permanece no subtítulo do card.
const titleFor = (intent, topic, count) => {
  const subject = topic==='geral' ? '' : topic.replace(/\s+/g,' ').trim();
  const capitalize = text => text ? text[0].toLocaleUpperCase('pt-BR')+text.slice(1) : text;
  if (!subject) return ({
    pedido_conteudo:'O que a comunidade gostaria de ver a seguir?',
    pergunta:'Uma pergunta da audiência para responder',
    sugestao:'Uma sugestão para avaliar com a comunidade',
    critica:'Um ponto levantado pela audiência merece atenção',
    reclamacao:'Uma dificuldade relatada merece investigação',
    identificacao:'Uma experiência compartilhada pela comunidade',
    humor:'Uma reação divertida para explorar',
    relato_pessoal:'Uma história da audiência para ouvir',
    interesse_compra:'Uma dúvida sobre a compra para esclarecer'
  })[intent] || 'Um assunto para explorar';
  const templates={
    pedido_conteudo: t=>`${capitalize(t)}: conteúdo que a audiência sugeriu`,
    pergunta: t=>`${capitalize(t)}: uma dúvida para responder`,
    sugestao: t=>`${capitalize(t)}: uma sugestão para testar`,
    critica: t=>`${capitalize(t)}: ponto de atenção nos comentários`,
    reclamacao: t=>`${capitalize(t)}: dificuldade que merece resposta`,
    identificacao: t=>`${capitalize(t)}: experiência com que o público se identificou`,
    humor: t=>`${capitalize(t)}: assunto que rendeu humor`,
    relato_pessoal: t=>`${capitalize(t)}: histórias que merecem espaço`,
    interesse_compra: t=>`${capitalize(t)}: o que esclarecer antes da compra`
  };
  return (templates[intent]||((t)=>capitalize(t)))(subject);
};
// A LLM pode devolver palavras soltas ou assuntos não mencionados na fala.
// Priorizamos termos realmente presentes no comentário e descartamos ruído.
const token = text => norm(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9%]+/g,' ').trim();
const noise = new Set(['melhorar','marketing','negocios brasil','nível negócios brasil','nivel negocios brasil','geral','outros','comentarios','opiniao','sentimento','positivo','negativo']);
const topicMatches = (topic,text) => {
  const t=token(topic), c=token(text);
  if (!t || noise.has(t)) return false;
  const words=t.split(' ').filter(w=>w.length>=4 || /\d|%/.test(w));
  if (!words.length)return false;
  const body=new Set(c.split(' '));
  // Aceita singular/plural, sem transformar um tema inexistente em evidência.
  return words.some(w=>body.has(w)||body.has(w.replace(/s$/,''))||body.has(w+'s')|| (['custo','preco','caro','dinheiro'].includes(w)&&['custo','preco','caro','dinheiro'].some(x=>body.has(x))));
};
const topicKey = topic => {
  const t=token(topic);
  if (/pedagio/.test(t))return 'pedágio';
  if (/\b(imposto|taxa|tributo)\b/.test(t)){const pct=t.match(/\d+(?:[.,]\d+)?\s*%/);return pct?`imposto de ${pct[0]}`:'imposto';}
  if (/\b(custo|preco|caro|gastar|dinheiro|valor)\b/.test(t))return 'preço e custo';
  return topic;
};
const pickTopic = row => {
  const topics=topicFor(row).filter(t=>topicMatches(t,row.texto));
  return topics.length ? topicKey(topics[0]) : 'geral';
};
// Um comentário com múltiplos rótulos não deve virar vários cards sem evidências
// independentes. Escolhemos a intenção mais útil para a decisão editorial.
const intentOrder=['pedido_conteudo','pergunta','sugestao','reclamacao','critica','interesse_compra','relato_pessoal','identificacao','humor'];
const chooseIntent = intents => intentOrder.find(i=>intents.includes(i));
export function buildRadar(posts) {
  const groups=new Map();
  let analyzed=0, classified=0;
  for(const post of posts||[]) {
    if(!post?.ai?.classificacoes?.length)continue;
    analyzed++;
    for(const row of post.ai.classificacoes){
      if(!row || !Number.isInteger(row.id) || row.id<0 || typeof row.texto!=='string')continue;
      classified++;
      const intents=[...new Set((Array.isArray(row.intencoes)?row.intencoes:[]).filter(k=>labels[k]))];
      const topic=pickTopic(row);
      const chosen=chooseIntent(intents);
      for(const intent of chosen?[chosen]:[]){
        const key=intent+'::'+topic;
        if(!groups.has(key))groups.set(key,{id:key,intent,topic,postIds:new Set(),comments:new Set(),evidence:[]});
        const group=groups.get(key);
        const identity=String(post.id)+'::'+row.id;
        if(group.comments.has(identity))continue;
        group.comments.add(identity);
        group.postIds.add(post.id);
        if(group.evidence.length<5)group.evidence.push({postId:post.id,postTitle:post.title||'Publicação',id:row.id,text:row.texto,username:post.commentMeta?.[row.id]?.username||''});
      }
    }
  }
  const opportunities=[...groups.values()].map(g=>{
    const count=g.comments.size, postCount=g.postIds.size;
    const priority=(important.has(g.intent)?3:0)+Math.min(count,8)+Math.min(postCount-1,3)*3;
    return {id:g.id,intent:g.intent,topic:g.topic,count,postCount,priority,evidence:g.evidence,
      label:labels[g.intent].label,
      title:titleFor(g.intent,g.topic,count),
      level:postCount>=2 && count>=3?'Sinal recorrente':count>=2?'Sinal em observação':'Sinal inicial'};
  }).sort((a,b)=>b.priority-a.priority||b.postCount-a.postCount||b.count-a.count||a.id.localeCompare(b.id,'pt-BR')).slice(0,10);
  return {analyzed,classified,opportunities};
}

export function makeBriefing(opportunity){
  if(!opportunity)return null;
  const cfg=labels[opportunity.intent];
  const subject=opportunity.topic==='geral'?'o tema mencionado nos comentários':opportunity.topic;
  return {
    title:opportunity.title,
    format:cfg.format,
    hook:cfg.hook,
    structure:[
      `Abra com uma pergunta ou situação relacionada a ${subject}.`,
      `Responda com exemplos concretos; confira as falas da comunidade antes de afirmar fatos.`,
      'Encerre convidando o público a comentar o que gostaria de ver a seguir.'
    ],
    note:'Briefing inicial estruturado a partir dos rótulos e evidências. Não é um roteiro gerado por LLM nem uma previsão de desempenho.'
  };
}
export function radarView(data, selectedId, savedIds=[], studio={}){
  const selected=data.opportunities.find(x=>x.id===selectedId);
  const brief=makeBriefing(selected);
  const summary=`${data.analyzed} publicaç${data.analyzed===1?'ão':'ões'} analisada${data.analyzed===1?'':'s'} · ${data.classified} comentários classificados`;
  return `<section class="radar-page">
    <button class="back" data-page="home">${I('back',17)} Voltar à visão geral</button>
    <div class="radar-hero"><div><span class="eyebrow">SENSIVO RADAR</span><h1>Sua comunidade mostra o caminho.</h1><p>Explore temas levantados nos comentários e escolha o próximo conteúdo com evidências. Um sinal isolado não representa uma tendência.</p><span class="radar-source">${escapeHTML(summary)}</span></div><div class="radar-hero-icon">${I('target',42)}</div></div>
    ${data.analyzed<1?`<div class="card radar-empty"><h2>Seu Radar começa com uma análise.</h2><p>Classifique comentários com a Inteligência IA de pelo menos uma publicação para identificar oportunidades.</p><button class="btn copper" data-page="posts">Ver biblioteca</button></div>`:
      `<div class="radar-layout"><div class="radar-list"><div class="radar-section-title"><h2>Oportunidades identificadas</h2><span>${data.opportunities.length} sinais · prioridade heurística</span></div>
        ${data.opportunities.length?data.opportunities.map((o,i)=>`<article class="radar-item ${selectedId===o.id?'is-selected':''}">
          <div class="radar-item-top"><span class="radar-rank">${String(i+1).padStart(2,'0')}</span><span class="radar-level">${escapeHTML(o.level)}</span></div>
          <h3>${escapeHTML(o.title)}</h3><p>${escapeHTML(o.label)} · ${o.count} comentário(s) em ${o.postCount} publicação(ões)</p>
          <div class="radar-item-actions"><button class="btn pale small" data-radar-select="${escapeHTML(o.id)}">${I('arrow',14)} Ver evidências e briefing</button>${savedIds.includes(o.id)?'<span class="radar-planned">No planejamento</span>':''}</div>
        </article>`).join(''):`<div class="card radar-empty">Nenhum pedido, pergunta ou interação classificada foi encontrado. Revise os dados e a amostra.</div>`}
      </div><div class="radar-detail">${selected?`<article class="card radar-detail-card"><span class="eyebrow">OPORTUNIDADE SELECIONADA</span><h2>${escapeHTML(selected.title)}</h2><p>${selected.count} comentário(s) · ${selected.postCount} publicação(ões)</p><h3>O que sua audiência disse</h3><div class="radar-evidence">${selected.evidence.map(e=>`<blockquote><p>“${escapeHTML(e.text)}”</p><small>${e.username?'@'+escapeHTML(e.username)+' · ':''}${escapeHTML(e.postTitle)}</small></blockquote>`).join('')}</div><h3>Briefing inicial</h3><div class="radar-brief"><div><strong>Formato</strong><p>${escapeHTML(brief.format)}</p></div><div><strong>Gancho sugerido</strong><p>${escapeHTML(brief.hook)}</p></div><div><strong>Estrutura</strong><ol>${brief.structure.map(t=>`<li>${escapeHTML(t)}</li>`).join('')}</ol></div><small>${escapeHTML(brief.note)}</small></div><div class="radar-detail-actions"><button class="btn copper" data-radar-plan="${escapeHTML(selected.id)}">${I('plus',15)} ${savedIds.includes(selected.id)?'Retirar do planejamento':'Salvar no planejamento'}</button><button class="btn outline small" data-radar-copy="${escapeHTML(selected.id)}">${I('download',14)} Copiar briefing</button></div>${studioView(selected,studio.settings,studio.result,studio.error)}</article>`:`<div class="card radar-empty"><h2>Escolha uma oportunidade.</h2><p>Veja os comentários que justificam cada sinal e um briefing prático para criar seu próximo conteúdo.</p></div>`}</div></div>`}
    <p class="radar-disclaimer">A prioridade é calculada por regras (frequência, recorrência entre publicações e tipo de interação). Não representa potencial de viralização. O briefing é um rascunho estruturado, não uma nova geração por LLM.</p>
  </section>`;
}
export function briefingText(opportunity){
  const b=makeBriefing(opportunity);if(!b)return '';
  return [b.title,'Formato: '+b.format,'Gancho: '+b.hook,'Estrutura:',...b.structure.map((s,i)=>`${i+1}. ${s}`),'','Evidências:',...opportunity.evidence.map(e=>`- “${e.text}” (${e.postTitle})`),b.note].join('\n');
}
