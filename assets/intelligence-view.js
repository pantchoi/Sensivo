import {buildIntelligence, evidenceFor} from './intelligence.js';
import {icon as I} from './icons.js';
import {labelChip} from './conversation.js';
const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => Number(n).toLocaleString('pt-BR');
export function recommendationTitle(raw) {
 let title=String(raw??'').trim();
 title=title.replace(/^(?:Recomenda(?:ção|cao) de conte(?:údo|udo) para a pr(?:ó|o)xima postagem|Sugest(?:ão|ao) de conte(?:údo|udo)|Ideia para o pr(?:ó|o)ximo post)\s*[:–—-]\s*/i,'').trim();
 title=title.replace(/\s+(?:(?:de|do|da|dos|das|em|no|na|nos|nas|para|com)\s+)?[A-Za-zÀ-ÿ]$/u,'').trim();
 title=title.replace(/\s+(?:de|do|da|dos|das|em|no|na|nos|nas|para|com)$/iu,'').trim();
 return title || 'Ideia de conteúdo';
}
const proof = (evidence, post) => `<div class="evidence-stack"><div class="evidence-title">${I('message',14)} O que a audiência disse</div>${evidence.map(row=>`<div class="evidence-line"><span class="evidence-index">#${String(row.id+1).padStart(2,'0')}</span><div><strong>${post.commentMeta?.[row.id]?.username?'@'+esc(post.commentMeta[row.id].username):'Pessoa da comunidade'}</strong><p>“${esc(row.text)}”</p></div></div>`).join('')}</div>`;
const start = () => `<section class="card intelligence-empty"><div class="intelligence-empty-icon">${I('sparkle',25)}</div><h2>Primeiro, ouça sua audiência.</h2><p>Execute a classificação com o Qwen local para transformar comentários em insights, recomendações e oportunidades com evidências.</p><button class="btn copper" data-tab="ai">${I('sparkle')} Abrir análise com LLM</button></section>`;
const head = (kicker,heading,description,info) => `<div class="intelligence-head"><div><div class="eyebrow">${kicker}</div><h2>${heading}</h2><p>${description}</p></div><span class="intel-sample">${I('layers',15)} ${number(info.total)} comentários classificados</span></div>`;
const foot = info => `<p class="intel-disclaimer">${I('info',14)} ${esc(info.caveat)} Categorias podem se sobrepor. Os percentuais usam os comentários classificados como denominador.</p>`;
export function insightsView(post){
 const data=buildIntelligence(post.ai);if(!data)return start();
 const sentiment=[['positivo','Positivos'],['neutro','Neutros'],['negativo','Negativos'],['misto','Mistos']];
 const total=data.total||1;
 const dominant=sentiment.reduce((best,[key,label])=>data.sentiment[key]>data.sentiment[best[0]]?[key,label]:best,sentiment[0]);
 const categories=data.categories.slice(0,3);
 return `<section class="intel-suite intel-suite-clean">
 ${head('INSIGHTS','O que sua comunidade está dizendo.','Os sinais mais relevantes dos comentários analisados.',data)}
 <div class="intel-clean-grid">
 <article class="card intel-clean-card" aria-label="Distribuição de sentimentos">
   <div class="intel-clean-heading"><h3>Sentimento da comunidade</h3><span>${number(data.total)} comentários</span></div>
   <div class="intel-segmented-bar" role="img" aria-label="${sentiment.map(([key,label])=>`${label}: ${data.sentiment[key]}`).join('; ')}">${sentiment.map(([key])=>data.sentiment[key]?`<span class="sentiment-${key}" style="flex:${data.sentiment[key]}"></span>`:'').join('')}</div>
   <div class="intel-sentiment-legend">${sentiment.filter(([key])=>data.sentiment[key]).map(([key,label])=>`<div class="intel-sentiment-stat"><span><i class="sentiment-dot sentiment-${key}"></i>${label}</span><strong>${number(data.sentiment[key])}</strong></div>`).join('')}</div>
   <p class="intel-key-takeaway">Predominância: <strong>${dominant[1].toLowerCase()}</strong> (${Math.round(data.sentiment[dominant[0]]/total*100)}% da amostra)</p>
 </article>
 <article class="card intel-clean-card">
   <div class="intel-clean-heading"><h3>Principais interações</h3><span>Rótulos podem se sobrepor</span></div>
   <div class="intel-clean-interactions">${categories.map(c=>`<div class="intel-clean-interaction"><div>${labelChip(c.key)}<strong>${c.count}</strong></div><div class="intel-track"><span style="width:${c.percentage}%"></span></div></div>`).join('')||'<p class="smalltxt muted">Nenhuma interação identificada.</p>'}</div>
   ${data.categories.length>3?`<details class="intel-more"><summary>Ver todas as ${data.categories.length} interações</summary><div class="intel-clean-interactions">${data.categories.slice(3).map(c=>`<div class="intel-clean-interaction"><div>${labelChip(c.key)}<strong>${c.count}</strong></div><div class="intel-track"><span style="width:${c.percentage}%"></span></div></div>`).join('')}</div></details>`:''}
 </article></div>
 <article class="card intel-clean-card">
  <div class="intel-clean-heading"><h3>O que estão dizendo</h3><span>Comentários reais</span></div>
  <div class="intel-clean-evidence">${data.categories.slice(0,2).map(c=>`<div class="intel-clean-proof"><div class="intel-clean-proof-label">${labelChip(c.key)} <span>${c.count} comentário(s)</span></div>${proof(c.evidence.slice(0,2),post)}</div>`).join('')||'<p class="smalltxt muted">Ainda não há evidências suficientes.</p>'}</div>
  ${data.topics.length?`<details class="intel-more"><summary>Explorar assuntos mencionados</summary><div class="intel-topic-cloud">${data.topics.map(([term,count])=>`<span>${esc(term)} <b>${count}</b></span>`).join('')}</div></details>`:''}
 </article>
 ${foot(data)}</section>`;

}
export function recommendationsView(post){
 const data=buildIntelligence(post.ai);if(!data)return start();
 const generated=post.aiRecommendations?.generatedFor===post.aiAt ? post.aiRecommendations : null;
 return `<section class="intel-suite">${head('AI recommendations','Ideias que nascem da sua audiência.','Descubra o que criar a seguir com base nas conversas do seu post.',data)}
 <article class="intel-generator"><div><div class="eyebrow">SENSIVO INTELLIGENCE</div><h3>Sua próxima grande ideia começa aqui.</h3><p>A inteligência da Sensivo encontra ideias a partir do que seu público realmente comenta. Você escolhe o próximo passo.</p></div><button class="btn copper" id="generate-recommendations">${I('sparkle',17)} ${generated?'Gerar novas ideias':'Descobrir ideias'}</button></article>
 ${post.recError?`<div class="notice error" role="alert">${esc(post.recError)}</div>`:''}
 ${generated?`<div class="intel-section-title"><h3>Ideias para seu próximo post</h3><span>${generated.recommendations.length} ideias selecionadas · ${generated.source_count} comentários considerados</span></div><div class="intel-rec-grid">${generated.recommendations.length===0?'<article class="card">Ainda não encontramos ideias suficientemente diferentes e fundamentadas nesta amostra. Tente analisar mais comentários ou outras publicações.</article>':''}${generated.recommendations.map((r,i)=>`<article class="intel-rec-card generated"><div class="rec-eyebrow">${I('sparkle',15)} ${String(i+1).padStart(2,'0')}</div><h3>${esc(recommendationTitle(r.titulo))}</h3><p>${esc(r.proposta)}</p><details class="rec-reason"><summary>Por que esta ideia?</summary><p>${esc(r.motivo)}</p></details>${proof(evidenceFor(post.ai,r.evidencias_ids),post)}</article>`).join('')}</div>`:''}
 <div class="intel-section-title"><h3>${generated?'Mais caminhos para explorar':'Recomendações a partir das classificações'}</h3><span>Baseadas nos comentários analisados</span></div>
 <div class="intel-rec-grid">${data.recommendations.map((r,i)=>`<article class="intel-rec-card"><div class="rec-eyebrow">${I('target',15)} Direção ${String(i+1).padStart(2,'0')}</div><h3>${esc(r.title)}</h3><p>${esc(r.action)}</p><div class="rec-facts">${I('message',14)} ${r.count} comentário(s) relacionado(s) · ${esc(r.confidence)}</div>${proof(r.evidence.slice(0,2),post)}</article>`).join('')||'<article class="card">Sem recomendações suficientemente fundamentadas nesta amostra.</article>'}</div>${foot(data)}</section>`;
}
export function opportunitiesView(post){
 const data=buildIntelligence(post.ai);if(!data)return start();
 return `<section class="intel-suite">${head('Content opportunities','Sinais que podem virar conteúdo.','Oportunidades ordenadas pela frequência na amostra, com acesso às falas que as motivaram.',data)}
 <div class="opportunity-list">${data.opportunities.map((o,i)=>`<article class="opportunity-card"><div class="opportunity-rank">${String(i+1).padStart(2,'0')}</div><div class="opportunity-main"><div class="opportunity-top"><span class="opportunity-label">${esc(o.confidence)}</span><span class="opportunity-count">${o.count} de ${data.total} comentários · ${o.percentage}%</span></div><h3>${esc(o.title)}</h3><p>${esc(o.action)}</p>${proof(o.evidence.slice(0,3),post)}</div><div class="opportunity-arrow">${I('arrow',22)}</div></article>`).join('')||'<div class="card">Ainda não há oportunidades identificadas. Amplie a amostra ou revise o contexto do post.</div>'}</div>${foot(data)}</section>`;
}
