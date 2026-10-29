import {icon as I} from './icons.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={reels:'Instagram Reels',tiktok:'TikTok',shorts:'YouTube Shorts'};
export const platforms=Object.keys(names);
export function studioView(opportunity,settings={platform:'reels',duration:45,tone:'natural'},result=null,error=''){
  if(!opportunity)return '';
  const script=result?.script;
  return `<section class="studio-panel" aria-label="AI Content Studio">
    <div class="studio-header"><div><span class="eyebrow">AI CONTENT STUDIO · QWEN LOCAL</span><h3>Transforme esta oportunidade em vídeo.</h3><p>Um roteiro pensado para cada plataforma, usando as evidências selecionadas.</p></div>${I('sparkle',27)}</div>
    <div class="studio-platforms" role="group" aria-label="Plataforma">${platforms.map(k=>`<button type="button" class="studio-platform ${settings.platform===k?'selected':''}" data-studio-platform="${k}" aria-pressed="${settings.platform===k}">${esc(names[k])}</button>`).join('')}</div>
    <div class="studio-settings"><label>Duração estimada<select id="studio-duration">${[30,45,60].map(n=>`<option value="${n}" ${settings.duration===n?'selected':''}>${n} segundos</option>`).join('')}</select></label><label>Tom de voz<select id="studio-tone">${[['natural','Natural'],['educativo','Educativo'],['divertido','Divertido']].map(([k,v])=>`<option value="${k}" ${settings.tone===k?'selected':''}>${v}</option>`).join('')}</select></label></div>
    <button type="button" class="btn copper studio-generate" id="studio-generate">${I('sparkle',16)} ${script?'Gerar nova versão':'Gerar roteiro com Qwen'}</button>
    ${error?`<p class="studio-error" role="alert">${esc(error)}</p>`:''}
    ${script?`<div class="studio-result"><div class="studio-result-head"><span class="eyebrow">ROTEIRO · ${esc(names[result.platform])} · ${result.duration}s</span><button class="btn pale small" id="studio-copy">${I('download',14)} Copiar roteiro</button></div>
    <h3>${esc(script.titulo)}</h3><div class="studio-hook"><span>GANCHO</span><p>${esc(script.gancho)}</p></div>
    <div class="studio-scenes">${script.cenas.map(c=>`<article class="studio-scene"><span class="studio-scene-number">${String(c.ordem).padStart(2,'0')}</span><div><strong>O que mostrar</strong><p>${esc(c.visual)}</p><strong>O que falar</strong><p>${esc(c.fala)}</p>${c.texto_tela?`<strong>Texto na tela</strong><p>${esc(c.texto_tela)}</p>`:''}</div></article>`).join('')}</div>
    <div class="studio-result-bottom"><div><strong>Legenda</strong><p>${esc(script.legenda)}</p></div><div><strong>Chamada para ação</strong><p>${esc(script.cta)}</p></div><div><strong>Dica para a plataforma</strong><p>${esc(script.dica_plataforma)}</p></div><div><strong>Observação</strong><p>${esc(script.observacao)}</p></div></div>
    <p class="studio-evidence-note">Baseado em ${script.evidencias_ids.length} evidência(s) da oportunidade. Revise o roteiro e confira os fatos antes de publicar.</p>
    </div>`:''}
  </section>`;
}
export function scriptText(result){
 if(!result?.script)return '';
 const s=result.script;
 return [names[result.platform]||result.platform,`Duração estimada: ${result.duration}s`,`Título: ${s.titulo}`,`Gancho: ${s.gancho}`,
 ...s.cenas.flatMap(c=>[`Cena ${c.ordem}`,`Visual: ${c.visual}`,`Fala: ${c.fala}`,`Texto na tela: ${c.texto_tela}`]),
 `Legenda: ${s.legenda}`,`CTA: ${s.cta}`,`Dica: ${s.dica_plataforma}`,`Observação: ${s.observacao}`].join('\n\n');
}
