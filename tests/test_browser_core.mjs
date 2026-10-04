import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.window={};
const {segment,words,retrieve,representative,makePrompt,completeExcerpt}=await import('../docs/browser-api.js');
const text=('Eine Figur wartet im Regen. Dann entscheidet sie sich zu gehen.\n\n').repeat(130);
const ps=segment([{location:'Test','text':text}],'werk');
assert.deepEqual(words(ps.map(p=>p.text).join(' ')),words(text));
for(const p of ps)assert.equal(p.text,text.slice(p.start,p.end));
assert(retrieve(ps,'Regen').length>0);assert.equal(retrieve(ps,'Wüstensand').length,0);
const a={id:'autor',name:'Test',works:[{title:'Werk',passages:ps}],profiles:[{text:'Belegtes Profil'}],feedback:[{rule:'Aktive Regel',active:true},{rule:'INAKTIV',active:false}]};
const prompt=makePrompt(a,'write',{task:'Eine Szene im Regen',length:800});
assert(prompt.text.includes('Aktive Regel'));assert(!prompt.text.includes('INAKTIV'));assert(prompt.text.includes('Belegtes Profil'));assert(prompt.passage_ids.length>0);
assert.throws(()=>makePrompt(a,'write',{}));assert.throws(()=>makePrompt(a,'review',{}));
console.log('PASS: browser segmentation, provenance, retrieval, profile/rules, required input');

const toc={id:'toc',work_id:'w',text:Array.from({length:40},(_,i)=>`${i}. Kapitel`).join('\n')};
const prose=Array.from({length:60},(_,i)=>({id:String(i),work_id:'w',text:'Eine Figur öffnete den Brief und sah lange aus dem Fenster. '.repeat(12)}));
assert.deepEqual(representative([toc,...prose]).map(p=>p.id),['5','15','25','35','45','55']);
assert.deepEqual(representative([toc]),[]);
console.log('PASS: contents excluded, evenly distributed sample, no unsuitable fallback');

const mixed={...a,works:[{title:'Werk',passages:[toc,...ps]}]};
const corrected=makePrompt(mixed,'analyse',{selected:['toc']});
assert(!corrected.passage_ids.includes('toc'));assert(corrected.passage_ids.length>0);
console.log('PASS: explicit stale contents selection cannot enter analysis prompt');

const units=[{location:'PDF-Seite 1',text:'Ein vollständiger Satz. Im Tanz brach eine heimliche'},{location:'PDF-Seite 2',text:'Leidenschaft aus ihr hervor. Danach schwieg sie. Ein langer Folgesatz ohne Ende'}];
const passage={id:'p',location:units[0].location,start:23,end:units[0].text.length,text:units[0].text.slice(23)};
const full=completeExcerpt({units},passage);assert(full.text.endsWith('hervor.'));assert.equal(full.sources.length,2);
for(const source of full.sources)assert(full.text.includes(units.find(u=>u.location===source.location).text.slice(source.start,source.end)));
assert.equal(completeExcerpt({units},{...passage,start:0,end:70},30).text,'Ein vollständiger Satz.');
console.log('PASS: cross-page sentences, exact source spans, sentence-safe length cap');
