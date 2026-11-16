# Universale Schreibmaschine

Eine lokale Autorenbibliothek und Schreibwerkstatt, abgeleitet aus der Spyri200-Schreibwerkstatt. Werke, Korpus, Profile, Textfassungen und Feedback bleiben als nachvollziehbare Daten erhalten.

## Onlinefassung auf GitHub Pages

[Schreibmaschine öffnen](https://patrickfischerksa.github.io/Universale_Schreibmaschine/)

Die Onlinefassung in `docs/` läuft ohne Python und ohne Server. Sie importiert TXT, Markdown, EPUB und PDF mit Textebene direkt im Browser, speichert die Autorenbibliothek in IndexedDB und erzeugt kopierbare Prompts. Volltexte werden dabei nicht hochgeladen. Browserdaten sind geräte- und browserspezifisch; sichere regelmässig die JSON-Bibliothek. Die Onlinefassung kann optional einen HTTPS-Schreibdienst verbinden.

## Lokale Fassung mit optionaler API

Repository herunterladen und entpacken. Auf dem Mac `Starten.command` doppelklicken und im Browser `http://127.0.0.1:18870` öffnen. Das Terminalfenster offen lassen; mit Ctrl+C beenden. Der Starter verwendet die vorhandene Python-Laufzeit von Codex. Auf einem anderen Rechner Python 3.10+ und die Pakete aus `requirements.txt` installieren, danach `python3 server.py` starten.

## Freitext und Fanfiction

- **Freitext**: Lege ein Projekt an. Importiere bei Bedarf TXT, Markdown, EPUB oder PDF und
  notiere eigene Gedanken, Diskurspositionen und offene Fragen. Schreib- und A/B-Aufträge
  verwenden dieses Material als Beleggrundlage. Das Schreiben funktioniert auch ohne Import.
- **Fanfiction**: Wähle eine Autorenbibliothek, etwa zu Gabriele Reuter. Erstelle aus den
  importierten Werken ein belegtes Stilprofil und beschreibe im Schreibschritt die
  literarische Form sowie den Anschluss an ein Werk oder eine Figur. Der Auftrag verbindet
  diese Vorgaben mit Textbelegen und dem geplanten Plot.

Modus, Arbeitsstand, Quellen und Regeln werden im jeweiligen Projekt gespeichert.

## Arbeitsablauf

Die Oberfläche zeigt jeweils einen Schritt. Links kannst du jederzeit wechseln.

1. **Werke:** Autorin oder Autor eintragen, Dateien auswählen und «Weiter zum Autorenprofil» anklicken.
2. **Autorenprofil:** «Analyseauftrag erstellen» → «Auftrag kopieren» → in ChatGPT absenden. Nur die Antwort in «Antwort von ChatGPT: Autorenprofil» einfügen. Belege prüfen. «Profil speichern → Geschichte planen» führt weiter.
3. **Geschichte:** Situation und Konflikt beschreiben. «Schreibauftrag erstellen» → in ChatGPT absenden. Die erzeugte Geschichte in «Deine Geschichte» einfügen oder direkt selbst schreiben. «Geschichte speichern → Überarbeiten» führt weiter.
4. **Überarbeiten:** «Überarbeitungsauftrag erstellen» → in ChatGPT absenden. Die Vorschläge haben ein eigenes Antwortfeld und ersetzen den Text nicht. Die Geschichte lässt sich direkt neben der Rückmeldung bearbeiten. Optional konkrete Feedbackregeln für nächste Texte speichern.

Aufträge, Profilanalysen und Geschichten haben getrennte Felder. Kopierte Aufträge werden beim Speichern abgefangen; erkennbare Analysen im Geschichtenfeld erhalten einen Hinweis und können ausdrücklich ins Profil kopiert werden. Die Erkennung ist heuristisch. Bestehende Daten bleiben erhalten. Alte Antworten sind unter «Sicherung & Betriebsart» erreichbar; alte Fassungen bleiben in der jeweiligen Versionsgeschichte.

Unter «Sicherung & Betriebsart» die Bibliothek regelmässig als JSON herunterladen. Auf GitHub Pages kannst du Prompts kopieren oder einen HTTPS-Schreibdienst verbinden. Die lokale Fassung bietet zusätzlich den API-Modus; dafür erscheinen im jeweiligen Schritt passende Schaltflächen.

## Zwei Betriebsarten

**Kopiermodus:** Korpusaufbau, Suche, Kennzahlen, Speicherung, Feedbackverwaltung und Promptbau funktionieren ohne API und ohne externe Anfragen. Die Antworten erzeugst du im selbst gewählten Chat und fügst sie zurück ein.

**Direkte KI:** OpenAI Responses API. Modell-ID und API-Schlüssel stammen aus deinem eigenen API-Zugang. Der Schlüssel wird nur für die Sitzung im Eingabefeld gehalten und für die Anfrage über den lokalen Server weitergegeben; er wird nicht in Bibliothek, Export oder Browser-Speicher geschrieben. Alternativ kann der Server `OPENAI_API_KEY` aus der Umgebung verwenden. Die Schaltfläche «An KI senden» übermittelt den sichtbaren Prompt an OpenAI. Dies kann Kosten verursachen. `store: false` deaktiviert die Speicherung der Antwort zur späteren API-Abfrage; es ist keine Behauptung vollständiger Anbieter-Datenlöschung.

Referenz: https://developers.openai.com/api/docs/guides/text

## Was automatisch entsteht und was geprüft werden muss

Automatisch: Textextraktion, Segmentierung, Herkunftsangaben, Wortstatistik, Stichwortsuche, begrenzte Materialauswahl und Promptzusammenstellung. Es gibt keine automatische OCR. Bild-PDFs werden als unbrauchbar beziehungsweise prüfbedürftig gemeldet. Historische Orthografie wird nicht stillschweigend modernisiert. Trennstriche, Fussnoten und Lesereihenfolge müssen bei problematischen PDFs kontrolliert werden.

Literarische Profile entstehen aus ausgewählten Passagen, nicht aus einer behaupteten vollständigen Lektüre aller Werke. Der Prompt zeigt den Umfang der Auswahl. Eine Analyse eines Ausschnitts ist keine gesicherte Aussage über ein Gesamtwerk. Die Suche verwendet lexikalisches Ranking, keine semantischen Embeddings.

Feedback verbessert die gespeicherten Regeln und Beispiele. Es findet **kein Modell-Fine-Tuning** statt. Für späteres echtes Training enthält der Export korrigierte Beispiele und ihre Begründungen; ein Trainingslauf wäre ein eigenes, gesondert zu evaluierendes Vorhaben.

## Lokale Daten

`data/library.json` enthält extrahierte Texte, Passagen, Metadaten, Profile, Feedback und Fassungen. Schreibvorgänge ersetzen die Datei atomar. `data/` und Schlüsseldateien sind von Git ausgeschlossen. Originaldateien selbst bleiben an ihrem ursprünglichen Ort; der Bibliotheksexport enthält die extrahierten Texte, nicht die ursprünglichen PDF-/EPUB-Dateien. Die Anwendung bindet ausschliesslich an `127.0.0.1` und verwendet ein Sitzungstoken für lokale API-Zugriffe. Sie ist keine öffentlich gehostete Mehrbenutzeranwendung.

## Prüfstand

- Elf automatische Tests für TXT, PDF und EPUB, lückenlose Segmentierung mit Positionen, Quellenbezug, aktive Regeln, API-Anfrageformat und atomare Speicherung.
- Lokaler HTTP-Test: Export/Import, Trennung der Autorenprofile, Duplikaterkennung und Zugriffsschutz.
- Browserprüfung: Autorenprofil anlegen, TXT importieren, Suche, Analyseprompt, Profilversion, Feedbackregel im Schreibprompt, Entwurf sichern, Rückmeldung und Wiederladen.
- Die echte OpenAI-Anfrage ist mangels API-Schlüssel noch nicht live geprüft. Das Anfrage-/Antwortformat ist mit einer kontrollierten Testantwort geprüft.

Tests: `python3 -m unittest discover -s tests -v` (PDF-Test benötigt zusätzlich reportlab).

## GitHub Pages und Entwicklung

GitHub Pages veröffentlicht `docs/` aus `main`. `python3 build_pages.py` synchronisiert Oberfläche und Gestaltung aus `static/`; `docs/browser-api.js` stellt die lokalen Browserfunktionen bereit. Die Python-Fassung bleibt in `server.py` und `corpus.py`. Benutzerdateien, Korpora und API-Schlüssel werden nicht ins Repository übernommen.

Mitgelieferte Browserbibliotheken: PDF.js (`pdfjs-dist` 5.6.205, Apache-2.0) und JSZip (3.10.1, wahlweise MIT). Lizenztexte liegen in `docs/vendor/`. Es werden keine CDN-Skripte zur Laufzeit geladen.

PDF-Import: bis 250 MB pro Werk, ohne feste Seitenzahlgrenze. Die Browserfassung verarbeitet die Datei direkt ohne Base64-Zwischenkopie und zeigt den Seitenfortschritt. PDF.js mit Kompatibilitätserweiterungen und Schriftressourcen ist mitgeliefert. Scans benötigen weiterhin eine Textebene.

Automatische Textauswahl: Kapitelverzeichnisse, kurze Titel- und Verlagsseiten werden anhand transparenter Textmerkmale ausgeschlossen. Die erste Stichprobe verteilt sich gleichmässig über verbleibende Passagen pro Quelldatei und wird vor der Prompt-Erstellung angezeigt. Diese Vorauswahl ersetzt keine literarische Analyse; auch kurze literarische Texte können dabei ausgelassen werden und sind weiterhin manuell auswählbar.

Prompt-Ausschnitte werden über PDF-Seitengrenzen hinweg bis zu Satzgrenzen erweitert. Auch die Zeichenbegrenzung kürzt nur an erkannten Satzenden. Alle beteiligten Seiten und ihre Zeichenbereiche werden ausgewiesen. Originalpassagen und gespeicherte Beleg-IDs bleiben erhalten.

Bei der Überarbeitung stehen Rückmeldung und derselbe Geschichteneditor nebeneinander (auf schmalen Bildschirmen untereinander). «Überarbeitete Fassung sichern» speichert eine Version und bleibt bei der Überarbeitung. Die bisherigen Fassungen bleiben erhalten.

## Direkte API-Fassung starten

`Starten-API.command` starten und http://127.0.0.1:18874/?api öffnen. Unter «API einrichten» Modell-ID und eigenen OpenAI-API-Schlüssel eingeben und «Einstellungen übernehmen und weiter» wählen. Danach erzeugen «Autorenprofil erstellen», «Geschichte schreiben» und «Rückmeldung erhalten» die Antwort direkt im passenden Arbeitsfeld. Es ist kein Wechsel zu ChatGPT nötig. Ein bestehender Text wird nur nach Bestätigung ersetzt; bei Fehlern bleibt er erhalten. Unvollständige Antworten werden ausdrücklich markiert.

Die GitHub-Pages-Website bleibt die serverlose Kopierfassung. Der lokale API-Server hält den Schlüssel aus dem öffentlichen Projekt heraus. Vorhandene Bibliotheken können per JSON-Export/-Import übernommen werden. Der Schlüssel gilt nur für die laufende Seite und wird nicht exportiert. Ohne eigenen API-Zugang kann keine echte Generierung geprüft werden.

## Plotmaschine

Nach dem Autorenprofil öffnet sich die Plotmaschine mit Prämisse und Einsatz, Figurendossiers,
neun Stationen nach Yury Nikolskoy und einer sortierbaren Szenenfolge. Wähle eine Szene für
den Entwurf. Schreib- und Rückmeldungsaufträge berücksichtigen den Plotstand und die gewählte
Szene neben Stilprofil, Regeln und Textbelegen. «Plot prüfen» zeigt offene Stationen und
fehlende Teile der Szenenkette. Für Varianten, Kapitelentwürfe und Kontinuitätsfeedback
kannst du spezifische Aufträge kopieren oder an den eingerichteten API-Dienst senden.
Die Projektbibel hält Weltregeln, Zeitleiste und offene Fäden fest. Für Textarbeit gibt es
Aufträge zu Konflikt, Dialog, Subtext, Sinneseindrücken, Klischees und Kontinuität. Eine im
Schreibfeld markierte Textstelle kann gezielt besprochen oder vorgelesen werden. Sichere
den A/B-Stand je Szene und exportiere die gesicherten Arbeitsfassungen in Szenenreihenfolge
als Manuskript. Für die kreative Bildplanung stehen Schlüsselszene und visuelle Kontinuität bereit.

## Fassung A und Fassung B

Wähle die Autorenbibliothek, schreibe oder importiere deinen Entwurf im Schreibfeld und
sichere ihn als Fassung A. In «Überarbeiten» bleibt A zum Vergleich verfügbar, während
du im Schreibfeld an B arbeitest. Dort kannst du Belege aus dem aktiven Korpus auswählen.
Der Überarbeitungsauftrag enthält beide Fassungen, den gewählten Schwerpunkt, das letzte
gespeicherte Autorenprofil, die aktiven Feedbackregeln und die Textbelege mit Fundstellen.
Das Markdown-Protokoll enthält die Fassungen, Rückmeldung und eigene Entscheidungen.
Ein vorhandenes Projekt aus dem früheren Atelier lässt sich weiterhin über den Link
unter «Sicherung & Betriebsart» exportieren.

### API-Vertrag für GitHub Pages

GitHub Pages liefert die Oberfläche aus. Für direkte Rückmeldungen betreibst du einen
separaten HTTPS-Dienst. Trage seine URL unter «Sicherung & Betriebsart» ein und sende den sichtbaren Auftrag aus dem jeweiligen Schritt. Der Kopiermodus bleibt ohne Dienst nutzbar.

- Anfrage: `POST` mit `Content-Type: application/json` und Body `{"prompt":"…"}`.
- Erfolg: HTTP 200 mit JSON `{"text":"…"}`; Fehler: passender HTTP-Status.
- Der Dienst beantwortet den CORS-Preflight `OPTIONS` für den Ursprung
  `https://patrickfischerksa.github.io` und erlaubt `POST` sowie `Content-Type`.
  Für den lokalen Betrieb zusätzlich den tatsächlich verwendeten lokalen Ursprung erlauben.
- Anbieter-Schlüssel bleiben im Dienst. Der Browseraufruf führt keine Cookies oder
  Authorization-Header mit. CORS allein schützt keinen kostenpflichtigen Endpunkt:
  begrenze Anfragen und Budget serverseitig und nutze einen zugangsbeschränkten Dienst,
  beispielsweise hinter einem Schulnetz oder VPN.
