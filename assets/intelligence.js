/** Insights e oportunidades calculados exclusivamente sobre rótulos da LLM.
 * Nenhum percentual é extrapolado para além da amostra analisada. */
const RULES = [
  {key:'pedido_conteudo', name:'Pedidos de novos conteúdos', short:'Continuação ou novo formato', title:'Transforme pedidos em um próximo post', action:'Crie uma continuação ou um conteúdo respondendo ao pedido mais recorrente.', icon:'lightbulb', priority:5},
  {key:'pergunta', name:'Perguntas da comunidade', short:'Dúvidas que merecem resposta', title:'Responda às dúvidas da audiência', action:'Produza um vídeo-resposta ou um carrossel de perguntas frequentes.', icon:'message', priority:4},
  {key:'sugestao', name:'Sugestões da audiência', short:'Ideias enviadas pela comunidade', title:'Teste uma sugestão dos comentários', action:'Considere transformar uma sugestão concreta em um novo conteúdo.', icon:'target', priority:4},
  {key:'critica', name:'Críticas e pontos de atenção', short:'Oportunidades de esclarecimento', title:'Esclareça um ponto contestado', action:'Revise o comentário e considere explicar melhor o assunto, sem assumir que toda crítica é válida.', icon:'info', priority:3},
  {key:'reclamacao', name:'Reclamações e fricções', short:'Experiências negativas relatadas', title:'Investigue a reclamação recorrente', action:'Verifique os relatos antes de produzir uma resposta ou mudar o conteúdo.', icon:'info', priority:3},
  {key:'identificacao', name:'Identificação pessoal', short:'Pessoas se reconhecem no conteúdo', title:'Explore situações em que o público se identifica', action:'Crie outra situação do mesmo universo, usando os relatos como referência.', icon:'users', priority:2},
  {key:'humor', name:'Reações de humor', short:'Risadas e respostas bem-humoradas', title:'Explore o tom de humor que funcionou', action:'Considere outro conteúdo com humor semelhante, sem presumir que todos reagiram da mesma forma.', icon:'sparkle', priority:2},
  {key:'relato_pessoal', name:'Relatos pessoais', short:'Experiências compartilhadas', title:'Convide a audiência a contar suas histórias', action:'Crie uma pergunta ou sequência que incentive relatos relacionados ao tema.', icon:'book', priority:2},
  {key:'interesse_compra', name:'Perguntas comerciais', short:'Busca por produto, preço ou link', title:'Esclareça informações de compra', action:'Se o post for comercial, explique disponibilidade, preço ou acesso com transparência.', icon:'trending', priority:1},
];
export const opportunityRules = RULES;
const SENTIMENTS = ['positivo','neutro','negativo','misto'];
const unique = values => [...new Set(values || [])];
const safeId = value => Number.isInteger(value) && value >= 0 ? value : -1;
export function buildIntelligence(ai) {
  if (!ai || !Array.isArray(ai.classificacoes) || !ai.classificacoes.length) return null;
  const rows = ai.classificacoes.filter(row => row && safeId(row.id) >= 0 && typeof row.texto === 'string');
  const total = rows.length;
  if (!total) return null;
  const sentiment = Object.fromEntries(SENTIMENTS.map(k=>[k,rows.filter(r=>r.sentimento===k).length]));
  const categories = RULES.map(rule => {
    const matching = rows.filter(row => unique(row.intencoes).includes(rule.key));
    return {...rule,count:matching.length,percentage:Math.round(matching.length / total * 100),evidence:matching.slice(0,3).map(row=>({id:row.id,text:row.texto,reason:row.justificativa||''}))};
  });
  const active = categories.filter(c=>c.count).sort((a,b)=>b.count-a.count || b.priority-a.priority);
  const topics = Object.entries(ai.assuntos||{}).filter(([name,count])=>typeof name==='string' && Number.isFinite(count) && count>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const opportunities = active.map(category=>({
    id:category.key, title:category.title, action:category.action, count:category.count,
    percentage:category.percentage, evidence:category.evidence,
    confidence:category.count>=3?'Sinal repetido':category.count===2?'Dois comentários':'Sinal inicial',
    priority:category.priority
  })).sort((a,b)=>b.count-a.count || b.priority-a.priority);
  return {total, sentiment, categories:active, topics, opportunities, recommendations:opportunities.slice(0,4),
    uncertain:rows.filter(r=>r.depende_contexto).length,
    caveat:total<10?'Amostra pequena: os sinais abaixo são exploratórios.':'Os resultados descrevem somente os comentários classificados, não toda a audiência.'};
}
/** Identificadores usados para mostrar exatamente os comentários que sustentam um insight. */
export function evidenceFor(ai, ids) {
  const allowed = new Map((ai?.classificacoes||[]).map(r=>[r.id,r]));
  return unique(ids).filter(id=>allowed.has(id)).slice(0,3).map(id=>({id,text:allowed.get(id).texto}));
}
