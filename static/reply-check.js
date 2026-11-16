/* Local checks for responses pasted from an external chat. */
(function (scope) {
  const signatures = {
    analyse:/\b(?:stilprofil|beobachtung|deutung|schreibregel|fundstelle|beleg)\b/i,
    plot:/\b(?:plot|szene|wendepunkt|konflikt|prämisse|figur|szenenschritt|gliederung)\w*/i,
    review:/\b(?:vorschlag|rückmeldung|überarbeitung|textstelle|wirkung|stärke|begründung|einwand|beleg)\w*/i
  };
  const normalize = text => text.normalize('NFC').replace(/\s+/g,' ').trim();
  function inspect({kind,text,request,knownIds=[],sentIds=[],passages=[],hasA=false}) {
    const findings = [];
    const warn = message => findings.push({level:'warning',message});
    const block = message => findings.push({level:'block',message});
    const pass = message => findings.push({level:'ok',message});
    const value = text.trim();
    if (!value) block('Füge zuerst eine Antwort in die Prüfvorschau ein.');
    if (request && value === request.trim()) block('Das ist der gesendete Auftrag. Kopiere stattdessen die Antwort aus ChatGPT.');
    if (/^\s*(?:Autorenbibliothek|Freitextprojekt):[\s\S]*(?:QUELLENAUSSCHNITTE|GEPRÜFTES PROFIL)/i.test(value)) {
      block('Der Text sieht wie ein kopierter Schreibmaschinen-Auftrag aus.');
    }

    const names = {analyse:'Profil',plot:'Plot',write:'Entwurf',review:'Überarbeitung'};
    const marker = value.match(/^\s*(?:#+\s*)?Schreibschritt:\s*(Profil|Plot|Entwurf|Überarbeitung)\s*$/im)?.[1];
    const rewrite = /^\s*(?:#+\s*)?(?:vollständige neu-?fassung|überarbeiteter (?:entwurf|text)|fassung [ab])\s*[:\n]/im.test(value);
    if (marker && marker.toLowerCase() !== names[kind].toLowerCase()) {
      block('Die Antwort nennt den Schritt «'+marker+'». Das Zielfeld gehört zu «'+names[kind]+'».');
    } else if (kind === 'review' && rewrite) {
      warn('Die Antwort enthält möglicherweise eine Neufassung. In diesem Schritt ist Rückmeldung zum Text vorgesehen.');
    } else if (value && signatures[kind] && !signatures[kind].test(value)) {
      warn('Die Antwort enthält wenige erkennbare Hinweise auf «'+names[kind]+'». Prüfe, ob sie zum Auftrag passt.');
    } else if (kind === 'write' && /^\s*(?:#+\s*)?(?:Stilprofil|Analyse|Rückmeldung)(?:\s*[₋–—:-]|\s*$)/im.test(value)) {
      warn('Die Antwort sieht eher nach Analyse oder Rückmeldung als nach einem Entwurf aus.');
    } else if (value) {
      pass('Schreibschritt: keine offensichtliche Abweichung erkannt.');
    }

    const known = new Set(knownIds);
    const sent = new Set(sentIds);
    const seen = new Set();
    const outside = new Set();
    const unknown = new Set();
    const byId = new Map(passages.map(p => [p.id,p.text]));
    let checked = 0;
    for (const match of value.matchAll(/\[([\w-]{1,45})\](?:\s*[:–—-]?\s*(?:«([^»\n]+)»|„([^“\n]+)“|"([^"\n]+)"))?/gu)) {
      const [,id,...quotes] = match;
      if (/^\d+$/.test(id)) continue;
      if (!known.has(id)) { unknown.add(id); continue; }
      seen.add(id);
      if (!sent.has(id)) outside.add(id);
      const quote = quotes.find(Boolean);
      if (quote && byId.has(id)) {
        if (!normalize(byId.get(id)).includes(normalize(quote))) {
          warn('Das Zitat bei ['+id+'] stimmt nicht wörtlich mit dem lokalen Ausschnitt überein.');
        } else checked++;
      }
    }
    if (unknown.size) warn('Lokal nicht gefundene Fundstellen: '+[...unknown].map(id=>'['+id+']').join(', ')+'.');
    if (outside.size && sent.size) warn('Vorhanden, aber nicht im letzten Auftrag enthalten: '+[...outside].map(id=>'['+id+']').join(', ')+'.');
    if (kind === 'analyse' && value && !seen.size) warn('Das Autorenprofil enthält keine überprüfbare Passage-ID in eckigen Klammern.');
    else if (sent.size && !seen.size && value) warn('Keine überprüfbare Quellen-ID erkannt. Prüfe Quellenbehauptungen von Hand.');
    if (seen.size) pass(seen.size+' lokal vorhandene Fundstelle(n), '+checked+' wörtlich übereinstimmende Zitatangabe(n).');
    if (hasA) pass('Fassung A ist gesichert. Diese Übernahme schreibt ausschliesslich in das Zielfeld.');
    else pass('Diese Übernahme legt keine Fassung A an. Das geschieht separat beim Sichern des Entwurfs.');
    return findings;
  }
  scope.workshopReplyCheck = inspect;
})(globalThis);
