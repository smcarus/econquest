#!/usr/bin/env bash
# Double-click in Finder: updates, starts the Docker app (3737) and the dev server (3000), checks both.
DIR="$(cd "$(dirname "$0")" && pwd)"
bash "${DIR}/scripts/econquest.sh" "$@"
echo
read -r -p "Press Return to close this window." _ || true
