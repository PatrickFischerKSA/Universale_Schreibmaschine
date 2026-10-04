from pathlib import Path
import shutil
root=Path(__file__).parent
html=(root/'static/index.html').read_text().replace('href="/style.css"','href="./style.css"').replace('<script src="/app.js"></script>','<script src="./vendor/jszip.min.js"></script><script type="module">import "./browser-api.js"; await import("./app.js");</script>')
html=html.replace('Literarische Werkstatt · auf deinem Rechner','Literarische Werkstatt · im Browser').replace('auf diesem Rechner','in diesem Browser').replace('Erst «An KI senden» übermittelt den sichtbaren Prompt an OpenAI.','Die Onlinefassung überträgt keine Texte an eine KI.').replace('<option value="api">Direkte KI · OpenAI API</option>','')
html=html.replace('<h2>Mit oder ohne direkte KI.</h2>','<h2>Online arbeiten, lokal erweitern.</h2><p>Diese GitHub-Pages-Fassung erstellt und speichert den Korpus direkt in deinem Browser. Kopiere die Prompts in ChatGPT und füge Antworten wieder ein. Sichere die Bibliothek regelmässig als JSON; gelöschte Browserdaten löschen auch den lokalen Bestand.</p><p>Für die direkte KI-Anbindung nutze die <a href="https://github.com/PatrickFischerKSA/Universale_Schreibmaschine#lokale-fassung-mit-optionaler-api">lokale Fassung aus dem Repository</a>. Die JSON-Bibliothek lässt sich zwischen beiden Fassungen austauschen.</p>')
html=html.replace('<button id="send" class="secondary">','<button id="send" class="secondary" hidden>')
(root/'docs/index.html').write_text(html)
js=(root/'static/app.js').read_text().replace('async function api(path,data){','async function api(path,data){if(window.browserAPI)return window.browserAPI(path,data);').replace('Du kannst ihn kopieren oder im API-Modus senden.','Du kannst ihn jetzt kopieren und in ChatGPT verwenden.')
(root/'docs/app.js').write_text(js);shutil.copy(root/'static/style.css',root/'docs/style.css');(root/'docs/.nojekyll').touch()
