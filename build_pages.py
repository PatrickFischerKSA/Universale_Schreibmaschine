from pathlib import Path
import shutil
root=Path(__file__).parent
html=(root/'static/index.html').read_text().replace('href="/style.css"','href="./style.css"').replace('<script src="/app.js"></script>','<script src="./vendor/jszip.min.js"></script><script type="module">import "./browser-api.js"; await import("./app.js");</script>')
html=html.replace('Literarische Werkstatt · auf deinem Rechner','Literarische Werkstatt · im Browser').replace('auf diesem Rechner','in diesem Browser').replace('Erst «An KI senden» übermittelt den sichtbaren Prompt an OpenAI.','Der Kopiermodus funktioniert ohne externe Anfrage.').replace('<option value="api">Direkte KI · OpenAI API</option>','<option value="gateway">Eigener HTTPS-Dienst · API</option>')
html=html.replace('<button id="send" class="secondary">','<button id="send" class="secondary" hidden>')
html=html.replace('<h3>Bibliothek sichern','<p id="legacyAtelier" hidden><a href="./atelier.html">Früheres Atelier öffnen, um ein vorhandenes Projekt zu exportieren</a></p><h3>Bibliothek sichern')
(root/'docs/index.html').write_text(html)
js=(root/'static/app.js').read_text().replace('async function api(path,data){','async function api(path,data){if(window.browserAPI)return window.browserAPI(path,data);').replace('Du kannst ihn kopieren oder im API-Modus senden.','Du kannst ihn jetzt kopieren und in ChatGPT verwenden.')
(root/'docs/app.js').write_text(js);shutil.copy(root/'static/style.css',root/'docs/style.css');(root/'docs/.nojekyll').touch()

shutil.copy(root/'static/reply-check.js',root/'docs/reply-check.js')

# Content-addressed URLs prevent mixed releases in browser/CDN caches.
import hashlib
html=(root/'docs/index.html').read_text()
for asset in ('app.js','browser-api.js','style.css','reply-check.js'):
    digest=hashlib.sha256((root/'docs'/asset).read_bytes()).hexdigest()[:12]
    html=html.replace('./'+asset,'./'+asset+'?v='+digest)
html=html.replace('Schreibmaschine · Belegte Merkmale', 'Schreibmaschine · Geführte Werkstatt · Belegte Merkmale')
(root/'docs/index.html').write_text(html)
for asset in ('atelier.html','atelier.js'):
    shutil.copy(root/'static'/asset,root/'docs'/asset)
