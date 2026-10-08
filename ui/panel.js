"use strict";
const data=window.ARMOUR_LIBRARY, advisor=window.ArmourAdvisor;
const $=id=>document.getElementById(id);
let coverageLines=[], coverageStatus='idle', selectedButton;
function el(tag,text,cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; }
function tags(a) {const n=el('div',undefined,'tags'); for(const text of [a.material,a.weight+' lb',...a.layers,...a.coverage]) n.append(el('span',text,'badge'));return n;}
function show(a,button) {
  selectedButton=button; $('detail-title').textContent=a.name; $('detail-tags').replaceChildren(tags(a));
  const content=$('detail-content');content.replaceChildren();
  const facts=el('dl',undefined,'metrics');
  for(const [k,v] of Object.entries(a.facts)) {const cell=el('div',undefined,'metric');cell.append(el('dt',k),el('dd',v||'Not documented'));facts.append(cell);}
  content.append(facts);
  const article=el('div',undefined,'details-article');article.innerHTML=a.article;content.append(article);
  const link=el('a','Wiki source & contributors');link.href=a.source;link.target='_blank';link.rel='noopener noreferrer';content.append(link);
  $('armour-dialog').showModal();content.scrollTop=0;$('close-detail').focus();
}
function row(a,label) {
  const li=el('li'), button=el('button',undefined,'armour-row');button.type='button';
  button.append(el('div',label||a.name),el('div','Sharp '+(a.sharp??'?')+' · Pierce '+(a.pierce??'?')+' · Blunt '+(a.blunt??'?'),'hint'),tags(a));
  button.addEventListener('click',()=>show(a,button));li.append(button);return li;
}
for(const [id,key] of [['material','material'],['body','coverage'],['layer','layers']]) {
  const values=[...new Set(data.armours.flatMap(a=>a[key]))].sort();
  for(const v of values) {const option=el('option',v);option.value=v;$(id).append(option);}
  $(id).addEventListener('change',render);
}
function render() {
  const tokens=$('search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=data.armours.filter(a=>(!$('material').value||a.material===$('material').value)&&(!$('body').value||a.coverage.includes($('body').value))&&(!$('layer').value||a.layers.includes($('layer').value))&&tokens.every(t=>[a.name,a.material,...a.layers,...a.coverage].join(' ').toLowerCase().includes(t)));
  $('armours').replaceChildren(...matches.map(a=>row(a)));$('count').textContent=matches.length+' / '+data.armours.length;$('empty').hidden=matches.length>0;
}
function analyse() {
  const state=advisor.parse(coverageLines,data.armours);
  const known=Object.keys(state.covered);
  const messages={idle:'Type coverage in the MUD to analyse your worn equipment.',waiting:'Waiting for coverage output…',receiving:'Receiving coverage output…',complete:'Latest coverage captured.',empty:'No coverage output recognised. Type coverage again.'};
  $('coverage-status').textContent=messages[coverageStatus]||messages.idle;
  $('coverage-summary').textContent=known.length ? 'Reported: '+known.join(', ')+'.\nRecognised armour: '+(state.worn.map(a=>a.name).join(', ')||'none')+'.\n'+(state.unknown.length?'Unrecognised equipment: '+state.unknown.join('; ')+'. Its protection and occupied layers cannot be inferred. Suggestions may conflict with it.\n':'')+'Body parts omitted by the command are not confirmed bare. Suggestions are wiki-based estimates; each replacement is an alternative to the current set.' : '';
  const list=$('recommendations');list.replaceChildren();
  for(const r of advisor.recommend(state,data,$('priority').value)) {
    list.append(row(r.armour,r.kind+': '+r.armour.name+' — improves '+r.improves.join(', ')));
  }
  if(known.length&&!list.children.length)list.append(el('li','No documented improvement found for this priority.'));
}
$('search').addEventListener('input',render);
$('clear-search').addEventListener('click',()=>{$('search').value='';render();$('search').focus();});
$('priority').addEventListener('change',analyse);
$('close-detail').addEventListener('click',()=>$('armour-dialog').close());
$('armour-dialog').addEventListener('close',()=>{if(selectedButton?.isConnected)selectedButton.focus();});
$('armour-dialog').addEventListener('click',event=>{if(event.target===$('armour-dialog')) {const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
if(window.panel) {
  window.panel.on('coverage',payload=>{if(!payload||!Array.isArray(payload.lines))return;coverageLines=payload.lines.filter(x=>typeof x==='string');coverageStatus=payload.status;analyse();});
  window.panel.post('ready',{});
}
render();analyse();
