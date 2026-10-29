// Importação preserva os autores disponíveis; a LLM recebe apenas o texto.
const stop = new Set('a o as os um uma de da do dos das e é em no na nos nas que com para por se eu você voces vocês meu minha seus suas seu sua esse essa isso mas como não nao sim ja já só muito mais foi ser ter tem onde quando qual quais porque pq pra pro pelo pela ao aos ele ela eles elas nos me isso aqui ali todos todo toda mesmo bem ainda também tambem antes depois sobre ate até'.split(' '));
const question = /\?|\b(como|qual|quais|onde|quando|quanto|por que|porque|alguém sabe|alguem sabe|me indica|pode explicar)\b/i;
const buying = /\b(comprar|onde compra|onde vende|encomendar|buy|purchase)\b|quanto custa|qual (?:o )?(?:preço|preco)|tem link/i;
const positive = /\b(amei|adorei|ótimo|otimo|perfeito|maravilhoso|incrível|incrivel|lindo|excelente|top|love|amazing)\b/i;
const negative = /\b(odiei|péssimo|pessimo|ruim|horrível|horrivel|decepcionado|caro demais|hate|bad)\b/i;
export function classify(text) {
  const pos = positive.test(text), neg = negative.test(text);
  return {question: question.test(text), buying: buying.test(text), sentiment: pos && neg ? 'misto' : neg ? 'negativo' : pos ? 'positivo' : 'neutro'};
}
export function summarize(comments) {
  const terms = new Map(); let questions = 0, buying = 0, positiveCount = 0;
  for (const text of comments) {
    const c = classify(text); questions += +c.question; buying += +c.buying; positiveCount += +(c.sentiment === 'positivo');
    for (const word of (text.toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]{3,}/gu) || [])) {
      if (!stop.has(word)) terms.set(word, (terms.get(word) || 0) + 1);
    }
  }
  return {total: comments.length, questions, buying, positiveCount, terms: [...terms].sort((a,b) => b[1]-a[1]).slice(0,12)};
}
const keyOf = value => String(value).trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function readPath(obj, path) {
  if (obj[path] !== undefined) return obj[path];
  return path.replaceAll('/', '.').split('.').reduce((value, key) => value?.[key], obj);
}
function firstValue(obj, keys) {
  for (const key of keys) { const v = readPath(obj, key); if (typeof v === 'string' && v.trim()) return v; }
  return '';
}
export function normalizeRecords(values) {
  const seen = new Set(), records = [];
  for (const value of values) {
    const obj = typeof value === 'string' ? {text: value} : value;
    if (!obj || typeof obj !== 'object') continue;
    const indexed = Object.fromEntries(Object.entries(obj).map(([k,v]) => [keyOf(k),v]));
    const text = firstValue(indexed, ['text','comment','commenttext','comentario','texto','content','body']).replace(/\r\n?/g,'\n').trim();
    if (!text) continue;
    const username = firstValue(indexed, ['username','ownerusername','authorusername','user.username','owner.username','author.username','user/username','owner/username','author/username','user','author','autor','usuario']).trim().replace(/^@/,'');
    const sourceId = String(obj.sourceId ?? obj.id ?? obj.commentId ?? '').trim();
    // Dois autores podem escrever o mesmo texto. Não os fundir.
    const identity = JSON.stringify([sourceId, username, text]);
    if (seen.has(identity)) continue;
    seen.add(identity); records.push({text, username, sourceId});
    if (records.length >= 5000) break;
  }
  return records;
}
export function normalizeComments(values) { return normalizeRecords(values).map(item => item.text); }
function splitCSV(content, delimiter) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (quoted && content[i+1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && c === delimiter) { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && content[i+1] === '\n') i++;
      row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw Error('CSV com aspas não fechadas. Verifique a exportação.');
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
function detectDelimiter(raw) {
  let quoted = false; const counts = {',':0,';':0,'\t':0};
  for (let i=0;i<raw.length;i++) {
    const c=raw[i];
    if(c==='"') { if(quoted && raw[i+1]==='"') i++; else quoted=!quoted; }
    else if(!quoted && (c==='\n'||c==='\r')) break;
    else if(!quoted && Object.hasOwn(counts,c)) counts[c]++;
  }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}
export function parseFile(text, name='arquivo.csv') {
  const raw = text.replace(/^\uFEFF/,'').trim();
  if (!raw) throw Error('O arquivo está vazio.');
  if (name.toLowerCase().endsWith('.txt')) return normalizeRecords(raw.split(/\r?\n/));
  if (name.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw Error('JSON precisa conter uma lista de comentários.');
    return normalizeRecords(data);
  }
  const rows = splitCSV(raw, detectDelimiter(raw));
  if (!rows.length) throw Error('Nenhuma linha encontrada.');
  const headings = rows[0].map(keyOf);
  const textKeys = ['text','comment','commenttext','comentario','texto','content','body'];
  if (!headings.some(h=>textKeys.includes(h))) {
    if(rows[0].length>1) throw Error('CSV sem coluna de comentário reconhecida. Use text, comment ou texto.');
    return normalizeRecords(rows.map(row=>row[0]));
  }
  return normalizeRecords(rows.slice(1).map(row=>Object.fromEntries(headings.map((h,i)=>[h,row[i]||'']))));
}

/** Associa usernames de uma fonte original a um post antigo, pelo texto exato.
 * Mantém usernames já conhecidos; não inventa autores. */
export function recoverAuthors(post, sourceRecords) {
  if (!post || !Array.isArray(post.comments)) throw Error('Post inválido.');
  const records = normalizeRecords(sourceRecords);
  const buckets = new Map();
  for (const record of records) {
    if (!buckets.has(record.text)) buckets.set(record.text, []);
    buckets.get(record.text).push(record);
  }
  const meta = post.comments.map((text, id) => ({...(post.commentMeta?.[id] || {})}));
  let matched = 0, updated = 0;
  for (let id = 0; id < post.comments.length; id++) {
    const bucket = buckets.get(post.comments[id]);
    if (!bucket?.length) continue;
    const record = bucket.shift();
    matched++;
    if (!meta[id].username && record.username) {
      meta[id].username = record.username;
      updated++;
    }
    if (!meta[id].sourceId && record.sourceId) meta[id].sourceId = record.sourceId;
  }
  if (!matched) throw Error('Nenhum comentário do arquivo corresponde ao post.');
  return {meta, matched, updated, total:post.comments.length};
}
