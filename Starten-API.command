#!/bin/zsh
cd "$(dirname "$0")"
PYTHON_RUNTIME="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
if [ ! -x "$PYTHON_RUNTIME" ]; then
  PYTHON_RUNTIME=python3
fi
open 'http://127.0.0.1:18874/?api'
"$PYTHON_RUNTIME" server.py --port 18874
