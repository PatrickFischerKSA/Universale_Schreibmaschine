const $=id=>document.getElementById(id),token=document.querySelector('meta[name="workshop-token"]').content;
let serverKeyConfigured=false;let library=[],current=null,selection=new Set(),promptMeta=null,timer,saveQueue=Promise.resolve();
const workspaceFields=['task','genre','length','profile','draft','prompt','before','after','reason','rule','response','reviewResponse','draftA','storyContext','reflection','reviewFocus','abSourceIds','plotState','plotAnswer','writingMode','freeThoughts','freeDiscourse','fanForm','fanAnchor'];
const msg=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error)};
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
async function api(path,data){const r=await fetch('/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Workshop-Token':token},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();if(!r.ok)throw Error(result.error||'Verarbeitung fehlgeschlagen.');return result;}
function run(fn){return async event=>{const b=event?.currentTarget;try{if(b?.tagName==='BUTTON')b.disabled=true;await fn(event);}catch(e){msg(e.message,true);}finally{if(b?.tagName==='BUTTON')b.disabled=false;}}}
function download(name,text,type='application/json'){const u=URL.createObjectURL(new Blob([text],{type}));const a=node('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function requireAuthor(){if(!current)throw Error('Zuerst ein Autorenprofil wählen.');return current.id;}
function wordCount(s){return(s.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length}
function feedback(){
 const count=current?.works.length||0;
 $('corpusFeedback').textContent=!count?'Füge ein Werk hinzu. Mehrere Werke helfen, Unterschiede innerhalb eines Autors zu erkennen.':`${count} Werk${count===1?'':'e'} im Korpus. ${count===1?'Aussagen zunächst auf dieses Werk beschränken.':'Vergleiche Merkmale zwischen den Werken.'} Prüfe einige Passagen auf Lesereihenfolge, Fussnoten und Verlagsmaterial.`;
 const profile=$('profile').value.trim();$('profileFeedback').textContent=profile?'Prüfe jede wesentliche Aussage: Ist eine vorhandene Passage-ID oder eine genaue Fundstelle angegeben? Unterscheide Beobachtung und Deutung. Speichere erst dann eine neue Profilversion.':'Noch kein literarisches Profil. Lass ausgewählte Passagen untersuchen oder trage eigene belegte Beobachtungen ein.';
 const n=wordCount($('draft').value),target=Number($('length').value)||800;let hints=[`${n} Wörter · Ziel: etwa ${target}.`];
 if(n>target*1.15)hints.push('Prüfe wiederholte Erklärungen und Nebenhandlungen auf Kürzung.');
 if(n&&n<target*.75)hints.push('Baue eine entscheidende Situation mit Wahrnehmung, Motiv und Folge aus.');
 if($('draft').value.includes('ß'))hints.push('Schweizer Rechtschreibung: eigenes ß durch ss ersetzen.');
 if(/[„“”]/.test($('draft').value))hints.push('Verwende «Guillemets» für direkte Rede.');
 if(n)hints.push('Am Text prüfen: Wird die Entscheidung aus der Situation verständlich? Welche aktive Feedbackregel ist konkret umgesetzt?');
 $('draftFeedback').textContent=hints.join('\n');
 $('ruleFeedback').textContent=$('before').value&&$('before').value===$('after').value?'Alte und neue Stelle sind identisch. Zeige die beabsichtigte Änderung.':'Formuliere eine Regel, die sich am nächsten Text überprüfen lässt. «Weniger erklären» wird genauer durch eine konkrete Stelle und die gewünschte Wirkung.';
}
function render(a,fill=false){
 current=a;library=library.map(x=>x.id===a.id?a:x);$('workspace').hidden=false;$('importAuthor').hidden=true;$('corpusTools').hidden=false;
 if(fill){for(const id of workspaceFields)$(id).value=a.workspace[id]??(id==='length'?'800':id==='genre'?'Erzählung':id==='reviewFocus'?'Aufbau und Figuren':'');if(!a.workspace.profile)$('profile').value=a.profiles.at(-1)?.text||'';selection.clear();promptMeta=null;$('prompt').value='';$('prompt').scrollTop=0;$('passages').replaceChildren();$('coverage').textContent='';}
 $('corpusCount').textContent=a.metrics.passages+' Passagen';$('works').replaceChildren();
 for(const w of a.works){const d=node('details');d.append(node('summary',w.title+' · '+w.passages.length+' Passagen'));d.append(node('p','Datei: '+w.filename+' · importiert '+w.imported,'small'));for(const warning of w.warnings)d.append(node('p',warning,'small'));const b=node('button','Passagen dieses Werks ansehen','secondary');b.type='button';b.onclick=()=>showPassages(w.passages.map(p=>({...p,title:w.title})));d.append(b);$('works').append(d);}
 $('metrics').replaceChildren();for(const [n,l]of [[a.metrics.words,'Wörter'],[a.metrics.passages,'Passagen'],[a.metrics.mean_sentence,'Wörter pro Satz, grob']]){const e=node('div',undefined,'metric');e.append(node('b',n),node('small',l));$('metrics').append(e);}
 $('profileHistory').replaceChildren();for(const p of [...a.profiles].reverse()){const d=node('details');d.append(node('summary','Profilversion '+p.version+' · '+p.date),node('p',p.text,'passage'));$('profileHistory').append(d);}
 $('draftHistory').replaceChildren();for(const d of [...a.drafts].reverse()){const box=node('details');box.append(node('summary','Fassung vom '+d.date+' · Profil '+d.profile_version),node('p',d.text,'passage'));const b=node('button','In Arbeitsfeld laden','secondary');b.onclick=async()=>{if($('draft').value&&!confirm('Aktuellen Arbeitsentwurf durch diese gesicherte Fassung ersetzen?'))return;$('draft').value=d.text;feedback();queueSave();};box.append(b);$('draftHistory').append(box);}
 $('rules').replaceChildren();for(const f of [...a.feedback].reverse()){const d=node('details');d.append(node('summary',(f.active?'Aktiv · ':'Pausiert · ')+f.rule));d.append(node('p','Vorher: '+f.before),node('p','Nachher: '+f.after),node('p','Begründung: '+f.reason));const b=node('button',f.active?'Regel pausieren':'Regel aktivieren','secondary');b.onclick=run(async()=>render(await api('toggle',{author_id:a.id,id:f.id})));d.append(b);$('rules').append(d);}
 feedback();selectionStatus();previewSample(a.id);if(fill&&a.workspace.prompt)rebuildSavedPrompt(a);
}
function selectionStatus(){$('selectionInfo').textContent=selection.size?selection.size+' Passagen ausgewählt (höchstens 8). Ohne Auswahl wird automatisch eine begrenzte Auswahl zusammengestellt.':'Ohne eigene Auswahl verwendet die Analyse die vorgeschlagene Stichprobe.';}
function showPassages(ps,target='passages',chosen=selection){ $(target).replaceChildren();if(!ps.length)$(target).append(node('p','Keine Treffer. Versuche andere Wörter oder «Passagen ansehen».'));for(const p of ps){const d=node('details'),s=node('summary',p.title+' · '+p.location);d.append(s);const l=node('label'),check=node('input');check.type='checkbox';check.checked=chosen.has(p.id);check.onchange=()=>{if(check.checked&&chosen.size>=8){check.checked=false;msg('Höchstens acht Passagen auswählen.',true);return;}check.checked?chosen.add(p.id):chosen.delete(p.id);selectionStatus();if(target==='abPassages'){ $('abSourceIds').value=JSON.stringify([...chosen]);updateAB();queueSave(); } };l.append(check,document.createTextNode('Für den nächsten Auftrag auswählen'));d.append(l,node('small','ID '+p.id+' · Zeichen '+p.start+'–'+p.end),node('div',p.text,'passage'));$(target).append(d);}}
async function refresh(selectId){const res=await api('library');serverKeyConfigured=!!res.key_configured;library=res.authors;$('authorSelect').replaceChildren(node('option','Autorin oder Autor wählen'));$('authorSelect').firstChild.value='';for(const a of library){const o=node('option',a.name);o.value=a.id;$('authorSelect').append(o);}if(selectId){$('authorSelect').value=selectId;const a=library.find(x=>x.id===selectId);if(a)render(a,true);}if(res.key_configured)$('keyStatus').textContent='Ein serverseitiger API-Schlüssel ist eingerichtet. Dieses Feld kann leer bleiben.';}
function queueSave(){if(!current)return;clearTimeout(timer);const authorId=current.id,data=Object.fromEntries(workspaceFields.map(id=>[id,$(id).value]));$('saveState').textContent='Speichern …';timer=setTimeout(()=>persist(authorId,data),500);}
function persist(authorId,data){saveQueue=saveQueue.then(()=>api('workspace',{author_id:authorId,workspace:data})).then(a=>{const index=library.findIndex(x=>x.id===a.id);if(index>=0)library[index]=a;if(current?.id===a.id){current=a;$('saveState').textContent='Lokal gespeichert.';}}).catch(e=>{$('saveState').textContent='Nicht gespeichert: '+e.message;});return saveQueue;}
async function flush(){clearTimeout(timer);if(current)await persist(current.id,Object.fromEntries(workspaceFields.map(id=>[id,$(id).value])));}
for(const id of workspaceFields)$(id).addEventListener('input',()=>{feedback();queueSave();});
$('authorForm').onsubmit=run(async e=>{e.preventDefault();await flush();const a=await api('authors',{name:$('authorName').value});$('authorName').value='';await refresh(a.id);msg('Autorenprofil angelegt. Füge jetzt Werke hinzu.');});
$('authorSelect').onchange=run(async()=>{await flush();const a=library.find(a=>a.id===$('authorSelect').value);if(a){render(a,true);msg(a.name+' geöffnet.');}else{current=null;$('workspace').hidden=true;$('importAuthor').hidden=false;$('corpusTools').hidden=true;$('corpusCount').textContent='';msg('Name eintragen und ein Werk hochladen.');}});
$('files').onclick=event=>{if(!current&&!$('importAuthorName').value.trim()){event.preventDefault();$('importAuthorName').focus();msg('Trage zuerst die Autorin oder den Autor des Werks ein.',true);}};
$('files').onchange=run(async()=>{const files=Array.from($('files').files);if(!files.length)return;if(!current){const name=$('importAuthorName').value.trim();if(!name)throw Error('Autorin oder Autor fehlt.');const existing=library.find(a=>a.name.toLocaleLowerCase()===name.toLocaleLowerCase());const a=existing||await api('authors',{name});await refresh(a.id);}const id=requireAuthor();await flush();$('files').disabled=true;let ok=0;const errors=[];try{for(const f of files){try{if(f.size>250_000_000)throw Error('Diese Datei ist grösser als 250 MB. Bitte in Bände aufteilen.');msg('Korpus wird erstellt: '+f.name+' – grosse Werke können einige Minuten benötigen.');let a;if(window.browserAPI){a=await api('import',{author_id:id,filename:f.name,title:f.name.replace(/\.[^.]+$/,''),file:f,onProgress:text=>msg(f.name+' · '+text)});}else{const response=await fetch('/api/import-file?'+new URLSearchParams({author_id:id,filename:f.name}),{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Workshop-Token':token},body:f});const result=await response.json();if(!response.ok)throw Error(result.error||'Import fehlgeschlagen.');a=result;}if(current?.id===id)render(a);ok++;}catch(e){errors.push(f.name+': '+e.message);}}msg(ok+' Werke importiert.'+(errors.length?' '+errors.join(' '):''),!!errors.length);}finally{$('files').disabled=false;$('files').value='';}});
$('search').onclick=run(async()=>showPassages((await api('search',{author_id:requireAuthor(),query:$('query').value})).passages));$('browse').onclick=run(async()=>showPassages(current.works.flatMap(w=>w.passages.map(p=>({...p,title:w.title}))).slice(0,30)));
async function prepare(kind){await flush();promptMeta=await api('prompt',{author_id:requireAuthor(),kind,mode:isFree()?'free':'fan',thoughts:$('freeThoughts').value,discourse:$('freeDiscourse').value,form:$('fanForm').value,anchor:$('fanAnchor').value,selected:kind==='review'?[...abSources()]:selection.size?[...selection]:kind==='write'&&current.id==='example-reuter-aus-guter-familie-v1'?(current.profiles.at(-1)?.source_ids||[]):[],task:$('task').value,genre:$('genre').value,length:$('length').value,draft:$('draft').value,plot:kind==='analyse'?'':plotBrief(readPlot(),true),...(kind==='review'?{draft_a:$('draftA').value,context:$('storyContext').value,focus:$('reviewFocus').value}:{})});$('prompt').value=promptMeta.text;$('prompt').scrollTop=0;$('coverage').textContent='Materialauswahl: '+promptMeta.coverage+'. Enthaltene IDs: '+promptMeta.passage_ids.join(', ');queueSave();msg('Auftrag bereit. Du kannst ihn kopieren oder im API-Modus senden.');$('prompt').scrollIntoView({block:'center'});}
$('analyse').onclick=run(()=>prepare('analyse'));$('write').onclick=run(()=>prepare('write'));$('review').onclick=run(()=>prepare('review'));
$('copy').onclick=run(async()=>{if(!$('prompt').value)throw Error('Zuerst einen Auftrag vorbereiten.');try{await navigator.clipboard.writeText($('prompt').value);msg('Prompt kopiert. In ChatGPT einfügen.');}catch{$('prompt').focus();$('prompt').select();msg('Prompt markiert. Mit ⌘+C oder Strg+C kopieren.');}});
$('mode').onchange=()=>{$('apiSettings').hidden=$('mode').value!=='api';$('send').disabled=$('mode').value!=='api';};$('mode').onchange();
$('send').onclick=run(async()=>{if($('mode').value!=='api')throw Error('Wähle zuerst die direkte KI-Anbindung.');if(!$('prompt').value)throw Error('Zuerst einen Auftrag vorbereiten.');if(!$('model').value.trim())throw Error('Modell-ID eintragen.');if($('response').value&&!confirm('Die vorhandene Antwort durch eine neue API-Antwort ersetzen?'))return;const authorId=requireAuthor();msg('KI bearbeitet den sichtbaren Auftrag …');const r=await api('generate',{prompt:$('prompt').value,model:$('model').value.trim(),key:$('key').value});if(current?.id!==authorId){msg('Autorenprofil wurde gewechselt; Antwort nicht zugeordnet. Bitte beim Generieren im Profil bleiben.',true);return;}$('response').value=r.text;queueSave();msg(r.status==='completed'?'KI-Antwort eingetroffen. Prüfen und gezielt übernehmen.':'Antwort eingetroffen, aber möglicherweise unvollständig ('+r.status+').',r.status!=='completed');});
function transfer(to){if(! $('response').value.trim())throw Error('Es fehlt eine Antwort.');if($(to).value&&!confirm('Vorhandenen Inhalt im Arbeitsfeld ersetzen? Gesicherte Versionen bleiben erhalten.'))return;$(to).value=$('response').value;feedback();queueSave();}
$('toProfile').onclick=run(()=>transfer('profile'));$('toDraft').onclick=run(()=>transfer('draft'));
$('saveProfile').onclick=run(async()=>{await flush();render(await api('profile',{author_id:requireAuthor(),text:$('profile').value,source_ids:promptMeta?.kind==='analyse'?promptMeta.passage_ids:[]}));msg('Neue Profilversion gespeichert. Sie wird in künftigen Aufträgen verwendet.');});
$('saveDraft').onclick=run(async()=>{await flush();render(await api('draft',{author_id:requireAuthor(),text:$('draft').value,prompt:$('prompt').value}));msg('Textfassung gesichert.');});
$('saveRule').onclick=run(async()=>{await flush();render(await api('feedback',{author_id:requireAuthor(),before:$('before').value,after:$('after').value,reason:$('reason').value,rule:$('rule').value,draft_id:current.drafts.at(-1)?.id}));msg('Feedback gespeichert. Die aktive Regel wird im nächsten Auftrag berücksichtigt.');});
$('exportText').onclick=run(()=>{requireAuthor();download('schreibmaschine-text.txt',$('draft').value,'text/plain;charset=utf-8');});
$('backup').onclick=run(async()=>{await flush();download('schreibmaschine-bibliothek.json',JSON.stringify(await api('backup'),null,2));msg('Bibliothek exportiert.');});
$('restore').onchange=run(async()=>{const f=$('restore').files[0];if(!f)return;try{if(f.size>60_000_000)throw Error('Bibliotheksdatei zu gross.');await flush();const r=await api('restore',{library:JSON.parse(await f.text())});await refresh(current?.id);msg(r.count+' Autorenprofile als zusätzliche Kopien importiert.');}finally{$('restore').value='';}});
refresh().catch(e=>msg(e.message,true));

window.addEventListener("beforeunload",event=>{if($("saveState").textContent==="Speichern …"){event.preventDefault();event.returnValue="";}});

async function previewSample(id){try{const r=await api('sample',{author_id:id});if(current?.id!==id)return;const box=$('autoSelection');box.replaceChildren(node('h3','Vorgeschlagene Textauswahl'),node('p',`${r.passages.length} Ausschnitte aus ${r.total} Passagen. ${r.excluded} Passagen wegen Verzeichnismerkmalen, Verlagsangaben oder Kürze ausgelassen. Die Originaltexte bleiben vollständig erhalten.`,'small'));for(const p of r.passages){const d=node('details');d.append(node('summary',p.title+' · '+p.location),node('p',p.text,'passage'));box.append(d);}box.append(node('p','Auswahlverfahren: gleichmässig über die verbleibenden Textpassagen verteilt. Noch keine literarische Bewertung oder Analyse des Gesamtwerks.','small'));}catch(e){if(current?.id===id)$('autoSelection').textContent=e.message;}}

async function rebuildSavedPrompt(a){const old=a.workspace.prompt;const kind=/Analysiere die ausgewählten Passagen/.test(old)?'analyse':/ENTWURF:/.test(old)?'review':'write';try{const r=await api('prompt',{author_id:a.id,kind,task:a.workspace.task||'',genre:a.workspace.genre||'Prosa',length:a.workspace.length||800,draft:a.workspace.draft||''});if(current?.id!==a.id||promptMeta)return;promptMeta=r;$('prompt').value=r.text;$('prompt').scrollTop=0;$('coverage').textContent='Gespeicherten Auftrag mit der aktuellen Textauswahl neu erstellt. '+r.coverage+' Passagen.';queueSave();}catch(e){if(current?.id===a.id&&!promptMeta)$('coverage').textContent='Alter Prompt wird nicht wiederverwendet. '+e.message;}}

// Literary names are not contact/account fields. Reject email autofill locally.
function clearContactAutofill(){for(const id of ['authorName','importAuthorName']){const field=$(id);if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()))field.value='';}}
for(const id of ['authorName','importAuthorName'])for(const event of ['input','change','blur'])$(id).addEventListener(event,clearContactAutofill);
window.addEventListener('pageshow',clearContactAutofill);clearContactAutofill();

// Multiline controls are excluded from browser contact-autofill heuristics.
for(const id of ['authorName','importAuthorName'])$(id).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(id==='authorName')$('authorForm').requestSubmit();else $('files').click();}});

// Guided workflow: each answer has exactly one destination.
const stages=['corpus','profileSection','material','plot','writing','learning','settings'];
const stageNames=['Werke laden','Autorenprofil erstellen','Geschichte schreiben','Überarbeiten','Sicherung & Betriebsart'];
let activeStage='corpus',stagePrompts={};
function isCopiedPrompt(text){return /^\s*Autorenbibliothek:/i.test(text)&&/QUELLENAUSSCHNITTE|GEPRÜFTES PROFIL/.test(text);}
function isAnalysis(text){return /vergleichendes?\s+(Arbeits|Stil)profil|##\s*.*Syntax und Rhythmus/i.test(text)||(/Beobachtung[\s\S]*Deutung[\s\S]*Schreibregel/i.test(text)&&/Passage|Stilprofil/i.test(text));}
function showStage(id,scroll=true){if(id==='profileSection'&&isFree())id='material';if(id!=='corpus'&&id!=='settings'&&!current){msg('Lade zuerst ein Werk oder wähle eine Autorenbibliothek.',true);id='corpus';}activeStage=id;const revising=id==='learning';document.querySelector('label[for="draft"]').textContent=revising?'Fassung B · Arbeitsfassung':'Deine Geschichte';(revising?$('revisionEditor'):$('writing')).append($('storyEditor'));$('saveDraft').textContent=revising?'Überarbeitete Fassung sichern':($('draftA').value?'Arbeitsfassung sichern → Überarbeiten':'Fassung A sichern → Überarbeiten');for(const section of stages)$(section).hidden=section!==id;for(const link of document.querySelectorAll('nav a')){if(link.hash==='#'+id)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}if(scroll)$(id).scrollIntoView({block:'start'});updateJourney();}
function updateJourney(){const hasWorks=!!current?.works.length,hasProfile=!!current?.profiles.length;const invalidDraft=isCopiedPrompt($('draft').value)||isAnalysis($('draft').value);$('nextProfile').disabled=!hasWorks;$('write').disabled=!hasProfile;$('review').disabled=!$('draft').value.trim()||invalidDraft;$('profileReady').textContent=hasProfile?'Gespeichertes Autorenprofil wird in deinen Schreibauftrag aufgenommen.':'Für einen KI-Schreibauftrag speichere zuerst das Autorenprofil in Schritt 2. Selbst schreiben kannst du hier jederzeit.';$('nextHint').textContent=!hasWorks?'Nächster Schritt: Werk hochladen.':!hasProfile?'Nächster Schritt: Analyseantwort in Schritt 2 einfügen, prüfen und als Profil speichern.':!$('draft').value.trim()?'Nächster Schritt: Geschichte in Schritt 3 planen und schreiben.':invalidDraft?'Im Geschichtenfeld steht offenbar eine Analyse oder ein Auftrag. Der Text bleibt erhalten; ordne ihn dem passenden Schritt zu.':activeStage==='learning'?($('reviewResponse').value.trim()?'Überarbeite deine Geschichte anhand der Rückmeldung und sichere die neue Fassung.':'Erstelle einen Überarbeitungsauftrag oder bearbeite deine Geschichte direkt unten.'):'Deine Geschichte ist vorhanden. In Schritt 4 kannst du eine Rückmeldung vorbereiten.';$('recoverProfile').hidden=!isAnalysis($('draft').value)||isCopiedPrompt($('draft').value);for(const kind of ['analyse','write','review'])$('api-'+kind).hidden=window.browserAPI?!gatewayMode():$('mode').value!=='api';}
for(const link of document.querySelectorAll('nav a'))link.addEventListener('click',e=>{e.preventDefault();showStage(link.hash.slice(1));});
$('nextProfile').onclick=()=>showStage('profileSection');
const originalFeedback=feedback;feedback=function(){originalFeedback();if(isCopiedPrompt($('draft').value))$('draftFeedback').textContent='Hier steht ein kopierter Auftrag, noch keine Geschichte. Sende den Auftrag in ChatGPT ab und füge anschliessend die Antwort hier ein.';else if(isAnalysis($('draft').value))$('draftFeedback').textContent='Dieser Text sieht nach einer Stilanalyse aus. Sie gehört ins Autorenprofil in Schritt 2. Du kannst sie mit dem Button unten dorthin kopieren; dieser Text bleibt erhalten.';updateJourney();};
const originalRender=render;render=function(a,fill=false){originalRender(a,fill);if(fill){renderPlot();$('abPassages').replaceChildren();$('abQuery').value='';stagePrompts={};for(const kind of ['analyse','write','review']){$('exchange-'+kind).hidden=true;$('prompt-'+kind).value='';$('note-'+kind).textContent='';}showStage(isFree()?'material':!a.works.length?'corpus':a.profiles.length?(a.workspace.draft?'writing':'plot'):'profileSection',false);}else showStage(activeStage,false);};
// Generated prompts are recreated explicitly in their own step; legacy text remains in backups.
rebuildSavedPrompt=async()=>{};
const originalAuthorChange=$('authorSelect').onchange;$('authorSelect').onchange=async e=>{await originalAuthorChange(e);if(!current)showStage('corpus',false);};
prepare=async function(kind){requireAuthor();if(kind==='write'&&!isFree()&&!current.profiles.length)throw Error('Speichere zuerst das Autorenprofil in Schritt 2.');if(kind==='review'&&(isCopiedPrompt($('draft').value)||isAnalysis($('draft').value)))throw Error('Für die Überarbeitung fehlt eine Geschichte. Im Geschichtenfeld steht eine Analyse oder ein Auftrag.');await flush();const authorId=current.id;const r=await api('prompt',{author_id:authorId,kind,mode:isFree()?'free':'fan',thoughts:$('freeThoughts').value,discourse:$('freeDiscourse').value,form:$('fanForm').value,anchor:$('fanAnchor').value,selected:kind==='review'?[...abSources()]:selection.size?[...selection]:kind==='write'&&current.id==='example-reuter-aus-guter-familie-v1'?(current.profiles.at(-1)?.source_ids||[]):[],task:$('task').value,genre:$('genre').value,length:$('length').value,draft:$('draft').value,plot:kind==='analyse'?'':plotBrief(readPlot(),true),...(kind==='review'?{draft_a:$('draftA').value,context:$('storyContext').value,focus:$('reviewFocus').value}:{})});if(current?.id!==authorId)return;stagePrompts[kind]=r;promptMeta=r;$('prompt').value=r.text;$('prompt-'+kind).value=r.text;$('prompt-'+kind).scrollTop=0;$('exchange-'+kind).hidden=false;$('note-'+kind).textContent='Auftrag bereit. Kopiere ihn jetzt nach ChatGPT. Die Antwort gehört in das Feld direkt darunter.';queueSave();$('exchange-'+kind).scrollIntoView({block:'start'});msg('Auftrag erstellt. Jetzt kopieren und in ChatGPT absenden.');};
for(const kind of ['analyse','write','review']){
 $('copy-'+kind).onclick=run(async()=>{const field=$('prompt-'+kind);if(!field.value)throw Error('Erstelle zuerst den Auftrag in diesem Schritt.');try{await navigator.clipboard.writeText(field.value);$('note-'+kind).textContent='Kopiert. In ChatGPT einfügen und absenden. Kopiere danach nur die Antwort zurück.';}catch{field.closest('details').open=true;field.focus();field.select();$('note-'+kind).textContent='Auftrag markiert: mit ⌘C oder Strg+C kopieren, dann in ChatGPT einfügen.';}});
 $('api-'+kind).onclick=run(async()=>{const prompt=$('prompt-'+kind).value;if(!prompt)throw Error('Zuerst den Auftrag erstellen.');if(window.browserAPI)return requestGateway(kind,prompt);if(!$('model').value.trim()){showStage('settings');$('model').focus();throw Error('Trage deine Modell-ID unter Betriebsart ein.');}const target={analyse:'profile',write:'draft',review:'reviewResponse'}[kind];if($(target).value&&!confirm('Den vorhandenen Text in diesem Arbeitsfeld durch die KI-Antwort ersetzen? Gespeicherte Versionen bleiben erhalten.'))return;const id=current.id;$('note-'+kind).textContent='KI erstellt die Antwort …';const result=await api('generate',{prompt,model:$('model').value.trim(),key:$('key').value});if(current?.id!==id)return;$(target).value=result.text;feedback();queueSave();$('note-'+kind).textContent='Antwort eingefügt. Lies und prüfe sie, bevor du sie speicherst.';});
}
const originalMode=$('mode').onchange;$('mode').onchange=()=>{originalMode();updateJourney();};
$('saveProfile').onclick=run(async()=>{const text=$('profile').value.trim();if(!text)throw Error('Füge zuerst die Analyseantwort in das Profilfeld ein.');if(isCopiedPrompt(text))throw Error('Im Profilfeld steht der Auftrag. Hier gehört die Antwort von ChatGPT hinein.');await flush();render(await api('profile',{author_id:requireAuthor(),text,source_ids:stagePrompts.analyse?.passage_ids||[]}));showStage('plot');msg('Autorenprofil gespeichert. Plane jetzt Figuren und Handlung.');});
$('saveDraft').onclick=run(async()=>{const text=$('draft').value.trim();if(!text)throw Error('Schreibe eine Geschichte oder füge die Geschichte aus ChatGPT ein.');if(isCopiedPrompt(text)||isAnalysis(text))throw Error('Dieser Text ist ein Auftrag oder eine Analyse. Bitte in Schritt 2 als Profil verwenden; als Geschichte wird er nicht gespeichert.');if(!$('draftA').value.trim())$('draftA').value=text;await flush();render(await api('draft',{author_id:requireAuthor(),text,prompt:stagePrompts.write?.text||''}));const revising=activeStage==='learning';showStage('learning',!revising);$('revisionSaved').textContent=revising?'Neue Fassung gesichert. Du kannst weiterarbeiten oder die Geschichte herunterladen.':'Geschichte gesichert. Hole jetzt eine Rückmeldung ein oder überarbeite den Text direkt.';msg($('revisionSaved').textContent);});
$('recoverProfile').onclick=run(()=>{if($('profile').value&&!confirm('Den aktuellen Profiltext durch diese Analyse ersetzen? Gespeicherte Profilversionen bleiben erhalten.'))return;$('profile').value=$('draft').value;feedback();queueSave();showStage('profileSection');msg('Analyse ins Profilfeld kopiert. Prüfe sie und klicke «Profil speichern».');});
$('toProfile').onclick=run(()=>{if(isCopiedPrompt($('response').value))throw Error('Das ist ein Auftrag. Bitte in ChatGPT absenden und die Analyseantwort verwenden.');transfer('profile');showStage('profileSection');});
$('toDraft').onclick=run(()=>{if(isCopiedPrompt($('response').value)||isAnalysis($('response').value))throw Error('Dieser Text gehört zum Autorenprofil, nicht in die Geschichte.');transfer('draft');showStage('writing');});
// Keep recovery accessible when an old analysis was accidentally stored as a story.
const recovery=node('button','Analyse aus dem bisherigen Geschichtenfeld holen','secondary');recovery.type='button';recovery.id='profileRecovery';recovery.onclick=()=>$('recoverProfile').click();$('profile').before(recovery);
const baseUpdateJourney=updateJourney;updateJourney=function(){baseUpdateJourney();$('profileRecovery').hidden=!isAnalysis($('draft').value)||isCopiedPrompt($('draft').value);};
showStage('corpus',false);

// Direct API edition: one action creates the prompt and the answer in-place.
let generationBusy=false,returnFromSettings='profileSection';
const directMode=()=>!window.browserAPI&&$('mode').value==='api';
const copyJourney=document.querySelector('#journey p').textContent;
const profileHelp=$('profileSection').querySelector('p.small'),copyProfileHelp=profileHelp.textContent;
const draftHelp=$('draft').previousElementSibling,copyDraftHelp=draftHelp.textContent;const reviewHelp=$('learning').querySelector('h2+p'),copyReviewHelp=reviewHelp.textContent;
const apiJourney=updateJourney;updateJourney=function(){apiJourney();if(directMode()&&current?.works.length&&!current.profiles.length)$('nextHint').textContent=$('profile').value.trim()?'Autorenprofil prüfen und speichern.':'In Schritt 2 «Autorenprofil erstellen» anklicken.';};
function syncApiUI(){
 const direct=directMode();$('apiBanner').hidden=!direct;draftHelp.textContent=direct?'Hier erscheint die erzeugte Geschichte. Du kannst sie jederzeit selbst bearbeiten.':copyDraftHelp;reviewHelp.textContent=direct?'Klicke auf «Rückmeldung erhalten». Überarbeite danach deine Geschichte neben den Vorschlägen und sichere die neue Fassung.':copyReviewHelp;profileHelp.textContent=direct?'Das erzeugte Profil erscheint hier. Prüfe die Belege, passe es bei Bedarf an und speichere es.':copyProfileHelp;
 document.querySelector('#journey p').textContent=direct?'Die KI schreibt direkt in das passende Feld. Prüfe das Ergebnis und sichere danach eine Fassung.':copyJourney;
 for(const [kind,label] of Object.entries({analyse:'Autorenprofil erstellen',write:'Geschichte schreiben',review:'Rückmeldung erhalten'})){
  $(kind==='analyse'?'analyse':kind==='write'?'write':'review').textContent=direct?label:{analyse:'Analyseauftrag erstellen',write:'Schreibauftrag erstellen',review:'Überarbeitungsauftrag erstellen'}[kind];
  const box=$('exchange-'+kind);box.querySelector('h3').textContent=direct?'KI-Auftrag und Ergebnis':'Auftrag an ChatGPT übergeben';
  box.querySelector('p').hidden=direct;box.querySelector('.actions').hidden=direct;
 }
 document.querySelector('label[for="profile"]').textContent=direct?'Autorenprofil · KI-Ergebnis zum Prüfen':'Antwort von ChatGPT: Autorenprofil';
 document.querySelector('label[for="reviewResponse"]').textContent=direct?'Verbesserungsvorschläge der KI':'Antwort von ChatGPT: Verbesserungsvorschläge';
 $('apiConnection').textContent=$('model').value.trim()&&(serverKeyConfigured||$('key').value.trim())?' Konfiguriert · Verbindung noch nicht geprüft.':' Modell und API-Schlüssel einrichten.';
}
$('configureApi').onclick=()=>{returnFromSettings=activeStage;showStage('settings');$('key').focus();};
$('useApi').onclick=()=>{if(!$('model').value.trim()||(!serverKeyConfigured&&!$('key').value.trim())){msg('Bitte Modell-ID und API-Schlüssel eintragen.',true);return;}syncApiUI();showStage(current?returnFromSettings:'corpus');msg('API eingerichtet. Der nächste KI-Button erstellt das Ergebnis direkt hier.');};
const guidedModeChange=$('mode').onchange;$('mode').onchange=()=>{guidedModeChange();syncApiUI();};
async function generateInPlace(kind){
 if(generationBusy)return;
 if(!$('model').value.trim()||(!serverKeyConfigured&&!$('key').value.trim())){returnFromSettings=activeStage;showStage('settings');msg('Einmal Modell-ID und API-Schlüssel eintragen, dann kannst du direkt weiterarbeiten.',true);return;}
 const target={analyse:'profile',write:'draft',review:'reviewResponse'}[kind],field=$(target);
 if(field.value.trim()&&!confirm('Den Text in diesem Feld durch ein neues KI-Ergebnis ersetzen? Gespeicherte Versionen bleiben erhalten.'))return;
 const authorId=requireAuthor();generationBusy=true;field.readOnly=true;$('authorSelect').disabled=true;
 try{
  await prepare(kind);$('note-'+kind).textContent='Die KI arbeitet … Das kann einige Minuten dauern. Bestehender Text bleibt bis zum Ergebnis erhalten.';
  const result=await api('generate',{prompt:stagePrompts[kind].text,model:$('model').value.trim(),key:$('key').value.trim()});
  if(current?.id!==authorId)throw Error('Autorenbibliothek gewechselt. Antwort wurde nicht zugeordnet.');
  if(!result.text?.trim())throw Error('Keine Textantwort erhalten. Vorhandener Text bleibt erhalten.');
  field.value=result.text;feedback();await flush();
  const complete=result.status==='completed';$('note-'+kind).textContent=complete?'Ergebnis eingefügt und lokal gespeichert. Bitte prüfen.':'Unvollständige Antwort eingefügt: '+(result.incomplete_reason||result.status)+'. Noch nicht als fertige Fassung verwenden.';
  msg($('note-'+kind).textContent,!complete);field.scrollIntoView({block:'center'});$('apiConnection').textContent=' Verbindung erfolgreich.';
 }catch(e){$('note-'+kind).textContent='Keine neue Antwort: '+e.message;throw e;}
 finally{generationBusy=false;field.readOnly=false;$('authorSelect').disabled=false;}
}
for(const [id,kind] of [['analyse','analyse'],['write','write'],['review','review']])$(id).onclick=run(()=>directMode()?generateInPlace(kind):prepare(kind));
if(!window.browserAPI&&new URLSearchParams(location.search).has('api'))$('mode').value='api';
$('mode').onchange();

function abSources() {
  try {
    const ids = JSON.parse($('abSourceIds').value);
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string').slice(0,8) : []);
  } catch { return new Set(); }
}

function updateAB() {
  const rules = current?.feedback.filter(rule => rule.active) || [];
  const version = current?.profiles.length || 0;
  $('abMaterial').textContent = (version ? 'Gespeichertes Autorenprofil, Version ' + version : 'Noch kein gespeichertes Autorenprofil') +
    ' · ' + rules.length + ' aktive Feedbackregeln' + (rules.length ? ' · ' + rules.map(rule => rule.rule).join(' · ') : '');
  const count = abSources().size;
  $('abSelection').textContent = count ? count + ' ausgewählte Passagen. Weitere kannst du über die Suche hinzufügen.' :
    'Ohne eigene Auswahl sucht die Schreibmaschine passende Passagen im aktiven Korpus.';
  $('clearABSources').hidden = !count;
  $('newA').textContent = $('draftA').value ? 'Aktuellen Text als neue Fassung A sichern' : 'Aktuellen Text als Fassung A sichern';
}

const updateWithAB = updateJourney;
updateJourney = function() { updateWithAB(); updateAB(); };
$('abSearch').onclick = run(async () => {
  const id = requireAuthor();
  const result = await api('search',{author_id:id,query:$('abQuery').value});
  if (current?.id === id) showPassages(result.passages,'abPassages',abSources());
});

$('clearABSources').onclick = () => {
  $('abSourceIds').value = '';
  for (const checkbox of $('abPassages').querySelectorAll('input[type="checkbox"]')) checkbox.checked = false;
  $('abPassages').replaceChildren();
  updateAB();
  queueSave();
};

$('newA').onclick = run(async () => {
  const text = $('draft').value.trim();
  if (!text || isCopiedPrompt(text) || isAnalysis(text)) throw Error('Im Schreibfeld fehlt ein gültiger Entwurf.');
  if ($('draftA').value && !confirm('Den bisherigen Vergleichstext durch den aktuellen Entwurf ersetzen?')) return;
  $('draftA').value = text;
  await flush();
  updateAB();
});

$('exportAB').onclick = run(() => {
  const blocks = [['Auftrag','task'],['Stimme, Figuren und Kontinuität','storyContext'],['Fassung A','draftA'],
    ['Fassung B','draft'],['Rückmeldung','reviewResponse'],['Entscheidungen','reflection']];
  const report = '# Schreibprotokoll\n\n' + blocks.map(([title,id]) => '## ' + title + '\n\n' + $(id).value).join('\n\n');
  download('schreibprotokoll.md',report,'text/markdown;charset=utf-8');
});

async function requestGateway(kind,prompt) {
  const address = $('gateway').value.trim();
  const endpoint = URL.canParse(address) ? new URL(address) : null;
  if (!endpoint || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw Error('Gib eine HTTPS-Adresse ohne Zugangsdaten, Parameter oder Fragment ein.');
  }
  if (generationBusy) return;
  const field = $({analyse:'profile',write:'draft',review:'reviewResponse',plot:'plotAnswer'}[kind]);
  const status = $('note-'+kind);
  if (field.value.trim() && !confirm('Den vorhandenen Text in diesem Feld durch die neue Antwort ersetzen?')) return;
  const id = requireAuthor();
  generationBusy = true;
  const previous = field.value;
  if (status) status.textContent = 'Auftrag wird gesendet …';
  else msg('Plotauftrag wird gesendet …');
  try {
    const response = await fetch(endpoint.href,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),
      credentials:'omit',redirect:'error',signal:AbortSignal.timeout(60000)
    });
    if (!response.ok) throw Error('Der API-Dienst meldet HTTP ' + response.status + '.');
    const result = await response.json();
    if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 100000) {
      throw Error('Der API-Dienst hat keine gültige Textantwort geliefert.');
    }
    if (current?.id !== id || field.value !== previous) throw Error('Der Arbeitsstand wurde gewechselt oder bearbeitet. Die Antwort wurde nicht eingefügt.');
    field.value = result.text;
    feedback();
    await flush();
    if (status) status.textContent = 'Antwort eingefügt. Bitte prüfe sie.';
    else msg('Plotantwort eingefügt. Bitte prüfe sie.');
  } catch (error) {
    if (current?.id === id && status) status.textContent = 'Anfrage fehlgeschlagen. Du kannst den Auftrag weiterhin kopieren.';
    throw error;
  } finally { generationBusy = false; }
}

$('gatewaySettings').hidden = !window.browserAPI || $('mode').value !== 'gateway';
$('gateway').addEventListener('input',updateJourney);
updateAB();

if ($('legacyAtelier')) {
  try { $('legacyAtelier').hidden = !localStorage.getItem('universale-schreibmaschine.atelier.v1'); }
  catch { /* Browser storage unavailable. */ }
}

const beats = [
  ['Hook','Welches Bild oder Rätsel eröffnet die Geschichte?'],
  ['Auslösendes Ereignis','Was bringt den Alltag aus dem Gleichgewicht?'],
  ['Erster Wendepunkt','Welche Entscheidung macht eine Rückkehr schwierig?'],
  ['Erster Druckpunkt','Wann zeigt sich die Macht der Gegenkraft?'],
  ['Mittelpunkt','Welche Erkenntnis ändert die Strategie?'],
  ['Zweiter Druckpunkt','Wie trifft die Gegenkraft eine verwundbare Stelle?'],
  ['Alles ist verloren','Was fällt weg und was bleibt der Hauptfigur?'],
  ['Klimax','Welche Entscheidung entscheidet den zentralen Konflikt?'],
  ['Auflösung','Was ist nach der Entscheidung anders?']
];
const premiseFields = [
  ['idea','Prämisse'],['goal','Ziel der Hauptfigur'],['force','Gegenkraft'],
  ['stakes','Was steht auf dem Spiel?'],['world','Schauplätze, Epoche und Atmosphäre'],
  ['lore','Weltregeln und verbindliche Fakten'],['timeline','Zeitleiste, Wege und Dauer'],
  ['openThreads','Motive, Vorausdeutungen und offene Fäden']
];
const figureFields = [
  ['name','Name'],['role','Rolle'],['want','Eigenes Ziel'],['wound','Prägende Erfahrung'],
  ['belief','Überzeugung oder Selbsttäuschung'],['need','Was die Figur lernen oder zulassen muss'],
  ['relation','Beziehung und Konflikt'],['arc','Veränderung und entscheidende Wahl'],
  ['voice','Wortwahl, Sprachrhythmus und Eigenheiten']
];
const sceneFields = [
  ['title','Kapitel und Szenentitel'],['beat','Plotstation'],['pov','Perspektive, Ort und Zeit'],
  ['goal','Szenenziel'],['obstacle','Hindernis'],['choice','Entscheidung oder Wendung'],
  ['effect','Folge und Anschluss'],['steps','Szenenschritte vom Einstieg bis zur Wendung'],
  ['tension','Innerer, zwischenmenschlicher oder äusserer Konflikt'],
  ['texture','Sinneseindrücke, Gesten und Subtext'],
  ['continuity','Fakten, Requisiten, Figurenwissen oder offene Fäden'],
  ['recap','Nach dem Entwurf: Was ist tatsächlich passiert?']
];
const bookFields = [
  ['visual','Bildsprache und visuelle Figurenmerkmale'],['image','Schlüsselszene für eine Illustration'],
  ['consistency','Wiedererkennbare Kleidung, Requisiten und Schauplätze']
];
function readPlot() {
  try { return JSON.parse($('plotState').value) || {}; }
  catch { return {}; }
}
function writePlot(plot) {
  $('plotState').value = JSON.stringify(plot);
  $('plotPrompt').value = '';
  $('plotChecks').replaceChildren();
  queueSave();
  updateSceneControls();
}
function plotFields(base, specs, place, onInput) {
  for (const [key,title] of specs) {
    const label = node('label',title);
    const field = document.createElement(key === 'beat' ? 'select' : 'textarea');
    if (key === 'beat') {
      field.append(node('option',''));
      for (const [name] of beats) field.append(node('option',name));
    } else { field.rows = 2; field.maxLength = 1800; }
    field.value = base[key] || '';
    field.addEventListener('input',() => { base[key] = field.value; onInput(); });
    label.append(field);
    place.append(label);
  }
}
function renderPlot() {
  const plot = readPlot();
  plot.premise ||= {};
  plot.book ||= {};
  plot.beats ||= {};
  plot.figures ||= [];
  plot.scenes ||= [];
  const commit = () => writePlot(plot);
  for (const id of ['plotPremise','plotBook','plotBeats','plotFigures','plotScenes','plotChecks']) $(id).replaceChildren();
  $('plotPrompt').value = '';
  plotFields(plot.premise,premiseFields,$('plotPremise'),commit);
  plotFields(plot.book,bookFields,$('plotBook'),commit);
  beats.forEach(([title,question],index) => {
    if (index % 3 === 0) $('plotBeats').append(node('h3',['Akt I · Aufbruch','Akt II · Eskalation','Akt III · Finale'][index/3]));
    plotFields(plot.beats,[[title,title+' · '+question]],$('plotBeats'),commit);
  });
  function cards(items, specs, container, noun) {
    items.forEach((item,index) => {
      const card = node('details');
      card.open = !item.name && !item.title;
      card.append(node('summary',item.name || item.title || noun+' '+(index+1)));
      plotFields(item,specs,card,() => {
        card.firstChild.textContent = item.name || item.title || noun+' '+(index+1);
        commit();
      });
      if (noun === 'Szene') {
        const pick = node('button',plot.active === item.id?'Für den Entwurf gewählt':'Für den Entwurf wählen','secondary');
        pick.type = 'button';
        pick.setAttribute('aria-pressed',String(plot.active === item.id));
        pick.onclick = () => { plot.active = item.id; commit(); renderPlot(); };
        card.append(pick);
        for (const delta of [-1,1]) {
          const move = node('button',delta < 0?'Nach oben':'Nach unten','secondary');
          move.type = 'button';
          move.disabled = !items[index+delta];
          move.onclick = () => {
            [items[index],items[index+delta]] = [items[index+delta],items[index]];
            commit(); renderPlot();
          };
          card.append(move);
        }
      }
      const remove = node('button',noun+' entfernen','secondary');
      remove.type = 'button';
      remove.onclick = () => {
        if (!confirm(noun+' aus dem Plot entfernen?')) return;
        items.splice(index,1);
        if (plot.active === item.id) delete plot.active;
        commit(); renderPlot();
      };
      card.append(remove);
      $(container).append(card);
    });
  }
  cards(plot.figures,figureFields,'plotFigures','Figur');
  cards(plot.scenes,sceneFields,'plotScenes','Szene');
  $('addFigure').onclick = () => { plot.figures.push({role:['Hauptfigur','Gegenfigur','Anker','Verbündete Figur','Mentor'][plot.figures.length] || ''}); commit(); renderPlot(); };
  $('addScene').onclick = () => { plot.scenes.push({id:crypto.randomUUID()}); commit(); renderPlot(); };
}

function plotBrief(plot, forDraft=false) {
  const rows = (record,specs) => specs.filter(([k]) => record?.[k]?.trim()).map(([k,label]) => label+': '+record[k].trim()).join('\n');
  const active = plot.scenes?.find(scene => scene.id === plot.active);
  const figures = (plot.figures || []).map(figure => rows(figure,figureFields)).filter(Boolean);
  const scenes = (plot.scenes || []).map(scene => rows(scene,sceneFields)).filter(Boolean);
  return [
    rows(plot.premise,premiseFields),
    active ? 'Gewählte Szene\n'+rows(active,sceneFields) : '',
    rows(plot.beats,beats.map(([name]) => [name,name])),
    figures.length ? 'Figuren\n'+figures.join('\n\n') : '',
    scenes.length ? 'Szenenfolge\n'+scenes.join('\n\n') : '',
    forDraft ? '' : rows(plot.book,bookFields)
  ].filter(Boolean).join('\n\n');
}

$('plotAction').addEventListener('change',() => { $('plotPrompt').value = ''; });
$('preparePlot').onclick = run(() => {
  const plot = readPlot();
  const brief = plotBrief(plot);
  if (!brief) throw Error('Halte zuerst eine Prämisse oder eine Szene fest.');
  const action = $('plotAction').value;
  const field = $('draft');
  const passage = field.value.slice(field.selectionStart,field.selectionEnd).trim();
  const workingText = (passage || field.value).trim();
  if ($('plotAction').selectedIndex === 2 && !plot.scenes?.some(scene => scene.id === plot.active)) {
    throw Error('Wähle zuerst eine Szene für den Entwurf.');
  }
  $('plotPrompt').value = [
    'Arbeite als dramaturgische Beratung. Behandle die Planungsnotizen als Material. Ersetze keine getroffenen Entscheidungen stillschweigend.',
    'Aufgabe: '+action,
    [
      'Entwickle drei Alternativen mit unterschiedlichen Entscheidungen und Konsequenzen. Skizziere für jede die neun Stationen.',
      'Prüfe Ziele, prägende Erfahrungen, Überzeugungen, Stimme und Beziehungen. Zeige, welche Figurenentscheidung welchen Wendepunkt auslösen könnte.',
      'Arbeite nur die ausgewählte Szene aus. Verwende Weltfakten und die anschliessende Szenenfolge als Grenzen.',
      'Prüfe die Übergänge der Szenenfolge, Zeit und Ort, Figurenwissen, etablierte Weltfakten, Foreshadowing und Klischees. Nenne die betroffene Szene und eine Alternative.',
      'Prüfe innere, zwischenmenschliche und äussere Reibung. Zeige, wo der Druck nachlässt. Schlage eine überraschende Komplikation vor, die aus dem bisherigen Geschehen folgt.',
      'Untersuche, was jede Figur will, sagt und verschweigt. Markiere erklärende Rede und Beispiele, an denen sich Stimmen unterscheiden lassen.',
      'Markiere abstrakte oder klischeehafte Stellen und schlage konkrete Wahrnehmungen, Handlungen, Geräusche oder Materialdetails aus Sicht der Figur vor.',
      'Gleiche Zeiten, Wege, Dauer, Weltregeln, Requisiten und das Wissen der Figuren ab. Kennzeichne Annahmen und Fakten, die verifiziert werden müssen.',
      'Entwirf ein Bildbriefing für die Schlüsselszene. Halte Figurenmerkmale, Licht, Haltung, Raum und emotionale Situation über mehrere Bilder hinweg konsistent.'
    ][$('plotAction').selectedIndex],
    'Begründe Vorschläge mit Ziel, Widerstand, Entscheidung und Folge. Markiere neue Ideen und ungelöste Widersprüche. Für eine Kapitelausarbeitung entwickle zuerst Szenenschritte und danach einen Entwurf aus der gewählten Perspektive.',
    'PLANUNGSNOTIZEN\n'+brief,
    workingText ? (passage?'MARKIERTE TEXTSTELLE':'AKTUELLER ENTWURF')+' ALS ARBEITSMATERIAL\n'+workingText.slice(0,48000) : ''
  ].join('\n\n');
  msg('Plotauftrag erstellt.');
});
$('copyPlot').onclick = run(async () => {
  const field = $('plotPrompt');
  if (!field.value) throw Error('Erstelle zuerst einen Plotauftrag.');
  try { await navigator.clipboard.writeText(field.value); msg('Plotauftrag kopiert.'); }
  catch { field.focus(); field.select(); msg('Auftrag markiert. Kopiere ihn manuell.'); }
});
$('sendPlot').onclick = run(async () => {
  const prompt = $('plotPrompt').value;
  if (!prompt) throw Error('Erstelle zuerst einen Plotauftrag.');
  if (window.browserAPI && gatewayMode()) return requestGateway('plot',prompt);
  if (window.browserAPI) throw Error('Wähle zuerst den HTTPS-Dienst unter Betriebsart.');
  if (generationBusy) return;
  if (!$('model').value.trim() || (!serverKeyConfigured && !$('key').value.trim())) throw Error('Richte zuerst die API unter Betriebsart ein.');
  const author = requireAuthor();
  const previous = $('plotAnswer').value;
  if (previous.trim() && !confirm('Die bisherige Plotantwort ersetzen?')) return;
  generationBusy = true;
  try {
    const result = await api('generate',{prompt,model:$('model').value.trim(),key:$('key').value.trim()});
    if (current?.id !== author || $('plotAnswer').value !== previous) throw Error('Der Arbeitsstand wurde inzwischen bearbeitet.');
    if (typeof result.text !== 'string' || !result.text.trim()) throw Error('Keine Textantwort erhalten.');
    $('plotAnswer').value = result.text;
    await flush();
    msg(result.status==='completed'?'Plotantwort gespeichert.':'Unvollständige Plotantwort gespeichert.');
  } finally { generationBusy = false; }
});
$('checkPlot').onclick = () => {
  const plot = readPlot();
  const findings = [];
  for (const [key,label] of premiseFields.slice(0,4)) if (!plot.premise?.[key]?.trim()) findings.push(label+' ergänzen.');
  const missing = beats.filter(([name]) => !plot.beats?.[name]?.trim()).map(([name]) => name);
  if (missing.length) findings.push('Offene Plotstationen: '+missing.join(', ')+'.');
  if (!plot.scenes?.length) findings.push('Lege eine Szene an und verbinde ihr Ende mit einer Folge.');
  for (const [index,scene] of (plot.scenes || []).entries()) {
    const gaps = ['goal','obstacle','choice','effect'].filter(key => !scene[key]?.trim());
    if (gaps.length) findings.push((scene.title || 'Szene '+(index+1))+': '+gaps.map(key => sceneFields.find(([k])=>k===key)[1]).join(', ')+' prüfen.');
  }
  $('plotChecks').replaceChildren(...(findings.length?findings:['Die Grundfelder sind ausgefüllt. Prüfe nun, ob die Folgen einer Szene die nächste auslösen.']).map(item => node('li',item)));
};
$('exportPlot').onclick = run(() => {
  const brief = plotBrief(readPlot());
  if (!brief) throw Error('Der Plot ist noch leer.');
  download('plot.md','# Plot\n\n'+brief+($('plotAnswer').value?'\n\n## Varianten und Rückmeldungen\n\n'+$('plotAnswer').value:''),'text/markdown;charset=utf-8');
});
$('plotToDraft').onclick = run(async () => { await flush(); showStage('writing'); });
const updateWithPlot = updateJourney;
updateJourney = function() {
  updateWithPlot();
  updateSceneControls();
  $('sendPlot').hidden = window.browserAPI ? !gatewayMode() : !directMode();
};
$('gateway').addEventListener('input',updateJourney);

function selectedScene(plot) {
  return plot.scenes?.find(scene => scene.id === plot.active);
}
function updateSceneControls() {
  const scene = selectedScene(readPlot());
  $('activeScene').textContent = scene ? 'Gewählte Szene: '+(scene.title || 'Ohne Titel') : '';
  $('saveSceneText').hidden = !scene;
  $('newSceneText').hidden = !scene;
  $('loadSceneText').hidden = !scene?.manuscript;
}
const sceneTextFields = ['draftA','draft','reviewResponse','reflection'];
$('newSceneText').onclick = run(async () => {
  if (!selectedScene(readPlot())) throw Error('Wähle zuerst eine Szene.');
  if (sceneTextFields.some(id => $(id).value.trim()) && !confirm('Das Schreibfeld für diese Szene leeren? Gesicherte Szenenstände bleiben erhalten.')) return;
  for (const id of sceneTextFields) $(id).value = '';
  for (const kind of ['write','review']) {
    delete stagePrompts[kind];
    $('prompt-'+kind).value = '';
    $('exchange-'+kind).hidden = true;
  }
  feedback();
  await flush();
  $('draft').focus();
});
$('saveSceneText').onclick = run(async () => {
  const plot = readPlot();
  const scene = selectedScene(plot);
  if (!scene) throw Error('Wähle zuerst eine Szene in der Plotmaschine.');
  if (!$('draft').value.trim() || isCopiedPrompt($('draft').value) || isAnalysis($('draft').value)) {
    throw Error('Im Schreibfeld fehlt ein gültiger Szenentext.');
  }
  if (scene.manuscript && !confirm('Den gespeicherten A/B-Arbeitsstand dieser Szene aktualisieren?')) return;
  scene.manuscript = Object.fromEntries(sceneTextFields.map(id => [id,$(id).value]));
  writePlot(plot);
  await flush();
  msg('A/B-Stand bei der Szene gesichert.');
});
$('loadSceneText').onclick = run(async () => {
  const scene = selectedScene(readPlot());
  if (!scene?.manuscript) throw Error('Für diese Szene ist noch kein A/B-Stand gesichert.');
  if (sceneTextFields.some(id => $(id).value.trim()) && !confirm('Das Schreibfeld mit dem gesicherten Szenenstand füllen? Sichere bei Bedarf zuerst deinen aktuellen Text.')) return;
  for (const id of sceneTextFields) $(id).value = scene.manuscript[id] || '';
  for (const kind of ['write','review']) {
    delete stagePrompts[kind];
    $('prompt-'+kind).value = '';
    $('exchange-'+kind).hidden = true;
  }
  feedback();
  await flush();
  msg('Szenenstand ins Schreibfeld geladen.');
});
$('exportManuscript').onclick = run(() => {
  const scenes = (readPlot().scenes || []).filter(scene => scene.manuscript?.draft?.trim());
  if (!scenes.length) throw Error('Sichere zuerst mindestens einen Szenentext am Schreibfeld.');
  const manuscript = scenes.map((scene,i) => '## '+(scene.title || 'Szene '+(i+1))+'\n\n'+scene.manuscript.draft.trim()).join('\n\n');
  download('manuskript.md','# Manuskript\n\n'+manuscript+'\n','text/markdown;charset=utf-8');
});
const speech = window.speechSynthesis;
$('readDraft').hidden = !speech;
$('readDraft').onclick = run(() => {
  if (speech.speaking || speech.pending) {
    speech.cancel();
    $('readDraft').textContent = 'Text vorlesen';
    return;
  }
  const field = $('draft');
  const selected = field.value.slice(field.selectionStart,field.selectionEnd);
  const text = (selected || field.value).trim();
  if (!text) throw Error('Im Schreibfeld fehlt Text zum Vorlesen.');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-CH';
  utterance.onend = utterance.onerror = () => { $('readDraft').textContent = 'Text vorlesen'; };
  $('readDraft').textContent = 'Vorlesen stoppen';
  speech.speak(utterance);
});
updateJourney();

function isFree() {
  return Boolean(current && $('writingMode').value === 'free');
}
function updateModes() {
  const free = isFree();
  document.querySelector('nav a[href="#material"]').hidden = !free;
  document.querySelector('nav a[href="#profileSection"]').hidden = free;
  $('fanFormPanel').hidden = free;
  document.querySelector('label[for="authorSelect"]').textContent = 'Freitextprojekte und Autorenbibliotheken';
  document.querySelector('label[for="files"]').textContent = free ? 'Material hochladen · PDF, EPUB oder Text' : 'Werke hochladen · PDF, EPUB oder Text';
  $('writing').querySelector('h2').textContent = free ? '4. Deinen Text schreiben' : '4. Deine Geschichte schreiben';
  document.querySelector('label[for="task"]').textContent = free ? 'Was willst du entwickeln oder untersuchen?' : 'Welche Geschichte soll entstehen?';
  document.querySelector('label[for="draft"]').textContent = activeStage === 'learning' ? 'Fassung B · Arbeitsfassung' : free ? 'Dein Text' : 'Deine Geschichte';
  $('abSources').querySelector('summary').textContent = free ? 'Materialbelege und Feedbackregeln' : 'Autorenprofil, Textbelege und Feedbackregeln';
  if (free) $('abMaterial').textContent = 'Auszüge stammen aus dem Material dieses Projekts. Aktive Feedbackregeln werden übernommen.';
  $('nextProfile').disabled = !free && !current?.works.length;
  $('nextProfile').textContent = free ? 'Weiter zu Gedanken und Diskurs' : 'Weiter zum Autorenprofil';
  $('startFree').setAttribute('aria-pressed',String(free));
  $('startFan').setAttribute('aria-pressed',String(Boolean(current && !free)));
  $('modeHelp').textContent = free ? 'Freitextprojekt geöffnet. Importiere Material oder gehe direkt zu deinen Gedanken.' :
    'Für Fanfiction wählst du eine Autorenbibliothek oder importierst ein Werk unter dem Namen der Autorin oder des Autors.';
  if (free) {
    $('write').disabled = false;
    $('profileReady').textContent = 'Der Schreibauftrag verwendet deine Gedanken, Diskurspositionen und passenden Materialauszüge.';
    $('nextHint').textContent = 'Entwickle deine Frage und wähle Material aus. Bei einer erzählerischen Form kannst du den Plot dazunehmen.';
  }
}
const updateWithModes = updateJourney;
updateJourney = function() { updateWithModes(); updateModes(); };
$('startFree').onclick = () => {
  $('freeStart').hidden = false;
  $('freeName').focus();
};
$('startFan').onclick = () => {
  $('freeStart').hidden = true;
  $('modeHelp').textContent = 'Wähle für Fanfiction eine Autorenbibliothek oder lade unten ein Werk hoch, etwa von Gabriele Reuter.';
  const importName = $('importAuthorName');
  if ($('importAuthor').hidden) $('authorSelect').focus();
  else importName.focus();
};
$('createFree').onclick = run(async () => {
  const name = $('freeName').value.trim();
  if (!name) throw Error('Gib deinem Freitextprojekt einen Namen.');
  await flush();
  const project = await api('authors',{name});
  await api('workspace',{author_id:project.id,workspace:{writingMode:'free',genre:'Essay'}});
  $('freeName').value = '';
  $('freeStart').hidden = true;
  await refresh(project.id);
  showStage('corpus');
});
$('materialToWrite').onclick = () => showStage('writing');
updateJourney();


$('reuterExample').hidden = !window.browserAPI;
$('openReuter').onclick = run(async () => {
  await flush();
  const result = await api('example-reuter');
  await refresh(result.id);
  showStage('learning');
  $('reuterComparison').open = true;
  await showReuterComparison();
  msg('Reuter-Beispiel geöffnet. Das vollständige Manuskript und die Szenenvergleiche stehen bereit.');
});


let reuterComparisonRequest;
function isReuterExample() {
  return current?.id === 'example-reuter-aus-guter-familie-v1';
}
const updateWithReuter = updateJourney;
updateJourney = function() {
  updateWithReuter();
  $('reuterComparison').hidden = !isReuterExample();
  if (!isReuterExample()) $('reuterComparison').open = false;
};
async function showReuterComparison() {
  if (!isReuterExample()) return;
  const body = $('reuterComparisonBody');
  if (body.dataset.loaded) return;
  body.textContent = 'A/B-Vergleich wird geladen …';
  reuterComparisonRequest ||= fetch('./examples/reuter-manuskript.json').then(response => {
    if (!response.ok) throw Error('Der A/B-Vergleich konnte nicht geladen werden.');
    return response.json();
  }).catch(error => {
    reuterComparisonRequest = null;
    throw error;
  });
  try {
    const manuscript = await reuterComparisonRequest;
    if (!isReuterExample()) return;
    renderReuterView(manuscript);
    body.dataset.loaded = 'true';
  } catch (error) { body.textContent = error.message; }
}
function renderReuterView(manuscript) {
  const body = $('reuterComparisonBody');
  const view = $('reuterView').value;
  if (view === 'a' || view === 'b') {
    const field = view === 'a' ? 'draftA' : 'draft';
    const title = node('h3',manuscript.title+' · Fassung '+view.toUpperCase());
    const chapters = manuscript.scenes.map(scene => {
      const chapter = node('section');
      chapter.append(node('h3',scene.title));
      for (const paragraph of scene.snapshot[field].split('\n\n')) chapter.append(node('p',paragraph));
      return chapter;
    });
    body.replaceChildren(title,...chapters);
    return;
  }
  const {snapshot,annotations} = manuscript.scenes.find(scene => scene.id === view);
  const changes = node('div');
  const passages = new Map(current?.works.flatMap(work => work.passages.map(p => [p.id,p])) || []);
  changes.append(node('h3','Entscheidungen bei der Überarbeitung'));
  for (const item of annotations) {
    const card = node('details');
    card.append(node('summary',item.title));
    for (const [label,text] of [
      ['Fassung A','«'+item.before+'»'],['Fassung B','«'+item.after+'»'],
      ['Reuter · '+item.id+' · '+item.location,'«'+item.quote+'»'],
      ['Feedbackregel',item.rule],['Wirkung',item.effect]
    ]) {
      const p = node('p');
      p.append(node('strong',label+' · '),document.createTextNode(text));
      card.append(p);
    }
    const passage = passages.get(item.id);
    if (passage) {
      const source = node('details');
      source.append(node('summary','Originalpassage im Zusammenhang lesen'),node('div',passage.text,'passage'));
      card.append(source);
    }
    changes.append(card);
  }
  changes.append(node('p',snapshot.reflection));
  body.replaceChildren(exampleDraftGrid(snapshot),changes);
}
$('reuterView').addEventListener('change',run(async () => {
  if (reuterComparisonRequest) renderReuterView(await reuterComparisonRequest);
}));
$('reuterComparison').addEventListener('toggle',() => {
  if ($('reuterComparison').open) void showReuterComparison();
});
updateJourney();

function exampleDraftGrid(snapshot) {
  const grid = node('div',undefined,'revision-grid');
  for (const [title,text] of [['Fassung A · Erstentwurf',snapshot.draftA],['Fassung B · Überarbeitung',snapshot.draft]]) {
    const column = node('div');
    column.append(node('h3',title));
    for (const paragraph of text.split('\n\n')) column.append(node('p',paragraph));
    grid.append(column);
  }
  return grid;
}

function isFreeExample() {
  return current?.id === 'example-freitext-ki-schreiben-v1';
}
const updateWithFreeExample = updateJourney;
updateJourney = function() {
  updateWithFreeExample();
  $('freeComparison').hidden = !isFreeExample();
  if (!isFreeExample()) $('freeComparison').open = false;
};

let freeComparisonRequest;
async function showFreeComparison() {
  if (!isFreeExample()) return;
  const body = $('freeComparisonBody');
  if (body.dataset.loaded) return;
  body.textContent = 'A/B-Vergleich wird geladen …';
  freeComparisonRequest ||= fetch('./examples/freitext-ki-vergleich.json').then(response => {
    if (!response.ok) throw Error('Der A/B-Vergleich konnte nicht geladen werden.');
    return response.json();
  }).catch(error => {
    freeComparisonRequest = null;
    throw error;
  });
  try {
    const {snapshot,annotations,sources} = await freeComparisonRequest;
    if (!isFreeExample()) return;
    const comments = node('div');
    comments.append(node('h3','Entscheidungen bei der Überarbeitung'));
    for (const item of annotations) {
      const card = node('details');
      card.append(node('summary',item.title));
      for (const [label,value] of [
        ['Fassung A','«'+item.before+'»'],['Fassung B','«'+item.after+'»'],
        ['Material',item.reference],['Feedbackregel',item.rule],['Wirkung',item.effect]
      ]) {
        const paragraph = node('p');
        paragraph.append(node('strong',label+' · '),document.createTextNode(value));
        card.append(paragraph);
      }
      comments.append(card);
    }
    comments.append(node('p',snapshot.reflection));
    const references = node('details');
    references.append(node('summary','Quellen Q1–Q3 mit Fundstellen'));
    for (const source of sources) {
      const link = node('a',source.id+' · '+source.title);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      references.append(link,node('p',source.location+' · '+source.summary));
    }
    body.replaceChildren(exampleDraftGrid(snapshot),comments,references);
    body.dataset.loaded = 'true';
  } catch (error) { body.textContent = error.message; }
}
$('freeExample').hidden = !window.browserAPI;
$('openFreeExample').onclick = run(async () => {
  await flush();
  const result = await api('example-freitext');
  await refresh(result.id);
  showStage('learning');
  $('freeComparison').open = true;
  await showFreeComparison();
  msg('Freitextbeispiel geöffnet. Gedanken und Gegenpositionen stehen unter «Material und Diskurs».');
});
$('freeComparison').addEventListener('toggle',() => {
  if ($('freeComparison').open) void showFreeComparison();
});
updateJourney();

function gatewayMode() {
  return $('mode').value === 'gateway' && Boolean($('gateway').value.trim());
}
const chatHandoffs = {
  analyse:['prompt-analyse','profile'],
  plot:['plotPrompt','plotAnswer'],
  write:['prompt-write','draft'],
  review:['prompt-review','reviewResponse']
};
for (const [kind,[promptId,targetId]] of Object.entries(chatHandoffs)) {
  const promptField = $(promptId);
  const field = $(targetId);
  $('handoff-'+kind).addEventListener('click',event => {
    if (!promptField.value.trim()) {
      event.preventDefault();
      msg('Erstelle zuerst den Auftrag.',true);
      return;
    }
    function showManualCopy() {
      const details = promptField.closest('details');
      if (details) details.open = true;
      promptField.focus();
      promptField.select();
      msg('Der Auftrag ist markiert. Kopiere ihn mit ⌘C oder Strg+C und füge ihn im geöffneten Chat ein.',true);
    }
    if (!navigator.clipboard?.writeText) {
      showManualCopy();
      return;
    }
    navigator.clipboard.writeText(promptField.value).then(() => {
      msg('Auftrag kopiert. In ChatGPT einfügen und absenden. Kopiere danach die Antwort zurück.');
    }).catch(showManualCopy);
  });

  $('paste-'+kind).textContent = 'ChatGPT-Antwort prüfen';
  $('paste-'+kind).onclick = run(async () => {
    const authorId = requireAuthor();
    const panel = replyPanels[kind];
    panel.root.hidden = false;
    let reply;
    try { reply = await navigator.clipboard.readText(); } catch { /* Manual paste remains available. */ }
    if (current?.id !== authorId) return;
    if (reply?.trim() && !panel.input.value) panel.input.value = reply;
    checkReply(kind);
    panel.input.focus();
  });
}
const updateWithChat = updateJourney;
updateJourney = function() {
  updateWithChat();
  const chatMode = $('mode').value === 'copy';
  $('gatewaySettings').hidden = !window.browserAPI || $('mode').value !== 'gateway';
  for (const kind of Object.keys(chatHandoffs)) {
    $('handoff-'+kind).hidden = !chatMode;
    $('paste-'+kind).hidden = !chatMode;
  }
};
updateJourney();

const chatFocus = {
  analyse:[
    ['Zitat und Deutung trennen','Trenne pro Beobachtung das wörtliche Zitat, deine Deutung und die daraus abgeleitete Schreibregel.'],
    ['Erzählstimme vergleichen','Vergleiche Erzählperspektive und Distanz an zwei vorhandenen Passagen.']
  ],
  plot:[
    ['Szenenfolge prüfen','Prüfe, ob die Entscheidung am Szenenende die nächste Szene auslöst. Nenne eine fehlende Ursache oder Folge.'],
    ['Figurenmotiv schärfen','Zeige, welche Handlung aus dem Ziel der Figur folgt und an welcher Stelle das Motiv sichtbarer werden sollte.']
  ],
  write:[
    ['Dialog und Subtext','Schreibe den Entwurf mit einem Dialog, in dem die Figuren Unterschiedliches wollen. Lass das Ungesagte durch Gesten und Pausen erkennbar werden.'],
    ['Perspektive und Sinneseindruck','Bleibe bei der gewählten Perspektive. Entwickle die Szene über konkrete Wahrnehmungen und Handlungen.'],
    ['These und Gegenposition','Entwickle eine präzise These, den stärksten Einwand und eine begründete Antwort darauf.']
  ],
  review:[
    ['Dialog und Subtext prüfen','Kommentiere, was die Figuren sagen, wollen und verschweigen. Gib höchstens drei Hinweise.'],
    ['Belege und Behauptungen prüfen','Markiere unbelegte oder zu weit reichende Behauptungen. Unterscheide Quellenbefund und Deutung.'],
    ['Rhythmus und Perspektive prüfen','Zeige, wo Rhythmus oder Perspektive die beabsichtigte Wirkung unterstützen oder stören. Gib Hinweise zu einzelnen Stellen.']
  ]
};
const replyPanels = {};
const promptsForCheck = {};
const checkUpdate = updateJourney;
updateJourney = function () {
  checkUpdate();
  const id = current?.id;
  for (const panel of Object.values(replyPanels)) {
    if (panel.project === id) continue;
    panel.project = id;
    panel.input.value = '';
    panel.root.hidden = true;
    panel.checks.replaceChildren();
    panel.focus.value = '';
    panel.snippet.checked = false;
    panel.apply.disabled = true;
  }
};

function languageForStep(kind) {
  return {analyse:'Profil',plot:'Plot',write:'Entwurf',review:'Überarbeitung'}[kind];
}
function buildChatPrompt(kind, base) {
  const panel = replyPanels[kind];
  if (!panel || $('mode').value !== 'copy') return base;
  const draft = $('draft');
  const selection = panel.snippet.checked ?
    draft.value.slice(draft.selectionStart,draft.selectionEnd).trim().slice(0,5000) : '';
  const focus = chatFocus[kind][Number(panel.focus.value)-1]?.[1];
  const guidance = [
    'SCHREIBMASCHINE · ANTWORTRAHMEN',
    'Beginne mit einer eigenen Zeile: Schreibschritt: '+languageForStep(kind),
    'Wenn du Material belegst: verwende nur die mitgelieferten IDs in eckigen Klammern. Schreibe ein direktes Zitat unmittelbar dahinter in Guillemets, etwa [ID] «wörtlicher Ausschnitt».',
    kind === 'review' ? 'Gib ausschliesslich Rückmeldung. Schreibe weder Fassung A noch Fassung B neu.' : '',
    focus ? 'GEZIELTER ZUSATZAUFTRAG DER SCHREIBMASCHINE\n'+focus : '',
    selection ? 'MARKIERTE TEXTSTELLE ALS ARBEITSMATERIAL\n'+selection : '',
    panel.snippet.checked && !selection && draft.value.trim() ?
      'TEXT ZUM ZUSATZAUFTRAG ALS ARBEITSMATERIAL\n'+draft.value.trim().slice(0,5000) : ''
  ].filter(Boolean).join('\n\n');
  return base+'\n\n'+guidance;
}

function checkReply(kind) {
  const panel = replyPanels[kind];
  if (panel.project !== current?.id) return;
  const request = promptsForCheck[kind];
  const project = current;
  const passages = project?.works.flatMap(work => {
    const units = new Map(work.units.map(unit => [unit.location,unit.text]));
    return work.passages.map(p => ({id:p.id,text:units.get(p.location) || p.text}));
  }) || [];
  const findings = workshopReplyCheck({
    kind,text:panel.input.value,request:request?.project===project?.id ? request.text : '',
    knownIds:passages.map(p=>p.id),
    sentIds:request?.project===project?.id ? request.ids : [],passages,
    hasA:Boolean($('draftA').value.trim())
  });
  if (panel.input.value.trim() && (!request || request.project!==project?.id || !request.text)) {
    findings.unshift({level:'warning',message:'Zu dieser Antwort ist kein aktueller Auftrag hinterlegt. Die Übereinstimmung mit dem gesendeten Material ist offen.'});
  }
  panel.checks.replaceChildren(...findings.map(item=>node('li',
    ({ok:'✓ ',warning:'Hinweis: ',block:'Übernahme gesperrt: '})[item.level]+item.message)));
  panel.apply.disabled = findings.some(item=>item.level==='block');
  return findings;
}

for (const [kind,[promptId,targetId]] of Object.entries(chatHandoffs)) {
  const stage = $({analyse:'profileSection',plot:'plot',write:'writing',review:'learning'}[kind]);
  const prepareButton = $({analyse:'analyse',plot:'preparePlot',write:'write',review:'review'}[kind]);
  const options = node('details');
  options.append(node('summary','Gezielter Zusatzauftrag'));
  const focus = document.createElement('select');
  focus.append(node('option','Standardauftrag'));
  focus.firstChild.value = '';
  chatFocus[kind].forEach(([label],i) => {
    const choice = node('option',label);
    choice.value = String(i+1);
    focus.append(choice);
  });
  const focusLabel = node('label','Schwerpunkt wählen');
  focusLabel.append(focus);
  const snippetLabel = node('label');
  const snippet = document.createElement('input');
  snippet.type = 'checkbox';
  snippetLabel.append(snippet,document.createTextNode(' Markierte Stelle aus dem Schreibfeld beifügen, sonst die ersten 5’000 Zeichen'));
  options.append(focusLabel,snippetLabel,node('p','Erstelle den Auftrag nach einer Änderung neu. Die Schreibmaschine formuliert die Anweisung und zeigt sie in der Vorschau.','small'));
  prepareButton.before(options);

  const root = node('section',undefined,'exchange');
  root.hidden = true;
  const label = node('label','ChatGPT-Antwort zur lokalen Prüfung einfügen');
  const input = document.createElement('textarea');
  input.rows = 9;
  label.append(input);
  const checks = node('ul');
  checks.setAttribute('aria-live','polite');
  const apply = node('button','Geprüfte Antwort übernehmen');
  apply.type = 'button';
  apply.disabled = true;
  const close = node('button','Prüfvorschau schliessen','secondary');
  close.type = 'button';
  close.onclick = () => { root.hidden = true; };
  root.append(label,node('p','Die Prüfung erkennt sichtbare Merkmale. Sie bewertet keine Argumente und bestätigt keine Tatsachen.','small'),checks,apply,close);
  const field = $(targetId);
  const placement = kind === 'write' ? $('exchange-write') : $('paste-'+kind);
  placement.after(root);
  replyPanels[kind] = {root,input,checks,apply,focus,snippet,project:current?.id};
  input.addEventListener('input',() => checkReply(kind));
  field.addEventListener('paste',event => {
    if ($('mode').value !== 'copy' || !current || promptsForCheck[kind]?.project !== current.id) return;
    const text = event.clipboardData?.getData('text/plain');
    if (!text?.trim()) return;
    event.preventDefault();
    root.hidden = false;
    input.value = text;
    checkReply(kind);
    input.focus();
  });
  apply.onclick = run(async () => {
    if (!checkReply(kind) || apply.disabled) return;
    if (field.value.trim() && !confirm('Den Inhalt dieses Arbeitsfelds durch die geprüfte Antwort ersetzen?')) return;
    const reply = input.value.replace(/^\s*(?:#+\s*)?Schreibschritt:\s*(?:Profil|Plot|Entwurf|Überarbeitung)[ \t]*\r?\n/i,'').trim();
    if (!reply) throw Error('Die Antwort enthält nur die Überschrift des Schreibschritts.');
    field.value = reply;
    root.hidden = true;
    input.value = '';
    field.dispatchEvent(new Event('input',{bubbles:true}));
    await flush();
    field.focus();
    msg('Antwort übernommen.');
  });
}

const prepareWithFocus = prepare;
prepare = async function (kind) {
  await prepareWithFocus(kind);
  const result = stagePrompts[kind];
  const field = $('prompt-'+kind);
  if (!result || !field.value || result.author_id !== current?.id) return;
  field.value = buildChatPrompt(kind,result.text);
  promptsForCheck[kind] = {project:current.id,text:field.value,ids:result.passage_ids || []};
};

const previousPlotPrepare = $('preparePlot').onclick;
$('preparePlot').onclick = async event => {
  $('plotPrompt').value = '';
  await previousPlotPrepare(event);
  const field = $('plotPrompt');
  if (!field.value || !current) return;
  field.value = buildChatPrompt('plot',field.value);
  promptsForCheck.plot = {project:current.id,text:field.value,ids:[]};
};
updateJourney();
