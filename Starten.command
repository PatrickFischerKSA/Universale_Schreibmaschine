#!/bin/zsh
cd "$(dirname "$0")"
PYTHON_RUNTIME="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
if [ ! -x "$PYTHON_RUNTIME" ]; then
  PYTHON_RUNTIME=python3
fi
printf 'Schreibmaschine startet auf http://127.0.0.1:18870\nDieses Fenster offen lassen. Beenden mit Ctrl+C.\n'
"$PYTHON_RUNTIME" server.py --port 18870
