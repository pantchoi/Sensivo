import {icon as I} from './icons.js';
import {classify} from './analysis.js';
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const intentNames={pergunta:'Pergunta',elogio:'Elogio',critica:'Crítica',reclamacao:'Reclamação',sugestao:'Sugestão',humor:'Humor',identificacao:'Identificação',relato_pessoal:'Relato pessoal',pedido_conteudo:'Pedido de conteúdo',concordancia:'Concordância',discordancia:'Discordância',marcacao:'Marcação',apoio:'Apoio',interesse_compra:'Interesse comercial',outro:'Outra interação'};
const sentimentNames={positivo:'Positivo',negativo:'Negativo',neutro:'Neutro',misto:'Misto'};
export function labelChip(value,type='intent'){
  const names=type==='sentiment'?sentimentNames:intentNames;
  const tone=type==='sentiment'?['positivo','negativo','misto','neutro'].includes(value)?value:'neutro':['humor','identificacao','pedido_conteudo','interesse_compra','pergunta','elogio','apoio','critica','reclamacao','discordancia','sugestao','relato_pessoal'].includes(value)?value:'intent';
  return `<span class="classification-chip tone-${tone}" title="${type==='sentiment'?'Sentimento':'Tipo de interação'}">${type==='sentiment'?'<span class="status-dot" aria-hidden="true"></span>':I(value==='pergunta'?'message':value==='pedido_conteudo'?'lightbulb':value==='interesse_compra'?'trending':'layers',13)}${esc(names[value]||value)}</span>`;
}
export function commentMarkup(p,text,id,label){
  const username=p.commentMeta?.[id]?.username||'';
  const author=username?`@${username.replace(/^@/,'')}`:'Autor não informado';
  const initials=username?Array.from(username.replace(/^@/,'')).slice(0,2).join('').toUpperCase():'—';
  const fallback=classify(text);
  const tags=label?labelChip(label.sentimento,'sentiment')+[...new Set(label.intencoes||[])].map(v=>labelChip(v)).join(''):labelChip(fallback.sentiment,'sentiment')+(fallback.question?labelChip('pergunta'):'');
  return `<article class="comment conversation-card"><header class="conversation-author"><span class="comment-avatar author-avatar" aria-hidden="true">${esc(initials)}</span><div><strong>${esc(author)}</strong><span class="source-caption">${username?'Username informado pela fonte':'A fonte não forneceu o username'}</span></div><span class="comment-reference">#${String(id+1).padStart(2,'0')}</span></header>
    <blockquote class="audience-quote"><p>${esc(text)}</p></blockquote>
    <div class="classification-row"><span class="classification-caption">${label?'Classificação · IA':'Indicação · regras'}</span><div class="classification-tags">${tags}</div></div>
    ${label?`<section class="ai-reading" aria-label="Interpretação da IA"><div class="ai-reading-label">${I('sparkle',15)} Leitura da IA <span>Interpretação automática</span></div><p>${esc(label.justificativa)}</p>${label.depende_contexto?`<div class="context-warning">${I('info',14)} A interpretação depende de contexto adicional.</div>`:''}</section>`:''}
  </article>`;
}
