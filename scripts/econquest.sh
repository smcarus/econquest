#!/usr/bin/env bash
# One command for everything on this Mac:
#   npm run go                 update, start Docker (3737) and `npm run dev` (3000), check both
#   npm run go -- --test       ...then typecheck and the unit tests
#   npm run go -- --validate   ...then signals:evaluate and mac:validate (writes the report)
#   npm run go -- --all        update, start, test and validate
#   npm run go -- --no-pull    start without pulling the latest code
#   npm run go -- --no-daily   start without the daily data run
#   npm run go -- daily        run the daily data run now, in this window, even if it ran today
#   npm run go -- status       show what is running and what the last daily data run did
#   npm run go -- stop         stop the dev server and the Docker app
# Every start also begins the daily data run in the background, at most once a day: every free
# feed, IMF WEO editions, sanctions lists, GPR index, UCDP files, nowcasts and forecasts, the
# weekly tests when a week has passed, and a connection check (log: data/local/logs/daily.log).
# Double-click econquest-mac.command for the same as `npm run go`.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

DOCKER_PORT="${PORT:-3737}"
DEV_PORT=3000
QUICK_MODEL="${OLLAMA_QUICK_MODEL:-qwen2.5:7b}"
DEEP_MODEL="${OLLAMA_DEEP_MODEL:-qwen2.5:32b}"
# Small referee (opt-in): OLLAMA_ALLOW_SMALL_REFEREE=on npm run go also downloads the 14B model.
SMALL_REFEREE_MODEL="${OLLAMA_SMALL_REFEREE_MODEL:-qwen2.5:14b}"
PULL_MODELS=("${QUICK_MODEL}" "${DEEP_MODEL}")
[ "${OLLAMA_ALLOW_SMALL_REFEREE:-off}" = "on" ] && PULL_MODELS+=("${SMALL_REFEREE_MODEL}")
LOG_DIR="${ROOT}/data/local/logs"
DEV_LOG="${LOG_DIR}/dev.log"
DEV_PID="${LOG_DIR}/dev.pid"
DAILY_LOG="${LOG_DIR}/daily.log"
DAILY_PID="${LOG_DIR}/daily.pid"
mkdir -p "${LOG_DIR}" data/archive

cmd="start"; pull=1; run_tests=0; run_validate=0; run_daily=1
for a in "$@"; do
  case "$a" in
    start|stop|status|daily) cmd="$a" ;;
    --no-daily) run_daily=0 ;;
    --test) run_tests=1 ;;
    --validate) run_validate=1 ;;
    --all) run_tests=1; run_validate=1 ;;
    --no-pull) pull=0 ;;
    -h|--help) sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $a (see npm run go -- --help)"; exit 2 ;;
  esac
done

failed=()
step() { echo; echo "== $*"; }
http_ok() { [ "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "http://127.0.0.1:$1/" 2>/dev/null)" = "200" ]; }
port_pid() { lsof -nP -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1; }
docker_up() { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }

stop_dev() {
  local pid=""
  [ -f "${DEV_PID}" ] && pid="$(cat "${DEV_PID}")"
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
    # npm starts tsx as a child; stop the whole group.
    kill -- "-${pid}" 2>/dev/null || kill "${pid}" 2>/dev/null
  fi
  rm -f "${DEV_PID}"
  pid="$(port_pid "${DEV_PORT}")"
  if [ -n "${pid}" ] && ps -o command= -p "${pid}" | grep -q "${ROOT}"; then kill "${pid}" 2>/dev/null; fi
}

show_status() {
  step "Status"
  if http_ok "${DOCKER_PORT}"; then echo "Docker app   : up    http://localhost:${DOCKER_PORT}"; else echo "Docker app   : down  (port ${DOCKER_PORT})"; fi
  if http_ok "${DEV_PORT}"; then echo "Dev server   : up    http://localhost:${DEV_PORT}   (log: ${DEV_LOG})"; else echo "Dev server   : down  (port ${DEV_PORT})"; fi
  if curl -sf -m 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "Ollama       : up    port 11434"
    for m in "${PULL_MODELS[@]}"; do
      if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "${m}"; then echo "  model      : ${m} ready"; else echo "  model      : ${m} missing"; fi
    done
  else
    echo "Ollama       : down  (port 11434)"
  fi
  echo "Code         : $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
  if [ -f "${DAILY_PID}" ] && kill -0 "$(cat "${DAILY_PID}")" 2>/dev/null; then echo "Daily data   : running now (log: ${DAILY_LOG})"; fi
  echo
  npx --no-install tsx scripts/daily-status.ts 2>/dev/null || echo "Daily data   : status not available"
}

# The daily data run goes where the app at port ${DOCKER_PORT} keeps its data: inside the Docker app
# when it is up (its figures live in the Docker volume; data/local is shared with this folder),
# else on this computer.
run_daily_now() {
  if docker_up && [ -n "$(docker compose ps -q econquest 2>/dev/null)" ]; then
    # A Docker app built before the last `git pull` runs older code that may not have the daily run:
    # rebuild and restart it first (the same as `npm run update`), then wait for it to answer.
    if ! docker compose exec -T econquest node -e "process.exit(require('./package.json').scripts?.daily ? 0 : 1)" >/dev/null 2>&1; then
      echo "The Docker app runs code from before the last update; rebuilding it first..."
      APP_COMMIT="$(git rev-parse --short=12 HEAD 2>/dev/null || true)"; export APP_COMMIT
      OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://host.docker.internal:11434}" docker compose up -d --build econquest || return 1
      for _ in $(seq 1 45); do http_ok "${DOCKER_PORT}" && break; sleep 2; done
    fi
    docker compose exec -T -e ECONQUEST_WHERE=docker econquest npm run daily -- "$@"
  else
    ECONQUEST_WHERE="this computer" npm run daily -- "$@"
  fi
}

stop_daily() {
  local pid=""
  [ -f "${DAILY_PID}" ] && pid="$(cat "${DAILY_PID}")"
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then kill -- "-${pid}" 2>/dev/null || kill "${pid}" 2>/dev/null; echo "Daily data run stopped (the next start carries on)."; fi
  rm -f "${DAILY_PID}"
}

if [ "${cmd}" = "status" ]; then show_status; exit 0; fi

if [ "${cmd}" = "daily" ]; then
  step "Daily data run (now, in this window)"
  run_daily_now --force
  exit $?
fi

if [ "${cmd}" = "stop" ]; then
  step "Stopping"
  stop_daily
  stop_dev && echo "Dev server stopped."
  if docker_up; then docker compose stop econquest && echo "Docker app stopped."; fi
  exit 0
fi

# ---- start ----------------------------------------------------------------
step "1/6 Code and packages"
if [ "${pull}" = 1 ] && git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  before="$(git rev-parse HEAD)"
  if git pull --ff-only; then
    after="$(git rev-parse HEAD)"
    [ "${before}" = "${after}" ] && echo "Already up to date (${after:0:7})." || echo "Updated ${before:0:7} -> ${after:0:7}."
  else
    echo "git pull stopped (see 'git status'); starting the code already here."
    failed+=("git pull")
    after="${before}"
  fi
  if [ ! -d node_modules ] || ! git diff --quiet "${before}" "${after}" -- package.json package-lock.json; then
    npm install --no-audit --no-fund || failed+=("npm install")
  else
    echo "Packages unchanged."
  fi
else
  [ "${pull}" = 1 ] && echo "This branch has no upstream; skipping git pull."
  [ -d node_modules ] || npm install --no-audit --no-fund || failed+=("npm install")
fi

step "2/6 Ollama"
if ! curl -sf -m 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  if [ -d /Applications/Ollama.app ]; then open -a Ollama; elif command -v ollama >/dev/null 2>&1; then nohup ollama serve >"${LOG_DIR}/ollama.log" 2>&1 & fi
  for _ in $(seq 1 20); do curl -sf -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break; sleep 1; done
fi
if curl -sf -m 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is up on 11434."
  for m in "${QUICK_MODEL}" "${DEEP_MODEL}"; do
    if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "${m}"; then echo "${m} ready."; else echo "Pulling ${m}..."; ollama pull "${m}" || failed+=("pull ${m}"); fi
  done
else
  echo "Ollama is not running; the council needs it (install from https://ollama.com)."
  failed+=("ollama")
fi

step "3/6 Docker app (port ${DOCKER_PORT})"
if ! docker_up && [ -d /Applications/Docker.app ]; then
  echo "Starting Docker Desktop..."
  open -a Docker
  for _ in $(seq 1 60); do docker_up && break; sleep 2; done
fi
if docker_up; then
  # The commit the image is built from, so citations name the exact code (src/utils/buildInfo.ts).
  APP_COMMIT="$(git rev-parse --short=12 HEAD 2>/dev/null || true)"; export APP_COMMIT
  docker compose build econquest || failed+=("docker build")
  # Data saved by an older version that ran as root is handed to the app user (uid 1000) once.
  docker compose run --rm --no-deps --user root --entrypoint chown econquest -R 1000:1000 /app/data >/dev/null 2>&1 || true
  OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://host.docker.internal:11434}" docker compose up -d econquest || failed+=("docker up")
  if docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':11434->' | grep -vq '^econquest'; then
    echo "WARNING: a Docker container holds port 11434 in front of the Ollama app:"
    docker ps --format '  {{.Names}} {{.Ports}}' | grep -E ':11434->' || true
  fi
else
  echo "Docker is not running; skipped the Docker app."
  failed+=("docker")
fi

step "4/6 Dev server (port ${DEV_PORT})"
stop_dev
other="$(port_pid "${DEV_PORT}")"
if [ -n "${other}" ]; then
  echo "Port ${DEV_PORT} is held by another program: $(ps -o command= -p "${other}" | cut -c1-120)"
  echo "Stop it (kill ${other}) and run this again to start the dev server."
  failed+=("dev server: port ${DEV_PORT} busy")
else
  # set -m gives the server its own process group so `stop` can end npm and tsx together.
  set -m
  nohup npm run dev >"${DEV_LOG}" 2>&1 &
  echo $! >"${DEV_PID}"
  set +m
  echo "Started (log: ${DEV_LOG})."
fi

step "5/6 Checking both"
for _ in $(seq 1 45); do http_ok "${DOCKER_PORT}" && http_ok "${DEV_PORT}" && break; sleep 2; done
http_ok "${DOCKER_PORT}" || failed+=("Docker app not answering on ${DOCKER_PORT}")
http_ok "${DEV_PORT}" || failed+=("dev server not answering on ${DEV_PORT} (see ${DEV_LOG})")

step "6/6 Daily data run (in the background, once a day)"
if [ "${run_daily}" = 0 ]; then
  echo "Skipped (--no-daily)."
elif [ -f "${DAILY_PID}" ] && kill -0 "$(cat "${DAILY_PID}")" 2>/dev/null; then
  echo "Already running (log: ${DAILY_LOG})."
else
  # The run itself decides whether it is due (it skips when one finished in the last 20 hours).
  # Its own process group (set -m) so `stop` can end it; immune to the window closing (HUP ignored).
  set -m
  ( trap '' HUP; run_daily_now ) >"${DAILY_LOG}" 2>&1 </dev/null &
  echo $! >"${DAILY_PID}"
  set +m
  echo "Started; the app is ready to use meanwhile. Progress: tail -f ${DAILY_LOG}"
  echo "When it ends, 'npm run go -- status' shows what was downloaded and anything Missing."
fi

if [ "${run_tests}" = 1 ]; then
  step "Tests"
  npm run lint || failed+=("lint")
  npm test || failed+=("unit tests")
fi

if [ "${run_validate}" = 1 ]; then
  step "Validation"
  npm run signals:evaluate || failed+=("signals:evaluate")
  npm run mac:validate || failed+=("mac:validate")
  echo "Report: $(ls -t data/local/validation/mac-validate-*.md 2>/dev/null | head -1)"
fi

show_status
echo
if [ "${#failed[@]}" -eq 0 ]; then
  echo "All good."
  [ -t 1 ] && command -v open >/dev/null 2>&1 && open "http://localhost:${DOCKER_PORT}" >/dev/null 2>&1
  exit 0
fi
echo "Finished with problems:"
for f in "${failed[@]}"; do echo "  - ${f}"; done
exit 1
