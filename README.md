# Universale Schreibmaschine

Eine lokale Autorenbibliothek und Schreibwerkstatt, abgeleitet aus der Spyri200-Schreibwerkstatt. Werke, Korpus, Profile, Textfassungen und Feedback bleiben als nachvollziehbare Daten erhalten.

## Onlinefassung auf GitHub Pages

[Schreibmaschine öffnen](https://patrickfischerksa.github.io/Universale_Schreibmaschine/)

Die Onlinefassung in `docs/` läuft ohne Python und ohne Server. Sie importiert TXT, Markdown, EPUB und PDF mit Textebene direkt im Browser, speichert die Autorenbibliothek in IndexedDB und erzeugt kopierbare Prompts. Volltexte werden dabei nicht hochgeladen. Browserdaten sind geräte- und browserspezifisch; sichere regelmässig die JSON-Bibliothek. Die direkte API-Anbindung bleibt der lokalen Fassung vorbehalten.

## Lokale Fassung mit optionaler API

Repository herunterladen und entpacken. Auf dem Mac `Starten.command` doppelklicken und im Browser `http://127.0.0.1:18870` öffnen. Das Terminalfenster offen lassen; mit Ctrl+C beenden. Der Starter verwendet die vorhandene Python-Laufzeit von Codex. Auf einem anderen Rechner Python 3.10+ und die Pakete aus `requirements.txt` installieren, danach `python3 server.py` starten.

## Arbeitsablauf

1. Autorenprofil anlegen. Werke als TXT, Markdown, EPUB oder PDF mit Textebene importieren. Mehrfachauswahl ist möglich.
2. Die Anwendung extrahiert Volltexte, gliedert sie in Passagen und berechnet grundlegende Kennzahlen. Dateiprüfsummen verhindern doppelte Importe innerhalb eines Autorenprofils.
3. Auszüge prüfen, Stichwörter suchen und bei Bedarf bis zu acht Passagen auswählen. Jeder Auszug hat eine ID, Herkunft und Zeichenpositionen im extrahierten Text. PDF-Seiten bezeichnen Dateiseiten; EPUB-Abschnitte folgen der Lesereihenfolge.
4. Analyseauftrag vorbereiten. Im Kopiermodus in ChatGPT bearbeiten und die Antwort zurückkopieren; alternativ den sichtbaren Auftrag per API senden. Die literarische Analyse ist ein Vorschlag, den du prüfst und als Profilversion speicherst.
5. Schreibauftrag eingeben. Das gespeicherte Profil, aktive Feedbackregeln und ausgewählte Quellen werden zum Prompt zusammengestellt. Ohne manuelle Auswahl arbeitet die Suche mit Stichwörtern aus dem Auftrag; ohne Treffer wird eine über die Werke verteilte Auswahl verwendet.
6. Entwurf schreiben oder KI-Antwort übernehmen, gezielte Rückmeldung vorbereiten und Textfassungen sichern.
7. Ursprüngliche Stelle, bessere Fassung, Begründung und eine konkrete Regel speichern. Aktive Regeln werden bei folgenden Aufträgen berücksichtigt; sie können pausiert werden.
8. Bibliothek regelmässig als JSON herunterladen. Ein Import ergänzt neue Autorenprofile und überschreibt keine bestehenden. Für die gemeinsame Weiterarbeit kann die Datei gezielt bereitgestellt werden.

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
